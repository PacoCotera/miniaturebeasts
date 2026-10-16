# The decision panel and the ceremony cuts (UI/UX spec)

Ticket T-20261016-45, 2026-10-16 (America/Mexico_City). Base: station-gate 54bde362. It builds the work list of `specs/station-decision-points.md` (T-44, accepted).

The owner, 13:19: "allowing the user be intentional, show the options and costs, and the actions and outcomes makes the game more engaging, invites to explore and make choices."

Wireframes: `specs/station-decision-panel/grow-fork.png` and `grow-arrival.png` (the two jump modes, §3).

Build tickets: T-20261016-49 (the panel and the Grow it panel, with the jump flag), T-50 (the ceremony cuts), and T-51 to T-56 (one per remaining panel).

**Binding:**
- **Type:** `frame.json type`. Three sizes, each with its own weight: 16 at 400 (pitch 20), 20 at 500 (pitch 28), 28 at 600 (pitch 36). There is no bold 16. Every label in this spec is 16 at 400 in the label colour, or 20.
- **Colours:** existing roles only.
- **Art:** no new art. The panel is drawn in code from the message plate's roles (`plate`, `plateEdge`, `plateShadow`, `plateText`).

# Part 1. The decision panel (one component)

## 1.1 When a panel opens, and when it never does

A panel opens only at a **commitment**: something spent that cannot be had back, something lost, or a fork that leads to different play. These are the work list's Panel rows (§1.6).

