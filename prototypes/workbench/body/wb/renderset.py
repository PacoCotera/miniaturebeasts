"""Chunk 11: the render set, drawn. Under the bpy venv: python -m wb.renderset SPECIES.json OUTDIR [--only output,output] [--styles clay,silhouette] [--genome G]
Reads the set from the file (wb/renders.py), draws every `ready` variant at its game size and writes PNGs, the layered stand's files and one manifest.json. Styles:
  plush       the house velvet look, Cycles (plush.py: the look-dev settings), on the stand pose; small sprites rendered at 3x or 4x and box-filtered down
  clay        the workbench matcap (proxy.py), alpha around the figure, the clay's face on
  silhouette  one flat fill, alpha only, on the same stand pose as the plush
`from: master` sprites are not rendered: they are made from the stand's 304x312 art by wb/stand.py (the game's build scale; the face never scales).
The layered stand: the base (every expression of the file off), one layer per look the file's expressions declare (the pixels the look adds or takes off), and a 304x48 contact shadow (the floor shadow alone)."""
import argparse
import json
import os
import sys
import time

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)

import numpy as np

from wb import renders as RS, stand as ST, pngio, facade as F

EL = 10.0
# the cameras: (canvas w, h) -> (px per H, centre). The house cameras of proxy.py for 304x312, 96 and 48; the others keep the house framing (the figure's feet the same share of the canvas up from the bottom)
CAMERAS = {
    (304, 312): (95.0, (-0.35, 0.0, 1.3)),
    (608, 624): (210.0, (-0.35, 0.0, 1.255)),                      # play's stage picture: twice the 304 canvas, the mibi filling about 85 % of its height (the 304 one fills 77 %) with its feet 3 % up from the bottom
    (96, 88): (30.0, (-0.35, 0.0, 1.3)),
    (96, 96): (30.0, (-0.35, 0.0, 1.3 + 4 / (30.0 * 0.985))),
    (48, 48): (15.0, (-0.35, 0.0, 1.25)),
    (128, 160): (38.0, (-0.35, 0.0, 1.3 + 36 / (38.0 * 0.985))),
}
SIL = (0.10, 0.10, 0.12)
SUPER = 4                                                        # every `from: render` size under the 304 stand is drawn at 4x and reduced
FILTER = "box, premultiplied"                                    # the house reduction, named in the manifest


def supersample(size):
    return 1 if size[0] >= 304 else SUPER
# where the figure stands in each canvas (art director, 4 Nov; the signed masters S01 to S16 stand so): the ink's centre column and the feet line's row. The 304 stand is centred on x 152 with its feet on row 304 (303 to 306);
# the card and the thumb are centred with the feet 3 px off the bottom (2 to 4).
TRAIT = dict(left=0.0, up=0.0)         # the close-up's content, nudged left and up (px of the picture) so the lamp, not the layer's box, is at the centre
TARGETS = {(304, 312): (152.0, 304), (96, 96): (48.0, 92), (48, 48): (24.0, 44)}
FRAMES = {}                                                      # (canvas, angle) -> the camera's centre that puts the figure on its target (solved from the silhouette)


def camera(size, az=32):
    if tuple(size) not in CAMERAS:
        raise KeyError(f"no camera for {size[0]}x{size[1]}")
    ppH, centre = CAMERAS[tuple(size)]
    return ppH, FRAMES.get((tuple(size), int(az)), FRAMES.get((tuple(size), 32), centre))


CREASE = (80.0, 125.0)                                           # luminance (0..255) over which the clay's shade turns from the matcap's own tint to a neutral cool grey
COOL = np.array([-2.0, 0.0, 4.0])                                # the cool lean of the neutral shade


def neutral_shade(px):
    """The clay's darkest band as a neutral to cool grey: the matcap's own shade leans maroon between the legs, and the scene has nothing red to bounce. Below CREASE the colour is replaced by a grey of the same luminance with a slight cool lean; above it the clay is untouched. Straight-alpha RGBA uint8 in and out."""
    out = px.copy()
    rgb = px[..., :3].astype(float)
    y = rgb @ np.array([0.299, 0.587, 0.114])
    t = np.clip((y - CREASE[0]) / (CREASE[1] - CREASE[0]), 0, 1)
    keep = (t * t * (3 - 2 * t))[..., None]                       # 0 in the shade, 1 in the lit clay
    grey = y[..., None] + COOL * np.clip(y / CREASE[1], 0, 1)[..., None]
    out[..., :3] = np.clip(np.round(rgb * keep + grey * (1 - keep)), 0, 255).astype(np.uint8)
    return out


def alpha_png(path):
    return pngio.read(path)


