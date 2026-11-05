"""The job server: standard-library HTTP + Server-Sent Events over the species files, a priority queue with superseding, the content-addressed cache, a file watcher, and the proxy worker(s).
JSON API as spec 6.3 (species, jobs, events, cas; gate routes answer 403 to makers and 501 until their chunk). The studio app (body/wb/static/app, built from body/wb/web and committed) is served by default: /assets/* immutable, any other page GET answers index.html (the single-page fallback).
Behind the site's proxy the app lives under /studio/: a leading /studio is stripped from every path, so one build works there and locally. --trusted-proxy ADDR makes the X-Studio-User header count, from that peer address only.
python -m wb.server --home DIR [--species DIR ...] [--static DIR] [--host ADDR] [--port N] [--trusted-proxy ADDR]"""
import argparse
import copy
import json
import os
import queue
import re
import shutil
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)

import checks as CH
from wb import cas as C, facade as F, hashing as H, jobs as J, keys as K, report as R, store as S
from wb.store import ApiError

STATIC_APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "app")
CSP = "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
PREFIX = "/studio"
IMMUTABLE = "private, max-age=31536000, immutable"                  # a picture fetched behind the login must never be kept by a shared cache
CT = {"woff2": "font/woff2", "ttf": "font/ttf", "ico": "image/x-icon", "png": "image/png", "json": "application/json", "glb": "model/gltf-binary", "html": "text/html; charset=utf-8", "js": "text/javascript", "css": "text/css", "svg": "image/svg+xml"}


def strip_prefix(path):
    """The path the routes see: a leading /studio (the public prefix) is dropped, so /studio/api/stats and /api/stats are one route."""
    if path == PREFIX:
        return "/"
    return path[len(PREFIX):] if path.startswith(PREFIX + "/") else path


def peer_ip(addr):
    return addr[7:] if addr.startswith("::ffff:") else addr


def V1_labels():
    import species_v1 as V1
    return V1.labels()


def count_rows(rows):
    """What the pill and the drawer both say, from one place: fails and warnings need you; passes never do."""
    n = lambda st: sum(1 for r in rows if r["state"] == st)
    return dict(total=len(rows), fail=n("fail"), warn=n("warn"), need=n("fail") + n("warn"), passed=n("pass"))


K_VIEWS = [(m, a, z) for z in (304, 608) for m in K.MODES for a in K.AZ]


class Hub:
    """Events, fanned out to every subscriber; a ring of the latest 500 for late readers."""
    def __init__(self):
        self.lock = threading.Lock()
        self.subs = []
        self.n = 0
        self.ring = []

    def emit(self, typ, species, **kw):
        with self.lock:
            self.n += 1
            ev = dict(id=self.n, type=typ, species=species, t=S.now(), **kw)
            self.ring = (self.ring + [ev])[-500:]
            for flt, q in self.subs:
                if flt is None or flt == species:
                    q.put(ev)
        return ev

    def subscribe(self, species):
        q = queue.Queue()
        with self.lock:
            self.subs.append((species, q))
        return q

    def unsubscribe(self, q):
        with self.lock:
            self.subs = [(f, x) for f, x in self.subs if x is not q]


class ProxyWorker:
    """A worker subprocess and the thread that feeds it jobs from the queue."""
    def __init__(self, srv, n):
        self.srv, self.n = srv, n
        self.proc = None
        self.thread = threading.Thread(target=self.loop, daemon=True, name=f"proxy-{n}")

    def start_proc(self):
        env = dict(os.environ, PYTHONPATH=BODY)
        log = open(os.path.join(self.srv.home, f"worker-{self.n}.log"), "a")
        self.proc = subprocess.Popen([sys.executable, "-m", "wb.worker", "--cas", self.srv.cas.root], cwd=BODY, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=log, text=True, bufsize=1)
        ready = json.loads(self.proc.stdout.readline())
        assert ready.get("ready"), ready

    def loop(self):
        srv = self.srv
        self.start_proc()
        while not srv.stopping:
            job = srv.queue.pop(("render", "build", "check", "clayclip"), timeout=0.5)
            if job is None:
                continue
            srv.hub.emit("running", job.species, job=job.id, kind=job.kind, actor=(job.actor or {}).get("name"))
            try:
                if self.proc.poll() is not None:
                    self.start_proc()
                views = job.args.get("views", [])
                self.proc.stdin.write(json.dumps(dict(id=job.id, op=job.kind, spec=job.spec, genome=job.args["genome"], views=views, stage=job.args.get("stage", "all"), loci=job.args.get("loci"), clip=job.args.get("clip"), key=job.key)) + "\n")
                self.proc.stdin.flush()
                while True:
                    line = self.proc.stdout.readline()
                    if not line:
                        raise RuntimeError("the proxy worker died")
                    msg = json.loads(line)
                    if "progress" in msg:
                        job.progress = msg["progress"]
                        srv.hub.emit("running", job.species, job=job.id, kind=job.kind, progress=job.progress)
                        continue
                    break
                if msg["ok"]:
                    srv.finish_ok(job, msg["result"])
                else:
                    srv.finish_failed(job, msg["error"], msg.get("field"))
            except Exception as e:
                srv.finish_failed(job, f"{type(e).__name__}: {e}", None)
                try:
                    self.proc.kill()
                except Exception:
                    pass

    def stop(self):
        try:
            self.proc.stdin.write(json.dumps(dict(op="quit")) + "\n")
            self.proc.stdin.flush()
            self.proc.wait(5)
        except Exception:
            self.proc.kill()


PLUSH_LOOK = "plush-3"                                          # the house look-dev of the plush hero (Cycles, velvet, studio light): bump when it changes, and every plush picture is drawn again
PLAY_ACTOR = dict(name="play", role="server")


class PlushWorker:
    """The plush worker: one subprocess (wb.plushworker, Blender's Cycles) and the thread that feeds it plush jobs. The process starts with the first job, so a server that never draws plush never loads Blender twice."""
    def __init__(self, srv, n):
        self.srv, self.n = srv, n
        self.proc = None
        self.thread = threading.Thread(target=self.loop, daemon=True, name=f"plush-{n}")

    def start_proc(self):
        env = dict(os.environ, PYTHONPATH=BODY)
        log = open(os.path.join(self.srv.home, f"plush-{self.n}.log"), "a")
        scratch = os.path.join(self.srv.home, f"plush-scratch-{self.n}")
        self.proc = subprocess.Popen([sys.executable, "-m", "wb.plushworker", "--scratch", scratch], cwd=BODY, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=log, text=True, bufsize=1)
        assert json.loads(self.proc.stdout.readline()).get("ready")

    def loop(self):
        srv = self.srv
        while not srv.stopping:
            job = srv.queue.pop(("plush",), timeout=0.5)
            if job is None:
                continue
            srv.hub.emit("running", job.species, job=job.id, kind="plush", actor=(job.actor or {}).get("name"))
            try:
                if self.proc is None or self.proc.poll() is not None:
                    self.start_proc()
                tmp = srv.cas.tmp("png")
                self.proc.stdin.write(json.dumps(dict(id=job.id, spec=job.spec, genome=job.args["genome"], out=tmp, big=bool(job.args.get("big")), clip=job.args.get("clip"))) + "\n")
                self.proc.stdin.flush()
                while True:
                    line = self.proc.stdout.readline()
                    if not line:
                        raise RuntimeError("the plush worker died")
                    msg = json.loads(line)
                    if "progress" in msg:
                        job.progress = msg["progress"]
                        srv.hub.emit("running", job.species, job=job.id, kind="plush", progress=job.progress)
                        continue
                    break
                if not msg["ok"]:
                    srv.bad_pics.add(job.key)
                    srv.finish_failed(job, msg["error"], None)
                    continue
                srv.cas.adopt(tmp, job.key, "png")
                srv.cas.put_json(job.key, dict(plush=True, genome=job.args["genome"], ms=msg["ms"], build_ms=msg["build_ms"], plush_ms=msg["plush_ms"], look=PLUSH_LOOK, **({"clip": job.args["clip"], "frame_ms": msg.get("frame_ms")} if job.args.get("clip") else {})))
                res = dict(views=[dict(mode="plush", az=32, size=608 if job.args.get("big") else 304, key=job.key, cached=False, ms=msg["ms"])], ms=msg["ms"], cache=dict(job_hit=False))
                srv.queue.finish(job, "done", res)
                srv.hub.emit("done", job.species, job=job.id, kind="plush", key=job.key, cached=False, ms=msg["ms"], urls=[f"/cas/{job.key}.png"], actor=(job.actor or {}).get("name"))
            except Exception as e:                                   # noqa: BLE001
                srv.finish_failed(job, f"{type(e).__name__}: {e}", None)
                try:
                    self.proc.kill()
                except Exception:                                    # noqa: BLE001
                    pass

    def stop(self):
        try:
            self.proc.stdin.write(json.dumps(dict(op="quit")) + "\n")
            self.proc.stdin.flush()
            self.proc.wait(5)
        except Exception:                                            # noqa: BLE001
            if self.proc is not None:
                self.proc.kill()


