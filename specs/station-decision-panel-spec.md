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

| Part | Rect | Type and colour |
| --- | --- | --- |
| Veil | the stage, 0, 40, 1024, 522 | The screen under the panel, dithered 8 of 16 levels toward `stageGround` (the frame's Bayer dither, one cut). The top bar and the bottom line are not veiled |
| Panel | 92, 80, 840, 440 | `plate` fill, `plateEdge` 2 px, radius 12, `plateShadow` 4 px down. Inside the device's interior (71–953 × 59–548) by 21 left and right |
| Picture | 124, 96, 64, 64 | What the decision is about (the founder, the pod, the mibi, the part), 1:1 at 64. Optional: with none, the title starts at 124 |
| Title | 204, 96, 696, 36 | 28, `plateText`, one line. "Grow this founder?" |
| Subtitle | 204, 140, 696, 20 | 16, `subject`, one line. What it is ("Loika, found at the pond edge · two changes") |
| Question | 124, 176, 776, 28 | 20, `plateText`, one line. The choice in words ("Grow it now, or keep shaping?") |
| Cards | y 216–440 (224 high), x from 124, gap 16 | 1, 2 or 3 cards across 776: one is 776 wide, two are 380, three are 248 |
| Hint | 124, 472, 776, 20 | 16, `subject`: "◀ ▶ choose · ✓ do it · ← {back words}". With one card: "✓ do it · ← {back words}" |

## 1.3 A card (an option)

Offsets are from the card's origin. The card is `plate` lightened by the focus state (`turn` on the focused card's edge), radius 10.

| Row | At | Content |
| --- | --- | --- |
| Name | (16, 12), w − 32 × 28 | 20. The option's verb phrase: "Grow it and watch", "Keep shaping". ≤ 4 words |
| Cost | (16, 52), w − 32 × 20 | 16, `price`: the icons and figures as on the bottom line (icon before figure). "nothing spent" in `subject` when free; "You get ❀ 2" for a gain |
| Outcome label | (16, 80), w − 32 × 20 | 16, `subject`: "You get", "You learn", "You keep" or "You lose" |
| Outcome | (16, 100), w − 32 × 60 | 16, `plateText`, up to 3 lines, pitch 20 |
| Then | (16, 172), w − 32 × 20 | 16, `subject`: "Then: {where you land}" ("Then: the Incubator", "Then: stay here") |
| Note | (16, 196), w − 32 × 20 | 16, `need` (amber), only for a loss: "the pod is used", "cannot be undone". Never a figure |

**Width limits** (measured with the real measurer, at 16 unless said):

| Cards | Card width | Text line limit | Name (at 20) |
| --- | --- | --- | --- |
| 3 | 248 | 216 | 216 |
| 2 | 380 | 348 | 348 |
| 1 | 776 | 744 | 744 |

**Long text:**
- **Outcome:** a fourth line never shows; the build's test fails with the string, and the copywriter shortens it. Never an ellipsis in a commitment.
- **Title:** at 28 it must fit 696, else it fails the same way.
- **Subtitle:** cut at a word with "…" (it only describes).

