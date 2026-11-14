"""Chunk 0 picture: 0-skeleton.png, side and top views of the paths, joints, masses (circles) and sockets. Run: python sheet_c0.py OUTDIR"""
import sys, os, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import schema as SC, paths as PA, sheetlib as SL
from torso import Torso


def main(OUT):
    spec, H = SC.load()
    T = Torso(spec)
    sc, W, Hh = 190.0, 760, 640
    def side(p):
        return (W - 70 - (p[0] + 1.7) * sc * -1 * -1 if False else 640 - (p[0] + 1.75) * 0 - (-p[0]) * 0, 0)
    X = lambda x: 640 - (1.0 - x) * sc * 0 - (0.55 - x) * sc          # facing left: larger x to the left
    Xs = lambda x: 40 + (0.8 - x) * sc
    Zs = lambda z: 520 - z * sc
    svg = [f"<svg width='{W}' height='{Hh}' style='background:#fff;border:1px solid #bbb'>"]
    svg.append(f"<line x1='0' x2='{W}' y1='{Zs(0)}' y2='{Zs(0)}' stroke='#888'/>")
    a = np.linspace(0, 1, 2)
    ss = np.linspace(T.ends[0] + 0.01, T.ends[1] - 0.01, 80)
    top = T.point(ss, np.zeros_like(ss)); bot = T.point(ss, np.ones_like(ss))
    pts = list(top) + list(bot[::-1])
    svg.append("<polygon fill='#dde2f0' stroke='#456' points='" + " ".join(f"{Xs(p[0]):.1f},{Zs(p[2]):.1f}" for p in pts) + "'/>")
    sp = T.path.pts
    svg.append("<polyline fill='none' stroke='#1a56c4' stroke-width='2' points='" + " ".join(f"{Xs(p[0]):.1f},{Zs(p[2]):.1f}" for p in sp) + "'/>")
    for m in T.masses:
        q = T.point(m["s"], m["a"])[0]
        svg.append(f"<circle cx='{Xs(q[0]):.1f}' cy='{Zs(q[2]):.1f}' r='{0.25 * sc:.0f}' fill='none' stroke='#b33' stroke-dasharray='4,3'/>")
        svg.append(f"<text x='{Xs(q[0]) - 30:.0f}' y='{Zs(q[2]) - 8:.0f}' font-size='14' font-family='DejaVu Sans' fill='#b33'>{m['name']} mass</text>")
    for nm, p in spec["parts"].items():
        if p["kind"] != "limb":
            continue
        P = np.array(p["P"]); pa = PA.Path([], P, p["R"], p["fillet"])
        svg.append("<polyline fill='none' stroke='#7a1010' stroke-width='3' points='" + " ".join(f"{Xs(q[0]):.1f},{Zs(q[2]):.1f}" for q in pa.pts) + "'/>")
        for j, (q, r) in zip(p["joints"], zip(P, p["R"])):
            svg.append(f"<circle cx='{Xs(q[0]):.1f}' cy='{Zs(q[2]):.1f}' r='{max(r) * sc:.0f}' fill='rgba(200,80,80,0.12)' stroke='#c66'/><circle cx='{Xs(q[0]):.1f}' cy='{Zs(q[2]):.1f}' r='4' fill='#7a1010'/>")
            svg.append(f"<text x='{Xs(q[0]) + 6:.0f}' y='{Zs(q[2]) - 6:.0f}' font-size='14' font-family='DejaVu Sans'>{nm.split('.')[0]}.{j['name']}</text>")
        # socket: lower edge of the mass
        mname = p["socket"]["mass"]; m = [m for m in T.masses if m["name"] == mname][0]
        a_s = m["a"] + 0.6 * 0.2
        q = T.point(m["s"], a_s)[0]
        svg.append(f"<rect x='{Xs(q[0]) - 14:.0f}' y='{Zs(q[2]) - 10:.0f}' width='28' height='20' fill='none' stroke='red' stroke-width='2'/>")
    K = H.kc
    th = np.linspace(0, 2 * math.pi, 80)
    svg.append("<polyline fill='rgba(150,150,200,0.15)' stroke='#557' points='" + " ".join(f"{Xs(K[0] + H.K['a'] * math.cos(t)):.1f},{Zs(K[2] + H.K['c'] * math.sin(t)):.1f}" for t in th) + "'/>")
    svg.append(f"<text x='{Xs(K[0]) - 60:.0f}' y='{Zs(K[2]):.0f}' font-size='14' font-family='DejaVu Sans'>head K (house)</text>")
    svg.append(f"<text x='10' y='24' font-size='16' font-family='DejaVu Sans'>Side view, facing left. Blue spine, red limb paths, dashed masses, red boxes sockets.</text></svg>")
    # top view
    Ys = lambda y: 280 - y * sc
    top_ = [f"<svg width='{W}' height='640' style='background:#fff;border:1px solid #bbb'>"]
    ssl = ss
    L = T.point(ssl, np.full_like(ssl, 0.5))
    pts = [(Xs(p[0]), Ys(p[1])) for p in L] + [(Xs(p[0]), Ys(-p[1])) for p in L[::-1]]
    top_.append("<polygon fill='#dde2f0' stroke='#456' points='" + " ".join(f"{x:.1f},{y:.1f}" for x, y in pts) + "'/>")
    for nm, p in spec["parts"].items():
        if p["kind"] != "limb":
            continue
        for sd in (1, -1):
            for q, r in zip(p["P"], p["R"]):
                top_.append(f"<ellipse cx='{Xs(q[0]):.1f}' cy='{Ys(sd * q[1]):.1f}' rx='{r[1] * sc:.0f}' ry='{r[0] * sc:.0f}' fill='rgba(200,80,80,0.12)' stroke='#c66'/>")
    top_.append(f"<ellipse cx='{Xs(K[0]):.1f}' cy='{Ys(0):.1f}' rx='{H.K['a'] * sc:.0f}' ry='{H.K['b'] * sc:.0f}' fill='rgba(150,150,200,0.15)' stroke='#557'/>")
    top_.append("<text x='10' y='24' font-size='16' font-family='DejaVu Sans'>Top view (left = forward): torso width, joint ellipses.</text></svg>")
    sol = [(k, f"{p['solve']['dpitch']:+.1f} deg", f"{p['solve']['root_dz']:+.4f} H", f"{p['solve']['sole_z_before']:+.4f}") for k, p in spec['parts'].items() if p['kind'] == 'limb']
    body = "<h1>Chunk 0: data and paths</h1><p>species/S01.json (house frame, H = head height): the spine, torso stations and masses, limbs by forward kinematics from len and pitch, sole solved onto the floor. house: references resolved by housefield.House (K z 1.641, carriage 9.45 deg).</p><div class='row'>" + "".join(svg) + "".join(top_) + "</div><h2>Sole on the floor</h2><p>The last pitch is searched within +-10 deg; where the column cannot reach (a segment near -90 deg is flat in pitch) the root moves by the residual. Logged here, not hidden.</p>" + SL.table(sol, ["limb", "last pitch change", "root dz", "sole z before"])
    p = os.path.join(OUT, "0-skeleton.html")
    open(p, "w").write(SL.page("chunk 0", body))
    SL.shoot(p, os.path.join(OUT, "0-skeleton.png"), 1600)


if __name__ == "__main__":
    os.makedirs(sys.argv[1], exist_ok=True)
    main(os.path.abspath(sys.argv[1]))
