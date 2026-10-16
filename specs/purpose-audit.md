# Purpose audit: every screen, every object

Creative director, ticket T-20261016-26. Written 2026-10-16 (America/Mexico_City). The owner's rule (2026-10-16 10:51): "eye candy is ok, but needs to serve a purpose". The Incubator verdict that prompted it: "you're basically decorating a screen and placing an egg in it", and "it needs to invite the user to check it".

**Read at.**
- station-gate 69ea1d23, `prototypes/face/golden/**` at 1×. States used per screen are named in each section.
- The Companion: no Companion captures exist under `prototypes/face/golden`. The newest in the repository are `v1/docs/evidence/native-companion-*` (2026-10-11) and `prototypes/play/img/play-standard-companion.png` (2026-10-12). The Companion section is judged on those, and it is **provisional** until current captures exist.
- The loop from `design/game.md`.

**How to read the object tables.** "Job" is what a player would say the object is for, in their words. "None" means no player job. **Keep** / **Change** / **Cut** is my call. "Accepted" screens (Home, Pods, Habitat, Vivarium, Idle; owner 10-15) are audited the same way: accepted for look is not accepted for purpose.

**The failure pattern to look for** (from the Incubator):
1. objects that are set dressing with no job;
2. a wait with no readable progress or time;
3. nothing that tells the player when to come back, or that something needs them.

---

## Home (`home-docked`, `home-waiting`, `home-away`)

