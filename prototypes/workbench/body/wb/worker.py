"""The proxy worker: a long-lived process under the bpy venv. It reads one JSON request per line on stdin and answers on a private copy of stdout (Blender's own prints go to stderr).
Ops: build (cage + mesh into the cache, no pictures), render (cage if needed, then the views that are not in the cache). It keeps the last cage's mesh loaded, so a second view set of the same cage costs only the renders.
python -m wb.worker --cas DIR"""
import argparse
import json
import os
import sys
import time
import traceback

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cas", required=True)
    a = ap.parse_args()
    out = os.fdopen(os.dup(1), "w", buffering=1)
    os.dup2(2, 1)                                                  # anything printed by Blender or the framework goes to the log, not the protocol
    import numpy as np
    from wb import cas as C, facade as F, keys as K, proxy as P
    cas = C.Cas(a.cas)
    pr = P.ProxyRenderer()
    last = dict(ck=None, r=None)                                   # the last cage's Body: a check job right after a build reuses it
    warm = pr.warm(cas.tmp("png")) + F.warm()

    def send(o):
        out.write(json.dumps(o) + "\n")

    send(dict(ready=True, warm_ms=round(warm, 1), pid=os.getpid()))

    def ensure_cage(req, T):
        """-> (cage key, summary dict, mesh dict, whether the cage came from the cache)."""
        spec, genome = req["spec"], req.get("genome", "type")
        ck = K.cage_key(spec, genome)
        summ = cas.get_json(ck)
        if summ is not None and cas.has(ck, "npz"):
            z = np.load(cas.path(ck, "npz"))
            names = json.loads(str(z["names"]))
            return ck, summ, dict(V=z["V"], F=z["F"], part=z["part"], names={int(k): v for k, v in names.items()}), True
        t = time.perf_counter()
        r = F.build(spec, genome, "base")
        last.update(ck=ck, r=r)
        T["build_ms"] = round((time.perf_counter() - t) * 1000, 1)
        t = time.perf_counter()
        m = F.proxy_mesh(r.body, 1)
        T["mesh_ms"] = round((time.perf_counter() - t) * 1000, 1)
        summ = r.summary()
        summ["vertices_l1"] = int(len(m["V"]))
        tmp = cas.tmp("npz")
        with open(tmp, "wb") as fh:
            np.savez(fh, V=m["V"], F=m["F"], part=m["part"], names=json.dumps({str(k): v for k, v in m["names"].items()}))
        cas.adopt(tmp, ck, "npz")
        cas.put_json(ck, summ)
        return ck, summ, m, False

    def frames(ck, mesh, views, res_views=None):
        """Render the views that are not in the cache; returns {(mode, az, size): (key, path, cached, ms)}."""
        pr.set_mesh(mesh, ck)
        out = {}
        for mode, az, size in views:
            fk = K.frame_key(ck, mode, az, size)
            if cas.has(fk, "png"):
                out[(mode, az, size)] = (fk, cas.path(fk, "png"), True, 0.0)
            else:
                tmp = cas.tmp("png")
                ms = pr.render(mode, az, size, tmp)
                cas.adopt(tmp, fk, "png")
                out[(mode, az, size)] = (fk, cas.path(fk, "png"), False, round(ms, 1))
        return out

    def do_check(req, ck, summ, mesh, T):
        """The checks of a stage on the cage of this request, each with its proof's SVG and the 608 frame it draws on."""
        from checks import run as crun, proof as PR
        from checks.ctx import Ctx
        raw, genome, stage = req["spec"], req.get("genome", "type"), req.get("stage", "all")
        spec = F.internal(raw)
        t = time.perf_counter()
        rows = []
        if stage in ("file", "all"):
            rows += crun("file", Ctx(spec, doc=raw))
        if stage in ("cage", "all"):
            if last["ck"] != ck:
                last.update(ck=ck, r=F.build(raw, genome, "base"))
            rows += crun("cage", Ctx(spec, last["r"].body, summ, mesh, doc=raw))
        T["checks_ms"] = round((time.perf_counter() - t) * 1000, 1)
        t = time.perf_counter()
        need = sorted({(r["proof"]["mode"], r["proof"]["az"], 608) for r in rows if r.get("proof")})
        fr = frames(ck, mesh, need)
        for r in rows:
            p = r.get("proof")
            if p:
                fk, path, _, _ = fr[(p["mode"], p["az"], 608)]
                p["frame"], p["frame_path"] = fk, path
                p["svg"] = PR.svg(p["svg"])
        T["proof_frames_ms"] = round((time.perf_counter() - t) * 1000, 1)
        return rows

    def handle(req):
        T = {}
        t0 = time.perf_counter()
        ck, summ, mesh, cage_hit = ensure_cage(req, T)
        res = dict(cage=dict(key=ck, cage_hash=summ["cage_hash"], vertices=summ["vertices"], vertices_l1=summ.get("vertices_l1"), faces=summ["faces"], cached=cage_hit,
                             timings_ms=summ["timings_ms"], balance=summ.get("balance")), views=[])
        if req["op"] == "check":
            res["rows"], res["stage"] = do_check(req, ck, summ, mesh, T), req.get("stage", "all")
        if req["op"] == "render":
            views = [tuple(v) for v in req["views"]]
            t = time.perf_counter()
            T["set_mesh_ms"] = round(pr.set_mesh(mesh, ck) * 1000, 1)
            for i, (mode, az, size) in enumerate(views):
                fk = K.frame_key(ck, mode, az, size)
                if cas.has(fk, "png"):
                    res["views"].append(dict(mode=mode, az=az, size=size, key=fk, path=cas.path(fk, "png"), cached=True, ms=0.0))
                else:
                    tmp = cas.tmp("png")
                    ms = pr.render(mode, az, size, tmp)
                    cas.adopt(tmp, fk, "png")
                    res["views"].append(dict(mode=mode, az=az, size=size, key=fk, path=cas.path(fk, "png"), cached=False, ms=round(ms, 1)))
                send(dict(id=req["id"], progress=dict(done=i + 1, of=len(views))))
        res["timings_ms"] = dict(T, total_ms=round((time.perf_counter() - t0) * 1000, 1))
        return res

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        req = json.loads(line)
        if req.get("op") == "quit":
            break
        try:
            send(dict(id=req["id"], done=True, ok=True, result=handle(req)))
        except F.BuildError as e:
            send(dict(id=req["id"], done=True, ok=False, error=e.message, field=e.field))
        except Exception as e:
            traceback.print_exc()
            send(dict(id=req["id"], done=True, ok=False, error=f"{type(e).__name__}: {e}", field=None))


if __name__ == "__main__":
    main()
