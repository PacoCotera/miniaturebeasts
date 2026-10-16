# The dock arrival and the undock send-off (UI/UX spec)

Ticket T-20261016-48, 2026-10-16 (America/Mexico_City). Base: station-gate 54bde362. It is the UI/UX half of `specs/dock-moments.md` §5 (T-46, accepted; the game designer's script).

- **The owner:** 13:23, "pop up an arrival screen… feel like magic", and 13:26, picture-led with little text.
- **Kit:** the decision panel (`specs/station-decision-panel-spec.md`, T-45).
- **Type:** 16, 20 and 28 only.
- **Follow-up tickets:** art T-20261016-57, build T-20261016-58.

## 0. Purpose

When the Companion comes home, the Station shows **what came back and who came home**, in step with the other two devices. Then it asks **one real question**: open the bay now, or later. It never accepts, moves or awards anything by itself. The show is short (about 3.5 s) and any key skips to the question.

## 1. The arrival screen: Cargo's stage, rising to the player

The arrival is **Cargo's bay state**, drawn as today, with three additions: the ribbon, the home band and the choice strip. It is not a new room; the bay comes to the player.

**How it enters.** It enters with the frame's screen transition, the 16-level dither over 180 ms, not the script's 300 ms slide. A full-stage slide redraws 534,528 px a frame, over the 153,600 animation ceiling; the dither is how every screen arrives on this face. On Cargo itself there is no transition: the arrival plays in place.

| Part | Rect | What | Beats (t from the dock) |
| --- | --- | --- | --- |
| Bay | 16, 48, 992, 320 (`cargo.json regions.bay`) | The open bay, `cargo-bay-992x320` | 0.2: with the dither |
| Ribbon | Cargo's ribbon (`regions.ribbon`: y 56, h 40, fitted width, x = 512 − w/2) | "The Companion is home" (20). Broken: "The Companion is home. Nothing came back this time." | 0.5 to the choice |
| Link light | 24, 296, 976, 8 (the bay's floor line, under the crates' feet) | A light running in from the bay's left edge, `cargo-link-light-976x8`, in 4 steps of 244 px (one cut each 100 ms) | 0.5–0.9 |
| Crates | Cargo's `crates.byCount` places (1: 384; 2: 224, 544; 3: 64, 384, 704; y 120, 256 × 176) | The sealed crates (today's slices), each sliding in from x −256 to its place over 400 ms in whole pixels, one after another, 333 ms apart, in step with the Companion's pulses. More than three: the first three slide in, and the count of all of them is on the strip's outcome (Cargo shows at most three, `crates.max`) | 0.5–1.5 |
| Glint | each new-species crate: `glint-star-12x12` at (crate.x + 232, 128) | Where, never what | from its slide's end |
| Home band | 40, 312, 944, 40, inside the bay under the floor line | Picture-led, three groups left to right (§1.1) | 1.5–3.5 |
| Choice strip | 92, 376, 840, 160, over the rack | The decision panel's strip form (§2) | 3.5 |

### 1.1 The home band (40, 312, 944 × 40)

| Group | At | Pictures | Words (16, `subject`) |
| --- | --- | --- | --- |
| The Probe | x 48 | `icon-shield-16` × the Shield's plates, pitch 20, y 324: the whole ones first. At 2.5 the mended ones turn whole one by one, 120 ms apart (one cut each) | after the icons: "{n in words} mended, free" (none mended: no words) |
| Coming home | from x 512 rightward | each mibi's `face-{species}-24` at y 320, pitch 32, after `mark-home-16` (an arrow into a door) | none: the faces are the words |
| Leaving | after the coming-home group, gap 24 | `mark-out-16`, then the faces | none |
| The turn | the top bar's sun mark ticks, as today, if the world turned | — | — |

The band never shows a crate's contents. Opening is the payoff, and the player chooses it.

## 2. The choice: the decision panel's strip form

