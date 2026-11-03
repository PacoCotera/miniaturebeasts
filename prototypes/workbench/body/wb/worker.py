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
        if summ is not None and cas.has(ck, "npz") and "face_V" in np.load(cas.path(ck, "npz")).files:
            z = np.load(cas.path(ck, "npz"))
            names = json.loads(str(z["names"]))
            return ck, summ, dict(V=z["V"], F=z["F"], part=z["part"], names={int(k): v for k, v in names.items()}, face_V=z["face_V"], face_F=json.loads(str(z["face_F"]))), True
        t = time.perf_counter()
        r = F.build(spec, genome, "base")
        last.update(ck=ck, r=r)
        T["build_ms"] = round((time.perf_counter() - t) * 1000, 1)
        t = time.perf_counter()
        m = F.proxy_mesh(r.body, 1)
        T["mesh_ms"] = round((time.perf_counter() - t) * 1000, 1)
        summ = r.summary()
        summ["vertices_l1"] = int(len(m["V"]))
        from wb import clayface as CF
        cx = r.body.ctx
        m["face_V"], fF = CF.face_mesh(cx["T"], cx["spec"], dict(r.c.get("coat") or {}), m)
        m["face_F"] = fF
        tmp = cas.tmp("npz")
        with open(tmp, "wb") as fh:
            np.savez(fh, V=m["V"], F=m["F"], part=m["part"], names=json.dumps({str(k): v for k, v in m["names"].items()}), face_V=m["face_V"], face_F=json.dumps(fF))
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

    def cage_rows(raw, spec, genome, req):
        """The cage-stage rows (proofs as SVG, no frames yet) of one genome, with its cage key, summary and mesh. Cached cages are rebuilt for their body only when a check has to run."""
        ck, summ, mesh, _ = ensure_cage(dict(req, genome=genome), {})
        if last["ck"] != ck:
            last.update(ck=ck, r=F.build(raw, genome, "base"))
        from checks import run as crun
        from checks.ctx import Ctx
        summ = dict(summ, vertices_l1=len(mesh["V"]))
        return ck, mesh, crun("cage", Ctx(spec, last["r"].body, summ, mesh, doc=raw))

    def do_extremes(req, T):
        """Every end of every locus's limits and the loud corners, built and run through the cage checks; a failing end keeps its first failing check's proof and, for a blend, the highest value that passes."""
        from checks import extremes as EX, run as crun, proof as PR
        from checks.ctx import Ctx
        raw = req["spec"]
        spec = F.internal(raw)
        t0 = time.perf_counter()
        _, _, base_rows = cage_rows(raw, spec, "type", req)
        base = {r["id"]: r["state"] for r in base_rows}
        entries = {e["locus"]: e for e in spec["genome"]["loci"]}
        ends, seen, n = [], {}, 0
        todo = EX.list_ends(spec, req.get("loci"))
        for i, e in enumerate(todo):
            ck = K.cage_key(raw, e["genome"])
            if ck not in seen:
                ck, mesh, rows = cage_rows(raw, spec, e["genome"], req)
                state, fails = EX.judge(rows, base)
                seen[ck] = dict(state=state, fails=fails, mesh=mesh, rows=rows)
                n += 1
            s = seen[ck]
            ent = entries.get(e["locus"]) or {}
            end = dict(e, cage=ck, state=s["state"], unit=(ent.get("band") or ent.get("absolute") or {}).get("unit", ""), fails=[EX.summary_row(r) for r in s["fails"]], scope=ent.get("scope"))
            if s["fails"]:
                p = dict(s["fails"][0]["proof"]) if s["fails"][0].get("proof") else None
                if p:
                    fr = frames(ck, s["mesh"], [(p["mode"], p["az"], 608)])
                    p["frame"], p["frame_path"] = fr[(p["mode"], p["az"], 608)][0], fr[(p["mode"], p["az"], 608)][1]
                    p["svg"] = PR.svg(p["svg"])
                    end["proof"] = p
                if e["end"] in ("low", "high") and ent:
                    def fails_at(v, e=e):
                        g = f"value:{e['locus']}={v}"
                        _, _, rows = cage_rows(raw, spec, g, req)
                        return EX.judge(rows, base)[0] == "fail"
                    end["fix"] = EX.bisect_fix(ent, e["end"], fails_at)
            ends.append(end)
            send(dict(id=req["id"], progress=dict(done=i + 1, of=len(todo))))
        T["extremes_ms"] = round((time.perf_counter() - t0) * 1000, 1)
        T["extremes_builds"] = n
        return crun("extremes", Ctx(spec, doc=raw, ends=ends)), ends

    def handle(req):
        T = {}
        t0 = time.perf_counter()
        ck, summ, mesh, cage_hit = ensure_cage(req, T)
        res = dict(cage=dict(key=ck, cage_hash=summ["cage_hash"], vertices=summ["vertices"], vertices_l1=summ.get("vertices_l1"), faces=summ["faces"], cached=cage_hit,
                             timings_ms=summ["timings_ms"], balance=summ.get("balance")), views=[])
        if req["op"] == "check" and req.get("stage") == "extremes":
            res["rows"], res["ends"] = do_extremes(req, T)
            res["stage"] = "extremes"
        elif req["op"] == "check":
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
