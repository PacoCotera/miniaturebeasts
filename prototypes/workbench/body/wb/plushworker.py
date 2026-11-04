"""The plush worker (spec 7: "plush hero, Cycles, house look-dev, az 32 at 304"): a long-lived process under the bpy venv that draws one genome of a species as plush, on the stand pose with its floor shadow, at 304x312.
It reads one JSON request per line on stdin ({id, spec, genome, out}) and answers on a private copy of stdout: {id, ok, ms, ...} or {id, ok: false, error}. Blender's own prints go to stderr.
python -m wb.plushworker --scratch DIR"""
import argparse
import json
import os
import sys
import time
import traceback

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)

AZ, SIZE = 32, (304, 312)
SAMPLES = 128           # the hero draw's samples (the render sets' plush, the goldens', use 256: that constant is left alone). With the denoiser, 128 is the same picture at 1x (mean difference 0.4 of 255) in half the render time.


def draw(spec, genome, out, scratch):
    """The plush of `genome` of `spec` written to `out` (PNG, straight alpha). Returns the milliseconds each part took."""
    from wb import renderset as RSET, pngio  # noqa: F401
    T = {}
    t = time.perf_counter()
    subject = RSET.Subject(spec, genome, scratch)
    T["build_ms"] = round((time.perf_counter() - t) * 1000)
    t = time.perf_counter()
    RSET.plush(subject, AZ, SIZE, out, shadow=True)
    T["plush_ms"] = round((time.perf_counter() - t) * 1000)
    return T


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scratch", required=True)
    a = ap.parse_args()
    out = os.fdopen(os.dup(1), "w", buffering=1)
    os.dup2(2, 1)
    os.makedirs(a.scratch, exist_ok=True)
    import plush as PL
    PL.SOFT_RENDER["samples"] = SAMPLES                              # this process only draws play's hero pictures
    out.write(json.dumps(dict(ready=True, pid=os.getpid())) + "\n")
    for line in sys.stdin:
        req = json.loads(line)
        if req.get("op") == "quit":
            break
        t0 = time.perf_counter()
        try:
            T = draw(req["spec"], req.get("genome", "type"), req["out"], a.scratch)
            out.write(json.dumps(dict(id=req["id"], ok=True, ms=round((time.perf_counter() - t0) * 1000), **T)) + "\n")
        except Exception as e:                                       # noqa: BLE001
            traceback.print_exc()
            out.write(json.dumps(dict(id=req["id"], ok=False, error=f"{type(e).__name__}: {e}", ms=round((time.perf_counter() - t0) * 1000))) + "\n")


if __name__ == "__main__":
    main()
