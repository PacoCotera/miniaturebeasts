# The Station build: milestone 1, Read

The first build of the Station loop on the sandbox, per [the Station build plan](../../design/proposals/station-build.md) (owner-approved 2026-10-08). The page simulates the Station's 1024×600 screen at 1:1 device pixels inside a depicted handheld with one row of big keys under it, and shares one save with the [Companion page](../exploration/README.md) in the same browser. **M1 Read** ships: the modules and the state model; the species frames, the resolver, the placeholder and the stamp imported from the workbench and the genome stamp (no genome model of the Station's own); the save migration; the developer panel with seeds; Pods with Identify, reads at the decided prices, glints, Compare and return. Create, Grow and the incubator come with M2.

What the owner can play at `/sandbox/station/`: a pod from a walk (dock the Companion, open the bay) or from a developer seed, identified and read chapter by chapter at the decided prices, its stamp filling as chapters are read, pictures of this pod's mibi in the placeholder; two pods of a species compared; a pod returned to the wild.

## Keys

The Station's depicted keys, mapped to the keyboard. Routine play uses these only; nothing on the screen is clickable.

| Key | Keyboard | Does |
| --- | --- | --- |
| Pad | ← ↑ → ↓ | Moves the warm focus ring between drawn things. On Pods the order is fixed: ↑ ↓ walk the wells, then the hatch; → from a well to the pod, ← back; ↑ from the pod to the chapter rail, ◀ ▶ among the chapters, ↓ back to the pod |
| Home (amber) | H | The vivarium and the bench |
| Research (teal) | R | The pods |
| Library (violet) | L | The tome's spread of sixteen frames and a Book per species |
| Habitat (green) | B | Residents, the with-you door, the bond |
| ← | Esc / Backspace | Back one view. On Home: focus back to the room; on the room it only says so |
| ✓ Confirm | Enter / Space | Exactly what the bottom line names, with its price |
| Caddy: Dock / Lift | D | Prototype only, beside the Station: docks or lifts the Companion. It is not a Station key |

The four middle keys switch views and never spend. Every spend is one deliberate press; returning a pod takes two (the first arms).

## The loop, as built in M1

- **Arrival** (as built in the stand-in): dock, then `✓ Open the bay`; one arrival per crate, in order; each crate accepted exactly once; the pods land in the rack's six wells, or wait sealed when no well is free. A crate can also come from the developer panel's seeds.
- **Identify** (1 ⚡, the first ever free): the seal on the cap breaks top-down and the species glyph lights. A new species is learned once (the Library's spread shows its plate; the Companion's `known` index follows for the three species it carries). The stamp appears on its label with every chapter as hairlines.
- **Read a chapter** (1 ◆ per trait in it; half, rounded up, once that chapter was read on an earlier pod of the species; the very first read ever free; a read chapter is free to look at again): the chapter's frost wipes away over two seconds and its page shows each trait as a picture of this pod's mibi. The words are the frame's own looks: *shows X · hides Y* (with a misty seed holding the hidden look), *only X* (a small base), a blend's two halves as two seeds, *asleep* (a switched-off part with sleeping copies), *breed to change* (a doing, two joined rings). The stamp's sector fills; the progress ring in the list fills one arc, sized by the chapter's traits. A sealed chapter is shut with a notch and the picture of what opens it (the developer panel opens sealed chapters).
- **Glint** (per chapter): a four-point star on a chapter the species has had read before on some pod, unread on this one, where this pod carries a look the field guide has not seen. It says "new here", never what. A star on the ring in the list, and on the well.
- **Compare** (free): from a pod's well, walk to another identified pod of the same species; `✓ Compare` lays the two chapter pages side by side; ◀ ▶ change the chapter; traits read on both that differ pulse.
- **Return to the wild** (the hatch under the wells): `✓ Return to the wild · +1 ❀`, ✓ again. The Companion puts the pod back in its place at the next dock (the `returned` record keeps its shape).
- **Home, Dock and arrival, the Probe bench, Idle**: as built in the stand-in v2, with residents and pods drawn from the frames.
- **Library** (M5 builds it whole): the spread of sixteen frames (a found plate, a met pencil study, an empty unmet frame), and a Book stub per species: its face, its habit line, a line per chapter with the looks found so far and "more?".
- **Habitat** (M2 adds return): one resident large in the placeholder, its card with the stamp at 88 px and the name-code, the with-you door, the bond heart, the strip of six bays. A cool lamp marks a resident whose painting has not landed (every mibi, until M3).

## Architecture (station-build.md §2)

