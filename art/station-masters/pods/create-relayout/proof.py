"""SJ-CR1 proofs, 1x, on the surface the art sits on (the whole 1024x600 screen). Evidence for the art director; not a build and not a placement:
the chrome, the rail, the pod, the origin, the trait line and the capsule's interior are the goldens' own crops, moved to UX's rects (ux-layout.md section 3);
the stage, the window pictures, the dish's lip, the founder at 272x280, Create's case and its front, the shell and the S01 roll picture are this job's pieces.
usage: python3 -I proof.py PODS_DIR SG_DIR UXMOCK_DIR OUT_DIR OLD_STAGE_PNG
  OLD_STAGE_PNG is the stage the goldens were taken on (the signed d48e37b5 room-bench-stage-create.png): the pod, origin and trait line are cut from the goldens by their difference to it
  UXMOCK_DIR holds uxmock-<state>.png (the UX design mock for each state, 1024x600), OUT_DIR gets the proofs."""
import sys, os, json, numpy as np
from PIL import Image, ImageDraw, ImageFont
PODS, SG, UXD, OUT, OLD_STAGE = sys.argv[1:6]; SL = os.path.join(PODS, 'slices'); os.makedirs(OUT, exist_ok=True)
GOLD = os.path.join(SG, 'prototypes/face/golden/create/'); MC = os.path.join(SG, 'prototypes/ui/assets/masters/capsule/')
FONT = os.path.join(SG, 'prototypes/ui/fonts/inter/src/Inter-Medium-tnum.ttf')
RGBA = lambda p: Image.open(p).convert('RGBA')
lin = lambda c: np.where(np.asarray(c, float) / 255 <= .04045, np.asarray(c, float) / 255 / 12.92, ((np.asarray(c, float) / 255 + .055) / 1.055) ** 2.4)
srgb = lambda l: np.clip(np.where(l <= .0031308, l * 12.92, 1.055 * np.clip(l, 0, None) ** (1 / 2.4) - .055) * 255, 0, 255)
rlum = lambda a: lin(a) @ [.2126, .7152, .0722]
STAGE = RGBA(os.path.join(SL, 'room-bench-stage-create.png')).convert('RGB')
def put(dst, im, xy, mask=None): dst.alpha_composite(im, xy)
def crop_masked(G, box, ref, thr=24):               # the golden's pixels that differ from the old stage under them
    x0, y0, x1, y1 = box; g = np.asarray(G.crop(box).convert('RGB')).astype(int); s = ref[y0 - 40:y1 - 40, x0:x1]
    m = (np.abs(g - s).sum(2) > thr).astype(np.uint8) * 255; im = G.crop(box).convert('RGBA'); im.putalpha(Image.fromarray(m, 'L')); return im
OLDSTAGE = np.asarray(Image.open(OLD_STAGE).convert('RGB')).astype(int)
CASE, CASEF = RGBA(os.path.join(SL, 'room-stamp-case-create-152x152.png')), RGBA(os.path.join(SL, 'room-stamp-case-create-152x152-front.png'))
BACK, FRONT = RGBA(os.path.join(SL, 'chamber-back-472x288.png')), RGBA(os.path.join(SL, 'chamber-front-472x288.png'))
LIP = RGBA(os.path.join(SL, 'room-cradle-front-create-152x48.png')); SHELL = RGBA(os.path.join(SL, 'capsule-shell-145x224.png'))
FSH = RGBA(os.path.join(SL, 'founder-shadow-224x14.png'))
def founder(G, frosted):
    f = RGBA(os.path.join(SL, 'mibi-adult-S01-272x280.png'))
    if not frosted: return f
    s304 = np.asarray(RGBA(os.path.join(PODS, 'adult', 'mibi-adult-S01-304x312.png')))[..., 3] > 0           # the frosted founder is the same silhouette, in the golden's frost
    g = np.asarray(G.crop((360, 240, 664, 552)).convert('RGB')); a = np.dstack([g, np.where(s304, 255, 0).astype(np.uint8)])
    im = Image.fromarray(a, 'RGBA').resize((272, 280), Image.LANCZOS); return im
