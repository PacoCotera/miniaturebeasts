"""Hand-drawn limbs for the pawn from H (round 10). The service redraws the character when it is asked for a pose and barely moves a stride when it is asked at a low
strength, so the strides are made here: H's head, torso, pack and coat pixels are kept where they are (shifted as one block, never resampled), and the legs, boots and
arms are drawn pixel by pixel on the palette indices: a leg is a column of the trouser ramp walked from the hip to the ankle along a path with a knee, the boot (H's own
boot pixels, cut from the standing frame) is set at the end of that path so it is attached to the leg, and the shadow is drawn under it last. Arms are stretched or
compressed between the shoulder and the hand (nearest rows) so the hand stays on the sleeve. All of it works on the placed 48 x 48 cell (foot row 45, shadow rows 44 and 45).
Used by pawn-h-pass.py (front and back views: fb_pose; side views: side_pose)."""
import numpy as np
import quant
P = quant.P; C = P.index
SHADOW = C["night"]
BOOT = ["dfffd", "dkffd", "nnnnn"]; BOOT_C = {"d": "soil", "f": "bark", "k": "clay", "n": "ink"}
def shadow(cell, cx=24):
    yy, xx = np.mgrid[0:48, 0:48]; sh = ((xx - cx) / 10.0) ** 2 + ((yy - 44.5) / 1.6) ** 2 <= 1
    cell[sh & (cell < 0)] = SHADOW; return cell
def strip_legs(base, top, x0=14, x1=36):
    """base without the legs, boots and shadow (rows >= top, columns x0..x1 minus the arms' columns): what the figure stands on is drawn again"""
    out = base.copy(); out[top:, x0:x1] = -1; return out
def shift_block(src, dst, rows, dy, cols=None):
    """copy src rows (a range) into dst moved down by dy, only where src has pixels"""
    for y in rows:
        if 0 <= y + dy < 48:
            m = src[y] >= 0
            if cols is not None: m = m & cols
            dst[y + dy][m] = src[y][m]
def fb_pose(base, leg_top, left_x, right_x, boot_rows=(42, 44), body_dy=0, l_dy=0, r_dy=0, l_dx=0, r_dx=0, knee=0.0, arm_l=0, arm_r=0, top_dy=0, top_split=26, arms=(24, 35), win_l=(16, 22), win_r=(25, 33)):
    """front/back stride on the placed cell of the standing frame `base`.
    leg_top: the first leg row of the standing frame; left_x/right_x: the leftmost column of each leg (4 wide: three of the trouser's body, one of its shade);
    body_dy: the upper block (everything above the legs, and the arms) moves down by it (a contact pose drops the body, a creep drops it three rows);
    l_dy/r_dy: the boot's lift (negative = off the ground), l_dx/r_dx: the boot's step outward (left foot to the left, right to the right as dx grows);
    knee: how far the knee goes out beyond the straight line to the boot; arm_l/arm_r: the hand's step down (+) or up (-) on that side"""
    H, W = base.shape; yy, xx = np.mgrid[0:H, 0:W]
    b0, b1 = boot_rows
    out = np.full_like(base, -1)
    sides = (xx < left_x - 1) | (xx > right_x + 4)                      # the arm columns (the figure outside the legs' columns)
    # upper block: everything above leg_top inside the legs' columns, plus the arms on both sides (stretched below)
    inner = ~sides
    for y in sorted(range(0, leg_top), key=lambda r: -r):          # the lower rows are drawn last, so the lean's one lost row is the upper block's
        m = (base[y] >= 0) & inner[y]; yd = y + body_dy + (top_dy if y < top_split else 0)
        if 0 <= yd < H: out[yd][m] = base[y][m]
    a0, a1 = arms
    for cols, dh in ((xx[0] < left_x - 1, arm_l), (xx[0] > right_x + 4, arm_r)):
        # the arm from the shoulder row a0 to the hand's last row (a1 + hand step): nearest rows of the standing arm
        src_h = (a1 - a0 + 1); dst_h = src_h + dh
        for y in range(0, a0):
            m = (base[y] >= 0) & cols
            if 0 <= y + body_dy < H: out[y + body_dy][m] = base[y][m]
        for k in range(dst_h):
            sy = a0 + min(src_h - 1, int(round(k * (src_h - 1) / max(1, dst_h - 1)))) if dst_h > 1 else a0
            m = (base[sy] >= 0) & cols; yd = a0 + k + body_dy
            if 0 <= yd < H: out[yd][m] = base[sy][m]
    # the legs: the body's column pattern (read from the standing frame at the legs' middle) walked from the hip to the ankle along a path with a knee
    mid = (leg_top + b0) // 2
    patL = [base[mid, left_x + i] for i in range(4)]; patR = [base[mid, right_x + i] for i in range(4)]
    for (x0, pat, dy, dx, sgn) in ((left_x, patL, l_dy, l_dx, -1), (right_x, patR, r_dy, r_dx, 1)):
        hip = leg_top + body_dy; ankle = b0 + dy                          # the boot's first row
        n = max(1, ankle - hip)
        for y in range(hip, ankle):
            t = (y - hip + 1) / n; ox = int(round(sgn * (knee * np.sin(np.pi * t) + dx * t)))
            for i in range(4):
                if pat[i] >= 0 and 0 <= x0 + ox + i < W: out[y, x0 + ox + i] = pat[i]
    # the boots: one 5 x 3 sprite (bark, soil edges, a clay catch-light, an ink sole) under each leg's ankle, so the boot is attached to the leg wherever the leg ends
    for (x0, dy, dx, sgn) in ((left_x, l_dy, l_dx, -1), (right_x, r_dy, r_dx, 1)):
        ox = int(round(sgn * (knee * 0 + dx))); bx = x0 + ox - (1 if sgn < 0 else 0)
        for j, row in enumerate(BOOT):
            for i, c in enumerate(row):
                if c != "." and 0 <= b0 + dy + j < H and 0 <= bx + i < W: out[b0 + dy + j, bx + i] = C[BOOT_C[c]]
    return shadow(out)