# ---------------------------------------------------------------- the species at its stand pose (Blender-free until the mesh is drawn)
class Subject:
    """One genome of the species: its cage body, the stand-posed mesh and the texture atlas (made on first use)."""
    def __init__(self, spec, genome, scratch):
        self.spec, self.genome, self.scratch = spec, genome, scratch
        self.r = F.build(spec, genome, "base")
        self.b, self.c = self.r.body, self.r.c
        self._M = self._paths = self._rest = self._base = self._R = None
        self._frames = {}

    def posed(self, clip=None, i=0):
        """The mesh in the stand pose, or in frame `i` of a clip (wb/clips.py: the file's walk, idle)."""
        if clip is None:
            if self._M is None:
                self._M = self._pose(None, 0)
            return self._M
        key = (clip, i)
        if key not in self._frames:
            self._frames[key] = self._pose(clip, i)
        return self._frames[key]

    def _pose(self, clip, i):
        import s20rig, s20tex as TX, s20p2 as P2
        if self._base is None:
            self._R = s20rig.Rig(self.b.ctx)
            self._base = TX.render_mesh(self.b)
        R = self._R
        if clip is None:
            return P2.posed(self._base, self.b, R, R.stand_pose())
        from wb import clips as CL
        pose, breath = CL.pose_at(R, self.spec, clip, i)
        M = self._base
        if breath:
            M = dict(M, Vw=np.asarray(M["Vw"], float) + breath * R.breath(np.asarray(M["Vw"], float), M["attr"], M["part"]))
        return P2.posed(M, self.b, R, pose)

    def tex(self):
        if self._paths is None:
            import s20pipe as PP, s20p2 as P2
            tex = PP.make_tex(self.b, self.c["coat"], frames=("open",))
            self._paths = P2.write_tex(tex, os.path.join(self.scratch, f"tex-{self.r.genome_hash[:10]}"))
        return self._paths

    def welded(self, M=None):
        """The posed level-2 mesh as the proxy renderer takes it: welded vertices, quads, the part of each vertex."""
        M = M or self.posed()
        Vw = np.zeros_like(M["Vw"])
        Vw[M["vid"]] = M["V"]
        return dict(V=Vw, F=np.asarray(M["Fw"], int), part=M["part"])


class QuadSubject:
    """One genome of a quadruped: its cage, the rig on the level-1 mesh and the mesh in a pose (clips from qrig). It has no coat yet, so only the Workbench styles draw it."""
    quad = True
    plan = "quadruped"

    def __init__(self, spec, genome, scratch):
        import quadruped as Q
        import qrig as QR
        self.spec, self.genome, self.scratch = spec, genome, scratch
        self.r = F.build(spec, genome, "base")
        self.b, self.c = self.r.body, self.r.c
        self.QR = QR
        self.rig, self.mesh = QR.rig_of(self.b, 1)
        self.frame = Q.frame(F.internal(spec))
        self._frames = {}

    def posed(self, clip=None, i=0):
        """The mesh at rest, or in frame i of one of the quadruped's clips (qrig.clip_pose)."""
        key = (clip, i)
        if key not in self._frames:
            pose = self.QR.Pose() if clip in (None, "calm", "anchor") else self.QR.clip_pose(self.rig, clip, i / self.QR.FRAMES[clip])
            V, _ = self.rig.skin(pose)
            self._frames[key] = dict(self.mesh, V=V, frame=self.frame)
        return self._frames[key]

    def welded(self, M=None):
        return M or self.posed()


def make_subject(spec, genome, scratch):
    from wb import clips as CL
    return (QuadSubject if CL.plan_of(spec) == "quadruped" else Subject)(spec, genome, scratch)


