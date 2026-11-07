"""Analytic UVs (body-spec s4.1) and their stretch. Each part's quad grid is a rectangle in (around, s): u = +-around (left +, right -; the dorsal line is u = 0, the seam on the belly line u = +-1), v = s; both are scaled to physical length
(u by the part's mean half-ring length, v by 1) so a perfect island has stretch 1. Stretch of a quad = sigma_max / sigma_min of the 3D->UV Jacobian. Reported per island, vs the spec's <= 1.3."""
import numpy as np


def island_stretch(V2, F2, attr2, parts):
    F2 = np.array(F2, int)
    pid = np.rint(attr2[:, 0]).astype(int)
    res = {}
    cen_y = V2[F2].mean(1)[:, 1]
    for name, p in parts.items():
        fm = np.array([np.bincount(pid[f], minlength=len(parts) + 2).argmax() == p for f in F2])
        idx = np.where(fm)[0]
        if len(idx) == 0:
            continue
        # mean half-ring length: perimeter of a ring ~ 2 x the mean width of the part at its station; use the part's own mean edge ratio instead: scale u by the mean 3D length of an `around` step per unit around
        vals = []
        Vp = V2[F2[idx]]               # (n,4,3)
        A = attr2[F2[idx]]             # (n,4,4)
        sgn = np.where(cen_y[idx] >= 0, 1.0, -1.0)[:, None]
        u = A[:, :, 2] * sgn; v = A[:, :, 1]
        # edges: 0->1 and 0->3 (the quad's two directions)
        e1, e2 = Vp[:, 1] - Vp[:, 0], Vp[:, 3] - Vp[:, 0]
        du1, dv1 = u[:, 1] - u[:, 0], v[:, 1] - v[:, 0]
        du2, dv2 = u[:, 3] - u[:, 0], v[:, 3] - v[:, 0]
        # scale u so that the island's mean |3D| / |UV| agree
        l3 = np.concatenate([np.linalg.norm(e1, axis=1), np.linalg.norm(e2, axis=1)])
        luv = np.concatenate([np.hypot(du1, dv1), np.hypot(du2, dv2)])
        ok = luv > 1e-9
        k = np.median(l3[ok] / luv[ok]) if ok.any() else 1.0
        st = []
        for i in range(len(idx)):
            J3 = np.array([e1[i], e2[i]])                      # 2x3 (rows: edge vectors)
            UV = np.array([[du1[i], dv1[i]], [du2[i], dv2[i]]]) * k
            if abs(np.linalg.det(UV)) < 1e-12:
                continue
            # Jacobian from UV to 3D: J = UV^-1 J3 (2x3); its singular values
            J = np.linalg.solve(UV, J3)
            sv = np.linalg.svd(J, compute_uv=False)
            if sv[1] > 1e-12:
                st.append(sv[0] / sv[1])
        if st:
            st = np.array(st)
            res[name] = dict(median=float(np.median(st)), p95=float(np.percentile(st, 95)), max=float(st.max()), faces=int(len(st)))
    return res
