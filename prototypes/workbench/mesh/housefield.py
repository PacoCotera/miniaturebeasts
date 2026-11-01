"""The house, in Python, read only: the band maps, faceParams, and the SDF's masses as numpy fields (head K, M; chest C, pelvis P; legs; paws).

Every number is read by name from form/house/house-1.json and foundation/specimens.json of THIS checkout (the worktree is pinned to one commit of
build/genome-foundation); nothing is added or patched here. The formulas are ported from foundation/sdf.mjs, head.mjs, scene.mjs and pose.mjs.
Units: H = head height = 1; x forward, y to the creature's left, z up (house axes). Pure numpy: no Blender in this file.
"""
import json, math, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
WB = os.path.dirname(HERE)                       # prototypes/workbench
HOUSE_FILE = os.path.join(WB, "form/house/house-1.json")
SPEC_FILE = os.path.join(WB, "foundation/specimens.json")


# ---------------------------------------------------------------- primitives (sdf.mjs), vectorised: p is (N, 3) or a tuple of arrays
def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def sd_ellipsoid(p, r):
    x, y, z = p[..., 0], p[..., 1], p[..., 2]
    k0 = np.sqrt((x / r[0]) ** 2 + (y / r[1]) ** 2 + (z / r[2]) ** 2)
    k1 = np.sqrt((x / r[0] ** 2) ** 2 + (y / r[1] ** 2) ** 2 + (z / r[2] ** 2) ** 2)
    return np.where(k1 < 1e-12, -min(r), k0 * (k0 - 1) / np.maximum(k1, 1e-300))


def sd_super(p, a, b, c, n):
    u, v, w = np.abs(p[..., 0] / a), np.abs(p[..., 1] / b), np.abs(p[..., 2] / c)
    S = u ** n + v ** n + w ** n
    Ss = np.maximum(S, 1e-300)
    F = Ss ** (1 / n) - 1
    g = Ss ** (1 / n - 1)
    gx, gy, gz = g * u ** (n - 1) / a, g * v ** (n - 1) / b, g * w ** (n - 1) / c
    gl = np.sqrt(gx * gx + gy * gy + gz * gz)
    return np.where(S < 1e-12, -min(a, b, c), F / np.maximum(gl, 1e-9))


def sd_round_cone(p, a, b, r1, r2):
    a, b = np.asarray(a, float), np.asarray(b, float)
    ba = b - a
    l2 = float(ba @ ba)
    rr = r1 - r2
    a2 = l2 - rr * rr
    il2 = 1 / l2
    pa = p - a
    y = pa @ ba
    z = y - l2
    q = pa * l2 - np.outer(y, ba)
    x2 = (q * q).sum(-1)
    y2 = y * y * l2
    z2 = z * z * l2
    k = np.sign(rr) * rr * rr * x2
    d3 = (np.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1
    d1 = np.sqrt(x2 + z2) * il2 - r2
    d2 = np.sqrt(x2 + y2) * il2 - r1
    return np.where(np.sign(z) * a2 * z2 > k, d1, np.where(np.sign(y) * a2 * y2 < k, d2, d3))


def uround(a, b, r):
    m = np.minimum(a, b)
    A, B = np.maximum(r - a, 0), np.maximum(r - b, 0)
    return np.maximum(r, m) - np.sqrt(A * A + B * B)


def smin(a, b, k):
    h = np.maximum(k - np.abs(a - b), 0) / k
    return np.minimum(a, b) - h * h * k * 0.25


def bounded(p, c, r, margin, f):
    bd = np.sqrt(((p - np.asarray(c)) ** 2).sum(-1)) - r
    out = bd.copy()
    near = bd <= margin
    if near.any():
        out[near] = f(p[near])
    return out


# ---------------------------------------------------------------- rotations (row-major, as sdf.mjs)
def Rz(a): c, s = math.cos(a), math.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1.0]])
def Rx(a): c, s = math.cos(a), math.sin(a); return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
def Ry(a): c, s = math.cos(a), math.sin(a); return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def to_local(c, R, p): return (p - np.asarray(c)) @ R          # R^T (p - c), for row vectors
def from_local(c, R, q): return q @ R.T + np.asarray(c)


def find_front(f, y, z, x0=0.0, x1=2.5):
    """The point of an implicit surface along +x at (y, z): bisection from inside to outside (head.mjs findFront), vectorised over y, z."""
    y, z = np.broadcast_arrays(np.asarray(y, float), np.asarray(z, float))
    a, b = np.full(y.shape, x0, float), np.full(y.shape, x1, float)
    for _ in range(40):
        m = (a + b) / 2
        inside = f(np.stack([m, y, z], -1)) < 0
        a, b = np.where(inside, m, a), np.where(inside, b, m)
    return (a + b) / 2


