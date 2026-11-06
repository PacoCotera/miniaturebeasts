"""S20 chunk 0 picture: 0-skeleton. Front, side and top diagrams (spine, cage rings, masses, paths, sockets) drawn from species/S20.json, plus the 10-angle clay turnaround of the paths as thin tubes.
Run (bpy venv): python sheet_s20_0.py [OUTDIR]"""
import sys, os, math, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import schema as SC, paths as PA, sheetlib as SL, s20sheet as SS, s20views as SV
from gourd import Gourd

OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else SS.BUILD
os.makedirs(OUT, exist_ok=True)
spec, _ = SC.load(os.path.join(os.path.dirname(os.path.abspath(__file__)), "species", "S20.json"))
G = Gourd(spec)
T = spec["parts"]["torso"]
ZS = np.linspace(G.ends[0], G.ends[1], 160)


def outline(side):
    """Outline points of the loft: side 'front' -> (y, z) at around 0.5 (both sides), 'side' -> (x, z) at around 0 and 1."""
    if side == "front":
        r = np.array([float(G.rho(z, 0.5)) for z in ZS])
        return [(y, z) for y, z in zip(r, ZS)] + [(-y, z) for y, z in zip(r[::-1], ZS[::-1])]
    b = np.array([float(G.rho(z, 0.0)) for z in ZS]); f = np.array([float(G.rho(z, 1.0)) for z in ZS])
    return [(x, z) for x, z in zip(f, ZS)] + [(-x, z) for x, z in zip(b[::-1], ZS[::-1])]


def fillet_pts(P, R):
    pa = PA.Path(["j"] * len(P), P, R, 1.25, start=[1.0, 0, 0])
    return pa.pts


def paths_world():
    """name -> (dense points of the left-side path, joint centres, colour)."""
    out = {}
    leg = spec["parts"]["leg.L"]
    out["leg"] = (fillet_pts(leg["P"], leg["R"]), np.array(leg["P"]), "#1b7f5a")
    for f in ("prick", "lop", "nub"):
        e = spec["parts"]["ear.L"]["families"][f]
        out["ear." + f] = (fillet_pts(e["P"], e["R"]), np.array(e["P"]), "#1b7f5a")
    tl = spec["parts"]["tail"]
    out["tail"] = (fillet_pts(tl["P"], tl["R"]), np.array(tl["P"]), "#1b7f5a")
    return out


PW = paths_world()


def socket_points():
    """Socket patch centres on the loft: leg, tail, ear (from column_keys and each part's socket station), left side."""
    ck = T["column_keys"]
    S = {}
    for nm, key in (("leg socket", "leg"), ("tail socket", "tail"), ("ear socket", "ear")):
        k = ck[key]
        a = G.column_angles(k["station"])[k["col"]]
        S[nm] = (G.point(np.array([k["station"]]), np.array([a]))[0], k["station"], a)
    return S


def sitting():
    s = spec["sockets"]
    pts = {}
    for nm in ("arm.L", "nose"):
        z, a = s[nm]["station"], s[nm]["around"]
        pts[nm.replace(".L", "")] = G.point(np.array([z]), np.array([a]))[0]
    pts["crown"] = np.array([0.0, 0.0, G.ends[1]])
    pts["tail tip"] = PW["tail"][1][-1]
    return pts


