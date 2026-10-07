# Station Home: concept brief

For the art director and the image-generation operator. Flat screen design, 1024×600 at 1×, edge to edge. Approved reference: `art/concept-homepage/station-research-hands.png` (clean, correct light and shade; content too simple). Rejected: `design/proposals/ui-kit/station-home-vs-concept.png` right half (boxed panels, title bars, 4/6 counters, blob plants, flat dark chrome). Owner: "maintain that high-res vibe, maximize the screen; HiBit OK, pixels can be indicated"; "a research device, not a cottage; the vivarium can be very lively, but the player is holding a hardware device to do genetic research."

## 1. Purpose
- Always-on view of the Station. One glance answers "what now?".
- The vivarium is alive (residents keep their routines); the bench is the research instrument the player operates.
- Pictures first: one scene to act on, words support it.

## 2. Information and hierarchy
1. Residents in the vivarium, the focused one lit (lamp cone + cream bracket). Pip (hopper), a glowtail, a puffcap.
2. The one thing that needs the player: bottom line, middle-right ("a puffcap pod waits · needs 2 ❀").
3. Bench state, as objects: sample bay with sealed crates; pod tray, six cups, shells in place colours; incubator dome with its leaf timer (one leaf per minute, no digits); Probe dock with Shield plates.
4. Top bar: screen name + world turn; counters Energy ⚡ Data ◆ Essence ❀; Companion state ("away · since 16:05 · with Dot" or "docked · 2 crates in the bay").
5. With-you state: the partner's empty bed with a small Companion mark while away; the partner asleep in it when docked.

## 3. Layout at 1024×600
- Frame: top bar y 0–40; stage y 40–562; bottom line y 562–600. Layout unit 4 px, 16 px side margin.
- Top bar: "Home  T5" left from x 16; counters centred around x 512 (span ~x 400–624); Companion state right-aligned to x 1008. Thin engraved rule at y 40.
- Vivarium window (glass, bevelled): x 16–656, y 52–550 (640×498). Lamp cone from the window's top centre-left down onto the focused resident.
  - Focused Pip: x 190–490, y 150–460 (300×310, the rich Pip size), on moss.
  - Glowtail: x 50–160, y 390–470, far from the lamp, lit by its own tail glow. Puffcap: x 510–620, y 370–470.
  - Name label under Pip: "Pip" 4× at y 466–494; "hopper · adult" 2× at y 500–516, centred x 340.
  - Partner's bed: x 560–644, y 484–540, lower right of the window; empty, Companion mark 16 px.
- Bench column: x 672–1008 (336 wide), four objects on a slate panel, 12 px apart, each with an engraved label and a status lamp top-right.
  - Sample bay: x 672–1008, y 52–162. Dark hatch, two sealed crates with place stamps, one empty slot.
  - Pod tray: y 174–274. Six cups in a row, 3 shells (green, blue, violet), 3 empty cups.
  - Incubator: y 286–436. Glass dome with embryo glow, ring of leaves on the plate (5 leaves, 2 filled).
  - Probe dock: y 448–550. Empty cradle (Companion away), three Shield plates ▮▮▯, tier mark.
