"""Round 5, mesh quality (the owner's wireframe reading): per cage part (the _PART attribute) on the VISIBLE surface (vertices not buried inside another part), the valence histogram (poles are the
irregular vertices: valence 3 and 5 and up), the longest to shortest edge, flipped faces (a face looking into the field) and folded edges (adjacent faces turning more than FOLD_DEG).
Used by tests/test_quality.py and the turnaround sheet.   quality(sc, H) -> {part: {...}, '_all': {...}}"""
import numpy as np

FOLD_DEG = 100.0
BURIED = -0.02       # H: deeper inside another part's field than this = hidden


def _vertex_valence(n, edges):
    v = np.zeros(n, int)
    np.add.at(v, edges[:, 0], 1); np.add.at(v, edges[:, 1], 1)
    return v


def quality(sc, H):
    me = sc.final.data
    n = len(me.vertices)
    P = np.empty(n * 3); me.vertices.foreach_get("co", P); P = P.reshape(-1, 3)
    part = np.zeros(n, np.int32); me.attributes["_PART"].data.foreach_get("value", part)
    names = sc.part_names
    E = np.empty(len(me.edges) * 2, int); me.edges.foreach_get("vertices", E); E = E.reshape(-1, 2)
    Fv = [tuple(p.vertices) for p in me.polygons]
    val = _vertex_valence(n, E)
    # buried: inside another part's field (the limbs are fitted on their own fields, the torso on its own)
    legs = {lg["name"]: lg for lg in H.legs}
    dT = H.dTorso(P)
    d_leg = {k: lg["d_column"](P) for k, lg in legs.items()}
    d_paw = {k: lg["d_paw"](P) for k, lg in legs.items()}
    dHead = H.dh(P - H.kc)
    buried = np.zeros(n, bool)
    for i, nm in enumerate(names):
        m = part == i
        if nm == "head":
            buried[m] = dT[m] < BURIED
        elif nm == "torso":
            inside = np.minimum.reduce([np.minimum(d_leg[k][m], d_paw[k][m]) for k in legs] + [dHead[m]])
            buried[m] = inside < BURIED
        elif nm.startswith("leg."):
            k = nm[4:]
            buried[m] = (np.minimum(dT[m], dHead[m]) < BURIED) | (d_paw[k][m] < BURIED)
        elif nm.startswith("paw."):
            buried[m] = np.minimum(dT[m], d_leg[nm[4:]][m]) < BURIED
    eyes = [H.kc + e["c"] for e in H.eyes]; Re = [e["Reye"] * 1.6 for e in H.eyes]
    near_eye = np.zeros(n, bool)
    for c_, r_ in zip(eyes, Re):
        near_eye |= np.linalg.norm(P - c_, axis=1) < r_       # the eye sockets' walls are a modelled 90 degree step: not a fold
    # face normals, flips and folds against the union's outward direction
    nf = len(Fv)
    Nrm = np.zeros((nf, 3)); C = np.zeros((nf, 3))
    for k, f in enumerate(Fv):
        p = P[list(f)]; C[k] = p.mean(0)
        Nrm[k] = np.cross(p[2] - p[0], p[3 - 0 if len(f) > 3 else 1] - p[1]) if len(f) > 3 else np.cross(p[1] - p[0], p[2] - p[0])
    Nrm /= np.maximum(np.linalg.norm(Nrm, axis=1, keepdims=True), 1e-12)
    # outward = the gradient of the face's OWN part field (head, torso, leg column, paw): a face looking into its own field is flipped
    own = {}
    for i, nm in enumerate(names):
        own[i] = (lambda Q: H.dh(Q - H.kc)) if nm == "head" else H.dTorso if nm == "torso" else legs[nm[4:]]["d_column"] if nm.startswith("leg.") else legs[nm[4:]]["d_paw"]
    pf = np.array([part[f[0]] for f in Fv])
    g = np.zeros_like(C); h = 1e-3
    for i in range(len(names)):
        m = pf == i
        if not m.any():
            continue
        for a_ in range(3):
            o = np.zeros(3); o[a_] = h
            g[m, a_] = (own[i](C[m] + o) - own[i](C[m] - o)) / (2 * h)
    g /= np.maximum(np.linalg.norm(g, axis=1, keepdims=True), 1e-12)
    anyb = np.array([buried[list(f)].any() or near_eye[list(f)].any() for f in Fv])
    flipped_f = ((Nrm * g).sum(1) < -0.2) & ~anyb
    fb = np.zeros(len(Fv), bool)
    flipped_at = C[flipped_f]
    ef = {}
    for k, f in enumerate(Fv):
        for a in range(len(f)):
            ef.setdefault((min(f[a], f[(a + 1) % len(f)]), max(f[a], f[(a + 1) % len(f)])), []).append(k)
    fold_e = []
    for (a, b), fs in ef.items():
        if len(fs) == 2 and not (buried[a] or buried[b]) and not (near_eye[a] or near_eye[b]):
            c = float(np.clip(Nrm[fs[0]] @ Nrm[fs[1]], -1, 1))
            if np.degrees(np.arccos(c)) > FOLD_DEG:
                fold_e.append((a, b))
    fold_part = np.bincount([part[a] for a, _ in fold_e], minlength=len(names)) if fold_e else np.zeros(len(names), int)
    L = np.linalg.norm(P[E[:, 0]] - P[E[:, 1]], axis=1)
    ep = np.minimum(part[E[:, 0]], part[E[:, 1]])      # an edge belongs to its lower part index (a part's own edges lie inside it)
    vis_e = ~(buried[E[:, 0]] & buried[E[:, 1]])
    out = {}
    for i, nm in enumerate(names):
        mv = (part == i) & ~buried & ~near_eye
        me_ = (ep == i) & vis_e & (part[E[:, 0]] == part[E[:, 1]])
        vh = np.bincount(val[mv], minlength=9)[:9]
        out[nm] = dict(verts=int(mv.sum()), valence={int(k): int(c) for k, c in enumerate(vh) if c}, poles=int((val[mv] != 4).sum()),
                       max_valence=int(val[mv].max()) if mv.any() else 0, edge_ratio=float(L[me_].max() / L[me_].min()) if me_.any() else 0.0,
                       edge_p95_p5=float(np.percentile(L[me_], 95) / np.percentile(L[me_], 5)) if me_.any() else 0.0,
                       flipped_faces=int((flipped_f & (pf == i) & ~fb).sum()), folded_edges=int(fold_part[i]))
    out["_all"] = dict(verts=int(n), faces=nf, flipped_faces=int((flipped_f & ~fb).sum()), folded_edges=len(fold_e), poles=sum(o["poles"] for o in out.values()), flipped_at=flipped_at.round(3).tolist())
    return out