# ---- side view (facing right; the left is the mirror). Legs are polylines from the hip through the knee to the ankle, thick runs of the trouser ramp: the near leg slate with a
# night shade, the far leg night with an ink shade (it is behind and darker); the boot sprite has its toe to the right and is set at the ankle.
SBOOT = ["dfffd..", "dkffffd", "nnnnnnn"]
def _run(out, x0, x1, y, cols):
    for x in range(int(x0), int(x1) + 1):
        if 0 <= x < 48 and 0 <= y < 48: out[y, x] = cols(x - int(x0), int(x1) - int(x0))
def leg_path(out, pts, body, edge, w=5):
    for (xa, ya), (xb, yb) in zip(pts[:-1], pts[1:]):
        n = max(abs(xb - xa), abs(yb - ya), 1)
        for i in range(n + 1):
            x = xa + (xb - xa) * i / n; y = int(round(ya + (yb - ya) * i / n))
            _run(out, round(x - (w - 1) / 2), round(x + (w - 1) / 2), y, lambda k, m: edge if k == m else body)
def side_boot(out, ax, ay, lift_toe=0):
    for j, row in enumerate(SBOOT):
        for i, c in enumerate(row):
            if c != "." and 0 <= ay + j < 48 and 0 <= ax - 1 + i < 48: out[ay + j, ax - 1 + i] = C[BOOT_C[c]]
def side_pose(base, upper_rows=34, body_dy=0, far=None, near=None, far_ankle=None, near_ankle=None, lean=0):
    out = np.full_like(base, -1)
    ys_ = np.where((base >= 0).any(1))[0]; top = ys_.min()
    for y in range(0, upper_rows):
        if 0 <= y + body_dy < 48:
            d = int(round(lean * max(0.0, (upper_rows - 6 - y) / max(1.0, upper_rows - 6 - top))))        # the rows lean forward, the more the higher they are
            row = np.roll(base[y], d) if d else base[y]
            out[y + body_dy] = row
    if far: leg_path(out, far, C["night"], C["ink"]); side_boot(out, *far_ankle)
    if near: leg_path(out, near, C["slate"], C["night"]); side_boot(out, *near_ankle)
    return shadow(out, 24)