def diagram(view, W=540, H=640):
    ppH = 190.0
    if view == "front":
        pr = SS.Proj(ppH, W / 2, H - 40)           # world (y, z)
        lat, up = 1, 2
    elif view == "side":
        pr = SS.Proj(ppH, W * 0.66, H - 40)        # world (x, z)
        lat, up = 0, 2
    parts = [f"<svg xmlns='http://www.w3.org/2000/svg' width='{W}' height='{H}' viewBox='0 0 {W} {H}'>"]
    parts.append(f"<rect width='{W}' height='{H}' fill='#fffdf8'/>")
    parts.append(SS.poly([(-2, 0), (2, 0)], pr, stroke="#888", w=1))
    parts.append(SS.poly(outline(view), pr, True, stroke="#555", w=2, fill="#ece6d8"))
    for z in T["rings_z"]:                                         # cage rings
        a = [float(G.rho(z, 0.5)) if view == "front" else float(G.rho(z, 1.0))]
        if view == "front":
            parts.append(SS.poly([(-a[0], z), (a[0], z)], pr, stroke="#b9b2a0", w=1))
        else:
            parts.append(SS.poly([(-float(G.rho(z, 0.0)), z), (a[0], z)], pr, stroke="#b9b2a0", w=1))
    for m in G.masses:                                              # masses: dashed circles
        z, a, r = m["s"], m["a"], m["ds"][0] + m["ds"][1]
        P = G.point(np.array([z]), np.array([a]))[0]
        c = (P[1], z) if view == "front" else (P[0], z)
        cx, cy = pr(*c)
        parts.append(f"<ellipse cx='{cx:.1f}' cy='{cy:.1f}' rx='{r / 2 * ppH:.1f}' ry='{r / 2 * ppH:.1f}' fill='#e7a07a' fill-opacity='0.18' stroke='#b4552a' stroke-dasharray='4 3'/>")
    parts.append(SS.poly([(0, G.ends[0]), (0, G.ends[1])], pr, stroke="#1f4e9e", w=3))      # spine
    for q in T["path"]["joints"]:
        x, y = pr(0, q["at"][1]) if view == "front" else pr(0, q["at"][1])
        parts.append(f"<circle cx='{x:.1f}' cy='{y:.1f}' r='5' fill='#1f4e9e'/>")
        parts.append(SS.svg_text(x + 8, y + 5, q["name"], 14, "#1f4e9e", weight="bold") if view == "side" else "")
    for nm, (pts, J, col) in PW.items():                              # paths
        if nm.startswith("ear.") and nm != "ear.prick" and view == "side":
            continue
        sgns = (1, -1) if view == "front" else (1,)
        for sg in sgns:
            if nm == "tail" and sg == -1:
                continue
            P2 = [((p[1] * sg) if view == "front" else p[0], p[2]) for p in pts]
            dash = "5 3" if nm in ("ear.lop", "ear.nub") else None
            parts.append(SS.poly(P2, pr, stroke=col, w=3 if nm in ("leg", "tail", "ear.prick") else 2, dash=dash))
            for j in J:
                x, y = pr(*(((j[1] * sg) if view == "front" else j[0]), j[2]))
                parts.append(f"<circle cx='{x:.1f}' cy='{y:.1f}' r='3.5' fill='{col}'/>")
    S = socket_points()
    for nm, (P, z, a) in S.items():                                  # sockets: the 2 x 2 patch (tail 1 x 2 on the mirror)
        zs = T["rings_z"]
        i = int(np.argmin(np.abs(np.array(zs) - z)))
        cols = G.column_angles(z)
        c = int(np.argmin(np.abs(cols - a)))
        pat = []
        zz = [zs[i - 1], zs[i + 1]]
        a0, a1 = (cols[c - 1], cols[c + 1]) if nm != "tail socket" else (0.0, cols[1])
        for zk, ak in ((zz[0], a0), (zz[0], a1), (zz[1], a1), (zz[1], a0)):
            Q = G.point(np.array([zk]), np.array([ak]))[0]
            pat.append((Q[1], zk) if view == "front" else (Q[0], zk))
        parts.append(SS.poly(pat, pr, True, stroke="#6a2a9a", w=2, fill="#a56bd1", op=1.0).replace("fill='#a56bd1'", "fill='#a56bd1' fill-opacity='0.35'"))
        x, y = pr(*pat[0])
        lx = x + (-70 if view == "front" and nm != "ear socket" else 10)
        parts.append(SS.svg_text(x + 12 if view == "side" else (x + 14 if nm != "ear socket" else x - 140), y + (18 if nm == "leg socket" else (4 if nm == "tail socket" else -6)), nm, 14, "#6a2a9a", weight="bold"))
    for nm, P in sitting().items():                                  # sitting sockets
        c = (P[1], P[2]) if view == "front" else (P[0], P[2])
        x, y = pr(*c)
        parts.append(f"<polygon points='{x:.1f},{y - 7:.1f} {x + 7:.1f},{y:.1f} {x:.1f},{y + 7:.1f} {x - 7:.1f},{y:.1f}' fill='#e5b422' stroke='#8a6a00'/>")
        if view == "side":
            parts.append(SS.svg_text(x + 10, y - 6 if nm not in ("nose",) else y - 8, nm, 14, "#7a5a00", weight="bold"))
    title = {"front": "Front (looking at +x; left of the creature on the right)", "side": "Side (x forward to the right)"}[view]
    parts.append(SS.svg_text(10, 22, title, 16, weight="bold"))
    parts.append("</svg>")
    return "".join(parts)