# ---------------------------------------------------------------- the house file: bands, face parameters
def load_json(p):
    with open(p) as fh:
        return json.load(fh)


def band_value(band, t):
    return band["lo"] * (band["hi"] / band["lo"]) ** t if band["map"] == "geo" else band["lo"] + (band["hi"] - band["lo"]) * t


FP = dict(hs="form.head", WoverH="form.head-width", DoverH="form.head-depth", cheek="form.cheek", eW="form.eye-size", eyeDrop="form.eye-height",
          spacing="form.eye-spacing", pupil="form.pupil", lid="form.lid", ring="form.eye-ring", projection="form.muzzle", muzzleW="form.muzzle-width",
          muzzleH="form.muzzle-height", noseW="form.nose", noseDrop="form.nose-drop", mouthW="form.mouth-width", upturn="form.mouth-upturn",
          gap="form.mouth-gap", carriage="form.carriage")


def face_params(house, plan, t_of):
    """clamps.mjs faceParams, without the clamps (Loika's type specimen has none that bites: see report.json 'clamp_delta')."""
    fp = {}
    for k, g in FP.items():
        b = house["bands"][plan].get(g)
        if b:
            fp[k] = band_value(b, t_of(g))
    fp["noseAspect"] = house["rig"]["face"]["nose-aspect"]
    return fp


def seed_free_pose(house, plan, spec, carriage):
    """pose.mjs solvePose with the specimen's own picks (no hash needed): body yaw, face yaw, head yaw, roll, pitch."""
    rng = lambda i: next(r for r in house["rules"] if r["id"] == i)["plans"].get(plan) or next(r for r in house["rules"] if r["id"] == i)["plans"]["*"]
    (bl, bh), (fl, fh), (hl, hh), (rl, rh) = rng("R6-body-yaw"), rng("R6-face-yaw"), rng("R6-head-yaw"), rng("R6-roll")
    pick = spec["pose"]["pick"]
    mid = lambda lo, hi, v: lo + (hi - lo) * (1 / 6 + (2 / 3) * v)
    body, face, roll = mid(bl, bh, pick["body-yaw"]), mid(fl, fh, pick["face-yaw"]), mid(rl, rh, pick["roll"])
    head = body - face
    assert hl <= head <= hh, "head yaw out of band: the seed-free pose needs the hash (not ported)"
    side = spec["pose"]["side"]
    return dict(yawBody=body, yawFace=face, yawHead=head, roll=roll, pitch=carriage, side=side, cameraYaw=-side * body, headYawSigned=side * head, rollSigned=side * roll)