class Server:
    def __init__(self, home, species_dirs, static=None, host="127.0.0.1", port=0, cache_limit_gb=30.0, proxy_workers=1, trusted_proxy=None, plush_workers=2, cache=None):
        self.trusted_proxy = trusted_proxy or None
        self.home = os.path.abspath(home)
        os.makedirs(self.home, exist_ok=True)
        self.cas = C.Cas(os.path.abspath(cache) if cache else os.path.join(self.home, "cas"))          # `cache`: a content-addressed store kept apart from the home (the studio's own, shared with a dev server on a home of its own)
        self.cache_limit = int(cache_limit_gb * 1e9)
        self.tokens = S.Tokens(os.path.join(self.home, "tokens.json"))
        self.gate_building = {}
        self.species_dirs = [os.path.abspath(d) for d in species_dirs]
        self.mine_dir = os.path.join(self.home, "mine")                # the mibis the players keep: each is a species file of its own, in the player's space
        os.makedirs(self.mine_dir, exist_ok=True)
        self.species_dirs.append(self.mine_dir)
        self.bad_pics = set()                                          # plush keys whose draw failed: a pod with such a picture is drawn again from the same stream
        self.static = os.path.abspath(static) if static else (STATIC_APP if os.path.isfile(os.path.join(STATIC_APP, "index.html")) else None)
        self.hub = Hub()
        self.queue = J.JobQueue()
        self.stopping = False
        self.species = {}
        self.started = False
        self.scan()
        self.workers = [ProxyWorker(self, i) for i in range(proxy_workers)]
        self.plushers = [PlushWorker(self, i) for i in range(plush_workers)]
        self.warmer = threading.Thread(target=self.warm_loop, daemon=True, name="warm")
        self.warms = {}                                         # species id -> the last warm result and its key, for the page while a new one runs
        self.pic_keys = {}                                      # (neutral file hash, genome) -> plush key
        self.sheeter = threading.Thread(target=self.sheet_loop, daemon=True, name="sheets")
        self.varieter = threading.Thread(target=self.variety_loop, daemon=True, name="variety")
        self.golder = threading.Thread(target=self.golden_loop, daemon=True, name="goldens")
        self.exporter = threading.Thread(target=self.export_loop, daemon=True, name="exports")
        self.sweeper = threading.Thread(target=self.sweep_loop, daemon=True, name="sweeps")
        self.sweeps_seen = {}                                   # species id -> (the last sweep result, its key): shown stale when the file has moved on
        self.runs_lock = threading.Lock()
        self.watcher = threading.Thread(target=self.watch_loop, daemon=True, name="watcher")
        self.proofs = queue.Queue()
        self.proofer = threading.Thread(target=self.proof_loop, daemon=True, name="proofs")
        self.checks_seen = {}                                   # species id -> the last check rows computed for it (shown hatched when the file has moved on)
        self.extremes_seen = {}                                 # species id -> the last extremes result (shown stale when the file has moved on)
        self.httpd = ThreadingHTTPServer((host, port), make_handler(self))
        self.httpd.daemon_threads = True
        self.port = self.httpd.server_address[1]
        self.host = host
        self.puts = 0

    # ---- species
    def scan(self):
        for d in self.species_dirs:
            if os.path.isdir(d):
                for f in sorted(os.listdir(d)):
                    if f.endswith(".json") and not f.endswith(".undo.jsonl"):
                        sid = f[:-5]
                        if sid not in self.species:
                            self.species[sid] = S.Species(sid, os.path.join(d, f))
                            if self.started:
                                self.play_start(self.species[sid])

    def get_species(self, sid):
        sp = self.species.get(sid)
        if sp is None:
            raise ApiError(404, f"no species '{sid}'", "species")
        self.sync(sp)
        return sp

    def sync(self, sp):
        """Look at the file now: if it changed on disk and not through the API, it is a direct edit (an editor, an agent). Log it, announce it, supersede older jobs, start the proxy.
        The watcher calls this every 0.3 s, and every read and job submit calls it first, so an edit followed at once by `wb render` is never answered from the old file."""
        with sp.lock:
            try:
                mt = os.stat(sp.path).st_mtime_ns
            except OSError:
                return False
            if mt == sp.mtime:
                return False
            old = sp.spec
            if not sp.reload():
                sp.mtime = mt if sp.error is None else sp.mtime
                return False
            changes = sp.external_edit(old)
        self.after_edit(sp, None, [c[0] for c in changes], "file")
        return True

    def watch_loop(self):
        """Poll the species files (stdlib only)."""
        while not self.stopping:
            time.sleep(0.3)
            try:
                self.scan()
                for sp in list(self.species.values()):
                    self.sync(sp)
            except Exception as e:
                print("watcher:", type(e).__name__, e, file=sys.stderr)

    def after_edit(self, sp, actor, paths, via):
        name = actor["name"] if actor else "file edit"
        self.hub.emit("edited", sp.id, actor=name, role=actor["role"] if actor else None, agent=bool(actor and actor.get("agent")), via=via, hash=sp.hash, changes=paths)
        from wb import gate as GT
        if GT.note_edit(sp.path, sp.hash, name):                  # signatures on the old file no longer count: the round records who voided them
            self.hub.emit("gate", sp.id, voided=True, actor=name)
        for j in self.queue.supersede(sp.id, sp.hash):
            self.hub.emit("failed", sp.id, job=j.id, kind=j.kind, superseded=True, error=j.error)
        if any(str(p).replace("/", ".").strip(".") in ("play", "play.starter") for p in paths):
            self.play_start(sp)                                  # a mibi kept as a starter: its sweep and warm set start now
        if via == "play":                                        # a toy moves the mibi's own setting, never the type: nothing of the type to draw again
            return
        try:
            self.submit(sp.id, "render", dict(genome="type", modes=["clay"], az=list(K.AZ), sizes=[304, 608]), dict(name="auto", role="server"))
            self.submit(sp.id, "check", dict(genome="type", stage="all"), dict(name="auto", role="server"))
        except ApiError:
            pass

    def current_views(self, sp):
        """The proxy frames of the file as it is now (type genome, 304 for the strip and 608 for the hero): each with its cache key and whether the picture exists yet. A read of the cache, never a job."""
        try:
            ck = K.cage_key(sp.spec, "type")
        except Exception:
            return []
        return [dict(mode=m, az=a, size=z, key=k, ready=self.cas.has(k, "png")) for (m, a, z), k in zip(K_VIEWS, K.frames(ck, K_VIEWS))]

    def patch_species(self, sid, ops, actor, via="api"):
        sp = self.get_species(sid)
        with sp.lock:
            new = S.apply_patch(sp.spec, ops)
            self.check_file(new, raise_on_fail=True)
            changes, h = sp.patch(ops, actor, via)
        if changes:
            self.after_edit(sp, actor, [c[0] for c in changes], "api")
        return dict(hash=h, changed=[dict(path=p, old=o, new=n) for p, o, n in changes], touches=[], validation=dict(ok=True, errors=[]), **sp.can_undo_redo())

    def revert(self, sid, kind, actor):
        """Undo or redo the last save through the undo log: it is a save of its own (via 'undo' or 'redo'), made by the actor who asked, so History shows both."""
        sp = self.get_species(sid)
        with sp.lock:
            ops = sp.revert(kind, actor)
            return self.patch_species(sid, ops, actor, via=kind)

    # ---- instant (file-stage) checks, in this process
    def check_file(self, spec, raise_on_fail=False):
        import schema as SC, s20genes as GN, species_v1 as V1
        rows = []

        def row(id_, ok, value, limit, words, field=None):
            rows.append(dict(id=id_, state="pass" if ok else "fail", value=value, limit=limit, words=words, field=field, proof=None))
        if V1.is_v1(spec) or (isinstance(spec, dict) and spec.get("schema") != "mb-body/1"):
            errs = V1.validate(spec)
            for path, msg in errs:
                row("schema", False, msg, "valid", "The species file must pass the schema: fields that are not listed are rejected, not ignored.", path)
            if errs:
                if raise_on_fail:
                    raise ApiError(400, errs[0][1], errs[0][0])
                return rows
            spec = V1.to_internal(spec)
        try:
            SC.validate(copy.deepcopy(spec))
            row("schema", True, "valid", "valid", "The species file must pass the schema.")
        except Exception as e:
            f = F._field_of(str(e))
            row("schema", False, str(e), "valid", "The species file must pass the schema.", f)
            if raise_on_fail:
                raise ApiError(400, f"{e}", f)
        try:
            SC.load(raw=GN.apply_shape(spec, {}))
            row("genes_apply", True, "applies", "applies", "The shape genes must apply to the file and the file must load.")
        except Exception as e:
            row("genes_apply", False, f"{type(e).__name__}: {e}", "applies", "The shape genes must apply to the file and the file must load.", F._field_of(str(e)))
            if raise_on_fail:
                raise ApiError(400, f"{type(e).__name__}: {e}", F._field_of(str(e)))
        return rows

    # ---- jobs
    def norm_args(self, kind, args, spec=None):
        args = dict(args or {})
        genome = args.get("genome", "type")
        try:
            F.resolve_genome(genome, F.internal(spec) if spec else None)
        except F.BuildError as e:
            raise ApiError(400, e.message, "genome")
        out = dict(genome=genome)
        if kind == "check":
            st = (args or {}).get("stage", "all")
            if st not in ("file", "cage", "rig", "coat", "extremes", "all"):
                raise ApiError(400, f"check stage '{st}': one of file, cage, rig, coat, extremes, all", "stage")
            if st == "extremes":
                out = dict(genome="type")                        # the stage builds its own genomes
                loci = args.get("loci")
                if loci:
                    known = {e["locus"] for e in F.internal(spec)["genome"]["loci"]} if spec else set()
                    miss = [x for x in loci if known and x not in known]
                    if miss:
                        raise ApiError(400, f"no locus '{miss[0]}' in the file", "loci")
                    return dict(out, stage=st, loci=sorted(loci))
            return dict(out, stage=st)
        if kind == "build":
            return out
        if kind == "render" and args.get("views"):
            vs = [[str(m), int(a), int(z)] for m, a, z in args["views"]]
            for m, a, z in vs:
                if m not in K.MODES or z not in K.SIZES:
                    raise ApiError(400, f"view {m} {a} {z}: mode one of {', '.join(K.MODES)}, size one of {', '.join(map(str, K.SIZES))}", "views")
            out["views"] = vs
            return out
        if kind == "render":
            modes = args.get("modes", args.get("mode", ["clay"]))
            modes = list(K.MODES) if modes in ("all", ["all"]) else ([modes] if isinstance(modes, str) else list(modes))
            for m in modes:
                if m == "plush":
                    raise ApiError(400, "mode 'plush' is drawn by the render set (wb renders --make), not by the proxy; the proxy modes are " + ", ".join(K.MODES), "mode")
                if m not in K.MODES:
                    raise ApiError(400, f"mode '{m}': one of {', '.join(K.MODES)}", "mode")
            azs = [int(a) for a in (args.get("az") or K.AZ)]
            sizes = [int(s) for s in (args.get("sizes") or [args.get("size", 304)])]
            for s in sizes:
                if s not in K.SIZES:
                    raise ApiError(400, f"size {s}: one of {', '.join(map(str, K.SIZES))}", "size")
            out["views"] = [[m, a, s] for s in sizes for m in modes for a in azs]
            out["modes"], out["az"], out["sizes"] = modes, azs, sizes
            return out
        if kind == "sheet":
            out["views"] = [list(v) for v in K.SHEET_VIEWS]
            return out
        raise ApiError(400, f"job kind '{kind}' is not built yet", "kind")

    def submit(self, sid, kind, args, actor, priority=None, spec=None, spec_hash=None):
        sp = self.get_species(sid)
        if kind == "check" and (args or {}).get("stage", "all") == "file":
            return self.run_check(sp, args, actor)
        if kind == "variety":
            return self.submit_variety(sp, args, actor)
        if kind == "golden":
            return self.submit_golden(sp, args, actor)
        if kind == "export":
            return self.submit_export(sp, args, actor)
        if kind == "sweep":
            return self.submit_sweep(sp, args, actor)
        if kind == "plush":
            return self.submit_plush(sp, (args or {}).get("genome", "type"), actor, priority)
        if kind == "warm":
            return self.submit_warm(sp, actor)
        spec = copy.deepcopy(sp.spec) if spec is None else spec
        a = self.norm_args(kind, args, spec)
        spec_hash = spec_hash or H.hash_of(spec)
        ck = K.cage_key(spec, a["genome"])
        views = [tuple(v) for v in a.get("views", [])]
        if kind == "build":
            key = ck
        elif kind == "check":
            key = self.check_key(ck, a["stage"], a.get("loci"))
        elif kind == "render":
            key = K.render_key(ck, views)
        else:
            key = K.sheet_key(K.render_key(ck, views))
        job = J.Job(self.queue.new_id(), sid, kind, a, key, J.PRIORITY[kind] if priority is None else priority, spec, spec_hash, actor)
        if kind == "check":
            return self.submit_check(job, ck, actor)
        cached = self.cached_result(kind, key, ck, views)
        if cached is not None:
            job.cached, job.state = True, "done"
            job.result = cached
            job.t_start = job.t_end = time.time()
            job.event.set()
            self.queue.add(job)
            self.hub.emit("done", sid, job=job.id, kind=kind, cached=True, key=key, actor=(actor or {}).get("name"))
            return job
        active = self.queue.find_active(sid, kind, key)
        if active:
            return active
        self.queue.add(job)
        self.hub.emit("queued", sid, job=job.id, kind=kind, priority=job.priority, key=key, actor=(actor or {}).get("name"), spec_hash=spec_hash)
        return job

    def cached_result(self, kind, key, ck, views):
        if kind == "build":
            if self.cas.has(ck, "npz"):
                s = self.cas.get_json(ck)
                if s is not None:
                    return dict(cage=dict(key=ck, cage_hash=s["cage_hash"], vertices=s["vertices"], vertices_l1=s.get("vertices_l1"), faces=s["faces"], cached=True, timings_ms=s["timings_ms"], balance=s.get("balance")), views=[], cache=dict(job_hit=True))
            return None
        if kind == "render":
            r = self.cas.get_json(key)
            if r and all(self.cas.has(v["key"], "png") for v in r["views"]):
                r = copy.deepcopy(r)
                r["cage"]["cached"] = True
                for v in r["views"]:
                    v["cached"], v["ms"], v["path"] = True, 0.0, self.cas.path(v["key"], "png")
                r["cache"] = dict(job_hit=True, views_hit=len(r["views"]), views_total=len(r["views"]))
                return r
            return None
        if kind == "sheet":
            if self.cas.has(key, "png") and self.cas.has(key, "json"):
                r = self.cas.get_json(key)
                for v in r["views"]:
                    v["cached"], v["ms"] = True, 0.0
                r["cage"]["cached"] = True
                r["cache"] = dict(job_hit=True, views_hit=len(r["views"]), views_total=len(r["views"]))
                r["path"] = self.cas.path(key, "png")
                return r
        return None

    def run_check(self, sp, args, actor):
        stage = (args or {}).get("stage", "file")
        rows = self.check_file(sp.spec)
        job = J.Job(self.queue.new_id(), sp.id, "check", dict(stage="file"), H.hash_of("check", "file", sp.hash), 0, None, sp.hash, actor)
        job.state, job.result = "done", dict(stage="file", rows=rows, fail=[r for r in rows if r["state"] == "fail"], passed=sum(1 for r in rows if r["state"] == "pass"))
        job.t_start = job.t_end = time.time()
        job.event.set()
        self.queue.add(job)
        return job

    # ---- the checks (cage stage in the worker; the pictures here, off the worker's time)
    def check_key(self, ck, stage, loci=None):
        return H.hash_of("check", stage, ck, CH.version_id(stage), *([loci] if loci else []))

    def submit_check(self, job, ck, actor):
        cached = self.cas.get_json(job.key)
        if cached is not None:
            job.cached, job.state, job.result = True, "done", self.with_proof_state(cached)
            job.t_start = job.t_end = time.time()
            job.event.set()
            self.queue.add(job)
            self.hub.emit("done", job.species, job=job.id, kind="check", cached=True, key=job.key, actor=(actor or {}).get("name"))
            return job
        active = self.queue.find_active(job.species, "check", job.key)
        if active:
            return active
        self.queue.add(job)
        self.hub.emit("queued", job.species, job=job.id, kind="check", priority=job.priority, key=job.key, actor=(actor or {}).get("name"), spec_hash=job.spec_hash)
        return job

    def with_proof_state(self, res):
        """The stored rows with each proof's `ready` read from the cache now (the picture may still be on its way)."""
        res = copy.deepcopy(res)
        for r in list(res["rows"]) + list(res.get("ends") or []):
            if r.get("proof"):
                r["proof"]["ready"] = self.cas.has(r["proof"]["key"], "png")
                r["proof"]["path"] = self.cas.path(r["proof"]["key"], "png") if r["proof"]["ready"] else None
        res["counts"] = count_rows(res["rows"])
        return res

    def finish_check(self, job, result):
        """Rows from the worker: the SVGs go to the picture thread, the rows (with the key of each picture) are stored and answered."""
        rows, tasks = result["rows"], []
        ends = result.get("ends") or []
        for r in list(rows) + ends:
            p = r.get("proof")
            if not p:
                continue
            if "svg" in p:
                svg = p.pop("svg")
                p["key"] = H.hash_of("proof", p["frame"], svg, CH.VERSION_SALT)
                tasks.append(dict(key=p["key"], svg=svg, frame_path=p.pop("frame_path"), species=job.species))
                p.pop("frame")
        out = dict(stage=result["stage"], rows=rows, cage=result["cage"], timings_ms=result["timings_ms"])
        if ends:
            out["ends"] = ends
        self.cas.put_json(job.key, out)
        for t in tasks:
            self.proofs.put(t)
        return self.with_proof_state(out)

    def proof_loop(self):
        """Composes the proof pictures: the SVG over the proxy frame, in the browser, a batch at a time."""
        while not self.stopping:
            try:
                t = self.proofs.get(timeout=0.5)
            except queue.Empty:
                continue
            batch = [t]
            time.sleep(0.2)
            while True:
                try:
                    batch.append(self.proofs.get_nowait())
                except queue.Empty:
                    break
            try:
                self.compose(batch)
            except Exception as e:                                          # noqa: BLE001
                print("proofs:", type(e).__name__, e, file=sys.stderr)

    def compose(self, batch):
        todo = [t for t in {t["key"]: t for t in batch}.values() if not self.cas.has(t["key"], "png")]
        if not todo:
            return
        d = os.path.join(self.cas.root, ".tmp", f"proofs-{int(time.time() * 1000)}")
        os.makedirs(d, exist_ok=True)
        font = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web", "src", "fonts", "Inter-Medium-tnum.ttf")
        jobs = []
        for i, t in enumerate(todo):
            h = os.path.join(d, f"p{i}.html")
            with open(h, "w") as fh:
                fh.write(f'<!doctype html><meta charset="utf-8"><style>@font-face{{font-family:Inter;src:url("file://{font}")}}html,body{{margin:0;background:#f7f6f3;width:608px;height:780px;overflow:hidden}}img,svg{{position:absolute;left:0;top:0;display:block}}</style>'
                         f'<img src="file://{t["frame_path"]}" width="608" height="624">{t["svg"]}')
            jobs.append(dict(html=h, png=os.path.join(d, f"p{i}.png"), w=608, h=780))
        with open(os.path.join(d, "jobs.json"), "w") as fh:
            json.dump(jobs, fh)
        env = dict(os.environ, PLAYWRIGHT_BROWSERS_PATH="/home/mb/pw156/browsers")
        subprocess.run(["node", os.path.join(os.path.dirname(os.path.abspath(__file__)), "proof.cjs"), os.path.join(d, "jobs.json")], check=True, env=env, timeout=120)
        for t, j in zip(todo, jobs):
            self.cas.adopt(j["png"], t["key"], "png")
        import shutil
        shutil.rmtree(d, ignore_errors=True)
        for sid in {t["species"] for t in todo}:
            self.hub.emit("done", sid, job="proofs", kind="proof", cached=False, urls=[f"/cas/{t['key']}.png" for t in todo if t["species"] == sid])

    def string_of(self, sp, selector="type"):
        """The genome string (and the stamp code, when the frame fits a stamp) of one mibi of the species: `type`, `seed:N`, or a string or code read back. Written by the one codec, through node."""
        from wb import facade as F, frame_writer as FW
        import s20genes as GN
        try:
            spec = F.internal(sp.spec)
            ind = F.resolve_genome(selector, spec)
            r = FW.node(dict(op="encode", copies=F.genome_copies(ind, sp.spec)))
        except F.BuildError as e:
            raise ApiError(400, e.message, e.field or "genome")
        if not r["ok"]:
            raise ApiError(400, r["detail"], "genome")
        return dict(species=sp.id, genome=selector, string=r["string"], code=r["code"], length=r["length"], version=r["version"], hash=sp.hash)

    def freq(self, sp, n=1000):
        """How often each look shows (spec 4.2): wild, this sheet, a cross; per life stage for an expression. No build and no render: instant, and cached by the file's hash."""
        import expressions as X
        n = max(10, min(int(n), 5000))
        key = (sp.id, sp.hash, n)
        cache = self.__dict__.setdefault("_freq", {})
        if key not in cache:
            doc = sp.spec
            if not isinstance(doc.get("genome"), dict) or "loci" not in doc["genome"]:
                raise ApiError(400, "this file has no genome block", "genome")
            if len(cache) > 40:
                cache.clear()
            cache[key] = X.freq(doc["genome"], doc.get("expressions") or [], n, doc_id=doc.get("id"))
        return dict(species=sp.id, hash=sp.hash, **cache[key])

    def current_checks(self, sp):
        """The check rows for the file as it is now: from the cache when they are there, else the last rows we had, marked stale; None when nothing has been measured. Starts a check job when there is neither."""
        try:
            ck = K.cage_key(sp.spec, "type")
        except Exception:                                                   # noqa: BLE001
            return None
        key = self.check_key(ck, "all")
        res = self.cas.get_json(key)
        if res is not None:
            res = self.with_proof_state(res)
            self.checks_seen[sp.id] = res
            return dict(hash=sp.hash, fresh=True, rows=res["rows"], counts=res["counts"])
        if not self.queue.find_active(sp.id, "check", key):
            try:
                self.submit(sp.id, "check", dict(genome="type", stage="all"), dict(name="auto", role="server"))
            except ApiError:
                pass
        old = self.checks_seen.get(sp.id)
        if old:
            return dict(hash=sp.hash, fresh=False, rows=old["rows"], counts=old["counts"])
        return None

    def current_extremes(self, sp):
        """The extremes result for the file as it is now (fresh), else the last one we had (stale), else nothing; `running` when a job is on it. It never starts the job: the stage builds about fifty cages, so the page or `wb check --stage extremes` asks for it."""
        try:
            ck = K.cage_key(sp.spec, "type")
        except Exception:                                                   # noqa: BLE001
            return None
        key = self.check_key(ck, "extremes")
        running = bool(self.queue.find_active(sp.id, "check", key))
        res = self.cas.get_json(key)
        if res is not None:
            res = self.with_proof_state(res)
            try:
                at = os.path.getmtime(self.cas.path(key, "json"))             # when the run finished: the pill and the drawer say "from the last extremes run, at ..."
            except OSError:
                at = None
            self.extremes_seen[sp.id] = (res, at)
            return dict(fresh=True, running=running, ends=res["ends"], rows=res["rows"], key=key, at=at)
        old, at = self.extremes_seen.get(sp.id, (None, None))
        return dict(fresh=False, running=running, ends=old["ends"] if old else None, rows=old["rows"] if old else None, key=key, at=at)

    def finish_ok(self, job, result):
        cache = dict(job_hit=False)
        if job.kind == "render":
            vs = result["views"]
            cache.update(views_hit=sum(1 for v in vs if v["cached"]), views_total=len(vs))
            self.cas.put_json(job.key, dict(result, cache=None))
        result["cache"] = cache
        if job.kind == "check":
            result = dict(self.finish_check(job, result), cache=cache)
        self.queue.finish(job, "done", result)
        self.hub.emit("done", job.species, job=job.id, kind=job.kind, key=job.key, cached=False, ms=round((job.t_end - job.t_start) * 1000, 1),
                      urls=[f"/cas/{v['key']}.png" for v in result.get("views", [])], actor=(job.actor or {}).get("name"))
        self.puts += 1
        if self.puts % 20 == 0:
            self.cas.evict(self.cache_limit)

    def finish_failed(self, job, error, field):
        self.queue.finish(job, "failed", error=error, field=field)
        self.hub.emit("failed", job.species, job=job.id, kind=job.kind, error=error, field=field, actor=(job.actor or {}).get("name"))

    def wait(self, job, timeout):
        job.event.wait(timeout)
        return job

    def sheet_loop(self):
        while not self.stopping:
            job = self.queue.pop(("sheet",), timeout=0.5)
            if job is None:
                continue
            self.hub.emit("running", job.species, job=job.id, kind="sheet")
            try:                                          # the sheet's renders are P3 too: pinned to the hash the sheet was asked for, never superseded under it
                rj = self.submit(job.species, "render", dict(genome=job.args["genome"], views=job.args["views"]), job.actor, priority=job.priority, spec=job.spec, spec_hash=job.spec_hash)
                rj.event.wait(900)
                if rj.state != "done":
                    self.finish_failed(job, rj.error or f"the render job ended {rj.state}", rj.field)
                    continue
                res = rj.result
                views = {(v["mode"], v["az"], v["size"]): (v["path"], v["ms"], v["cached"]) for v in res["views"]}
                sp = self.species.get(job.species)
                info = dict(species=job.species, genome=job.args["genome"], spec_hash=job.spec_hash, cage=res["cage"], views=views, edits=sp.history(5) if sp else [])
                tmpdir = os.path.join(self.cas.root, ".tmp", f"sheet-{job.id}")
                h, p = R.contact_sheet(info, tmpdir, "sheet")
                self.cas.put_bytes(job.key, "html", open(h, "rb").read())
                self.cas.adopt(p, job.key, "png")
                out = dict(path=self.cas.path(job.key, "png"), html=self.cas.path(job.key, "html"), url=f"/cas/{job.key}.png", render_job=rj.id, cage=res["cage"],
                           views=res["views"], cache=res["cache"])
                self.cas.put_json(job.key, out)
                self.queue.finish(job, "done", out)
                self.hub.emit("done", job.species, job=job.id, kind="sheet", key=job.key, urls=[out["url"]])
            except Exception as e:
                self.finish_failed(job, f"{type(e).__name__}: {e}", None)

    # ---- the Variety sheet (chunk 10): the sheet's numbers are instant; its tiles are clay renders of seed:N@S genomes, cached like any other, and each run is remembered so the next can sit beside it
    VARIETY_VIEWS = (("clay", 32, 304), ("clay", 32, 96), ("clay", 32, 48))

    def runs_path(self):
        return os.path.join(self.home, "variety-runs.json")

    def runs_of(self, sid):
        with self.runs_lock:
            try:
                with open(self.runs_path()) as fh:
                    return json.load(fh).get(sid, [])
            except (OSError, ValueError):
                return []

    def save_run(self, sid, run):
        with self.runs_lock:
            try:
                with open(self.runs_path()) as fh:
                    allr = json.load(fh)
            except (OSError, ValueError):
                allr = {}
            rs = [r for r in allr.get(sid, []) if r["key"] != run["key"]] + [run]
            allr[sid] = rs[-8:]
            tmp = self.runs_path() + ".tmp"
            with open(tmp, "w") as fh:
                json.dump(allr, fh)
            os.replace(tmp, self.runs_path())

    def tile_keys(self, spec, genome):
        ck = K.cage_key(spec, genome)
        return {str(z): k for (m, a, z), k in zip(self.VARIETY_VIEWS, K.frames(ck, self.VARIETY_VIEWS))}

    def renders(self, sp):
        """The render set of the file as it is now (instant, no render): every variant with its size, style and state (ready, or owed with the reason), and the styles that are not yet."""
        from wb import renders as RS
        rows = RS.expand(sp.spec)
        return dict(species=sp.id, path=sp.path, hash=sp.hash, base=RS.block(sp.spec).get("base", RS.BASE), rows=[dict(r, size=list(r["size"]) if r["size"] else None) for r in rows],
                    ready=sum(r["state"] == "ready" for r in rows), owed=sum(r["state"] == "owed" for r in rows), not_yet=RS.not_yet(sp.spec))

    def variety_run_key(self, spec_hash, n, seed):
        return H.hash_of("variety", spec_hash, int(n), int(seed), K.LOOK, "variety-1")

    def variety(self, sp, n=None, seed=None):
        """The Variety sheet of the file as it is now: its numbers (instant), the tile keys with whether each picture is in the cache, and the run before this one (the last run of a different file or seed)."""
        from wb import variety as VY
        spec = sp.spec
        res = VY.sheet(spec, n, seed)
        if res is None:
            raise ApiError(400, "this species has no sampler for a Variety sheet yet", "variety")
        for ind in res["individuals"]:
            keys = self.tile_keys(spec, ind["genome"])
            ind["tiles"] = {z: dict(key=k, ready=self.cas.has(k, "png")) for z, k in keys.items()}
        cur_key = self.variety_run_key(sp.hash, res["n"], res["seed"])
        runs = self.runs_of(sp.id)
        prev = next((r for r in reversed(runs) if r["key"] != cur_key), None)
        res.update(species=sp.id, hash=sp.hash, key=cur_key, ran=any(r["key"] == cur_key for r in runs), previous=prev)
        return res

    def submit_variety(self, sp, args, actor):
        from wb import variety as VY
        a = dict(args or {})
        spec = copy.deepcopy(sp.spec)
        try:
            v = VY.settings(spec, a.get("n"), a.get("seed"))
        except (TypeError, ValueError):
            raise ApiError(400, "n and seed are whole numbers", "args")
        if VY.sheet(spec, 1, v["seed"]) is None:
            raise ApiError(400, "this species has no sampler for a Variety sheet yet", "variety")
        spec_hash = H.hash_of(spec)
        key = self.variety_run_key(spec_hash, v["n"], v["seed"])
        job = J.Job(self.queue.new_id(), sp.id, "variety", dict(n=v["n"], seed=v["seed"]), key, J.PRIORITY["variety"], spec, spec_hash, actor)
        run = next((r for r in self.runs_of(sp.id) if r["key"] == key), None)
        if run and all(self.cas.has(k, "png") for t in run["tiles"] for k in t["keys"].values()):
            job.cached, job.state, job.result = True, "done", dict(run, cache=dict(job_hit=True))
            job.t_start = job.t_end = time.time()
            job.event.set()
            self.queue.add(job)
            self.hub.emit("done", sp.id, job=job.id, kind="variety", cached=True, key=key, actor=(actor or {}).get("name"))
            return job
        active = self.queue.find_active(sp.id, "variety", key)
        if active:
            return active
        self.queue.add(job)
        self.hub.emit("queued", sp.id, job=job.id, kind="variety", priority=job.priority, key=key, actor=(actor or {}).get("name"), spec_hash=spec_hash)
        return job

    def variety_loop(self):
        from wb import variety as VY
        while not self.stopping:
            job = self.queue.pop(("variety",), timeout=0.5)
            if job is None:
                continue
            self.hub.emit("running", job.species, job=job.id, kind="variety")
            try:
                sheet = VY.sheet(job.spec, job.args["n"], job.args["seed"])
                tiles, hits, total = [], 0, 0
                for k, ind in enumerate(sheet["individuals"]):
                    rj = self.submit(job.species, "render", dict(genome=ind["genome"], views=[list(v) for v in self.VARIETY_VIEWS]), job.actor, priority=job.priority, spec=job.spec, spec_hash=job.spec_hash)
                    rj.event.wait(900)
                    if rj.state != "done":
                        self.finish_failed(job, f"No. {ind['n']}: " + (rj.error or f"the render job ended {rj.state}"), rj.field)
                        break
                    vs = rj.result["views"]
                    hits += sum(1 for v in vs if v["cached"])
                    total += len(vs)
                    tiles.append(dict(n=ind["n"], genome=ind["genome"], keys={str(v["size"]): v["key"] for v in vs}, fails=[f["rule"] for f in ind["fails"]]))
                    job.progress = round((k + 1) / len(sheet["individuals"]), 3)
                    self.hub.emit("running", job.species, job=job.id, kind="variety", progress=job.progress)
                else:
                    run = dict(key=job.key, t=S.now(), spec_hash=job.spec_hash, n=job.args["n"], seed=job.args["seed"], tiles=tiles, failing=sheet["failing"], cached_tiles=hits, tiles_total=total)
                    self.save_run(job.species, run)
                    self.queue.finish(job, "done", dict(run, cache=dict(job_hit=False, views_hit=hits, views_total=total)))
                    self.hub.emit("done", job.species, job=job.id, kind="variety", key=job.key, cached=False)
            except Exception as e:
                self.finish_failed(job, f"{type(e).__name__}: {e}", None)

    # ---- play (chunk 13): the toys, the safe-step sweep, and a play save
    def sweep_key(self, spec):
        from wb import play as PL
        return H.hash_of("sweep", spec, CH.version_id("cage"), PL.VERSION, H.framework_id())

    def sweep_state(self, sp):
        """The sweep for the file as it is now: {state: fresh | stale | none | running, result, key, at}. It never starts the job."""
        key = self.sweep_key(sp.spec)
        res = self.cas.get_json(key)
        running = self.queue.find_active(sp.id, "sweep", key)
        if res is not None:
            self.sweeps_seen[sp.id] = (res, key)
            return dict(state="fresh", result=res, key=key, running=bool(running))
        old = self.sweeps_seen.get(sp.id)
        return dict(state="running" if running else ("stale" if old else "none"), result=old[0] if old else None, key=key, running=bool(running))

    def toys(self, sp):
        """What the page and `wb toys` show: the effective toys with the sweep's trims (a stale sweep's trims are shown, marked), the sentence slots, the genome that builds the mibi as its toys have it."""
        from wb import play as PL
        sw = self.sweep_state(sp)
        res = sw["result"]
        toys = PL.toys_of(sp.spec, res)
        if PL.BUILT.get(sp.spec.get("plan"), False):
            self.add_pictures(sp.spec, toys, PL.home_state(sp.spec, res))
        return dict(plan=sp.spec.get("plan"), built=PL.BUILT.get(sp.spec.get("plan"), False), toys=toys, slots=PL.slots(sp.spec), genome=PL.state_genome(sp.spec), name=PL.mibi_name(sp.spec), species=sp.spec.get("name") or sp.id,
                    warm=self.warm_state(sp),
                    by_toy={t["id"]: {m["id"]: PL.sentence_of(sp.spec, m["id"], t["id"])[1] for m in CH.metas() if m["stage"] == "cage"} for t in toys},
                    sentences={**{m["id"]: PL.sentence_of(sp.spec, m["id"])[1] for m in CH.metas() if m["stage"] == "cage"}, "build": PL.HOLD, "default": PL.sentence_of(sp.spec, "default")[1]},
                    sweep=dict(state=sw["state"], key=sw["key"], summary=None if res is None else {k: v for k, v in res.items() if k != "toys"}), hold=PL.HOLD)

    def submit_sweep(self, sp, args, actor):
        spec = copy.deepcopy(sp.spec)
        key = self.sweep_key(spec)
        job = J.Job(self.queue.new_id(), sp.id, "sweep", dict(), key, J.PRIORITY["sweep"], spec, H.hash_of(spec), actor)
        res = self.cas.get_json(key)
        if res is not None:
            job.cached, job.state, job.result = True, "done", dict(res, cache=dict(job_hit=True))
            job.t_start = job.t_end = time.time()
            job.event.set()
            self.queue.add(job)
            self.hub.emit("done", sp.id, job=job.id, kind="sweep", cached=True, key=key, actor=(actor or {}).get("name"))
            return job
        active = self.queue.find_active(sp.id, "sweep", key)
        if active:
            return active
        self.queue.add(job)
        self.hub.emit("queued", sp.id, job=job.id, kind="sweep", priority=job.priority, key=key, actor=(actor or {}).get("name"), spec_hash=job.spec_hash)
        return job

    def cage_fails(self, sid, spec, spec_hash, genome, actor, priority=2, timeout=900):
        """The ids of the cage checks that fail on the clay of `genome`, or ["build"] when the cage did not build."""
        j = self.submit(sid, "check", dict(genome=genome, stage="cage"), actor, priority=priority, spec=spec, spec_hash=spec_hash)
        j.event.wait(timeout)
        return self.fails_of_job(j)

    @staticmethod
    def fails_of_job(j):
        if j.state == "failed":
            return ["build"]
        if j.state != "done":
            raise ApiError(409, f"the check job ended {j.state}: {j.error or 'the file changed'}", None)
        return sorted(r["id"] for r in j.result["rows"] if r["state"] == "fail")

    def sweep_loop(self):
        from wb import play as PL
        while not self.stopping:
            job = self.queue.pop(("sweep",), timeout=0.5)
            if job is None:
                continue
            self.hub.emit("running", job.species, job=job.id, kind="sweep", actor=(job.actor or {}).get("name"))
            try:
                spec = job.spec
                if not PL.BUILT.get(spec.get("plan")):
                    res = PL.unbuilt(spec)
                else:
                    base_ids = set(self.cage_fails(job.species, spec, job.spec_hash, PL.state_genome(spec), job.actor))

                    def fails_of(states):
                        jobs = [self.submit(job.species, "check", dict(genome=PL.genome_of(s, spec), stage="cage"), job.actor, priority=2, spec=spec, spec_hash=job.spec_hash) for s in states]
                        out = []
                        for j in jobs:
                            j.event.wait(900)
                            out.append([c for c in self.fails_of_job(j) if c not in base_ids])
                        return out

                    def progress(n):
                        job.progress = dict(done=n)
                        self.hub.emit("running", job.species, job=job.id, kind="sweep", progress=job.progress)
                    t0 = time.time()
                    res = PL.sweep(spec, fails_of, progress=progress)
                    res["seconds"] = round(time.time() - t0, 2)
                    res["base_fails"] = sorted(base_ids)
                self.cas.put_json(job.key, res)
                self.queue.finish(job, "done", dict(res, cache=dict(job_hit=False)))
                self.hub.emit("done", job.species, job=job.id, kind="sweep", key=job.key, cached=False, actor=(job.actor or {}).get("name"))
            except ApiError as e:
                self.finish_failed(job, e.message if hasattr(e, "message") else str(e), None)
            except Exception as e:
                self.finish_failed(job, f"{type(e).__name__}: {e}", None)

    def play_save(self, sid, b, actor):
        """A play edit (spec 2.4): one toy axis moved to one step. The file is checked, then the clay of the new mibi is built and checked; a failure is refused, nothing is saved, the toy springs back to where it was
        and the answer carries the one sentence the mibi says. Studio's own save (PATCH) never refuses a failing check, only a file that is not valid."""
        from wb import play as PL
        import species_v1 as V1
        sp = self.get_species(sid)
        spec = copy.deepcopy(sp.spec)
        toy, axis, to = b.get("toy"), b.get("axis"), b.get("to")
        try:
            ops = PL.edit_ops(spec, toy, axis, to)
        except ValueError as e:
            raise ApiError(400, str(e), f"play.{toy}.{axis}")
        plan_ax = next((a for t in PL.plan_toys(spec) if t["id"] == toy for a in t["axes"] if a["id"] == axis), None)
        if plan_ax and plan_ax.get("virtual"):                      # How different? and Grow are settings of the pods, not of the body: nothing to build or check, the file keeps them
            errs = V1.validate(S.apply_patch(spec, ops))
            if errs:
                return dict(ok=False, refused=True, why="file", checks=[], sentence=PL.HOLD, back_to=PL.toys_of(spec)[0]["axes"][0]["home"], toy=toy, axis=axis, field=errs[0][0], hash=sp.hash)
            res = self.patch_species(sid, ops, actor, via="play")
            return dict(ok=True, refused=False, virtual=True, hash=res["hash"], genome=PL.state_genome(spec), state=PL.state_of(spec), plush=dict(key=None, ready=True, job=None), clay_job=None, toys=PL.toys_of(S.apply_patch(spec, ops)), **sp.can_undo_redo())
        cur_toy = next((t for t in PL.toys_of(spec) if t["id"] == toy), None)
        cur_ax = next((a for a in (cur_toy or {}).get("axes", []) if a["id"] == axis), None)
        back = None if cur_ax is None else cur_ax["home"]

        def refuse(why, check_ids, field=None, src=None):
            sent = [dict(check=c, source=PL.sentence_of(spec, c, toy)[0], sentence=PL.sentence_of(spec, c, toy)[1] if c != "build" else PL.HOLD) for c in check_ids]
            return dict(ok=False, refused=True, why=why, checks=sent, sentence=(sent[0]["sentence"] if sent else PL.HOLD), back_to=back, toy=toy, axis=axis, field=field, hash=sp.hash)
        new = S.apply_patch(spec, ops)
        errs = V1.validate(new)
        if errs:
            return refuse("file", [], errs[0][0])
        sw = self.sweep_state(sp)
        if sw["state"] in ("fresh", "stale"):                       # the trims of the sweep made when the starter was made hold for the mibi's later settings too; the build below is the last word
            t = next((t for t in PL.toys_of(spec, sw["result"]) if t["id"] == toy), None)
            a = next((a for a in (t or {}).get("axes", []) if a["id"] == axis), None)
            if a:
                st = (a["steps"][to] if a["kind"] == "range" else next((o for o in a["options"] if o["id"] == to), None))
                if st and not st["ok"]:
                    return refuse("trimmed", st["why"] or ["default"])
        if not PL.BUILT.get(spec.get("plan")):
            return refuse("unbuilt", [], "plan")
        base = set(self.cage_fails(sid, spec, H.hash_of(spec), PL.state_genome(spec), actor, priority=1))
        fails = [c for c in self.cage_fails(sid, new, H.hash_of(new), PL.state_genome(new), actor, priority=1) if c not in base]
        if fails:
            return refuse("check", fails)
        res = self.patch_species(sid, ops, actor, via="play")
        g = PL.state_genome(new)
        pic = self.picture(new, g)
        rj = pj = None
        try:
            if not pic["ready"]:                                    # not drawn yet: the clay at once, the plush behind it (the latest move wins: a newer save drops these if they have not started)
                rj = self.submit(sid, "render", dict(genome=g, views=[["clay", 32, 304]]), actor, priority=0)
                pj = self.submit_plush(self.get_species(sid), g, actor, 1)
        except ApiError:
            pass
        return dict(ok=True, refused=False, hash=res["hash"], genome=g, state=PL.state_of(new), render=rj.public() if rj else None, plush=dict(pic, job=pj.id if pj else None), clay_job=rj.id if rj else None,
                    toys=PL.toys_of(new, sw["result"] if sw["state"] in ("fresh", "stale") else None), **sp.can_undo_redo())

    # ---- play (chunk 14): plush pictures, the warm set, the starters
    def neutral(self, spec):
        """The file as the pictures see it: no id, name or play block, so a starter and its species draw the same picture for the same genome (and share the toys' end pictures)."""
        n = copy.deepcopy(spec)
        n["id"], n["name"] = "S00", ""
        n.pop("play", None)
        return n

    def plush_key(self, spec, genome, neutral=None):
        n = neutral or self.neutral(spec)
        ispec = F.internal(n)
        c, _ = F.cage_inputs(ispec, F.resolve_genome(genome, ispec))
        return H.hash_of("plush", PLUSH_LOOK, F.cage_key(n, genome), c.get("coat"), {k: ispec.get(k) for k in ("zones", "layouts", "palettes", "material", "face")})

    def picture(self, spec, genome, neutral=None, nh=None, big=False):
        """{key, ready}: where the plush of this genome is in the cache, and whether it is there. `big`: the stage's picture, twice the size (608x624, the mibi filling about 85 % of the height)."""
        nh = nh or H.hash_of(neutral or self.neutral(spec))
        k = self.pic_keys.get((nh, genome))
        if k is None:
            try:
                k = self.plush_key(spec, genome, neutral)
            except F.BuildError as e:
                raise ApiError(400, e.message, "genome")
            self.pic_keys[(nh, genome)] = k
        if big:
            k = H.hash_of("plush-big", k)
        return dict(key=k, ready=self.cas.has(k, "png", touch=False))

    def add_pictures(self, spec, toys, home):
        """Every step and chip of every toy with its pictures: `end` (the type with only this value changed; the toy's own end picture) and `now` (the mibi as it stands with this one axis moved: what a move shows at once)."""
        from wb import play as PL
        n = self.neutral(spec)
        nh = H.hash_of(n)
        for t in toys:
            for ax in t["axes"]:
                if ax["virtual"]:
                    continue
                for x in (ax.get("steps") or ax.get("options") or []):
                    v = x["value"] if ax["kind"] == "range" else x["id"]
                    x["end"] = dict(x["end"], **self.picture(spec, x["end"]["genome"], n, nh))
                    g = PL.genome_of({**home, ax["locus"]: v}, spec)
                    x["now"] = dict(genome=g, **self.picture(spec, g, n, nh))

    def clip_key(self, spec, genome, clip, style, neutral=None):
        """Where a clip's strip is in the cache: the frames of one clip of one genome in one style, side by side. It moves with everything the plush picture moves with, and with the clip's own poses (wb/clips.py)."""
        from wb import clips as CL
        return H.hash_of("clip", style, CL.V, clip, CL.frames(clip, CL.plan_of(spec)), self.plush_key(spec, genome, neutral), spec.get("motion"))

    def clip_of(self, sp, spec, genome, clip, n=None, nh=None, ask=True, priority=1):
        """A clip of a genome: the clay strip first (a few seconds), then the plush (about 25 s on one worker). {clay, plush: {key, ready, job}, frames, period, frame_s, size}; with `ask` what is not in the cache is asked for, the clay first."""
        from wb import clips as CL
        n = n or self.neutral(spec)
        out = dict(CL.timings(spec, clip, None), genome=genome)
        out.pop("ms")
        for style in ("clay", "plush"):
            k = self.clip_key(spec, genome, clip, style, n)
            ready = self.cas.has(k, "png", touch=False)
            job = None
            if not ready and ask:
                job = self.submit_clay_clip(sp, genome, clip, k, spec) if style == "clay" else self.submit_plush(sp, genome, PLAY_ACTOR, priority, spec=spec, clip=clip, key=k)
            out[style] = dict(key=k, ready=ready, job=job.id if job else None)
        return out

    def submit_clay_clip(self, sp, genome, clip, key, spec):
        job = J.Job(self.queue.new_id(), sp.id, "clayclip", dict(genome=genome, clip=clip), key, J.PRIORITY["clayclip"], spec, H.hash_of(spec), PLAY_ACTOR)
        with self.queue.cv:
            for j in self.queue.jobs.values():
                if j.kind == "clayclip" and j.key == key and j.state in ("queued", "running"):
                    return j
        self.queue.add(job)
        self.hub.emit("queued", sp.id, job=job.id, kind="clayclip", priority=job.priority, key=key, actor="play", spec_hash=job.spec_hash)
        return job

    def submit_plush(self, sp, genome, actor, priority=None, spec=None, big=False, clip=None, key=None):
        """The plush of one genome (az 32, 304x312, or the stage's 608x624 with `big`): from the cache at once, else a job. `priority` 1 (play) or 3 (the warm set); a job already waiting at a lower priority is moved up."""
        spec = copy.deepcopy(sp.spec) if spec is None else spec
        pic = self.picture(spec, genome, big=big)
        if clip:                                                     # a clip's strip of the plush: the same worker, its own key
            pic = dict(key=key, ready=self.cas.has(key, "png", touch=False))
        job = J.Job(self.queue.new_id(), sp.id, "plush", dict(genome=genome, big=True) if big else dict(genome=genome, **({"clip": clip} if clip else {})), pic["key"], J.PRIORITY["plush"] if priority is None else priority, spec, H.hash_of(spec), actor)
        if pic["ready"]:
            job.cached, job.state = True, "done"
            job.result = dict(views=[dict(mode="plush", az=32, size=608 if big else 304, key=pic["key"], cached=True, ms=0.0)], ms=0.0, cache=dict(job_hit=True))
            job.t_start = job.t_end = time.time()
            job.event.set()
            self.queue.add(job)
            self.hub.emit("done", sp.id, job=job.id, kind="plush", cached=True, key=pic["key"], actor=(actor or {}).get("name"))
            return job
        with self.queue.cv:
            for j in self.queue.jobs.values():
                if j.kind == "plush" and j.key == pic["key"] and j.state in ("queued", "running"):
                    if j.state == "queued" and job.priority < j.priority:
                        j.priority, j.spec_hash = job.priority, job.spec_hash
                    return j
        self.queue.add(job)
        self.hub.emit("queued", sp.id, job=job.id, kind="plush", priority=job.priority, key=pic["key"], actor=(actor or {}).get("name"), spec_hash=job.spec_hash)
        return job

    def warm_key(self, spec, sweep_key):
        from wb import play as PL
        return H.hash_of("warm", PLUSH_LOOK, self.neutral(spec), PL.state_of(spec), (spec.get("play") or {}).get("genome"), sweep_key, CH.version_id("cage"), "walk-strip", __import__("wb.clips", fromlist=["x"]).V, spec.get("motion"))

    def warm_state(self, sp):
        """What the page says about the starter's warm set: {state: none | running | done, done, total, result}. It never starts anything."""
        from wb import play as PL
        sw = self.sweep_state(sp)
        key = self.warm_key(sp.spec, sw["key"])
        res = self.cas.get_json(key)
        if res is not None:
            self.warms[sp.id] = res
            return dict(state="done", done=res["frames"], total=res["frames"], result=res, key=key)
        j = self.queue.find_active(sp.id, "warm", key) or next((x for x in list(self.queue.jobs.values()) if x.species == sp.id and x.kind == "warm" and x.state in ("queued", "running")), None)
        if j is not None:
            return dict(state="running", done=(j.progress or {}).get("done", 0), total=(j.progress or {}).get("total"), key=key)
        old = self.warms.get(sp.id)                                  # the mibi has moved since: its starter's warm set is still what the cache holds
        if old is not None:
            return dict(state="done", done=old["frames"], total=old["frames"], result=old, key=key, stale=True)
        return dict(state="none", done=0, total=None, key=key)

    def play_start(self, sp):
        """A starter is made or kept: its sweep runs (spec 2.4) and then its warm set (spec 7). Nothing is started for a species that is not a starter or whose plan has no cage builder yet."""
        from wb import play as PL
        if not isinstance(sp.spec, dict) or not (sp.spec.get("play") or {}).get("starter") or not PL.BUILT.get(sp.spec.get("plan")):
            return None
        try:
            return self.submit_warm(sp, PLAY_ACTOR)
        except ApiError:
            return None

    def submit_warm(self, sp, actor):
        spec = copy.deepcopy(sp.spec)
        sk = self.sweep_key(spec)
        key = self.warm_key(spec, sk)
        job = J.Job(self.queue.new_id(), sp.id, "warm", dict(), key, J.PRIORITY["warm"], spec, H.hash_of(spec), actor)
        res = self.cas.get_json(key)
        if res is not None:
            job.cached, job.state, job.result = True, "done", dict(res, cache=dict(job_hit=True))
            job.t_start = job.t_end = time.time()
            job.event.set()
            self.queue.add(job)
            return job
        active = self.queue.find_active(sp.id, "warm", key)
        if active:
            return active
        self.queue.add(job)
        self.hub.emit("queued", sp.id, job=job.id, kind="warm", priority=job.priority, key=key, actor=(actor or {}).get("name"), spec_hash=job.spec_hash)
        return job

    def warm_loop(self):
        """The warm set of a starter: its sweep first, then the plush of every step of every toy and each toy's ends, and the cage check of every step (so a move answers at once), all at P3 behind any player's job."""
        from wb import play as PL
        while not self.stopping:
            job = self.queue.pop(("warm",), timeout=0.5)
            if job is None:
                continue
            self.hub.emit("running", job.species, job=job.id, kind="warm", actor=(job.actor or {}).get("name"))
            try:
                sp = self.get_species(job.species)
                spec = job.spec
                sj = self.submit_sweep(sp, {}, job.actor) if self.sweep_state(sp)["state"] == "none" else None
                if sj is not None:
                    sj.event.wait(3600)
                res_sw = self.sweep_state(sp)["result"]
                items = PL.warm_set(spec, res_sw)
                t0 = time.time()
                job.progress = dict(done=0, total=len(items))
                base_ids = set(self.cage_fails(job.species, spec, job.spec_hash, PL.state_genome(spec), job.actor, priority=3))
                pending = []
                for it in items:
                    pj = self.submit_plush(sp, it["genome"], job.actor, 3, spec=spec)
                    cj = None
                    if it["kind"] == "step" and it["toy"] not in ("paint", "pattern"):
                        cj = self.submit(job.species, "check", dict(genome=it["genome"], stage="cage"), job.actor, priority=3, spec=spec, spec_hash=job.spec_hash)
                    pending.append((it, pj, cj))
                walk = self.clip_of(sp, spec, PL.state_genome(spec), "walk", ask=False)["plush"]    # the walk strip of the mibi as it stands: plush only, the clay strip is asked for on the page
                wj = None if walk["ready"] else self.submit_plush(sp, PL.state_genome(spec), job.actor, 3, spec=spec, clip="walk", key=walk["key"])
                job.progress = dict(done=0, total=len(items) + 1)
                done, frames, size, bad = 0, [], 0, []
                for it, pj, cj in pending:
                    pj.event.wait(3600)
                    if cj is not None:
                        cj.event.wait(3600)
                    done += 1
                    job.progress = dict(done=done, total=len(items) + 1)
                    self.hub.emit("running", job.species, job=job.id, kind="warm", progress=job.progress)
                    if pj.state != "done":
                        bad.append(dict(genome=it["genome"], error=pj.error))
                        continue
                    k = pj.key
                    frames.append(dict(it, key=k))
                    try:
                        size += os.path.getsize(self.cas.path(k, "png"))
                    except OSError:
                        pass
                if wj is not None:
                    wj.event.wait(3600)
                    if wj.state != "done":
                        bad.append(dict(genome=PL.state_genome(spec), clip="walk", error=wj.error))
                if wj is None or wj.state == "done":
                    try:
                        size += os.path.getsize(self.cas.path(walk["key"], "png"))
                    except OSError:
                        pass
                times = [self.cas.get_json(f["key"]) or {} for f in frames]
                res = dict(version=PL.VERSION, look=PLUSH_LOOK, frames=len(frames), bytes=size, failed=bad, seconds=round(time.time() - t0, 1), draw_seconds=round(sum((t.get("ms") or 0) for t in times) / 1000, 1),
                           drawn=sum(1 for t in times if t.get("ms")), items=frames, walk=dict(key=walk["key"], clip="walk"), at=S.now())
                if not bad:
                    self.cas.put_json(job.key, res)
                self.queue.finish(job, "done", dict(res, cache=dict(job_hit=False)))
                self.hub.emit("done", job.species, job=job.id, kind="warm", key=job.key, cached=False, actor=(job.actor or {}).get("name"))
            except Exception as e:                                   # noqa: BLE001
                self.finish_failed(job, f"{type(e).__name__}: {e}", None)

    def starters(self):
        """P1's cushions: every species that is a starter, with its own name, its species, the genome it stands in and its plush (asked for when it is not drawn yet)."""
        from wb import play as PL
        out = []
        for sp in sorted(self.species.values(), key=lambda s: s.id):
            spec = sp.spec
            if not isinstance(spec, dict) or not (spec.get("play") or {}).get("starter"):
                continue
            built = PL.BUILT.get(spec.get("plan"), False)
            g = PL.state_genome(spec)
            pic = self.picture(spec, g) if built else dict(key=None, ready=False)
            if built and not pic["ready"]:
                try:
                    self.submit_plush(sp, g, PLAY_ACTOR, 1)
                except ApiError:
                    pass
            out.append(dict(id=sp.id, name=PL.mibi_name(spec), species=spec.get("name") or sp.id, plan=spec.get("plan"), built=built, genome=g, plush=pic, warm=self.warm_state(sp) if built else None, mine=bool((spec.get("play") or {}).get("kept"))))
        return out


    # ---- play (chunk 15): the pods, growing up, keeping
    def pic_of(self, sp, spec, genome, priority, n=None, nh=None):
        """{key, ready, job}: the plush of a genome, from the cache or asked for."""
        pic = self.picture(spec, genome, n, nh)
        job = None if pic["ready"] else self.submit_plush(sp, genome, PLAY_ACTOR, priority, spec=spec)
        return dict(pic, job=job.id if job else None)

    def pods(self, sp, round_no=0, dial=None, grow=None, mate=None):
        """The six pods of a make and their pictures at the age the Grow toy shows: each pod is a genome of the file (the mibi's own line, the dial's width, the round), asked for in order so the first hatches first. A pod whose picture would not
        build is drawn again from the same stream. The strip under the nest and the two ends of the Grow toy come with them."""
        from wb import play as PL
        spec = copy.deepcopy(sp.spec)
        pl = spec.get("play") if isinstance(spec.get("play"), dict) else {}
        dial = dial or pl.get("diff") or "some"
        grow = grow or pl.get("grow") or "juvenile"
        if dial not in PL.DIALS or grow not in PL.GROWS:
            raise ApiError(400, f"how different? is one of {', '.join(PL.DIALS)}; grow is one of {', '.join(PL.GROWS)}", "pods")
        if not PL.BUILT.get(spec.get("plan")):
            raise ApiError(409, f"the {spec.get('plan')} plan has no cage builder yet: its pods cannot be drawn", "plan")
        n = self.neutral(spec)
        nh = H.hash_of(n)
        parent = PL.parent_copies(spec)
        crossed = None
        if mate:                                                   # two mibis: a cross, refused for direct kin as the game refuses it
            m = self.get_species(mate)
            look = lambda i: dict(id=i, parents=((self.species[i].spec.get("play") or {}).get("parents") or [])) if i in self.species else None
            try:
                crossed = {p_["i"]: p_ for p_ in PL.pods_with(spec, copy.deepcopy(m.spec), look, round_no, dial)}
            except PL.KinError as e:
                raise ApiError(409, str(e), "mate", rel=e.rel)
            except ValueError as e:
                raise ApiError(409, str(e), "mate")
        pods = []
        for i in range(PL.POD_COUNT):
            k = 0
            while True:
                c = crossed[i]["copies"] if crossed else PL.make_pod(spec, parent, dial, round_no, i, k)
                if c is None:
                    break
                g = PL.pod_selector(PL.at_stage(spec, c, grow))
                if self.picture(spec, g, n, nh)["key"] in self.bad_pics and k < 3 and not crossed:
                    k += 1
                    continue
                break
            if c is None:
                continue
            pods.append(dict(i=i, tries=k, genome=g, gated=[dict(id=a, label=b, now=now) for a, b, now in PL.gated_looks(spec, c, grow)], **self.pic_of(sp, spec, g, 1, n, nh)))
        first = next((p for p in pods), None)
        ends = []
        if first:
            c0 = PL.make_pod(spec, parent, dial, round_no, first["i"], first["tries"])
            for st in (PL.GROWS[0], PL.GROWS[-1]):
                ends.append(dict(stage=st, **self.pic_of(sp, spec, PL.pod_selector(PL.at_stage(spec, c0, st)), 2, n, nh)))
        fam = PL.family_rows(spec)
        for r in fam:
            r["pic"] = self.pic_of(sp, spec, f"set:{r['locus']}={r['look']}", 2, n, nh)
        return dict(round=round_no, diff=dial, grow=grow, name=PL.mibi_name(spec), species=spec.get("name") or sp.id, pods=pods, grow_ends=ends, family=fam, names=PL.offered_names(*self.name_sets()), plural=PL.plural_of(spec))

    def name_sets(self):
        """What the namer checks a name against: the names the player's mibis hold, and the species' names."""
        from wb import play as PL
        held = [pl["name"] for pl in ((sp.spec.get("play") or {}) for sp in self.species.values()) if isinstance(pl, dict) and isinstance(pl.get("name"), str) and pl["name"].strip()]
        return held, [sp.spec.get("name") for sp in self.species.values() if sp.spec.get("name") and not (sp.spec.get("play") or {}).get("name")]

    def next_mibi_id(self):
        n = 1 + max([int(k[1:]) for k in self.species if re.fullmatch(r"M\d{4}", k)] or [0])
        return f"M{n:04d}"

    def keep(self, sid, b, actor):
        """Keep a pod: it becomes a species file of its own in the player's space, a mibi that joins My mibis and is shaped like a starter. Its warm set is made in the background (play_start)."""
        from wb import play as PL
        import species_v1 as V1
        sp = self.get_species(sid)
        spec = copy.deepcopy(sp.spec)
        try:
            round_no, i, tries = int(b.get("round", 0)), int(b["i"]), int(b.get("tries", 0))
        except (KeyError, TypeError, ValueError):
            raise ApiError(400, "keep needs the pod: round, i, tries", "pod")
        pl = spec.get("play") if isinstance(spec.get("play"), dict) else {}
        dial, grow = b.get("diff") or pl.get("diff") or "some", b.get("grow") or pl.get("grow") or "juvenile"
        name = b.get("name")
        why = PL.name_problem(name, *self.name_sets(), at_done=True)
        if why:
            raise ApiError(400, PL.refuse_line(why), "name", refused=why["key"], **({"holder": why["holder"]} if "holder" in why else {}))
        name = name.strip()
        c = PL.make_pod(spec, PL.parent_copies(spec), dial, round_no, i, tries)
        if c is None:
            raise ApiError(404, "there is no such pod", "pod")
        d = PL.kept_doc(spec, self.next_mibi_id(), name, c, dial, grow)
        errs = V1.validate(d)
        if errs:
            raise ApiError(400, errs[0][1], errs[0][0])
        S.write_spec(os.path.join(self.mine_dir, d["id"] + ".json"), d)
        self.scan()
        return dict(id=d["id"], name=d["play"]["name"], species=d.get("name"), parents=d["play"]["parents"])

    # ---- goldens (chunk 12): the state is read from files alone (instant); `make` and `diff` are jobs that draw the set in a Blender process of their own
    def goldens(self, sp):
        from wb import golden as G
        return G.state(sp.path, self.home, sp.history(200))

    def submit_golden(self, sp, args, actor):
        from wb import golden as G
        a = dict(args or {})
        act = a.get("action", "make")
        if act not in ("make", "diff"):
            raise ApiError(400, f"golden action '{act}': make or diff", "action")
        if a.get("release"):
            raise ApiError(400, "release goldens are made by the release export, from the signed file; draft goldens are made here", "release")
        if act == "diff" and G.read_manifest(sp.path, sp.id) is None:
            raise ApiError(400, f"{sp.spec.get('name') or sp.id} has no goldens yet. Make goldens first.", "action")
        spec = copy.deepcopy(sp.spec)
        cur = G.current(spec)
        key = H.hash_of("golden-job", act, cur["key"])
        active = self.queue.find_active(sp.id, "golden", key)
        if active:
            return active
        job = J.Job(self.queue.new_id(), sp.id, "golden", dict(action=act), key, J.PRIORITY["golden"], spec, H.hash_of(spec), actor)
        self.queue.add(job)
        self.hub.emit("queued", sp.id, job=job.id, kind="golden", priority=job.priority, key=key, actor=(actor or {}).get("name"), spec_hash=job.spec_hash)
        return job

    def golden_loop(self):
        from wb import golden as G
        while not self.stopping:
            job = self.queue.pop(("golden",), timeout=0.5)
            if job is None:
                continue
            sp = self.species.get(job.species)
            self.hub.emit("running", job.species, job=job.id, kind="golden", actor=(job.actor or {}).get("name"))
            try:
                quiet = lambda m: None
                if job.args["action"] == "make":
                    m = G.make(sp.path, self.home, actor=(job.actor or {}).get("name"), commit=True, log=quiet)
                    res = dict(action="make", goldens=len(m["entries"]), commit=m["committed"])
                else:
                    G.diff(sp.path, self.home, self.cas, log=quiet)
                    res = dict(action="diff")
                self.queue.finish(job, "done", dict(res, totals=G.state(sp.path, self.home)["totals"]))
                self.hub.emit("done", job.species, job=job.id, kind="golden", key=job.key, cached=False, actor=(job.actor or {}).get("name"))
            except Exception as e:
                self.finish_failed(job, f"{type(e).__name__}: {e}", None)

    # ---- the export (chunk 24): glb, viewer, creature.json, the game frame and the layered stands, drawn by wb.export in its own process (it needs the render python); a P3 job pinned to the file it was asked for
    def export_dir(self, sid, mode, key):
        return os.path.join(self.home, "exports", sid, f"{mode}-{key[:16]}")

    def export_process(self, sp, argv_tail, timeout):
        from wb import golden as G
        env = dict(os.environ, PYTHONPATH=BODY)
        p = subprocess.run([G.render_python(), "-m", "wb.export", sp.path] + argv_tail, cwd=BODY, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=timeout)
        lines = [l for l in p.stdout.splitlines() if l.startswith("{")]
        if not lines:
            raise RuntimeError("the export failed (" + str(p.returncode) + "): " + " | ".join(p.stdout.splitlines()[-6:]))
        return p.returncode, json.loads(lines[-1])

    def submit_export(self, sp, args, actor):
        from wb import export as EX
        a = dict(args or {})
        mode = a.get("mode", "review")
        if mode not in ("review", "release"):
            raise ApiError(400, f"export mode '{mode}': review or release", "mode")
        if mode == "release":                                      # the refusal comes first, with every reason, and nothing is queued
            code, res = self.export_process(sp, ["/dev/null", "--release", "--blockers"], 300)
            if res.get("refused"):
                raise ApiError(400, "Release export is blocked: " + "; ".join(res["reasons"]), "release", reasons=res["reasons"])
        spec = copy.deepcopy(sp.spec)
        spec_hash = H.hash_of(spec)
        stands = a.get("stands", True) is not False
        key = H.hash_of("export", mode, spec_hash, H.framework_id(), EX.VERSION, stands)
        out = self.export_dir(sp.id, mode, key)
        man = os.path.join(out, "manifest.json")
        job = J.Job(self.queue.new_id(), sp.id, "export", dict(mode=mode, stands=stands), key, J.PRIORITY["export"], spec, spec_hash, actor)
        if os.path.exists(man):
            with open(man) as fh:
                job.cached, job.state, job.result = True, "done", dict(dir=out, manifest=man, **json.load(fh))
            job.t_start = job.t_end = time.time()
            job.event.set()
            self.queue.add(job)
            self.hub.emit("done", sp.id, job=job.id, kind="export", cached=True, key=key, actor=(actor or {}).get("name"))
            return job
        active = self.queue.find_active(sp.id, "export", key)
        if active:
            return active
        self.queue.add(job)
        self.hub.emit("queued", sp.id, job=job.id, kind="export", priority=job.priority, key=key, actor=(actor or {}).get("name"), spec_hash=spec_hash)
        return job

    def export_loop(self):
        while not self.stopping:
            job = self.queue.pop(("export",), timeout=0.5)
            if job is None:
                continue
            sp = self.species.get(job.species)
            self.hub.emit("running", job.species, job=job.id, kind="export", actor=(job.actor or {}).get("name"))
            try:
                out = self.export_dir(job.species, job.args["mode"], job.key)
                tmp = out + ".part"
                shutil.rmtree(tmp, ignore_errors=True)
                code, res = self.export_process(sp, [tmp] + (["--release"] if job.args["mode"] == "release" else []) + ([] if job.args.get("stands", True) else ["--no-stands"]), 1800)
                if res.get("refused"):
                    self.finish_failed(job, "Release export is blocked: " + "; ".join(res["reasons"]), "release")
                    continue
                shutil.rmtree(out, ignore_errors=True)
                os.replace(tmp, out)                                   # the folder appears whole or not at all
                with open(os.path.join(out, "manifest.json")) as fh:
                    man = json.load(fh)
                self.queue.finish(job, "done", dict(dir=out, manifest=os.path.join(out, "manifest.json"), **man))
                self.hub.emit("done", job.species, job=job.id, kind="export", key=job.key, cached=False, actor=(job.actor or {}).get("name"))
            except Exception as e:
                self.finish_failed(job, f"{type(e).__name__}: {e}", None)

    # ---- the gate (chunk 25): rounds, ticks and the two signatures live in wb.gate (a sidecar beside the species file); the six sheets of a round are drawn here, from the server's own jobs, one thread per round
    def gate_sheet_dir(self, sp, n):
        return os.path.join(self.home, "gate", sp.id, f"round-{n}")

    def gate_state(self, sp):
        from wb import gate as GT
        out = GT.public(GT.read(sp.path), H.hash_of(sp.spec))
        building = self.gate_building.get((sp.id, out["current"]))
        for r in out["rounds"]:
            d = self.gate_sheet_dir(sp, r["round"])
            for sh in r["sheets"]:
                if os.path.exists(os.path.join(d, sh["id"] + ".png")):
                    sh["url"] = f"/api/species/{sp.id}/gate/{r['round']}/sheet/{sh['id']}.png"
        out["building"] = bool(building and building.is_alive())
        out["actions"] = {}
        return out

    def gate_request(self, sp, actor):
        from wb import gate as GT, gatesheets as GS
        r, new = GT.request(sp.path, copy.deepcopy(sp.spec), actor)
        n = r["round"]
        have = os.path.exists(os.path.join(self.gate_sheet_dir(sp, n), "index.json"))
        live = self.gate_building.get((sp.id, n))
        if not have and not (live and live.is_alive()):
            def run():
                try:
                    shutil.rmtree(self.gate_sheet_dir(sp, n), ignore_errors=True)
                    GS.make(self, sp, n, self.gate_sheet_dir(sp, n), PLAY_ACTOR, log=lambda m: None)
                    self.hub.emit("gate", sp.id, sheets=True, round=n)
                except Exception as e:
                    print("gate sheets:", type(e).__name__, e, file=sys.stderr)
                    self.hub.emit("gate", sp.id, failed=str(e), round=n)
            t = threading.Thread(target=run, daemon=True, name=f"gate-{sp.id}-{n}")
            self.gate_building[(sp.id, n)] = t
            t.start()
        self.hub.emit("gate", sp.id, asked=True, round=n, actor=(actor or {}).get("name"))
        return r

    # ---- life cycle
    def start(self):
        for w in self.workers + self.plushers:
            w.thread.start()
        self.warmer.start()
        self.sheeter.start()
        self.varieter.start()
        self.golder.start()
        self.exporter.start()
        self.sweeper.start()
        self.proofer.start()
        self.watcher.start()
        self.cas.evict(self.cache_limit)
        with open(os.path.join(self.home, "server.json"), "w") as fh:
            json.dump(dict(host=self.host, port=self.port, pid=os.getpid(), url=f"http://{self.host}:{self.port}"), fh)
        threading.Thread(target=self.httpd.serve_forever, daemon=True, name="http").start()
        self.started = True
        for sp in list(self.species.values()):
            self.play_start(sp)

    def stop(self):
        self.stopping = True
        self.httpd.shutdown()
        self.httpd.server_close()
        for w in self.workers + self.plushers:
            w.stop()
        try:
            os.remove(os.path.join(self.home, "server.json"))
        except OSError:
            pass