# ---- raised arms (the react poses): a sleeve is a thick polyline in the coat's amber with an orange edge on the side that meets the air, and a glove at its end (bark with a soil edge)
def limb(out, pts, w=3, hand=2, edge_all=False):
    mask = np.zeros(out.shape, bool); g = np.zeros(out.shape, bool)
    for (xa, ya), (xb, yb) in zip(pts[:-1], pts[1:]):
        n = max(abs(xb - xa), abs(yb - ya), 1)
        for i in range(n + 1):
            x = xa + (xb - xa) * i / n; y = ya + (yb - ya) * i / n
            for yy in range(int(np.floor(y - (w - 1) / 2)), int(np.floor(y + (w - 1) / 2)) + 1):
                for xx in range(int(np.floor(x - (w - 1) / 2)), int(np.floor(x + (w - 1) / 2)) + 1):
                    if 0 <= yy < 48 and 0 <= xx < 48: mask[yy, xx] = True
    hx, hy = pts[-1]
    for yy in range(hy - hand // 2 - 1, hy - hand // 2 - 1 + hand + 1):
        for xx in range(hx - hand // 2, hx - hand // 2 + hand + 1):
            if 0 <= yy < 48 and 0 <= xx < 48: g[yy, xx] = True
    mask &= ~g
    new = np.full(out.shape, -1, dtype=out.dtype); new[mask] = C["amber"]; new[g] = C["bark"]
    for arr, col in ((mask, "orange"), (g, "soil")):
        for y, x in zip(*np.where(arr)):
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                ny, nx = y + dy, x + dx
                if not (0 <= ny < 48 and 0 <= nx < 48) or not (mask[ny, nx] or g[ny, nx]) and (out[ny, nx] < 0 or edge_all): new[y, x] = C[col]; break
    m = new >= 0; out[m] = new[m]


# ---- the ruff (round 11). Front: the silver ring round the face becomes the side view's cream fur (sand, a cream light at the top left, clay in the shade), its outer edge broken with 1 px tufts and
# thicker at the chin. Back: ruff tufts at both sides of the hood and a 1 px seam down the middle. Every other pixel stays.
def ruff_front(cell):
    out = cell.copy(); yy, xx = np.mgrid[0:48, 0:48]
    fog = (out == C["fog"])
    out[fog] = C["sand"]
    out[fog & ((xx >= 28) | (yy >= 19))] = C["clay"]
    out[fog & (xx <= 20) & (yy <= 17)] = C["cream"]
    ring = np.isin(out, [C["sand"], C["clay"], C["cream"]]) & (yy >= 11) & (yy <= 21)
    for (x, y) in ((17, 14), (17, 17), (16, 19), (31, 13), (31, 16), (31, 19), (21, 10), (25, 10)):            # 1 px tufts on the hood side of the ring
        if out[y, x] in (C["amber"], C["orange"], C["rust"]): out[y, x] = C["clay"] if x >= 28 else C["sand"]
    for x in range(19, 29):                                                                                      # thicker at the chin: two rows under the chin, a tuft row under them
        for y, c in ((21, C["sand"] if x < 26 else C["clay"]), (22, C["clay"] if (x + 1) % 2 else C["sand"])):
            if out[y, x] in (C["orange"], C["amber"], C["sand"], C["clay"], C["rust"]): out[y, x] = c
    for x in (20, 23, 26):
        if out[23, x] in (C["orange"], C["amber"]): out[23, x] = C["clay"]
    return out
def ruff_back(cell):
    out = cell.copy()
    for (x, y, c) in ((15, 14, "sand"), (16, 13, "sand"), (16, 15, "cream"), (15, 16, "sand"), (32, 13, "clay"), (31, 12, "clay"), (31, 14, "sand"), (32, 15, "clay")):
        if out[y, x] < 0 or out[y, x] in (C["amber"], C["orange"], C["rust"]): out[y, x] = C[c]
    for y in range(8, 17):                                                                                         # the seam
        if out[y, 24] in (C["amber"], C["orange"]): out[y, 24] = C["orange"]
    return out
