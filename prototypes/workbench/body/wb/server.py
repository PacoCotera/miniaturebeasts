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
            job = srv.queue.pop(("render", "build", "check"), timeout=0.5)
            if job is None:
                continue
            srv.hub.emit("running", job.species, job=job.id, kind=job.kind, actor=(job.actor or {}).get("name"))
            try:
                if self.proc.poll() is not None:
                    self.start_proc()
                views = job.args.get("views", [])
                self.proc.stdin.write(json.dumps(dict(id=job.id, op=job.kind, spec=job.spec, genome=job.args["genome"], views=views, stage=job.args.get("stage", "all"), loci=job.args.get("loci"))) + "\n")
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


class Server:
    def __init__(self, home, species_dirs, static=None, host="127.0.0.1", port=0, cache_limit_gb=30.0, proxy_workers=1, trusted_proxy=None):
        self.trusted_proxy = trusted_proxy or None
        self.home = os.path.abspath(home)
        os.makedirs(self.home, exist_ok=True)
        self.cas = C.Cas(os.path.join(self.home, "cas"))
        self.cache_limit = int(cache_limit_gb * 1e9)
        self.tokens = S.Tokens(os.path.join(self.home, "tokens.json"))
        self.species_dirs = [os.path.abspath(d) for d in species_dirs]
        self.static = os.path.abspath(static) if static else (STATIC_APP if os.path.isfile(os.path.join(STATIC_APP, "index.html")) else None)
        self.hub = Hub()
        self.queue = J.JobQueue()
        self.stopping = False
        self.species = {}
        self.scan()
        self.workers = [ProxyWorker(self, i) for i in range(proxy_workers)]
        self.sheeter = threading.Thread(target=self.sheet_loop, daemon=True, name="sheets")
        self.varieter = threading.Thread(target=self.variety_loop, daemon=True, name="variety")
        self.golder = threading.Thread(target=self.golden_loop, daemon=True, name="goldens")
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
        for j in self.queue.supersede(sp.id, sp.hash):
            self.hub.emit("failed", sp.id, job=j.id, kind=j.kind, superseded=True, error=j.error)
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
            if st not in ("file", "cage", "extremes", "all"):
                raise ApiError(400, f"check stage '{st}': one of file, cage, extremes, all (rig and coat arrive with their chunks)", "stage")
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

    # ---- life cycle
    def start(self):
        for w in self.workers:
            w.thread.start()
        self.sheeter.start()
        self.varieter.start()
        self.golder.start()
        self.proofer.start()
        self.watcher.start()
        self.cas.evict(self.cache_limit)
        with open(os.path.join(self.home, "server.json"), "w") as fh:
            json.dump(dict(host=self.host, port=self.port, pid=os.getpid(), url=f"http://{self.host}:{self.port}"), fh)
        threading.Thread(target=self.httpd.serve_forever, daemon=True, name="http").start()

    def stop(self):
        self.stopping = True
        self.httpd.shutdown()
        self.httpd.server_close()
        for w in self.workers:
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
                self.send_json(dict(error=e.message, field=e.field), e.status)
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
            m = re.fullmatch(r"/api/species/([^/]+)/(undo|redo)", p)
            if m:
                return self.send_json(srv.revert(m.group(1), m.group(2), self.actor(need=True)))
            if re.fullmatch(r"/api/species/[^/]+/gate/.+", p):
                actor = self.actor(need=True)
                if actor["role"] == "maker":
                    raise ApiError(403, "refused: a maker token cannot tick, waive or sign; the reviewer signs first and the owner last", "role")
                raise ApiError(501, "the gate arrives in a later chunk", None)
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
    ap.add_argument("--trusted-proxy", default="", help="the address of the proxy whose X-Studio-User header is believed (it acts as the owner); empty: the header is never believed")
    a = ap.parse_args()
    dirs = a.species or [os.path.join(BODY, "species_v1")]
    srv = Server(a.home, dirs, a.static or None, a.host, a.port, a.cache_limit_gb, a.proxy_workers, a.trusted_proxy)
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
