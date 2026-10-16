# Incubator style direction: not retro mid-century industrial

Creative director, ticket T-20261016-24. Written 2026-10-16 (America/Mexico_City). It answers the owner's feedback of 2026-10-16 10:45–10:46 (seven points, listed in §6). It was read at station-gate 69ea1d23:
- the Incubator goldens (`incubator-empty`, `-growing`, `-ready`);
- the accepted screens (Home, Pods, Habitat, Vivarium, Idle);
- Cargo, Probe (`bench`) and Library;
- the style guide (`design/style-guide/README.md`, "Station");
- the kit concept `art/concept-homepage/hero-kit.png`;
- the quality bar `art/concept-homepage/station-research-hands.png`;
- the approved Incubator concept `art/concept-station/incubator/placed/IN-D-r1-a3-stamped-1024x600.png`.

**This file is a style direction, not the screen's design.** The owner's verdict on the same package is "you're basically decorating a screen and placing an egg in it". So what the Incubator *contains* is set by the purpose-first concept (T-20261016-25, `specs/incubator-concept.md`), once the owner picks an option. This file says what that content must look like, and what goes regardless. The art ticket (T-20261016-27) needs both this file and the concept.

## 1. What reads as "retro mid-century industrial" on the Incubator

These are named from `incubator-growing` and `incubator-empty`. Each one is a 1950s utility room or boiler-room vocabulary, not the maker's field gear:

| Object | Where (1×) | Why it reads retro-industrial |
| --- | --- | --- |
| Conduit risers with pipe clamps, junction box, terminal box | left column, x 88–230 | Exposed cast conduit and boxes, the look of a plant room |
| Louvred vent grilles (two left, one top right) and a duct with a hood | x 140–210, 780–870 | Stamped-steel louvres, enamelled sheet |
| Small valve box (LM), pump block (RM), drawer-like box (R) | about 255, 335 / 690, 340 / 880, 150 | Boxes with no job a player can read |
| Three needle dial gauges with chrome bezels | 88–160 and 784–935 × 470–530 | Analog instrument dials that measure nothing on screen |
| Rubber hoses running into the wall | 71–349 and 677–948, y 420–530 | Plumbing from nowhere to the base |
| The chamber as an arched porthole door, bolted frame, a pendant bulb inside | 360–664 × 200–472 | An oven or boiler door; a domestic bulb hanging in it, clipped by the arch and lighting nothing |
| The base as a stamped steel nameplate block with slot screws | 344–680 × 456–550 | Machine nameplate |
| Palette: enamel sage-green fittings on a dark brown wall, chrome rims | whole stage | Mid-century enamel and chrome; the style guide forbids chrome and brushed metal |

The owner's points 5–7 are about exactly these objects:
- the lamp is the pendant bulb;
- the fixtures in the walls are the risers, louvres, boxes and hoses;
- the gauges are the three dials.

## 2. The Miniature Beasts language instead (and where it is shown)

1. **The maker's field gear: rugged, matte, handled.**
   - It is moulded polymer with soft radiused corners, sage and sand housing, dark rubber bumpers and grips, engraved marks, canvas and braided hose, and orange only for the action (style guide, "Rugged, matte, handled").
   - Reference: `hero-kit.png` (the Station and Companion in the dock, the printer), the Probe itself on `bench` (an upright moulded handheld), and the Cargo cases (yellow moulded case, black rubber corners: the owner's container references).
   - Shapes are moulded and rounded. There are no rivets, louvres, cast fittings, enamel or chrome.
2. **The life is the subject, and the tech visibly works for it.**
   - "Cozy, tethered to its tech" (style guide): every piece of equipment does a job you can see it doing.
   - Reference: Vivarium (`vivarium-docked-day`): one mister nozzle on the wall, and its mist falls on the moss. Home: the vivarium window glows and its equipment serves it.
   - A device on the wall that does nothing visible is decoration, and decoration is what the owner rejected.
3. **The collected thing is shown as the player knows it.**
   - Reference: Pods (`pods-overview-identified-pod-focused`, accepted): the pod is the species' own shell, lit on its ground, with its found-note ("Found at the pond edge, as a Loika shook dry").
   - The same shell appears on Cargo's rack. The Incubator's egg is that pod (§6, point 4).
4. **Light is shown by what it lights.**
   - Reference: the quality bar (`station-research-hands.png`): a lamp in scale with its subject, whose cone lands on the pod in a visible pool.
   - From the approved Incubator concept (IN-D-r1-a3), keep only the idea: one chamber as the subject, a lamp wholly in frame whose beam visibly falls on it, and the pod's own glow as the warm thing.
   - Its dark glass, chrome base and polished dome are not carried: the style guide forbids polished glass, chrome and brushed metal.
5. **Painted at the board's depth,** with one key light from the top left and soft cast shadows (unchanged; the gate's check 3).

## 3. The same check on Cargo, Probe and Library

| Screen | Shares the problem? | What |
| --- | --- | --- |
| Cargo (`cargo-bay-three`) | **No** | Moulded yellow cases from the owner's references, on a moulded sage shelf; the rack shows the pods' own shells. Its other open items are not style. |
| Probe (`bench`) | **Partly** | The Probe is right: moulded, upright, the maker's gear. Around it, three props are the same language and fail the same test: <br>• a brass needle stopwatch gauge centred near (428, 148) at 1× that shows nothing a player reads; <br>• a loose wrench; <br>• a loose screwdriver, laid on the panel as decoration. <br>Owner point 7 applies to the gauge. The tools and the gauge go, or they get a job (the concept for the Probe is not this ticket's). |
| Library (`library-spread`) | **No** | The book is its own material (paper, leather, cloth), consistent with the house, with no machinery. |

