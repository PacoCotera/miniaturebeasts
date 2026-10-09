# Station screens

1024×600 landscape, judged at 1×. The shared rules are in the [style guide](README.md). The Station is a research instrument with one living window. It is never a cottage and never a scaled-up Companion.

## The frame

- **Top bar, 40 px.** Where you are, what you hold, who is out, when: the room's mark and the screen's title at the left; Energy, Data and Essence centred, ticking when they change; the Companion's glyph and lamp with the face of the mibi out with it, then the world turn as a sun mark, at the right. Marks, not words, but for the title. The zones, rules and states are in [Station layouts, The frame](station-layouts.md#the-frame).
- **Stage, 522 px.** The instrument and its one living window.
- **Bottom line, 38 px.** The one action (the ✓ cap and the verb in orange, then the price) | the context (mist, the only part that shrinks) | the notice (amber, with its lamp) | the way back (the ← cap and where it leads, at the right edge). Read-only focus draws no ✓ cap. Every word is a slot filled to its zone's rule.
- **Focus.** A warm cream ring that walks between drawn things; the focused thing lifts slightly. Never a list cursor.

## Keys and navigation

One navigation model for the whole Station: Home is the hub, every screen has one parent, and each key means one thing everywhere. The map is [nav-map.png](station-layouts/nav-map.png); the parents, the back words, the room keys and Home's pad order are in `prototypes/ui/specs/station/frame.json` (`navigation`).

<img src="station-layouts/nav-map.png" width="1024" alt="The Station's navigation map">

*The navigation map, 1× wireframe.*

| Key | Means, on every screen |
| --- | --- |
| **Pad** (◀ ▲ ▶ ▼) | Moves the ring inside this screen; on Create and Cross it changes the focused choice. It never leaves the screen and never spends |
| **✓** | Does the bottom line's action, exactly as written. No ✓ cap: nothing happens. A dimmed cap: a message plate says why, and nothing is spent. An act that cannot be undone arms first, and the line reads "Again: …" |
| **←** | Goes up one level, to the screen's parent in the tree, and the bottom line names it: a title (Home, Pods, Library, Habitat) or, below a pod's overview, the pod's name ("Loika"). On Home there is no ← cap, and ← does nothing (no plate) |
| **Home, Research, Library, Habitat** | Open the top of their room from anywhere, even from inside that room: Home with the ring on the room, Pods on its collection with the ring on the pod that most needs the player, the Library on its spread, Habitat on the mibi last seen. They never spend |

