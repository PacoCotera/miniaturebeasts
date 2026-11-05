"""Chunk 16: the clips of the render set (walk and idle), as poses of the rig. Blender-free: a clip is `frames` poses of one loop, and a pose is the rig's bone matrices plus the breath's amount.
walk   the waddle of the file's `motion.walk` (swing, duty, lift, roll, yaw, tail sway), six phases of one step cycle, the period the file gives (0.9 s).
idle   the tail's slow sway, the ears' small lagging sway, the head's small nod, the arms' swing and the breath, six phases of one loop of the file's `motion.tail_idle.period` (2.2 s)."""
import math

CLIPS = {"walk": 6, "idle": 6}
QUAD_CLIPS = {"walk": 12, "breathe": 6, "sit": 1, "curl": 1}          # the quadruped's own (qrig.py): a four-beat walk of twelve frames (each foot is in the air for three of them), breathing, a sit and a curl
SIZE = (304, 312)
V = 1                                                           # bump when a clip's poses change: every strip is drawn again


def frames(clip, plan=None):
    table = QUAD_CLIPS if plan == "quadruped" else CLIPS
    if clip not in table:
        raise ValueError(f"clip is one of {', '.join(table)}")
    return table[clip]


def period(spec, clip):
    """Seconds of one loop."""
    m = (spec or {}).get("motion") or {}
    if clip == "walk":
        return float((m.get("walk") or {}).get("period", 0.9))
    return float((m.get("tail_idle") or {}).get("period", 2.2))


def pose_at(R, spec, clip, i, n=None):
    """(bone matrices, breath amount 0..1) of frame i of the loop on rig R."""
    n = n or frames(clip)
    ph = (i % n) / n
    m = (spec or {}).get("motion") or {}
    if clip == "walk":
        w = m.get("walk") or {}
        kw = {}
        for src, dst in (("swing", "A"), ("duty", "duty"), ("lift", "lift"), ("roll", "roll"), ("yaw", "yaw"), ("tail_sway", "sway"), ("period", "period")):
            if src in w:
                kw[dst] = float(w[src])
        return R.waddle_pose(ph, **kw)[0], 0.0
    ti = m.get("tail_idle") or {}
    es = m.get("ear_sway") or {}
    s = 2 * math.pi * ph
    lag = float(es.get("lag", 0.15)) / max(period(spec, "idle"), 1e-6)
    pose = R.pose(tail_sway=math.radians(float(ti.get("amp", 8))) * math.sin(s), ear=math.radians(float(es.get("amp", 5))) * math.sin(s - 2 * math.pi * lag),
                  head_nod=math.radians(-3.0 + 2.0 * math.sin(s * 0.5)), arm=math.radians(3.0) * math.sin(s))
    return pose, 0.5 - 0.5 * math.cos(s)


def timings(spec, clip, ms):
    """What the page needs to play a strip: frames, the loop's seconds, each frame's seconds, and the drawing time per frame."""
    n = frames(clip)
    p = period(spec, clip)
    return dict(clip=clip, frames=n, period=p, frame_s=round(p / n, 4), size=list(SIZE), ms=ms)