**Short of materials:** the card draws dimmed (the frame's `dim` role on its text, its cost figure that is short in `need`). ✓ on it does nothing and shows the frame's warn words on the message plate ("needs more ◆"), as the bottom line does today. A dimmed card can be focused and read.

## 1.4 Focus, keys, bottom line

- **Initial focus:** the first card that is neither dimmed nor a loss. If every card is one or the other, the way-out card. A panel always has a way-out card ("Keep shaping", "Keep it", "Not now"), or ← does it.
- **◀ ▶:** the previous and next card, stopping at the ends. ▲ ▼ do nothing.
- **✓:** does the focused card. The panel closes as a cut, and the card's event plays as today's event did.
- **←:** closes the panel with nothing spent; the screen is as before the panel. The bottom line's back slot reads "Back" (its 68 px room cannot hold "Keep shaping"; frame `back.roomRule`); the hint says the words.
- **Room keys:** close the panel with nothing spent, then act as everywhere.
- **The ring:** the focused card's rect, the frame ring `{ "rect": 10 }`, 4 px out. No lift.
- **The bottom line while the panel is open:**
  - action: ✓ + the focused card's name + its cost;
  - subject: "to {Then}" (≤ 6 words);
  - need: what is short, if anything;
  - back: "Back".
  
  The line and the panel never disagree, because both read the focused card.
- **Reduced motion:** the panel already opens and closes as a cut, so nothing changes.
- **Dirty area:** opening or closing redraws the whole stage once (the veil), which counts as a screen change, not an animation frame. A focus move redraws the two cards' boxes (≤ 2 × 256 × 232 = 118,784 ≤ 153,600).

## 1.5 The component, for the face

- **A frame word `decisionPanel`** built from existing words: a plate, text, a picture slot and the ring.
- **Spec home:** `frame.json regions.panel` holds every number in §1.2–1.4.
- **Props:**
  - `panel` { id, picture, title, subtitle, question, cards: [{ id, name, cost, outcomeLabel, outcome, then, note, dim, loss }], focus, back };
  - each screen's view fills `panel` when its state says a panel is open (`ui.panel`). The host sends the intent `panel:<card id>` on ✓, and `panel:back` on ←.
- **One owner of the open state:** `ui.panel = { screen, id, focus }`. A screen change, a room key and ← clear it.

## 1.6 The panels

The words are the UI designer's placeholders, for the copywriter. The costs are the rules' (`state.mjs`), never typed into the strings.

| Panel | Screen, opened by | Cards (name · cost · outcome · Then · note) |
| --- | --- | --- |
| **Grow it** | Create, ✓ Grow it | See §3 for the two jump modes. Arrival mode: **Grow it** · growCost · "a {Species} bud with your {n} changes; {chapters} stay a surprise until it grows" · the Incubator · "the pod is used" · **Keep shaping** · nothing spent · "the bench as it is" · stay here |
| **Hatch and name** | Incubator, at the hatch's end (it replaces the jump; no press opens it) | **Keep "{name}" and say hello** · nothing · "{name}, a young {Species}, up close" · the Vivarium, up close · **Choose another name** · nothing · "the name keys open" · the namer · **Keep "{name}", go Home** · nothing · "it settles in the Vivarium" · Home. No way-out card: the hatch is done, and ← is "Keep and say hello" |
| **Return to the wild (mibi)** | Vivarium up close, ✓ on Wild | **Return {name}** · "You get ❀ 2" · "gone for good; its place remembers it and later sheds one pod of its line" · the Vivarium · "cannot be undone" · **Keep {name}** · nothing · "it stays home" · stay here. Replaces the "✓ again" arm |
| **Return to the wild (pod)** | Pods, ✓ on the leaf plate | **Return this pod** · "You get ❀ 1" · "its well frees; the pod goes back to the {place}" · your pods · "cannot be undone" · **Keep it** · nothing · "it stays in its well" · stay here. Replaces the arm |
| **Fit the upgrade** | Probe bench, ✓ on the slot | **Fit it** · ⚡ 12 ◆ 4 · "the Probe reaches further, carries three pods and four plates" · stay here · **Not now** · nothing · "tier 1 as it is" · stay here. Replaces the arm |
| **A large Grow now** | Incubator, ✓ Grow now when its price is **more than ❀ 4** (game designer to confirm the threshold) | **Grow it now** · ❀ n · "it is ready at once" · stay here (ready) · **Wait** · nothing · "ready in about {n} min" (the one minute count, owner ruling 3) · stay here. At ❀ 4 or less, ✓ Grow now acts at once, as today |
| **Cross them** | Cross, ✓ Cross them | **Cross them** · crossCost · "one child, its own mibi; {forecast in words}" · the Incubator · **Pick another** · nothing · the partners · stay here. The jump modes as Grow. **Waits for the Cross screen** (not in `BUILT` at 54bde362) |
| **Spend a sitting** | Vivarium up close, ✓ on Portrait | **Sit for a portrait** · the sitting · "a portrait comes to the bay in a few hours" · stay here · "{the held sitting} will be lost" when one is held · **Not now**. **Waits for the sitting screen** |

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
  - the panel has three cards: **Grow it and watch** (Then: the Incubator), **Grow it, then my pods** (Then: Pods, the collection, the ring on the next pod), **Keep shaping**;
  - both grow cards spend the same and play the same Grow event; only the landing differs;
  - no arrival plate.
  
  Wireframe: `grow-fork.png`.
- **What the owner compares:** press count (the same), whether the landing ever surprised them, and whether a third card slows the Grow decision.
- **The record:** the build records which card was pressed in the session's log (`logEv`), so the owner's own play can be read back.
- **Other jumps:** the same flag will apply to Cross them once Cross is built. Home's "what needs you" ✓ always uses the arrival plate (both designers agree it is a jump by nature).