def screen(state, mode):
    G = Image.open(GOLD + state + '.png').convert('RGB'); S = Image.new('RGBA', (1024, 600))
    S.paste(G.crop((0, 0, 1024, 40)), (0, 0)); S.paste(G.crop((0, 562, 1024, 600)), (0, 562)); S.paste(STAGE, (0, 40))
    S.paste(G.crop((224, 40, 800, 88)), (224, 40))                                                          # the rail in its well
    # the capsule (145 x 224 at (784, 304)): the golden's own glass, interior and bud, the shell re-cut, no door; its foot sits on the painted shadow
    sh0 = np.asarray(RGBA(MC + 'capsule-shell-145x224.png'))[..., 3]; it = np.asarray(RGBA(MC + 'capsule-interior-day-145x224.png'))[..., 3]
    ca = np.asarray(G.crop((793, 104, 938, 320)).convert('RGBA')).copy(); ca[..., 3] = np.maximum(np.asarray(SHELL)[:216, :, 3], it[:216]); put(S, Image.fromarray(ca), (784, 304))
    put(S, SHELL.crop((0, 216, 145, 224)), (784, 520))
    # the pod on its dish (axis 160 -> 168, feet 408 -> 372)
    dx, dy = 8, -36
    if state == 'create-grow':                                                                                # the travel at 450 ms: (160, 408) -> (864, 268) becomes (168, 372) -> (856, 468)
        f = (269 - 160) / 704.0; ox, oy = 160 + f * 704, 408 - f * 140; nx, ny = 168 + f * 688, 372 + f * 96; dx, dy = int(round(nx - ox)), int(round(ny - oy))
        pod = crop_masked(G, (209, 235, 329, 387), OLDSTAGE); put(S, pod, (209 + dx, 235 + dy))
    else:
        put(S, crop_masked(G, (90, 250, 232, 407), OLDSTAGE), (90 + dx, 250 + dy))
    put(S, LIP, (92, 348))
    put(S, crop_masked(G, (60, 452, 262, 500), OLDSTAGE), (68, 396))                                           # the origin (+8, -56)
    put(S, BACK, (276, 240)); put(S, FSH, (400, 505)); put(S, founder(G, state == 'create-nothingread'), (376, 248)); put(S, FRONT, (276, 240))
    # the roll band (+14) and the trait line (+6), as UX's mock; the S01 Markings picture where the state shows one look
    if state != 'create-nothingread':
        put(S, crop_masked(G, (290, 197, 734, 230), OLDSTAGE, 24), (290, 203))
        if state in ('create-shape-short', 'create-shape-busy', 'create-grow'):
            put(S, RGBA(os.path.join(SL, 'roll-S01-markings-patches-128x72.png')), (448, 118))
        else:
            put(S, crop_masked(G, (290, 89, 734, 197), OLDSTAGE, 24), (290, 103))
    # Create's case (780, 104) with its label, the glass over the well's floor only
    g = np.asarray(G.crop((804, 336, 924, 456)).convert('RGB')).astype(float)
    lab = np.clip((g - .48 * np.array([0x1d, 0x23, 0x2b])) / .52, 0, 255)                                      # the label under the golden's glass (K 0.75, as in Pods' case)
    cs = CASE.copy(); cs.paste(Image.fromarray(lab.round().astype(np.uint8)), (16, 16)); cs.alpha_composite(CASEF); S.alpha_composite(cs, (780, 104))
    if state == 'create-grow':                                                                                # the code, 8 under the case: (815, 481) -> centred on 856, baseline 276
        put(S, crop_masked(G, (776, 478, 952, 508), OLDSTAGE, 30), (780 - 0, 257))
    return S.convert('RGB'), cs.convert('RGB'), lab