- Bottom line y 562–600: ✓ part x 16–330 | subject x 330–690 centred | needs-you x 690–1008 right-aligned.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 600" font-family="monospace" font-size="13" fill="none" stroke="#999">
<rect x="0" y="0" width="1024" height="600" fill="#1b1f24" stroke="none"/>
<rect x="0" y="0" width="1024" height="40" stroke="#777"/>
<text x="16" y="26" fill="#ddd" stroke="none">Home  T5</text>
<text x="400" y="26" fill="#ddd" stroke="none">⚡ 9  ◆ 4  ❀ 6</text>
<text x="800" y="26" fill="#ddd" stroke="none">Companion away · with Dot</text>
<rect x="16" y="52" width="640" height="498" stroke="#8bb"/>
<text x="24" y="70" fill="#8bb" stroke="none">vivarium window (glass) · lamp cone from top</text>
<rect x="190" y="150" width="300" height="310" stroke="#eda"/>
<text x="250" y="310" fill="#eda" stroke="none">Pip (focused, 300×310)</text>
<rect x="50" y="390" width="110" height="80"/><text x="58" y="436" stroke="none" fill="#999">glowtail</text>
<rect x="510" y="370" width="110" height="100"/><text x="522" y="426" stroke="none" fill="#999">puffcap</text>
<text x="320" y="490" fill="#eda" stroke="none" font-size="22">Pip</text>
<text x="300" y="514" fill="#bbb" stroke="none">hopper · adult</text>
<rect x="560" y="484" width="84" height="56"/><text x="566" y="516" stroke="none" fill="#999">bed · mark</text>
<rect x="672" y="52" width="336" height="110"/><text x="680" y="110" stroke="none" fill="#999">sample bay · 2 sealed crates</text>
<rect x="672" y="174" width="336" height="100"/><text x="680" y="228" stroke="none" fill="#999">pod tray · 6 cups, 3 shells</text>
<rect x="672" y="286" width="336" height="150"/><text x="680" y="364" stroke="none" fill="#999">incubator dome · leaf ring</text>
<rect x="672" y="448" width="336" height="102"/><text x="680" y="502" stroke="none" fill="#999">Probe dock (empty) · Shield plates</text>
<rect x="0" y="562" width="1024" height="38" stroke="#777"/>
<text x="16" y="586" fill="#f06d1e" stroke="none">✓ Look at Pip</text>
<text x="440" y="586" fill="#ddd" stroke="none">Pip · hopper · adult</text>
<text x="760" y="586" fill="#bbb" stroke="none">a puffcap pod waits · needs 2 ❀</text>
</svg>
```

## 4. Light model
- One key light, upper left, as in the approved concept. Volumes in 3–4 clean steps, soft directional light, no noise, no grain.
- The vivarium window carries its own warm instrument lamp: a pool on the focused resident, falling off into deep moss shadow. Unfocused residents sit in the shade (the glowtail lights itself).
- The chrome is lit by the same key light, cool: highlights on the upper-left edges, darkest step at lower right, glass edges catch one soft highlight.
- Dark means deep slate and moss, never black. Every surface still reads at 1×.

## 5. Material language of the chrome
- A research device, cool and precise: brushed or matte dark slate / teal-grey panels, thin engraved rules, small round status lamps (lit / unlit), engraved labels.
- Readouts are drawn objects: crates, cups, dome, plates. Never tables, bars, cards or title bars.
- Glass with a soft edge highlight: the vivarium window and the incubator dome. Frost and glow are allowed inside glass.
- The vivarium is the only warm, saturated, lively element: moss, plants, water, residents.
- HiBit: pixels may be indicated (crisp edges, stepped shading), but use the full resolution: smooth volumes, real highlights, no visible grid over the picture.

## 6. Type (ui-kit §2, Station roles)
- Titles / names 3× (~21 px caps); body 2× (14 px caps); display 4× for the focused resident's name.
- Cream on dark (lamp cream); Confirm's verb in orange; context in grey.
- Six words or fewer per line. Only numbers that are counters, the turn, and prices.
- Exact strings to carry: top bar "Home  T5" · "⚡ 9  ◆ 4  ❀ 6" · "Companion away · with Dot"; name label "Pip" over "hopper · adult"; bottom line "✓ Look at Pip" | "Pip · hopper · adult" | "a puffcap pod waits · needs 2 ❀". No other text. No logos.
- Labels can be set in the build later: a garbled string is a minor fail; a wrong object or a wrong light is a major fail.

## 7. States
- Focused resident: lamp cone + cream corner brackets; it lifts slightly. Default here: Pip.
- Companion away vs docked: top bar text; Probe dock empty vs the Companion seated in it; bed empty with Companion mark vs partner present asleep.
- Sample bay with 0 / 1 / 2 sealed crates, each wearing a place stamp. Candidate: 2.
- Incubator empty / growing (embryo glowing, leaves filling) / ready (dome glows). Candidate: growing, 2 of 5 leaves.
- Idle fade (note only, not in this candidate): chrome fades, vivarium fills the screen, one status line.

## 7b. Style guide reconciliation (design/style-guide/station-screens.md, Home; the guide wins)
- Materials keep one shape: Energy a yellow bolt, Data a blue diamond, Essence a green drop. Not the concept's chip and crystal (round 1 used those).
- No wood, felt, shelves or lamp-lit bench anywhere: crates in slate and teal with orange seal tags; the bed is a moulded enamel or frosted-glass nest.
- Focus is a warm cream ring and the thing lifts, not corner brackets. Light in the vivarium is warm daylight from the top left, not a lamp cone.
- Names: pod rack (wells), incubation chamber, Probe dock. Deep blue-teal chrome ground; amber only on a lamp that needs you.
- Pixel indication: fine grain on creatures and world only; chrome and type crisp (guide's recommendation, owner decision 3).

## 8. Pass checklist (yes / no)
1. Reads as a hardware research instrument, not a room or cottage.
2. One key light from upper left; clean 3–4 step shading like the approved concept; no noise.
3. Vivarium is the lively warm element and fills roughly the left two thirds.
4. A resident matches the rich Pip: charcoal body, cream belly, orange eyes with cream rings, three leaf crown lobes.
5. The four bench items are each recognisable objects: crates in a bay, six pod cups, dome with leaf ring, Probe dock with Shield plates.
6. Status lamps and engraved readouts present on the chrome.
7. Top bar with turn, three counters and the Companion state.
8. Bottom line with ✓ action · subject · what needs you.
9. No tables, panels with title bars, bullet lists, digits as timers, graphs or letters for genes.
10. Text legible at 1024×600 1× and spelled right (minor fail if garbled, see §6).
11. No logos besides MINIATURE BEASTS if a bezel is shown; this candidate shows none.
12. Screen fills its canvas edge to edge: flat screen design, not a device photograph.
13. (guide) No wood, felt, shelves or lamp-lit bench; the vivarium is the only warm light; each module reads by shape before its words.
