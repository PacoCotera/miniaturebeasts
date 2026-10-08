# Technical architecture: one loop, three screens

**Decided** 2026-10-08: decisions 2 and 3 of section 7 were taken as recommended, so this document is the architecture every Station, Companion and Caddy build follows. **Decision 1 (the Station as a web page on the Pi) was withdrawn by the owner the same day:** the Station's hardware is the Raspberry Pi 4 and will not grow to carry a browser; everything is optimised for underpowered hardware; no hardware prototyping until the loop is complete in software. The Station's device runtime is being re-proposed (section 7, decision 1). Written by the architect, 2026-10-08, for the owner. It answers the owner's direction of today: review the technical architecture of the Station and the Caddy (and, with them, the Companion), and choose the tooling and frameworks that draw the screens and handle interaction on hardware we can actually ship. **Decided** marks owner decisions restated here; everything else is **Proposal**. Section 7 holds the three decisions.

**Decided 2026-10-08 (owner).**

- Every Station and Caddy build follows a technical architecture review. The earlier rule "native C, everything drawn through LVGL" is reopened: moving away from LVGL or native C is allowed.
- The only fixed limits are the hardware: ESP32 for the Companion and the Caddy, a Raspberry Pi for the Station, and each screen's resolution and colour depth.
- **First define the loop**, honouring each device's pixels and colours; once the loop and the interactions are stable, **port**.

**Decided earlier, and not reopened here:** the Station at 1024×600 at 1× with Inter at 16, 20 and 28 px, anti-aliased, and painted full-colour art; the Companion at 450×600 on the 48-colour palette with 48 px tiles, HUD 32, view 532, bottom line 36, and the Mibi 7×9 bitmap type; the Caddy in four grays; the kit plays standalone with no internet; cargo moves only on docking; the Caddy brokers paintings over Wi-Fi from the Station; genome, rig and stamp are imported from `prototypes/workbench` and `prototypes/genome-stamp`, never copied; routine play uses the depicted keys only; the developer-tools mode is a build requirement; no MicroPython or Arduino.

## 1. What this is for

The kit has three screens and one game. Today each screen is built by drawing pixels at numbers typed into code. That is fast for the first screen and slow for every one after it, and it gets worse as more people work on the code at once.

**An example.** The layout spec says the stamp is "a 120×120 label, one rule, every screen that shows it". Today the Station draws it in six places at five sizes: 196 px on Pods, 120 on Create and the Incubator, 96 on Cross, 88 on Habitat, 112 on the Library. To apply the rule, a builder edits six screen files and checks each by eye. Under this proposal the stamp label is one component and each screen's spec gives it a rectangle. The rule lives in one place, and CI measures it.

The architecture has three jobs:

1. **Builders implement; they don't invent.** A screen is a spec, a view of the state and a list of actions. It is never a page of coordinates.
2. **Each concern has one home.** Rules, layout, components, drawing, input, storage and the network edges each live in their own module, so two builders can work side by side without colliding.
3. **The port is cheap.** What we prove in the browser carries to the devices as data and tests. It is not rewritten from memory.

## 2. Diagnosis

### 2.1 What we found

