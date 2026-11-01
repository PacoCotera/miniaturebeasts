"""Skin (body-spec s4): zones as soft masks computed per vertex from (part, s, around), the head's local frame and the bead tag; palettes; the velvet material numbers; the face decals (eyes with open / half / closed frames and the `content` mouth) as thin meshes laid on the fitted surface by ray casting.
Colour in sRGB 0-255 in data, linear in the material."""
import math
import numpy as np
from housefield import to_local

CREAM_AD = (223, 196, 157)           # ruling 3: the master's cream
PALETTES = {
    "charcoal": dict(coat=(62, 56, 61), nose=(58, 53, 58), cream=CREAM_AD, toe=(238, 226, 214), leaf=(104, 122, 46), leafRib=(168, 178, 92)),
    "russet": dict(coat=(122, 62, 38), nose=(70, 36, 26), cream=(226, 200, 160), toe=(240, 228, 214), leaf=(96, 124, 52), leafRib=(170, 182, 96)),
    "ash": dict(coat=(104, 106, 112), nose=(60, 60, 66), cream=(222, 210, 192), toe=(238, 232, 222), leaf=(110, 128, 60), leafRib=(176, 184, 100)),
}
EYE = dict(ring=(240, 228, 214), irisTop=(60, 26, 6), iris=(206, 104, 20), irisLow=(246, 152, 30), pupil=(14, 10, 10), catch=(255, 255, 255), ink=(22, 17, 20))
VELVET = dict(roughness=0.66, sheen=0.30, grain=0.42, fuzz=0.50)