This is a variant of the T-45 panel for choices that belong under what they are about. There is no title, picture or question, no veil, and the stage above stays visible.

| Part | Rect | Notes |
| --- | --- | --- |
| Strip | 92, 376, 840, 160 | The panel's look (T-20261016-47), radius 12. Never the cream `plate` |
| Cards | y 392–520 (128 high), from x 108, 2 × 396, gap 16 | Picture-led like the panel's cards (`specs/station-decision-panel-spec.md`, section 1.3), short form: a picture 96 × 96 at (16, 16); then to its right at x 128: the name (20, ≤ 3 words) at y 16, the costs (icons) at y 52, and one line (16, ≤ 6 words) at y 80 |

| Card | Picture | Name | Costs | Line |
| --- | --- | --- | --- | --- |
| 1 (initial focus) | the crates, open, small (a crop of `crate-open` at 96) | Open the bay | none (free) | "{n in words} crates to the rack" |
| 2 | the crates, sealed, small | Later | none | "they wait while docked" |

- **Keys:** ◀ ▶ move between the two cards. ✓ does the focused card. ← is Later. A room key is Later, then acts.
- **The bottom line:** ✓ + the card's name; subject: the card's line; back "Back".
- **Line widths:** at 16, a card's line is ≤ 252 px (396 − 128 − 16), measured.
- **Open the bay:** the strip goes (a cut) and today's opening runs (cut 4 applies: ✓ skips to the report).
- **Later:** the dither back to the screen the arrival came over, as it was.
- **The component:** the strip form joins the component of T-49 as `form: "strip"`. The arrival's build adds it if T-49 has not.

## 3. The cases

| Case | Changes |
| --- | --- |
| A haul, no new pod | No glint |
| A new pod | Its crate glints. After the opening, the report's ✓ reads "Look at the new pod" |
| An empty trip | No crates, no strip. The ribbon and the band, then at 2.5 s the dither back by itself |
| A broken Probe | The ribbon's broken line. The band shows the break mended free (every plate turns whole). It closes by itself at 2.5 s |
| A mibi comes home or leaves | Its face in the band's group |
| **Mid-decision** (the interrupt rule) | The arrival waits when the player is on a screen in `frame.json navigation.dock.stays` with something unpaid or open (Create or Cross with an unpaid choice, the Sitting), or with the namer open (`namerStays`), or with a decision panel open (`ui.panel`). For 2000 ms the frame's message plate shows "The Companion is home" (no press). The arrival plays after the player's next screen change, over the screen they arrive on. Home and Cargo are in `stays` only for navigation: the arrival plays over them at once |
| Docked while asleep or at Idle | The arrival wakes the Station and plays over Home. The first press skips the show, not merely wakes |
| Crates arrive while docked (the Station was off) | The arrival plays at wake, the same way |

**Skipping:**
- **During the show** (0.2–3.5): ✓, ← or the pad jump to the strip, as a cut to the beat-3.5 frame with every crate in place and the band complete.
- **A room key:** Later, then it acts.
- **Reduced motion:** each beat is a cut on its time; the strip comes at 3.5 as usual.

## 4. The send-off (lift)

