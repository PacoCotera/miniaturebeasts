# The flow pass: the pod carried, notices on target, ← names its place, panels only at real decisions (UI/UX)

Ticket T-20261016-181, 2026-10-17. Decided in `specs/station-experience-review.md` §6. The meanings are the game designer's sign-off in `specs/flow-transitions-proposal.md`, which this spec turns into tables and wireframes. The look of the carry is the art director's row in the guide's §9: **its timing is "per §9" everywhere below, and is not chosen here.** Wireframes at 1×, on slate, in flow order: `specs/flow-pass/01` to `12`. Build: T-20261016-182, alongside T-177.

**The journey in one line:** a notice on Home → the crates open (Cargo) → the pods fly to their wells (Pods) → a pod lifts to the bench (Create) → it seals and goes to the chamber (the Incubator) → a reveal while it grows → the hatch → the young mibi walks into the Vivarium. The player follows one object, not menus.

## 1. ← names where it goes (the key table)

**The rule.** ← goes one step back along the path that led here, and the bottom line names that place: the screen's title, or a subject's name where the screen is about one subject. Nothing on the Station's bottom line reads "Back".

| Case | ← goes to | ← reads |
| --- | --- | --- |
| A room entered from Home, or from a Home or Idle notice | Home, with the ring on that room's module | **Home** |
| A screen inside a room (one step down the tree) | Its parent in `frame.json navigation.screens`, with the ring on the thing that opened it | the parent's title or subject: **Pods**, **{pod}**, **Vivarium**, **{name}**, **Library** |
| After a jump (Grow → the Incubator, Open the bay → Pods, the hatch → the Vivarium) | Where the jump came from, until the player moves on | that screen's title |
| …if the action used up that screen's subject (the pod grown, the crates opened, the bud hatched) | The step before it, or Home; never an empty bench, bay or chamber | the step before, or **Home** |
| A decision panel | Closes with nothing spent | **the safe option's verb** (Keep Fig, Keep shaping, Wait, Not now, Later) |
| The sitting's steps | One step back (place → pose, look and confirm → place); from the pose step, the Vivarium | the step's name; **Vivarium** |
| Inside a text field (the namer) | Edits the field, as today | **Delete** / **Clear**; leaving the field reads where it goes. This is the one named exception: ← here is the field's own key |
| During a carry | Waits until the screen has settled, then as above | — |
| Home | Nothing (the top of the tree): no ← cap | — |
| Idle | The first press only wakes | — |

**What changes from today** (the device sheet):
- panels' "Back" becomes the safe option's verb;
- Cargo's report "Cargo" goes, since the report card is gone (T-164);
- a jump's return is now the source until the player moves on, with the used-up skip;
- the Incubator after Grow reads **Home** (the bench is empty), not "{pod}".

**Into `frame.json navigation`:** each screen gains `back.rule` (`parent`, `jumpSource` or `panelSafe`), and a jump records `from` on entry. The table above is the test list.

## 2. A notice lands on what it named

**The rule.** ✓ on a Home module's notice, or on Idle's line, opens the target screen **with the focus on the thing it named and ✓ ready to do it**. When it clears is the game designer's "seen" rule:
- an event clears once its own thing is on screen after the screen settles (after any carry);
- a steady wait clears only when acted on;
- each notice clears only its own thing.

| Notice (Home's line) | Opens | Focus and ✓ | Clears when |
| --- | --- | --- | --- |
| "two crates wait in the bay" (steady) | Cargo, the crates start at once (**no dock panel**: the choice is made) | the first crate; ✓ Take it all in | the crates are opened |
| "{Chapter} cleared on your {species}" (event) | The Incubator | the reveal pane (ring on it) | the reveal is on screen after the screen settles |
| "your {species} is ready" (steady) | The Incubator | the pod; ✓ Open | it is opened |
| "{name}'s portrait has come" (event) | Cargo, the portrait crate | the crate; ✓ Open it | the crate is on screen |
| "{name} has grown up" / "{name} is an elder now" (event) | The Vivarium, up close on that mibi | the mibi; ✓ Look at {name} | that mibi is on screen up close |
| "watch a resident today" (steady, last in order) | The Vivarium | the first resident; ✓ Watch | today's Data is earned |
| Idle's line | The same as Home's, for that line | as above | as above |

Wireframes `01`, `02` (crates from the notice) and `09` (a chapter cleared lands on the reveal).

## 3. Panels only at real decisions

**The list** (the game designer, exact): Grow it; Cross them; Return to the wild; Fit the upgrade; a large Grow now; Spend a sitting; Read it now (▲▼ on an unread gene on Create); and the dock choice (P1, after the show; ← is Later; no panel on an empty trip; none from Home's ✓ on "two crates wait").

**Everything else is one press:** Identify, Read and Mend show their price on the bottom line before the press, and the press spends. **Gone everywhere:** the second confirmation, the toast that repeats a result, and "✓ again" arming. The result lands where it happens and the counters tick as the record. For Return to the wild, the panel's window is the record, and the Vivarium shows the gap once, on the next visit. Panels use P1 (`specs/station-decision-panel-spec.md`, the T-165 amendment); ✓ carries the focused option's verb and price.

Wireframe `12`.

## 4. The pod carried through the four hand-offs

The same shell (the species' one pod, §2 rule 4) moves across the screen change. **On these four hand-offs the carry replaces the 2 s arrival ribbon.** The ribbon stays only for jumps with no carry. A room change from Home keeps the title cross-fade and the stage cut (guide §9).

| Hand-off | Leaves | Arrives | Focus after | ← after | Wireframes |
| --- | --- | --- | --- | --- | --- |
| 1. Cargo → Pods | each pod flies to the Pods hatch (bay, right) | Pods opens; the pod comes in at the right edge and settles into its free well | that pod's well | Home (the crates are used up) | `03`, `04` |
| 2. Pods → Create (✓ Create from this pod) | the pod lifts out of its well toward the right | it lands in Create's socket (the founder's recess, bottom left) as the genome column lights | the first gene | **{pod}** | `05`, `06` |
| 3. Create → the Incubator (after the Grow panel's ✓) | the stamp prints in the column; the pod seals and slides out at the right | it comes in from the left and is clamped upright in the chamber | the pod | **Home** (the bench is used up) | `07`, `08` |
| 4. The hatch → the Vivarium (✓ Say hello) | the young mibi steps out of the chamber and walks right | it walks in from the left to its spot | that mibi | **Home** (the chamber is used up) | `10`, `11` |

- **Timing:** per §9, the art director's carry row (not yet in the guide on `style-guide-t172`). The build waits for it; no figure is chosen here.
- **With reduced motion:** the carry is a cut, with the pod already in place, as every motion in §9.
- **Keys during a carry** are consumed, as every motion in §9, and ← waits until the screen settles.

## 5. The gate test (the creative director's, as one flow)

Read `01` to `12` in order. "I can follow my pod from the crate to the Vivarium. Every notice takes me to the thing it named. ← always says where it goes. I am only asked to choose when it matters."
