# Station screens

**Proposal** for the Station's screens in the stand-in v2 prototype (`prototypes/station/`, 1024×600 at 1×, sharing the Companion's save). It lays out the decided [Station loop](station-loop.md) (decisions 1–7, with the sealed bay and the fingerprint). **Decided** marks restated owner decisions. **Decided 2026-10-07 (research loop):** the [research loop](research-loop.md) is folded in: chapters and traits, the progress ring, the genome ring, the field guide, and Cross and Wish. Wireframes in [station-screens/](station-screens/) are boxes and labels for layout only; orange italics in them are notes, not screen text. They were drawn before the research loop: where they show windows or a whorl, read chapter arcs and pages and the genome ring, and their material notes are superseded by the four vibes of the [Station style guide](../style-guide/station-screens.md).

## The frame

Every screen has a top bar (40 px), a stage (522 px) and a bottom line (38 px), in the Companion's grammar.
- **Top bar:** screen name and world turn on the left; ⚡ Energy, ◆ Data, ❀ Essence centred, ticking when they change; the Companion's state on the right ("away · since 16:05 · with Dot", "docked · 2 crates in the bay").
- **Stage:** one large subject, drawn. The pad moves one warm focus ring between drawn things, spatially, never down a list; the focused thing lifts slightly.
- **Bottom line:** three parts, as on the Companion: `✓ action · price · ← where it goes` | the subject | what needs you. On read-only focus the ✓ part is empty (**Decided:** one close; Confirm only for a real action).

| Key | Role on every screen |
| --- | --- |
| Pad | Moves focus in the picture. On Create, ▲▼ also rolls a shapeable trait |
| Home, Research, Library, Vivarium | Switch view; spend or stop nothing |
| ← | Back one view, restoring focus; on Home, "← Rest" fades to the idle view |
| ✓ | Exactly what the bottom line names; every spend is a deliberate press |

Prototype only: a depicted Caddy beside the Station on the page has one key, **Dock / Lift**. It is not a Station key and is not on the screen.

## Visual language

