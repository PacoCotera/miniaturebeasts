"""The coat on a texture (S20 pass 2). The glb no longer carries the coat as vertex colours (a level-3 mesh existed only to carry them, and the freckles rendered as square chips): it ships the cage's subdivision at level 2 with smooth normals and
UVs, and a baked atlas (colour, emission, roughness).
UVs are analytic and in physical units (1 H = PX px), per face corner (so a seam is a real seam):
  loft  : u = side * arc round the section from the front line, v = arc length along the one spine (head at the top, the tail at the bottom); its two end caps (the crown and the bulb's end) are planar islands;
  tubes : leg, ear and arm, u = angle * radius round the tube, v = arc length along its path, measured GEOMETRICALLY from the vertex (nearest point on the path; the bridge band between the loft and the first ring is continued along the first segment),
          so the band and the tube share one smooth map; the right-hand side shares the left's island (mirrored).
The bake rasterises the level-3 faces into the atlas (barycentric position, normal, arc length, around, tag), evaluates the coat at every covered texel (s20coat.coat is a pure function of the point) and pads the islands.
Nothing here depends on Blender."""
import math
import numpy as np
import s20coat as CT

SIZE = 2048
SHIP_LEVEL = 1                     # the shipped subdivision level (the owner: at most 3,500 vertices); the atlas is baked against THIS level's UVs
PX = 400.0
TAIL_SCALE = 0.5            # the seat and the tail island is drawn at half the body's density (200 px per H): it would not fit the atlas beside the other islands, and it is the least seen surface
EAR_SCALE = 0.9
UV_C = 0.4
ISLAND = {"app": (1700, 1700), "torso": (170, 60), "tail": (1000, 1090), "crown": (1700, 60), "tip": (1700, 520), "sole": (1700, 800), "toe": (1760, 1000), "leg.L": (60, 1360), "ear.L": (770, 1360), "arm.L": (1320, 1360)}


def _frames_dense(pa, step=0.004):
    s = np.arange(0.0, pa.length + 1e-9, step)
    pt, T, N, B = pa.at(s)
    ra, rf = pa.radii(s).T
    return s, pt, T, N, B, ra, rf


def tube_uv(ctx, pname, P, Cmean=None):
    """P (m, 3) points of the left-hand tube part (and its bridge band); returns (psi (m,), v (m,), r (m,)): ring angle, arc length along the path (negative before its start), local mean radius."""
    if pname == "leg.L":
        pa = ctx["info"]["limbs"]["leg.L"]["path"]
    else:
        pa = ctx["info"]["tubes"][pname]["path"]
    s, pt, T, N, B, ra, rf = _frames_dense(pa)
    out_psi, out_v, out_r = np.zeros(len(P)), np.zeros(len(P)), np.zeros(len(P))
    for i0 in range(0, len(P), 4000):
        X = P[i0:i0 + 4000]
        d2 = ((X[:, None, :] - pt[None, :, :]) ** 2).sum(2)
        k = d2.argmin(1)
        sv = s[k].copy()
        pk, Tk, Nk, Bk, rak, rfk = pt[k], T[k], N[k], B[k], ra[k], rf[k]
        pre = (k == 0) & (((X - pt[0]) * T[0]).sum(1) < 0)           # before the path's start: continue along the first tangent
        sv = np.where(pre, ((X - pt[0]) * T[0]).sum(1), sv)
        post = (k == len(s) - 1) & (((X - pt[-1]) * T[-1]).sum(1) > 0)
        sv = np.where(post, pa.length + ((X - pt[-1]) * T[-1]).sum(1), sv)
        d = X - pk
        psi = np.arctan2((d * Bk).sum(1) / np.maximum(rak, 1e-3), (d * Nk).sum(1) / np.maximum(rfk, 1e-3))
        out_psi[i0:i0 + 4000], out_v[i0:i0 + 4000], out_r[i0:i0 + 4000] = psi, sv, 0.5 * (rak + rfk)
    return out_psi, out_v, out_r


