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
- **Decision panels:** Incubate has one, **Incubate | Keep shaping** (the owner, 00:57). It is a first build, fully specified in §6a. Hatch now has none (§6), and there is no "Hatch now | Wait" panel.

All rects are `[x, y, w, h]` in screen pixels at 1× on 1024 × 600. The stage is the frame's `(0, 40, 1024, 522)`; the top bar (40) and the bottom line (38) are the frame's own. Every image is placed at 1:1, nothing is scaled at runtime, and nothing is anti-aliased.

**The masters** are the art director's (`results/T-20261017-incubator-object/capsule-masters.md`). They are cut once at the stills' scale (1024 × 600, the authority) and reduced offline per view, never at runtime.

## 1. The picture: the capsule, in layers (the Incubator room)

**Placement in this view:**
- The capsule is reduced **×0.85**. The shell lands with its axis on x 512 and its crown under the top bar (the layers at 344, 26, 530 × 532).
- Mapping: screen x = 512 + 0.85 · (x − 514), screen y = 48 + 0.85 · y.
- The moss line (authority 432) lands at **y 415**, and the bar's centre at **(512, 490)**.
- **The room is not reduced:** it is a 1:1 crop of `capsule-room-{day,dusk}`, 1024 × 522 (authority rows r0 to r0 + 522), with **r0 = 65** (the table line at authority 489, closed's foot at 589: the foot lands at screen 549, the table line at 464). It fills the stage.

**Draw order and rects** (the masters in `results/T-20261017-incubator-object/masters/room/`, cut by `masters/reduce-views.py`; every capsule layer is 530 × 532, placed at **(344, 26)**: it includes the capsule's crown, drawn by the art director, which sits under the top bar):

| Layer | Placed at | Master |
| --- | --- | --- |
| room | 0, 40 | `capsule-room-day-1024x522` or `capsule-room-dusk-1024x522` (the 1:1 crop at r0 65) |
| interior | 344, 26 | `capsule-interior-day-530x532` or `capsule-interior-dusk-530x532` (the empty moss bed) |
| pod | foot bottom-centred on (512, 415), pod-large at its own 160 px height (no up-scale) | the renderer's pod for the bud's species. **The build owes** its relight to the roof lamp, its contact shadow on the moss, and the moss blades in front of its foot, as `composite-juvenile.py` does (the art director's proof shows the pod unrelit) |
| juvenile | feet on (532, 415), about 146 tall | hatch only: the new mibi's own juvenile stand (from `drawnLooks`), rendered by the host at that size and relit the same way |
| glass | the window | `room/capsule-glass-closed-530x532` at (344, 26): a white highlight layer, alpha on its strokes only (at most 0.53), over the pod and under the seal ring. It follows the window mask (authority `masters/authority/window-mask-1024x600`, x 351–666, y 20–468; at this view x ≈ 373–641, y ≈ 65–446), alpha over the interior and the pod. Closed states only |
| shell | 344, 26 | `capsule-shell-530x532`, or `capsule-shell-dusk-530x532` at dusk. Its own dark slot is the bar when off |
| door | 344, 26 | `capsule-door-open-530x532` (the open states only) |
| bar | 344, 26 | `capsule-bar-lit-530x532`, clipped from the left as the progress: visible x 433 to 433 + floor(158 × fraction) (§3). Off: not drawn (the shell's slot shows) |
| seal | 344, 26 | `capsule-seal-ring-530x532` (the incubate moment only) |

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
| `readyIn` | 16, 384, 272, 24 | growing only: "ready in about {n} min" (Inter 16, `mist`, centred on x 152). This is the time, a fact the bar can't carry, in the Incubator's own context |

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
| 600 | the pod cracks: the renderer's one `crack` layer on the pod, held to 1000 |
| 1000 | the 180 ms dither to the `hatched` look: the species' opened pod (bowl and tipped cap, §5) on the moss, and the new mibi standing about 146 tall, feet on (532, 415) |
| 1200 | the ribbon: "{Name}, a young {Species}" (`strings.hatchRibbon`), rect 312, 56, 400, 40, the house ribbon |
| 1400 and 1800 | the two steps, each with the `lift` table as now (px above the feet line 415) |
| 2600 | the 180 ms dither to one mibi up close, in the meet (`handoff`, unchanged) |

- **The moving set** (`events.hatch.moving`) is not used on the capsule yet: every juvenile hatches by the plain steps (`results/T-20261016-222/uiux-rulings.md` §5).
- **Reduced motion:** the cut to the meet on the frame of ✓, as now.
- **The new mibi's picture:** the host renders it about 146 tall from its own looks, with its feet on its box's foot. It is relit to the capsule's roof lamp by the same function as `composite-juvenile.py` (warm from above, a rim on the crest, a contact shadow on the moss), in Node, before the props. Until it lands, its placeholder is used, as now.

## 5. Masters

All are the art director's (`capsule-masters.md`): cut once at the authority scale, registered to closed's frame, and reduced offline to ×0.85 for this view.
- **Registration:** every layer is in closed's frame, so nothing moves between states (the door was cut after a dy −19 translate). Nothing is cut from the incubate or hatch-now stills.
- **The cut masters, per view** (`results/T-20261017-incubator-object/masters/`, by `cut-capsule.py`, `dusk.py` and `reduce-views.py`):
  - `room/`: `capsule-{shell,shell-dusk,interior-day,interior-dusk,bar-lit,door-open,seal-ring}-530x532` and `capsule-room-{day,dusk}-1024x522`;
  - `create/`: the same capsule layers at 145 × 224 (×0.358, no room);
  - `home/`: the same capsule layers at 56 × 86 (×0.137, no room);
  - `panel/`: `capsule-{shell-dusk,interior-dusk,seal-ring}-296x459` and `capsule-room-dusk-474x468`;
  - the table of every view: `masters/views.json`.
- **The glass:** `capsule-glass-closed` per view (`room/` 530 × 532, `panel/` 296 × 459, `create/` 145 × 224, `home/` 56 × 86), an alpha highlight layer by the art director (`glass.py`).
- **The opened pod** (`masters/opened/`): the closed pod's own layer set at the `large` class, so the renderer composes it unchanged, in each species' colours. The **bowl** is 144 × 150 (shade, mask-body, mask-accent and every pattern-*). The **cap** is 104 × 128 (shade, an empty body mask, and accent for the whole cap). At the hatch the bowl's foot sits on the moss line at the pod's x, with the cap tipped against its left side. Both are relit to the roof lamp like the pod (owed by the build).

**Painted and confirmed** (a58d2827, `masters/` beside `capsule-masters.md`):
- `capsule-interior-day`: the empty moss bed, a clean studio edit;
- `capsule-interior-dusk`: the day interior graded to dusk by code;
- **the opened pod:** a bowl and a tipped cap in neutral, recoloured per species by the renderer like the closed pod's layers.

The hatch therefore shows the species' opened pod (bowl and cap) beside the juvenile from its step at 1000. Empty draws the bare moss bed. Every species' pod is drawn by the renderer.

**The masters are complete** (the art director). The build owes only the relight, the contact shadows and the moss blades for the pod, the opened pod and the juvenile.

**Other views of the capsule** (the same masters at their own reductions, set by the art director):
- **Create's chamber:** the capsule at ×0.358, 145 × 224 at (793, 104) inside `create.json regions.dome`, with the shell, interior, glass and bar and no room. The dome's floor moves to the moss line, **y 268**, and the pod is 72 tall.
- **Home's Incubator station picture:** ×0.137, 56 × 86, the pod 27 tall. At that size the bar reads only as a lit line, so **Home keeps its arc** beside a still capsule. The capsule shows the state only: the glass with the pod (growing), the door open (ready), or empty. Its bar is lit or off, never a fraction.

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

**The decision moments:**
- **Incubate** (on Create) opens the Incubate | Keep shaping panel (§6a). Its ✓ Incubate plays Create's grow event (unchanged), then lands on the Incubator's incubate moment (4.1).
- **Hatch now** is the Incubator's ✓ with its price, in place. Waiting is not pressing: ← Home, or simply staying. The bar and "ready in about {n} min" show what waiting means, so the game text's "Hatch now | Wait" panel is not built.

**Strings** (`incubator.json strings`):
- new: `readyIn` "ready in about {n} min";
- unchanged: `grow` "Hatch now", `open` "Open", `choose` "Choose a pod", `empty`, `noBay`, `noBayPlate`, `bud`, `crossBud`, `hatchRibbon`, `painting`, `offline`;
- `plaque` goes.

## 6a. The Incubate panel (on Create): Incubate | Keep shaping

A first build: no panel code exists on station-gate, so everything the panel needs is here.

### 6a.1 Where it lives

- **It is a state of Create, `confirm`,** not a screen of its own and not a jump. Create's state stays as it was under the panel, so closing it returns to Create exactly as it was, and the right window can show Create's own render.
- **How the face composes it** (an overlay over Create's own drawing, or a separate layer set) is the architect's ruling. Whichever it is, the player sees only the panel's composition below over the device ground, with the frame's top bar and bottom line.
- **The way in:** Create's ✓ **Incubate** (the bottom line's action in `shape` and `nothingRead`):
  - if `growBlock` holds (no bay free, a bud already growing, short of a material), the press is refused with Create's refusal plate, as now, and the panel does not open;
  - otherwise the 180 ms dither (16 levels) from Create to the panel, and `confirm` begins.
- **The way out:** ✓ Keep shaping, ←, or a room key, each with the dither back (§6a.4). ✓ Incubate goes on to Create's `grow` state (§6a.4).

### 6a.2 The composition (1× on 1024 × 600; the stage 0, 40, 1024, 522 is the device ground, `ground`)

| Element | Rect | Draws |
| --- | --- | --- |
| left bezel: **Incubate** | 16, 46, 490, 506 | fill `panel`, radius 10; 1 px edge `hairline`; the bevel: a 1 px `fog` line at y + 1 from x + 10 to x + w − 10 |
| right bezel: **Keep shaping** | 518, 46, 490, 506 | the same |
| header (each bezel) | x, y, w, 30 | the verb, Inter 16, `bone`, its baseline at y + 21, from x + 12 |
| Incubate's price | right-aligned to x + w − 12, in the header | icon before figure, as the bottom line draws a price: ⚡ {n} ❀ {n} ◆ {n} (icons 16, figures Inter 16 `price`; 4 between an icon and its figure, 12 between items; an item whose figure is 0 is left out). Last: **the founder's pod**, the renderer's collection pod reduced to 16 × 20, its top at y + 5. The pod is part of the price: it becomes the mibi. Keep shaping's header has no price |
| left window | 24, 76, 474, 468 | radius 6, a 1 px `void` inner edge. **The sealed capsule,** in order: `masters/panel/capsule-room-dusk-474x468` at (24, 76); `capsule-interior-dusk-296x459` at (116, 80); **this founder's pod**, 147 tall, its foot centred on the moss line y 416 at the capsule's axis x 264, relit with its contact shadow and the moss blades in front of its foot (as §1); `panel/capsule-glass-closed-296x459` at (116, 80); `capsule-shell-dusk-296x459` at (116, 80); `capsule-seal-ring-296x459` at (116, 80). Proof: `masters/proof-panel-incubate-474x468.png` |
| right window | 526, 76, 474, 468 | radius 6, a 1 px `void` inner edge. **Create as it is under the panel,** drawn at 1:1 and clipped to the window, offset so that Create's stage rect (275, 90, 474, 468) fills it: the founder centred, its edits lit in the scan light, and the rail and roll as they stand. No ring is drawn inside it |
| the focus ring | round the focused bezel | the house ring (`frame.json focus.ring`), shape `{ "rect": 10 }`: the bezel grown by its reach |

- **World size:** neither window shows a mibi in its world (a pod in its capsule; the founder on the workbench, a close-up), so the 54/40 size table does not apply. The founder keeps bench scale.
- **Words:** the two verbs and the price only. No title, no fact band, no line in either window.

### 6a.3 Focus and keys

| Focus | ◀ | ▶ | ▲ ▼ | ✓ sends | ← sends |
| --- | --- | --- | --- | --- | --- |
| `incubate` (initial) | none | `keep` | none | `confirm`, target `incubate` | `back` |
| `keep` | `incubate` | none | none | `confirm`, target `keep` | `back` |

- **The ring starts on Incubate,** the option the player came for, on the left. Both bezels are styled alike, and nothing is dimmed.
- **A room key** sends `room:<x>`: the panel closes as a cut (nothing spent), then the key acts as it would on Create.
- **Held:** during both dithers (in and out), and during `grow` after ✓ Incubate, the pad, ✓ and ← do nothing, and a room key waits, then acts.
- **This is also the guard:** ✓ Incubate is taken only once the dither in has ended. Incubate uses the pod and can't be undone, so a double press of Create's ✓ never passes through the panel.

**The bottom line in `confirm`:**

| Slot | Shows |
| --- | --- |
| action | ✓ and the focused verb: "Incubate" or "Keep shaping" (the price stands in the panel's header, not here) |
| context | empty |
| notice | empty |
| back | "Back" |

### 6a.4 Intents and what the host does

| Intent | The host |
| --- | --- |
| `confirm` on `incubate` | runs Create's grow exactly as Create's ✓ did before (`state.grow`, the same checks, price and log line: "Incubated {a} {species} founder · …"). The panel goes as a cut, and Create's `grow` state and `events.grow` play unchanged (the stamp prints, the pod travels to the dome), then the jump lands on the Incubator's incubate moment (§4.1). If the press is refused at this point (the state changed while the panel stood), the panel closes as a cut and Create shows its refusal plate; nothing is spent |
| `confirm` on `keep` | the 180 ms dither back to Create, its state as it was; nothing is spent |
| `back` | the same as Keep shaping |
| `room:<x>` | the panel closes as a cut, then the room key acts |

- **Reduced motion:** both dithers are cuts. ✓ Incubate then follows Create's reduced-motion grow (the jump on the frame of ✓).

### 6a.5 Strings (`create.json strings.panel`)

`incubate` "Incubate", `keep` "Keep shaping", `back` "Back".

### 6a.6 Masters

`masters/panel/` (`capsule-room-dusk-474x468`, `capsule-interior-dusk-296x459`, `capsule-shell-dusk-296x459`, `capsule-seal-ring-296x459`), the renderer's pod at 147 tall and at 16 × 20, and the frame's ring. The bezels and windows are drawn in code. No new painting.

## 7. Checks for the builder

- **The goldens** (once §5's cuts land): empty, growing (bar at 0, ½ and nearly full), ready, the incubate moment at 0, the hatch at 1000 and 1400, and Hatch now at 0 and 400. One Loika bud and one cross bud. The Incubate panel: focus on each bezel, with a Loika founder and a second species, and its dither in at 90 ms.
- **The per-frame dirty area:** each dither step (whole stage, ≤ 153,600 px a frame, as the house dither), the bar's fill step (8 cuts), and the hatch's lift steps. Print them.
- **Generators:** print each build-time cut's time and size.