- It never opens for navigation, a free action, a repeatable action, or a small spend whose price is already on the bottom line (Identify, Read, Mend: the game designer's list).
- It never opens with no option. A caller with nothing to offer does not open it.
- It opens by the press that today commits, so the commitment costs one press more than today (✓ opens, ✓ does) or the same as today where a "✓ again" arm is replaced.

## 1.2 Geometry (screen pixels, the 8 px grid)

The owner, 13:26: "good with the big panels, visually we must make them very interesting. not sold on that cream color and lots of text."

**Picture-led:** each option shows its outcome as the thing itself (the founder, the bud, the young mibi, the pod, the place). Costs are the kit's icons with their figures. Each option has at most one short line. There is no cream paper card.

**The look is the art director's** (T-20261016-47): the panel's ground, edge, card wells and the veil's treatment. This spec gives the structure, the rects and the words budget. Until T-47's masters land, the build draws the panel in `stageGround` with a `plateEdge` edge and the cards as wells in `chrome`, never in `plate` (the cream).

| Part | Rect | Words budget |
| --- | --- | --- |
| Veil | the stage, 0, 40, 1024, 522 | The screen under the panel, dithered 8 of 16 levels toward `stageGround` (one cut), unless T-47 gives another treatment. The top bar and the bottom line are not veiled |
| Panel | 92, 80, 840, 440 | T-47's panel master (a nine-slice at any of these sizes), radius 12 |
| Title | 124, 96, 776, 36 | 28, one line, **≤ 4 words**: the decision ("Grow this founder?"). No subtitle, no question line |
| Cards | y 152–440 (288 high), x from 124, gap 16 | 1, 2 or 3 cards across 776: one is 776 wide, two are 380, three are 248 |
| Keys | none drawn in the panel | The bottom line says ✓ and ← (§1.4) |

## 1.3 A card (an option)

Offsets are from the card's origin. Its ground is T-47's card well.

| Part | At | Content | Budget |
| --- | --- | --- | --- |
| Picture | (16, 16), w − 32 × 160 | **The outcome as the thing itself**, 1:1 and never scaled, bottom-centred on the slot's floor (y + 168). Each panel row names its picture (§1.6). A way-out card shows what stays (the founder as it is, the pod in its well) | — |
| Destination mark | (w − 40, 16), 24 × 24 | The title bar's mark of the room it lands in (`frame.json regions.title.marks`: Home, Research, Vivarium, Library), over the picture's top right. Staying here: no mark | — |
| Name | (16, 184), w − 32 × 28 | 20. The option's verb | **≤ 3 words** |
| Costs | (16, 216), w − 32 × 20 | The kit's 16 px icons with their figures (icon before figure, pitch as the bottom line), in `price`. A gain is the icon with "+n" in `turn`. Free: nothing drawn | ≤ 4 groups |
| Line | (16, 244), w − 32 × 20 | 16, `subject`: the one thing the picture cannot say ("Stamina stays a surprise"). A loss shows its line in `need` instead ("gone for good"). Optional | **≤ 6 words, one line**, never a figure |
| (free) | (16, 268) to the card's foot (288) | — | — |

**Width limits** (measured with the real measurer):

| Cards | Card width | Name and line limit | Picture slot |
| --- | --- | --- | --- |
| 3 | 248 | 216 | 216 × 160 |
| 2 | 380 | 348 | 348 × 160 |
| 1 | 776 | 744 | 744 × 160 |

A string over its limit or over its word budget fails the build's test with the string, and the copywriter shortens it. There is never an ellipsis in a panel.

**Short of materials:** the card draws dimmed (the frame's `dim` role on its name and line; the short cost figure in `need`). ✓ on it does nothing and shows the frame's warn words on the message plate ("needs more ◆"). A dimmed card can be focused and read.

## 1.4 Focus, keys, bottom line

- **Initial focus:** the first card that is neither dimmed nor a loss. If every card is one or the other, the way-out card. A panel always has a way-out card ("Keep shaping", "Keep it", "Not now"), or ← does it.
- **◀ ▶:** the previous and next card, stopping at the ends. ▲ ▼ do nothing.
- **✓:** does the focused card. The panel closes as a cut, and the card's event plays as today's event did.
- **←:** closes the panel with nothing spent; the screen is as before the panel. The bottom line's back slot reads "Back" (its 68 px room cannot hold longer words; frame `back.roomRule`). The way-out card names it in the panel.
- **Room keys:** close the panel with nothing spent, then act as everywhere.
- **The ring:** the focused card's rect, the frame ring `{ "rect": 10 }`, 4 px out. No lift.
- **The bottom line while the panel is open:**
  - action: ✓ + the focused card's name + its cost;
  - subject: the focused card's line, else "to {the room}" when it has a destination mark (≤ 6 words);
  - need: what is short, if anything;
  - back: "Back".
  
  The line and the panel never disagree, because both read the focused card.
- **Reduced motion:** the panel already opens and closes as a cut, so nothing changes.
- **Dirty area:** opening or closing redraws the whole stage once (the veil), which counts as a screen change, not an animation frame. A focus move redraws the two cards' boxes (≤ 2 × 256 × 296 = 151,552 ≤ 153,600).

## 1.5 The component, for the face

- **A frame word `decisionPanel`** built from existing words: a plate, text, a picture slot and the ring.
- **Spec home:** `frame.json regions.panel` holds every number in §1.2–1.4.
- **Props:**
  - `panel` { id, title, cards: [{ id, picture, mark, name, costs: [{ icon, figure, gain }], line, loss, dim }], focus, back };
  - each screen's view fills `panel` when its state says a panel is open (`ui.panel`). The host sends the intent `panel:<card id>` on ✓, and `panel:back` on ←.
- **One owner of the open state:** `ui.panel = { screen, id, focus }`. A screen change, a room key and ← clear it.

## 1.6 The panels

Per card: picture · destination mark · name · costs · line. The words are the UI designer's placeholders for the copywriter, inside the budgets above. Costs come from the rules (`state.mjs`), never from the strings.

| Panel (title) | Opened by | Cards |
| --- | --- | --- |
| **Grow this founder?** | Create, ✓ Grow it | Arrival mode (§3): **Grow it**: the founder's juvenile picture (104 × 112) on the bud, mark Research (Incubator), growCost icons, "{chapters} stay a surprise". **Keep shaping**: the founder on its dish as it is, no mark, no cost, no line. Fork mode: two grow cards (§3) |
| **{Name} hatched!** | Incubator, at the hatch's end (no press) | **Say hello**: the young mibi (104 × 112), mark Vivarium, "keeps the name {name}". **Rename it**: the young mibi with the namer's field, no mark, no line. **Go Home**: the young mibi in the Vivarium window (Home's panel crop), mark Home, "keeps the name {name}". ← is Say hello |
| **Return {name}?** | Vivarium up close, ✓ on Wild | **Return it**: the mibi walking into its place's painting (`place-{g}-64x64` behind the mibi at 104 × 112), mark Vivarium, ❀ +2, "gone for good" (loss). **Keep {name}**: the mibi as it is, no mark, no line |
| **Return this pod?** | Pods, ✓ on the leaf plate | **Return it**: the pod over its place (`place-{g}-64x64` with the pod at 88 × 112), mark Research, ❀ +1, "gone for good" (loss). **Keep it**: the pod in its well, no mark |
| **Fit the upgrade?** | Probe bench, ✓ on the slot | **Fit it**: the part fitted (`bench-part-t2-fitted-128`) with the adds' icons, no mark, ⚡ 12 ◆ 4, "reaches further". **Not now**: the part dimmed (`bench-part-t2-dim-128`) |
| **Grow it now?** | Incubator, ✓ Grow now above ❀ 4 (the game designer confirms) | **Grow it now**: the pod at its ready step, ❀ n, "ready at once". **Wait**: the pod at its current step, no cost, "ready in about {n} min" (the one minute count, owner ruling 3) |
| **Cross them?** | Cross, ✓ Cross them | **Cross them**: the two parents' faces over the bud, mark Research, crossCost, "{forecast in ≤ 6 words}". **Pick another**: the partners' faces. **Waits for the Cross screen** |
| **Sit for a portrait?** | Vivarium up close, ✓ on Portrait | **Sit for it**: the mibi at 104 × 112 beside the held sitting frame (`sitting-frame-held-48x40`, 1:1), the sitting icon, "a portrait in a few hours", or the loss line when a held sitting is lost. **Not now**. **Waits for the sitting screen** |

# Part 2. The ceremony cuts and the "on the page" rows

The work list's ranking (1–7), per screen: what changes in the bottom line, the plates and the intents.

| # | Cut | Bottom line | Plates | Intents (station-gate 54bde362) |
| --- | --- | --- | --- | --- |
| 1 | Home → Cargo → Open the bay | Home's action on the crates need: "✓ Open the bay" (was "Open Cargo") | none | `home.mjs doNeed`: act `cargo` → `goto("cargo")`, then Cargo's `openBay(h)` on the same key |
| 2 | Home → Incubator → Open | Home's action on `budReady`: "✓ Open the bud" | none | `doNeed` act `incubator` with the bud ready → `goto("incubator")`, then the Incubator's open intent on the same key (the hatch plays, then the Hatch and name panel) |
| 3 | "✓ again" double presses | The arm's lines (`hatchAgain`, "Again: return {name}", "Again: fit the upgrade") go | the arm's message plates go | `pods.mjs` hatch, `habitat.mjs` wild and `bench.mjs` slot: the first ✓ opens the panel; the arm state (`wildArm`, `arm`) is deleted |
| 4 | Eaten presses during the bay's opening and the hatch | During the hold the line shows "✓ Skip" | none | `cargo.mjs`: in `opening`, ✓ cuts to the report. `incubator.mjs`: in the hatch hold, ✓ cuts to the hatch's end (the panel). A room key is still kept for the hold's end, as now |
| 5 | Jumps after Grow it, Cross them, the hatch | as each panel | none | Grow: §3. The hatch: the panel replaces the jump. Cross: with its screen |
| 6 | "Open" for four acts | "Open" stays only for the bay ("Open the bay") and the bud ("Open the bud"). Home's modules read "Go to Cargo", "Go to the Incubator", "Go to the Vivarium", "Go to the Probe", "Go to the Library". Pods' collection: "Look at this pod". A chapter tab on the overview: "Turn to {chapter}" | none | strings only: `home.json` :205–211 and `strings.needs`, `pods.json` (the collection's action, `openChapter`), `incubator.json strings.open` → "Open the bud" |
| 7 | The bare "Keep Moss" | gone (the panel's cards) | none | `habitat.mjs`: the meet's first ✓ no longer opens the namer; the panel's "Choose another name" does |

**The "on the page" rows.** They need no panel, because each is a choice already drawn where it is made. What they lack is the outcome before the press. The rule: **the bottom line's subject zone says the focused action's outcome**, in ≤ 6 words, wherever ✓ spends or commits. The action zone already says the verb and the price.

| Screen, focus | Action (as now, after cut 6) | Subject (new) |
| --- | --- | --- |
| Pods, a sealed pod | ✓ Identify ◆ 1 | "the species shows" (a first: "a new species") |
| Pods, a chapter tab (unread) | ✓ Read {chapter} ◆ n | "both copies of its traits" |
| Pods, an identified pod | ✓ Shape a founder | "nothing spent until Grow" |
| Pods, the leaf plate | ✓ Return to the wild ❀ +1 | "choose on the next screen" (the panel) |
| Create, a drum | (no ✓ cap: ▲ ▼ turn) | "{Trait}: {look}" (as the Create spec) |
| Incubator, growing | ✓ Grow now ❀ n | "ready in about {n} min" (the existing context; owner ruling 3) |
| Vivarium up close, Companion | ✓ Take with you / Bring home | "goes at the next dock" / "home at the next dock" |
| Probe bench, the plates | ✓ Mend a plate ⚡ 1 | "Shield {n} of {m} for the trip" |
| Library, a look | ✓ Pin it | "its pods and pairs glint" |

- **The subject zone:** 208 px, 6 words, shrinks (frame `subject`); each string is measured.
- **Gaps:** Cross's partner row and the sitting are not built at 54bde362, so their rows wait for those screens.
- **Pods' "Grow it as it is":** a new action from Pods in the work list. It is **not specced here**, because it is a rule change (growing from Pods without Create) for the game designer to rule first.

# Part 3. The jump test on Grow → Incubator (one flag)

- **The flag:** `settings.jump` ∈ { `"arrival"`, `"fork"` }, default `"arrival"`. The play page reads `?jump=fork` or `?jump=arrival` into it (and the Station's developer menu shows it, if there is one). It is saved with the settings.
- **`arrival`:**
  - the Grow it panel has two cards (Grow it, Keep shaping);
  - Grow it jumps to the Incubator as today;
  - on arrival, the frame's message plate shows **"Incubator: your {Species} bud is growing"** for 2000 ms (frame `plate`, which normally shows for 4000), with no press;
  - any key dismisses it and acts;
  - ← on the Incubator, while the plate shows or until another key, returns to **Pods, this pod's place** (where the jump came from) instead of Home. After that, ← is Home as now.
  
  Wireframe: `grow-arrival.png`.
- **`fork`:**
  - the panel has three cards: **Grow and watch** (mark Research: the Incubator), **Grow, keep reading** (mark Research: Pods' collection, the ring on the next pod), **Keep shaping**. The two grow cards share the picture and the cost; their marks and their one line ("watch it in the Incubator" / "back to your pods") differ;
  - both grow cards spend the same and play the same Grow event; only the landing differs;
  - no arrival plate.
  
  Wireframe: `grow-fork.png`.
- **What the owner compares:** press count (the same), whether the landing ever surprised them, and whether a third card slows the Grow decision.
- **The record:** the build records which card was pressed in the session's log (`logEv`), so the owner's own play can be read back.
- **Other jumps:** the same flag will apply to Cross them once Cross is built. Home's "what needs you" ✓ always uses the arrival plate (both designers agree it is a jump by nature).

# Amendments (T-20261016-67, 2026-10-16): what T-50 could not build at its base

**Cut 4, ✓ skips a hold, is a face rule.** The face drops every key but a room key while an event holds input (`face/src/screens/screens.c screens_key`, `anim_holding()`). Today only events with `cut: true` end on a press, and only when nothing holds.

**The rule:**
- An event may carry **`"skip": true`**. While it holds input, the face takes ✓ (and only ✓) as the intent `skip` on the event's target. It cuts the event to its last frame (as `anim_cut` does) and says it done on that frame.
- The host ends the hold at once and runs what follows the event's end on the same frame, exactly as reduced motion does with hold 0.
- A room key during the hold behaves as now.
- **Which events get it:** only the bay's opening (`cargo.json events.byCrates`) and the hatch (`incubator.json events.hatch` and `hatch.moving`). Both have a fixed end state: every crate opened and the report, or the hatched mibi and what follows.
- **Which do not:** growNow (400 ms), the install and the mend are not worth a skip and stay as they are.
- **The line** shows "✓ Skip" only while a skippable hold runs.

It is the architect's: T-20261016-90 (the face, the wire, the host's hold end, the `design/proposals/lvgl-switch.md` entry and the two events). T-50 no longer carries cut 4.

**The "on the page" rows, against the code at the T-50 base:**

| Row | Disposition |
| --- | --- |
| Pods, the leaf plate | Goes with the Return panel, T-20261016-51. The line stays as built until the panel replaces the arm |
| Create, a drum | Goes with the gene bench, T-20261016-42. There is no drum at this base |
| **Incubator, growing** | **T-50 builds it:** while a bud grows, the context zone says "ready in about {n} min" (n = the minutes left rounded, at least 1) instead of the bud's name. Ready keeps `strings.bud`. This is owner ruling 3; the Incubator option B build (T-40) keeps the same line |
| Vivarium, Take or Bring; Library, Pin it | Go with those actions when they are built. Nothing at this base |
| **Probe bench, the plates** | **T-50 builds it, reworded to 6 words:** "the Shield takes {n in words} strikes", with n = the whole plates *after* this press (the mend's result), so the line says what the press buys |