def loft_v_table(b, na=33):
    """v of the loft's UV as the true distance down the surface (pass 4: texel density of the belly patch). The rings of the bend and the seat are tilted planes of the one spine, so on the belly's outer side two rings are up to 1.8 x farther apart than their arc length
    on the path (the old v = G.L - s): the front of the belly was painted at 212 px per H against 400. Here E[k, a] is the cumulative length, from the crown ring down, of the polyline through the cage's ring vertices at `around` a (each ring read as a polyline of its own vertices).
    Returns (ring_s (ascending), agrid, E)."""
    if "_loft_v" in b.ctx:
        return b.ctx["_loft_v"]
    info = b.ctx["info"]["torso"]
    m = b.ctx["remap"]
    Vc = np.array(b.cage.V, float)
    around = np.array(b.around, float)
    ag = np.linspace(0.0, 1.0, na)
    P = []
    for ring in info["rings"]:
        ids = [m[v] for v in ring if v in m]
        a_ = around[ids]
        o = np.argsort(a_)
        a_ = a_[o]; X = Vc[np.array(ids)[o]]
        P.append(np.stack([np.interp(ag, a_, X[:, k]) for k in range(3)], 1))
    P = np.array(P)                                                  # (rings, na, 3), tail tip first, crown last
    seg = np.linalg.norm(np.diff(P, axis=0), axis=2)                 # distance between ring k and k+1 at each a
    E = np.zeros((len(P), na))
    E[:-1] = np.cumsum(seg[::-1], axis=0)[::-1]                      # from the crown ring (E = 0) down to the tail tip
    ur = np.linalg.norm(np.diff(P, axis=1), axis=2)                  # along each ring: the lateral distance from the front line (a = 1) back to a
    U = np.zeros((len(P), na))
    U[:, :-1] = np.cumsum(ur[:, ::-1], axis=1)[:, ::-1]
    out = (np.array(info["ring_s"], float), ag, E, U)
    b.ctx["_loft_v"] = out
    return out


S_BLEND = (0.0, 0.0)          # (the blend toward the old map is gone: it folded where the belly's front met the seat's underside)
A_BLEND = (0.0, 0.0)


def loft_v(b, s, a):
    """The loft's v (in H, from the crown) at arc length s and around a (arrays of one shape): the true surface distance on the belly's front (bilinear in the table), blended into the old v = G.L - s toward the tail
    (the front line's true distance to the lantern is 4.2 H, which would not fit the atlas beside the other islands; the seat's underside and the tail keep the old map)."""
    s = np.asarray(s, float); a = np.clip(np.asarray(a, float), 0.0, 1.0)
    old = b.ctx["T"].L - s
    w = np.ones_like(old)
    if float(np.max(w)) <= 0.0:
        return old
    return old + w * (loft_v_true(b, s, a) - old)


def loft_u(b, s, a):
    """The loft's u magnitude (distance round the section from the front line, in H): true lateral distance on the body (s >= 0.8), the old proportional map toward the tail (whose small radius it blows up on purpose)."""
    s = np.asarray(s, float); a = np.clip(np.asarray(a, float), 0.0, 1.0)
    rs, ag, E, U = loft_v_table(b)
    rho = np.interp(s, np.array(b.ctx["info"]["torso"]["ring_s"]), np.array(b.ctx["info"]["torso"]["ring_side"]))
    old = (1 - a) * math.pi * (UV_C * 0.5 + (1 - UV_C) * rho)
    w = np.ones_like(old)
    return old + w * (_interp(rs, ag, U, s, a) - old)