def G_dir(sp):
    from wb import golden as G
    return G.golden_dir(sp.path, sp.id)


def G_read(sp):
    from wb import golden as G
    return G.read_manifest(sp.path, sp.id)


def make_handler(srv):
    class H_(BaseHTTPRequestHandler):
        server_version = "wb/1"

        def log_message(self, fmt, *a):
            print(f"{S.now()} {self.address_string()} {fmt % a}", file=sys.stderr)

        def route_path(self):
            return strip_prefix(urlparse(self.path).path)

        def actor(self, need=False):
            """Who is asking. The proxy's X-Studio-User counts only on a connection from the trusted proxy's address (and then acts as that user with the owner's role);
            from any other peer the header is ignored and a tokens.json token is needed, so nothing else on the network can pose as the owner."""
            user = (self.headers.get("X-Studio-User") or "").strip()
            if user and srv.trusted_proxy and peer_ip(self.client_address[0]) == srv.trusted_proxy:
                return dict(name="".join(c for c in user if c.isprintable())[:64] or "studio", role="owner", agent=False)
            tok = (self.headers.get("Authorization") or "").removeprefix("Bearer ").strip()
            who = srv.tokens.who(tok)
            if need and who is None:
                raise ApiError(401, "this call needs a token: set WB_TOKEN (see tokens.json in the server's home)", "token")
            return who

        def body(self):
            n = int(self.headers.get("Content-Length") or 0)
            try:
                return json.loads(self.rfile.read(n) or b"null")
            except ValueError:
                raise ApiError(400, "the body is not JSON", "body")

        def send_json(self, obj, status=200):
            data = json.dumps(obj).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def guarded(self, fn):
            try:
                fn()
            except ApiError as e:
                self.send_json(dict(error=e.message, field=e.field, **e.extra), e.status)
            except (BrokenPipeError, ConnectionResetError):
                pass
            except Exception as e:
                self.send_json(dict(error=f"{type(e).__name__}: {e}"), 500)

        def do_GET(self):
            self.guarded(self.get)

        def do_PATCH(self):
            self.guarded(self.patch)

        def do_POST(self):
            self.guarded(self.post)

        # -- GET
        def get(self):
            u = urlparse(self.path)
            p, q = strip_prefix(u.path), parse_qs(u.query)
            if p == "/api/species":
                return self.send_json([dict(id=s.id, name=s.spec.get("name"), path=s.path, hash=s.hash, error=s.error) for s in srv.species.values()])
            m = re.fullmatch(r"/api/species/([^/]+)", p)
            if m:
                s = srv.get_species(m.group(1))
                return self.send_json(dict(id=s.id, path=s.path, hash=s.hash, file=s.spec, error=s.error, lease=None, checks=srv.current_checks(s), extremes=srv.current_extremes(s), goldens=None, history=s.history(5), undo=s.can_undo_redo(), views=srv.current_views(s), labels=V1_labels()))
            m = re.fullmatch(r"/api/species/([^/]+)/freq", p)
            if m:
                return self.send_json(srv.freq(srv.get_species(m.group(1)), int(q.get("n", ["1000"])[0])))
            m = re.fullmatch(r"/api/species/([^/]+)/forms", p)
            if m:
                from wb import forms as FM
                return self.send_json(FM.forms(srv.get_species(m.group(1)).spec))
            m = re.fullmatch(r"/api/species/([^/]+)/toys", p)
            if m:
                return self.send_json(srv.toys(srv.get_species(m.group(1))))
            if p == "/api/play/starters":
                return self.send_json(srv.starters())
            m = re.fullmatch(r"/api/species/([^/]+)/pods", p)
            if m:
                try:
                    r = int(q.get("round", ["0"])[0])
                except ValueError:
                    raise ApiError(400, "round is a whole number", "round")
                return self.send_json(srv.pods(srv.get_species(m.group(1)), r, q.get("diff", [None])[0], q.get("grow", [None])[0], q.get("mate", [None])[0]))
            m = re.fullmatch(r"/api/species/([^/]+)/plush", p)
            if m:
                sp = srv.get_species(m.group(1))
                g = q.get("genome", [None])[0] or __import__("wb.play", fromlist=["x"]).state_genome(sp.spec)
                if q.get("size", [None])[0] == "big":                              # the stage's sharp picture: asked for after the 304 one is on the stage, behind every move and every pod
                    pic = srv.picture(sp.spec, g, big=True)
                    job = None if pic["ready"] else srv.submit_plush(sp, g, PLAY_ACTOR, 2, big=True)
                    return self.send_json(dict(genome=g, **pic, job=job.id if job else None, clay_job=None))
                pic = srv.picture(sp.spec, g)
                job = None if pic["ready"] else srv.submit_plush(sp, g, PLAY_ACTOR, 1)
                clay = None if pic["ready"] else srv.submit(sp.id, "render", dict(genome=g, views=[["clay", 32, 304]]), PLAY_ACTOR, priority=0)
                return self.send_json(dict(genome=g, **pic, job=job.id if job else None, clay_job=clay.id if clay else None))
            m = re.fullmatch(r"/api/species/([^/]+)/clip", p)
            if m:
                sp = srv.get_species(m.group(1))
                from wb import clips as CL
                clip = q.get("clip", ["walk"])[0]
                if clip not in CL.table(CL.plan_of(sp.spec)):
                    raise ApiError(400, f"clip is one of {', '.join(CL.table(CL.plan_of(sp.spec)))}", "clip")
                g = q.get("genome", [None])[0] or __import__("wb.play", fromlist=["x"]).state_genome(sp.spec)
                try:
                    return self.send_json(srv.clip_of(sp, copy.deepcopy(sp.spec), g, clip))
                except F.BuildError as e:
                    raise ApiError(400, e.message, "genome")
            m = re.fullmatch(r"/api/species/([^/]+)/spine", p)
            if m:
                from wb import spine as SPN
                return self.send_json(SPN.spine_view(srv.get_species(m.group(1)).spec))
            m = re.fullmatch(r"/api/species/([^/]+)/history", p)
            if m:
                s = srv.get_species(m.group(1))
                return self.send_json(dict(entries=s.history(int(q.get("n", ["200"])[0])), **s.can_undo_redo()))
            m = re.fullmatch(r"/api/species/([^/]+)/variety", p)
            if m:
                return self.send_json(srv.variety(srv.get_species(m.group(1)), q.get("n", [None])[0], q.get("seed", [None])[0]))
            if p == "/api/me":
                who = self.actor()
                return self.send_json(dict(name=who["name"], role=who["role"], agent=bool(who.get("agent"))) if who else dict(name=None, role=None, agent=False))
            m = re.fullmatch(r"/api/species/([^/]+)/gate", p)
            if m:
                return self.send_json(srv.gate_state(srv.get_species(m.group(1))))
            m = re.fullmatch(r"/api/species/([^/]+)/gate/(\d+)/sheet/([a-z-]+)\.(png|html)", p)
            if m:
                sp = srv.get_species(m.group(1))
                f = os.path.join(srv.gate_sheet_dir(sp, int(m.group(2))), f"{m.group(3)}.{m.group(4)}")
                if not os.path.exists(f):
                    raise ApiError(404, "that sheet is not drawn yet", "sheet")
                with open(f, "rb") as fh:
                    data = fh.read()
                self.send_response(200)
                self.send_header("Content-Type", "image/png" if m.group(4) == "png" else "text/html")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "private, no-cache")
                self.end_headers()
                return self.wfile.write(data)
            m = re.fullmatch(r"/api/species/([^/]+)/goldens", p)
            if m:
                return self.send_json(srv.goldens(srv.get_species(m.group(1))))
            m = re.fullmatch(r"/api/species/([^/]+)/goldens/file", p)
            if m:
                sp = srv.get_species(m.group(1))
                rel = q.get("id", [""])[0]
                man = G_read(sp)
                ent = next((e for e in (man or {}).get("entries", []) if e["id"] == rel), None)
                if not ent:
                    raise ApiError(404, "no such golden", "id")
                with open(os.path.join(G_dir(sp), ent["file"]), "rb") as fh:
                    data = fh.read()
                self.send_response(200)
                self.send_header("Content-Type", "image/png")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "private, no-cache")
                self.end_headers()
                return self.wfile.write(data)
            m = re.fullmatch(r"/api/species/([^/]+)/renders", p)
            if m:
                return self.send_json(srv.renders(srv.get_species(m.group(1))))
            m = re.fullmatch(r"/api/species/([^/]+)/string", p)
            if m:
                return self.send_json(srv.string_of(srv.get_species(m.group(1)), q.get("genome", ["type"])[0]))
            m = re.fullmatch(r"/api/jobs/(j\d+)", p)
            if m:
                j = srv.queue.jobs.get(m.group(1))
                if j is None:
                    raise ApiError(404, "no such job", "job")
                if "wait" in q:
                    j.event.wait(float(q["wait"][0]))
                return self.send_json(j.public())
            if p == "/api/stats":
                return self.send_json(dict(jobs=srv.queue.counts(), cache_bytes=srv.cas.size(), framework=H.framework_id(), workers=len(srv.workers)))
            if p == "/api/checks":
                return self.send_json(CH.metas())
            if p in ("/api/plans", "/api/families", "/api/styles"):
                return self.send_json([])
            if p == "/events":
                return self.events(q.get("species", [None])[0])
            m = re.fullmatch(r"/cas/([0-9a-f]+)\.(png|json|glb)", p)
            if m:
                key, ext = m.groups()
                if not srv.cas.has(key, ext):
                    raise ApiError(404, "not in the cache", "key")
                with open(srv.cas.path(key, ext), "rb") as fh:
                    data = fh.read()
                self.send_response(200)
                self.send_header("Content-Type", CT[ext])
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", IMMUTABLE)
                self.end_headers()
                return self.wfile.write(data)
            if srv.static and not p.startswith(("/api", "/cas", "/events")):
                return self.static(p)
            raise ApiError(404, "no such route", None)

        def static(self, p):
            """/assets/* are content-hashed files: immutable for a year. Any other path that is not a file of the app is a page of the single-page app: index.html, never cached."""
            rel = os.path.normpath(p.lstrip("/"))
            full = os.path.join(srv.static, rel)
            is_file = not rel.startswith("..") and rel != "." and os.path.isfile(full)
            if p.startswith("/assets/") and not is_file:
                raise ApiError(404, "not found", None)
            if not is_file:
                full = os.path.join(srv.static, "index.html")
            with open(full, "rb") as fh:
                data = fh.read()
            self.send_response(200)
            self.send_header("Content-Type", CT.get(full.rsplit(".", 1)[-1], "application/octet-stream"))
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", IMMUTABLE if p.startswith("/assets/") else "no-cache")
            self.send_header("Content-Security-Policy", CSP)
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(data)

        def events(self, species):
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            qq = srv.hub.subscribe(species)
            try:
                self.wfile.write(b": connected\n\n")
                self.wfile.flush()
                while not srv.stopping:
                    try:
                        ev = qq.get(timeout=10)
                        self.wfile.write(f"id: {ev['id']}\nevent: {ev['type']}\ndata: {json.dumps(ev)}\n\n".encode())
                    except queue.Empty:
                        self.wfile.write(b": keep-alive\n\n")
                    self.wfile.flush()
            finally:
                srv.hub.unsubscribe(qq)

        # -- PATCH
        def patch(self):
            m = re.fullmatch(r"/api/species/([^/]+)", self.route_path())
            if not m:
                raise ApiError(404, "no such route", None)
            actor = self.actor(need=True)
            ops = self.body()
            if not isinstance(ops, list):
                raise ApiError(400, "a JSON patch is a list of operations", "body")
            self.send_json(srv.patch_species(m.group(1), ops, actor))

        # -- POST
        def post(self):
            p = self.route_path()
            m = re.fullmatch(r"/api/species/([^/]+)/jobs", p)
            if m:
                actor = self.actor(need=True)
                b = self.body() or {}
                job = srv.submit(m.group(1), b.get("kind"), b.get("args"), actor)
                return self.send_json(job.public(), 200 if job.state == "done" else 202)
            m = re.fullmatch(r"/api/species/([^/]+)/play", p)
            if m:
                res = srv.play_save(m.group(1), self.body() or {}, self.actor(need=True))
                return self.send_json(res, 200 if res["ok"] else 409)
            m = re.fullmatch(r"/api/species/([^/]+)/keep", p)
            if m:
                return self.send_json(srv.keep(m.group(1), self.body() or {}, self.actor(need=True)))
            m = re.fullmatch(r"/api/species/([^/]+)/(undo|redo)", p)
            if m:
                return self.send_json(srv.revert(m.group(1), m.group(2), self.actor(need=True)))
            m = re.fullmatch(r"/api/species/([^/]+)/gate", p)
            if m:                                                      # asking for a round: a maker's own action (and a reviewer's or the owner's may ask too); an anonymous call is refused by need=True
                sp = srv.get_species(m.group(1))
                srv.gate_request(sp, self.actor(need=True))
                return self.send_json(srv.gate_state(sp), 202)
            m = re.fullmatch(r"/api/species/([^/]+)/gate/(\d+)/(rows/[a-z-]+|note|sign|back)", p)
            if m:                                                      # ticks, notes, sending back and signing: refused from makers and from every agent token, here, whatever the page shows
                from wb import gate as GT
                sp = srv.get_species(m.group(1))
                actor = self.actor(need=True)
                GT.need_judge(actor)
                n, what, b = int(m.group(2)), m.group(3), self.body() or {}
                spec = copy.deepcopy(sp.spec)
                if what.startswith("rows/"):
                    GT.tick(sp.path, spec, n, what[5:], b.get("tick", True), b.get("note"), actor)
                elif what == "note":
                    GT.tick(sp.path, spec, n, "note", None, b.get("note"), actor)
                elif what == "back":
                    GT.back(sp.path, spec, n, b.get("note"), actor)
                else:
                    GT.sign(sp.path, spec, n, actor)
                srv.hub.emit("gate", sp.id, round=n, what=what, actor=actor["name"], role=actor["role"])
                return self.send_json(srv.gate_state(sp))
            if re.fullmatch(r"/api/species/[^/]+/gate/.+", p):          # any other gate path: the role check first, so a maker is refused whatever the path is
                from wb import gate as GT
                GT.need_judge(self.actor(need=True))
                raise ApiError(404, "no such gate route", None)
            raise ApiError(404, "no such route", None)
    return H_