if __name__ == '__main__':
    states = ['create-shape-short', 'create-shape-doing', 'create-shape-busy', 'create-grow', 'create-nothingread']
    f = ImageFont.truetype(FONT, 15); rep = {}
    for st in states:
        S, cs, lab = screen(st, 0); S.save(os.path.join(OUT, f'screen-{st}-1x.png'))
        U = Image.open(os.path.join(UXD, f'uxmock-{st}.png')).convert('RGB')
        sh = Image.new('RGB', (2 * 1024 + 16, 600 + 30), (245, 243, 238)); d = ImageDraw.Draw(sh)
        d.text((6, 6), f'UX design mock: {st} (not art)', font=f, fill=(150, 30, 60)); d.text((1024 + 22, 6), f'SJ-CR1 re-cut: {st} (1x)', font=f, fill=(30, 30, 30))
        sh.paste(U, (0, 30)); sh.paste(S, (1040, 30)); sh.save(os.path.join(OUT, f'beside-ux-{st}-1x.png'))
        if st == 'create-shape-short':
            # C12 on the composed screen (founder at 272), and the stamp-case luminance rules
            A = np.asarray(S).astype(float); bench = A[40:562]; L = rlum(bench)
            def best(L, x0, x1, y0, y1):
                I = np.cumsum(np.cumsum(np.pad(L, ((1, 0), (1, 0))), 0), 1); w, h = 224, 52; bv = (-1, None)
                for y in range(y0, y1 - h + 1, 2):
                    for x in range(x0, x1 - w + 1, 2):
                        v = (I[y + h, x + w] - I[y, x + w] - I[y + h, x] + I[y, x]) / (w * h)
                        if v > bv[0]: bv = (v, (x, y + 40))
                return bv
            tray_best = best(L, 276, 748, 200, 488)
            Ls = rlum(np.asarray(STAGE).astype(float)); stage_tray = best(Ls, 276, 748, 200, 488)
            outside = max((best(Ls, 70, 276, 20, 500), best(Ls, 748, 954, 20, 500), best(Ls, 70, 954, 20, 200)), key=lambda t: t[0])
            fo = np.asarray(RGBA(os.path.join(SL, 'mibi-adult-S01-272x280.png'))); fm = fo[..., 3] == 255; fl = rlum(fo[..., :3].astype(float))[fm]
            podm = np.asarray(crop_masked(Image.open(GOLD + st + '.png').convert('RGB'), (90, 250, 232, 407), OLDSTAGE))
            pl = rlum(podm[..., :3].astype(float))[podm[..., 3] > 0]
            capm = np.asarray(S.crop((784, 304, 929, 520)))[..., :3].astype(float); ca = np.asarray(SHELL)[:216, :, 3] > 0; cl = rlum(capm)[ca]
            li = rlum(lab); inner = li[8:112, 8:112]; cs_arr = np.asarray(cs).astype(float); cl2 = rlum(np.asarray(S).astype(float)[120:240, 796:916])
            rep = {'pool_brightest_224x52_in_tray_stage_only': [round(float(tray_best[0]), 3), tray_best[1]],
                   'pool_window_on_composed_screen': [round(float(tray_best[0]), 3), tray_best[1]],
                   'best_224x52_window_stage_outside_tray': [round(float(outside[0]), 3), outside[1]],
                   'pool_is_brightest_window_of_the_stage': bool(stage_tray[0] > outside[0]), 'stage_tray_window': [round(float(stage_tray[0]), 3), stage_tray[1]],
                   'founder_S01_272_p95': round(float(np.percentile(fl, 95)), 3), 'pod_p95': round(float(np.percentile(pl, 95)), 3), 'capsule_p95': round(float(np.percentile(cl, 95)), 3),
                   'founder_p95_highest_of_objects': bool(np.percentile(fl, 95) > max(np.percentile(pl, 95), np.percentile(cl, 95))),
                   'label_mean_lum': round(float(cl2.mean()), 3), 'label_p95_lum': round(float(np.percentile(cl2, 95)), 3), 'founder_mean_lum': round(float(fl.mean()), 3),
                   'cell_contrast': round(float((np.percentile(cl2[8:112, 8:112], 95) + .05) / (np.percentile(cl2[8:112, 8:112], 5) + .05)), 2),
                   'label_srgb_mean': round(float(np.asarray(S).astype(float)[120:240, 796:916].mean()), 1)}
            rep['label_under_founder_mean_p95'] = bool(rep['label_mean_lum'] < rep['founder_mean_lum'] and rep['label_p95_lum'] < rep['founder_S01_272_p95'])
    json.dump(rep, open(os.path.join(OUT, 'proof-measures.json'), 'w'), indent=1); print(json.dumps(rep, indent=1))