- **Purpose:** see that your mibis are alive and well, and see at a glance what in the Station needs you next.
- **Actions:** move between the five modules and the vivarium; ✓ opens one.
- **Return pull:** the living vivarium, and the module that needs you (a crate arrived, pods waiting, a bud ready).
- **Signals it must show:**
  - what needs the player, and where (done: the orange notice and a module's dot);
  - **how long until something is ready** (the bud, crates in transit). This one is missing.

| Object | Job | Call |
| --- | --- | --- |
| Vivarium window with the mibis | See your creatures living | Keep |
| Mister nozzle on the right wall | Visibly mists the moss (keeps life going) | Keep |
| Cable and fitting on the left wall | None readable (it feeds nothing visible) | Change: give it a visible job or cut |
| Five module plates with a picture | Each is a door, and its picture says the module's state (crates in the bay, pods in the rack) | Keep |
| Module status dots (orange, green, dark) | Meant to say "needs you" vs "fine" vs "idle", but three colours with no legend can't be learnt | Change: one meaning ("needs you"), or say it in the picture |
| Incubator module picture | Says whether a bud is in it; it is tiny, with no progress | Change: show progress or time to ready (from T-25's concept) |
| Probe module's three plate marks | Plates left (trip readiness) | Keep; it is the one module that shows a quantity |
| Bottom notice ("two crates wait in the bay") | What needs you | Keep |

## Idle (`idle-docked`, `idle-empty`, `idle-away`)

- **Purpose:** the Station at rest as a living window. From across the room it should tell you whether something wants you.
- **Actions:** any key wakes it to Home.
- **Return pull:** this *is* the invitation to check. It shows the vivarium and one notice line ("two crates wait in the bay").
- **Signals:** the notice line is there. A bud's readiness and crates in transit are not, which is the same gap as Home.

| Object | Job | Call |
| --- | --- | --- |
| Full-screen vivarium | The ambient living picture | Keep |
| Mister | Mists the moss | Keep |
| Left-wall cable and fitting | None readable | Change or cut (as Home) |
| Notice line | What needs you | Keep. Add the bud and crate time signals from the same source as Home |

## Vivarium, the habitat scene (`vivarium-docked`, `vivarium-empty`)

- **Purpose:** watch your mibis live; pick one.
- **Actions:** move between mibis; ✓ greets or opens one; the strip moves between residents.
- **Return pull:** the creatures' life (sleeping, moving).
- **Signals:** which mibi is focused (the footprint ring); who is asleep. Fine.

| Object | Job | Call |
| --- | --- | --- |
| Scene, moss, burrow, pond | Where they live; the burrow is where they sleep (if that is so in play; if not, it is dressing, which is allowed as eye candy in the living scene) | Keep |
| Mister | Mists | Keep |
| Left-wall cable | None readable | Change or cut |
| Name tag and footprint ring | Who is focused | Keep |
| Strip of tiles | The residents, to move between | Keep |
| Empty state "nobody lives here yet" | Says what to do? It says what *is*, not what to do | Change: point to the way in (a pod, Cargo) |

## Habitat, the mibi card (`habitat-docked-day`, `-card`, `-door`, `-portrait`; titled "Vivarium")

- **Purpose:** know this one mibi, and act on it (take it out, cross it, release it, sit it for a portrait).
- **Actions:** the four modules, reading chapters (Read Coat), greeting.
- **Return pull:** a young mibi grows up; chapters still to read; portrait sittings.
- **Signals:**
  - growth (young → adult): no time or progress is shown;
  - which chapters are still a surprise (the four chapter chips, done);
  - bond (a heart on the young one; its meaning is unclear).

| Object | Job | Call |
| --- | --- | --- |
| Portrait of the mibi in its scene | Who this is | Keep |
| Card: name line, origin, parents, code | Its identity and story | Keep |
| Stamp | Its genome, readable as a picture | Keep |
| Four chapter chips | Which chapters are read | Keep |
| Heart (young Moss) | Unclear: bond? care? | Change: say what it measures, or cut |
| Three bars under the code (young Moss) | Unclear at 1× | Change: say what it is, or cut |
| Companion module with slots | Who goes out with you (it says "goes with you now") | Keep |
| Portrait module | **A shut door:** "portraits are not open yet" (fix 8's rule) | Change: don't draw a pressable door that can't open, or say what opens it |
| Cross module (three small mibi heads) | Pick a partner to cross | Keep |
| Wild module (a gate) | Release to the wild | Keep; the gate reads |
| Bottom strip of tiles | Move between mibis | Keep |
| Growth young → adult | Missing: no sign of how long until it grows | Add (game designer: is growth timed? if so it needs a signal) |

## Pods (`pods-collection`, `-overview-unidentified`, `-chapter-page`, `-compare`)

- **Purpose:** know what each pod you brought home is, read its chapters, and choose one to create from.
- **Actions:** open a pod, identify it (cost), read chapters, compare two, Create from it.
- **Return pull:** new pods from Cargo; unread chapters (research).
- **Signals:** which pods are new or unidentified (needs a mark), which chapters are read, the cost to identify (done: "Identify 1").

| Object | Job | Call |
| --- | --- | --- |
| Pod wells with the species shell and name | Which pods you have | Keep |
| The selected pod on the ground, with its tag | This pod | Keep |
| Found-note ("Found at the pond edge…") with its little picture | Where it came from: makes it *yours* | Keep (the Incubator should carry it on) |
| Hose from the top left into the ground | **None** | **Cut** |
| Wall gauge and louvred vent, top right (`-overview-unidentified`) | **None** (equipment that works for nothing, the Incubator's fault; the style guide allows gauges and vents only when they work for the life) | **Cut** |
| Small plate with a leaf, bottom right | Unclear (the identify slot? Create?) | Change: make its job readable, or cut |
| Chapter tabs (Coat, Face, Movement, Stamina) | Choose the chapter to read: a real job here | Keep |
| Compare's two pages | See the difference between two pods | Keep |
| Sealed, identical pods in the collection | They can't be told apart except by name | Change: show what is new and unread on the well |

## Cargo (`cargo-bay`, `-bay-empty`, `-opening-800`, `-report`)

- **Purpose:** receive what came home from the trip, and see what the trip earned.
- **Actions:** open the bay; see the new pods; read the report.
- **Return pull:** crates arrive (from Companion trips).
- **Signals:**
  - crates waiting (done);
  - **crates in transit and when they land**: the arriving state exists (`cargo-crates-arriving`), but there is no time;
  - what is new in the rack (done in the notice).

| Object | Job | Call |
| --- | --- | --- |
| Yellow crates on the shelf | What came home, still sealed | Keep |
| Bay shutter | The bay is closed or empty | Keep, as the empty state. It is a large blank, so the empty bay should say when the next crates come, or what to do (go out with the Companion) |
| Opening: crate lid with three pods, battery cell, cartridge, vial | What each crate held, shown as the thing | Keep (owner's container rulings) |
| "First crate home" plate | Sequencing during the opening | Keep |
| Report panel (crates, gathered, mended, "the world turned", Next) | What the trip earned and what to do next | Keep. "some of the land explored" / "half" / "most" per crate is vague. Change if the owner wants a measure |
| Rack of six wells | The pods now home | Keep |

## Probe bench (`bench`, `-tier2`, `-away`, `-armed`)

- **Purpose:** get the Probe ready for the next trip: mend its plates and fit upgrades.
- **Actions:** Mend a plate (energy), Switch on (the dock mends two free), fit the Upgrade.
- **Return pull:** after a trip, plates are worn; an upgrade becomes affordable.
- **Signals:**
  - plates whole vs worn (done: the plate row);
  - **why it matters for the next trip** (what a plate does out there; "Shield 3/3" on the Companion). Missing;
  - mending progress, if the free dock mend takes time. Missing.

| Object | Job | Call |
| --- | --- | --- |
| The Probe, upright in its cradle | The device you are preparing | Keep |
| Empty cradle (`bench-away`) | The Probe is out with you | Keep |
| Plate row under the Probe | Plates fitted (whole or worn) | Keep |
| Mend module (switch, plate marks) | Mend plates | Keep |
| Upgrade module (part, cost marks, two dials) | Fit the next tier | Keep. The two round dials at its foot have no readable job: change or cut |
| Brass stopwatch gauge with a cable | **None** (reads nothing) | **Cut**, or give it a reading a player uses (the guide allows small gauges that work) |
| Wrench | **None** (decoration) | **Cut** |
| Screwdriver | **None** | **Cut** |
| Cable from the Probe through the gauge to a loose plug | **None** (it connects nothing the player uses) | Cut, or make it the dock's charge line if the dock mends (then it must read as mending) |

## Library (`library-spread`, `-empty`, `-complete`)

- **Purpose:** your collection of species: who you've met, found and filled in.
- **Actions:** move between frames; from slot 8, open a species' Book.
- **Return pull:** a new species found; filling a page.
- **Signals:**
  - found, met or unmet per frame (done: plate, study, empty);
  - chapters read per species (the seed dots);
  - **how to fill an empty frame.** Missing: the empty frames say nothing.

| Object | Job | Call |
| --- | --- | --- |
| Open book, two pages, ribbon | A collection book | Keep (eye candy that frames the purpose) |
| Frames with plates, studies, empty | Each species and how far you know it | Keep |
| Roundel and clan rule over each frame | The species' clan | Keep, if clans matter in play. If not, cut (game designer) |
| Seed dots | Chapters read for that species | Keep |
| Gilt corner and seal | Unclear at 1× (new? complete?) | Change: say what it marks |
| Margin life band (bare paper today) | None yet | Fill with something that serves the collection, or shrink (ring ruling §2's watch point) |

## Companion (provisional: v1 evidence 10-11, play prototype 10-12)

- **Purpose:** go out, gather supplies and samples, and send cargo home.
- **Actions:** move on the map, gather, inspect, start an expedition kind, send cargo.
- **Return pull:** the trip itself; the partner mibi.
- **Signals:** what you carry (done: Data, Energy, Essence, sample 0/1), shield or plates (on the expedition card), the next step.

| Object | Job | Call |
| --- | --- | --- |
| Map with paths and trees | Where you are and what to gather | Keep |
| Resource counters and sample count | What you carry | Keep |
| Expedition cards (Weather, Deep ground, No partner yet) | What kind of trip to start | Keep |
| Developer and status lines ("Whole items / source progress retained", "Browsing never sends or spends", "Up/Down: choose / Confirm: act") | None for a player | Cut from the player face (they are build notes) |
| "Gathering preparation … Not started 0%" table | Progress of gathering: a job, but as a percentage table | Change: show it at the screen's scale (the owner's leaf point, again) |

**The Companion needs current captures** before this section can be final. That is the lead's call.

---

## Ranked: the biggest purpose gaps (Incubator and Create excepted)

1. **Probe bench.** Three props have no job (gauge, wrench, screwdriver) and the cable leads nowhere. The screen doesn't say why mending matters for the next trip. Of the screens not under T-25 or T-02, this is the closest to the Incubator's failure.
2. **Wait time, Station-wide (Home, Idle, Cargo).** Nothing anywhere says *when*: when the bud is ready, when crates land, when a young mibi grows. This is the owner's "invite the user to check it", and it is not only the Incubator's problem.
3. **Pods.** The hose, gauge and vent carry no job. The identical sealed pods don't show what's new or unread. The small leaf plate is unclear.
4. **Habitat card.** It shows a shut door (Portrait) and unexplained marks (heart, three bars). Growth has no signal.
5. **Companion.** Developer text is on the player face, and progress is a percentage table. This is provisional on old captures.
6. **Home, Idle and Vivarium wall cable.** It is the one fixture with no visible job in an otherwise purposeful scene. The module dots' three colours can't be learnt.
7. **Library.** Empty frames give no path to fill them; the gilt corner, seal and margin band are unclear. It is the smallest gap.
8. **Cargo.** It is close to right. The empty bay is a blank with no "next", and the per-crate "explored" wording is vague.

## Who fixes each gap (the lead writes the tickets)

| Gap | Fixed by |
| --- | --- |
| 1. Probe: cut the props; say what plates do on a trip | Game designer (what plates do, and if the dock mend takes time), then AD (cuts), then UI/UX (the trip-readiness line) |
| 2. Wait time Station-wide | Game designer (which waits exist, and their lengths), then UI/UX (one time signal on Home, Idle and Cargo), then build |
| 3. Pods: cut hose, gauge and vent; mark new and unread pods; the leaf plate | AD (cuts), UI/UX (new and unread marks, the leaf plate's job or cut) |
| 4. Habitat card: Portrait shut door, heart, bars, growth | UI/UX (shut door, labels), game designer (growth timing, what the heart measures) |
| 5. Companion: developer text, progress at scale | Lead (fresh captures first), then UI/UX |
| 6. Wall cable, module dots | AD (the cable's job or cut), UI/UX (one dot meaning) |
| 7. Library: empty frames, gilt corner and seal, margin band | UI/UX (empty-frame line, marks), AD (margin band) |
| 8. Cargo: the empty bay's "next", crate wording | UI/UX, with the copywriter |