class House:
    """One specimen (default S01, Loika), expressed: the head, the body, the legs and paws, as fields. Built once; fields are pure functions of points."""

    def __init__(self, spec_id="S01", house_file=HOUSE_FILE, spec_file=SPEC_FILE):
        self.house = house = load_json(house_file)
        spec = load_json(spec_file)[spec_id]
        self.spec = spec
        fr = spec["frame"]
        self.plan, self.kinds = fr["plan"], fr["kinds"]
        assert self.plan == "A"
        self.look = spec["look"]
        tof = lambda g: fr["t"].get(g, 0.5)
        self.fp = fp = face_params(house, self.plan, tof)
        self.rf = rf = house["rig"]["face"]
        self.rig = rig = house["rig"]["A"]
        self.light = house["light"]
        self.solver = house["solver"]
        self.pose = seed_free_pose(house, self.plan, spec, fp["carriage"])
        self._head()
        self._body()

    # ---- head (head.mjs buildHead), in the head's own frame ---------------------------------------------------------------------
    def _head(self):
        fp, rf, rig = self.fp, self.rf, self.rig
        W, D = fp["WoverH"], fp["DoverH"]
        cheek = fp.get("cheek", 0)
        kk = self.house["kinds"]["head"][self.kinds["head"]]
        K = dict(a=D / 2, b=W / 2, c=0.5, n=kk["exponent"])
        setBack, topTaper, chinTaper = kk.get("crown-set-back", 0), kk.get("top-taper", 0), kk.get("chin-taper", 0)
        cw, zEye0, ce, cs = rf["cheek-widen"], 0.5 - fp["eyeDrop"], rig.get("cheek-eye", rf["cheek-eye"]), rf["cheek-eye-sigma"]
        cfw = rig.get("cheek-forward", rf.get("cheek-forward", 0))
        latAt = lambda z: 1 + cw * cheek * (-z) + ce * np.exp(-(((z - zEye0) / cs) ** 2))

        def dK(p):
            x, y, z = p[..., 0], p[..., 1], p[..., 2]
            tz = 1 - topTaper * (z / K["c"])
            tyz = tz * (1 - chinTaper * sstep(-0.05, -0.5, z))
            xe = (x + setBack * z) / tz
            q = np.stack([xe, y / (tyz * latAt(z) * (1 + cfw * sstep(-0.3 * K["a"], 0.9 * K["a"], xe))), z], -1)
            return 0.92 * sd_super(q, K["a"], K["b"], K["c"], K["n"])

        E = fp["eW"] * W
        Riris = E / 2
        ringW = fp["ring"] * E
        Reye = Riris + ringW
        zEye = 0.5 - fp["eyeDrop"]
        yE = fp["spacing"] * E / 2
        noseHalfH = 0.5 * fp["noseAspect"] * fp["noseW"] * W
        noseCz = zEye - fp["noseDrop"] * E
        mouthZ = noseCz - noseHalfH - fp["gap"]
        cap = rf["muzzle-projection-cap"]
        proj = cap * math.tanh(fp["projection"] / cap)
        ry = fp["muzzleW"] * W / 2 * (1 + rf["muzzle-widen"] * ((fp["projection"] - proj) / cap))
        rz = fp["muzzleH"] / 2
        rx = 0.12 + 0.5 * proj
        zc = noseCz - rf["muzzle-centre-drop"] - 0.12 * fp["muzzleH"]
        xs = float(find_front(dK, 0, zc))
        M = dict(c=np.array([xs + proj - rx, 0, zc]), r=(rx, ry, rz))
        self.dK = dK
        self.dM = lambda p: sd_ellipsoid(p - M["c"], M["r"])
        rM = rf["muzzle-union"]
        assert not rf["jaw-rz"], "the jaw mass is off in the house (jaw-rz 0): the chin is the muzzle's own round"
        self.rM = rM
        self.d0 = lambda p: uround(dK(p), self.dM(p), rM)
        self.K, self.M, self.W, self.D = K, M, W, D
        self.g = dict(E=E, zEye=zEye, noseCz=noseCz, mouthZ=mouthZ, noseHalfH=noseHalfH, ringW=ringW, Reye=Reye, Riris=Riris, yE=yE, lidOver=fp["lid"] * E)
        # the nose: the forward axis tilted up, frame (n, lat, up)
        xsN = float(find_front(self.d0, 0, noseCz))
        tilt = math.radians(rf["nose-tilt-deg"])
        nN = np.array([math.cos(tilt), 0, math.sin(tilt)])
        nf = self.surface_frame(np.array([xsN, 0, noseCz]), nN)
        nry = fp["noseW"] * W / 2
        nrz, nrx = nry * fp["noseAspect"], nry * 0.85
        rel = rf["nose-relief"]
        self.nose = dict(c=np.array([xsN, 0, noseCz]) + nN * (rel - 1) * nrx, surf=np.array([xsN, 0, noseCz]), frame=nf, r=(nrx, nry, nrz))
        # the eyes: frames on K's analytic surface
        self.eyes = []
        for side in (1, -1):
            y = side * yE
            x = float(find_front(dK, y, zEye))
            c = np.array([x, y, zEye])
            n = self.grad(dK, c[None], 1e-3)[0]
            fr = self.surface_frame(c, n)
            self.eyes.append(dict(side=side, **fr, E=E, Riris=Riris, Reye=Reye, ringW=ringW, pupilR=fp["pupil"] * Riris, Rsock=Reye * (1 + rf["socket-margin"])))
        # the mouth: y -> z with the upturn and the curl
        mw = fp["mouthW"] * E
        cf, curl = rf["mouth-curl-from"], rf["mouth-curl"]

        def mouth_z_at(y):
            ss = np.minimum(1, np.abs(y) / (mw / 2))
            return mouthZ + fp["upturn"] * (mw / 2) * ss * ss + curl * (mw / 2) * np.maximum(0, ss - cf) ** 2 / (2 * (1 - cf))
        self.mouth = dict(w=mw, z=mouthZ, zAt=mouth_z_at, tube=rf["mouth-tube"], upturn=fp["upturn"])

    @staticmethod
    def surface_frame(c, n):
        n = np.asarray(n, float)
        n = n / np.linalg.norm(n)
        z = np.array([0, 0, 1.0])
        up = z - (z @ n) * n
        up /= np.linalg.norm(up)
        lat = np.cross(up, n)
        return dict(c=np.asarray(c, float), n=n, up=up, lat=lat)

    @staticmethod
    def grad(f, p, h=1e-3):
        """The tetrahedron-technique normal (sdf.mjs gradient), vectorised."""
        a = f(p + h * np.array([1, -1, -1])); b = f(p + h * np.array([-1, -1, 1])); c = f(p + h * np.array([-1, 1, -1])); e = f(p + h * np.array([1, 1, 1]))
        g = np.stack([a - b - c + e, -a - b + c + e, -a + b - c + e], -1)
        return g / np.maximum(np.linalg.norm(g, axis=-1, keepdims=True), 1e-300)

    # ---- body (scene.mjs plan A) -----------------------------------------------------------------------------------------------
    def _body(self):
        rig, rf = self.rig, self.rf
        S = 1 / self.fp["hs"]
        self.S = S
        self.kc = np.array([0, 0, S - 0.5])
        pose = self.pose
        Rh = Rz(math.radians(pose["headYawSigned"])) @ Ry(-math.radians(pose["pitch"])) @ Rx(math.radians(pose["rollSigned"]))
        self.Rh = Rh                                       # the stand pose's head rotation (the head bone's pose), about kc
        k = S
        V = lambda a: np.array(a, float) * k
        tc, tp = rig["chest"], rig["pelvis"]
        zJaw = -0.5 + rig["chin-height"]
        zw = self.kc[2] + zJaw
        Rfa = Ry(-math.radians(pose["pitch"]))
        d0_world = lambda p: self.d0(to_local(self.kc, Rfa, p))
        hfx = float(find_front(d0_world, 0, zw, self.kc[0])) - self.kc[0]
        zcl = float(np.clip(zw, tc["c"][1] * k - tc["r"][2] * k * 0.9, tc["c"][1] * k + tc["r"][2] * k * 0.9))
        chestFront0 = tc["c"][0] * k + tc["r"][0] * k * math.sqrt(max(0, 1 - ((zcl - tc["c"][1] * k) / (tc["r"][2] * k)) ** 2))
        sx = hfx + self.kc[0] - rig["chin-overhang"] - chestFront0
        self.sx = sx
        cc, cr = np.array([tc["c"][0] * k + sx, 0, tc["c"][1] * k]), V(tc["r"])
        pc, pr = np.array([tp["c"][0] * k + sx, 0, tp["c"][1] * k]), V(tp["r"])
        self.chest, self.pelvis = dict(c=cc, r=cr), dict(c=pc, r=pr)
        self.zBack = max(cc[2] + cr[2], pc[2] + pr[2])
        self.dC = lambda p: sd_ellipsoid(p - cc, cr)
        self.dP = lambda p: sd_ellipsoid(p - pc, pr)
        uB = rig["union-body"] * k
        self.uB = uB
        self.dTorso = lambda p: uround(self.dC(p), self.dP(p), rig["union-torso"] * k)
        pawR = V(rig["paw"])
        self.pawR = pawR
        nToe, turn, tr = rig["toe-count"], math.radians(rig["paw-turn"]), V(rig["toe-radii"])
        self.legs = []
        for fore, L in ((True, rig["fore"]), (False, rig["hind"])):
            for sd in (1, -1):
                cx, y = L["x"] * k + sx, sd * L["y"] * k
                lead = rig["lead-paw"] * k if (fore and sd == 1) else 0
                px = cx + lead + L["paw-dx"] * k
                zTop = L["top"] * k
                mass = V(L["mass"])
                top = np.array([cx, y, zTop])
                ank = np.array([px, y, pawR[2] * 1.7])
                el = L["elbow"]
                elc, elr = np.array([cx + el[0] * k, y, zTop + el[1] * k]), V(el[2:5])
                fwd = np.array([math.cos(turn * sd), math.sin(turn * sd)])
                lat = np.array([-fwd[1], fwd[0]])
                pc0 = np.array([px + 0.05 * k * fwd[0], y + 0.05 * k * fwd[1]])
                Rp = Rz(turn * sd)
                pawc = np.array([pc0[0], pc0[1], pawR[2]])
                toes = []
                for i in range(nToe):
                    a = (i - (nToe - 1) / 2) * rig["toe-fan"]
                    reach = pawR[0] * rig["toe-reach"] * math.cos(a * 0.6)
                    side = pawR[1] * 0.78 * math.sin(a * 1.1) * 1.25
                    big = 1.12 if i == (nToe - 1) / 2 else 1
                    toes.append(dict(c=[pc0[0] + fwd[0] * reach + lat[0] * side, pc0[1] + fwd[1] * reach + lat[1] * side, tr[2] * 1.05 + 0.02 * k], r=[tr[0] * big, tr[1] * big, tr[2] * big], R=Rz((turn + a * 0.5) * sd)))
                leg = dict(fore=fore, side=sd, cx=cx, y=y, top=top, ank=ank, mass=mass, mass_c=np.array([cx, y * 1.02, zTop]), el_c=elc, el_r=elr,
                           r=(L["r"][0] * k, L["r"][1] * k), paw_c=pawc, paw_R=Rp, toes=toes, name=("fore" if fore else "hind") + (".L" if sd == 1 else ".R"))
                leg["d_paw"] = (lambda lg: lambda p: sd_ellipsoid(to_local(lg["paw_c"], lg["paw_R"], p), pawR))(leg)
                leg["d_column"] = (lambda lg: lambda p: uround(uround(sd_round_cone(p, lg["top"], lg["ank"], lg["r"][0], lg["r"][1]), sd_ellipsoid(p - lg["mass_c"], lg["mass"]), 0.06 * k),
                                                              sd_ellipsoid(p - lg["el_c"], lg["el_r"]), 0.05 * k))(leg)   # the leg without its paw
                leg["d_toes"] = (lambda lg: lambda p: np.min([sd_ellipsoid(to_local(t["c"], t["R"], p), t["r"]) for t in lg["toes"]], axis=0))(leg)
                leg["d_noToes"] = (lambda lg: lambda p: uround(lg["d_column"](p), lg["d_paw"](p), 0.08 * k))(leg)
                leg["d"] = (lambda lg: lambda p: bounded(p, [lg["cx"], lg["y"], 0.3 * k], 0.5 * k, 0.1 * k, lambda q: smin(lg["d_noToes"](q), lg["d_toes"](q), 0.012 * k)))(leg)
                self.legs.append(leg)
        self.dBody = lambda p: self._fold_legs(self.dTorso(p), p)
        # the crest: leaves rooted on K's crown
        cr0 = rig["crest"]
        self.leaves = []
        for yoff, ln, wid, rollDeg, lean, twistDeg in cr0["leaves"]:
            a, ph = math.radians(rollDeg), math.radians(twistDeg)
            d = np.array([lean, math.sin(a), math.cos(a)])
            dl = d / np.linalg.norm(d)
            across0 = np.array([0, math.cos(a), -math.sin(a)])
            an0 = np.cross(across0, dl)
            an0 /= np.linalg.norm(an0)
            across = across0 * math.cos(ph) + an0 * math.sin(ph)
            an = an0 * math.cos(ph) - across0 * math.sin(ph)
            base = np.array([cr0["root"][0], cr0["root"][1] + yoff * 0.25, cr0["root"][2]])
            self.leaves.append(dict(base=base, len=ln, wid=wid, thick=cr0["thick"], ax=dl, aw=across, an=an, c=base + dl * ln / 2))

    def _fold_legs(self, d, p):
        for lg in self.legs:
            d = uround(d, lg["d"](p), self.uB)
        return d

    def leg_weight(self, p):
        """scene.mjs legWeight: how much a point belongs to a leg rather than the torso."""
        dl = np.min([lg["d"](p) for lg in self.legs], axis=0)
        le = self.rig["leg-cream-edge"]
        w = sstep(le[0] * self.S, le[1] * self.S, self.dTorso(p) - dl)
        return np.where(p[..., 2] > 0.75 * self.S, 0.0, w)

    def d_core_far(self, p):
        """parts.core where the head's carved field is just its bound sphere (the head far away): the union of that and the body."""
        hb = np.sqrt(((p - self.kc) ** 2).sum(-1)) - (0.5 * max(self.W, self.D) + 0.7)
        return uround(hb, self.dBody(p), self.rig["union-neck"]), hb

    # ---- helpers for the build -------------------------------------------------------------------------------------------------
    def head_to_world(self, q):
        """Head-frame points to world in the REST pose (no head rotation): the head's origin is kc."""
        return np.asarray(q, float) + self.kc

    def fp_unclamped_delta(self, clamped):
        return {k: (clamped[k] - self.fp[k]) for k in self.fp if k in clamped and abs(clamped[k] - self.fp[k]) > 0}