| Finding | Evidence |
| --- | --- |
| **The Station draws with its own pixel primitives, with no layout system, component model or scene** | `prototypes/station/src/gfx.mjs` (237 lines): its own indexed buffer `PB` with rect, ellipse, ring, arc, polygon, line, outline and shading rasterisers, blitted to a canvas. Screens call `text()` 136 times, `blit()` 103, `R()` 49 and `panel()` 42 times. The nine screen modules hold about 1,060 literal numbers of two to four digits; `art.mjs` holds another 320 |
| **The layout spec's parts exist only as repeated code** | The chapter rail is written three times with the same copied formula (`Math.min(150, Math.floor((820 - (n - 1) * 8) / n))`, origin x 190) in `pods.mjs`, `create.mjs` and `incubator.mjs`, plus a fourth tab variant on Habitat. The stamp label appears at five sizes (see the example above) |
| **Built geometry has drifted from the spec, and nothing notices** | Pods: rail (190, 56, 820, 54) where the spec says (176, 48, 832, 56); page (612, 124, 398×426) where it says (528, 112, 480×440); stamp 196 where it says 120. The focus ring in `gfx.mjs` is 3 px pulsing amber with cut corners; the spec says one cream ring, 2 px, 4 px outside, 6 px radius, and an ellipse under a creature's feet |
| **Focus targets are hand-made rectangles, separate from what is drawn** | `targets()` in `pods.mjs` and `habitat.mjs`, `homeTargets()` and `benchTargets()` repeat each drawn box as a second set of numbers, so moving a thing doesn't move its target. A shared `navSpatial` exists (good), but Pods also has its own hand-written `nav()` |
| **Screens share mutable globals** | Every screen imports `G`, `FX` and `UI` from `game.mjs` and writes focus and effect state into them directly; input locks are one global timestamp (`FX.lockUntil`) |
| **The palette in code is not the palette in the spec, and the check can't tell** | `gfx.mjs` has 69 colours, including five wood and two felt colours, which the Station style guide forbids ("never a cottage"). The UI kit specifies the Station's colours as 96. Type, paintings and chrome share one canvas, so the journey can only assert that fewer than 8% of pixels are off palette (`tools/journey.mjs`), not zero on the art layer |
| **"Never upscaled" is broken where the spec says so** | Trait pictures are cropped and enlarged with `scalePB` (`art.mjs`, line 91) |
| **Fonts come from the internet** | `index.html` loads Inter (and the surround's Fredoka) from Google Fonts. The sign-off requires a bundled OFL file, and the device has no internet to rely on |
| **The Companion page is one script** | `prototypes/exploration/index.html`: 4,390 lines, one inline script of about 4,120 lines in 18 numbered sections (palette, rules, world generation, state, pixel core, drawing, input, page). Rules are kept apart from drawing by convention only, so none of them can run in Node. Its pixel core (`class PB`, line 2291) and palette tables are a second copy of the Station's |
| **The Companion's frame predates its decisions** | It still uses HUD 26, view 540 and line 34, 32 px tiles (`TS = 32`) and a 5×7 bitmap face, where HUD 32, view 532 and line 36, 48 px tiles and Mibi 7×9 are decided |
| **The device-build CI still builds v1** | `.github/workflows/native-build.yml` compiles the archived `v1/native` tree. Nothing current is built for an ESP32 |

### 2.2 What is sound and must be kept

| Keep | Why |
| --- | --- |
| **The pure state model** (`station/src/state.mjs`, 528 lines, no DOM) | Every rule is a pure function that returns its presentation events instead of drawing. This is exactly the shape a port needs |
| **The imported genome, rig and stamp** (`genome.mjs` bridging `workbench/framework/*` and `genome-stamp/src/*`) | The Station has no genome model of its own. CI decodes the drawn stamp back to the genome |
| **The Caddy service** (`prototypes/caddy/`: 175 lines over three files, four routes, no dependencies, plus 100 lines of tests) | In proportion to its job. Its contract (genome-only input, dedupe by hash, journalled queue, ceiling) is what the device Caddy must keep |
| **The tests and the journey** (15 rule tests, 6 Caddy tests, the Playwright journey through the device keys) | They prove the loop on every push. The proposal adds measurements to them; it doesn't replace them |
| **Device-pixel frames** | Both pages already draw into an offscreen frame at the device's size and blit it whole. That is the right model, and it stays |
| **The edges kept apart** (`caddy.mjs`, `dev.mjs`, the placeholder register in `art.mjs`) | Already the shape the architect's standing rules ask for |

**Verdict.** The rules layer is healthy. What is missing sits between the rules and the pixels: a screen layer that turns a spec into drawing and keys into actions. Without it, every screen is drawn by hand, and every layout change is a hunt through code.

## 3. Development strategy

**Decided (owner, today):** define the loop first, then port.

**Proposal.** The browser sandbox stays the place where the loop and its interactions are defined and validated, at each device's true resolution and colour depth. The architecture is built so that what is proven there moves to the devices as **data and tests**, not as code read and retyped.

| Carries across unchanged | Re-expressed on a device | Thrown away |
| --- | --- | --- |
| Screen specs (regions, components, focus graph, strings) as data files | Rules and state, in C, checked against shared test vectors (the same inputs must give the same outputs as the JavaScript reference) | The depicted device shells and side panels |
| Palettes, fonts (Mibi 7×9 glyph sheets, Inter OFL), the asset manifest and every asset at its pixel size | The component library: same names, same behaviour, the device toolkit's code | The page's fit and scale code, Google Fonts, `localStorage` |
| The save schema, migration ids and fixture saves | The renderer (indexed buffer, flush to the panel) | Playwright hooks (replaced by a host build of the device code) |
| Species frames, catalogue, genome and stamp formats | Input (GPIO keys to the same key events) and storage (flash or SD, same save layout) | The developer panel's HTML (its settings contract carries; the device gets a hidden menu) |
| The Caddy service's four routes and their contracts | The Caddy service itself, as ESP-IDF firmware | |

**What guarantees fidelity:**

- **Device-pixel surfaces.** Each target draws into a buffer of exactly its size: 1024×600, 450×600, 792×272, and 384 dots a line for the printer. The page may enlarge the finished frame by whole numbers for viewing, but never the drawing.
- **Palette enforced by construction.** The Companion and Caddy renderers write palette indexes, not colours, so an off-palette pixel cannot exist. On the Station, layers are kept apart (palette chrome and pixel art; painted art; type), so the art layer is checked at exactly 0, not under 8%.
- **A closed primitive set** on the palette devices: rectangles, indexed sprites, nine-slices, bitmap glyphs and the dither and shade tables. Each is defined exactly, so a device renderer can produce the same pixels.
- **Measured in CI,** with the sign-off's checks (grain, type, palette, size), plus the scene-level checks in §5.6.

## 4. Options per device

### 4.1 What the hardware asks

Arithmetic from the reference hardware, to be measured on boards (**Proposal**):

| | Companion (ESP32-S3R8: 512 KB SRAM, 8 MB PSRAM, 16 MB flash) | Caddy (ESP32-S3) | Station (Pi 4) |
| --- | --- | --- | --- |
| Panel | 450×600 AMOLED, RM690B0 controller over quad SPI, 16-bit colour in | 792×272 e-paper, four grays; 58 mm printer, 384 dots a line | 1024×600 over HDMI |
| One frame | 270 KB as palette indexes (PSRAM); 540 KB as 16-bit; a 60-row strip to the panel is 54 KB | 54 KB at 2 bits a pixel; one printer line is 48 bytes | 2.4 MB at 32 bits |
| Assets | One byte a pixel: a 48 px tile is 2.3 KB, a 280×300 resident 84 KB. v1's 942 KB of RGBA art would be about 235 KB | Four-gray sets; paintings on the SD card | Paintings at full colour; the rig and rasteriser run here (art pipeline §11) |
| Lesson from v1 | The 1.4 MB image was 1.1 MB of flash data, mostly RGBA art and anti-aliased font tables. Indexed assets and bitmap type remove most of it | 470 KB Caddy UI compiled | Never ran on a Pi |

The Companion's pixel model (a 48-entry palette, indexes in memory, a lookup to 16-bit on the way to the panel) is the same model the sandbox already uses. The device enforces the palette for free.

### 4.2 The options

| Option | Strengths | Weaknesses | Verdict |
| --- | --- | --- | --- |
| **(a) LVGL in C on all three, and LVGL compiled to WebAssembly for the sandbox** | One UI codebase; the sandbox shows exactly the device's pixels; MIT licence; v1 compiled for the ESP32-S3 | The rules would move to C now, so the workbench, rig and stamp (JavaScript) would have to be copied or bridged, which breaks "imported, never copied". The compile-and-debug loop is slow just when the loop is still changing. LVGL is a widget toolkit: our vocabulary (rail, stamp label, message plate) still has to be built on top. The rig would need a native port for the Station | Not now. It pays the port cost before the loop is stable, against the owner's order of work |
| **(b) Browser now, with a declarative, data-driven screen layer, and a documented port later** | Fastest iteration; the imports stay imports; the journey and sign-off checks already run here; the spec becomes data a port can use | We build and keep the screen layer ourselves. Discipline is needed so it stays small | **Recommended for the sandbox,** for all three screens |
| **(c) A web runtime on the Station itself** (Chromium in kiosk mode on the Pi), so the Station never ports; Companion and Caddy ported to an embedded toolkit | The Station page is the product: Inter anti-aliasing, painted art and the JavaScript rig run as they do today. The single most expensive port (rig, rasteriser, validator, derivation) disappears. The Pi 4 has the memory for it | Boot time, kiosk hardening, keeping a browser up to date, power. Not yet measured on a Pi 4 with the 7" panel | **Recommended for the Station,** behind a measured gate (§6, P0) |
| **(d1) Slint** (declarative markup; Linux and ESP32-S3) | Declarative screens, close to our spec-as-data idea; Espressif component tested on the S3 | Rust or C++ toolchain; on embedded it is GPLv3 or a paid licence (the royalty-free licence excludes embedded); younger on the S3 than LVGL | Credible fallback for the Companion and Caddy |
| **(d2) Embedded Rust** (embedded-graphics and similar) | Safe, small | Drawing primitives only: the same hand-drawing problem in a new language | No |
| **(d3) Flutter on the Pi** (flutter-pi) or **Qt Quick** | Mature retained UIs on Linux | Neither runs on the ESP32; the JavaScript models would be ported or bridged; a second UI stack beside the device one | No: (c) does the Station's job with the code we have |
| **(d4) MicroPython** (excluded earlier) | Quick to write | Slower and heavier on 270 KB frames; the reasons for the earlier exclusion still hold | Not reopened |

**Companion and Caddy on the device (Proposal):** native C on ESP-IDF, with **LVGL 9** for chrome, lists and menus, and our own indexed renderer for the Companion's world view (tile map and sprites) inside it. The world view is a game renderer, not a widget. LVGL is MIT-licensed, proven on the S3 in v1, and can drive an e-paper through a custom flush. Recent LVGL releases can also describe components in XML, which could later take our spec files directly. The Caddy firmware is mostly service work (Wi-Fi, TLS to the cloud, SD storage, a small HTTP server for the Station, the printer), with a quiet four-gray UI. The toolkit choice matters less there than the service contract, which carries over from the Node service.

**Wi-Fi between Station and Caddy:** the four HTTP routes of the Caddy service stay the contract (**Decided:** the Caddy brokers over Wi-Fi). The Station's client already queues in `outbox`, so the kit plays on when the Caddy is unreachable.

## 5. The structure

### 5.1 Layers

```
 keys ─▶ input & focus ─▶ intent ─▶ rules (pure) ─▶ state + events
                                                        │
 spec (data) ─▶ layout ─▶ components ◀── view (pure) ◀──┘
                              │
                            scene (retained, layered) ─▶ renderer per target ─▶ device-pixel frame
 edges: storage · Caddy client · placeholder register · developer tools · assets
```

| Module | Holds | Never |
| --- | --- | --- |
| **Rules and state** (`state.mjs` as today; the Companion's `rules/` after its split) | The save's part and every rule as a pure function; returns new state and presentation events | Draws, reads keys, touches storage |
| **Views** (`views/<screen>.mjs`) | Pure selectors from state and focus to a screen's props (what each region shows) | Coordinates |
| **Screen specs** (`prototypes/ui/specs/<device>/<screen>.json`) | Regions, components, focus graph, strings, the spec's limits | Logic |
| **Layout** (`ui/layout.mjs`) | Reads a spec; places regions; applies the few rules the style guide states (rail compaction, page grid by trait count, message plate position) | A general layout engine |
| **Components** (`ui/components/`) | Each piece of the vocabulary once: frame, top bar, bottom line, message plate, focus ring, panel, stamp label, chapter rail, chapter page, list, specimen, living window, ribbon, Companion HUD, map viewport | Read the save |
| **Scene** (`ui/scene.mjs`) | A retained tree of nodes on layers (art, painted, type), with dirty rectangles | Pixels |
| **Renderers** (`ui/render/`) | `station-canvas` (layered), `indexed` (48 colours or four grays), `print` (1 bit, 384 dots) | Game logic |
| **Input and focus** (`ui/focus.mjs`, `ui/timeline.mjs`) | Key events, the focus graph with spatial fallback, arm-then-confirm, input holds during reveals | Rule calls (it emits intents) |
| **Edges** | `storage` (the save adapter: `localStorage` in the sandbox, a file service on the Pi, flash on the ESP32), `caddy` client, `art` placeholder register, `dev` tools, the asset manifest | Mix with each other |

### 5.2 Contracts and data shapes

A screen spec mirrors `station-layouts.md`, region by region (Pods shortened):

```json
{ "screen": "pods", "device": "station", "spec": "design/style-guide/station-layouts.md#pods-list-and-read",
  "regions": {
    "list":  { "rect": [0, 40, 160, 522], "component": "list", "item": "well", "pitch": 72 },
    "rail":  { "rect": [176, 48, 832, 56], "component": "chapterRail" },
    "pod":   { "rect": [264, 120, 160, 192], "component": "specimen", "focal": true },
    "stamp": { "rect": [176, 432, 120, 120], "component": "stampLabel" },
    "page":  { "rect": [528, 112, 480, 440], "component": "chapterPage", "noDigits": true }
  },
  "focus": { "list": { "right": "pod" }, "pod": { "left": "list.current", "up": "rail.last" },
             "rail": { "down": "pod" }, "fallback": "spatial" } }
```

The other contracts:

- **View:** `view(state, focus) → props`, for example `{ pod: { asset, sealed }, rail: { chapters: [{ id, read, glint, sealed }] }, line: { ok, price, back, subject, need } }`. Pure and tested in Node.
- **Intent:** a key goes through the focus graph, which gives either a focus move or `{ target, verb }`. The screen's intent table maps it to one rule call, which returns `{ st, events }`.
- **Event:** `{ kind: "wipe", target: "page", ms: 2000, hold: true }`. The timeline plays it and holds input. No global timestamps.
- **Scene node:** `{ kind: rect | sprite | nineSlice | text | ring | clip, layer, rect, asset?, font?, colour }`. Colours are palette names, except on the painted and type layers.
- **Asset:** `{ id, file, w, h, policy: palette48 | stationChrome | painted | gray4 | print1, status: placeholder | master, until, hash }`.

### 5.3 How the layout spec becomes code

The numbers get **one home**: the spec file. The UI designer keeps writing the reasoning in `station-layouts.md`. Its tables and the wireframes in `station-layouts/` are generated from the spec files, so the document and the build can't disagree. A builder never retypes a rectangle. CI compares every drawn region's box in the scene with its spec.

<img src="../style-guide/station-layouts/02-pods-read.svg" width="1024" alt="Pods Read wireframe">

*Pods, Read. Wireframe, layout only, measured; shown at 1×. Today drawn by hand from the same numbers as the tables; under this proposal, generated from the spec file the screen draws from.*

### 5.4 How a builder adds a screen

1. The UI designer's spec lands, following the screen design method, with its spec file.
2. The builder writes the view (state to props) and its tests.
3. The builder maps regions to existing components. A new component means a new word in the vocabulary, so it goes back to the UI designer and the architect.
4. The focus graph is part of the spec; the builder only fills in ties.
5. Every asset is registered in the manifest at its size, with placeholders flagged.
6. Intents map to rule calls; anything new in the rules lands in `state.mjs` with tests.
7. The journey gains the screen's steps and screenshots; the checks run; the sign-off is filled in.

### 5.5 Art placed 1:1 and registered

A sprite node names an asset id. Its slot's size must equal the asset's size, and the renderer refuses anything else: in development it shows a visible error, and in CI it counts it. Nothing can be drawn small and enlarged. A master replaces its placeholder by taking the same id and size, and the register counts the placeholders left per screen. Close-ups are rendered at their size by the rig's camera (the layout spec's rule), not cropped.

### 5.6 Tests that measure the sign-off

The sign-off's measured checks are approved. The scene makes them exact, with no monkey-patching:

| Sign-off check | Measured from |
| --- | --- |
| Screen size | Each renderer's frame size, asserted |
| Palette | The art layer has 0 pixels off palette on every screen; the Companion and Caddy have 0 by construction |
| Type | The type layer's run log: every Station string in Inter at 16, 20 or 28 px from the bundled file; the Companion's in Mibi 7×9 at 2× or 3× |
| Grain (G2) | Journey screenshots, as specified |
| Rail chapters, digits, stamp, placeholders | The scene: tab count against the frame; no digits in text on regions marked `noDigits`; stamp label at 120 or less and 96 px or more from the focal box; every sprite resolves in the manifest |
| Regions against the spec (**new**) | The scene's boxes against the spec file. A new check, so it needs the owner's approval (decision 2) |

### 5.7 Conformance review checklist (for every build)

- [ ] No rule outside `state.mjs` (or the Companion's `rules/`); rules are pure and tested.
- [ ] No coordinates in screen code; every region comes from its spec file.
- [ ] Only vocabulary components; any new one approved by the UI designer and the architect.
- [ ] Focus from the spec's graph; no hand-made target rectangles.
- [ ] Every sprite in the manifest at its size; placeholders registered; nothing scaled.
- [ ] Colours by palette name; the art layer at 0 off palette.
- [ ] Fonts bundled; no network fetch at load except the Caddy client.
- [ ] Genome, rig and stamp imported from their homes; gaps fixed there.
- [ ] Save changes carry a schema number, a forward-only migration and a fixture.
- [ ] Developer settings outside the shared save.
- [ ] The journey extended; the sign-off's checks green; departures listed.

## 6. Migration path

Each milestone ships to the sandbox and plays from a fresh world. The save doesn't change in any of them.

| | Ships | Relative to the plan |
| --- | --- | --- |
| **T1 Screen layer and Pods** | `prototypes/ui/`: scene, layered Station renderer, layout, focus, timeline, the frame components (top bar, bottom line, message plate, focus ring, panel, stamp label, chapter rail, chapter page); Pods from its spec; Inter bundled, Google Fonts removed; the palette checked per layer. Screens not yet moved draw into the art layer through an adapter | **Replaces the pending layout pass** for Pods. Doing the pass on the old code first would mean doing it twice |
| **T2 Layout pass on the layer** | Home, Create, Incubator and Habitat from their specs; the old per-screen geometry deleted as each screen moves; the regions check | The rest of the pending layout pass |
| **M5 Library** | Spread and Book built on the layer from their specs | Waits for T1 (it needs the stamp label, tabs and pages); runs beside T2 |
| **M6 Sitting and the whole journey** | As planned, on the layer; Cross and Sitting once their specs exist | Unchanged in scope |
| **C1 Companion split** | The inline script into modules (rules, world, state, renderer, screens) with no visible change | Independent of the Station; can run beside T2 |
| **C2 Companion on the layer** | HUD 32, view 532, line 36; Mibi 7×9; the map viewport for 48 px tiles, with the art redraw | Lands with the 48 px redraw |
| **P0 Hardware proofs** (hardware track, in parallel) | The sandbox Station page in kiosk mode on a Pi 4 and the 7" panel (frame time on the heaviest screen, a rig render, boot time); a 450×600 indexed frame flushed to the board; a four-gray refresh | Gates decision 1. Doesn't block T1 to M6 |
| **P1 Port** | Companion and Caddy firmware from the specs, assets and test vectors; a host build in CI compares frames with the sandbox's | **After the loop is stable** (owner's order) |

| Risk | Mitigation |
| --- | --- |
| The screen layer grows into a framework project | Its vocabulary is closed (station-layouts.md); rectangles are absolute from the spec; no general layout engine |
| T1 delays M5 | T1 replaces the layout pass rather than adding to it; M5 then builds faster on shared components |
| Spec files and the document drift apart | One home for the numbers; tables and wireframes generated from it |
| Chromium kiosk on the Pi is too slow or fragile | P0 measures it before anything depends on it; fallback is LVGL with SDL on the Pi plus a native rig, at the cost (a) carries |
| The device port differs from the sandbox's pixels | A closed, exact primitive set; frame comparison from a host build |
| Splitting the Companion breaks the playable page | C1 makes no visible change; the smoke and parse checks stay |
| The Station palette is unsettled (69 in code, 96 in the UI kit, painted art on top) | The renderer takes the palette as data; the UI designer and the art director fix it; the check follows |

## 7. Decisions

**Decided** 2026-10-08: 2 and 3 as recommended. Decision 1 withdrawn; a replacement proposal follows.

1. **The Station runs the web page on the Pi and never ports.** *Recommended: yes, behind the P0 measurement.* The rig, rasteriser, validator and derivation must run on the Station, and they exist only in JavaScript. Inter anti-aliasing and painted art are native to a browser. The Pi 4 has the capacity. This replaces "everything through LVGL" for the Station only.
2. **The sandbox gets its own small, declarative screen layer now** (screen specs as data, a component library, a retained scene, a focus model), built as T1 in place of the pending layout pass and before M5, with the regions check added to CI. *Recommended: yes.* It is the separation of concerns the owner asked for. Adopting LVGL-in-WebAssembly now would move the rules to C before the loop is stable and would copy what must be imported.
3. **The Companion and Caddy port to native C on ESP-IDF with LVGL 9** for chrome and our own indexed renderer for the world view, started only when the loop is stable. *Recommended: yes, with Slint as the fallback.* LVGL is MIT-licensed and proven on the S3. The palette model is the sandbox's own. Slint on embedded is GPLv3 or paid, and younger on the S3.

**Overall recommendation.** Keep the browser as the place where the game is defined, and give it what it lacks: a screen layer between the pure rules and the pixels. Make the Station's product the page itself on the Pi. Port the Companion and the Caddy to LVGL in C once the loop holds, carrying specs, assets, fonts, palettes, the save and test vectors as data, so the port is a translation checked by measurement, not a rewrite.
