# The mibi up close: no shut doors; the marks say what they are (UI/UX)

Ticket T-20261016-32, 2026-10-16 (America/Mexico_City). Base: station-gate 69ea1d23 (`prototypes/ui/specs/station/habitat.json`, `views/habitat-props.mjs`, `intents/habitat.mjs`, `nav.mjs`, goldens `prototypes/face/golden/habitat/`, wireframes 19 to 19e). Input: `specs/purpose-audit.md`, "Vivarium, one mibi up close" and gap 4. Same rule as `specs/station-library-spec.md` §2 (fix 8: no dead doors). Follow-up: build ticket T-20261016-37.

## 0. What the card is for

**Be with one mibi and choose its next step.** The player reads who it is (species and stage, where it came from, its parents, its code, its stamp, its chapters). They greet it, name it, take it along, or return it to the wild. They come back when it grows up, when a chapter is still to read, and when it has bonded or earned skill out with them.

## 1. What is wrong on 69ea1d23

- **Three shut doors.** `nav.mjs` `BUILT` lists neither `cross` nor `sitting`, and no Book is bound. So the Portrait module, the Cross module and the species line's guide mark all lead nowhere: "portraits are not open yet", "crossing is not open yet", "the guide is not open yet" (`strings.shut`). They are drawn as modules or marks and they take focus, so each is a dead door (fix 8).
- **The heart** (`card.heart`) marks a bond (`m.bonded`: three Tends on the Companion, `design/play-manual.md` :295, :300). Nothing on the card says so; only the resident's bottom line does ("a bonded young Loika").
- **The three tags** right of the code (`card.notches`) are skill notches (`m.notches`, 1 to 3: a partner's ability that helped on an expedition, play manual :299). Nothing anywhere on the Station says so.
- **Growth** (young → adult) has no signal. The play manual (:281) says an unbonded young mibi grows up after two world turns, and a bonded one grows through care on the Companion and waits at home.

## 2. The ruling

**A door that cannot open is not drawn.** While `doorOpen("sitting")` is false, the Portrait module is not drawn and is not a focus target. While `doorOpen("cross")` is false, the same goes for the Cross module. While `doorOpen("book")` is false, the species line draws no guide mark and is not a focus target. No shut line is shown anywhere (`strings.shut` is no longer used by this screen).

**The places they leave hold two panels.** Each says what the card's marks mean and when the mibi will change. Neither is a focus target and neither is pressable. Both reuse existing plates.

| Place | Rect | While the door is shut | Plate |
| --- | --- | --- | --- |
| Portrait's | 872, 272, 136, 96 | **`bond` panel** (new) | `plate-device-136x96` (existing) |
| Cross's | 592, 376, 272, 96 | **`growth` panel** (new) | `plate-device-272x96` (existing) |

Companion (592, 272, 272, 96) and Wild (872, 376, 136, 96) do not move. When a door opens (its screen built), its module returns to its place and the panel's content moves to that screen's ticket. That is out of scope here.

### The `bond` panel (872, 272, 136 × 96), offsets from its origin

| Row | At | Bonded / has notches | Not bonded / none |
| --- | --- | --- | --- |
| Bond | (16, 20), 24 high | `heart-full-24` at (16, 20), then "bonded" at (44, 20), 104 wide, 16 px, `bone` | "not bonded yet" at (16, 20), 112 wide, 16 px, `mist` (no heart) |
| Skill | (16, 52), 24 high | 1 to 3 `notch-skill-16x24` at x 16, 40, 64 (pitch 24, left-aligned), then "skill" 4 px after the last notch, 16 px, `bone` | "no skill yet" at (16, 52), 112 wide, 16 px, `mist` (no notch, never an empty notch) |

- **The card's heart and notches go:** `card.heart` and `card.notches` are deleted. The panel is their one home. The code's row keeps only the code.
- **Widths:** the longest row, three notches plus "skill", is 16 + 72 + 4 + about 30 = 122 ≤ 128 (the panel minus 8). "not bonded yet" must be ≤ 112 at 16 px. Measure both with the real measurer; if one does not fit, stop and report.

### The `growth` panel (592, 376, 272 × 96)

- **Word:** "Growth" at (16, 12), the modules' word style (`regions.door.word`).
- **Line:** at (16, 48), 240 wide, 16 px, `bone`, one line, no digits:

| The mibi | Line (`strings.growth`) |
| --- | --- |
| young, not bonded | "grows up in {n in words} {turn\|turns}", with n the world turns left (`JUVENILE_TURNS` − (turn − born), at least one) |
| young, bonded | "grows with care, out with you" |
| adult or elder | "grown" |
| out with the Companion | as above (the facts do not change while it is out) |

- **Owners:** the game designer confirms the rule (play manual :281) and the elder case; the copywriter confirms the words. Until then these words stand.

### Focus

- **Groups:** `top` holds Companion alone, and `low` holds Wild alone, while the two doors are shut. The graph's `nearestIn` rules stand; no edge names Portrait or Cross while they are absent.
- **Name and plates, while the Book is shut:** `name.right` → `plate.0`, `plate.up` → `name`, `resident.right` → `name`. The species line stays drawn as text.

## 3. Strings

- **New:**
  - `strings.bond` { "bonded": "bonded", "not": "not bonded yet" };
  - `strings.skill` { "has": "skill", "none": "no skill yet" };
  - `strings.growth` { "word": "Growth", "young": "grows up in {n} {turn|turns}", "bondedYoung": "grows with care, out with you", "grown": "grown" }.
- **Kept but no longer shown on this screen while the doors are shut:** `strings.shut.cross`, `.portrait` and `.guide`. The Library ruling's D4 (`frame.json screens.notBuilt.doors`) gets the same edit for Habitat: drop "habitat.json strings.shut" from the rule text.

## 4. Build (T-20261016-37)

- **`habitat.json`:**
  - delete `card.heart` and `card.notches`;
  - add `regions.bond` and `regions.growth` as §2 (rects, rows, slices, strings, `when` = the door shut);
  - `portrait`, `cross`: add `"when": "doorOpen(sitting)"` and `"when": "doorOpen(cross)"`;
  - `speciesLine.mark` and `focus.targets.species`: `"when": "doorOpen(book)"`;
  - `focus.graph` edits as §2;
  - `drawOrder`: `bond` and `growth` in the modules' place;
  - `purpose`: replace "the heart when it is bonded, its skill notches" with "whether it is bonded and its skill (the bond panel), when it grows up (the growth panel)";
  - `strings` as §3.
- **`views/habitat-props.mjs`:** `bond` { bonded, notches } and `growth` { line } from `m.bonded`, `m.notches`, the stage and the turns. No portrait, cross or guide props while their doors are shut.
- **Face (`screens/habitat.c` or its builder):** the two panels with the existing module plate, picture and text words. No new word.
- **`intents/habitat.mjs`:** no change in behaviour (the shut targets already do nothing). They are simply not reachable.
- **Tests:**
  - `prototypes/ui/tests/specs.test.mjs`: the panels inside their places on the plates' sizes; the rows' widths; no `heart` or `notches` under `card`.
  - The habitat region tool and face test:
    - with the doors shut: no `portrait` or `cross` region or target, no guide mark, no shut line on any bottom line;
    - `bond` and `growth` drawn in rest, meet and out;
    - a bonded mibi with two notches draws the heart, "bonded", two notches and "skill";
    - a fresh mibi draws "not bonded yet" and "no skill yet".
  - The props test: the growth line for young (two turns left: "grows up in two turns"), bonded young, and adult.
  - The Portrait-module goldens (`habitat-portrait`, `-portrait-painting`, `-portrait-pictured`, `-portrait-portrayed`) test a module behind a shut door. Keep them by opening the door in the test harness, as `main.mjs` does for Cross (`openCross`): a scene flag `doors: ["sitting"]`. Do not delete or skip them. If that hook does not exist for `sitting`, add it to the harness only.
- **Goldens:**
  - retake every Habitat golden in the rest, meet or out state: `habitat-card`, `-young-night`, `-docked-dawn`, `-day`, `-dusk`, `-night`, `-door`, `-door-away`, `-meet`, `-out`, `-plate`, `-rest`, `-tile`, `-twelve`, `-wild-armed`;
  - re-check with the harness hook: `habitat-portrait*`, `habitat-cross`;
  - the moment and namer goldens should not move (no card); a move there is a departure to report.
- **Wireframes 19 to 19e (SVG):**
  - remove the Portrait and Cross modules and the guide mark;
  - draw the two panels at §2's rects with their rows;
  - remove the card's heart and notches;
  - re-render the PNGs.
  
  The rects in §2 are the reference. The builder writes the SVG edits; no patch is given here.

## 5. Open

- **Game designer:** confirm the growth rule and the elder case, and that "bonded" and "skill" are the right facts to show at home.
- **Copywriter:** the panel words.
- **Every bench screen:** the same door rule applies wherever a module leads to an unbuilt screen. This spec rules only the mibi up close.
