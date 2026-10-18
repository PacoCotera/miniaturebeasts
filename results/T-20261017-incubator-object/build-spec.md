# The Incubator: the build spec (UI/UX), and the Incubate and Hatch now moments

This spec is for the builder. It replaces the Incubator's picture, layout and motion in `prototypes/ui/specs/station/incubator.json` on station-gate with the house-style capsule. The rules stay as T-20261016-219 built them (`results/incubate-and-hatch-now-game-text.md`):
- Create's press is **Incubate**;
- the Incubator's pay-to-finish press is **Hatch now**, and it hatches in one press;
- **Open** stays for a bud that finished on its own.

Everything not named here keeps its current rule in `incubator.json`: the hand-off to the meet, the jumps, the bay guard, the refusals, the log lines and the host's props.

**Sources:**
- The owner approved the house-style capsule at 00:48.
- The art director's gate (`results/T-20261017-incubator-object/art-director.md`) and the four pictures:
  - `closed` and `incubate` (masters-pods cc402996, `concepts/incubator-capsule-hs/`);
  - `open-fixed` and `hatch-now-fixed` (`house-style/` here).
- **Retired:** the round-2 Grow panels (T-20261016-195, the panel structure §2–3: Grow it | Keep shaping, Grow now | Wait). No decision panel is built for Incubate or Hatch now (§6).

All rects are `[x, y, w, h]` in screen pixels at 1× on 1024 × 600. The stage is the frame's `(0, 40, 1024, 522)`; the top bar (40) and the bottom line (38) are the frame's own. Every image is placed at 1:1, nothing is scaled at runtime, and nothing is anti-aliased.

**The masters** are the art director's (`results/T-20261017-incubator-object/capsule-masters.md`). They are cut once at the stills' scale (1024 × 600, the authority) and reduced offline per view, never at runtime.

## 1. The picture: the capsule, in layers (the Incubator room)

**Placement in this view:**
- The capsule is reduced **×0.85**. The shell box (authority x 322–706, y 0–600) lands at **349, 48, 327, 510**, with its axis on x 512.
- Mapping: screen x = 512 + 0.85 · (x − 514), screen y = 48 + 0.85 · y.
- The moss line (authority 432) lands at **y 415**, and the bar's centre at **(512, 490)**.
- **The room is not reduced:** it is a 1:1 crop of `capsule-room-{day,dusk}`, 1024 × 522 (authority rows r0 to r0 + 522), with r0 set by the art director so that the table line meets the reduced capsule's foot (about 65). It fills the stage.

**Draw order and rects:**

| Layer | Rect (screen) | Master |
| --- | --- | --- |
| room | 0, 40, 1024, 522 | `capsule-room-day` or `-dusk`, cropped |
| interior | the window's box at ×0.85 | `capsule-interior-day` or `-dusk` (empty moss bed) |
| pod | foot bottom-centred on (512, 415), about 170 tall | the renderer's pod for the bud's species, at the class the art director's reduction gives, relit to the roof lamp (as `composite-juvenile.py`), with the moss blades in front of the foot |
| juvenile | feet on (532, 415), about 146 tall | hatch only: the new mibi's own juvenile stand (from `drawnLooks`), rendered by the host at that size and relit the same way |
| glass | the window's box | `capsule-glass-closed`, drawn in code as alpha highlights (the closed states only) |
| shell | 349, 48, 327, 510 | `capsule-shell` (window and bar area transparent) |
| door | hinged at the shell's right edge (authority x ≈ 700, so screen x ≈ 668) | `capsule-door-open` (the open states only) |
| bar | centre (512, 490) | `capsule-bar-off`, with `capsule-bar-on` revealed from the left as the progress (§3) |
| seal | the window's box plus its glow | `capsule-seal-ring` (the incubate moment only) |

**The states' layers** (the art director's table):

| State | Room | Interior | Glass / door | Bar | Seal | Inside |
| --- | --- | --- | --- | --- | --- | --- |
| empty | day | day | door open | off | off | nothing |
| growing | day | day | glass closed | on, revealed to the progress | off | the sealed pod |
| ready | day | day | door open | on, full | off | the sealed pod |
| incubate moment | dusk | dusk | glass closed | off | on | the sealed pod |
| hatch, from its step at 1000 | day | day | door open | on, full | off | the opened pod and the juvenile |