def _sstep(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def loft_v_true(b, s, a):
    rs, ag, E, U = loft_v_table(b)
    return _interp(rs, ag, E, s, a)


def _interp(rs, ag, E, s, a):
    s = np.asarray(s, float); a = np.clip(np.asarray(a, float), 0.0, 1.0)
    k = np.clip(np.searchsorted(rs, s) - 1, 0, len(rs) - 2)
    t = np.clip((s - rs[k]) / np.maximum(rs[k + 1] - rs[k], 1e-9), 0.0, 1.0)
    fa = a * (len(ag) - 1)
    j = np.clip(np.floor(fa).astype(int), 0, len(ag) - 2)
    w = fa - j
    e0 = E[k, j] * (1 - w) + E[k, j + 1] * w
    e1 = E[k + 1, j] * (1 - w) + E[k + 1, j + 1] * w
    return e0 * (1 - t) + e1 * t


def face_uv(b, V, F, fpart, attr):
    """UV of every face corner in atlas px (nf, 4, 2) and the island name of each face. V (n,3) level mesh, F quads, fpart (nf,) part id of each face, attr (n,4)."""
    ctx = b.ctx
    G = ctx["T"]
    F = np.asarray(F, int)
    nf = len(F)
    uv = np.zeros((nf, 4, 2))
    isl = np.empty(nf, dtype=object)
    pn = {v: k for k, v in b.parts.items()}
    tid = b.parts["torso"]
    rs = np.array(ctx["info"]["torso"]["ring_s"])
    rside = np.array(ctx["info"]["torso"]["ring_side"])
    smean = attr[F][:, :, 1].mean(1)
    # ---- the loft
    tor = fpart == tid
    crown = tor & (smean >= rs[-1] - 1e-6)
    tip = tor & (smean <= rs[0] + 1e-6)
    s_cut = float(rs[15])                                          # the tail range (the first sixteen rings: the tail, the seat and the underside up to the crotch) is its own island with the old arc-length v and the true u: there the rings flare like an annulus and the surface distance parametrisation folds; the body above is one island of true distances
    tailf = tor & ~crown & ~tip & (smean <= s_cut)
    body = tor & ~crown & ~tip & ~tailf
    ym = V[F][:, :, 1].mean(1)
    side = np.where(ym >= 0, 1.0, -1.0)
    for nm, sel in (("torso", body), ("crown", crown), ("tip", tip), ("tail", tailf)):
        isl[sel] = nm
    fi = np.where(tailf)[0]
    if len(fi):
        a_t = attr[F[fi]][:, :, 2]; s_t = attr[F[fi]][:, :, 1]
        rs_, ag_, E_, U_ = loft_v_table(b)
        u_t = side[fi][:, None] * _interp(rs_, ag_, U_, s_t, a_t)
        x0, y0 = ISLAND["tail"]
        uv[fi, :, 0] = x0 + (u_t + 1.75) * PX * TAIL_SCALE
        uv[fi, :, 1] = y0 + (s_cut - s_t) * PX * TAIL_SCALE
    fi = np.where(body)[0]
    a = attr[F[fi]][:, :, 2]
    sv = attr[F[fi]][:, :, 1]
    rho = np.interp(sv, rs, rside)
    u = side[fi][:, None] * loft_u(b, sv, a)
    x0, y0 = ISLAND["torso"]
    ux = x0 + (u + 1.75) * PX
    uy = y0 + loft_v(b, sv, a) * PX
    uv[fi, :, 0], uv[fi, :, 1] = ux, uy
    fi = np.where(crown)[0]
    x0, y0 = ISLAND["crown"]
    uv[fi, :, 0] = x0 + (V[F[fi]][:, :, 0] + 0.5) * PX * 0.9
    uv[fi, :, 1] = y0 + (V[F[fi]][:, :, 1] * side[fi][:, None] * 0 + np.abs(V[F[fi]][:, :, 1]) * side[fi][:, None] + 0.5) * PX * 0.9
    fi = np.where(tip)[0]
    ri = ctx["info"]["torso"]["ring_info"][0]
    d = V[F[fi]] - ri["centre"]
    x0, y0 = ISLAND["tip"]
    uv[fi, :, 0] = x0 + (d @ ri["N"] * 0 + (d @ ri["B"]) + 0.3) * PX
    uv[fi, :, 1] = y0 + (np.abs(d @ ri["N"]) * side[fi][:, None] + 0.3) * PX
    # ---- the face attachment families: one colour strip each (100 x 6 px); u runs along the shell (its arc fraction), the coat colours it from that
    for j_, (nm_, pid_) in enumerate(sorted((k, v) for k, v in b.parts.items() if k.split(".")[0] in ("whisker", "fang", "horn", "tusk"))):
        sel_ = np.where(fpart == pid_)[0]
        if len(sel_):
            isl[sel_] = "app"
            tt = attr[F[sel_]][:, :, 1]
            uv[sel_, :, 0] = 1700 + 12 * j_ + 0.0 + np.array([0, 0, 6, 6])[None]
            uv[sel_, :, 1] = 1700 + 100.0 * np.clip(tt, 0, 1) + np.array([0, 6, 6, 0])[None] * 0
            uv[sel_, :, 0] = 1700 + 12 * j_ + np.array([0, 6, 6, 0])[None]
            uv[sel_, :, 1] = 1700 + 100.0 * np.clip(tt, 0, 1) * 0 + 100.0 * np.clip(tt, 0, 1)
    # ---- the toe shells (s = -1): one small island, a sphere map about each toe's own frame (u from the angle about its radial axis, v from the angle off its outer tip); the seam runs along the ground side, which is hidden
    toes = ctx["info"].get("toes", {})
    toe_f = np.zeros(nf, bool)
    if toes and "leg.L" in b.parts:
        cen, fr = [], []
        for rec_ in toes.values():
            for (u_, t_) in rec_["frames"]:
                for sg in (1.0, -1.0):
                    u3 = np.array(u_) * np.array([1.0, sg, 1.0]); t3 = np.array(t_) * np.array([1.0, sg, 1.0])
                    c3 = np.array([rec_["cxy"][0], sg * rec_["cxy"][1], rec_["a"][2]]) + rec_["r0"] * u3
                    cen.append(c3); fr.append((u3, t3))
        cen = np.array(cen)
        cand = np.where((fpart == b.parts["leg.L"]) & (attr[F][:, :, 1] < -0.5).all(1))[0]
        if len(cand):
            toe_f[cand] = True
            isl[cand] = "toe"
            P = V[F[cand]].reshape(-1, 3)
            k = ((P[:, None, :] - cen[None]) ** 2).sum(2).argmin(1)
            d = P - cen[k]
            uu_ = np.array([fr[i][0] for i in k]); tt_ = np.array([fr[i][1] for i in k])
            ax = (d * uu_).sum(1)
            dt = (d * tt_).sum(1)
            dz = d[:, 2]
            phi = np.arctan2(np.hypot(dt, dz), ax)                              # 0 at the outer tip, pi at the buried end
            psi = np.arctan2(dt, dz).reshape(-1, 4)                             # 0 at the top, +-pi at the ground side
            base = psi[:, :1]
            psi = base + (psi - base + math.pi) % (2 * math.pi) - math.pi
            x0, y0 = ISLAND["toe"]
            uv[cand, :, 0] = x0 + 12.0 + (psi + math.pi) / (2 * math.pi) * 96.0
            uv[cand, :, 1] = y0 + 8.0 + phi.reshape(-1, 4) / math.pi * 40.0
    # ---- tubes (the left-hand island; the right side is folded onto it)
    for nm in ("leg.L", "ear.L", "arm.L"):
        if nm not in b.parts:
            continue
        sel = np.where((fpart == b.parts[nm]) & ~toe_f)[0]
        if not len(sel):
            continue
        isl[sel] = nm
        if nm == "leg.L":                                                      # the flat soles: planar islands (a column's sole is all one arc length)
            zs = V[F[sel]][:, :, 2]
            so = zs.max(1) < 0.045
            ss = sel[so]
            isl[ss] = "sole"
            x0, y0 = ISLAND["sole"]
            Pq = V[F[ss]]
            uv[ss, :, 0] = x0 + (Pq[:, :, 0] + 0.2) * PX
            uv[ss, :, 1] = y0 + (np.abs(Pq[:, :, 1]) - 0.1) * PX
            sel = sel[~so]
            if not len(sel):
                continue
        P = V[F[sel]].reshape(-1, 3).copy()
        P[:, 1] = np.abs(P[:, 1])
        psi, v, r = tube_uv(ctx, nm, P)
        psi = psi.reshape(-1, 4); v = v.reshape(-1, 4); r = r.reshape(-1, 4)
        base = psi[:, :1]
        psi = base + (psi - base + math.pi) % (2 * math.pi) - math.pi          # unwrap each face to its first corner
        uu = psi * r
        C = 2 * math.pi * r                                                    # per vertex: a vertex keeps one u in every face that shares it (the seam alone splits it)
        k = np.floor(uu.mean(1, keepdims=True) / (2 * math.pi * r.mean(1, keepdims=True)))
        uu = uu - k * C
        x0, y0 = ISLAND[nm]
        pxs = PX * (EAR_SCALE if nm == "ear.L" else 1.0)
        uv[sel, :, 0] = x0 + uu * pxs
        uv[sel, :, 1] = y0 + v * pxs + 0.3 * pxs
    return uv, isl


def stretch(V, F, uv, isl):
    """Per island: median / p95 / max of sigma_max / sigma_min of the 3D -> UV map over its quads (left half, tube faces whose four corners lie on the tube proper are counted along with the band)."""
    F = np.asarray(F, int)
    P = V[F]
    out = {}
    e3 = np.stack([P[:, 1] - P[:, 0], P[:, 3] - P[:, 0]], 1)
    eu = np.stack([uv[:, 1] - uv[:, 0], uv[:, 3] - uv[:, 0]], 1) / PX
    left = P[:, :, 1].mean(1) >= 0
    det = eu[:, 0, 0] * eu[:, 1, 1] - eu[:, 0, 1] * eu[:, 1, 0]
    ok = np.abs(det) > 1e-12
    for nm in sorted(set(isl)):
        sel = (isl == nm) & ok & (left | (nm in ("torso", "crown", "tip", "tail")))
        idx = np.where(sel)[0]
        vals = []
        for i in idx:
            J = np.linalg.solve(eu[i], e3[i])
            sv = np.linalg.svd(J, compute_uv=False)
            if sv[1] > 1e-9:
                vals.append(sv[0] / sv[1])
        if vals:
            a = np.array(vals)
            out[nm] = dict(median=float(np.median(a)), p95=float(np.percentile(a, 95)), p99=float(np.percentile(a, 99)), max=float(a.max()), faces=int(len(a)))
    return out


# ------------------------------------------------------------------ rasteriser
def rasterize(uv, size=SIZE):
    """Cover the atlas with the faces' two triangles each: returns face (size,size) int (-1 = empty), tri (0 or 1), bary (size,size,3) float32."""
    nf = len(uv)
    face = np.full((size, size), -1, np.int32)
    tri = np.zeros((size, size), np.int8)
    bary = np.zeros((size, size, 3), np.float32)
    corners = ((0, 1, 2), (0, 2, 3))
    for t, (i0, i1, i2) in enumerate(corners):
        A, B, C = uv[:, i0], uv[:, i1], uv[:, i2]
        xmin = np.floor(np.minimum(np.minimum(A[:, 0], B[:, 0]), C[:, 0]) - 0.5).astype(int)
        xmax = np.ceil(np.maximum(np.maximum(A[:, 0], B[:, 0]), C[:, 0]) - 0.5).astype(int)
        ymin = np.floor(np.minimum(np.minimum(A[:, 1], B[:, 1]), C[:, 1]) - 0.5).astype(int)
        ymax = np.ceil(np.maximum(np.maximum(A[:, 1], B[:, 1]), C[:, 1]) - 0.5).astype(int)
        w = np.clip(xmax - xmin + 1, 0, 60); h = np.clip(ymax - ymin + 1, 0, 60)
        den = (B[:, 1] - C[:, 1]) * (A[:, 0] - C[:, 0]) + (C[:, 0] - B[:, 0]) * (A[:, 1] - C[:, 1])
        good = (np.abs(den) > 1e-9) & (w > 0) & (h > 0) & (w < 60) & (h < 60)
        idx = np.where(good)[0]
        for k0 in range(0, len(idx), 3000):
            ii = idx[k0:k0 + 3000]
            cnt = (w[ii] * h[ii])
            rep = np.repeat(ii, cnt)
            off = np.arange(cnt.sum()) - np.repeat(np.cumsum(cnt) - cnt, cnt)
            ww = np.repeat(w[ii], cnt)
            px = xmin[rep] + off % ww
            py = ymin[rep] + off // ww
            X, Y = px + 0.5, py + 0.5
            a, b_, c = A[rep], B[rep], C[rep]
            l1 = ((b_[:, 1] - c[:, 1]) * (X - c[:, 0]) + (c[:, 0] - b_[:, 0]) * (Y - c[:, 1])) / den[rep]
            l2 = ((c[:, 1] - a[:, 1]) * (X - c[:, 0]) + (a[:, 0] - c[:, 0]) * (Y - c[:, 1])) / den[rep]
            l3 = 1 - l1 - l2
            m = (l1 >= -1e-5) & (l2 >= -1e-5) & (l3 >= -1e-5) & (px >= 0) & (px < size) & (py >= 0) & (py < size)
            px, py, rep = px[m], py[m], rep[m]
            face[py, px] = rep
            tri[py, px] = t
            bary[py, px, 0], bary[py, px, 1], bary[py, px, 2] = l1[m], l2[m], l3[m]
    return face, tri, bary


def write_png(path, arr):
    """8-bit PNG (gray (h,w) or RGB (h,w,3)) with the Sub filter per row (numpy + zlib): about half the size of unfiltered rows for smooth textures."""
    import zlib, struct
    a = np.asarray(arr)
    if a.dtype != np.uint8:
        a = np.clip(a + 0.5, 0, 255).astype(np.uint8)
    ct = 0 if a.ndim == 2 else 2
    h, w = a.shape[:2]
    a3 = a.reshape(h, w, -1)
    bpp = a3.shape[2]
    sub = a3.copy()
    sub[:, 1:] = (a3[:, 1:].astype(np.int16) - a3[:, :-1].astype(np.int16)).astype(np.uint8)
    rows = np.concatenate([np.ones((h, 1), np.uint8), sub.reshape(h, w * bpp)], 1)
    raw = zlib.compress(rows.tobytes(), 6)
    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    with open(path, "wb") as fh:
        fh.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, ct, 0, 0, 0)) + chunk(b"IDAT", raw) + chunk(b"IEND", b""))
    return path