def srgb_to_lin(c):
    c = np.asarray(c, float) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def smooth(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def zone_masks(ctx, V, attr):
    """Soft masks per vertex: bib (cream), toes (cream beads), leaf, nose. Pure functions of the attributes and the head frame."""
    H = ctx["H"]
    parts = ctx["body_parts"]
    pid = np.rint(attr[:, 0]).astype(int)
    s, a, tag = attr[:, 1], attr[:, 2], attr[:, 3]
    loc = to_local(H.kc, ctx["info"]["head"]["Rfa"], V)
    x, y, z = V[:, 0], V[:, 1], V[:, 2]
    bib = np.zeros(len(V))
    t = pid == parts["torso"]
    # the chest and the belly: the belly side of the torso, from the brisket back to the waist, soft on the flank and at the back end
    bib_t = smooth(0.62, 0.80, a) * smooth(-1.05, -0.60, x) + smooth(0.30, 0.55, a) * smooth(-0.35, -0.05, x) + smooth(-0.05, 0.08, x)
    bib[t] = np.clip(bib_t[t], 0, 1)
    h = pid == parts["head"]
    mouth_z = H.mouth["z"]
    bib_h = smooth(0.0, 0.06, -(loc[:, 2] - (mouth_z + 0.02))) * smooth(0.05, 0.25, loc[:, 0])      # under the mouth line, on the front
    bib[h] = np.clip(bib_h[h], 0, 1)
    for k in ("fore.L", "hind.L"):
        m = pid == parts[k]
        # the legs: the inner/front of the upper leg picks up a little cream where the chest's cream runs onto it
        bib[m] = np.clip(smooth(0.10, 0.35, 1.0 - np.abs(x[m] - (-0.22 if k == "fore.L" else -1.15)) / 0.5) * smooth(0.45, 0.2, y[m] * 0 + (z[m] / 0.7 - 0.0)) * 0.0, 0, 1)
    toe = np.where(tag > 0.01, np.clip(tag, 0, 1), 0.0)
    leaf = (pid == parts["crown"]).astype(float) if "crown" in parts else np.zeros(len(V))
    mz = pid == parts["muzzle"]
    bib_m = smooth(0.0, 0.07, -(loc[:, 2] - (H.M["c"][2] - 0.06)))           # the lobe's lower half is the cream under the smile
    bib[mz] = np.clip(bib_m[mz], 0, 1)
    nose = (pid == parts["nose"]).astype(float)
    return dict(bib=bib, toe=toe, leaf=leaf, nose=nose)


# pigment tune: the rendered colour is pigment x light; these gains make the lit cream read 223/196/157 and the lit coat read as the master's (measure_skin.py, same masks on both)
CREAM_GAIN = np.array([2.40, 2.14, 1.79])
COAT_GAIN = 0.5


def vertex_colors(ctx, V, attr, palette="charcoal"):
    P = PALETTES[palette]
    M = zone_masks(ctx, V, attr)
    coat, cream, toe, leaf, nose, rib = (srgb_to_lin(P[k]) for k in ("coat", "cream", "toe", "leaf", "nose", "leafRib"))
    coat = coat * COAT_GAIN; cream = cream * CREAM_GAIN
    col = np.tile(coat, (len(V), 1))
    col = col * (1 - M["nose"][:, None]) + nose * M["nose"][:, None]
    col = col * (1 - M["bib"][:, None]) + cream * M["bib"][:, None]
    col = col * (1 - M["toe"][:, None]) + toe * M["toe"][:, None]
    rr = np.clip(1 - np.abs(attr[:, 2] - 0.5) * 3, 0, 1) * 0.35                     # a lighter rib along the blade's middle
    lc = leaf * (1 - rr[:, None]) + rib * rr[:, None]
    col = col * (1 - M["leaf"][:, None]) + lc * M["leaf"][:, None]
    return col


def eye_disc(frame, Riris, Reye, nr=44, nth=56):
    """A polar disc in the eye plane: returns (pts2 (n,2) in H, colours sRGB (n,3), faces). frame: open / half / closed. v is up."""
    rs = np.concatenate([np.linspace(0, 0.96 * Riris, 26), np.linspace(0.96 * Riris, Reye, 18)[1:]])
    th = np.linspace(0, 2 * math.pi, nth, endpoint=False)
    pts, cols = [], []
    ink = np.array(EYE["ink"], float)
    for r in rs:
        for t in th:
            u, v = r * math.cos(t), r * math.sin(t)
            pts.append((u, v))
            fr = r / Riris
            if fr > 1.0:
                c = np.array(EYE["ring"], float)
            else:
                vv = v / Riris
                # orange over the whole height, a soft shade at the top only
                top = smooth(0.62, 1.0, vv)
                c = np.array(EYE["irisLow"], float) * (1 - 0.35 * smooth(0.0, 1.0, -vv + 0.2) * 0) 
                c = np.array(EYE["iris"], float) * (1 - smooth(-1.0, 0.1, vv)) + np.array(EYE["irisLow"], float) * smooth(-1.0, 0.1, vv)
                c = c * (1 - top) + np.array(EYE["irisTop"], float) * top
                if fr < 0.40:
                    c = np.array(EYE["pupil"], float)
                # catch light: upper left
                d = math.hypot(u - (-0.38 * Riris), v - (0.42 * Riris))
                cl = 1 - smooth(0.17 * Riris, 0.23 * Riris, d)
                c = c * (1 - cl) + np.array(EYE["catch"], float) * cl
                # a soft edge from the iris to the ring
                e = smooth(0.90, 1.0, fr)
                c = c * (1 - e) + np.array(EYE["ring"], float) * e * 0.55 + c * e * 0.45
            if frame == "half" and v > -0.1 * Riris:
                c = np.array([0, 0, 0], float) - 1                      # -1 = take the coat's colour (the lid)
            if frame == "closed":
                c = np.array([0, 0, 0], float) - 1
            cols.append(c)
    faces = []
    nt = len(th)
    for i in range(len(rs) - 1):
        for j in range(nt):
            faces.append((i * nt + j, i * nt + (j + 1) % nt, (i + 1) * nt + (j + 1) % nt, (i + 1) * nt + j))
    return np.array(pts), np.array(cols), faces
