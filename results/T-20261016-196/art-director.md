# Negative marks and paint, swept: the art director's table (T-20261016-196)

**The owner's rule:** "you most avoid positioning something as negative, unless it indeed is."

- **What I searched.** Every use of `coral`, `red`, ✕, warning marks and bleak-painted outcomes, in the style guide and its plates, the Station's screen specs (`prototypes/ui/specs/station/`), the decision-panel spec, and the Companion's screens. Searched on station-gate and work-queue as they stand.
- **The test for "detrimental":** it harms the player or a mibi, so something is lost or damaged that the player didn't choose to trade. A choice between outcomes is not harm. Neither is a refusal that changes nothing.
- Nothing is changed in this ticket; each fix lands with its screen's own pass.

## The Station

| Place | Current | Detrimental | Proposed |
| --- | --- | --- | --- |
| Style guide §2, palette row `coral` | "loss words ("Gone for good.")" | no (the example is Return, a trade) | `coral` is kept for true harm only; the example goes |
| Style guide §2, palette row `red` | "a clash or loss mark, always with its cross" | no for a clash; no for Return | `red` and ✕ only where something is truly lost |
| Style guide §2, type rule | "loss words are `coral` on `ground`" | depends on the case | It stays, worded "harm words", and applies only where the table says yes |
| Style guide §4, Option card; §11, Decision panel | "one consequence line (a loss in the loss colour)" | no for every panel listed today (Return, Grow, Fit, Grow it now, Cross) | The line is never in the loss colour by default. A card is styled as a loss only when the outcome is harm |
| Plate 02a, the palette's signals | swatches `coral` "loss words", `red` "clash, loss mark" | n/a (labels) | Relabel both "harm only" |
| Plate 04a, the decision panel's DO | Return Fig small and far in the wild, walking away; "Gone for good." in `coral` | **no** | Redraw the DO from T-195: two homes, words cut, no coral |
| Plate 06 marks (`make-plates.py`) | "clash" and "gone for good" in `coral`, each with its cross | no, and no | Show the clash with the clash mark proposed below. "Gone for good" leaves the plate |
| Plate 09a, motion | the refusal (shake, message plate) keyed in `coral` | **no** (a refused press changes nothing) | The shake carries no colour; the plate's words in `mist`, or `amber` when the player must act |
| Create, a clash (station-layouts §Create; `create.json` `mark.clash`, `clashMark`, `strings.clash`) | a 6 px `red` ✕ in place of the chapter's pip; a 2 px `red` edge on the roll picture; the trait line in `red`, starting "✕ … won't grow like this" | **no.** Nothing is lost and no mibi is harmed; two chosen looks don't grow together, and ✓ is withheld until one changes | A "doesn't fit" mark (the two looks' notches parted, to be drawn in the Create pass) in `amber`, the frame's "needs you", since the player has to change one. ✓ stays withheld, and the notice says why |
| Decision panel spec: the card's `loss` flag, its line in `need` or `coral` with its cross; initial focus "neither dimmed nor a loss" | Return {name}, Return this pod: "gone for good" (loss) | **no** (a trade: the place remembers it, ❀ +2 or +1) | The `loss` flag is not set on either Return. Default focus is UI/UX's (T-195), never derived from "loss" |
| Decision panel spec: Sit for a portrait | "the loss line when a held sitting is lost" | **yes, if** pressing really discards a sitting already held (the game designer confirms) | The loss styling stays for that case only |
| Vivarium up close, Wild (layout 19e) | "Again: return Dot ❀ +2 · never taken back" | no | The arm is removed by the decision panel. The words are the game designer's |
| T-170 `P1-return.png` | dusk grade, Pip small and walking away, coral line with ✕, Keep as "the safe option" | **no** | Superseded by T-195; kept as the record |
| Short of materials (Station frame) | verb and ✓ cap in `mist`, the short figure in `amber`, a message plate | no (nothing is spent) | Stays: amber is "needs you", not harm. The plate never takes coral |
| The namer's refusals | the say line in `amber` for 4 s | no | Stays |
| The goal's pre-spend warning (`frame.json goalWarn`) | one `amber` line before a spend that would leave the goal short | no (a heads-up on a choice) | Stays in `amber`; it is never styled as danger |

## The Companion

| Place | Current | Detrimental | Proposed |
| --- | --- | --- | --- |
| The hit warning under the HUD | "Shield 2/3", ink panel with a `coral` line | **yes** (the Shield is damaged) | Stays |
| The hit frame | the view's edge frame on a hit | **yes** | Stays |
| The palette rule | "red only for danger and fruit"; storms go blue | **yes** where it is danger (fruit is a colour, not a mark) | Stays |
| The message box | "the lead word in its role colour: red for a warning" | **depends** on the warning | Red only for warnings of harm (a hit, the Shield). Other notices take their role colour, not red. The game designer lists the warnings |
| New world | a warning and a two-tap confirm | **yes, if** it discards the current world's map and progress (the game designer confirms) | Stays as a warning for that case |
| A refused step or press | the pawn's bump only, no flash, the reason in the band | no | Stays: already neutral |

## What stays negative, and why

- **The Shield damaged:** the hit warning and the hit frame.
- **Danger in the field:** the Companion's red.
- **Two cases, if the game designer confirms they truly discard something:** a held sitting lost, and New world.

Everything else on the lists above is a choice, a refusal that changes nothing, or a need. It takes the need's `amber` or no colour at all.

## Painted outcomes

Two outcomes were painted bleak, both Return (T-170's P1 and plate 04a's DO), and T-195 repaints it. No other decision, arrival or result in the plates or the screens is painted cold or as a farewell.
