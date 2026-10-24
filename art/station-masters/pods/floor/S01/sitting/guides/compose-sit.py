"""Sitting S01 habit keys (studio brief 2026-10-23 22:00): the composed inputs compose-sit-<stage>-<sheet>.png, 0 MXN.
Sheet as floor/S01/guides/compose-m.py: 1264x848, 3x2 cells of 421x424 (1-3 top, 4-6 bottom), flat #FF00FF. The stage's crested anchor's alpha box is
scaled by 1/proof scale (adult 0.733, juvenile 0.601, guides/compose.json) with LANCZOS, centred in cell 1, feet 20 px above the cell's bottom.
That one placement (box, size, offset) is THE canvas transform of the stage: every 304x312 key on the v4 canvas (cell 1 of every sheet and every
cut take, each in the cell it came from) is placed with it, so the cut inverts it exactly (MAP below; floor/S01/sitting/guides/cut-sit.py).
usage (from art/station-masters/pods): python3 -I floor/S01/sitting/guides/compose-sit.py <adult|juvenile> <crested|bare-in|patches-in|stripes-in>
  crested     cell 1 the crested anchor, cells 2-6 empty magenta (K1)
  bare-in     cell 1 the crested anchor, cells 2,3,5,6 the cut crested takes crested/mibi-<stage>-S01-{shake,calm}-t{1,2} (K2)
  patches-in  cell 1 the bare anchor + its round-2 patches, cells 2,3,5,6 the cut bare takes keys/mibi-<stage>-S01-base-{shake,calm}-t{1,2} (K3)
  stripes-in  cell 1 the bare anchor + its stripes, the same takes (K4)
  bare-ref    K2's second reference: the bare anchor at 304x312 flattened on magenta
A take whose file is absent (dropped at K1) leaves its cell empty magenta. Work-queue layers are read with git show from /home/user/wq at f1285a67."""
import io, json, os, subprocess, sys, numpy as np
from PIL import Image
MAG = np.array([255, 0, 255], float); W, H = 1264, 848; CW, CH = W // 3, H // 2; KW, KH = 304, 312
SCALE = {'adult': 0.733, 'juvenile': 0.601}
CELLS = {2: ('shake', 't1'), 3: ('calm', 't1'), 5: ('shake', 't2'), 6: ('calm', 't2')}
WQ, WQREV = '/home/user/wq', 'f1285a67'
LAYER = {'patches': 'results/T-20261016-203/patches-r2/mibi-{s}-S01-anchor-patches-304x312.png', 'stripes': 'results/T-20261016-200/layers/mibi-{s}-S01-anchor-stripes-304x312.png'}
def cell_origin(c): return ((c - 1) % 3) * CW, ((c - 1) // 3) * CH
def rgba(p): return Image.open(p).convert('RGBA')
def wq(path): return Image.open(io.BytesIO(subprocess.run(['git', '-C', WQ, 'show', f'{WQREV}:{path}'], check=True, capture_output=True).stdout)).convert('RGBA')
def MAP(stage):
    """The stage's canvas transform: sheet x = cell_x0 + ox + (u - bx0) * kx (and y alike), u, v on the 304x312 canvas."""
    a = np.asarray(rgba(f'floor/S01/crested/mibi-{stage}-S01-anchor-304x312.png'))[..., 3] > 0
    ys, xs = np.where(a.any(1))[0], np.where(a.any(0))[0]; bx0, bx1, by0, by1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
    s = 1 / SCALE[stage]; w, h = round((bx1 - bx0) * s), round((by1 - by0) * s)
    ox, oy = (CW - w) // 2, CH - 20 - h; assert ox >= 0 and oy >= 0, ('does not fit', w, h)
    return {'stage': stage, 'proof_scale': SCALE[stage], 'box': [bx0, by0, bx1, by1], 'size': [w, h], 'at_in_cell': [ox, oy], 'k': [w / (bx1 - bx0), h / (by1 - by0)]}
PAD = 240
def to_cell(im, M):
    """A 304x312 RGBA key -> a 421x424 RGBA cell, LANCZOS through the canvas transform (premultiplied by Pillow)."""
    (bx0, by0, _, _), (ox, oy), (kx, ky) = M['box'], M['at_in_cell'], M['k']
    big = Image.new('RGBA', (KW + 2 * PAD, KH + 2 * PAD), (0, 0, 0, 0)); big.paste(im, (PAD, PAD))
    box = (PAD + bx0 - ox / kx, PAD + by0 - oy / ky, PAD + bx0 + (CW - ox) / kx, PAD + by0 + (CH - oy) / ky)
    return big.resize((CW, CH), Image.LANCZOS, box=box)
def flat(sheet, cellim, c):
    x0, y0 = cell_origin(c); a = np.asarray(cellim).astype(float); al = a[..., 3:] / 255.0
    reg = sheet[y0:y0 + CH, x0:x0 + CW]; reg[:] = reg * (1 - al) + a[..., :3] * al
def anchor_with(stage, layer):
    base = rgba(f'floor/S01/keys/mibi-{stage}-S01-base-anchor-304x312.png'); base.alpha_composite(wq(LAYER[layer].format(s=stage))); return base
def build(stage, kind):
    M = MAP(stage); s = np.tile(MAG, (H, W, 1)); used = {}
    if kind in ('crested', 'bare-in'):
        p = f'floor/S01/crested/mibi-{stage}-S01-anchor-304x312.png'; flat(s, to_cell(rgba(p), M), 1); used[1] = p
    else:
        layer = kind.split('-')[0]; flat(s, to_cell(anchor_with(stage, layer), M), 1); used[1] = f'keys/mibi-{stage}-S01-base-anchor + wq {WQREV}:{LAYER[layer].format(s=stage)}'
    if kind != 'crested':
        for c, (pose, t) in CELLS.items():
            p = f'floor/S01/crested/mibi-{stage}-S01-{pose}-{t}-304x312.png' if kind == 'bare-in' else f'floor/S01/keys/mibi-{stage}-S01-base-{pose}-{t}-304x312.png'
            if os.path.exists(p): flat(s, to_cell(rgba(p), M), c); used[c] = p
    out = f'floor/S01/sitting/guides/compose-sit-{stage}-{kind}.png'
    Image.fromarray(np.clip(np.rint(s), 0, 255).astype(np.uint8)).save(out)
    jp = 'floor/S01/sitting/guides/compose-sit.json'; J = json.load(open(jp)) if os.path.exists(jp) else {}
    J.setdefault('maps', {})[stage] = M; J.setdefault('sheets', {})[os.path.basename(out)] = {'cells': {str(k): v for k, v in used.items()}}
    json.dump(J, open(jp, 'w'), indent=1); print(out, used)
def bare_ref(stage):
    """K2's second reference: the signed bare anchor at 304x312, flattened on flat magenta."""
    a = np.asarray(rgba(f'floor/S01/keys/mibi-{stage}-S01-base-anchor-304x312.png')).astype(float); al = a[..., 3:] / 255.0
    out = f'floor/S01/sitting/guides/compose-sit-{stage}-bare-anchor-ref.png'; Image.fromarray(np.clip(np.rint(MAG * (1 - al) + a[..., :3] * al), 0, 255).astype(np.uint8)).save(out); print(out)
if __name__ == '__main__':
    bare_ref(sys.argv[1]) if sys.argv[2] == 'bare-ref' else build(sys.argv[1], sys.argv[2])
