"""One Tuliko from its creature.json: the body, the rig, the posed meshes, silhouettes and skinned renders (chunk 7). Under the bpy venv."""
import os, sys, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20genes as GN, s20rig, s20render as RN, views, gates, subdiv as SD

RAW = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "species", "S20.json")))


def make(i):
    ind = GN.draw(i)
    c = GN.creature(ind)
    b = GN.build_individual(RAW, c)
    R = s20rig.Rig(b.ctx)
    return c, b, R


def part_of(b, F, fp, n):
    F = np.array(F, int)
    cnt = np.zeros((n, len(b.parts) + 1))
    for k in range(4):
        np.add.at(cnt, (F[:, k], np.asarray(fp).astype(int)), 1.0)
    return cnt.argmax(1)


def posed_mesh(b, R, pose, level=2):
    Vf, Ff, attr, fp, cr, mir = b.full()
    m = views.level_mesh(b, level)
    part2 = part_of(b, m["F"], m["fp"], len(m["V"]))
    part0 = part_of(b, m["F0"], fp, len(m["V0"]))
    V2 = R.skin(m["V"], R.weights(m["V"], m["attr"], part2), pose)
    V0 = R.skin(m["V0"], R.weights(m["V0"], attr, part0), pose)
    return dict(m, V=V2, V0=V0)


def silhouette(b, R, az=32.0, size=96, pose=None):
    pose = R.stand_pose() if pose is None else pose
    M = posed_mesh(b, R, pose, 2)
    w, h, ppH = gates.SIZES[size]
    a, cam = gates.render_rgba(M, os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "s20", f"_sil{size}.png"), az, 10.0, w, h, np.array([-0.35, 0, 1.3]), ppH, samples=1)
    return a[..., 3] > 0.5


def iou(a, b_):
    return float((a & b_).sum() / max((a | b_).sum(), 1))