**The device frame** (sage moulded bezel with screws and grey side rails) is shared by Pods, Probe and the Incubator. Pods was accepted with it (owner 10-15 20:29), so the frame is **kept**, and is not ruled retro by itself. If the owner meant the frame too, it is one question for the lead to put to the owner. It is not changed here.

## 4. The Incubator: keep, replace, target

**Keep.**
- The device frame, as on Pods.
- One chamber as the centre subject.
- The stamp and its code in the shared slot (`specs/station-stamp-plate-ruling.md`).
- Painted rendering, key top left.
- The brightness rules (`specs/station-incubator-brightness-ruling.md`): the chamber and the pod are the brightest thing.

**Remove** (whatever the concept chooses):
- the conduit risers, clamps and junction and terminal boxes;
- the louvred vents and the duct hood;
- the LM, RM and R boxes;
- the three dial gauges;
- the hoses into the wall;
- the arched porthole door and its pendant bulb;
- the stamped nameplate base;
- the generic orange egg.

**Allowed only with a job a player can read**, named in the concept (T-25): a lamp, a feed or mist line, a heater, a status light. The test for each is "a stranger can say what it does for the pod in three seconds". If it has no such job, it is not drawn.

**The target for the art director:**
- **Forms:**
  - The chamber and anything that serves it are moulded field gear from the same maker as the Station, the Companion and the dock: rounded housings, rubber seals and grips, a clear (matte, not polished) window if there is one.
  - A nest of living or soft material (moss, fibre) holds the pod.
- **Materials:**
  - matte moulded polymer;
  - dark rubber;
  - canvas or braided hose (only where it feeds something);
  - the living material of the nest;
  - no steel plate, rivets, louvres, enamel, chrome or brushed metal.
- **Palette:**
  - housing sage and sand, as the kit;
  - the interior and the pod's glow warm (the one warm light);
  - the nest green;
  - orange only on the action (bottom line);
  - the wall behind is the device's dark matte slate panel, as Pods' ground, not a brown plant-room wall.
- **The lamp** (point 5): in scale with the chamber (its head no wider than about a third of the chamber's width), wholly inside the frame, its beam or pool visibly landing on the pod and the nest. If the concept has no lamp, there is no lamp.
- **The egg** (point 4): the pod the player grew, drawn as its species' shell, the same picture as on Pods and Cargo. Growth reads on it: its glow brightens, and cracks come at the hatch. The crack frames are made as overlays that work on every shell.
- **Proof:** the 1× capture of every state, laid beside Pods, Vivarium and `hero-kit.png`. The test is the style guide's: "beside the Companion concept and the kit test, it reads as the same maker's field gear, working to keep something alive".

## 5. Layout intent for UI/UX (owner point 3, "a lot of wasted space")

- **What is wasted now:**
  - the side columns, about x 88–330 and 690–936, the full stage height, carry decorative machinery and no information;
  - the chamber is 304 px wide in an 882 px wall;
  - the progress is four 16×20 leaves.
- **Intent:**
  - **Grow:** the subject (the chamber and the pod) becomes the dominant object on the stage, and progress and wait time read at the stage's scale, not as tiny marks (owner, the same package).
  - **Shrink to nothing:** wall decoration.
  - **Fill with what the player came to check:** how far along it is, what it is (the pod's found-note, as Pods), and what comes next. What exactly fills it is the concept's (T-25); UI/UX gives the rects in T-20261016-23.

## 6. The owner's points, one line each

| # | Owner's words | Fixed by | Owner of the fix |
| --- | --- | --- | --- |
| 1 | "tabs make no sense in the incubator" | T-20261016-23: the tabs come off, and the band is respecified | UI/UX, then build |
| 2 | "the retro mid-century industrial design is not the style" | This file (§1, §2, §4), carried out by T-20261016-27 | CD (direction), AD (art) |
| 3 | "a lot of wasted space in the layout" | T-20261016-25 says what the screen holds; T-20261016-23 gives rects, per §5 | Game designer (concept), UI/UX |
| 4 | "the egg should be an egg that we collected" | T-20261016-28: the chamber draws the bud's own pod shell (data exists: `st.bud.species` and `st.bud.from.podId`, with the shell picture `kind: "pod"` that Pods and Cargo draw). The art for growth on any shell is in T-26. A crossed bud has no collected pod (`from.podId` null); what it shows is the concept's (T-25) | Build; AD; game designer for crosses |
| 5 | "the lamp is out of proportion and clipped, and casts no light" | T-26 (§4 lamp rule); its place comes from T-23, and whether there is one at all from T-25 | AD, UI/UX |
| 6 | "the fixtures in the walls make no sense" | Removed (§4). Any that return need a readable job named in T-25; drawn in T-26 | Game designer, AD |
| 7 | "the gauges make no sense" | Removed on the Incubator (§4). The Probe bench's stopwatch gauge is flagged (§3) for the Probe's own pass | AD; lead for the Probe |