def pad(img, covered, n=10):
    """Fill the pixels within n px of an island with the mean of their covered neighbours (so bilinear filtering and mips never bleed the background colour in)."""
    img = img.copy()
    cov = covered.copy()
    for _ in range(n):
        acc = np.zeros_like(img, dtype=np.float64)
        cnt = np.zeros(cov.shape, np.float64)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                sh = np.roll(np.roll(cov, dy, 0), dx, 1)
                src = np.roll(np.roll(img, dy, 0), dx, 1)
                acc += np.where(sh[..., None], src, 0)
                cnt += sh
        new = (~cov) & (cnt > 0)
        img[new] = (acc[new] / cnt[new, None]).astype(img.dtype)
        cov = cov | new
    return img, cov


def refine_uv(uv, levels):
    """The per-corner UVs of the children of each quad after `levels` Catmull-Clark steps (subdiv.py's face order: face i gives faces 4i .. 4i+3, child k = corner k, edge k to k+1, centre, edge k-1 to k): affine inside each parent face, so the baked texture matches the shipped mesh exactly."""
    for _ in range(levels):
        n = len(uv)
        out = np.zeros((n * 4, 4, 2))
        for k in range(4):
            out[k::4, 0] = uv[:, k]
            out[k::4, 1] = 0.5 * (uv[:, k] + uv[:, (k + 1) % 4])
            out[k::4, 2] = uv.mean(1)
            out[k::4, 3] = 0.5 * (uv[:, (k - 1) % 4] + uv[:, k])
        uv = out
    return uv


