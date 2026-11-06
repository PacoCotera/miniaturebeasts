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

AZ, SIZE, BIG = 32, (304, 312), (608, 624)
SAMPLES = 128           # the hero draw's samples (the render sets' plush, the goldens', use 256: that constant is left alone). With the denoiser, 128 is the same picture at 1x (mean difference 0.4 of 255) in half the render time.


def draw(spec, genome, out, scratch, big=False):
    """The plush of `genome` of `spec` written to `out` (PNG, straight alpha). Returns the milliseconds each part took."""
    from wb import renderset as RSET, pngio  # noqa: F401
    T = {}
    t = time.perf_counter()
    subject = RSET.Subject(spec, genome, scratch)
    T["build_ms"] = round((time.perf_counter() - t) * 1000)
    t = time.perf_counter()
    RSET.plush(subject, AZ, BIG if big else SIZE, out, shadow=True)
    T["plush_ms"] = round((time.perf_counter() - t) * 1000)
    return T


def draw_clip(spec, genome, clip, out, scratch, progress=None):
    """The plush strip of a clip of `genome` (wb/clips.py): its frames side by side in one PNG at `out`, one shadow for all of them. Returns the milliseconds of the build and of each frame."""
    from wb import renderset as RSET, pngio
    T = {}
    t = time.perf_counter()
    subject = RSET.Subject(spec, genome, scratch)
    subject.tex()
    T["build_ms"] = round((time.perf_counter() - t) * 1000)
    frames, ms = RSET.plush_clip(subject, clip, SIZE, scratch, scratch, on_frame=progress)
    pngio.write(out, RSET.strip_of(frames))
    T["frame_ms"] = ms
    T["plush_ms"] = sum(ms)
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
            if req.get("clip"):
                T = draw_clip(req["spec"], req.get("genome", "type"), req["clip"], req["out"], a.scratch, lambda i, n, ms: out.write(json.dumps(dict(id=req["id"], progress=dict(done=i + 1, of=n))) + "\n"))
            else:
                T = draw(req["spec"], req.get("genome", "type"), req["out"], a.scratch, bool(req.get("big")))
            out.write(json.dumps(dict(id=req["id"], ok=True, ms=round((time.perf_counter() - t0) * 1000), **T)) + "\n")
        except Exception as e:                                       # noqa: BLE001
            traceback.print_exc()
            out.write(json.dumps(dict(id=req["id"], ok=False, error=f"{type(e).__name__}: {e}", ms=round((time.perf_counter() - t0) * 1000))) + "\n")


if __name__ == "__main__":
    main()
