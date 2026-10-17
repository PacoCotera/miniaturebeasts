# Two outcomes of equal standing: the art director's part, round 1 (T-20261016-195)

The owner's ruling on T-170: Return read as a loss, and the panel leaned on text. This round repaints Return as a good outcome in its own right, and proposes how the icons and pictures carry what the sentences carried. Composited from accepted art (`make-r1.py`, which reuses T-170's pane, card and price code), with no generated pixels.

| | Shows |
| --- | --- |
| `R1-return.png`, `R1-return-covered.png` | Return and Keep, words shown and covered |
| `R1-grow.png`, `R1-grow-covered.png` | Grow and Keep shaping, words shown and covered |
| `device-sheet-decision-r1.png` | the decision row: both panels, words shown beside words covered |

## Return: two homes, not a farewell

- **What T-170 got wrong.** Its Return window said "loss" before any word did: dusk, a cold grade, Pip small and walking away, footprints leading out of frame. Beside it, Keep was big, warm and asleep. The picture made the choice for the player.
- **Return now.** Pip is at its pond, bounding along a mossy bank toward two of its own kind, who are already there, in open daylight with the water behind. It is the wild, and Pip is going home to it. The story is "back to its kind", not "away from you".
- **Keep now.** Pip is in its vivarium by the burrow, awake.
- **The same in both:**
  - Pip's scale (the same frame at 0.5);
  - the light (the same warm daylight from the top left);
  - Pip awake;
  - the moss underfoot. The bank is the vivarium's own moss and stones, so the wild reads as the life's home ground, not somewhere bleak.
- **Different at a glance:**
  - the place: open sky and water, against the burrow and the glass's world;
  - the company: Pip with its kind, against Pip with you.

  Plate 04a records the owner rejecting an earlier Return because "side by side the two options look the same" (the same Pip on the same plinth, only the backdrop changed). A change of place alone risks that again. The wild Loikas give Return its own content without making it the sad one.
- **The coral line and the ✕ are gone.** Nothing on the panel is coral, red or crossed. Returning harms neither the player nor the mibi.

## The icons carry the sentences

Each window keeps one verb, and an icon row at its right carries what the line said:

| Window | The old line | Now carried by |
| --- | --- | --- |
| Return it | "Gone for good. Its place will remember it." | the picture (Pip at its place), then the place's own mark (`place-pond`) and the gain ❀ +2, in mint as a gain |
| Keep Pip | "Stays with you." | the picture (Pip in the vivarium), then the Vivarium's mark (the leaf of its title bar) |
| Grow it | "The pod is used." | the picture (the pod in the candling chamber, its ring), then the price ⚡ 2 ❀ 4 ◆ 1. The price already says what is spent |
| Keep shaping | "Nothing is spent." | the picture (the made founder on the bench), and no icons: no price means nothing is spent |

- **Each window says where it goes,** by a place mark in the same position: the pond or the Vivarium. That keeps them symmetric, so neither is the default home.
- **Irreversibility is the one fact no picture carries.** Whether it needs a word is the game designer's call, and how the press is guarded is UI/UX's. Art proposes no mark for it: a one-way glyph beside Return would be a warning sign by another name.
- **Gains read as gains.** ❀ +2 is mint, the progress colour. Costs keep the focus colour, as on Grow.

## Grow

Grow's setting, scale and light contrast stand, as approved. The only changes:
- the lines are gone;
- the pictures are taller (280 from 240), since the line's row is free.

With the words covered, Grow still reads as "into the chamber, at this price" against "keep working on it", and neither as the bad one.

## Owed, and open

- **The Return painting.** The wild here is a composite: the accepted pond backdrop's sky and water, brightened, over the vivarium's moss. It proves the composition and the parity of light. But the backdrop is softer and less detailed than the vivarium, so Return is still the slightly weaker picture. The master would be a painting of Pip's pond in the vivarium's style and daylight, from the same camera height. That is one generation request, not made: this ticket's budget is 0.
- **The gain's icon.** The ticket says ◆ +2, but the spec and T-170 give ❀ +2. I drew ❀ +2, as the spec says. The game designer confirms.
- **For UI/UX:**
  - The focus ring sits on Keep here only as T-170 had it. The default focus, and how it is shown without marking either option as safe, are UI/UX's.
  - The ← word is shown as "Back", a placeholder. The spec's "the safe option's word" is the framing the owner ruled out.
  - The title question is shown as it was; whether it stays is UI/UX's.
- **The place mark at 20 px** reads as the pond at 1×, but only just. If it doesn't hold in the gate, it moves to 24.

## Round 2: the parts in one proof (the creative director's not-yet, d2c370f3)

`R2-release.png`, `R2-grow.png`, their `-covered` twins and `device-sheet-decision-r2.png`, from `make-r2.py`.

- **UI/UX's layout and words:**
  - no title, so the windows take its row;
  - cards 380 × 376 at y 112;
  - windows 280 tall on Release's panel, since it carries a fact, and 312 on Grow's;
  - "Release Pip" and "Keep Pip";
  - focus on the left option (the one the player came for);
  - ✓ "Release Pip ❀ +2" and ✓ "Grow it ⚡ 2 ❀ 4 ◆ 1";
  - "Back" on ←, with the bottom line's middle empty.
- **The game designer's one fact:** "Pip lives in the wild from now on", 16 px in `bone`, the only line on either panel. No mark.
- **Keep with its household,** so neither future is the lonely one: a resident dozing by the burrow and another behind Pip.
- **No place badges.** Release shows ❀ +2 alone, and Keep's icon slot is blank.

**Open:** Keep's second resident and the wild pair are cut from the same two accepted stands, so one face appears in both windows. Once T-190's layered stands are built, each window draws its own individuals.

**Recomposed by framing** (the creative director, 89452124). With the household, both windows had the same composition, so covered they looked the same again. They now differ the way Grow's do, by framing, with the same stands and both in daylight:
- **Release is wide and open, a landscape.** Most of the window is sky and water over a thin far bank. Pip is small, mid-bound, heading off along the bank toward its kind, who are smaller still with distance.
- **Keep is close and nested, an interior.** The camera is in at the burrow's mouth. Pip is near and large, with its household crowding the frame's edges: one dozing at the left, one at the right.

**Still owed:** Release's wide sky is the pond backdrop's soft haze. It is the part of the proof that most needs the painted master.

## Grow, after the owner's ruling: a structure rough (`grow-rough.png`, `grow-rough-covered.png`, `make-grow-rough.py`)

This follows the game designer's weights (`grow-structure.md`). The settings are blocked in values only; the paint follows Home's direction (T-199).

- **The founder they made** is the subject of both windows: two thirds of the window's height, at the same scale and in the same place, with their changed parts in mint scan light.
- **Grow it, the chamber:** dark around, the light rising from the lamp below. The founder's own pod, sealed, wraps it at full size, nearly the window's height. The shell is translucent, so the founder reads through it, and candled, so it is brightest at its base.
- **Keep shaping, the bench:** a lit work surface the founder stands on, the work light from the top left, and the genes open in a column at the right.
- **Cut:** the empty chamber, the ring, the small pod and the wait.
- **Covered,** the two read as two places: inside a lit pod, against standing on the bench. The founder is the largest thing in each, and no empty area is larger than it.