def bake(b, genome, level=3, frames=("open",), size=SIZE, verbose=False, ship_level=None):
    """Bake the coat: returns dict(col (size,size,3) sRGB 0-255 float, emit, rough (size,size), covered, uv (faces of level 2 are made by the caller), face, tri, bary, mesh3). `frames` are the eye frames to evaluate: 'open' is the whole atlas, the others only
    the texels round the eyes (the rest equals 'open'); returns col per frame."""
    import subdiv as SD, gltf_out
    Vf, Ff, attr, fp, cr, mir = b.full()
    V3, F3, _, attr3, fp3 = SD.subdivide(Vf, Ff, cr, attr, fp, levels=level)
    F3 = np.array(F3, int)
    fp3 = np.asarray(fp3).astype(int)
    N3 = gltf_out.vertex_normals(V3, F3)
    sl = SHIP_LEVEL if ship_level is None else ship_level
    if sl < level:
        V1, F1, _, attr1, fp1 = SD.subdivide(Vf, Ff, cr, attr, fp, levels=sl)
        F1 = np.array(F1, int)
        uv1, isl1 = face_uv(b, V1, F1, np.asarray(fp1).astype(int), attr1)
        uv = refine_uv(uv1, level - sl)
        isl = np.repeat(isl1, 4 ** (level - sl))
    else:
        uv, isl = face_uv(b, V3, F3, fp3, attr3)
    face, tri, bary = rasterize(uv, size)
    cov = face >= 0
    fi = face[cov]
    t = tri[cov]
    L = bary[cov].astype(np.float64)
    corner = np.where(t[:, None] == 0, F3[fi][:, [0, 1, 2]], F3[fi][:, [0, 2, 3]])
    Pt = (V3[corner] * L[:, :, None]).sum(1)
    Nt = (N3[corner] * L[:, :, None]).sum(1)
    Nt /= np.maximum(np.linalg.norm(Nt, axis=1, keepdims=True), 1e-12)
    At = (attr3[corner] * L[:, :, None]).sum(1)
    part = fp3[fi]
    mirrored = np.isin(isl[fi], ["leg.L", "ear.L", "arm.L"])
    # the right-hand side of a mirrored island never gets here (the faces were folded in face_uv: their texels belong to the left part): evaluate the coat at the left-hand position
    fold = mirrored & (Pt[:, 1] < 0)
    Pt = np.where(fold[:, None], Pt * np.array([1, -1, 1.0]), Pt)
    Nt = np.where(fold[:, None], Nt * np.array([1, -1, 1.0]), Nt)
    out = {}
    res = {}
    for fr in frames:
        o = CT.coat(b.ctx, Pt, At, part, Nt, At[:, 3], genome, fr)
        res[fr] = o
    o = res[frames[0]]
    def put(vals, ch):
        img = np.zeros((size, size, ch), np.float32)
        img[cov] = vals if ch > 1 else vals[:, None]
        return img
    out["col"] = {fr: put(CT.lin_to_srgb(res[fr]["col"]), 3) for fr in frames}
    out["emit"] = put(CT.lin_to_srgb(np.clip(res[frames[0]]["emit"], 0, 1)), 3)
    out["rough"] = put(res[frames[0]]["rough"], 1)[..., 0]
    out["cov"] = cov
    out["fields"] = o["fields"]
    out["uv3"], out["isl3"], out["F3"], out["V3"] = uv, isl, F3, V3
    out["emit_raw_max"] = float(np.max(res[frames[0]]["emit"]))
    return out


