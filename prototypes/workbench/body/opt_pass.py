"""Pass-1 fit: random search + local refinement of the torso's section numbers against the AD's outline gates (right edge at 4 rows, top at 5 columns, the near-fore / hind gap at y 275). Deterministic (seeded). Prints the best and writes it to out/opt_best.json."""
import sys, os, json, time, copy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import schema as SC, build, rig, gates, views, outline

RAW = json.load(open(SC.SPECIES))
NAMES = ["r0_up", "r0_side", "r1_up", "r1_side", "r2_up", "r2_side", "r3_up", "r4_up", "r4_side", "end_x", "hind_x", "fore_x"]
LO = np.array([0.22, 0.55, 0.40, 0.85, 0.60, 0.90, 0.80, 0.82, 0.82, -2.30, -1.90, -0.60])
HI = np.array([0.60, 0.85, 0.85, 1.06, 0.98, 1.06, 0.92, 0.95, 0.96, -2.05, -1.55, -0.30])


def apply(raw, p):
    s = copy.deepcopy(raw)
    st = s["parts"]["torso"]["section"]["stations"]
    # stations: [end, r0, r1, r2, r3, r4, ...]; [up, side, down]
    st[0][0] = float(p[9])
    st[1][1][0], st[1][1][1] = float(p[0]), float(p[1])
    st[2][1][0], st[2][1][1] = float(p[2]), float(p[3])
    st[3][1][0], st[3][1][1] = float(p[4]), float(p[5])
    st[4][1][0] = float(p[6])
    st[5][1][0], st[5][1][1] = float(p[7]), float(p[8])
    s["parts"]["torso"]["path"]["joints"][0]["at"][0] = float(p[9])
    s["parts"]["hind.L"]["joints"][0]["at"][0] = float(p[10])
    s["parts"]["fore.L"]["joints"][0]["at"][0] = float(p[11])
    return s


def evaluate(p, detail=False):
    raw = apply(RAW, p)
    try:
        spec, H = SC.load(raw=raw)
        b = build.make_body(spec, H, upto="base", crown=False)
    except Exception as e:
        return 1e9, None
    R = rig.Rig(b.ctx)
    M = views.level_mesh(b, 2)
    Mp = dict(M, V=R.skin(M["V"], R.weights(M["V"], M["attr"]), R.stand_pose()))
    sv = gates.stand_view(b, "out/pass", "o", mesh=Mp, level=2)
    a = sv[304]["alpha"]
    right, top, er, et = outline.evaluate(a)
    runs = gates.leg_runs_275(a)
    err = 0.0
    for e in er + et:
        err += 25.0 if e is None else max(0.0, abs(e) - 4) ** 2
    # the gap between the near fore (the run left of the last) and the hind (the last run): 21 px; the hind run about 50 px wide
    if len(runs) >= 2:
        gap = runs[-1][0] - runs[-2][1]
        err += 2.0 * (gap - 21) ** 2 / 4
        err += (max(0, abs((runs[-1][1] - runs[-1][0]) - 55) - 8) ** 2) * 0.5
    else:
        err += 400
    lim = b.ctx["log"]["limit"]["max_err"]
    err += 300 * max(0.0, p[6] - p[4] - 0.18) ** 2 * 100 + 300 * max(0.0, p[7] - p[6] - 0.02) ** 2 * 100
    err += 20000 * max(0.0, lim - 0.004)
    if detail:
        return err, dict(right=right, top=top, er=er, et=et, runs=runs, limit=lim)
    return err, None


if __name__ == "__main__":
    rng = np.random.default_rng(7)
    p0 = np.array([0.30, 0.66, 0.66, 0.93, 0.80, 0.96, 0.88, 0.90, 0.94, -2.091, -1.609, -0.44])
    best, be = p0, evaluate(p0)[0]
    print("start", be, flush=True)
    t0 = time.time()
    for it in range(int(sys.argv[1]) if len(sys.argv) > 1 else 120):
        scale = 0.25 if it < 40 else 0.08
        q = np.clip(best + rng.normal(size=len(best)) * (HI - LO) * scale * (rng.random(len(best)) < 0.4), LO, HI)
        e, _ = evaluate(q)
        if e < be:
            best, be = q, e
            print(it, round(be, 1), np.round(best, 3).tolist(), flush=True)
    e, d = evaluate(best, True)
    print("best", e, d, "time", time.time() - t0)
    json.dump(dict(names=NAMES, p=best.tolist(), err=e, detail=d), open("out/opt_best.json", "w"), default=int)
