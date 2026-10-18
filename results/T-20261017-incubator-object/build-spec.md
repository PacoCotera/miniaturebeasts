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

**Provisional geometry.** The capsule numbers come from the closed painting reduced ×0.85 at build time (§5). The art director registers the four paintings to it and confirms them (open items 1 and 2). If a number moves, the builder takes the art director's.

## 1. The picture: the capsule, in layers

The paintings fill a 1024 × 600 frame, and the capsule runs from y 0 to 595 in them. So every master is a build-time cut: reduced ×0.85 about the capsule's axis (x 512), and registered so the capsule stands at one place in every state. At runtime the screen is three layers, and the pod and the mibi are the player's own:

| Layer | Rect | Draws |
| --- | --- | --- |
| `back` | 0, 40, 1024, 522 | `incubator-{look}-back-1024x522`: the wall, the floor, the capsule's body, its roof lamp and the moss behind the pod, with **the pod painted out** |
| `pod` | box 440, 212, 144, 176 (bottom-centred on 512, 388) | the bud's pod from the pod renderer, class `large` (144 × 176), its species' shell (`pod-collection-*` layers at that class) |
| `front` | 340, 48, 344, 472 | `incubator-{look}-front-344x472`: the moss's front rim over the pod's foot, and the glass (its edge and the faint reflection) |
| `bar` | 433, 487, 158, 12 | the base's mint light bar, **the progress** (§3): `incubator-bar-off-158x12`, with `incubator-bar-lit-158x12` revealed from the left |
| `juvenile` | box 441, 242, 142, 146 (feet on 388, axis 512) | hatch only: the new mibi at 142 × 146 (§4) |

**The looks:**

| `{look}` | From | In |
| --- | --- | --- |
| `closed` | `closed-1024x600` | empty (pod layer off), growing |
| `incubate` | `incubate-1024x600`: the door sealing, with the mint ring round the window | the incubate moment (§4) |
| `open` | `open-fixed-1024x600` | ready |
| `hatched` | `hatch-now-fixed-1024x600`, with the painted juvenile and shell painted out | hatch, from its step at 1000 (§4) |

**Draw order:** `back`, `pod`, `front`, `bar`, then `juvenile` (hatch, over the front's moss rim, with its feet in the moss), then the stamp and the frame.

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
| `empty` | `closed` | off (the moss bare) | off | bare | an invitation: the empty capsule |
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
| 1000 | the 180 ms dither to the `hatched` look: the pod's halves (open item 3) on the moss, and the new mibi standing at 142 × 146, feet on 388, axis 512 |
| 1200 | the ribbon: "{Name}, a young {Species}" (`strings.hatchRibbon`), rect 312, 56, 400, 40, the house ribbon |
| 1400 and 1800 | the two steps, each with the `lift` table as now (px above the feet line 388) |
| 2600 | the 180 ms dither to one mibi up close, in the meet (`handoff`, unchanged) |

- **The moving set** (`events.hatch.moving`): its timings are unchanged; its boxes are this section's (the mibi at 142 × 146 on 388).
- **Reduced motion:** the cut to the meet on the frame of ✓, as now.
- **The new mibi's picture:** the host renders it at 142 × 146 from its own looks, with its feet on its box's foot. It is relit to the capsule's roof lamp by the same function as `composite-juvenile.py` (warm from above, a rim on the crest, a contact shadow on the moss), in Node, before the props. Until it lands, its placeholder is used, as now.

## 5. Masters

**Cut at build time** (no painting): reduced ×0.85 about x 512, registered to `closed`, each by a script beside `house-style/fix-house-style.py` and checked against the four approved pictures:
- `incubator-{closed,incubate,open,hatched}-back-1024x522`;
- `incubator-{closed,incubate,open,hatched}-front-344x472`;
- `incubator-bar-lit-158x12` and `incubator-bar-off-158x12`. The lit cut is the painting's own bar. The off cut is the same bar at the base's unlit value: a recolour, as `fix-capsule-bar.py` recolours.

**Placed and used as they are:**
- the pod renderer's `pod-collection-*` layers at class `large`, with `crack`;
- the stamp case;
- the frame's bars and caps;
- the ribbon.

**Open, for the art director** (the spec builds on the numbers above until these are answered):
1. **Registration:** open, incubate and hatch-now drift about 20 px from closed (the mint bar's top: 516 / 535 / 543; the lamp's top: 68 / 85 / 79). Translate each to closed before the cuts, then confirm §1's rects.
2. **The pod painted out** of each back (and the painted juvenile and shell out of `hatched`). This needs a studio edit, so its budget is the lead's to set. Until then the backs keep the painted Loika, and **only a Loika bud is correct**: the builder ships it behind the existing placeholder rule for every other species.
3. **The halves after the hatch:** a renderer layer set (`pod-halves-left` and `-right` at class `large`, species-coloured by the renderer's masks), or the `crack` layer kept on the whole pod as the fallback.

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

- **The goldens:** empty, growing (bar at 0, ½ and nearly full), ready, the incubate moment at 0, the hatch at 1000 and 1400, and Hatch now at 0 and 400. One Loika bud and one cross bud.
- **The per-frame dirty area:** each dither step (whole stage, ≤ 153,600 px a frame, as the house dither), the bar's fill step (8 cuts), and the hatch's lift steps. Print them.
- **Generators:** print each build-time cut's time and size.