def render_mesh(b, level=None):
    """The shipped mesh: the cage's subdivision at `level`, smooth area-weighted vertex normals (computed on the welded surface, so they are continuous across a UV seam), and UVs. Vertices are split where the UV differs (a seam). Returns dict(V, F (quads),
    N, UV (0-1, v down like the image rows), vid (the welded vertex of each split vertex), part (per welded vertex), attr (welded), isl (per face), Vw, Fw, Nw, fpart)."""
    import subdiv as SD, gltf_out
    level = SHIP_LEVEL if level is None else level
    Vf, Ff, attr, fp, cr, mir = b.full()
    V, F, _, at, fpp = SD.subdivide(Vf, Ff, cr, attr, fp, levels=level)
    F = np.array(F, int)
    fpp = np.asarray(fpp).astype(int)
    Nw = gltf_out.vertex_normals(V, F)
    uv, isl = face_uv(b, V, F, fpp, at)
    key = np.concatenate([F.reshape(-1, 1), np.round(uv.reshape(-1, 2) * 20).astype(np.int64)], 1)
    uniq, inv = np.unique(key, axis=0, return_inverse=True)
    inv = inv.reshape(-1)
    first = np.zeros(len(uniq), int)
    first[inv[::-1]] = np.arange(len(inv))[::-1]
    vid = uniq[:, 0]
    UV = uv.reshape(-1, 2)[first] / SIZE
    Fs = inv.reshape(-1, 4)
    cnt = np.zeros((len(V), len(b.parts) + 1))
    for k in range(4):
        np.add.at(cnt, (F[:, k], fpp), 1.0)
    part = cnt.argmax(1)
    return dict(V=V[vid], F=Fs, N=Nw[vid], UV=UV, vid=vid, part=part, attr=at, isl=isl, Vw=V, Fw=F, Nw=Nw, fpart=fpp)