"Looks" in §3 and §4 name these rows: `closed` = growing, `open` = ready, `incubate`, and `hatched`. The empty state is the open look with nothing inside: an open, empty capsule as the invitation.

## 2. The left column: the stamp

The capsule fills the centre (body x about 349–672; the open door reaches about 855), so the founder's stamp moves from the right column to the left wall, which is clear in every look.

| Region | Rect | Draws |
| --- | --- | --- |
| `stampCase` | 76, 184, 152, 152 | the stamp case, as on Create (`stampCase` look) |
| `stamp` | 92, 200, 120, 120 | the bud's stamp, its chapters filling as they clear (unchanged rule, `regions.stamp.live`) |
| `code` | 64, 344, 176, 25 | the bud's code, as now (16, centred on x 152) |
| `readyIn` | 64, 384, 176, 20 | growing only: "ready in about {n} min" (13, `mist`, centred on x 152). This is the time, a fact the bar can't carry, in the Incubator's own context |

- The column is shown in growing, ready and hatch. In empty it is bare wall.
- **Gone:** the chapter rail (`regions.rail`), the leaves (`regions.leaves`), the dome, nest, base and plaque regions, and the right-column stamp place. The chapters' clearing now shows on the stamp alone. `events.wipe` keeps its timing but draws only the stamp's redraw (no tab).

## 3. States

| State | Look | Pod | Bar | Column | Notes |
| --- | --- | --- | --- | --- | --- |
| `empty` | `open`, empty | off (the moss bare) | off | bare | an invitation: the open, empty capsule |
| `growing` | `closed` | the bud's pod, whole | lit width `floor(158 × elapsed / total)` px from the left, redrawn when it gains a pixel | stamp, code, readyIn | |
| `ready` | `open` | the bud's pod, whole | full | stamp, code | the door stands open: the wait is done |
| `hatch` | §4 | §4 | full | stamp, code | input held |

- **The bar is the only progress.** No digits, no ring and no leaves. "ready in about {n} min" is the time, not a percentage. `n` is the minutes left, rounded up, at least 1.
- **Bar redraw:** only the 1 px column that turns lit, within the 158 × 12 box, at most once a second.

## 4. The moments (replaces `events.growNow` and `events.hatch`; adds `events.incubate`)

Every step is a cut or the house dither (16 levels, 180 ms). Nothing scales or slides.

### 4.1 The Incubate moment (`events.incubate`), arriving from Create's Incubate or Cross's Cross them

| At | Does |
| --- | --- |
| 0 | the Incubator draws the `incubate` look, with the pod (the new bud) and the bar off. This is the screen the jump's dither lands on (create.json `events.grow` at 900) |
| 1200 | the 180 ms dither to `growing`: the `closed` look, the bar from its first pixel, and the column |

- **Input** is held to 1380. A room key waits, then acts.
- **Reduced motion:** a cut straight to `growing` on arrival.

### 4.2 Hatch now (`events.growNow`, now including the hatch), ✓ while growing

| At | Does |
| --- | --- |
| 0 | the bar fills from its width to full in 8 cuts, 50 ms apart, whole pixels |
| 400 | on a founder's bud, every chapter still unread turns read (a cut, except a sealed chapter still shut); the stamp redraws |
| 400 | the 180 ms dither from `closed` to `open`: the door opens |
| 580 | **the hatch** (4.3) starts at its 0 |

- One press, as built: pay, end the wait, hatch (T-219). A refused press (short of Essence, or no bay) plays nothing and spends nothing; the refusal plate is as now.
- **Reduced motion:** the cut to the meet on the frame of ✓, as Open's.

### 4.3 The hatch (`events.hatch`), from ✓ Open (ready) or from 4.2