# ---------------------------------------------------------------- the Workbench styles (clay, silhouette)
class Proxy:
    def __init__(self, scratch, pr=None):
        """`pr`: a proxy renderer that is already warm (the proxy worker's own), used as it is."""
        from wb import proxy as P
        self.P = P
        self.pr = pr or P.ProxyRenderer()
        if pr is None:
            self.pr.warm(os.path.join(scratch, "warm.png"))
        import bpy
        self.bpy = bpy
        self.sil_mat = bpy.data.materials.new("sil")
        self.sil_mat.diffuse_color = (*SIL, 1.0)
        for i, (w, h) in enumerate(k for k in CAMERAS if k not in ((304, 312), (96, 88), (48, 48))):
            pass
        self.ids = {}
        for (w, h), (ppH, c) in CAMERAS.items():
            self.ids[(w, h)] = 100000 + w * 1000 + h                      # a private size id per canvas
            P.SIZES[self.ids[(w, h)]] = (w, h, ppH)
            self.ids[((w, h), SUPER)] = 200000 + w * 1000 + h              # and one at the supersample factor
            P.SIZES[self.ids[((w, h), SUPER)]] = (w * SUPER, h * SUPER, ppH * SUPER)
            P.FACE_CANVAS[self.ids[((w, h), SUPER)]] = w                   # the small-size rule judges the final width, not the supersampled one

    def _clay_mesh(self, subject, M=None):
        """The clay in the stand pose, as the plush and the silhouette are: the posed shipped mesh, with the face (flat eyes and mouth) placed on its rest surface and carried with the pose by the displacement of the nearest vertex."""
        from wb import clayface as CF
        M = M or subject.posed()
        if getattr(subject, "quad", False):
            doc = F.internal(subject.spec)
            if not CF.is_decal_file(doc):
                return M                                                   # a quadruped file with no eye station has no face on its clay
            if not hasattr(subject, "_decal"):
                subject._decal = CF.decal_faces(doc, dict(V=np.asarray(subject.mesh["V"], float), F=np.asarray(subject.mesh["F"], int)))
            R0 = np.asarray(subject.mesh["V"], float)
            D = np.asarray(M["V"], float) - R0
            m = dict(M)
            small = {}
            for cls, (fv, ff, fl, rgb) in subject._decal.items():            # every size class of the face is carried with the pose by the displacement of the nearest vertex
                nn = np.array([np.argmin(((R0 - p) ** 2).sum(1)) for p in fv])
                if cls == "full":
                    m["face_V"], m["face_F"], m["face_L"], m["face_rgb"] = fv + D[nn], ff, fl, rgb
                else:
                    small[cls] = dict(V=(fv + D[nn]).tolist(), F=[list(map(int, q)) for q in ff], L=np.asarray(fl).tolist(), rgb=[list(map(float, c)) for c in rgb])
            m["face_small"] = small
            return m
        rest = dict(V=np.asarray(M["Vw"], float), F=np.asarray(M["Fw"], int))
        cx = subject.b.ctx
        fv, ff = CF.face_mesh(cx["T"], cx["spec"], dict(subject.r.c.get("coat") or {}), rest)
        m = subject.welded(M)
        D = np.asarray(m["V"], float) - rest["V"]
        nn = np.array([np.argmin(((rest["V"] - p) ** 2).sum(1)) for p in fv])
        m["face_V"], m["face_F"] = fv + D[nn], ff
        return m

    def _render(self, mode, az, size, path, centre):
        sc = self.pr.sc
        saved = (sc.render.film_transparent, sc.render.image_settings.color_mode, self.P.CENTRE)
        sc.render.film_transparent, sc.render.image_settings.color_mode = True, "RGBA"
        self.P.CENTRE = np.array(centre, float)
        try:
            self.pr.render(mode, az, self.ids[tuple(size)], path)
        finally:
            sc.render.film_transparent, sc.render.image_settings.color_mode, self.P.CENTRE = saved
        return pngio.read(path)

    def clay(self, subject, az, size, path, clip=None, i=0):
        """The clay at az, in the stand pose or in frame i of a clip."""
        key = ("clay", subject.r.key) if clip is None else ("clay", subject.r.key, clip, i)
        if self.pr.mesh_key != key:
            self.pr.set_mesh(self._clay_mesh(subject, None if clip is None else subject.posed(clip, i)), key)
        return self._render("clay", az, size, path, camera(size, az)[1])

    def silhouette(self, subject, az, size, path, centre=None, ss=1):
        key = ("sil", subject.r.key)
        if self.pr.mesh_key != key:
            m = subject.welded()
            self.pr.set_mesh(m, key)
            self.pr.body.data.materials.clear()
            self.pr.body.data.materials.append(self.sil_mat)
        pr, sh = self.pr, self.pr.sc.display.shading
        sc = pr.sc
        saved = (sc.render.film_transparent, sc.render.image_settings.color_mode, self.P.CENTRE, sh.light, sh.color_type)
        sc.render.film_transparent, sc.render.image_settings.color_mode = True, "RGBA"
        self.P.CENTRE = np.array(camera(size, az)[1] if centre is None else centre, float)
        pr._camera(float(az), self.ids[tuple(size)] if ss == 1 else self.ids[(tuple(size), ss)])
        pr.wire.hide_render = True
        sh.light, sh.color_type = "FLAT", "MATERIAL"
        sc.render.filepath = path
        try:
            self.bpy.ops.render.render(write_still=True)
            self.P.strip_png_text(path)
        finally:
            sc.render.film_transparent, sc.render.image_settings.color_mode, self.P.CENTRE, sh.light, sh.color_type = saved
        a = pngio.read(path)
        if ss > 1:
            a = box_reduce(a, ss)
        a[..., :3] = [round(c * 255) for c in SIL]                      # one flat fill: only the alpha is the picture
        return a


