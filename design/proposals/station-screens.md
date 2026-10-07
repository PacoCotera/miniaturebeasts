# Station screens

**Proposal** for the Station's screens in the stand-in v2 prototype (`prototypes/station/`, 1024×600 at 1×, sharing the Companion's save). It lays out the decided [Station loop](station-loop.md) (decisions 1–7, with the sealed bay and the fingerprint). **Decided** marks restated owner decisions. Wireframes in [station-screens/](station-screens/) are boxes and labels for layout only; orange italics in them are notes, not screen text.

## The frame

Every screen has a top bar (40 px), a stage (522 px) and a bottom line (38 px), in the Companion's grammar.
- **Top bar:** screen name and world turn on the left; ⚡ Energy, ◆ Data, ❀ Essence centred, ticking when they change; the Companion's state on the right ("away · since 16:05 · with Dot", "docked · 2 crates in the bay").
- **Stage:** one large subject, drawn. The pad moves one warm focus ring between drawn things, spatially, never down a list; the focused thing lifts slightly.
- **Bottom line:** three parts, as on the Companion: `✓ action · price · ← where it goes` | the subject | what needs you. On read-only focus the ✓ part is empty (**Decided:** one close; Confirm only for a real action).

| Key | Role on every screen |
| --- | --- |
| Pad | Moves focus in the picture. On Create, ▲▼ also rolls a choosable window |
| Home, Research, Library, Habitat | Switch view; spend or stop nothing (**Decided**) |
| ← | Back one view, restoring focus; on Home, "← Rest" fades to the idle view |
| ✓ | Exactly what the bottom line names; every spend is a deliberate press |

Prototype only: a depicted Caddy beside the Station on the page has one key, **Dock / Lift**. It is not a Station key and is not on the screen.

## Visual language

- **Pictures first.** Each screen is one picture to act on: a vivarium, a pod in a cradle under a lamp, a glass dome, a shelf, a resident. Words support it: a name and one line, two sizes on the stage, six words or fewer per line, play language.
- **Richer treatment.** Miniature Lives at Station size: sculpted, soft directional light, real materials (glass, wood, felt, clay). An evening room: deep moss background, warm lamp pools on the bench, cream type. A subject on Create and Habitat is about rich Pip size (300×310).
- **Numbers only where they are prices,** plus the three counters and the world turn the Companion already shows. No timers in digits, percentages, ratios, IDs, counts of windows or letters for genes. Waits are drawn as growth.
- **Not this:** no tables, no panels with title bars, no logs, graphs, monospace or boxed buttons. The v1 study (a sample as `Pp`, paragraphs, a stock line) and the amber and colour terminals (dense windowed dashboards) decorate a process; here the art is the thing played with.
- **One window language everywhere.** The same trait windows appear on Pods, Create, the incubator, Library and Habitat; on the first three they sit in the same arc positions, so "markings" always lives top left.
- **Shapes carry meaning:** seed, glint star, solid base, family mark, shutter, leaves. Colour doubles them, never replaces them; every animation has a still state.

## Screen map

```
 Idle ◀── ← Rest ── HOME (vivarium + bench) ──✓ on a resident──▶ HABITAT
   any press wakes      │ bay ✓      │ tray ✓        │ incubator ✓     │ cradle ✓
   only                 ▼            ▼               ▼                 ▼
                     Arrival      PODS ──✓ Shape──▶ CREATE ──✓ Grow──▶ INCUBATOR ──✓ Open──▶ Home (meet)
                                 (Research key)                                   Probe bench
 LIBRARY (Library key): shelf ▶ species page ▶ ✓ Visit (Habitat)
```

## The screens

**Home** ([01](station-screens/01-home.svg)). Vivarium on the left two thirds: a lit glass terrarium where residents keep their species' routines; Dot's bed shows the mibi with you (empty with a small Companion mark while away). Bench on the right third, drawn as objects: bay door, pod tray (six cups, shells in place colours), incubator (dome, leaves), Probe cradle (Shield plates). Pad: focus rests on **the room**; the pad moves the ring to a resident or a bench object. ✓ on the room does the one thing that most needs the player, which the right of the bottom line names (Open the bay, Look at the new pods, Open the incubator); ✓ on a thing opens it. ←: Rest. Line: `✓ Look at Bean · ← Rest | Bean · puffcap · adult | a puffcap pod waits · needs 2 ❀`.