| At | Does |
| --- | --- |
| 0 | the `open` look stands still, with the pod whole: a still beat |
| 600 | the pod cracks: the renderer's `crack` layer on the pod (crack 1) |
| 800 | crack 2 (as now, `bud-crack-2` rule, on the renderer's pod) |
| 1000 | the 180 ms dither to the `hatched` look: the species' opened pod (bowl and tipped cap, §5) on the moss, and the new mibi standing about 146 tall, feet on (532, 415) |
| 1200 | the ribbon: "{Name}, a young {Species}" (`strings.hatchRibbon`), rect 312, 56, 400, 40, the house ribbon |
| 1400 and 1800 | the two steps, each with the `lift` table as now (px above the feet line 415) |
| 2600 | the 180 ms dither to one mibi up close, in the meet (`handoff`, unchanged) |

- **The moving set** (`events.hatch.moving`): its timings are unchanged; its boxes are this section's (the mibi about 146 tall, feet on (532, 415)).
- **Reduced motion:** the cut to the meet on the frame of ✓, as now.
- **The new mibi's picture:** the host renders it about 146 tall from its own looks, with its feet on its box's foot. It is relit to the capsule's roof lamp by the same function as `composite-juvenile.py` (warm from above, a rim on the crest, a contact shadow on the moss), in Node, before the props. Until it lands, its placeholder is used, as now.

## 5. Masters

All are the art director's (`capsule-masters.md`): cut once at the authority scale, registered to closed's frame, and reduced offline to ×0.85 for this view.
- **Cut from the stills** (no painting):
  - `capsule-room-day` and `-dusk`;
  - `capsule-shell`;
  - `capsule-door-open`;
  - `capsule-bar-on` and `-off`;
  - `capsule-seal-ring`.
- **Drawn in code:** `capsule-glass-closed`.
- **Placed and used as they are:** the pod renderer's layers, the stamp case, the frame's bars and caps, and the ribbon.

**Painted and confirmed** (a58d2827, `masters/` beside `capsule-masters.md`):
- `capsule-interior-day`: the empty moss bed, a clean studio edit;
- `capsule-interior-dusk`: by code, from the incubate still;
- **the opened pod:** a bowl and a tipped cap in neutral, recoloured per species by the renderer like the closed pod's layers.

The hatch therefore shows the species' opened pod (bowl and cap) beside the juvenile from its step at 1000. Empty draws the bare moss bed. Every species' pod is drawn by the renderer.

**Still to cut by the art director** (no painting):
- the room, day and dusk;
- the shell;
- the open door;
- the bar, on and off;
- the seal ring;
- the opened pod's masks and pattern projection.

The builder takes them as they land.

**Other views of the capsule** (the same masters at their own reductions, set by the art director):
- Create's chamber, `create.json regions.dome` 776, 104, 176, 224, at about ×0.373, with no room;
- Home's Incubator station picture, at about ×0.143.

These views are specified in their own screens' specs.

## 6. Keys, the bottom line and the two decision moments

| State | ✓ | Middle | ← |
| --- | --- | --- | --- |
| `empty` | **Choose a pod** (the jump to Pods, as now), only when the rack holds a pod and a bay is free; else no cap | `strings.empty`, or `strings.noBay` | Home, the ring on the Incubator station |
| `growing` | **Hatch now**, then its price, icon before figure (`instantGrowCost`). A dimmed cap when short | the bud (`strings.bud` / `crossBud`) | Home |
| `ready` | **Open**, no price. A dimmed cap when no bay is free | the bud; `strings.noBay` when no bay is free | Home |
| `hatch` | none (held) | as now | none (held) |

- **The pad does nothing.** There is no focus ring: the screen has one subject.
- **During a hold** (the incubate moment, Hatch now, the hatch), ✓, ← and the pad do nothing, and a room key waits, then acts (as `focus.held` now).

**The decision moments, without panels:**
- **Incubate** (on Create) is Create's ✓ with its price. It plays Create's grow event (unchanged), then lands on the Incubator's incubate moment (4.1). The moment is the confirmation: the pod sealed in, the mint ring round the window.
- **Hatch now** is the Incubator's ✓ with its price, in place. Waiting is not pressing: ← Home, or simply staying. The bar and "ready in about {n} min" show what waiting means, so the game text's "Hatch now | Wait" panel is not built.

**Strings** (`incubator.json strings`):
- new: `readyIn` "ready in about {n} min";
- unchanged: `grow` "Hatch now", `open` "Open", `choose` "Choose a pod", `empty`, `noBay`, `noBayPlate`, `bud`, `crossBud`, `hatchRibbon`, `painting`, `offline`;
- `plaque` goes.

## 7. Checks for the builder

- **The goldens** (once §5's cuts land): empty, growing (bar at 0, ½ and nearly full), ready, the incubate moment at 0, the hatch at 1000 and 1400, and Hatch now at 0 and 400. One Loika bud and one cross bud.
- **The per-frame dirty area:** each dither step (whole stage, ≤ 153,600 px a frame, as the house dither), the bar's fill step (8 cuts), and the hatch's lift steps. Print them.
- **Generators:** print each build-time cut's time and size.