def box_reduce(px, ss):
    """A picture drawn at ss times its size reduced by the box filter, premultiplied (the house filter for every `from: render` small size). Straight-alpha uint8 RGBA in and out."""
    h, w = px.shape[0] // ss, px.shape[1] // ss
    a = px.astype(np.float64)
    al = a[..., 3:4] / 255.0
    pre = np.concatenate([a[..., :3] * al, al], 2).reshape(h, ss, w, ss, 4).mean((1, 3))
    out_a = pre[..., 3:4]
    rgb = np.where(out_a > 1e-9, pre[..., :3] / np.maximum(out_a, 1e-9), 0)
    return np.concatenate([np.round(rgb), np.round(out_a * 255)], 2).clip(0, 255).astype(np.uint8)


def solve_frames(px, subject, scratch, sizes, azs=(32, 0, 90, 180), tol=0.75, tries=6):
    """Put the figure on its target in each canvas: the camera's centre moved in the picture's own right and up until the silhouette's ink is centred on the target column with its feet on the target row (within `tol` px).
    Every angle of the turnaround is framed alone (the feet's row moves with the angle at the house's 10 degrees of elevation), and the turn at az 32 is framed as the stand is, so the two are one picture."""
    for size, az in ((s_, a_) for s_ in sizes for a_ in (azs if s_ == (304, 312) else (32,))):
        if size not in TARGETS:
            continue
        w, h = size
        ppH, centre = CAMERAS[size]
        tx, feet = TARGETS[size]
        right, up, fwd, _ = px.P.basis(float(az), EL)
        centre = np.array(FRAMES.get((size, 32), centre), float)
        for _ in range(tries):
            img = px.silhouette(subject, az, size, os.path.join(scratch, "frame.png"), centre=centre)
            fig = ST.ink_box(img)
            dx, dy = tx - (fig[0] + fig[2] / 2.0), feet - (fig[1] + fig[3] - 1)
            if abs(dx) <= tol and abs(dy) <= tol:
                break
            centre = centre - right * dx / ppH + up * dy / ppH
        FRAMES[(size, int(az))] = tuple(float(c) for c in centre)


# ---------------------------------------------------------------- plush (Cycles)
def shadow_layer(px, ppH):
    """The contact shadow of a picture: the same short soft ellipse as the stand's shadow layer, at this picture's scale, under both feet (the Cycles floor shadow is long and runs off the frame). None for an empty picture."""
    fig = ST.ink_box(px)
    if fig is None:
        return None
    scale = ppH / CAMERAS[(304, 312)][0]
    feet = fig[1] + fig[3] - 1
    span = ST.feet_span(px, feet, depth=max(2, round(6 * scale)))
    return ST.contact_shadow((px.shape[1], px.shape[0]), (span[0] + span[1] + 1) / 2.0, feet, span[1] - span[0] + 1, scale=scale)


def floor_shadow(px, ppH):
    """The picture with its contact shadow laid under the figure."""
    sh = shadow_layer(px, ppH)
    return px if sh is None else ST.over(sh, px)


def plush(subject, az, size, path, floor="bounce", body_visible=True, samples=None, shadow=False):
    """floor: \"bounce\" (the default: a floor out of the camera's sight that lights the body from below, so every picture of the set has the same exposure and no shadow), True (the floor's shadow catcher) or False (no floor)."""
    import s20render as RN, plush as PL
    ppH, centre = camera(size, az)
    a, cam = RN.render_tex(subject.posed(), subject.tex(), subject.c["coat"], path, size[0], size[1], ppH, az=float(az), el=EL, centre=centre, samples=samples, floor=floor, body_visible=body_visible, light=PL.GAME_LIGHT, ss=supersample(size))
    px = np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)
    if shadow:
        px = floor_shadow(px, ppH)
    pngio.write(path, px)
    return px


def plush_clip(subject, clip, size, outdir, scratch, on_frame=None):
    """The plush frames of a clip, each on its own pose of the loop, with one contact shadow for all of them (laid from frame 0, where both feet are down: a shadow that jumped with every lifted foot would read as a flicker). Returns the straight-alpha frames
    and the milliseconds each took. `on_frame(i, n, ms)` is called after each."""
    from wb import clips as CL
    n = CL.frames(clip, getattr(subject, "plan", None))
    ppH = camera(size, 32)[0]
    frames, ms, sh = [], [], None
    for i in range(n):
        t = time.perf_counter()
        px = plush_frame(subject, clip, i, size, os.path.join(outdir, f"{clip}-{i}.png"))
        if sh is None:
            sh = shadow_layer(px, ppH)
        frames.append(px if sh is None else ST.over(sh, px))
        ms.append(round((time.perf_counter() - t) * 1000))
        if on_frame:
            on_frame(i, n, ms[-1])
    return frames, ms


