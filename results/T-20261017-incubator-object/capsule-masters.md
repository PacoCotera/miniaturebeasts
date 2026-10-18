# The Incubator capsule: the masters for the Station (art director)

**The art authority:** the four house-style stills.
- closed and incubate: masters-pods cc402996, `concepts/incubator-capsule-hs/`;
- open and hatch now: this folder's `house-style/`.

All coordinates below are in those stills' 1024 × 600 frame. UI/UX's build spec places the capsule in each view and sets its reduction. Every master is cut once at this scale and reduced offline per view, never scaled at runtime, never mirrored.

## The layers

| Master | Size (at authority scale) | Cut from | Anchor |
| --- | --- | --- | --- |
| `capsule-room-day` | 1024 × 600 | closed: the painted sage wall and table, with the capsule removed | full frame |
| `capsule-room-dusk` | 1024 × 600 | incubate: the same, evening grade | full frame |
| `capsule-shell` | about 384 × 600 | closed: the slate body, roof-lamp housing and base, with the window and the bar area transparent | shell box x 322–706, y 0–600 |
| `capsule-interior-day` | the window's box, about 300 × 420 | the studio's `interior-day` (d6efa10d): the lit back wall, the roof lamp's pool and the empty moss bed | window box, moss line y ≈ 432 |
| `capsule-interior-dusk` | the same | `masters/interior-dusk-coded-1024x600.png`: the incubate still registered into this frame, with its window replaced by the empty interior graded to dusk, and the seal ring kept | the same |
| `capsule-glass-closed` | the window's box | drawn in code: two soft highlights matching closed's painted reflections, as alpha over the interior and the pod. A painting's glass can't be separated from what's behind it | window box |
| `capsule-door-open` | about 300 × 560 | open: the swung curved door, alpha | hinge at the shell's right edge, x ≈ 700 |
| `capsule-bar-on` | about 230 × 40 | closed: the mint bar and its glow, alpha | bar centre ≈ (512, 520) |
| `capsule-bar-off` | the same | incubate: the dark bar slot | the same |
| `capsule-seal-ring` | the window's box plus a 12 px glow | incubate: the mint ring and its glow, alpha | window box |

## What sits inside (drawn per mibi, not painted into the capsule)

- **The pod:** the pod renderer's own pod for that founder's species, not the painted Loika. That's why the interior must be empty.
  - Placement: the pod's foot on the moss line at about (512, 432), at the pod height the stills show (about 200 px at authority scale).
  - Relit to the roof lamp as `composite-juvenile.py` does: warm from above, shade below, a rim on top, a contact shadow on the moss, and the moss blades in front of the foot.
- **The hatchling:** the founder's own juvenile stand (layered, from `drawnLooks`), its feet on the moss at about (538, 432), at about 172 px at authority scale. This is a close-up, which the size table allows. It is relit in the same way.
- **The opened pod** for Hatch now: the bowl and the tipped cap, neutral (`masters/pod-opened-*-shade-*.png`); the masks and pattern projection are to be cut. Originally The pod renderer has no opened state. It needs a new renderer layer set for the two shell halves and the tipped cap (shade, body mask, accent mask, pattern), painted once in neutral like the closed pod's layers, so every species' pod opens in its own colours.

## The states