![Home wireframe: vivarium on the left, bench objects on the right (layout only)](station-screens/01-home.svg)

*Home wireframe: vivarium on the left, bench objects on the right (layout only).*

**Dock and arrival** ([02](station-screens/02-dock-arrival.svg)). Dock only shows: the top bar says docked and one sealed crate per consignment slides into the bay door, each wearing its place stamp and pod outlines (the bay holds three, **Decided**). Docking alone accepts nothing (devices working rule). ✓ on the room: `✓ Open the bay · 2 crates`. Then one arrival per crate, in order, about 3 s each: the seal breaks, pods roll into cups, counters tick, the cradle shows the free mend, a ribbon reads "Expedition 4 home · 2 pods · explored 9 of 21", and the clock jumps to the turn the Companion brings. Presses during it are consumed; focus stays on the room; then `✓ Look at the new pods`. Each consignment is accepted once; a reload never reopens one. Lift: "Companion away · since …"; the Station draws nothing of the field.

![Dock and arrival wireframe: crates in the bay, then one arrival per crate (layout only)](station-screens/02-dock-arrival.svg)

*Dock and arrival wireframe: crates in the bay, then one arrival per crate (layout only).*

**Pods** ([03](station-screens/03-pods.svg), Research key). Tray column on the left (six cups and a garden gate); the pod in a padded cradle under a lamp; after Identify, four trait windows rise in an arc above it; the fingerprint whorl sits on the cradle plate, its petals in the windows' order. Pad: ◀▶ along the windows, ▼ to the pod, ◀ to the tray, ▲▼ along the cups (focusing a cup brings its pod into the cradle: looking is free). ✓ by focus: unidentified pod `Identify · 1 ⚡` (first ever free; the shell clears top-down to the species' silhouette, a "New species" stamp); identified pod or a studied window `Shape a founder` (opens Create, spends nothing); frosted window `Study crown · 2 ◆`; a cup of the same species `Compare` (it slides in beside, windows aligned, differing windows pulse, free); gate `Return to the wild · +1 ❀`, then ✓ again. ←: Home.

![Pods wireframe: tray, pod in its cradle, four trait windows and the fingerprint plate (layout only)](station-screens/03-pods.svg)

*Pods wireframe: tray, pod in its cradle, four trait windows and the fingerprint plate (layout only).*

**Create** ([05](station-screens/05-create.svg)). The same arc of windows; the founder large in the centre, misty wherever a window is frosted; the opened pod on the left; the empty incubator and the whorl on the right. Pad: ◀▶ between windows; ▲▼ rolls a studied, choosable window through what this pod carries (as the pod is → the hidden one through and through → the shown one through and through, **Decided:** nothing the pod lacks); the founder and the whorl's petal redraw, a "changed" ribbon marks the window, and the bottom line's price updates. This screen is the review: founder, changes, surprises and cost are all visible. ✓ `Grow it · 2 ⚡ 4 ❀ 2 ◆`: the whorl stamps the shell, the code appears under it, and the pod glides into the incubator. ←: Pods, nothing spent.

![Create wireframe: the founder at centre, windows in an arc, the cost in the bottom line (layout only)](station-screens/05-create.svg)

*Create wireframe: the founder at centre, windows in an arc, the cost in the bottom line (layout only).*

