# T-195: the words, the title and the default focus (UI/UX part)

This part is built on the game designer's verbs and single fact (`results/T-20261016-195/game-designer.md`). Two layouts at 1× show the words and focus only. The windows are still T-170's pictures until the art director repaints them:
- `ui-ux-release-words.png`
- `ui-ux-grow-words.png`

## 1. Words: the minimum

| Place | Before (T-170) | Now |
| --- | --- | --- |
| Title | "Return Pip?" / "Grow this founder?" | **none** (§2) |
| Verb | "Return it" / "Keep Pip" | "**Release Pip**" / "**Keep Pip**": both name Pip, parallel (the game designer) |
| Icons | gain or cost, right of the verb | unchanged; an option with nothing to pay or gain shows no icon, and that blank says "nothing spent" |
| Line | one sentence in every window ("Gone for good…", "Stays with you.", "The pod is used.", "Nothing is spent.") | **only the one fact no picture can carry:** Release's "Pip lives in the wild from now on", in `bone`, the ordinary text colour. Grow, Keep and Keep shaping get no line |
| Bottom line, middle | "to the Incubator" | **empty on a panel.** The carry after ✓ shows where the pod goes |
| Bottom line, ← | the safe option's verb ("Keep Pip") | "**Back**" (§3) |

- **The Release panel goes from about 20 words to 13:** two verbs, one fact, and the bottom line's verb and "Back".
- **Grow goes to 7.**
- **No coral and no ✕ anywhere.** Coral stays reserved for a real failure: a press that can't be paid, or a refusal.

**Layout** (the panel stays 840 × 440 at (92, 80); there is no title row now):

| Element | Rule |
| --- | --- |
| Cards | 380 × 376 at y 112, x 124 and 520, so the panel has a 32 margin on all sides. Three cards are 248 wide at x 124, 388 and 652 |
| Windows | w − 16 at (8, 8), **312 tall**, or **280** when any card in the panel carries a fact, so the windows in a panel always match |
| Verb | 20 px at (16, window + 36), with the icons right-aligned on the same baseline |
| Fact | 16 px at (16, window + 64), one line |

## 2. The title question goes

- **It frames the choice.** "Return Pip?" proposes one option and makes the other the refusal, which is the asymmetry the owner objected to. Two verbs side by side already ask the question, each in its own words.
- **Context is not lost.** The screen's title and the veiled scene behind the panel say where you are. Both verbs name the subject ("Release Pip", "Keep Pip").
- **The windows gain the row.** Without the title they grow from 240 to 312 (280 with a fact). The pictures carry the meaning, so they get the room.

## 3. The default focus, without a "safe" option

- **Focus starts on the option the player came for:** the verb that opened the panel ("Release" on the Wild module, "Grow it" on Create, "Fit it", "Grow it now", "Open the bay"). It always sits on the left; the other future sits on the right.
  - This replaces §1.4's "the first card that is neither dimmed nor a loss": with no losses, that rule has nothing to sort by.
- **Both cards are styled alike.** The same ground, hairline, verb colour and window frame. The house ring alone marks focus. Nothing is dimmed, and neither card is lifted except by the ring.
- **The guard sits in the press, not the paint.** Opening the panel already costs one extra press (it replaced "✓ again", `specs/station-decision-panel-spec.md` cut 3). For an irreversible option, ✓ is also not taken until the panel has settled (its open, per guide §9). A double press from the module can't fall through into Release. That is the whole guard: no hold, no second confirm, no warning colour.
- **← reads "Back"** and closes with nothing changed. It isn't labelled with one option's verb, so neither option becomes the exit. ("Back" is also what the slot's 68 px room holds; `frame.json back.roomRule`.) This amends T-181's panel row, "the safe option's verb".

## 4. The rest of the set (round 2, in the same language)

| Panel | Left, focused | Right | Fact |
| --- | --- | --- | --- |
| Fit the upgrade | Fit it, cost icons | Not now | none (the windows show tier 2 against tier 1) |
| Grow it now | Grow it now ❀ 3 | Wait | none (the wait is the window: the pod at its current step) |
| The dock arrival | Open the bay | Later | none (the crates against Home's Cargo lamp) |

The game designer confirms these verbs from the rewritten scene list.

## 5. Asks

- **The art director:** the pictures carry what the lines carried:
  - Release as Pip at home in the wild, in its own light;
  - the empty cost slot read as "nothing spent".
- **The game designer:** the left/right order for round 2. The rule is that the option the player came for goes left.