One page, `index.html` (the device, the screen, the keys, the Caddy, the developer panel's markup), and ES modules under `src/`, loaded by one `<script type="module" src>` (the CI parse check reads inline scripts only).

| Module | Holds |
| --- | --- |
| `src/state.mjs` | The save's Station part and every rule as a pure function: prices and half price, identify, read, glints, compare, return, the dock and the bay, `need`, the migration, the developer seeds. No drawing; the tests run it in Node |
| `src/genome.mjs` | The bridge to the imported model: the frames registry, a pod's genome from its seed (sampled from the species' pools until the body builds), a trait's words from `describe.mjs`, the stamp genome and code from `genome-stamp/src/codec.mjs`, the name-code from the genome's SHA-256 |
| `src/game.mjs` | The live save (the Companion's part read, never written; `st` ours), the developer settings under their own key, the focus state per screen, the presentation events |
| `src/gfx.mjs` | The pixel graphics core: the 69-colour palette, indexed buffers, the 5×7 font at 2×, 3× and 4×, the 1024×600 frame. A rendered placeholder or stamp is quantised to the palette on its way in |
| `src/art.mjs` | The placeholder register (`PLACEHOLDERS`) and every drawn stand-in: the mibi placeholder from the plain renderer, the pod from the frame's four parameters and glyph, trait close-ups, seeds, the stamp raster, the progress ring, chapter emblems, the room |
| `src/screens/*.mjs` | One module per screen (frame, home, pods, library, habitat, bench with idle), drawing from state and turning keys into rule calls |
| `src/caddy.mjs`, `src/dev.mjs` | The Caddy service's client (M3) and the developer panel |

**Imported, never copied:** `../workbench/frames/*.json` (fetched beside the page, `mb-species-frame/2` on catalogue 9), `../workbench/framework/{species,describe,catalogue,resolve,rig,raster,plain}.mjs`, `../genome-stamp/src/{codec,stamp,frames}.mjs`. The Companion page's species indexes map 0 to S01 Loika, 1 to S03 Tuikis and 2 to S02 Untuva; a pod or mibi carries its species id (`species`) beside the Companion's index (`sp`, −1 for a species the Companion does not carry).

## The save and its migration (station-build.md §2.3)

The key stays `mb-save-v8`; the Companion's top-level part is untouched; the Station's part `st` carries `schema: 2`. The migration from the stand-in's record runs once on load, forward only, logged: pods keep their seeds and get genomes (`mb-genome/2`, sampled from the frame with the pod's `gs`), their studies start again as chapters (`read: []`); `known` and `met` stay as Companion indexes beside `knownIds` and `metIds`; `readOnce` (chapters read on any pod of a species, for half price) and `guide` (looks seen per trait, rebuilt from mibis and read pods) are new; a mibi keeps `id`, `name`, `sp`, `born`, `from`, `bonded` and becomes a founder from its seed, fully read, with `genome`, `sha`, `code`, `read`, `parents: null`, `bay`, `paint: null`, `released: false`; `inc` becomes `bud`; `bays: 6`; `sitting`, `moments`, `welcomeGiven`, `wish`, `outbox` and `devBay` (the developer's crates) are new. `accepted`, `dockN`, `probe`, `withReq` and `returned` keep their shape.

## Developer panel

Under the device, opened by `?dev` or the "Developer tools" button, never a device key. Settings live under `mb-station-dev`, never in the shared save.

- **Timers:** bud scale (real, ×10, ×60, instant), the first-bud rule, the sitting wait, juvenile to adult, the mock painter's delay (stored now; they apply from M2 and M3).
- **Economy:** decided prices; loose (decided plus +2 ⚡ +3 ◆ +2 ❀ per crate opened; the default, per the owner's "loose for testing"); free. Add materials.
- **Limits:** bays (6, 8, 10), rack size, the daily grow cap, the painter mode, sealed chapters open.
- **Seeds:** a crate of pods (any of the sixteen species, count, seed) into the Station's own dev bay, accepted at the dock like any crate; a pod from a pasted genome, checked whole against its frame. Two adults, two siblings and a held sitting come with their milestones.
- **Skip to:** the pod under the beam identified, read whole; every pod read.
- **Inspect:** both copies of every locus of the pod under the beam (bins and values); the Station's record; the placeholder register; the Caddy's status; export the save; import a Station part (this world's only; the Companion's part is never written); reset.

## Tests

- `node --test prototypes/station/tests/*.test.mjs`: a pod's genome from its seed; trait words; the bay; identify; the read prices (1 a trait, half rounded up, the first free, free to look again); the glint; compare and return; the migration on `tests/fixtures/save-v8-schema1.json` (the Companion's part byte-identical); the stamp decoding to the genome; `need`; the developer seeds.
- `node prototypes/station/tools/journey.mjs` (Playwright; `PW_DIR` names a directory holding `node_modules/playwright`): serves `prototypes/` as the sandbox does, loads the fixture save, seeds a Loika pod, docks, opens the bay, identifies (1 ⚡), reads Coat (1 ◆) and Face (2 ◆), checks a second Loika's Face costs 1, decodes the drawn stamp, compares, returns a pod, draws every screen with every pixel on the palette, round-trips the save, and presses the CI smoke's keys from a fresh world. Screenshots in `img/`.
- The CI site workflow runs the parse check, the page smoke, these tests and this journey on every push.

## Placeholders

Engineers do not do art (decided). Every drawn thing is a stand-in listed in `src/art.mjs` (`PLACEHOLDERS`; the developer panel prints it): the mibi in the plain renderer's placeholder, the pod from the frame's parameters, trait close-ups and seeds, the stamp raster, the progress ring, the chapter emblems, the chapter page, the room and bench as the stand-in v2 drew them, the icons. Nothing in `art/` is touched.

## Known gaps, for the next milestones

- A mibi of a species the Companion does not carry (S04–S16) would reach the Companion page at the dock with `sp: -1`, and the Companion indexes its species list by `sp`. Before M2 grows one, the Companion needs to accept species ids (one change on its page; not this build's to make).
- Trait close-ups crop the placeholder around the part the trait names (head, crown, eyes, snout, ears, legs, tail, flaps, cap, shell) and show the whole body for the rest.
- The pod renderer's proportion and pattern families are rough; the page reads a frame's `pod` block as it is.
- Two tabs of the same page are not coordinated (the last write of `st` wins).
