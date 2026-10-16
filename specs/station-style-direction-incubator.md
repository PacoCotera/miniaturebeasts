# Incubator style direction: the house style, without the retro machinery

Creative director, ticket T-20261016-24. Written 2026-10-16 (America/Mexico_City). Revised 2026-10-16 after the owner's ruling (10:57): the retro-industrial note is "only the machinery", the sage frame stays, and "don't let the art designers drift".

It answers the owner's feedback of 10:45–10:46 (seven points, §6).

**The style is fixed by two documents, and this file adds none of its own:**
- `design/art-direction.md` (Miniature Lives; the Station is "rugged, matte field gear, the Companion's sibling, whose job is keeping small lives going");
- `design/style-guide/README.md` ("The Station").

Every rule below quotes one of them or the owner. A wanted departure from them is the owner's call.

**What was read**, at station-gate 69ea1d23:
- the Incubator goldens (`incubator-empty`, `-growing`, `-ready`);
- the accepted screens (Home, Pods, Habitat, Vivarium, Idle);
- Cargo, Probe (`bench`) and Library.

**This file is a style direction, not the screen's design.** The owner's verdict on the same package is "you're basically decorating a screen and placing an egg in it". So what the Incubator *contains* is set by the purpose-first concept (T-20261016-25, `specs/incubator-concept.md`), once the owner picks an option. The art ticket (T-20261016-27) needs both.

## 1. What the owner rejected: the machinery

The owner (10:57): "only the machinery". The machinery is the painted stage `room-bench-stage-incubator`, named here from `incubator-growing` and `incubator-empty`:

| Machinery | Where (1×) | Why it fails the house style |
| --- | --- | --- |
| Conduit risers with pipe clamps, a junction box, a terminal box | left column, x 88–230 | Plant-room fittings that do nothing for the life. The guide's equipment "keeps the life going" and "works for it" |
| Vent grilles and a duct with a hood | x 140–210, 780–870 | Vents are allowed ("feed lines, vents, misters, small gauges, grow lamps"), but these vent nothing the player can see |
| The LM valve box, RM pump block and R box | about (255, 335), (690, 340), (880, 150) | No job a player can read |
| Three needle dial gauges | 88–160 and 784–935 × 470–530 | Small gauges are allowed. These read nothing the player can use (owner point 7) |
| Hoses from the wall to the base | 71–349 and 677–948, y 420–530 | Feed lines are allowed. These feed nothing visible |

The fault is not the object type: the style guide names vents, gauges and feed lines as the Station's own equipment. **The fault is equipment with no visible job**, in a plant-room vocabulary, filling the walls. That is what the guide's "cozy, tethered to its tech … never hidden" rules out when the tech serves nothing.

**Not machinery, and not ruled on style:**
- the device frame (stays, owner 10:57);
- the chamber's form;
- the base and its plaque.

The chamber's pendant bulb is owner point 5 (the lamp), not a style point. Whether the chamber's form changes is the concept's (T-25).

## 2. The house style, as the two documents give it

Only these:
- **"Rugged, matte, handled."** Sage and sand housing, dark rubber, screws, engraved marks; powder-coat, rubber, moulded polymer, canvas, braided hose, paper. Inside the frame, dark matte slate panels and cream type; orange for the action. *(style guide)*
- **"Cozy, tethered to its tech."** "The equipment that keeps the life going is visible and works for it: feed lines, vents, misters, small gauges, grow lamps." *(style guide)* Example on an accepted screen: Vivarium's mister, whose mist falls on the moss.
- **"Painted light on the painted layer."** One key light from the top left, soft cast shadows, correct form shading, painted gradients. *(style guide)*
- **"Never:** glowing HUDs, holograms, neon, chrome, polished glass, gloss, brushed metal, alien technology, sterile labs, a cabinet or display case, a cottage with no equipment, anything childish." *(style guide)*
- **"One test:** beside the Companion concept and the kit test, it reads as the same maker's field gear, working to keep something alive." *(style guide)*
- **"The art is the interface.** The player acts on the picture; art never decorates a process, a list or a table." *(art direction)*
- **Pods.** "Pods come from one renderer with species parameters (size, proportion, shell pattern, colour pair, glyph). … a shell never shows its individual's genes; only the dust or moss of its place of origin varies from pod to pod." *(art direction)*

## 3. The same check on Cargo, Probe and Library

| Screen | Equipment with no job? | What |
| --- | --- | --- |
| Cargo (`cargo-bay-three`) | **No** | The crates and the rack serve the haul (the owner's container rulings). |
| Probe (`bench`) | **Yes, in part** | The Probe is right: the maker's gear, upright. But three items around it have no job: <br>• a needle stopwatch gauge centred near (428, 148) that reads nothing; <br>• a loose wrench; <br>• a loose screwdriver. <br>The cable through the gauge ends in a loose plug. This is the same fault as §1 (equipment that doesn't work for anything), and the purpose audit (`specs/purpose-audit.md`) ranks it first. |
| Library (`library-spread`) | **No** | A book: paper, leather and cloth, no machinery. |

