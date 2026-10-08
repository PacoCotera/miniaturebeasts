# Station Field Test (Station stand-in v2)

Builds the decided [Station loop](../../design/proposals/station-loop.md) (decisions 1–7 of 2026-10-07, with the sealed bay and the genome fingerprint) through the screens of the [Station screens proposal](../../design/proposals/station-screens.md), taking its four recommendations: the bay opens with a press, Create doubles as the review, the incubator shows leaves instead of minutes, and pods that find no free cup wait sealed. The page simulates the Station's 1024×600 screen at 1:1 device pixels inside a depicted handheld with the screen on top and one row of big keys under it (the pad, the four view keys, Back and Confirm), which keep their real size on a phone while the screen scales, and shares one save with the [Companion page](../exploration/README.md) in the same browser.

The loop it plays: explore on the Companion page → **Head home** seals the hold into a crate in the Companion's bay → here, **Dock** → ✓ **Open the bay** → the pods roll into their cups → **Identify** → **Study** a window → **Shape a founder** (Create, which is also the review) → **Grow it** → the incubator's leaves fill → ✓ **Open** and meet the mibi → Habitat: **Take it with you** → the Companion page has it with you.

## Keys

The Station's depicted keys, mapped to the keyboard. Routine play uses these only; nothing on the screen is clickable.

| Key | Keyboard | Does |
| --- | --- | --- |
| Pad | ← ↑ → ↓ | Moves the warm focus ring between drawn things, spatially. On Create, ↑ ↓ roll a studied window through what the pod carries |
| Home (amber) | H | The vivarium and the bench |
| Research (teal) | R | The pods |
| Library (violet) | L | Species and lineage |
| Habitat (green) | B | Residents, the with-you door, the bond |
| ← | Esc / Backspace | Back one view. On Home: focus back to the room; on the room it only says so (Rest is the lamp on the bench, never ←) |
| ✓ Confirm | Enter / Space | Exactly what the bottom line names, with its price |
| Caddy: Dock / Lift | D | Prototype only, beside the Station: docks or lifts the Companion. It is not a Station key |

The four middle keys switch views and never spend. Every spend is one deliberate press; returning a pod, bonding and the tier 2 upgrade take two (the first arms).

## The frame

- **Top bar (40 px):** the screen's name in 3× type and the world turn ("T5", flashing when it jumps); the three counters, ⚡ Energy, ◆ Data, ❀ Essence, counting up visibly when they change; the Companion's state on the right ("Companion docked · 2 crates in the bay", "Companion away · since 16:05 · with Dot", "no Companion yet").
- **Stage (522 px):** one picture to act on.
- **Bottom line (38 px):** `✓ action · price · ← where` | the subject | what most needs you (amber). Read-only focus leaves the ✓ part empty. Prices show as the material icons inside the line.
- Messages show in a small wooden plate above the bottom line until the next press (4 s at most).

## Screens

