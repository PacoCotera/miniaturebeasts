# The Station build: the first playable loop

**Proposal** from the technical lead and game design, 2026-10-08, for the owner. It plans the first build of the Station loop on the sandbox: the approved [research loop](research-loop.md), paced by the [research economy](research-economy.md) (loose, for testing), with the decided rules of [the cross](the-cross.md), the stub of [the portrait](the-portrait.md), the painting at Grow of the [art pipeline](art-pipeline.md) v2 and the screens of the [Station style guide](../style-guide/station-screens.md). Loop and mechanics come first; where no master exists, the build shows a placeholder and says so. **Decided** marks owner decisions restated here; everything else is **Proposal**.

## 1. Scope

The first build lets a tester play one pod from the dock to a meet, then a cross, then a sitting, on the sandbox, in one turn at the bench with the developer timers, or in real minutes without them.

| Step | What the tester does | Rule |
| --- | --- | --- |
| **Arrival** | A crate comes from the Companion page's Head home, or from a dev seed. Dock, then `✓ Open the bay`; the pods roll into the rack's six wells | Sample bay of three crates; cargo moves only on docking (**Decided**) |
| **Identify** | 1 Energy, the first ever free. The seal breaks, the glyph lights; a new species learns its frame and opens its Library page | Research loop §1 |
| **Read** | One chapter of one pod: 1 Data a trait, half (rounded up) once that chapter was read on an earlier pod of the species, the first read ever free. Pictures: shows, hides, only, asleep, breed to change, sealed. Glint per chapter; Compare free; return a pod for +1 Essence | Research loop §4, §8 |
| **Create** | Shape each read look among three pictures from the pod's own copies, +1 Data a change; doings breed only; a shape that won't build marks its traits and withholds Grow | Research loop §5 |
| **Grow** | 2 Energy and 4 Essence (the first founder 2 Energy). The bud takes twenty minutes plus one per shaped trait; **the first bud ever five**; **an instant grow for a price**; unread chapters clear across the wait; a full vivarium refuses before payment | Research economy §5–6 (**Decided**) |
| **The painting** | At Grow the genome joins the Caddy's queue. The mibi wears the placeholder until its painting lands, at the next fresh draw; offline, a cool lamp and "waiting for the cloud" | Art pipeline §1.1 (**Decided**) |
| **Vivarium** | **Six bays**, the one with you keeping its bed. Habitat: spend time, take with you, bond, return a mibi to the wild (+2 Essence and a field-guide note) | Research economy §6 (**Decided**) |
| **Cross** | Two adults of one species; refusals before cost; per trait four seeds (switches) or a range picture (blends); kinship from recorded parents, penalty B with A; 2 Energy 4 Essence; the child grows in the bud and is known only where switch parents match | The cross (**Decided**) |
| **Library** | The tome's spread of sixteen frames; a book per species with its face, places, frame, a tab per chapter, looks found and "more?", the stamp at 120 px, a pinned wish | Style guide, Library (**Decided**) |
| **Sitting (stub)** | A held sitting (the welcome one, or a field guide filled); Habitat's offer, pose, place, confirm; a crate waits in the sample bay and opens to the mibi in its standard painting in a gilt frame. No portrait is painted | The portrait §1 |