The device frame on Pods, Probe and the Incubator stays (owner 10:57).

## 4. The Incubator: keep, cut, and what the art must be

**Keep:**
- the device frame;
- one chamber as the subject;
- the stamp and its code in the shared slot (`specs/station-stamp-plate-ruling.md`);
- the painted rendering, key top left;
- the brightness rule (`specs/station-incubator-brightness-ruling.md`): the chamber and the pod are the brightest thing.

**Cut:**
- every piece of machinery in §1;
- the generic egg (point 4).

**Equipment that may return:** only the guide's own kinds (feed lines, vents, misters, small gauges, grow lamps), and only where it visibly works for the pod. Examples: a grow lamp whose light lands on it, a mister whose mist reaches the nest, a small gauge that reads something about the pod a player can read. Which pieces return is the concept's (T-25). The test is the guide's: it "works for it", visibly.

**The art is the style guide's, unchanged:**
- **Materials:** sage and sand housing, dark rubber, screws, engraved marks, powder-coat, moulded polymer, canvas, braided hose.
- **Ground:** inside the frame, dark matte slate panels.
- **Never:** the guide's "Never" list (§2).
- **Colour:** orange only for the action.
- **Light:** one key light, top left, soft cast shadows.
- **The judge:** the guide's one test, beside the Companion concept and the kit test.
- **The lamp** (owner point 5: "out of proportion and clipped, and casts no light"). If the concept keeps a lamp, it is a grow lamp in the guide's sense: in proportion to the chamber, wholly inside the frame, and its light visibly lands on the pod (a cast pool, per "painted light").
- **The egg** (point 4). The chamber holds the pod the player grew: its species' shell from the one pod renderer, the same picture as on Pods and Cargo. Where the renderer carries it, show the dust or moss of its place of origin, the one thing that varies from pod to pod (art direction). Growth reads on the shell as light (its glow) and, at the hatch, cracks. The overlays work on every shell and never show genes.
- **Proof:** the 1× capture of every state, laid beside Pods and Vivarium, and judged by the guide's one test.

## 5. Layout intent for UI/UX (owner point 3, "a lot of wasted space")

- **What is wasted now:**
  - the side columns, about x 88–330 and 690–936, the full stage height, carry the machinery and no information;
  - the chamber is 304 px wide in an 882 px wall;
  - the progress is four 16×20 leaves.
- **Intent:**
  - **Grow:** the subject (the chamber and the pod) becomes the dominant object, and progress and wait time read at the stage's scale (owner, same package: the leaves "are tiny").
  - **Shrink to nothing:** equipment with no job.
  - **Fill with what the player came to check:** how far along it is, what it is (the pod's found-note, as on Pods), and what comes next. What exactly fills it is T-25's; UI/UX gives the rects in T-20261016-23.

## 6. The owner's points, one line each

| # | Owner's words | Fixed by | Owner of the fix |
| --- | --- | --- | --- |
| 1 | "tabs make no sense in the incubator" | T-20261016-23: the tabs come off, and the band is respecified | UI/UX, then build |
| 2 | "the retro mid-century industrial design is not the style" (10:57: "only the machinery") | This file (§1, §4), carried out by T-20261016-27 | CD (direction), AD (art) |
| 3 | "a lot of wasted space in the layout" | T-20261016-25 says what the screen holds; T-20261016-23 gives rects, per §5 | Game designer (concept), UI/UX |
| 4 | "the egg should be an egg that we collected" | T-20261016-28: the chamber draws the bud's own pod shell (data exists: `st.bud.species` and `st.bud.from.podId`, with the `kind: "pod"` picture that Pods and Cargo draw). The growth overlays are in T-20261016-27. A crossed bud has no collected pod (`from.podId` null); what it shows is the concept's (T-25) | Build; AD; game designer for crosses |
| 5 | "the lamp is out of proportion and clipped, and casts no light" | T-20261016-27 (§4 lamp); its place from T-23, and whether there is one at all from T-25 | AD, UI/UX |
| 6 | "the fixtures in the walls make no sense" | Cut (§1, §4). Any that return are the guide's kinds with a visible job named in T-25, drawn in T-20261016-27 | Game designer, AD |
| 7 | "the gauges make no sense" | Cut on the Incubator (§1). A small gauge returns only if it reads something about the pod. The Probe bench's stopwatch is flagged (§3, purpose audit) | AD; lead for the Probe |
