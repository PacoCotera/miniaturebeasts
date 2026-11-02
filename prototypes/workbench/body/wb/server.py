"""The job server: standard-library HTTP + Server-Sent Events over the species files, a priority queue with superseding, the content-addressed cache, a file watcher, and the proxy worker(s).
JSON API as spec 6.3 (species, jobs, events, cas; gate routes answer 403 to makers and 501 until their chunk). A static folder can be served from a configurable path (empty by default). No page is built here.
python -m wb.server --home DIR [--species DIR ...] [--static DIR] [--port N]"""
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

from wb import cas as C, facade as F, hashing as H, jobs as J, keys as K, report as R, store as S
from wb.store import ApiError

CT = {"png": "image/png", "json": "application/json", "glb": "model/gltf-binary", "html": "text/html; charset=utf-8", "js": "text/javascript", "css": "text/css", "svg": "image/svg+xml"}


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
            job = srv.queue.pop(("render", "build"), timeout=0.5)
            if job is None:
                continue
            srv.hub.emit("running", job.species, job=job.id, kind=job.kind, actor=(job.actor or {}).get("name"))
            try:
                if self.proc.poll() is not None:
                    self.start_proc()
                views = job.args.get("views", [])
                self.proc.stdin.write(json.dumps(dict(id=job.id, op=job.kind, spec=job.spec, genome=job.args["genome"], views=views)) + "\n")
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
    def __init__(self, home, species_dirs, static=None, host="127.0.0.1", port=0, cache_limit_gb=30.0, proxy_workers=1):
        self.home = os.path.abspath(home)
        os.makedirs(self.home, exist_ok=True)
        self.cas = C.Cas(os.path.join(self.home, "cas"))
        self.cache_limit = int(cache_limit_gb * 1e9)
        self.tokens = S.Tokens(os.path.join(self.home, "tokens.json"))
        self.species_dirs = [os.path.abspath(d) for d in species_dirs]
        self.static = os.path.abspath(static) if static else None
        self.hub = Hub()
        self.queue = J.JobQueue()
        self.stopping = False
        self.species = {}
        self.scan()
        self.workers = [ProxyWorker(self, i) for i in range(proxy_workers)]
        self.sheeter = threading.Thread(target=self.sheet_loop, daemon=True, name="sheets")
        self.watcher = threading.Thread(target=self.watch_loop, daemon=True, name="watcher")
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
            self.submit(sp.id, "render", dict(genome="type", modes=["clay"], az=list(K.AZ), sizes=[304]), dict(name="auto", role="server"))
        except ApiError:
            pass

    def patch_species(self, sid, ops, actor):
        sp = self.get_species(sid)
        with sp.lock:
            new = S.apply_patch(sp.spec, ops)
            self.check_file(new, raise_on_fail=True)
            changes, h = sp.patch(ops, actor)
        if changes:
            self.after_edit(sp, actor, [c[0] for c in changes], "api")
        return dict(hash=h, changed=[dict(path=p, old=o, new=n) for p, o, n in changes], touches=[], validation=dict(ok=True, errors=[]))

    # ---- instant (file-stage) checks, in this process
    def check_file(self, spec, raise_on_fail=False):
        import schema as SC, s20genes as GN
        rows = []

        def row(id_, ok, value, limit, words, field=None):
            rows.append(dict(id=id_, state="pass" if ok else "fail", value=value, limit=limit, words=words, field=field, proof=None))
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
    def norm_args(self, kind, args):
        args = dict(args or {})
        genome = args.get("genome", "type")
        try:
            F.resolve_genome(genome)
        except F.BuildError as e:
            raise ApiError(400, e.message, "genome")
        out = dict(genome=genome)
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
                    raise ApiError(400, "mode 'plush' needs the plush worker, which is a later chunk; the proxy modes are " + ", ".join(K.MODES), "mode")
                if m not in K.MODES:
                    raise ApiError(400, f"mode '{m}': one of {', '.join(K.MODES)}", "mode")
            azs = [int(a) for a in (args.get("az") or K.AZ)]
            sizes = [int(s) for s in (args.get("sizes") or [args.get("size", 304)])]
            for s in sizes:
                if s not in K.SIZES:
                    raise ApiError(400, f"size {s}: one of {', '.join(map(str, K.SIZES))}", "size")
            out["views"] = [[m, a, s] for m in modes for a in azs for s in sizes]
            out["modes"], out["az"], out["sizes"] = modes, azs, sizes
            return out
        if kind == "sheet":
            out["views"] = [list(v) for v in K.SHEET_VIEWS]
            return out
        raise ApiError(400, f"job kind '{kind}' is not built yet", "kind")

    def submit(self, sid, kind, args, actor, priority=None, spec=None, spec_hash=None):
        sp = self.get_species(sid)
        if kind == "check":
            return self.run_check(sp, args, actor)
        a = self.norm_args(kind, args)
        spec = copy.deepcopy(sp.spec) if spec is None else spec
        spec_hash = spec_hash or H.hash_of(spec)
        ck = K.cage_key(spec, a["genome"])
        views = [tuple(v) for v in a.get("views", [])]
        if kind == "build":
            key = ck
        elif kind == "render":
            key = K.render_key(ck, views)
        else:
            key = K.sheet_key(K.render_key(ck, views))
        job = J.Job(self.queue.new_id(), sid, kind, a, key, J.PRIORITY[kind] if priority is None else priority, spec, spec_hash, actor)
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
        if stage != "file":
            raise ApiError(400, f"check stage '{stage}' is a later chunk; only 'file' exists", "stage")
        rows = self.check_file(sp.spec)
        job = J.Job(self.queue.new_id(), sp.id, "check", dict(stage="file"), H.hash_of("check", "file", sp.hash), 0, None, sp.hash, actor)
        job.state, job.result = "done", dict(stage="file", rows=rows, fail=[r for r in rows if r["state"] == "fail"], passed=sum(1 for r in rows if r["state"] == "pass"))
        job.t_start = job.t_end = time.time()
        job.event.set()
        self.queue.add(job)
        return job

    def finish_ok(self, job, result):
        cache = dict(job_hit=False)
        if job.kind == "render":
            vs = result["views"]
            cache.update(views_hit=sum(1 for v in vs if v["cached"]), views_total=len(vs))
            self.cas.put_json(job.key, dict(result, cache=None))
        result["cache"] = cache
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

    # ---- life cycle
    def start(self):
        for w in self.workers:
            w.thread.start()
        self.sheeter.start()
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