- **Home** (built). The vivarium on the left two thirds: a lit glass terrarium (back wall, plants, rocks, a water dish, a burrow) where residents keep simple species routines: wander (a Loika hops), nap ("z"), eat, and turn toward each other when they pass close. Juveniles are drawn at 2×, grown mibis at 3×. The with-you bed shows a Companion mark and "Dot is out with you" (or "is with you" while docked); when the only mibi is out, the vivarium says so too, and so does the idle view. The bench on the right third, as objects: the **bay door** (closed while away; docked, one sealed crate per consignment slides in), the **pod tray** (six felt cups, shells in their place colours, a star where a pod glints), the **incubator** (glass dome, embryo, leaves) and the **Probe cradle** (the Probe and its plates; a ghost of it while the Companion is away). Under them a status strip of a few words and the reading lamp: ✓ on it rests the screen. Focus rests on the room; the pad moves the ring to a resident or a bench object. ✓ on the room does what most needs you (Open the bay · Open the incubator · Meet Fig · Look at the new pod · Visit Fig); ✓ on a thing opens it.
- **Dock and arrival** (built). Dock alone accepts nothing: the crates appear in the bay door and the line offers `✓ Open the bay · 2 crates`. Opening plays one arrival per crate, in order, 3 s each: the seal breaks, the pods arc into their cups, the counters tick, the clock shows the turn the Companion brings (it catches up with the Companion at every dock, crates or not), and a ribbon reads "Expedition 4 home · 2 pods · explored 9 of 21". Presses during it are consumed. Then a report card stays on the vivarium until the next press: each crate's line, the materials, the mend ("Shield back to 2 plates · 2 free · 1 ⚡"), and up to three world-turn lines the Companion recorded. Each crate is accepted once (its id is kept); a reload never reopens one. The free mend happens at the dock: a break is mended in full, otherwise the Probe is brought up to two plates, then 1 Energy a plate while "Mend fully on docking" is on (also after each crate's Energy arrives).
- **Pods** (Research key, built). The tray as a column of cups and a garden gate, with a fixed focus order: ↑ ↓ go cup by cup, then the gate; → goes to the pod, ← from the pod back to its cup, ↑ from the pod to the windows (◀ ▶ among them, ↓ back). The bottom line names the cup ("cup 2 of 6 · Tuikis pod · …") or the gate; the pod in a padded cradle under a lamp, with its place and how it was found ("rock field · a Tuikis felt safe · expedition 4"). Focusing a cup brings its pod into the cradle (looking is free).
  - **Identify** (1 ⚡, the first pod ever free): the shell turns translucent top-down to the species' silhouette and a "New species" stamp (a known species logs at once). The trait windows rise in an arc, frosted, and the fingerprint whorl appears in plain ridges.
  - **Study** a window (2 ◆; the first study of each species is free, and the button says so): the frost wipes away top-down in two seconds.
  - **Compare:** from the tray, ✓ on another identified pod of the same species puts both side by side, windows aligned; windows studied on both that differ pulse. Free; ← closes it.
  - **Return to the wild** (the gate): `✓ Return to the wild · +1 ❀`, ✓ again. The Companion puts the pod back, buried, in the place it came from at the next dock.
  - A tray of six: pods that find no free cup wait sealed in the bay and roll in when a cup frees.