**Out of the first build:** ageing past adult (elders, death; a juvenile still becomes adult after two world turns, as the Companion counts); trading, the signed postmark and the card; the family tree (the Book's panel is an empty stub; only the `parents` field is built); wonders; mutation; the bench trickle and the shelves (the dev limits stand in); a returned mibi's place shedding a pod; the find that opens a sealed chapter (a dev switch opens it); the edit item; painted looks on the Companion page (it keeps species drawings); the portrait job itself.

## 2. Architecture

### 2.1 One page, one state model

The Station stays `prototypes/station/index.html`: the depicted device, the 1024×600 screen at 1×, the row of keys below. Its single inline script splits into ES modules under `prototypes/station/src/`, loaded by one `<script type="module" src>` (the CI parse check reads inline scripts only, and an inline `import` would fail it). Three layers, and nothing else holds state:

- **State** (`state.mjs`): the save's Station part and every rule as a pure function (prices, reads, glints, shaping, bud, refusal, forecast, kinship). No drawing; testable in Node.
- **Screens** (`screens/*.mjs`): one module per screen, drawing from state and turning keys into rule calls.
- **Edges**: `caddy.mjs` (the client of the Caddy service), `art.mjs` (the placeholder register: every drawn stand-in listed, so masters replace them one by one), `dev.mjs` (the developer tools).

### 2.2 Imported, never copied

The Station holds no genome model of its own. The stand-in windows of the current page go.

| What | Imported from | Used for |
| --- | --- | --- |
| The frames registry, S01–S16 (`mb-species-frame/2`) | `workbench/frames/*.json`, fetched beside the page | Chapters in ring order, traits, looks, pools, sealed chapters, pod parameters, glyph |
| Individuals: sample, shape, check, build, digest | `workbench/framework/species.mjs` | A pod's genome from its seed, Create's rolls, whole-genome validity, children |
| Resolver, rig, rasterizer, placeholder | `resolve.mjs`, `rig.mjs`, `raster.mjs`, `plain.mjs` | The founder on Create, roll close-ups, the placeholder on every screen |
| The cross with blending and kinship | `species.mjs`, once built there (the cross §7) | Cross and its forecast |
| The stamp encoder | `genome-stamp/src/codec.mjs`, `stamp.mjs` | The stamp on the pod label, Create, Incubator, Habitat, Book |
| The stamp decoder | `genome-stamp/src/decode.mjs` | CI only: the drawn stamp must decode to the genome |

The sandbox publishes `prototypes/*` side by side, so `../workbench/` and `../genome-stamp/` resolve the same in the repository and on the sandbox server. `framework/png.mjs` needs `node:zlib`, so the page encodes nothing and draws to canvas. Two gaps are closed **in their homes**, not worked around in the Station: the workbench's cross takes continuous copies as numbers, kinship and the penalty (W1); and the stamp's frame snapshot, today the earlier `mb-species-frame/1` files against catalogue 6, is rebuilt from the workbench registry as new frame versions, with blended copies packed as their bins (S1). The Companion page's species indexes map 0 to S01 Loika, 1 to S03 Tuikis and 2 to S02 Untuva.

### 2.3 The save and its migration

The key stays `mb-save-v8` and the Companion's top-level part is untouched. Only the Station's part `st` changes, under a schema number of its own (`st.schema: 2`). The fields the Companion reads (`accepted`, `dockN`, `known`, `probe`, `withReq`, `returned`, and each mibi's `id`, `name`, `sp`, `born`, `from`, `bonded`) keep their shape, so the Companion page needs one change only: drop a mibi marked released. The migration runs once on load, is logged, and never runs backward.

| Field | v8 `st`, as built | After migration |
| --- | --- | --- |
| Pods (rack and waiting) | `sp`, `gs`, place, how found, `idd`, studied windows, stand-in copies `al` | Plus `species` (S01…), `genome` (`mb-genome/2`, sampled from the frame with the pod's `gs`, so a pod keeps its identity), `read` (chapter ids). Windows and `al` dropped; a log line says studies start again |
| Species knowledge | `known`, `met`, `seen`, `studiedW` | `known`, `met` kept; `readOnce` (chapters read on any pod, for half price); `guide` (looks seen per trait, rebuilt from mibis) |
| Mibis | Companion fields, `gs`, memories, notches, `al`, a 9-character code, known windows | Companion fields kept; plus `genome`, `sha` (SHA-256 of the genome), `code` (the stamp's code), `read`, **`parents`** (none for a founder; for a child two entries of id, code and stamp bytes, the family tree's §1), `bay` (0–5), `paint` (state, set hash, prompt version, time), `released`. An existing mibi becomes a founder from its `gs`, fully read |
| Incubator | `inc` | `bud`: founder or cross, genome, start, minutes, first-ever flag, parents |
| Room | four places plus the one with you | `bays: 6` |
| New | none | `sitting` (held, source, when), `moments` (research moments already paid, so none pays twice), `welcomeGiven`, `wish` per species, `outbox` (genomes not yet handed to the Caddy) |

Developer settings stay out of the shared save, under their own key, so a tester's toggles never travel with a world.

### 2.4 The Caddy service

The game's Caddy brokers paintings; on the sandbox a small Node service plays it. The sandbox server's web server is also called Caddy, so ours is **the Caddy service**. It lives in `prototypes/caddy/` (plain Node, no dependencies), ships in the same tested release as the page that calls it, and `deploy.sh` restarts it after switching the release. The web server proxies `/caddy-api/` to it on localhost. It imports the workbench framework from the release, calls the Grow painting service one genome at a time (`grow/service.py paint --genome`, which needs an output-root flag, G1), stores sets by genome hash in a data directory outside the releases, and journals its queue so a job survives a restart. The painter's key sits in a root-only environment file on the sandbox server, never in the repository.

| Call | Does |
| --- | --- |
| `POST /caddy-api/v1/grow` with world and genome | Validates the genome whole against its frame and builds it; hashes it; answers done if that set is stored, else queues it. Nothing but a genome is accepted |
| `GET /caddy-api/v1/jobs?world=` | That world's jobs: queued, painting, done, failed (the placeholder stands), capped |
| `GET /caddy-api/v1/sets/<species>/<hash>/<file>` | The painted portrait (600×620, 300×310), the side view, the derived Companion size and manifest |
| `GET /caddy-api/v1/status` | Queue, today's calls and spend, the ceiling, painter mode, pinned prompt version |

A failed call retries at one, five and thirty minutes; a stored hash is never painted again. Painter modes: **real**, **mock** (the placeholder tinted, after a set delay, no call) and **off**. The Station polls its world's jobs every thirty seconds while any mibi waits and on waking, fetches a finished set, and swaps it in at the next fresh draw. Unreachable, Grow still works: the genome waits in `outbox` and goes when the service answers.

### 2.5 Developer tools

A panel under the device, opened by `?dev` or a page button, never a device key. It is how a tester reaches any state in a minute.

| Group | Controls |
| --- | --- |
| Timers | Bud scale (real, ×10, ×60, instant); the first-bud rule on or off; sitting wait (three hours, a minute, now); juvenile to adult (world turns, or now); the mock painter's delay |
| Economy | Decided prices; loose (decided prices plus a top-up on each arrival, the default); free. Add materials; the instant-grow price (a placeholder until the real economy sets it) |
| Limits | Bays (6, 8, 10); rack size; the world's daily grow cap, up to the server ceiling; painter real, mock or offline; sealed chapters open |
| Seeds | A crate of pods (species, count, seed); a pod from a pasted genome; two unrelated adults; two siblings; a held sitting |
| Skip to | Identified; read and shaped; mid-bud; ready to open; two adults ready to cross; a field guide one look from full; a sitting's crate in the bay |
| Inspect | Both copies of every locus (bins and values); a pair's kinship; the forecast as counts; the Caddy's status; export and import the save; reset |

## 3. Screens, in build order

Each screen follows its decided concept for layout, states and words. Art is the placeholder until the art director's masters exist (**Decided:** engineers do not do art), and the placeholder register lists every stand-in.

| # | Screen | Built from the decided concept | Placeholder until masters |
| --- | --- | --- | --- |
| 1 | **Frame and Home** | Top bar, bottom line, focus ring; vivarium in the left two thirds with six bays; four modules (sample bay, rack of six wells, incubation chamber, Probe dock); the sitting slot | The current page's drawn room and modules; residents in their placeholder or painting |
| 2 | **Dock and arrival** | As built: one crate at a time, ribbon, report card, the free mend | Unchanged |
| 3 | **Pods** | List of 160 px with progress rings (centre at Identify, an arc per chapter sized by its traits, a star for a glint, a notch for sealed, no digits); the pod under the beam; the chapter rail with as many chapters as the species has; the open page of trait pictures; the stamp on its 220 px label (PV-D-r3-a4) | The pod drawn by code from the frame's four parameters and glyph; trait pictures as placeholder close-ups of this pod's mibi; the misty seed as a frosted close-up of the hidden look |
| 4 | **Create** | Founder 300×310 centred, misty where unread; three pictures per trait as flank close-ups; "changed" tags; "breed to change"; clashes withhold Grow; one status line for what stays a surprise; the total on the bottom line (CR-C2) | The founder in the placeholder, which is decided for Create since nothing is painted before Grow |
| 5 | **Incubator** | Dome; a glowing bean, never an embryo; a ring of leaves, one a minute; chapter tabs clearing; the stamp and code; `✓ Grow now · price`; ready with the shape glowing inside; Open; the waiting lamp (IN-D-r1-a3, IN-C1) | Dome and bean as simple drawn shapes |
| 6 | **Habitat** | Resident 300×310; card with name, stage, species, stamp, chapters; with-you door, heart, cross mark; the strip of six bays; return to the wild with arm-then-confirm | Resident in the placeholder until its painting lands |
| 7 | **Cross** | Parents left and right, the child misty between; their stamps on plates with shared cells lit; per trait four seeds or a range picture; refusals with the reason and no ✓ cap | No concept yet: the guide's layout; seeds as placeholder close-ups |
| 8 | **Library spread** | Sixteen ruled frames, all at once; found plate, met pencil study, empty unmet frame with no cue; the clan's inked rule; names on caption rules (SP-P-r4-a1) | Flat paper; found plate as the species' placeholder in a ruled frame (the accepted Pip for the Loika); the study as the index pass in grey line |
| 9 | **Book** | Face as a framed plate with its habit line; place stamps; the frame plate; a tab per chapter, looks found as small plates and "more?"; the stamp at 120 px; the tree panel's place under it; the wish (BK-D-r2-a1) | Plates as placeholder close-ups; the tree panel empty |
| 10 | **Sitting** | Habitat's offer; pose, place, look and confirm; the gilt frame; the flat crate with its filling lamp; delivery at the dock | Poses as the species' habit words over a still; the "portrait" is the standard painting in the frame |
| 11 | **Probe bench, Idle** | As built | Unchanged |

## 4. The Grow painting

**Where the control passes are rendered.** The decided component split puts the rig, the control passes and the placeholder on the Station (art pipeline §1.1). On the sandbox the Station is a browser page and the Caddy a VM service, so there is a choice.

| | Station page renders and uploads them | Caddy service renders them from the genome |
| --- | --- | --- |
| Matches the device split | Yes | Not until the device build moves it |
| Crosses the network | About forty images, 1–3 MB a mibi | The genome, a few KB |
| Code that exists | The rig runs in the browser, but the Grow controls are written for Node (`grow/controls.mjs`) | `controls.mjs` exactly as the Grow service calls it today |
| Public sandbox | The service would paint any image a page sent, unless it re-rendered to check | Only a valid, buildable genome reaches the painter |
| Load | The tester's browser, which already renders the placeholder | The sandbox server, about five seconds a mibi (controls and placeholder set, measured) |

**Recommendation: the Caddy service renders the controls from the genome; the Station renders only the placeholder.** Both run the same modules on the same genome, so they agree by construction, and CI checks it. When the Station becomes the device, `controls.mjs` moves to it and the endpoint takes controls beside the genome; one module changes.

**The daily limit.** The service holds a hard daily limit on paid calls that no page can raise; the developer panel sets each world's grow cap beneath it (default ten). Over the cap a job waits as capped, the mibi keeps its placeholder, and the job runs the next day. Every call is logged, and the status call shows the day. The prompt version is pinned in the service's configuration and written into each manifest; a new version never repaints a stored set (art pipeline §5).

**Species.** The prompt lab painted the Loika, the Belatz and the Peplos. The Untuva and the Tuikis have not been painted; M3 begins with a small calibration batch of their type specimens and a few individuals, and their jobs stay mock until the owner has seen it.

## 5. Tests

CI keeps the parse check and the page smoke, and adds two things. **Unit tests** in plain `node --test`: the rules (prices and half price, glints, bud minutes, refusal before payment, the forecast's quarters against ten thousand crosses, kinship), the migration on fixture saves, and the Caddy service (refuses a wrong genome, deduplicates by hash, survives a restart, honours the ceiling, retries). **The journey**: the Caddy service starts in mock mode beside the static server, the Station opens with `?dev` and the service's address, dev seeds go in through the page's test hooks, and the device keys are pressed as a tester presses them.

| Step | Action | Asserts |
| --- | --- | --- |
| 1 | Load a v8 fixture save | Pods carry genomes from their seeds; mibis keep ids and names; the Companion's part is byte-identical |
| 2 | Seed one Loika pod (fixed seed); Dock; `✓ Open the bay` | One crate accepted once; the pod in a well |
| 3 | Identify; read Coat, then Face | Free, then 2 Data; a second Loika pod's Face costs 1 |
| 4 | Shape eye rings; `✓ Grow it` | +1 Data; a bud of twenty-one minutes; a job queued under the genome's hash; the placeholder shown |
| 5 | Instant timers; the mock paints | The painting is not drawn until a screen change, then lands; the waiting lamp goes out |
| 6 | `✓ Open` | The mibi in a bay, fully read; the drawn stamp decodes to the genome |
| 7 | Seed an unrelated adult Loika; Cross | Four seeds for markings and crown, a range for eye rings, drive and efficiency; kinship 0 |
| 8 | Cross, grow, open | The `parents` field; the child known only where switch copies matched |
| 9 | Seed siblings; open Cross | Kinship 1/4; more seeds show the hidden look; the ranges narrow |
| 10 | Fill the bays; Grow | Refused before payment |
| 11 | Library, Book | The Loika's found plate; looks seen; the stamp at 120 px |
| 12 | Seed a sitting; the ceremony; deliver now | The crate in the sample bay; it opens to the gilt frame; the slot empties |
| 13 | Stop the service; Grow; restart it | "Waiting for the cloud", then the painting lands |
| All | | No page errors; the save round-trips; the placeholder's hash matches Node's for the same genome |

The journey grows with each milestone, so every push to main proves the loop that is live.

## 6. Milestones

Each milestone pushes to main, passes CI, deploys to the sandbox and is playable from a fresh world. Three prerequisites land in their own homes first: **S1**, the stamp's frames from the workbench registry (before M1); **G1**, the Grow service's output-root flag and the VM's setup (unit, proxy route, Python imaging library, key file; before M3); **W1**, the workbench cross with numbers, kinship and the penalty, tested there (before M4).

| | Ships | The owner sees |
| --- | --- | --- |
| **M1 Read** | Modules and the state model; frames, resolver and stamp imported; the migration; the developer panel with seeds; Pods with Identify, reads, glints, Compare, return | A pod from a walk, or a seed, identified and read chapter by chapter at the decided prices, its stamp filling, pictures of this pod's mibi in placeholder |
| **M2 Grow** | Create, the bud (five minutes first, then twenty plus shaping, instant grow), Open, six bays, Habitat, return a mibi | The founder loop end to end in about five minutes: shape, grow, meet; the bays fill and refuse |
| **M3 Painting** | The Caddy service on the sandbox server: queue, mock and real painter, store, daily limit, status; hand-off at Grow, polling, landing, the offline lamp; the calibration batch | A mibi opening in its placeholder and its painting landing a few minutes later; the day's calls on the status page |
| **M4 Cross** | The Cross screen, eligibility, forecast seeds and ranges, the `parents` field, reading a child | Two Loikas crossed and a child whose hidden looks surface; siblings crossed showing the penalty |
| **M5 Library** | The spread, the Book, looks found and "more?", the stamp at 120 px, a pinned wish | The collection as a tome, a species page filling as pods are read |
| **M6 Sitting and the whole journey** | Home's sitting slot, the welcome sitting, the ceremony, the crate; the CI journey complete; the README | The whole loop from a walk to a sitting's crate, every step playable |

## 7. Risks

| Risk | Mitigation |
| --- | --- |
| W1 changes copies from names to numbers, which reaches the resolver, the Grow controls and the stamp | Land and test it in the workbench before M4; the Station imports it unchanged |
| The stamp and the Station on two frame models | S1 before M1; the stamp's frames are built from the registry, append-only; a blended copy is stamped as its bin (scanning shows, never grants) |
| The rig is slow in a tester's browser; Create redraws on every roll | Render at Station size only; cache by genome hash; move rendering to a module worker if a roll exceeds 200 ms |
| A public sandbox endpoint that spends money | Genome-only input, a server ceiling no page can raise, per-world caps, every call logged |
| Paintings for the Untuva and the Tuikis untried; the prompt not settled | Calibration batch first; mock until seen; the placeholder always stands; the pinned version is in every manifest |
| The Companion and Station share one save; two tabs write | The Companion's fields keep their shape; re-read before write, as built; last write wins is known and stated |
| Wall-clock timers and toggles mid-bud | Store the start and the rule, not a countdown; a change of scale recomputes from the start |
| Placeholders read as art | The register in `art.mjs`; placeholders stay plainly placeholders, never polished |
| The name Caddy for two things on the sandbox server | The unit and the docs say "the Caddy service" |

## 8. Decisions for the owner

1. **Where the control passes are rendered.** *Recommended:* by the Caddy service on the sandbox server from the genome, with the Station rendering only the placeholder; it reuses the Grow controls as they stand and lets only valid genomes reach the painter. The device build moves it to the Station.
2. **The real painting service in the first build, or a mock.** *Recommended:* build against the mock through M2, then run the real painter on the sandbox from M3 behind the developer toggle and a daily limit; CI always mocks. The owner sees real paintings land where it matters, at a known run-rate.
3. **Where pods come from.** *Recommended:* the Companion page's save is the source, since the loop begins at the dock and the shared save already carries crates; dev seeds are a testing tool beside it, not the source.