def make_handler(srv):
    class H_(BaseHTTPRequestHandler):
        server_version = "wb/1"

        def log_message(self, fmt, *a):
            print(f"{S.now()} {self.address_string()} {fmt % a}", file=sys.stderr)

        def actor(self, need=False):
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
            p, q = u.path, parse_qs(u.query)
            if p == "/api/species":
                return self.send_json([dict(id=s.id, name=s.spec.get("name"), path=s.path, hash=s.hash, error=s.error) for s in srv.species.values()])
            m = re.fullmatch(r"/api/species/([^/]+)", p)
            if m:
                s = srv.get_species(m.group(1))
                return self.send_json(dict(id=s.id, path=s.path, hash=s.hash, file=s.spec, error=s.error, lease=None, checks=None, goldens=None, history=s.history(5)))
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
            if p in ("/api/plans", "/api/families", "/api/styles", "/api/checks"):
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
                self.send_header("Cache-Control", "public, max-age=31536000, immutable")
                self.end_headers()
                return self.wfile.write(data)
            if srv.static and not p.startswith("/api"):
                return self.static(p)
            raise ApiError(404, "no such route", None)

        def static(self, p):
            rel = os.path.normpath(p.lstrip("/") or "index.html")
            full = os.path.join(srv.static, rel)
            if rel.startswith("..") or not os.path.isfile(full):
                raise ApiError(404, "not found", None)
            data = open(full, "rb").read()
            self.send_response(200)
            self.send_header("Content-Type", CT.get(full.rsplit(".", 1)[-1], "application/octet-stream"))
            self.send_header("Content-Length", str(len(data)))
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
            m = re.fullmatch(r"/api/species/([^/]+)", urlparse(self.path).path)
            if not m:
                raise ApiError(404, "no such route", None)
            actor = self.actor(need=True)
            ops = self.body()
            if not isinstance(ops, list):
                raise ApiError(400, "a JSON patch is a list of operations", "body")
            self.send_json(srv.patch_species(m.group(1), ops, actor))

        # -- POST
        def post(self):
            p = urlparse(self.path).path
            m = re.fullmatch(r"/api/species/([^/]+)/jobs", p)
            if m:
                actor = self.actor(need=True)
                b = self.body() or {}
                job = srv.submit(m.group(1), b.get("kind"), b.get("args"), actor)
                return self.send_json(job.public(), 200 if job.state == "done" else 202)
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
    a = ap.parse_args()
    dirs = a.species or [os.path.join(BODY, "species")]
    srv = Server(a.home, dirs, a.static or None, a.host, a.port, a.cache_limit_gb, a.proxy_workers)
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
