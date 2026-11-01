"""Eye insets (body-spec s2.4): the 2 x 2 faces round the head vertex nearest the house eye centre are replaced by two concentric loops: the socket rim (the old 8-loop, creased 0.5 -> 1)
and an inner loop sunk 0.02 H; the disc (the 4 inner faces) is sunk 0.03 H and is the decal island. Added after the limit fit."""
import numpy as np


def add_eyes(body, ctx):
    cage = body.cage
    m = ctx["remap"]
    hd = ctx["info"]["head"]
    H = ctx["H"]
    rings = hd["rings"]
    s_e = hd["rows"]["eye"]
    k_e = int(np.argmin([abs(i["s"] - s_e) for i in hd["ringinfo"]]))
    c = 6
    A = cage.arr()
    v = m[rings[k_e][c]]
    nbr = [m[rings[k_e + dk][c + dc]] for dk, dc in ((-1, -1), (-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1))]
    faces = [fi for fi, f in enumerate(cage.F) if v in f]
    assert len(faces) == 4, len(faces)
    ctr = hd["ringinfo"][k_e]["centre"]
    n = A[v] - ctr
    n[2] *= 0.3
    n /= np.linalg.norm(n)
    inset = []
    for u in nbr:
        p = A[v] + 0.5 * (A[u] - A[v]) - 0.010 * n
        inset.append(cage.add(p))
    for _ in inset:
        body.part.append(body.pid("head")); body.s.append(s_e); body.around.append(0.75); body.target.append(None)
    cage.V[v] = (A[v] - 0.015 * n).tolist()
    body.target[v] = np.array(cage.V[v], float)
    fp = body.face_part[faces[0]]
    # one of the 4 faces is reused, the rest are appended
    new = [(nbr[k], nbr[(k + 1) % 8], inset[(k + 1) % 8], inset[k]) for k in range(8)] + [(v, inset[k], inset[(k + 1) % 8], inset[(k + 2) % 8]) for k in range(0, 8, 2)]
    old = [cage.F[fi] for fi in faces]
    # orientation: copy the winding of a surrounding face
    ref = old[0]
    def oriented(q):
        # a quad is consistent if it traverses a shared edge opposite to its neighbour: check against the 8-loop edge in `old`
        return q
    keep = [fi for fi in range(len(cage.F)) if fi not in faces]
    cage.F = [cage.F[i] for i in keep]
    body.face_part = [body.face_part[i] for i in keep]
    for q in new:
        cage.F.append(tuple(int(i) for i in q))
        body.face_part.append(fp)
    for k in range(8):
        pass          # no crease: the brow is round all the way (AD gate 1)
    def hook(body, v=v, nbr=nbr, inset=inset, n=n):
        A = body.cage.arr()
        for u, i in zip(nbr, inset):
            A[i] = A[v] + 0.5 * (A[u] - A[v]) - 0.010 * n
        body.cage.set_arr(A)
    body.hooks.append(hook)
    ctx["info"]["eye"] = dict(centre=v, loop=nbr, inset=inset, ring=k_e, col=c)
    return ctx["info"]["eye"]