def top_diagram(W=540, H=540):
    ppH = 190.0
    pr = SS.Proj(ppH, W * 0.5, H * 0.5)    # world (y, x)? use (y right, x up)
    parts = [f"<svg xmlns='http://www.w3.org/2000/svg' width='{W}' height='{H}' viewBox='0 0 {W} {H}'><rect width='{W}' height='{H}' fill='#fffdf8'/>"]
    for z, col, w in ((0.7, "#b9b2a0", 1), (1.17, "#777", 2), (1.66, "#b9b2a0", 1)):
        pts = []
        for a in np.linspace(0, 1, 40):
            r = float(G.rho(z, a)); th = math.pi * a
            pts.append((r * math.sin(th), -r * math.cos(th)))
        pts += [(-y, x) for y, x in pts[::-1]]
        parts.append(SS.poly(pts, pr, True, stroke=col, w=w, fill="none"))
    for nm, (pts, J, col) in PW.items():
        for sg in (1, -1):
            if nm == "tail" and sg == -1:
                continue
            P2 = [(p[1] * sg, p[0]) for p in pts]
            parts.append(SS.poly(P2, pr, stroke=col, w=3 if nm in ("leg", "tail", "ear.prick") else 2, dash=("5 3" if nm in ("ear.lop", "ear.nub") else None)))
            for j in J:
                x, y = pr(j[1] * sg, j[0])
                parts.append(f"<circle cx='{x:.1f}' cy='{y:.1f}' r='3.5' fill='{col}'/>")
    x, y = pr(0.0, 0.0)
    parts.append(f"<circle cx='{x:.1f}' cy='{y:.1f}' r='5' fill='#1f4e9e'/>")
    parts.append(SS.svg_text(10, 22, "Top (front of the creature up the page)", 16, weight="bold"))
    parts.append(SS.svg_text(W / 2 - 10, 46, "front", 14, "#555"))
    parts.append(SS.svg_text(W / 2 - 10, H - 12, "back", 14, "#555"))
    parts.append("</svg>")
    return "".join(parts)


def skeleton_mesh():
    ms = []
    for z in T["rings_z"]:                               # cage rings as thin hoops
        pts = []
        for a in np.linspace(0, 1, 25):
            r = float(G.rho(z, a)); th = math.pi * a
            pts.append((-r * math.cos(th), r * math.sin(th), z))
        pts += [(x, -y, zz) for x, y, zz in pts[-2::-1]]
        ms.append(SS.tube_mesh(np.array(pts), 0.006, 6, cap=False))
    ms.append(SS.tube_mesh(np.array([[0, 0, G.ends[0]], [0, 0, G.ends[1]]]), 0.02, 8))
    for nm, (pts, J, col) in PW.items():
        for sg in (1, -1):
            if nm == "tail" and sg == -1:
                continue
            P = pts * np.array([1, sg, 1])
            r = 0.035 if nm in ("leg", "tail", "ear.prick") else 0.022
            ms.append(SS.tube_mesh(P, r, 8))
    V, F = SS.merge(ms)
    return V, F


def main():
    V, F = skeleton_mesh()
    mb = SV.MeshBody(V, F)
    names = SV.turnaround(mb, os.path.join(OUT, "c0"), mesh=dict(V0=V, F0=F, V=V, F=F), centre=(-0.25, 0, 1.1), width=480, height=520, pph=125.0)
    rows = [("the file", "species/S20.json"), ("loft", f"keyed by z, {len(T['rings_z'])} rings, 9 columns, head and body one spine (z 0.18 to 2.2)"),
            ("paths drawn", "leg, tail, ear prick (solid), ear lop and nub (dashed): forward kinematics with the plane yaw, then the fillet (1.25 x the joint radius)"),
            ("sockets", "leg 2 x 2 at station 0.33, ear 2 x 2 at 2.01, tail 1 x 2 on the mirror at 0.55; yellow diamonds are sitting shapes (arm, nose, tail tip, crown)")]
    body = ("<h1>S20 Tuliko, chunk 0: data and paths (the skeleton)</h1>"
            "<p>Everything below is drawn from species/S20.json by the builder's code (schema.py, paths.fk with the plane yaw, gourd.py for the loft outline). Blue: the spine and its joints. Grey lines: cage rings. Dashed orange: the three mass bumps (belly, seat, cheek). Green: the path through each limb or tube. Purple: the socket patches.</p>"
            f"<div class='row'>{SS_wrap(diagram('front'))}{SS_wrap(diagram('side'))}{SS_wrap(top_diagram())}</div>"
            "<h2>10-angle clay turnaround of the skeleton: spine, cage rings (hoops) and the paths as thin tubes (the ear shown as prick, lop and nub together)</h2>"
            + SL_grid("clay", "c0", names) + "<h2>Same, wireframe</h2>" + SL_grid("wire", "c0", names) +
            "<h2>What the file says</h2>" + SL.table(rows))
    p = os.path.join(OUT, "0-skeleton.html")
    open(p, "w").write(SL.page("S20 chunk 0 skeleton", body))
    SL.shoot(p, os.path.join(OUT, "0-skeleton.png"), 1960)
    print("ok")


def SS_wrap(svg):
    return f"<div class='cell'>{svg}</div>"


def SL_grid(prefix, sub, names, w=480, cols=4):
    return f"<div class='grid' style='grid-template-columns:repeat({cols},{w}px)'>" + "".join(
        f"<div class='cell'><img src='{sub}/{prefix}-{n}.png' width='{w}'><div class='cap'>{n}</div></div>" for n in names) + "</div>"


if __name__ == "__main__":
    main()