| State | Room | Interior | Glass | Bar | Seal | Inside |
| --- | --- | --- | --- | --- | --- | --- |
| Growing (closed) | day | day | closed | on | off | the sealed pod |
| Open (empty, or the founder's pod being set in) | day | day | door open | on | off | the pod, or nothing |
| Incubate (sealed) | dusk | dusk | closed | off | on | the sealed pod |
| Hatch now | day | day | door open | on | off | the opened pod plus the juvenile |

## Registration (revised with UI/UX's measures)

Every layer is cut in closed's frame, so a state change never moves the capsule.
- **open:** its capsule sits 19 px lower (the lamp's top at 87 against 68, the bar at 534 against 515). The open door is cut after a dy −19 translate.
- **incubate:** nothing is cut from it. The dusk state is the closed-frame room, interior and shell graded to incubate's dusk colour by code. The seal ring is a mint stroke and glow drawn in code along closed's window rim. The registered dusk plate in `masters/` is superseded by this.
- **hatch-now:** nothing is cut from it; the opened pod and the juvenile are drawn.
- **The studio's empty day interior** sits in closed's frame (offset 0, −1).

## The views (from UI/UX's build spec)

| View | Scale (offline cut) | Placement | Notes |
| --- | --- | --- | --- |
| The Incubator room, full screen (with the Incubate and Hatch now moments as its states) | ×0.85 | y = 48 + 0.85·y_auth, x = 512 + 0.85·(x_auth − 514); shell at 349,48, 327×510 | The room is NOT reduced: a 1:1 crop of the room, rows 65–587 (r0 = 65, so the table line at 489 meets the reduced capsule's foot). The moss line at y 415. The pod about 170 tall, foot on (512, 415). The juvenile 146 tall, feet on (532, 415). The bar centred on (512, 490), and as progress `bar-lit` is revealed from the left in whole px over `bar-off`. The left wall (x 16–300) stays plain |
| Create's chamber | ×0.373 | 776,104, 176×224 | Shell, interior, glass and bar, with no room. The moss line at about y 265. The pod about 75 tall |
| The Incubate panel's window (Incubate \| Keep shaping, the owner's ruling) | set from UI/UX's window rect: the capsule framed with a little room around it, about ×0.73 for a 474 × 468 window | the dusk state composed (room dusk, shell, interior dusk, the founder's pod, glass, seal ring) and cropped to the window | Keep shaping's window is Create's bench, not a capsule. The pod is the founder's species, drawn per mibi as everywhere |
| Home's Incubator station | ×0.143 | 56×86 at about (432, 488) | State only (glass with the pod, door open, empty). The bar is lit or off, never a fraction; Home keeps its arc for progress |

## Missing, so to request

1. **The empty interiors, day and dusk.** Two studio edits, with the moss bed repainted where the pod stood: the day one from open, which has no glass in front of the interior; the dusk one from incubate.
2. **The opened-pod renderer layers.** One studio painting of the halves and cap in neutral grey on magenta, cut into the pod layers like the closed pod's.

Everything else is cut from the four stills by the art director, with no painting.

## Cut (art director)

All layers are in `masters/`. Scripts in run order: `cut-capsule.py` → `dusk.py` → `crown.py` → `reduce-views.py`. The per-view numbers are in `views.json`.

**`authority/`, 1024 × 600, in closed's frame:**
- `capsule-room-{day,dusk}`;
- `capsule-shell`, `capsule-shell-dusk`;
- `capsule-interior-{day,dusk}`;
- `capsule-bar-lit`;
- `capsule-door-open` (from open, with dy −19);
- `capsule-seal-ring`;
- `window-mask` (the arch-topped window, x 351–666, y 20–468).

The bar-off state is the shell's own dark slot. The dusk layers are graded by code to incubate's colour, and the ring is a mint stroke with a glow measured on incubate as (158, 216, 176).

**The crown:** every painting crops the capsule's top at the frame edge. `crown.py` draws the missing 26 rows from the shell's own top rows, on the outline's fitted circle (centre 509, 164, radius 190). This gives the `*-1024x626` layers, with authority y + 26. Every reduction is cut from these, so no view shows a flat top.

| View | Scale | Layer size | Placed at | Moss line | Pod height | Room |
| --- | --- | --- | --- | --- | --- | --- |
| A. The Incubator room | 0.85 | 530 × 532 (with the door's box) | (344, 26); the crown runs under the top bar | 415 | 170 (the juvenile 146, feet at 532) | `room/capsule-room-{day,dusk}-1024x522`, rows 65–587, at y 40. The bar centre is (512, 490) |
| B. Create's chamber | 0.358 | 145 × 224 | (793, 104) | 268 | 72 | none |
| C. Home's station | 0.137 | 56 × 86 | (432, 488) | 551 | 27 | none. State only; Home keeps its arc |
| D. The Incubate panel's left window | 0.733 | 296 × 459 | (116, 80); window 24,76, 474 × 468 | 416 | 147 | `panel/capsule-room-dusk-474x468`, cols 275–749, rows 108–576 |
| E. The pod in the price header | | 16 × 20 | in the header | | | the renderer's collection pod, reduced (`proof-pod-price-16x20.png`) |

**Proofs:**
- `proof-room.png`: growing (day, bar lit) and sealed (dusk, ring, bar off);
- `proof-panel-incubate-474x468.png`.

Both use the renderer's Loika pod, not yet relit.

**The build still owes, per mibi:** the pod's relight to the roof lamp, its contact shadow, and the moss blades in front of its foot, as `composite-juvenile.py` does.

**Known flaw:** a few stray light pixels at the right of the dusk base (authority about x 700–720, y 470–500). They are invisible at C and minor at A and D; a later clean-up pass.

## The opened pod: renderer layers (art director)

`masters/opened/`, at pod-large's scale (the bowl 144 × 150; the cap 104 × 128). The layers follow the closed pod's own set, so the renderer composes them unchanged (shade × 2, body and accent masks, pattern):
- `pod-opened-bowl-shade`;
- `-mask-body`, `-mask-accent`;
- `-pattern-{bands,dots,plates,plates-relief,ribs,segments,segments-relief,stripes}`;
- `pod-opened-cap-shade`, `-mask-body` (empty), `-mask-accent` (the whole cap).

**How it was made** (`opened-layers.py`):
- The bowl is the closed pod with its top broken away, seen in the same view. So its accent ribs and every pattern are carried from pod-large's layers, rows 45–176 mapped onto the bowl's height.
- Nothing is carried onto the bowl's inside, seen through the rim: it stays body colour, shaded darker as painted.
- The cap is all accent and carries no pattern.
- The shade is matched to pod-large's mean (134).

**The proof** is `proof-opened-loika-tuikis.png`: the Loika in charcoal and russet with dots, and the Tuikis in lagoon and marigold with plates. Each opens in its own colours and reads as the closed pod opened.

**Known:** a few russet flecks of the carried band at the rim's top corners, and the left rib sits about 2 px off the painted ridge. Both are small at 1×, for a later touch-up by hand.

**Placement at the hatch:** the bowl's foot is on the moss line at the pod's x. The cap lies tipped against the bowl's left side, as in the hatch-now still. Both are relit to the roof lamp, like the pod.

## The glass, as a cut master (UI/UX's ruling, T-20261016-222)

`capsule-glass-closed` is in `authority/` (600 and 626) and in each closed-glass view:
- room: 530 × 532 at (344, 26);
- panel: 296 × 459 at (116, 80);
- create: 145 × 224;
- home: 56 × 86.

It is a white highlight layer, alpha only on the strokes, at most 0.53. It draws over the pod and under the seal ring.

**Where the strokes come from** (`glass.py`): the closed still has no separable reflections. Closed minus the empty interior is only moss noise, and its glass reads by the rim's inner shadow. The studio did paint the glass's highlights on the open door, in the house hand. Those strokes are lifted from `capsule-door-open`, mirrored, mapped box to box onto the closed window, and kept inside the window. The result is a faint arc sheen that says "glass" without veiling the pod.

## Three fixes from the T-222 stills (UI/UX, uiux-rulings-2)

**1. The opened pod's cap at the hatch.** The cap was cut too large: its long axis was 128 at pod-large, nearly the bowl's height. It is recut to its true size, about 0.62 of the pod's width, so the long axis is 92. It is also pre-tilted 14° outward offline, giving 89 × 88 at pod-large (`opened/pod-opened-cap-*`).
- **Draw order:** cap, then bowl, then juvenile.
- **The bowl:** centred on the pod's x, foot on the moss line.
- **The cap:** stands behind the bowl's left side, its bottom-right corner 12 px (pod-large units, ×0.909 in the room, so 11 px) inside the bowl's left edge, its foot on the moss line.
- **The juvenile:** in front, feet at (532, 415).
- **In the room** (`opened/proof-hatch-room.png`): the bowl is 131 × 136 at (447, 283) and the cap 81 × 80 at (377, 339). The cap's right edge is at 458, clear of the juvenile's box (x 461–604).

**2. The stamp case's front glass** stops short of the plate. `stamp-case/room-stamp-case-152x152-front.png` replaces station-gate's `prototypes/ui/assets/masters/pods/room-stamp-case-152x152-front.png`. It is the same uniform veil (29, 35, 43 at alpha 122), now with alpha 0 over the plate's 120 × 120 (rows and columns 16–135), so it covers the frame band only. The builder places it.

**3. The panel's day set at ×0.733** (`panel/`):
- `capsule-room-day-474x468` (the same crop as dusk: cols 275–749, rows 108–576);
- `capsule-shell`, `capsule-interior-day`, `capsule-bar-lit`, `capsule-glass-closed`, each at 296 × 459, placed at (116, 80);
- `capsule-door-open-457x459` at (116, 80). It is wider than the window, so the window clips the door's far edge, as a framed close-up does.
- The juvenile is 126 tall and the pod 147. The opened pod is reduced at ×0.733 from pod-large's 176 scale, so the bowl is about 113 tall.