It plays in the frame and the living window only. **The screen the player is on never changes** (today's rule).

| t | Where | What |
| --- | --- | --- |
| 0 | Top bar | The Companion glyph to its outline and its lamp to stone, as today (a cut) |
| 0.2–1.4 | Home's bed (448, 472, 192 × 56) and Idle's bed (the same `withYouBed` build), when shown | Each sleeper wakes and walks out, right to left in carried order, starting 200 ms apart. Wake: the nap pose to `stand` (a cut). Walk: 1.6 s to the window's right clip edge, in whole pixels per frame, foot on footY. Each walker's dirty box is its 144 × 152 adult box plus its step (≤ 2 × 160 × 160 per frame) |
| 1.4 | The same | The bed empties to its away mark (`home-bed-mark-16x24`), as today's away state |
| 0.2 | Home's Cargo module | Its door state to shut, as today's away (a cut) |
| any time | the message plate (2000 ms), only when something is unfinished | "the crates went out with the Companion" (crates not opened); "{name} goes at the next dock" (a Take or Bring asked) |

On any other screen, only the top bar changes.

## 5. Strings at their longest

They are measured with the real measurer. If one does not fit, the copywriter shortens it; the build test fails with the string.

| String | Where | Size | Limit |
| --- | --- | --- | --- |
| "The Companion is home" | ribbon | 20 | ribbon fit (words + 32, ≤ 608) |
| "The Companion is home. Nothing came back this time." | ribbon | 20 | ≤ 576 words (608 − 32) |
| "{n in words} mended, free" | band | 16 | "three mended, free" ≤ 160 |
| "Open the bay", "Later" | strip names | 20 | ≤ 252 |
| "three crates to the rack" | strip line | 16 | ≤ 252 |
| "they wait while docked" | strip line | 16 | ≤ 252 |
| "the crates went out with the Companion" | plate | 16 | ≤ 608 (plate max 640 − 2 × 16) |
| "{Name} goes at the next dock" (name ≤ 10 letters, `namer.json nameMax`) | plate | 16 | ≤ 608 |
| "Look at the new pod" | Cargo report action | 16 | action zone, ≤ 4 words |

**The Caddy's two lines.** Its 792 × 272 four-gray view, in the Caddy view's own text style. Each line is ≤ 744 px, so the view keeps 24 px margins:

| When | Line 1 | Line 2 |
| --- | --- | --- |
| Docked, crates | "Companion home" | "{n in words} crates" with the crate icon × n (at most 3 icons) |
| Docked, nothing | "Companion home" | "charging" |
| After the opening | "{n in words} crates home" | "{n in words} new pod" / "new pods" (none: no line 2) |
| Lifted | "Companion out" | "with {name}" (a partner), else "exploring" |

## 6. Wireframe

The game designer's `specs/dock-moments/station-arrival.png` stands for the show. This spec's rects replace its rough ones. No new wireframe is drawn here: the parts are Cargo's own regions plus the band and the strip, given above.

## Amendments (T-20261016-67): what the art and the devices can carry today

**No walk cycles exist.** Only S01 has motion keys, and none of them is a walk. So no part of the arrival or the send-off walks. What changes:
- **The send-off (§4), restated with existing art.** Each sleeper on the bed, right to left in carried order, starting 200 ms apart:
  - **wake:** the nap pose cuts to the resident's own standing painting (the one the Vivarium draws), in its box on the bed, feet on footY;
  - **hop:** one hop by the table the hatch already uses (`incubator.json events.hatch` steps, `lift` [[0,1],[25,2],[50,3],[75,4],[100,3],[125,2],[150,1],[175,0]]);
  - **dither out:** 400 ms in place (the frame's 16-level dither) into the bed's away state.
  
  The bed's away mark appears when the last one is gone. The dirty area per frame is one resident's box (≤ 144 × 152 + 4). It stays a show: no press, the screen never changes.
- **The arrival's faces (§1.1).** A species with no `face-{species}-24` yet (S04 to S16 today) shows the register's placeholder look in its place (a 24 × 24 `stone` plate with a `mist` edge) until its painting and face land. Nothing is drawn in words instead.
- **The Companion's "home" and "Off we go" frames** need a Companion screen spec first. That is T-20261016-91 (UI/UX). Until it lands, the Companion frame on the play page shows only its crate marks clearing in step (T-58).
- **The Caddy's two lines and icons** need a Caddy view to draw into; none exists (`prototypes/caddy` is the painting server). That is T-20261016-92 (the architect's: a 792 × 272 four-gray view on the play page that reads §5's lines). Until it lands, T-58 writes the Caddy's line text under the play page's Dock control.