def plush_frame(subject, clip, i, size, path, samples=None):
    import s20render as RN, plush as PL
    ppH, centre = camera(size, 32)
    a, cam = RN.render_tex(subject.posed(clip, i), subject.tex(), subject.c["coat"], path, size[0], size[1], ppH, az=32.0, el=EL, centre=centre, samples=samples, floor="bounce", body_visible=True, light=PL.GAME_LIGHT, ss=supersample(size))
    px = np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)
    pngio.write(path, px)
    return px


def clay_clip_frame(px, subject, clip, i, size, outdir):
    """Frame i of a clip in clay: (straight-alpha RGBA, milliseconds)."""
    t = time.perf_counter()
    img = neutral_shade(px.clay(subject, 32, size, os.path.join(outdir, f"clay-{clip}-{i}.png"), clip, i))
    return img, round((time.perf_counter() - t) * 1000)


def clay_clip(px, subject, clip, size, outdir):
    """The clay frames of a clip (the stand's camera, the clay's face on, the neutral shade): straight-alpha RGBA, and the milliseconds each took."""
    from wb import clips as CL
    frames, ms = [], []
    for i in range(CL.frames(clip, getattr(subject, "plan", None))):
        f, m = clay_clip_frame(px, subject, clip, i, size, outdir)
        frames.append(f)
        ms.append(m)
    return frames, ms


def strip_of(frames):
    """The clip's frames side by side (straight-alpha RGBA, one frame after another, left to right)."""
    return np.concatenate(frames, axis=1)


# ---------------------------------------------------------------- the trait picture: a close-up of the look
TRAIT_LAMP = 28.0                     # the lamp's width in the picture (24 to 32 px)
TRAIT_BOX = (96, 120)                 # the content lies inside this box, centred in the 128x160 canvas, and touches no edge


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


TRAIT_AZ = 90.0                       # the side camera: the tail's S-curve and the hook with the lamp at its end read whole
TRAIT_EL = 15.0
TRAIT_CUT = -0.60                     # the tail is cut here (world x, towards the back): nothing of the body is drawn
TRAIT_CAP = 0.20                      # the cut end closes in a round tip over this length, so the edge is crisp all round


TAIL_UV = (0.545, 0.77, 0.52, 0.655)   # the tail island's box in the atlas (u0, u1, v0, v1)


def clean_lamp_texture(paths):
    """The atlas copies the trait picture draws with: the dark collar rings between the tail and the lamp take the tail's own purple (one smooth edge from tail to lamp), the green flecks on the tube are filled with the tube's colour, and nothing glows but the lamp. The body's own atlas is untouched."""
    out = dict(paths)
    d = os.path.join(os.path.dirname(paths["col"]), "lamp")
    os.makedirs(d, exist_ok=True)
    col = pngio.read(paths["col"]).copy()
    emi = pngio.read(paths["emit"]).copy()
    H, W = col.shape[:2]
    r0, r1, c0, c1 = int(TAIL_UV[2] * H), int(TAIL_UV[3] * H), int(TAIL_UV[0] * W), int(TAIL_UV[1] * W)
    sub = col[r0:r1, c0:c1, :3].astype(float)
    solid = col[r0:r1, c0:c1, 3] > 0
    R_, G_, B_ = sub[..., 0], sub[..., 1], sub[..., 2]
    green = (G_ > R_ * 1.25) & (G_ > B_ * 1.25) & solid
    lamp_rows = np.where(green.sum(1) >= 40)[0]
    top = int(lamp_rows.min()) if len(lamp_rows) else sub.shape[0]
    lum = sub.mean(2)
    rows = np.arange(sub.shape[0])[:, None]
    good = (lum > 110) & (B_ > G_) & (rows < top)                     # the tube's own purple
    for x in range(sub.shape[1]):                                     # the collar: each column continues its last purple down to the lamp's edge
        if lum[top - 1, x] < 20:
            continue
        ys_ = np.where(good[:top, x])[0]
        if len(ys_):
            sub[ys_.max() + 1:top, x] = sub[ys_.max(), x]
    sm = np.zeros_like(sub); cnt = np.zeros(sub.shape[:2])
    mk = (lum > 60) & (rows < top)
    for dy in range(-3, 4):                                           # the flecks: a pixel far from its 7x7 neighbourhood takes the neighbourhood's colour
        for dx in range(-3, 4):
            m = np.roll(np.roll(mk, dy, 0), dx, 1)
            sm += np.roll(np.roll(sub * mk[..., None], dy, 0), dx, 1); cnt += m
    sm = sm / np.maximum(cnt, 1)[..., None]
    fl = mk & (cnt > 12) & (np.abs(sub - sm).max(2) > 10)
    for _ in range(3):
        sub[fl] = sm[fl]
    col[r0:r1, c0:c1, :3] = np.clip(np.round(sub), 0, 255).astype(np.uint8)
    e = emi[r0:r1, c0:c1]
    e[:top, :, :3] = 0                                              # nothing above the lamp glows
    emi[r0:r1, c0:c1] = e
    out["col"], out["emit"] = os.path.join(d, "col.png"), os.path.join(d, "emit.png")
    pngio.write(out["col"], col)
    pngio.write(out["emit"], emi)
    return out