def main():
    ap = argparse.ArgumentParser(prog="wb.server")
    ap.add_argument("--home", required=True)
    ap.add_argument("--species", action="append", default=[])
    ap.add_argument("--static", default="")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=0)
    ap.add_argument("--cache-limit-gb", type=float, default=30.0)
    ap.add_argument("--proxy-workers", type=int, default=1)
    ap.add_argument("--plush-workers", type=int, default=2)
    ap.add_argument("--cache", default="", help="the content-addressed store (default <home>/cas); the studio's persistent one is ~/studio/home/cas")
    ap.add_argument("--trusted-proxy", default="", help="the address of the proxy whose X-Studio-User header is believed (it acts as the owner); empty: the header is never believed")
    a = ap.parse_args()
    dirs = a.species or [os.path.join(BODY, d) for d in ("species_v1", "species_play")]
    srv = Server(a.home, dirs, a.static or None, a.host, a.port, a.cache_limit_gb, a.proxy_workers, a.trusted_proxy, a.plush_workers, a.cache or None)
    srv.start()
    import signal
    signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(KeyboardInterrupt()))          # a stop request ends the workers and removes server.json
    print(f"wb server on http://{srv.host}:{srv.port}  home {srv.home}  species {', '.join(sorted(srv.species))}", flush=True)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        srv.stop()


if __name__ == "__main__":
    main()