- **The tree.** Home is the top. Under Home: Pods (the collection), the Incubator, the Probe bench, Idle, the Library and Habitat. Under the collection: a pod's overview. Under the overview: its chapter page, Compare and Create. Under the Library: the Book. Under Habitat: Cross. The Incubator and the Probe bench are Home's modules (reached from Home's instrument column, ← Home) and keep the Research room's mark.
- **Stack navigation.** A ✓ that lands in another part of the tree is a jump: Grow it (Create) and Cross them (Cross) to the Incubator, Open (the Incubator) to Habitat, Visit (the Book) to Habitat. After a jump, ← goes to the parent of the screen you are on, never back along the way you came: the Incubator after Grow reads "← Home", Habitat after a Book's Visit reads "← Home".
- **Home's pad.** A fixed order, not the nearest thing: ◀ ▶ cross between the vivarium's residents and the instrument column; ▲ ▼ walk the column, Bay, Rack, Incubator, Probe, Rest. The Home key on Home puts the ring back on the room, where ✓ does what needs you.
- **Idle.** The first press only wakes the screen; nothing else happens.
- **Leaving Create or Cross** by a room key drops the unpaid choices; coming back starts fresh.

## Species and mibi

The player always knows which level a screen is about. The Library, the Book and its guide are about the **species**, filled in by every pod and mibi the player has read. Pods, Habitat and Cross show one individual, a **mibi** (a **pod** before it hatches), with its own stamp. On screen the species is "every", "a typical" or its name alone; the individual is "this" or "your". Never on screen: specimen, type, individual, critter, creature. Each level has a door to the other: the figure on Pods and the species word on Habitat open the species' guide (`✓ Open the guide`, a jump); a name in the guide's "Carried by" opens that mibi in Habitat (`✓ Visit Fig`, a jump). The table and the numbers are in [Station layouts, The two levels](station-layouts.md#the-two-levels-species-and-mibi).

## Instrument and living window

| | Instrument | Living window |
| --- | --- | --- |
| Feels | cool, precise, calm | warm, soft, alive |
| Light | even cool light, crisp edges, fine bevels | one warm key light from the top left, soft shadows |
| Colour | deep blue-teal ground, graphite and slate chrome, cream readouts, small status lamps | greens, warm earth, water, the creatures' own colours |
| Materials | enamel, brushed metal, glass, frosted panes | plants, soil, stone, water, fur and leaf |
| Moves | only when something happens | all the time |
| Words | a few per module | none |

Wireframes give layout only. The instrument above and the four vibes below set their materials, never wood, felt or a bench lamp. Read their windows as the chapter rail and pages ([research loop](../proposals/research-loop.md)), and their whorl as the stamp, the genome code.

## Palette and layers

The Station draws in three layers. The **art layer** is the chrome (bars, panels, panes, hairlines, bevels, tabs, pips, lamps and the focus ring), the pixel art the build draws (material icons, the glint, the leaf timer, Shield plates), placeholders and the living window's frame; it uses only the Station palette's 62 colours (the Companion's 48 as the shared core, then the instrument's deep blue-teal, graphite, metal, enamel, frost, deep teal, sage and focus cream; roles and swatches in [ui-kit §2](../proposals/ui-kit.md#2-the-kit), numbers in `prototypes/ui/palettes/station.json`), is crisp and flat with one bevel of light, never dithered, and is checked at 0 off palette. The **painted layer** is every painted master and mibi painting: the living window's inside, the specimens, the tome and the instrument's painted objects; it is full colour with straight alpha, carries the painted light and the fine grain on creatures and world, and is off palette by design. The **type layer** is Inter, anti-aliased; each string takes its colour from a palette role (`bone` readouts, `mist` context, `amber` what needs you, `orange` Confirm's verb, `red` a clash), and its smoothed edges are off palette by design. The genome stamp is placed in its own colours from the stamp module, the same on screen, on paper and on the scan page. The art layer holds no wood, felt, evening-room greens or warm lamp pools; its only warm colours are signals: the focus ring's cream, the amber lamp and Confirm's orange.

## Four rooms, four vibes

One device, four functions, and each communicates its own mood. Type, counters, the bottom line and the light direction are shared; the materials and the feeling are not.

| Room | Screens | Vibe |
| --- | --- | --- |
| **Overview** | Home's frame, Dock and arrival | Industrial, plasticky: it mimics the hardware in the hand |
| **Research bench** | Pods, Create, Incubator, Cross and Wish, Probe bench | A modern digital lab: glass, light or deep panes, precise readouts, the instrument lamp |
| **Vivarium** | Home's living window, Habitat, idle | A place you want to put your pets and see them cozy and happy |
| **Library** | Library | A botanical tome: paper, plates, pressed specimens, a hand that catalogues |

<table><tr><td valign="top"><img src="../../art/concept-homepage/station-research-hands.png" width="480" alt="Station research concept"><br><em>station-research-hands: the quality bar. Concept, generated. Keep the light and shading; carry far more.</em></td>
<td valign="top"><img src="../../art/concept-homepage/station-known-forms.png" width="420" alt="Station known forms concept"><br><em>station-known-forms: rich creatures at Station size. Concept, generated.</em></td></tr></table>

---

## Home

**Vibe.** Overview: the frame is the hardware, industrial and plasticky; the window is the vivarium, cozy and alive.

**Purpose.** The always-on view: the collection alive, the equipment's state. **Reads first:** the residents, then whatever needs you (the bottom line's right part).

- **Living window.** The vivarium, the left two thirds (about 640×500): a lit glass habitat with plants, stones, water and a burrow. Residents in the rich treatment keep their species' routines. The with-you bed shows the mibi with you, or a small Companion mark while away.
- **Instrument.** The right third, four stacked modules, each with a status lamp and one engraved word (Bay, Rack, Incubator, Probe): the sample bay (crates behind a door), the pod rack (six wells, shells in place colours, a star where one glints), the incubation chamber (a dome and its leaves), the Probe dock (the Probe and its Shield plates).
- **Composition.** The vivarium's glass sits in a thin bezel; the modules align to one column with 8 px gaps. Nothing overlaps the vivarium.
- **Lively / quiet.** Lively: residents, plants, water, the bud's glow. Quiet: the modules; one lamp pulses slowly when its module needs you.
- **Light.** Inside the vivarium, the same light as Idle: the warm key light from the top left, by the time of day; even cool light on the chrome.
- **Palette.** Deep blue-teal chrome; the vivarium's greens and warm earth; amber only on the lamp that needs you.
- **Type.** Inter: the title 20 px medium; the module words and the name tag 16 px.
- **Chrome.** `✓ Look at Bean` | "an adult Untuva" (the name is on the tag under the resident) | "a new pod waits"; no ← on Home.
- **Motion.** Residents move smoothly at the panel's rate; module doors and lamps move only on events.

**Pass when**
- [ ] It reads as an instrument holding something alive, not a room.
- [ ] The vivarium is the only warm light on screen.
- [ ] Residents are the matched rich treatment, never upscaled tokens.
- [ ] Each module reads by its shape before its words.
- [ ] What needs you is found in one glance.
- [ ] No wood, felt, shelves or lamp-lit bench.

<table><tr><td valign="top"><img src="../proposals/station-screens/01-home.svg" width="480" alt="Home wireframe"><br><em>Home wireframe. Layout only.</em></td>
<td valign="top"><img src="../../art/concept-homepage/companion-resident-home-450x600.png" width="225" alt="Resident at home concept"><br><em>companion-resident-home: the warmth of the vivarium, at Station resolution. Concept, generated.</em></td></tr></table>

---

## Dock and arrival

**Vibe.** Overview: hardware, the Companion seated in the dock, crates and a bay door.

**Purpose.** Cargo arrives when the Companion docks and the player opens the bay. **Reads first:** how many crates are in the bay, then the ribbon.

- **Instrument.** The sample bay leads: docked, its door shows one sealed crate per consignment. `✓ Open the bay · 2 crates`. Then, per crate: the seal breaks, pods travel in a straight line into the rack's wells, the counters tick, the Probe dock shows the free mend, a ribbon names the crate ("First crate home"), the world turn jumps.
- **Living window.** The vivarium stays; residents turn toward the bay as crates open.
- **Composition.** Home's layout; the Bay module lifts 2 px, the chrome lift, and nothing is scaled; the ribbon sits inside the glass's top. A report card waits on the vivarium until the next press.
- **Lively / quiet.** Lively: the crate, the pods' travel, the residents' reaction. Quiet: the other modules.
- **Light.** A cool beam inside the bay as the seal breaks; the vivarium unchanged.
- **Palette.** Crates in slate and teal with orange seal tags; counters flash yellow.
- **Type.** Inter: the ribbon and the card's heading 20 px medium; the report lines 16 px.
- **Chrome.** Presses during the arrival are consumed; focus stays on the room; then `✓ Look at the new pods`.
- **Motion.** About 3 s per crate: seal 300 ms, each pod's travel 600 ms.

**The portrait crate** ([the portrait](../proposals/the-portrait.md) §1). A finished portrait comes to the bay like cargo: while it is painted, a flat crate silhouette waits behind the bay door with its lamp slowly filling (no clock, no digits; "waiting for the cloud" when offline); landed, the bay lamp turns amber, `✓ Open the bay · 1 crate`. The seal breaks, the flat crate slides out, its lid lifts and the portrait stands on the stage in its gilt frame, ribbon "Fig's portrait"; then `✓ Look at Fig` opens Habitat, where Fig is drawn fresh in its painted set. The welcome sitting arrives here too, as a small gift crate ("a sitting, to begin").

**Pass when**
- [ ] Docking alone shows crates and accepts nothing.
- [ ] Each crate's arrival reads as one event.
- [ ] The free mend shows on the Probe dock.
- [ ] Nothing of the field is drawn; the Station shows only what it owns.
- [ ] A still frame tells the same story.

<img src="../proposals/station-screens/02-dock-arrival.svg" width="600" alt="Dock and arrival wireframe">

*Dock and arrival wireframe. Layout only.*

The measured layout, states and timeline are [Station layouts, Dock and arrival](station-layouts.md#dock-and-arrival). The ribbon has no digits and says the crate only: "First crate home"; how far the land is explored is on the report card.

---

## Pods

**Vibe.** Research bench: a modern digital lab.

**Purpose.** Identify a pod, read its chapters, compare, return. **Reads first:** the pod and its name.

- **Living window.** The specimen stage: the pod under the cool cone of light. It is the one warm thing: a soft inner glow, then, once identified, the seal on its cap broken and the species glyph lit.
- **Instrument.** Three states ([Station layouts, Pods](station-layouts.md#pods-collection-pod-overview-chapter-page)). The collection: every rack place, each pod with its name, place picture and progress ring. The overview: the chapter rail hanging from the top bar, each tab with an emblem, one word and its pips; the figure; where the pod came from; its kin; the return hatch with a leaf mark; the stamp on its 120 px label in a small, dim case at the right. The chapter page: every trait of the open chapter as a picture, with no pane.
- **Progress ring.** Around each pod in the collection: one arc per chapter, filled when that chapter is read, the band closed when every chapter is read; a star on the band is a glint. No digits.
- **Chapter states.** Unread (a dotted outline round an empty picture, the trait's name under it); glint (a four-point star); shows and hides (a close, warm drawing of each trait on this pod's mibi, the misty seed glyph after its name holding the hidden look); only (a small base glyph after the name); asleep (the asleep mark); breed to change (two joined rings); sealed (the page shut, with a picture of the find that opens it).
- **The stamp.** The genome code is the stamp, on its 120 px label at the edge of the overview, never the spotlight.
- **Composition.** The collection a 3 × 2 grid of places. The overview: the pod on its dish in the left third, the figure beside it, where it came from and its kin at the right, the rail centred across the top. The chapter page: the pod at the left, the page to its right.
- **Lively / quiet.** Lively: the pod's glow, glints, the page turn. Quiet: the rail, the rings, the bench.
- **Light.** The cool cone of light from above onto the pod's dish; a read page lit warm from inside; the rail and the rings cool.
- **Palette.** Pods from one renderer: the species' colour pair and shell pattern, the place's dust or moss; frost pale blue-white; seeds pearl with a ghost inside; the collection ring read `bone`, unread `bevel`.
- **Type.** Inter: the pod's name 20 px medium on its plate; the origin 16 px ("Found on the rock field, as a Tuikis felt safe."; the pattern is in [Station layouts](station-layouts.md), Words on Pods); the page heading 20 px medium; one word per chapter and one word per trait, 16 px.
- **Chrome.** `✓ Identify   ⚡ 1`, `✓ Read Coat   ◆ 3`, `✓ Shape a founder`, `✓ Compare`, `✓ Return to the wild   ❀ +1`, `✓ Open the guide` on the figure; the way back `← Home`, `← Pods` or the pod's name.
- **This pod, the species.** On the overview, "this pod" under the pod's marks and "the species" under the figure, once identified. The ring starts on the pod with `✓ Shape a founder`; the figure is a side trip one ▶ away, and ✓ on it opens the species' guide: a jump to the Book's guide spread, where ← reads Library.
- **Motion.** The seal breaks and the glyph lights in about 2 s; a read wipes the page's frost in 2 s and the tab's pips fill; the page turns in 200 ms; glints 2 Hz.

**Concept.** The genome stamp sits on its 120 px label, a small label and never the spotlight. The progress ring sits around the pod and carries chapters only; "identified" shows on the pod's seal. The dark glass lab is the bench, and Create and Incubator follow it. Reference: `art/concept-station/pods-v2/`, candidate PV-D-r3-a4.

**Chapter rail.** Every research-bench screen shows as many chapters as the species has, in ring order; there is no fixed count. The four-tab rails in the concept plates are legacy concept art.

**Pass when**
- [ ] Unread chapters show nothing; draw only what is known.
- [ ] The seven chapter states are told apart without colour.
- [ ] The progress ring reads at a glance in the collection, with no digits.
- [ ] The stamp is a small label, never the spotlight.
- [ ] No letters, ratios, loci or progress digits anywhere.
- [ ] The pod is the warmest, brightest thing on screen.
- [ ] Pods of one species match; no shell shows an individual's genes.

<img src="station-layouts/02b-pods-overview.png" width="1024" alt="Pods, the pod overview">

*Pods, the pod overview, 1× wireframe; measured in [Station layouts, Pods](station-layouts.md#pods-collection-pod-overview-chapter-page).*

<img src="../../art/concept-homepage/station-research-pod.png" width="512" alt="Pod in its cradle concept">

*station-research-pod: the pod in its cradle under a beam. Concept, generated. Its icons and type are not specs.*

---

## Create (the review)

**Vibe.** Research bench: a modern digital lab.

**Purpose.** Shape a founder and see its cost. **Reads first:** the founder.

- **Living window.** The founder large in a specimen chamber at the centre, at 300×310 or larger, rich treatment. Wherever a chapter is unread, that part stays misty: a cool frost over the body, never a guess.
- **Instrument.** The same chapter rail as on Pods, same order. The opened pod at the left; the empty dome, its leaves and the stamp label at the right. A shapeable trait carries ▲▼ notches and rolls among three pictures (as the pod is, only the first copy, only the second copy); a changed one wears a "changed" tag; a doings trait wears two joined rings and "breed to change"; clashing traits are marked and Grow is withheld.
- **Composition.** Founder centred and lowest-set; the roll and the rail above; pod and dome balance it left and right.
- **Lively / quiet.** Lively: the founder (breathing, a blink) and its redraw when a trait rolls. Quiet: the rail, pod, dome.
- **Light.** Warm key light on the founder from the top left; the rest cool.
- **Palette.** The founder's own colours; frost pale blue-white; the price icons in their hues.
- **Type.** Inter 16 px: the trait line ("Markings: only pale", "Claws: breed to change", an asleep line "{Trait}: {shows}, {sleeping} asleep"); the total in the bottom line.
- **Chrome.** `✓ Grow it   ⚡ 2 ❀ 4 ◆ 1`, the icon before the figure | what stays a surprise | the notice | `← Loika` (Create's parent is the pod's overview).
- **Motion.** A roll swaps the trait's picture, the founder's part and the stamp's cells in 200 ms; on Grow the stamp prints on its label, the code appears, the pod glides into the chamber in 600 ms.

**Concept.** Reference `art/concept-station/create/`, CR-C2. The painted master places the Pip asset (the same drawing on every Station screen; Pip is not regenerated). Roll pictures are flank close-ups of the changed part, not whole founders. The chapters still to read are named in the bottom line's context ("Coat stays a surprise", "two surprises to come"), and their tabs show unread, the word in `mist`.

**The founder's look** ([art pipeline](../proposals/art-pipeline.md) §1.1). The rig's render is the **placeholder**, not the game's art. A unique painted render is the **portrait**, a prize a mibi may earn, paid with **a sitting** earned by research; Create never shows one. The founder on Create is drawn in the placeholder (the stylised rig pass: flat slots, outline, no face, no material; [the placeholder brief](../proposals/plain-renderer.md)), since nothing is painted before Grow; the roll pictures are placeholder close-ups. Grow starts the standard painting. The pass line "same trait boundaries as the Companion's HiBit drawing" holds for the placeholder as it does for the painting.

**Pass when**
- [ ] Founder, changes, surprises and cost are all visible at once.
- [ ] The founder's misty parts match the unread chapters exactly.
- [ ] A roll changes only what that trait covers, and never offers a look the pod lacks.
- [ ] The code appears only at Grow.
- [ ] Same trait boundaries as the Companion's HiBit drawing.

<table><tr><td valign="top"><img src="../proposals/station-screens/05-create.svg" width="480" alt="Create wireframe"><br><em>Create wireframe. Layout only.</em></td>
<td valign="top"><img src="../../art/miniature-lives/exports/lab-known-comparison.png" width="420" alt="Station known comparison"><br><em>Two individuals differing only in markings, at Station size. Appearance reference (creature only).</em></td></tr></table>

---

## Incubator

**Vibe.** Research bench: a modern digital lab, with the chamber's glow as the one warm thing.

**Purpose.** Watch the bud grow and open it. **Reads first:** the glowing bud, then how many leaves remain.

- **Living window.** Inside the dome: a cute, generic glowing bean in a nest, brighter as it grows, with no drift toward the species' hue, with the species' shape glowing inside it when ready. Never an embryo shape at any stage. Warm, slow, alive.
- **Instrument.** The incubation chamber: a glass dome on a machined base, two arcs of leaves as the timer (one leaf a minute, the current leaf filling from its foot in whole rows, a row every 3 s), the stamp on its label at the right, its code under it as live text. On a founder's bud the unread chapter tabs above clear one by one, except a sealed chapter that is still shut, and the stamp's chapters fill with them.
- **Composition.** The dome centred and large, a bell jar 304 px wide on its 336 px base; the leaves in two arcs over it; the chapter rail above; the plaque on the base.
- **Lively / quiet.** Lively: the bud's glow and the filling leaf. Quiet: everything else. Ready: the dome glows, the shape visible inside the bud, and nothing steps out until the player opens it.
- **Light.** Warm light from inside the dome; cool chrome around.
- **Palette.** Leaf greens for the timer, pale glass; the bud's glow in its own two pictures, early and late, never drifting toward the species' hue.
- **Type.** Inter 16 px: the plaque's one word; no digits for time.
- **Chrome.** Growing: `✓ Grow now   ❀ 7`; ready: `✓ Open`; empty: `✓ Choose a pod`; `← Home`.
- **Motion.** A leaf fills over its minute; Open lifts the glass in 600 ms, the bud cracks and the juvenile steps out, the ribbon "Fig, a young Loika".

**Concept.** Reference `art/concept-station/incubator/`, IN-D-r1-a3 (growing) and IN-C1 (ready). Ready keeps the shape glowing inside the bud so the player gets to crack the incubator open. The growing bud is a cute, generic glowing bean; its colour never drifts toward the species' hue, and its shape never becomes an embryo. The stamp stands alone on the Station; the code string may also show, as a shareable "look at my mibi" string.

**Instant grow.** While growing, the chrome offers `✓ Grow now` and its price, ❀ 1 for every 2 minutes left, rounded up (at most 19; the first bud 3). The first bud ever grows in five minutes, others twenty plus one per shaped trait; all timers sit under the developer-tools toggle for testing. The bud has two states, growing and ready; with no bud the Incubator opens empty, an invitation to grow one. A portrait arrives as a crate in the sample bay (Dock and arrival, [the portrait](../proposals/the-portrait.md)), and the sitting that pays for it is chosen on Habitat (the Sitting, below).

**The standard painting** ([art pipeline](../proposals/art-pipeline.md) §1.1). Grow starts the mibi's standard painting; the chamber keeps its two states, and the painting is not a third. **At Open,** the juvenile steps out in its standard painting if it has landed (a connected kit, within the bud's minutes), else in the **placeholder**: the stylised rig pass, flat and outlined, no face, no material, with a small cool "waiting" lamp on the chamber's base and the status "its painting is on its way" (offline: "waiting for the cloud"). **The painting lands** at the next fresh draw of that mibi (a screen change, waking, coming home), never while it is on screen, and the lamp goes out; no ribbon, no crate, no spinner. The same placeholder and lamp show on Home's vivarium and Habitat for any resident still waiting. The juvenile that steps out is the founder from Create in either look.

**Pass when**
- [ ] Time reads as leaves, never digits.
- [ ] The bud is the only warm, living thing.
- [ ] Ready reads from across a table.
- [ ] The juvenile that steps out is the founder from Create.
- [ ] A still frame shows progress.

<table><tr><td valign="top"><img src="../proposals/station-screens/06-incubator.svg" width="480" alt="Incubator wireframe"><br><em>Incubator wireframe. Layout only.</em></td>
<td valign="top"><img src="../../art/concept-homepage/pip-life-stages.png" width="420" alt="Life stages"><br><em>The juvenile that steps out reads young by proportion. Concept, generated.</em></td></tr></table>

---

## Library

**Vibe.** Library: a botanical tome. Two screens: the **Spread** and the **Book**. The Library is one object, an old botanical-expedition volume, and both screens are its pages.

The collection screen is the **tome's spread of plates**: reference `art/concept-station/library-spread/`, SP-P-r4-a1. An unmet species shows no cue at all of what it may be: no silhouettes and no shapes in the mist. The collection reads as a collection, with a dedicated place per species, and nothing on it steals the spotlight from the specimens. Lineage matters: the stamp carries it, and the Book shows a family tree (display in `design/proposals/family-tree.md`).

**Never childish** ([art direction](../art-direction.md)). The look is cute by charm and craft, as Pip is; not cartoon simplification, sticker faces, toy-like rendering, nursery colours or storybook ornament. The spread is the example: a real naturalist's expedition volume in ink and watercolour, restrained ornament, plates at Pip's craft, a real pencil study, aged natural colours and the device's own type on the chrome; lanterns, scrollwork and ribbons read storybook, plates read as stickers, a cute cat and serif type on the chrome fail it. Every Library brief, critique and master checks against this line.

### Spread

**Purpose.** The whole collection at a glance, as pages of the book that opens from it. **Reads first:** the found plates among the sixteen frames.

- **Living window.** None; the spread is quiet. The plates' own warmth is the only warmth, inside the found frames.
- **The tome.** An old botanical-expedition volume: aged, foxed laid paper with worn boards and a deckle; a single ink rule; restrained life in the margins, a cloth marker, a leaf and seeds, a dried flower, a wordless pencil scribble, a survey sketch, none covering a frame. No scrollwork, lanterns or ribbons. The device's own sans (Inter) on the chrome; a serif leak is a fail.
- **Frames.** Sixteen ruled frames to the spread, eight a page in two rows of four, one place per species, all seen at once; the collection grows by a page turn, never by scrolling. Each frame has a blank caption rule under it.
- **Found.** A tipped-in framed plate in the book's own plate style (the Book's mounted portrait at small size), painted at Pip's level of craft; never a flat card or a sticker. Once a mibi of the species is portrayed, its portrait takes the plate, with a gilt corner on the mat (with several portrayed, the Book offers `✓ Make Fig the face`). Loika's plate is the placed Pip.
- **Met, not researched.** An anatomical pencil study, a real naturalist's pencil with its construction lines, the name in pencil grey.
- **Unmet.** An empty ruled frame with a blank caption rule and no cue: no silhouette, no shape, no colour.
- **Clan.** An inked rule in the clan's colour over the frame of each met species; none at the page edge, none on unmet frames.
- **Focus.** A thin rounded rectangle around the frame, in `rust`, the ring on paper.
- **Composition.** The open spread fills the stage; frames 96×112 with their caption rules; the margins' life between and around them.
- **Palette.** Aged cream and sepia; graphite; the plates' own natural colours; the clan colours only on the inked rules.
- **Type.** Inter: the title 20 px medium; names 16 px in the device type, placed on the caption rules (the met name in pencil grey); nothing under unmet frames. No digits.
- **Chrome.** `✓ Open` on a found or met plate; read-only on an empty frame. No ledge, no synopsis objects: the spread itself is the record.
- **Motion.** The plate lifts off the page and becomes the Book's mounted plate in 300 ms; a page turn past sixteen.

### Book

**Purpose.** Each species' field guide: its frame, the looks found so far, lineage and wishes. **Reads first:** the species' portrait and name.

- **Living window.** The species portrait: one resident of that species in rich treatment, doing its habit (dig, glow, puff), mounted on the page as a framed plate.
- **Instrument.** Two spreads. The face spread: the species' places as stamps; the frame once, as a pressed plate; the stamp at 120 px on a plain plate (the type specimen's, with no mibi name, until a portrait); the family tree panel under the stamp; the pinned wish; a page-turn corner to the guide (`book-corner-turn-24x24`, only when the species has a guide). The guide spread, the fold-out: every chapter as a column, every look found and still to find (Guide, below).
- **The clarity line.** Under the habit line: "A typical Belatz, not one of yours."; with a portrait, "Fig, your Belatz, sat for this."
- **Composition.** Portrait at the left (304×312); the places and the frame plate beside it; stamp, tree and wish at the right edge.
- **Lively / quiet.** Lively: the portrait. Quiet: the guide, the tree.
- **Light.** Warm on the portrait; cool, even light on the archive.
- **Palette.** The tome's cream, the species' hues on plates.
- **Type.** Inter: the species name 28 px on a paper label, with one 16 px habit line under it; no paragraphs.
- **Chrome.** `✓ Visit Fig` on a mibi (on the face spread only when the face is a living mibi's portrait: the type face has no ✓ cap), `✓ Add to the wish` on a look, `✓ Find a pair` on a wish, `← Library`. `✓ Visit Fig` is a jump: on Habitat, ← reads Home.
- **Motion.** The page turns to the guide in 300 ms; the portrait lives.

**Concept** (`art/concept-station/library-book/`, BK-D-r2-a1). The portrait is mounted as a framed plate, not painted straight onto the page; the family tree panel sits under the stamp, about 180×160 px; the name sits on a paper label with the habit line under it. The label's copy and the names follow the house words and this guide's type: consistent case and the typeface.

**The face and the portrait** ([the portrait](../proposals/the-portrait.md) §1, §7). The book's living window is the species' **face** (a resident in the standard look, doing its habit) until a mibi of the species has sat for its portrait; then **the portrait replaces the face**: that mibi in its chosen pose and place, alive in the window, the habit line under it. A portrayed mibi returned to the wild keeps its portrait here, marked "released". After the welcome portrait, the gilt frame is drawn faintly over the species' last empty look plate to show where the next sitting comes from.

**Pass when**
- [ ] The spread shows every released species' frame at once, sixteen to the spread, no scrolling; more species turn a page.
- [ ] The specimens are the spotlight: framed plates in the book's style and a real pencil study, never flat cards or stickers; the tome's life stays in the margins.
- [ ] Unmet frames give no cue at all; the met study shows only what the field saw.
- [ ] Nothing childish: no storybook ornament, no sticker plates, no cute animals, no serif on the chrome.
- [ ] Knowledge, never material: nothing implies a look, or a wish, can be taken from here.
- [ ] The family tree reads parents, siblings and children without text.
- [ ] Two mibis are told apart by stamp at 40 px.
- [ ] No digits, no ledge, no furniture; never a text page or a school lesson.

<table><tr><td valign="top"><img src="../../art/concept-station/library-spread/placed/SP-P-r4-a1-pip-named-1024x600.png" width="480" alt="Library spread concept"><br><em>The Spread, SP-P-r4-a1 with Pip and the names placed. Concept art, generated and placed; the direction, not a master.</em></td>
<td valign="top"><img src="../../art/concept-station/library-book/placed/BK-D-r2-a1-stamped-named-1024x600.png" width="480" alt="Library book concept"><br><em>The Book, BK-D-r2-a1 with the real stamp and the name placed. Concept art, not a master.</em></td></tr></table>

---

### Guide

The field guide is the Book's fold-out second spread, turned with ◀ ▶; ← reads Library. Measured in [Station layouts, Book: the guide spread](station-layouts.md#book-the-guide-spread); the numbers are in `prototypes/ui/specs/station/library.json`.

**Purpose.** The species whole: what is found, what is left, and who carries a look. **Reads first:** the face and the name, then the chapter panels.

- **The species, said.** The face (`guide-face-<SNN>-128x112`, the type painted for the guide), the name, and under it "Every look a Belatz can carry, found across your Belatz."
- **Columns are chapters.** One panel per chapter, shared by every species and tinted by it: one pixel in eight of the species' pod pigment on paper, with a 2 px band of it across the top. Up to seven chapters 128 wide on a 136 pitch; eight 112 wide on a 120 pitch; never a scroll.
- **Progress on every trait.** One pip per look, filled found, dotted unseen, in groups of five. No digits.
- **Sealed.** A shut panel with its notch and no traits.
- **One detail band.** The open trait's looks as plates and one dashed "more?", each plate keylined in `bark`, "Carried by" with your mibis' names on two lines at most.
- **Wish.** A mark on a pinned trait and its plate; the pinned wish itself stays on the face spread.
- **Palette.** The tome's paper; colour only in the tints, the plates and the face.
- **Chrome.** `✓ Add to the wish` or `✓ Take it off the wish` on a plate; `✓ Visit Fig` on a name (a jump: on Habitat, ← reads Home); read-only on a cell; `← Library`.
- **Focus.** On the tome's paper the ring is `rust`, the same geometry (frame.json `focus.ring.onPaper`), on the Library, the face spread and the guide.
- **Motion.** The page turns in 300 ms.

**Pass when**
- [ ] It says it is the species, in one line under the name.
- [ ] Eight chapters fit with no scroll, every word whole.
- [ ] Ten looks read as two groups of five at 1×.
- [ ] Nothing is new state: every field comes from `fieldGuide`, the wish rules and `chapterLooks`.
- [ ] No digits, no connectors, nothing childish.

## Habitat

**Vibe.** Vivarium: cozy, warm, the pet happy at home.

**Purpose.** One mibi up close: name it, spend time with it, take it with you, bond, cross, have it sit for its portrait, or return it to the wild. **Reads first:** the mibi, then its name.

- **Living window.** The mibi at 304×312 in the vivarium's light, its standard painting or its placeholder with the waiting lamp, doing its species moment on Spend time. Its name on a tag under its feet, 20 px.
- **Instrument.** A card at the right: "your Loika, adult" (the species word, with `mark-guide-16`, is the door to the guide), where it came from and what it remembers, its code, the stamp on its 120 label (the stamp is the genome code), and one plate a chapter. Under it five modules, one engraved word each: Companion, Bond, Portrait, Cross, Wild. The strip of bays along the foot, thumbnails only.
- **Composition.** The window at the left (16 to 576), the card and modules in a 416 px column at the right, the strip 64 px along the foot.
- **Lively / quiet.** Lively: the mibi. Quiet: card, modules, strip.
- **Light.** Warm key light from the top left in the window; cool on the card.
- **Palette.** The vivarium's greens and earth; card chrome; the heart a small enamel heart in the house light. Nothing on Habitat is amber.
- **Type.** Inter: the name 20 px medium on its tag; the card's lines 16 px.
- **Chrome.** The four zones, the price icon first, no dots: `✓ Spend time with Fig`; `✓ Rename Fig`; `✓ Take Fig with you` | "goes at the next dock"; `✓ Bond with Fig`, then `✓ Again: bond with Fig`; `✓ Cross Fig`; `✓ Portray Fig` | "one sitting each, ever"; `✓ Return Fig   ❀ +2` | "goes back to the wild", then `✓ Again: return Fig` | "never taken back"; `← Home`.
- **Motion.** Walking the strip dithers the mibi shown in 200 ms; the species moment plays about 2 s.

The measured layout, the focus graph and the states (rest, the meet, empty) are [Station layouts, Habitat](station-layouts.md#habitat).

**Pass when**
- [ ] The mibi is the same individual as on the Companion.
- [ ] Stage reads from proportion and bearing; elders calm and dignified.
- [ ] No meters or needs.
- [ ] The door shows where the mibi with you is.
- [ ] Spend time rewards nothing and shows nothing like a reward.

---

## Sitting

A sitting is spent in a ceremony on the Station: the player chooses the one mibi, a pose from its habits and a place it has been. It takes real time, longer than a bud, and the portrait arrives as a crate at the dock. The words are sitting, portrait, portrait card and `✓ Portray`. One sitting a mibi, ever; a sitting earned while one is held is not given, and the Station warns ahead. Its rules are in `prototypes/station/src/sitting.mjs`.

On Habitat, the Portrait module offers `✓ Portray Fig` while a sitting is held and the mibi can sit ([Station layouts, Habitat](station-layouts.md#habitat)).

The sitting is its own screen under Habitat, opened from the Portrait module, with three steps: the pose, the place, then look and confirm. Its layout is [Station layouts, Sitting](station-layouts.md#sitting).

---

## Cross and Wish

**Vibe.** Research bench: a modern digital lab, two living specimens and a forecast between them.

**Purpose.** Pick two adults of one species, see what their child could be, cross them; see how close a pairing gets to a wish. **Reads first:** the two parents, then the forecast.

- **Living window.** The two parents left and right as 48×48 portraits at the heads of their columns. Between them the child to be, misty, never a promise, with the kinship word on its pill.
- **Instrument: the splice.**
  - **Overview.** Each parent is a column of chapter modules, and each locus leaves it as two wires, its two copies. A gate per locus splices them: a switch passes one copy of two, a blend mixes them. The wires run inward to the child: four seeds for a switch, and for a blend a track with both parents' values and the stretch where the child can land.
  - **Chapter view.** One chapter's traits, each copy's look printed on its wire. ▲ ▼ walk from the overview through the chapters.
  - **Kinship and the wish.** Kinship is `amber`: a narrowed range, and seeds where a hidden look can surface. A pinned trait's glint is lit when a child can reach it.
  - **What is not shown.** Only what the player has read, and an indication of everything missing: an unread chapter draws frost and "read Rook's Shape", and never a hidden copy.
- **Composition.** The parents' heads sit at the outer edges, the child's head between them, and the splice under them, flowing inward. The chapter view hangs the shared chapter rail.
- **Lively / quiet.** Lively: the parents. Quiet: the splice.
- **Light.** Warm key light on the parents from the top left; the splice in the instrument's cool, even light on the bench.
- **Palette.** The parents' own colours in their portraits and pictures. Wires by kind: switch `lilac`, blend `aqua`, settled `bevel`, unread `frostS`, sealed `hairline`. Kinship in `amber`, and the wish in `yellow`, its one accent.
- **Type.** The parents' names in 20 px medium; trait names, words and the looks on the wires in 16 px; no digits but the price.
- **Chrome.** `✓ Cross them   ⚡ 2 ❀ 4` | the pair and the species | the notice | `← Habitat`. The notice names the first missing read ("read Rook's Shape"). An ineligible pair draws no ✓ cap, and its reason takes the notice.
- **Motion.** A partner swaps in 300 ms and the wires re-route with it. A chapter opens or closes in 200 ms. On Cross, the gates take one copy each, and the child's pod glides into the incubation chamber in 600 ms.

**Pass when**
- [ ] No odds as numbers, no percentages, no promise of a result.
- [ ] Each forecast reads as four seeds without colour.
- [ ] Only adults of one species can be paired; a refusal comes before any spend.
- [ ] Each switch gate visibly passes one copy from each parent, and each blend gate mixes the two.
- [ ] Nothing of an unread or sealed chapter is drawn but frost, the words to read it, or its find.
- [ ] A wish reads as knowledge, never material.

Wireframes: [09a-cross-overview.png](station-layouts/09a-cross-overview.png) and [09b-cross-chapter.png](station-layouts/09b-cross-chapter.png); measurements in [station-layouts.md, Cross: the splice](station-layouts.md#cross-the-splice), and numbers in `prototypes/ui/specs/station/cross.json`.

---

## Probe bench

**Vibe.** Research bench: a modern digital lab, the Probe on a service cradle.

**Purpose.** Keep the Probe ready: mend its Shield plates, set whether the dock mends every plate, fit the upgrade. **Reads first:** the Probe, then its plates.

- **Instrument.** The Probe large in its cradle, its Shield plates standing under it (the tier's count). At the right, the Mend module (a switch and a picture of what it means: the dock, then the plates it leaves whole) and the Upgrade module (the socket and part, what it adds as pictures, lit only when affordable). The one screen whose subject is a machine.
- **Composition.** The cradle and the column form one group centred on the screen: the Probe on the axis x 296, the two modules at the right.
- **Lively / quiet.** Quiet until a press.
- **Light.** A cool key light from the top left, as on Create and the Incubator; the Probe the brightest object. No warm field on this screen.
- **Palette.** Slate and graphite; plates white when whole, outlined when gone; lamps on (`sprout`) or off. Nothing on the bench is amber.
- **Type.** Inter 16 px: the modules' engraved words.
- **Chrome.** The four zones, the price icon first, no dots: `✓ Mend a plate   ⚡ 1` | "one plate to mend"; `✓ Switch on` | "the dock mends two, free"; `✓ Fit the upgrade   ⚡ 12 ◆ 4`, then `✓ Again: fit the upgrade`; `← Home`.
- **Motion.** A plate seats in 300 ms; the switch's knob slides in 200 ms; the upgrade fits in 900 ms.

The measured layout is [Station layouts, Probe bench](station-layouts.md#probe-bench).

**Pass when**
- [ ] Shield state reads from the plates alone.
- [ ] The armed state is visible before the second press.
- [ ] The Probe is the same device the Companion draws.
- [ ] Away, the cradle shows the Probe is out, not missing.

---

## Idle

**Vibe.** Vivarium: the pets at ease, nothing asking for you.

**Purpose.** A living view the Station can show permanently, always on: the vivarium, something worth looking at all day; never a screen off or a sleep. **Reads first:** the residents.

- **Living window.** The vivarium at 1024×568, above the strip, its light following the time of day, residents keeping their routines.
- **Instrument.** Reduced to one line on a thin cool strip at the foot, one sentence of six words or fewer ("a bud is growing", "Dot is out with the Companion"), and nothing else.
- **Composition.** The vivarium edge to edge; the strip 32 px.
- **Lively / quiet.** Lively: everything in the vivarium. Quiet: the strip.
- **Light.** Day to dusk to night in the vivarium, always the warm key light from the top left; at night warm and low (the glow-moss and the residents' own glows), the moon only a cool rim; mean L* 30 or more at night, mean red at least mean blue in every light; Home's glass shows the same light.
- **Palette.** The vivarium's; the strip in chrome.
- **Type.** Inter 16 px regular, the line in `mist`.
- **Chrome.** None. The first press only wakes; nothing else happens, and waking never rewards.
- **Motion.** Continuous and slow; nothing blinks for attention.

**Pass when**
- [ ] Beautiful at a distance, all day.
- [ ] Nothing decays and nothing nags.
- [ ] Residents are the rich treatment at full size.
- [ ] The status line is the only text.
- [ ] Night is calm, never gloomy.

The measured layout is [Station layouts, Idle](station-layouts.md#idle): the vivarium 1024×568, the strip 32 px, one sentence of six words or fewer, a state of the frame.

<img src="../../art/concept-homepage/companion-resident-home-450x600.png" width="225" alt="Resident at home concept">

*companion-resident-home: the warmth idle carries, at Station resolution. Concept, generated.*