def tail_only(M, cut=TRAIT_CUT, cap=TRAIT_CAP):
    """The posed mesh with the body left out: the faces of the tail behind `cut`, the end closed to a round tip (no open edge, no alpha ramp)."""
    V = np.asarray(M["V"], float)
    F = np.asarray(M["F"], int)
    keep = (V[F][:, :, 0].max(1) < cut) & np.isin(np.asarray(M["isl"]), ["tail", "tip"])
    V2 = V.copy()
    sel = V[:, 0] > cut - cap
    ring = sel & (V[:, 0] < cut) & (V[:, 2] < 1.3)
    cen = V[ring].mean(0)
    t = np.clip((V[:, 0] - (cut - cap)) / cap * 1.25, 0, 1)
    f = np.sqrt(np.clip(1 - t * t, 0, 1))
    for ax in (1, 2):
        V2[sel, ax] = cen[ax] + (V[sel, ax] - cen[ax]) * f[sel]
    return dict(M, V=V2, F=F[keep])


def trait_picture(subject, r, layers, path):
    """The trait picture of a look: the tail curl and its lamp alone, the body left out of the render (a close-up of the look itself, rendered at its own size and scale, never cut from the stand and enlarged).
    The lamp is TRAIT_LAMP px across, near the centre, and everything lies inside TRAIT_BOX; the picture has a crisp edge all round (no fade of any kind)."""
    over = [l for l in layers if l["op"] == "over" and l["file"].endswith(f"-{r['look']}.png")]
    if not over:
        raise ValueError(f"the stand has no layer for the look '{r['look']}'")
    ys, xs = np.where(over[0]["pixels"][..., 3] > 0)
    bw, bh = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
    lamp_px = max(8.0, float(min(bw, bh)) - 10.0)                  # the layer's box less the soft edge it was widened by and the tip's curl
    ppH0, centre0 = camera((304, 312), 32)
    ppH = float(np.clip(ppH0 * TRAIT_LAMP / lamp_px * 0.82, 40.0, 160.0))
    import s20render as RN, plush as PL
    from wb import proxy as P
    right, up, fwd, _ = P.basis(TRAIT_AZ, TRAIT_EL)
    M = tail_only(subject.posed())
    V = np.asarray(M["V"], float)[np.unique(np.asarray(M["F"], int))]
    c = (V.min(0) + V.max(0)) / 2.0
    centre = c + (right * TRAIT["left"] + up * TRAIT["up"]) / ppH
    a, cam = RN.render_tex(M, clean_lamp_texture(subject.tex()), subject.c["coat"], path, r["size"][0], r["size"][1], ppH, az=TRAIT_AZ, el=TRAIT_EL, centre=tuple(centre), floor="bounce", light=PL.GAME_LIGHT, ss=supersample(r["size"]))
    px = np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)
    pngio.write(path, px)
    return px, ppH


# ---------------------------------------------------------------- the layered stand
def off_individual(spec, expr_list, keep=None):
    """The type with every look of `expr_list` off, except `keep` (an expression id) shown. The individual dict the facade's builder takes."""
    import expressions as EX
    g = spec["genome"]
    by = EX.by_locus(g)
    typ = F.resolve_genome("type", F.internal(spec))
    ind = typ
    for e in expr_list:
        ent = by[e["locus"]]
        pool = EX.pool_of(ent)
        if ent["op"] == "blend":
            raise ValueError(f"expression {e['id']}: a blend's look has no layer")
        want = e["look"] if e["id"] == keep else next((p for p in reversed(pool) if p != e["look"]), None)
        if ent["op"] == "switch":
            want = "on" if e["id"] == keep else "off"
        alt = F.resolve_genome(f"allele:{e['locus']}={want}", F.internal(spec))
        for k in ("t", "pairs", "switches"):
            for kk in alt[k]:
                if alt[k][kk] != typ[k][kk]:
                    ind = _set(ind, k, kk, alt[k][kk])
    return ind