**Incubator** ([06](station-screens/06-incubator.svg), from Grow or Home's bench). The glass dome with the embryo glowing as it grows (seed → bud → shape); a ring of leaves around it is the timer, **one leaf per minute** of the decided rule (5 leaves = 5 minutes; the first mibi ever, one leaf), each filling smoothly over its minute. Above, the misty windows clear one by one while it grows: the surprises arrive during the wait. The plate under the dome carries the fingerprint and code. Read-only while growing (✓ empty); ready, the dome glows: `✓ Open` (**Decided:** deliberate). The juvenile steps out into the vivarium: "Fig · glowtail · juvenile". ←: Home; it keeps growing on the bench, and when away the idle view shows it.

![Incubator wireframe: glass dome with the ring of leaves as the timer (layout only)](station-screens/06-incubator.svg)

*Incubator wireframe: glass dome with the ring of leaves as the timer (layout only).*

**Library** ([07](station-screens/07-library.svg)). A shelf across the top: known species as bright cards, met ones as silhouettes, dashed empty slots that admit more exist. Below, the focused species' page: its portrait with one line of habits and its places as stamps; a **sticker book**, one pocket per window, every look found so far as a picture, with one dotted "more?" sticker (knowledge, never material, **Decided**); and **lineage** as a branch: each pod → its mibi with whorl and code. Pad: ◀▶ along the shelf (the page follows), ▼ into the page, spatial within. ✓ on a mibi: `Visit Fig` (Habitat); elsewhere read-only. ←: shelf, then Home.

![Library wireframe: shelf of species, sticker book and lineage (layout only)](station-screens/07-library.svg)

*Library wireframe: shelf of species, sticker book and lineage (layout only).*

**Habitat** ([08](station-screens/08-habitat.svg)). The focused resident large in its corner of the vivarium; at right its card: name, stage and species, ability, a memory line, its whorl as a seal with the code, and its windows as the Library knows them. Under the card, the **with-you door** (the mibi in the Companion, or "away") and the **bond heart**. A strip of residents along the bottom with an empty place. Pad: ◀▶ along the strip (the stage swaps), ▲ or ▶ to the door and heart. ✓: on the resident `Spend time with Fig` (a species moment, no reward); on the door `Take Fig with you` (swaps at the dock; not during an expedition, **Decided**); on the heart, once offered after a first walk or expedition, `Bond with Fig`, then ✓ again (a small heart, no meters, **Decided**). ←: Home.

![Habitat wireframe: resident large, card at right, strip of residents below (layout only)](station-screens/08-habitat.svg)

*Habitat wireframe: resident large, card at right, strip of residents below (layout only).*

**Probe bench** (from Home's cradle). The Probe large in its cradle, Shield as plates, a switch and a slot:

```
 | Probe bench  T7                ⚡ 12  ◆ 5  ❀ 13                Companion docked |
 |        [  Probe in cradle  ]   plates ▮▮▯       ( ) Mend fully on docking: on   |
 |                                                  [ tier 2 slot · lit ]            |
 | ✓ Mend a plate · 1 ⚡ · ← Home | Probe · tier 1 | one plate to mend               |
```

Pad: ◀▶ between the next empty plate, the switch and the tier 2 slot. ✓: `Mend a plate · 1 ⚡`; the switch toggles (free); the slot, lit only when affordable, `Arm tier 2 · 12 ⚡ 4 ◆`, then ✓ installs. ←: Home.

**Idle.** After a minute without a press, the top bar, bench and bottom line fade; the vivarium fills 1024×600, its light following the time of day; residents keep their routines. One line at the bottom: "Companion away · with Dot · an embryo is growing" (or "ready to open", "2 crates in the bay"). The first press only wakes (consumed; **Working rule:** waking never rewards). Nothing decays.

## The trait window

A small arched pane in a wooden frame (about 170×160, picture area 150×110), one per thing about this kind of mibi; an emblem on the frame (swirl, crown, drop, paw) and one word under it name the window. States ([04](station-screens/04-trait-window-and-fingerprint.svg)):
1. **Frosted** (unstudied): soft frost with nothing behind it, not even a blur (draw only what is known).
2. **Glint:** on a later pod of a species whose window has been studied, a four-point star twinkles on each window where *this* pod holds a look not yet seen in that species; a smaller star sits on its tray cup. It says "something new here", never what. No glint, visibly ordinary.
3. **Shows + hides:** ✓ Study wipes the frost away in two seconds to a close drawing of that part of this pod's mibi (stripes on a flank). If it hides another look, a **misty seed** rests on the sill with a ghost of it inside (spots). Line: "shows stripes · hides spots".
4. **Through and through:** no seed; a small solid base under the picture.
5. **Family mark:** two joined rings on the frame: opens like the others, never rolls at creation ("only through families").
6. **Shutter:** closed slats with a picture of what opens it (a crystal, Probe tier 2), never a bare "?".

![Trait window states and the fingerprint wireframe](station-screens/04-trait-window-and-fingerprint.svg)

*Trait window states and the fingerprint glyph wireframe (layout only).*

A child sees a picture of the trait that shows, a misty seed holding what hides, and a star on pods worth a look. No letters, no ratios, no loci. On Create a choosable window gets ▲▼ notches and rolls through its three pictures; a window studied once stays open on that pod forever (**Decided**).

## The fingerprint

**Decided:** a round whorl from the genome's short code, one petal per trait window, plain until studied. The glyph, for engineering:
- **Petals** (four in the prototype) in the windows' order, clockwise from top left. A studied petal lights in the hue of what shows; a small seed dot at its base takes the hue of what hides, once known. Unstudied petals are ink ridges only.
- **Ridges:** each petal has 3–7 nested arcs, count and twist from a hash of the code; the centre carries the species' hue and emblem. Fourfold symmetry keeps every mark pretty. Ridges say "same or different", never what; a hint no stronger than the glint.
- **Code:** base-32 with a check character, shown grouped in threes (`G7F · CD0 · 3H2`) and only for mibis: it appears at Grow, the moment the individual is fixed.
- **Where:** a pod's cradle plate (96 px, lighting with each study); Create's right column (petals flip with each roll); stamped on the shell at Grow (220 px, a short press); the incubator plate; the Habitat card seal (96 px); every lineage entry (40 px); later the Caddy card and its QR. Shapes carry it, so it survives four-gray and paper.

## Ten presses: Dock to meet the mibi

The Companion comes home with one consignment; the Station is on Home, focus on the room.
1. **Dock** (the Caddy key): a crate slides into the bay. `✓ Open the bay · 1 crate`.
2. **✓** The seal breaks; a pod rolls into a cup; counters tick; the Shield mends to two. `✓ Look at the new pod`.
3. **✓** Pods, the new pod in its cradle: "rock field · a glowtail felt safe". `✓ Identify · 1 ⚡`.
4. **✓** The shell clears top-down: a glowtail. "New species". Four frosted windows rise; the whorl appears in plain ridges.
5. **▲** Focus on the markings window. `✓ Study markings · 2 ◆`.
6. **✓** The frost wipes away: stripes, and a misty seed holding spots. "shows stripes · hides spots". The whorl's first petal lights.
7. **✓** `Shape a founder`: Create opens, focus on markings; the founder striped, three windows misty.
8. **▼** The window rolls to spots through and through; the founder redraws spotted; "changed". `✓ Grow it · 2 ⚡ 4 ❀ 2 ◆`.
9. **✓** The whorl stamps the shell, the code appears, the pod glides into the dome: five leaves. While they fill, the crown and colour windows clear.
10. **✓** The dome glows: `Open`. A spotted glowtail steps into the vivarium: "Fig · glowtail · juvenile".

## Build notes

- The Station page reads and writes the shared save: consignments (accepted ids), tray, residents, studies per pod, the incubator's start time and minutes. The Companion page never spends; the Station never reads the map (**Decided** separation).
- Windows, seeds and founders are token silhouettes with layered overlays per look; the whorl is drawn in SVG or canvas from the code, by one shared function the Companion and Caddy can reuse.
- The debug strip stays under the screen, outside the 1024×600 frame.

## Decisions for the owner

1. **Opening the bay is a press.** Docking shows the crates; `✓ Open the bay` plays the arrival. It keeps the working rule that docking never accepts by itself and gives a child the moment of opening. Alternative: arrival plays on dock. (Recommended: a press.)
2. **Create is the review.** One screen shows founder, changes, surprises and cost; `Shape a founder` then `Grow it` are the two presses, replacing the separate review card; a choosable window rolls with ▲▼. (Recommended.)
3. **Leaves, not minutes.** The incubator shows one leaf per minute filling, instead of "minutes left" in digits. (Recommended.)
4. **No pod turned away.** Pods that find no free cup wait sealed in the Station's bay until one frees, instead of being refused at the dock. (Recommended.)
