"""The biped plan: an upright body on two legs. Its bands, and its spine view (the spine runs from the crown down through the head, neck, back and seat and out along the tail, the one path the cage is lofted on). The families on it are the registry's (sitter, waddler, climber, flutterer); no family has a template yet, so S20 stays the biped regression fixture."""
import numpy as np

NAME = "biped"
BANDS = dict(name=NAME, ranges=["head", "neck", "back", "seat", "tail"], range_len=dict(head=(0.7, 1.3), neck=(0.0, 0.2), back=(0.6, 1.2), seat=(0.3, 0.8)), tail_length=(0.6, 1.8), tail_root=(0.1, 0.45), tip_r=(0.02, 0.1),
             attach="underside", a=(0.2, 0.6), d=(0.0, 0.3), seat_radius=(0.4, 0.7), limb_joints=3,
             prof_R_scale=(0.8, 1.2), prof_neck_ratio=(0.50, 0.80), prof_chest_front=(0.0, 0.12), prof_rump_gain=(0.0, 0.6))
# the stations the profile knobs sit at: the height of the table row each knob moves and the edge of the section it reads (the front of the chest, the back of the rump)
BIPED_KNOBS = dict(neck_ratio=(1.2, "front"), R_scale=(1.68, "front"), chest_front=(0.96, "front"), rump_gain=(0.46, "back"))


def biped_path(doc):
    import paths as PA
    import species_v1 as V1
    from wb import spine as SP
    d = V1.to_internal(doc, check=False)
    t, tail = d["parts"]["torso"], d["parts"]["tail"]
    sp = t["spine"]
    js = tail["joints"]
    tailP = PA.fk(np.array(js[0]["at"], float), js)
    body = [[x, 0.0, z] for x, z in sp["body"]]
    P = np.array(body + [list(p) for p in tailP], float)
    R = np.array([[r, r] for r in sp["body_r"]] + [list(j["r"]) for j in js], float)
    names = ["crown", "K", "waist", "back"][:len(body)] + [j["name"] for j in js]
    order = slice(None, None, -1)
    pa = PA.Path(names[order], P[order], R[order], tail.get("fillet", sp["fillet"]), up=[0.0, 1.0, 0.0])      # as the cage builder lays it: from the stalk to the crown
    u = np.arange(0.0, pa.length, SP.STEP)
    pts = pa.at(pa.length - u)[0]
    return u, pts


def _edge(rows, z, edge):
    zs = np.array([r[0] for r in rows])
    ax = np.array([r[1] for r in rows])
    if edge == "front":
        return float(np.interp(z, zs, ax[:, 2]))
    return -float(np.interp(z, zs, ax[:, 0]))


def biped_knobs(doc):
    import headshape as HS
    loft = doc["spine"]["loft"]
    hp, base = loft["head_profile"], loft["section"]["stations_base"]
    rows = HS.stations(base, **hp)
    out = []
    for name, (z, edge) in BIPED_KNOBS.items():
        if name not in hp:
            continue
        v = float(hp[name])
        h = 0.01 if name in ("neck_ratio", "R_scale") else 0.005
        moved = HS.stations(base, **{**hp, name: v + h})
        dx = _edge(moved, z, edge) - _edge(rows, z, edge)
        out.append(dict(name=name, z=z, edge=edge, x=_edge(rows, z, edge), gain=(h / dx) if abs(dx) > 1e-9 else 0.0))
    return rows, out


def spine(doc):
    """(u, points, knobs, outline, built, camera) of a biped file: the plan's spine view."""
    u, pts = biped_path(doc)
    rows, ks = biped_knobs(doc)
    knobs = [dict(name=k["name"], at=[round(k["x"], 5), 0.0, k["z"]], axis=[1.0, 0.0, 0.0], gain=round(k["gain"], 5)) for k in ks]
    outline = dict(back=[[round(-r[1][0], 4), r[0]] for r in rows], front=[[round(r[1][2], 4), r[0]] for r in rows])
    return u, pts, knobs, outline, True, None