- **Trait windows** (built, all six states). A wooden arched pane with an emblem (swirl, crown, drop, paw) and a word under it. **Frosted** (nothing behind it); **glint** (a twinkling star where this pod carries a look not yet seen in that species, once that window has been studied on some pod; a small star on its cup too); **shows + hides** (a close drawing of that part of this pod's mibi, and a misty seed on the sill holding a ghost of the hidden look: "shows stripes · hides spots"); **through and through** (a small solid base); **family mark** (two joined rings: opens like the others, never rolls at creation); **shutter** (closed slats with a picture of what opens it: the Untuva's colour needs Probe tier 2). Unknown parts of a picture stay under frost; a colour not yet known draws in neutral frost tones.
- **The fingerprint** (built). A round whorl, one petal per window clockwise from the top left, 3–7 nested ridges per petal with a twist, all from a hash of the genome code; a studied petal fills with the hue of what shows and a seed dot at its base takes the hue of what hides. It appears on the cradle (96 px), on Create (petals flip as windows roll), on the incubator plate and lineage entries (40 px) and on the Habitat card (96 px). The **code** (base-32, eight characters plus a check character, shown as `G7F · CD0 · 3H2`) is shown only for mibis, from the moment of Grow.
- **Create** (built; it is the review). Studied windows show their picture with "shows X · hides Y" and the misty seed (or the base); unstudied ones a frosted pane; shutter and family marks as on Pods; a "+2◆" tag on each window that can roll. The founder large (8×) in the centre, misty wherever a window is frosted; the pod on the left; the incubator and the whorl on the right. ◀ ▶ move between windows; ▲ ▼ roll a studied, choosable window through what this pod carries (as the pod is → the hidden look through and through → the shown look through and through); a "changed" tag marks it and the price grows by 2 ◆. A window the pod shows through and through offers nothing else. The line always reads the total: `✓ Grow it · 2 ⚡ 4 ❀ 2 ◆` (the first founder ever: `first founder: 2 ⚡`), or what is short, or "the incubator is busy"; with one window studied or none it says "Study more windows to shape more". ✓ Grow stamps the code and moves the pod into the incubator; ← goes back to Pods with nothing spent.
- **Incubator** (built). The dome with the embryo growing as a seed, a bud, then the species' shape asleep; a row of leaves in an arc over it, **one leaf per minute** filling smoothly over its minute. Minutes: body size (Tuikis 2, Loika 3, Untuva 4) + 1 per window beyond three + 1 per window changed; the first mibi ever takes 1. The misty windows clear one by one as it grows ("cleared as it grew"). The plate shows the whorl and the code. Read-only while growing; ready, the dome glows and `✓ Open` plays the hatch: the glass lifts, the juvenile steps out, "Fig · Tuikis · juvenile", and the screen goes straight to the meet view: Habitat with the new mibi large, "Meet Fig · new", its card, code and fingerprint, focus on the door: `✓ Take Fig with you · ← Home`. A crate arriving does not shorten it (decided). The vivarium holds four; Open waits ("The vivarium is full") until one goes with you.
- **Library** (built). A shelf of seven slots: known species bright, met-but-unidentified ones as silhouettes, dashed empty slots ("more exist"). The species page: a portrait with its habit line and the places its pods came from as stamps; a **sticker book** with one pocket per window holding every look found so far (from studies, choices and hatched mibis) and a dotted "more?"; and **lineage**: each pod → its mibi, with whorl, code and three skill notches. ✓ on a mibi visits it in Habitat.
- **Habitat** (built). The focused resident large (7–8×) in its corner of the vivarium; its card (name, species, stage, ability, a memory line, the code and whorl, its windows as small pictures); the **with-you door** (the mibi in the Companion) and the **bond heart**; a strip of all mibis with the free places. ✓ on the resident: Spend time (a species moment, no reward). ✓ on the door: `Take Fig with you · now` while docked (the Companion page picks it up) or `· at the next dock` while away. ✓ on the heart, once offered after a first outing: Bond, then ✓ again (a small heart; no meters).
- **Probe bench** (built, from Home's cradle). The Probe large in its cradle with its plates; the standing switch "Mend fully on docking" (on by default, free to toggle); the tier 2 slot, lit only when affordable: `✓ Arm tier 2 · 12 ⚡ 4 ◆`, ✓ again installs (4 plates, full). Mending and the upgrade need the Probe docked; the Companion takes them at the dock.
- **Idle** (built). After a minute without a press (or the lamp on Home) the vivarium fills the screen, residents living their routines, the with-you bed, and one status line ("Companion away · with Dot · an embryo is growing"). Any press wakes it and does what it says (D docks, H/R/L/B go), so no press is swallowed.

## The trait windows of the stand-in species

Placeholder genomes pending phase 2 (made up, consistent, not the bounded trial): two copies per window, the earlier variant in each list shows over the later ones. Gait is inherited-only (the family mark) for every species, as the build scope proposes; every other window rolls once studied.

| Species | Body (minutes) | Windows |
| --- | --- | --- |
| Loika | medium (3) | markings: plain · a saddle · pale patches; ears: long · short · lop; gait (family): a springy hop · a long bound |
| Tuikis | small (2) | markings: stripes · spots · plain; crown: low · tall; colour: teal · gold · violet; gait (family): a scurry · a low glide |
| Untuva | large (4) | spots: white spots · rings · a bare cap; cap: wide · tall · frilled; colour (shutter until Probe tier 2): amber · rose · sky blue; gait (family): a waddle · a roll |

A pod's genome comes from its genome seed (`gs`), fixed on the Companion the first time the pod is taken. Studies never change it; Create commits one individual with the chosen copies, and the incubator and the hatch show that same one.

## Prices and room (station-loop.md §4)

Identify 1 ⚡ (first ever free) · study 2 ◆ a window (the first study of each species free) · founder 2 ⚡ + 4 ❀ (the first founder ever 2 ⚡ only), +2 ◆ per window changed · mend 1 ⚡ a plate beyond the free two (a break free) · Probe tier 2 12 ⚡ + 4 ◆ · return a pod +1 ❀. Six cups, four places in the vivarium plus the one with you, one incubator. The Station's store has no cap.

## The shared save

- One localStorage key, `mb-save-v8` (save format v8). The Companion page owns every top-level field; this page owns `st` (its store, tray, waiting pods, accepted crate ids, species known and met, looks seen, studied windows, mibis, incubator, dock state, the Probe as mended, the with-you request, returned pods, a log) and only reads the rest. Each page re-reads the stored save before it writes and keeps the other's part as stored; a `storage` event brings the other page's changes in at once. Species are saved as indexes, never as names, so renaming the species to Loika, Untuva and Tuikis changed no save field and the key stays `mb-save-v8`.
- What crosses only at the dock: crates (accepted ids), the Probe (a sequence number so each mend or upgrade is applied once), the with-you choice (also sequenced), mibis and species, pods returned to the wild. Memories, outings and skill notches come here from the Companion at the dock.
- What the Station reads from the Companion's part without a dock: the mibi with you (the bed and the door), the crates only once docked.
- A v7 save (the previous Companion build) is migrated by whichever page loads first: the old Station store becomes this page's store and tray (genomes are drawn from new seeds), its mibis move here with new genomes and codes, and the bay starts empty.
- A New world on the Companion page gives the world a new id; this page then starts a fresh Station. **Reset game** on either page erases the shared save (the other page follows).

## Faked or simplified

- **The Caddy** is a depicted block beside the Station with one key; docking is instant and always reachable (no "Station not answering" state).
- **Residents' routines** are a few states (walk, nap, eat, turn toward each other), positions are not saved, and no state machine comes from the genome.
- **Abilities** still come from the species; windows change looks, not behaviour.
- **Names** are given automatically (Dot, Moss, Bean, Fig, …); no renaming.
- **The walk** on the Companion is one press, not a five-press scene; **bonding** is a mark only.
- **Lineage** is a list per species (pod → mibi); families and breeding are out (§6).
- **Debug strip** under the device, not part of play: +5 of each material, Finish incubation, Show genomes (both copies of every window, codes, the log), Reset game.

## Screen and budget assumptions (as if targeting the Raspberry Pi Station)

- **Frame.** Offscreen 1024×600 at 1:1 device pixels, drawn with integer coordinates and blitted to the page without smoothing; the depicted device scales to the window and snaps to whole physical pixels when that costs ≤15%.
- **Palette.** 69 colours as data (`PALETTE`): the Companion's 48 plus 21 for the room (moss), wood, lamp light, glass, frost and felt. Gradients are the 4×4 Bayer dither between palette steps; nothing is alpha-blended or blurred. `__st.offPalette()` counts pixels outside the palette (0 on every screen checked).
- **Sprites.** The Companion's token shapes drawn at 2–9× with the same ellipses and polygons at full resolution, plus a richer shading pass (a rim of light up-left and a dithered core shadow down-right, read from the silhouette) and a variant overlay per window. Every sprite is built once into an indexed buffer and cached (as an atlas would be).
- **Text.** The Companion's 5×7 bitmap font at 2× (14 px caps) and 3× for titles; the material icons stand in for ⚡ ◆ ❀ inside text.
- **Redraw.** The browser redraws every animation frame; the device would redraw on input, on the incubator's minute, and at 2–4 Hz for the vivarium.

## Known issues

- Docking always works, even mid-expedition: the Station never reads the Companion's expedition state. Docked, the Companion takes the mended Probe (also mid-expedition, into its Shield) and the crates already sealed; the expedition simply continues after Lift. Swapping the mibi with you waits until no expedition is under way.
- The Companion page draws mibis as species tokens, so the looks chosen here don't show there yet.
- Window pictures are crops of the whole drawing at a fixed scale; a few (the Loika's gait, the Untuva's colour) show more body than the trait.
- Compare shows only windows studied on both pods; with few studies it says "no studied window differs".
- Two tabs of the same page are not coordinated (the last write of `st` wins).

## Persistence and tools

- Test hooks: `window.__st` (`SV`, `ST`, `UI`, `act(key)` with the lock released, `press`, `lineFor`, `need`, `dockKey`, `openBay`, `skip(ms)` to move the incubator forward (all of it without an argument), `finishIncubation`, `capture` (the 1024×600 frame as PNG), `msg`, `genomeCode`, `podGenome`, `incProgress`, `wake`, `offPalette`).
- The build stamp reads `../../build.json` (written by CI); a local copy shows "local build". One self-contained file with no build step.
