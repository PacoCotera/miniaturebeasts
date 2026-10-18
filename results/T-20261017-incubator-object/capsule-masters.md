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

All layers are in `masters/`. Scripts in run order: `cut-capsule.py` → `dusk.py` → `reduce-views.py`.

- **`authority/`, 1024 × 600, in closed's frame:**
  - `capsule-room-day`, `capsule-room-dusk`;
  - `capsule-shell`, `capsule-shell-dusk`;
  - `capsule-interior-day`, `capsule-interior-dusk`;
  - `capsule-bar-lit`;
  - `capsule-door-open`, registered from open with dy −19;
  - `capsule-seal-ring`;
  - `window-mask`: a clean arch-topped window, x 351–666, y 20–468, which the drawn glass and the ring follow.
  - The bar-off state is the shell's own dark slot, so it is not a separate layer.
  - The dusk layers are the day layers graded by code to incubate's colour. The ring is a mint stroke with a glow, measured on incubate as (158, 216, 176).
- **`room/`, ×0.85:**
  - the capsule layers at 530 × 510, placed at (344, 48), with the door's box included;
  - `capsule-room-{day,dusk}-1024x522`: a 1:1 crop of rows 65–587, on the stage at y 40.
- **`create/`, ×0.373:** 151 × 224, the capsule only.
- **`home/`, ×0.143:** 58 × 86, the capsule only.
- **`proof-room-growing-and-sealed.png`:** the room view with a renderer Loika pod at 170 tall. Growing (day, bar lit) and sealed (dusk, ring, bar off).
- **The build still owes, per mibi:** the pod's relight to the roof lamp, its contact shadow, and the moss blades in front of its foot, as in `composite-juvenile.py`. The proof shows the pod unrelit.
- **The superseded registered dusk plate** has been removed.