- **Pictures first.** Each screen is one picture to act on: a vivarium, a pod on the specimen stage, a glass dome, a field guide, a resident. Words support it: a name and one line, two sizes on the stage, six words or fewer per line, play language.
- **Richer treatment.** Miniature Lives at Station size: sculpted, with soft directional light. The Station is a research device, not a cottage; materials and mood follow [one device, one look](../style-guide/station-screens.md#one-device-one-look) in the style guide. A subject on Create and the vivarium, up close is about rich Pip size (300×310).
- **Numbers only where they are prices,** plus the three counters and the world turn the Companion already shows. No timers in digits, percentages, ratios, IDs, progress digits, counts of traits or loci, or letters for genes. Waits are drawn as growth.
- **Not this:** no tables, no panels with title bars, no logs, graphs, monospace or boxed buttons. The v1 study (a sample as `Pp`, paragraphs, a stock line) and the amber and colour terminals (dense windowed dashboards) decorate a process; here the art is the thing played with.
- **One chapter language everywhere.** A species' chapters (Coat, Face, Movement…) appear as arcs on the pod's rings and as pages of trait pictures on Pods, Create, the incubator, Library and Vivarium, always in the same order clockwise from the notch, so Coat always lives in the same place.
- **Shapes carry meaning:** seed, glint star, solid base, sleeping mark, family mark, seal and notch, leaves. Colour doubles them, never replaces them; every animation has a still state.

## Screen map

```
 Idle ◀── ← Rest ── HOME (vivarium + bench) ──✓ on a resident──▶ HABITAT
   any press wakes      │ bay ✓      │ tray ✓        │ incubator ✓     │ cradle ✓
   only                 ▼            ▼               ▼                 ▼
                     Arrival      PODS ──✓ Shape──▶ CREATE ──✓ Grow──▶ INCUBATOR ──✓ Open──▶ Home (meet)
                                 (Research key)                         ▲         Probe bench
 HABITAT ──✓ Cross (an adult)──▶ CROSS ──✓ Cross them────────────────────┘
 LIBRARY (Library key): shelf ▶ field guide ▶ ✓ Visit (the vivarium, up close) · ✓ Wish
```

## The screens

**Home** ([01](station-screens/01-home.svg)). Vivarium on the left two thirds: a lit glass terrarium where residents keep their species' routines; Dot's bed shows the mibi with you (empty with a small Companion mark while away). Bench on the right third, drawn as objects: bay door, pod tray (six cups, shells in place colours), incubator (dome, leaves), Probe cradle (Shield plates). Pad: focus rests on **the room**; the pad moves the ring to a resident or a bench object. ✓ on the room does the one thing that most needs the player, which the right of the bottom line names (Open the bay, Look at the new pods, Open the incubator); ✓ on a thing opens it. ←: Rest. Line: `✓ Look at Bean · ← Rest | Bean · Untuva · adult | an Untuva pod waits · needs 2 ❀`.

![Home wireframe: vivarium on the left, bench objects on the right (layout only)](station-screens/01-home.svg)

*Home wireframe: vivarium on the left, bench objects on the right (layout only).*

**Dock and arrival** ([02](station-screens/02-dock-arrival.svg)). Dock only shows: the top bar says docked and one sealed crate per consignment slides into the bay door, each wearing its place stamp and pod outlines (the bay holds three, **Decided**). Docking alone accepts nothing (devices working rule). ✓ on the room: `✓ Open the bay · 2 crates`. Then one arrival per crate, in order, about 3 s each: the seal breaks, pods roll into cups, counters tick, the cradle shows the free mend, a ribbon reads "Expedition 4 home · 2 pods · explored 9 of 21", and the clock jumps to the turn the Companion brings. Presses during it are consumed; focus stays on the room; then `✓ Look at the new pods`. Each consignment is accepted once; a reload never reopens one. Lift: "Companion away · since …"; the Station draws nothing of the field.

![Dock and arrival wireframe: crates in the bay, then one arrival per crate (layout only)](station-screens/02-dock-arrival.svg)

*Dock and arrival wireframe: crates in the bay, then one arrival per crate (layout only).*

**Pods** ([03](station-screens/03-pods.svg), Research key). The **pod list** column on the left (six cups and a return gate): each cup shows its pod's place stamp, species glyph or seal, and a **progress ring**: the centre fills at Identify, then one arc per chapter, sized by its trait count, fills when that chapter is read; a star on an arc is a glint, a notch a sealed chapter; never digits. The pod on the specimen stage; after Identify its chapters rise as arcs above it, and the focused chapter opens as a page of trait pictures; the genome ring sits on the stage plate, its sectors in the chapters' order. Pad: ◀▶ along the chapters, ▲ into a page (◀▶ between its traits), ▼ to the pod, ◀ to the list, ▲▼ along the cups (focusing a cup brings its pod to the stage: looking is free). ✓ by focus: unidentified pod `Identify · 1 ⚡` (first ever free; the seal breaks, the glyph and name show, a "New species" stamp, and the frame fills the ring's grey band); identified pod or a read chapter `Shape a founder` (opens Create, spends nothing); an unread chapter `Read Coat · 3 ◆` (half for a chapter read on an earlier pod of the species; the first read ever free); a read trait `Detail` (free: copies, rule and context, for those who want to dig in); a cup of the same species `Compare` (it slides in beside, pages and rings aligned, differing traits pulse, free); gate `Return to the wild · +1 ❀`, then ✓ again. ←: Home.

![Pods wireframe: pod list, pod on its stage, chapter arcs and the ring plate (layout only; drawn as windows before the research loop)](station-screens/03-pods.svg)

*Pods wireframe: pod list, pod on its stage, chapter arcs and the ring plate (layout only; drawn as windows before the research loop).*

**Create** ([05](station-screens/05-create.svg)). The same chapter arcs; the founder large in the centre, misty wherever a chapter is unread; the opened pod on the left; the empty incubator and the ring on the right. Pad: ◀▶ between read traits; ▲▼ rolls a read, shapeable trait among three pictures drawn from the pod's own two copies (as the pod is → only the hidden look → only the shown look, **Decided:** nothing the pod lacks); the founder and the ring's spokes redraw, a "changed" tag marks the trait, and the bottom line's price updates (+1 ◆ a trait). A doings trait wears the family mark and reads "breed to change"; a combination that can't be built marks the clashing traits and offers no Grow. This screen is the review: founder, changes, surprises and cost are all visible. ✓ `Grow it · 2 ⚡ 4 ❀ 1 ◆`: the ring stamps the shell, the code appears under it, and the pod glides into the incubator. ←: Pods, nothing spent.

![Create wireframe: the founder at centre, chapters in an arc, the cost in the bottom line (layout only)](station-screens/05-create.svg)

*Create wireframe: the founder at centre, chapters in an arc, the cost in the bottom line (layout only).*

**Incubator** ([06](station-screens/06-incubator.svg), from Grow or Home's bench). The glass dome with the embryo glowing as it grows (seed → bud → shape); a ring of leaves around it is the timer, **one leaf per minute** of the decided rule (5 leaves = 5 minutes; the first mibi ever, one leaf), each filling smoothly over its minute. Above, the unread chapter arcs clear one by one while it grows: the surprises arrive during the wait, and the mibi steps out fully known. The plate under the dome carries the ring, filling as chapters clear, and the code. Read-only while growing (✓ empty); ready, the dome glows: `✓ Open` (**Decided:** deliberate). The juvenile steps out into the vivarium: "Fig · Tuikis · juvenile". ←: Home; it keeps growing on the bench, and when away the idle view shows it.

![Incubator wireframe: glass dome with the ring of leaves as the timer (layout only)](station-screens/06-incubator.svg)

*Incubator wireframe: glass dome with the ring of leaves as the timer (layout only).*

**Library** ([07](station-screens/07-library.svg)). A shelf across the top: known species as bright cards, met ones as silhouettes, dashed empty slots that admit more exist. Below, the focused species' **field guide**: its portrait with one line of habits and its places as stamps; its **frame**, what the species fixes, shown once; **one page per chapter**, every look found so far as a picture per trait, with one dotted "more?" (knowledge, never material); **lineage** as a branch: each pod → its mibi, each child → its two parents, with ring and code; and **wishes**, the dream mibis pinned for the species. Pad: ◀▶ along the shelf (the guide follows), ▼ into the guide, spatial within. ✓ on a mibi: `Visit Fig` (the vivarium, up close); on a look: `Add to the wish` (free; pods and mibis carrying a piece of the wish then glint); on a wish: `Find a pair` (opens Cross with the forecast toward it). ←: shelf, then Home.

![Library wireframe: shelf of species, field guide pages and lineage (layout only; drawn as a sticker book before the research loop)](station-screens/07-library.svg)

*Library wireframe: shelf of species, field guide pages and lineage (layout only; drawn as a sticker book before the research loop).*

**The vivarium, up close** ([08](station-screens/08-habitat.svg)). The focused resident large in its corner of the vivarium; at right its card: name, stage and species, ability, a memory line, its ring as a seal with the code, and its chapters as the Library knows them. Under the card, the **with-you door** (the mibi in the Companion, or "away"), the **bond heart** and, on an adult, the **cross** mark. A strip of residents along the bottom with an empty place. Pad: ◀▶ along the strip (the stage swaps), ▲ or ▶ to the door and heart. ✓: on the resident `Spend time with Fig` (a species moment, no reward); on the door `Take Fig with you` (swaps at the dock; not during an expedition); on the heart, once offered after a first walk or expedition, `Bond with Fig`, then ✓ again (a small heart, no meters); on the cross mark `Cross Fig` (opens Cross with Fig as the first parent). ←: Home.

![The vivarium up close, wireframe: resident large, card at right, strip of residents below (layout only)](station-screens/08-habitat.svg)

*The vivarium up close, wireframe: resident large, card at right, strip of residents below (layout only).*

**Cross and Wish** (from the vivarium, up close, on an adult, or from a wish in the Library; no wireframe yet). Two adults of one species stand left and right, each with its ring; between them the child to be, misty, and under it each trait as a **forecast** of four seed pictures (one in four spotted, two in four hiding spots): quarters drawn, never odds as numbers on the child-facing view, and never a promise. With a wish pinned, the traits that can reach it wear its mark. Pad: ◀▶ picks a parent, ▲▼ rolls through the other eligible adults of the species, ▼ into the forecast (look only). An ineligible pair greys out and says why before anything is spent. ✓ `Cross them · 2 ⚡ 4 ❀`: the two rings line up, one track from each parent, and the child's pod glides into the incubator; it opens known only where both parents' copies were the same, "one of these" elsewhere until that chapter is read. ←: back where it came from, nothing spent.

**Probe bench** (from Home's cradle). The Probe large in its cradle, Shield as plates, a switch and a slot:

```
 | Probe bench  T7                ⚡ 12  ◆ 5  ❀ 13                Companion docked |
 |        [  Probe in cradle  ]   plates ▮▮▯       ( ) Mend fully on docking: on   |
 |                                                  [ tier 2 slot · lit ]            |
 | ✓ Mend a plate · 1 ⚡ · ← Home | Probe · tier 1 | one plate to mend               |
```

Pad: ◀▶ between the next empty plate, the switch and the tier 2 slot. ✓: `Mend a plate · 1 ⚡`; the switch toggles (free); the slot, lit only when affordable, `Arm tier 2 · 12 ⚡ 4 ◆`, then ✓ installs. ←: Home.

**Idle.** After a minute without a press, the top bar, bench and bottom line fade; the vivarium fills 1024×600, its light following the time of day; residents keep their routines. One line at the bottom: "Companion away · with Dot · an embryo is growing" (or "ready to open", "2 crates in the bay"). The first press only wakes (consumed; **Working rule:** waking never rewards). Nothing decays.

## Chapters and pages

A chapter is an arc on the pod's rings and a page on the stage: one picture per trait (about 150×110 each), with an emblem and one word naming the chapter. Which chapters and traits exist comes from the species frame; more genome makes fuller pages, never more buttons. States ([04](station-screens/04-trait-window-and-fingerprint.svg), drawn as windows before the research loop):
1. **Unread:** hairlines on the arc; on the page, soft frost with nothing behind it, not even a blur (draw only what is known).
2. **Glint:** on a later pod of a species, a four-point star on each chapter arc where *this* pod holds a look the species has not shown yet in that chapter; a smaller star sits on its cup's progress ring. It says "something new here", never what. No glint, visibly ordinary.
3. **Shows + hides:** ✓ Read turns the page in two seconds to close drawings of every trait in the chapter on this pod's mibi (stripes on a flank). A trait that hides another look carries a **misty seed** with a ghost of it inside (spots). Line: "shows stripes · hides spots".
4. **Only:** no seed; a small solid base under the picture: "only stripes".
5. **Asleep:** a part switched off in this individual, drawn sleeping: "markings asleep: bands, if they wake".
6. **Breed to change:** two joined rings on a doings trait (movement, stamina, temperament by default): reads like the others, never rolls at creation.
7. **Sealed:** the chapter shut, a notch in its arc, and a picture of what opens it (a crystal, Probe tier 2), never a bare "?".

![Chapter states and the ring, as first drawn for windows and the whorl (layout only)](station-screens/04-trait-window-and-fingerprint.svg)

*Chapter states and the ring, as first drawn for windows and the whorl (layout only). The ring's real layout is in the [research loop](research-loop.md#7-the-genome-fingerprint-as-a-code-the-genome-ring).*

A child sees a picture of the trait that shows, a misty seed holding what hides, and a star on pods worth a look. No letters, no ratios, no loci. On Create a read, shapeable trait gets ▲▼ notches and rolls through its three pictures; a chapter read once stays read on that pod forever (**Decided**).

## The genome ring

**Decided:** the fingerprint is a genome ring that stores the real copies ([research loop](research-loop.md) §7; printability and scanability still to be tested, and the art may be refined). For the screens:
- **Parts:** the species glyph at the centre; a grey band for the locked frame, the same in every member; two coloured tracks, one spoke per heritable part, the inner holding one copy and the outer the other (a long or short bar for which look); one sector per chapter, clockwise from the notch, in the chapters' order; outer dashes for species, version and check. Unread parts are hairlines, so the ring fills as reads do.
- **Code:** base-32 with a check character, shown grouped in threes (`G7F · CD0 · 3H2`) and only for mibis: it appears at Grow, the moment the individual is fixed. It is the mibi's name and a lookup, not the genome.
- **Where:** the pod's stage plate (96 px, filling with each read); Create's right column (spokes flip with each roll); stamped on the shell at Grow (220 px, a short press); the incubator plate; the Cross screen (each parent's, lining up into the child's); the vivarium, up close card seal (96 px); every lineage entry (40 px); later the Caddy card. Monochrome-safe, so it survives four-gray and paper. Scanning shows and never grants.

## Ten presses: Dock to meet the mibi

The Companion comes home with one consignment; the Station is on Home, focus on the room.
1. **Dock** (the Caddy key): a crate slides into the bay. `✓ Open the bay · 1 crate`.
2. **✓** The seal breaks; a pod rolls into a cup; counters tick; the Shield mends to two. `✓ Look at the new pod`.
3. **✓** Pods, the new pod on its stage: "Found on the rock field, as a Tuikis felt safe.". `✓ Identify · 1 ⚡`.
4. **✓** The seal breaks: a Tuikis. "New species". The ring draws its grey band; four chapter arcs rise in hairlines.
5. **▲** Focus on the Coat arc. `✓ Read Coat · 3 ◆`.
6. **✓** The page turns: stripes with a misty seed holding spots, "shows stripes · hides spots"; only teal; short fur. The Coat sector fills.
7. **✓** `Shape a founder`: Create opens, focus on markings; the founder striped, three chapters misty.
8. **▼** Markings roll to only spots; the founder redraws spotted; "changed". `✓ Grow it · 2 ⚡ 4 ❀ 1 ◆`.
9. **✓** The ring stamps the shell, the code appears, the pod glides into the dome: four leaves. While they fill, the Face, Movement and Stamina chapters clear.
10. **✓** The dome glows: `Open`. A spotted Tuikis steps into the vivarium: "Fig · Tuikis · juvenile".

## Build notes

- The Station page reads and writes the shared save: consignments (accepted ids), tray, residents, chapters read per pod, the field guide, wishes, parents, the incubator's start time and minutes. The Companion page never spends; the Station never reads the map (**Decided** separation).
- Pages, seeds, founders and pods come from the art director's masters, pods from one renderer with species parameters (**Decided**; engineers do not do art). The ring is encoded from the genome by one shared function the Companion and Caddy can reuse.
- The debug strip stays under the screen, outside the 1024×600 frame.

## Decisions for the owner

1. **Opening the bay is a press.** Docking shows the crates; `✓ Open the bay` plays the arrival. It keeps the working rule that docking never accepts by itself and gives a child the moment of opening. Alternative: arrival plays on dock. (Recommended: a press.)
2. **Create is the review.** One screen shows founder, changes, surprises and cost; `Shape a founder` then `Grow it` are the two presses, replacing the separate review card; a shapeable trait rolls with ▲▼. (Recommended.)
3. **Leaves, not minutes.** The incubator shows one leaf per minute filling, instead of "minutes left" in digits. (Recommended.)
4. **No pod turned away.** Pods that find no free cup wait sealed in the Station's bay until one frees, instead of being refused at the dock. (Recommended.)