def _set(ind, k, kk, v):
    import copy
    ind = copy.deepcopy(ind)
    ind[k][kk] = v
    return ind


def stand(spec, subject_type, outdir, scratch, species, age, pose, log):
    """The layered stand of one age and pose: files in outdir and the index entry. Returns (entry, base, layers, shadow, feet)."""
    exprs = [e for e in (spec.get("expressions") or [])]
    name = f"{species}-{age}-{pose}"
    base_ind = off_individual(spec, exprs)
    sb = Subject(spec, base_ind, scratch)
    t = time.time()
    base_path = os.path.join(outdir, f"{name}-304x312-base.png")
    base = plush(sb, 32, (304, 312), base_path)
    log(f"stand base {time.time() - t:.0f} s")
    fig = ST.ink_box(base)
    layers = []
    for e in exprs:
        so = Subject(spec, off_individual(spec, exprs, keep=e["id"]), scratch)
        on = plush(so, 32, (304, 312), os.path.join(scratch, f"on-{e['id']}.png"))
        ov, er = ST.layer_from_pair(base, on)
        for op, px in (("erase", er), ("over", ov)):                  # what the look takes off first, then what it lays on
            if px is None:
                continue
            fn = f"{name}-304x312-{e['id']}" + ("-erase" if op == "erase" else "") + ".png"
            pngio.write(os.path.join(outdir, fn), px)
            layers.append(dict(op=op, trait=e["locus"], looks=[e["look"]], order=10 + len(layers), file=fn, pixels=px))
        log(f"stand layer {e['id']}")
    feet = fig[1] + fig[3] - 1
    x0, x1 = ST.feet_span(base, feet)
    shadow = ST.contact_shadow((304, ST.SHADOW_H), (x0 + x1 + 1) / 2.0, ST.FEET_ROW, x1 - x0 + 1)          # the shadow layer: one soft ellipse under both feet, drawn (the floor's own cast shadow is long and hard to bound)
    shadow_fn = f"{species}-{age}-304x48-shadow.png"
    pngio.write(os.path.join(outdir, shadow_fn), shadow)
    entry = dict(traits=sorted({l["trait"] for l in layers}), pose=pose, figure=fig,
                 sizes={"304x312": dict(base=os.path.basename(base_path), bases={}, layers=[dict(op="under", order=0, file=shadow_fn, views=["home", "vivarium", "idle", "habitat", "sitting"], size=[304, ST.SHADOW_H], feetRow=ST.FEET_ROW, standFeet=feet)] +
                                                                                      [{k: v for k, v in l.items() if k != "pixels"} for l in layers])})
    return entry, base, layers, shadow, feet


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("species")
    ap.add_argument("out")
    ap.add_argument("--only", default="")
    ap.add_argument("--styles", default="", help="only these styles (plush, clay, silhouette)")
    ap.add_argument("--scratch", default="")
    a = ap.parse_args()
    spec = json.load(open(a.species))
    out = os.path.abspath(a.out)
    os.makedirs(out, exist_ok=True)
    scratch = os.path.abspath(a.scratch or os.path.join(out, "_scratch"))
    os.makedirs(scratch, exist_ok=True)
    only = set(x for x in a.only.split(",") if x)
    styles = set(x for x in a.styles.split(",") if x)
    sid = spec["id"]
    T0 = time.time()
    log = lambda m: print(f"[{time.time() - T0:6.1f}s] {m}", flush=True)
    rows = [r for r in RS.expand(spec) if r["state"] == "ready" and (not only or r["output"] in only) and (not styles or r["style"] in styles)]
    owed = [r for r in RS.expand(spec) if r["state"] == "owed"]
    res = []
    typ = make_subject(spec, "type", scratch)
    # Workbench styles first (Cycles resets the scene)
    px = Proxy(scratch)
    solve_frames(px, typ, scratch, sorted({tuple(r["size"]) for r in rows if r["size"]}))
    for r in rows:
        if r["style"] not in ("clay", "silhouette"):
            continue
        fn = os.path.join(out, f"{sid}-{r['output']}-{r['variant']}.png")
        t = time.time()
        if r["kind"] == "strip":
            fr, ms = clay_clip(px, typ, r["pose"], r["size"], scratch)
            pngio.write(fn, strip_of(fr))
            res.append(dict(r, file=os.path.basename(fn), frames=len(fr), frame_ms=ms, ms=round((time.time() - t) * 1000)))
            log(f"{r['output']} {r['variant']}")
            continue
        img = px.clay(typ, r["az"], r["size"], fn) if r["style"] == "clay" else px.silhouette(typ, r["az"], r["size"], fn, ss=supersample(r["size"]))
        if r["style"] == "clay":
            img = neutral_shade(img)
        pngio.write(fn, img)
        res.append(dict(r, file=os.path.basename(fn), ms=round((time.time() - t) * 1000)))
        log(f"{r['output']} {r['variant']}")
    # plush
    masters = {}
    index = None
    for r in rows:
        if r["style"] != "plush" or r["from"] == "master":
            continue
        t = time.time()
        if r["kind"] == "layers":
            if r["pose"] == "anchor":
                continue                                   # the stage's entry pose is the calm stand (below)
            entry, base, layers, shadow, feet = stand(spec, typ, out, scratch, sid, r["age"], r["pose"], log)
            masters[(r["age"], r["pose"])] = (entry, base, layers, shadow, feet)
            index = {sid: {r["age"]: entry}}
            res.append(dict(r, file=entry["sizes"]["304x312"]["base"], ms=round((time.time() - t) * 1000)))
            continue
        fn = os.path.join(out, f"{sid}-{r['output']}-{r['variant']}.png")
        if r["kind"] == "strip":
            fr, ms = plush_clip(typ, r["pose"], r["size"], scratch, scratch)
            pngio.write(fn, strip_of(fr))
            res.append(dict(r, file=os.path.basename(fn), frames=len(fr), frame_ms=ms, ms=round((time.time() - t) * 1000)))
            log(f"{r['output']} {r['variant']}")
            continue
        if r["output"] == "trait":
            if (r["age"], "calm") not in masters:                    # the picture is centred on the look's layer, so the stand is drawn first
                masters[(r["age"], "calm")] = stand(spec, typ, out, scratch, sid, r["age"], "calm", log)
            _, pph = trait_picture(typ, r, masters[(r["age"], "calm")][2], fn)
            res.append(dict(r, file=os.path.basename(fn), ppH=round(pph, 2), ms=round((time.time() - t) * 1000)))
        else:
            plush(typ, r["az"], r["size"], fn, shadow=True)
            res.append(dict(r, file=os.path.basename(fn), ms=round((time.time() - t) * 1000)))
        log(f"{r['output']} {r['variant']}")
    # the anchor is the calm stand
    for r in rows:
        if r["kind"] == "layers" and r["pose"] == "anchor" and (r["age"], "calm") in masters:
            res.append(dict(r, file=masters[(r["age"], "calm")][0]["sizes"]["304x312"]["base"], alias="calm", ms=0))
    # from the master
    for r in rows:
        if r["from"] != "master":
            continue
        if (r["age"], "calm") not in masters:                    # a picture made from the master needs the stand, even when the stand itself is not asked for
            masters[(r["age"], "calm")] = stand(spec, typ, out, scratch, sid, r["age"], "calm", log)
        entry, base, layers, shadow, feet = masters[(r["age"], "calm")]
        art = ST.compose(base, [(l["op"], l["pixels"]) for l in layers if l["op"] in ("over", "erase")])
        fig = ST.ink_box(art)
        view_shadow = r["output"] in ("resident", "habitat")                # the views that stand on the shadow layer: a figure with no shadow under it is a sticker
        pic, s = ST.from_master(art, fig, r["figure"], r["size"], shadow if view_shadow else None, feet)
        fn = os.path.join(out, f"{sid}-{r['output']}-{r['variant']}.png")
        pngio.write(fn, pic)
        res.append(dict(r, file=os.path.basename(fn), scale=round(s, 5), figure_box=fig, shadow=view_shadow, ms=0))
        log(f"{r['output']} {r['variant']} scale {s:.4f}")
    for row in res:
        row["ss"] = supersample(row["size"]) if row["from"] == "render" and row["size"] and row["style"] != "clay" else 1
    json.dump(dict(species=sid, built=time.strftime("%Y-%m-%d %H:%M"), set=RS.BASE, supersample=dict(factor=SUPER, filter=FILTER, below=304, note="every from-render size under 304 wide is drawn at this multiple and reduced by the filter"), stand_index=index, rows=res, owed=[{k: o[k] for k in ("output", "variant", "style", "age", "pose", "why")} for o in owed], not_yet=RS.not_yet(spec), seconds=round(time.time() - T0)),
              open(os.path.join(out, "manifest.json"), "w"), indent=1, default=str)
    log("done")


if __name__ == "__main__":
    main()
