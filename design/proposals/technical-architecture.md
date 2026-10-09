# Technical architecture: one loop, three screens

**Decided** 2026-10-08: decisions 2 and 3 of section 7 were taken as recommended, so this document is the architecture every Station, Companion and Caddy build follows. **Decision 1 (the Station as a web page on the Pi) was withdrawn by the owner the same day:** the Station's hardware is the Raspberry Pi 4 and will not grow to carry a browser; everything is optimised for underpowered hardware; no hardware prototyping until the loop is complete in software. The replacement for the Station's device runtime is proposed in section 4.3 and is decision 1 of section 7 (**Proposal**). Written by the architect, 2026-10-08, for the owner. It answers the owner's direction of today: review the technical architecture of the Station and the Caddy (and, with them, the Companion), and choose the tooling and frameworks that draw the screens and handle interaction on hardware we can actually ship. **Decided** marks owner decisions restated here; everything else is **Proposal**. Section 7 holds the three decisions.

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
| Screen specs (regions, components, focus graph, strings) as data files | Companion and Caddy rules and state, in C, checked against shared test vectors (the same inputs must give the same outputs as the JavaScript reference) | The depicted device shells and side panels |
| Palettes, fonts (Mibi 7×9 glyph sheets, Inter baked to glyph atlases from the OFL file), the asset manifest and every asset at its pixel size | The component library, once, in C on LVGL for all three devices: same names, same behaviour | The page's fit and scale code, Google Fonts, `localStorage` |
| The save schema, migration ids and fixture saves | The renderer (indexed buffer on the ESP32s; layered 32-bit frame on the Pi) | Playwright hooks (replaced by a host build of the device code) |
| Species frames, catalogue, genome and stamp formats; **on the Station, the rules, genome, rig, stamp and Caddy client as code** (§4.3) | Input (GPIO keys to the same key events) and storage (flash or SD on the ESP32s, a file on the Pi; same save layout) | The developer panel's HTML (its settings contract carries; the device gets a hidden menu) |
| The Caddy service's four routes and their contracts | The Caddy service itself, as ESP-IDF firmware | |

**What guarantees fidelity:**

- **Device-pixel surfaces.** Each target draws into a buffer of exactly its size: 1024×600, 450×600, 792×272, and 384 dots a line for the printer. The page may enlarge the finished frame by whole numbers for viewing, but never the drawing.
- **Palette enforced by construction.** The Companion and Caddy renderers write palette indexes, not colours, so an off-palette pixel cannot exist. On the Station, layers are kept apart (palette chrome and pixel art; painted art; type), so the art layer is checked at exactly 0, not under 8%.
- **A closed primitive set** on all three devices: rectangles, sprites (indexed, or 32-bit with straight alpha on the Station's painted layer), nine-slices, glyph runs from baked atlases, and the dither and shade tables. Each is defined exactly, so the device renderer can produce the same pixels, Inter included, since the sandbox and the device draw the same baked glyphs.
- **Measured in CI,** with the sign-off's checks (grain, type, palette, size), plus the scene-level checks in §5.6.

## 4. Options per device

### 4.1 What the hardware asks

Arithmetic from the reference hardware, to be measured on boards (**Proposal**):

| | Companion (ESP32-S3R8: 512 KB SRAM, 8 MB PSRAM, 16 MB flash) | Caddy (ESP32-S3) | Station (Pi 4, the ceiling: 2 GB or less, no GPU-accelerated browser) |
| --- | --- | --- | --- |
| Panel | 450×600 AMOLED, RM690B0 controller over quad SPI, 16-bit colour in | 792×272 e-paper, four grays; 58 mm printer, 384 dots a line | 1024×600 over HDMI, drawn in software to the kernel's display (DRM) |
| One frame | 270 KB as palette indexes (PSRAM); 540 KB as 16-bit; a 60-row strip to the panel is 54 KB | 54 KB at 2 bits a pixel; one printer line is 48 bytes | 2.4 MB at 32 bits; two buffers 4.8 MB |
| Assets | One byte a pixel: a 48 px tile is 2.3 KB, a 280×300 resident 84 KB. v1's 942 KB of RGBA art would be about 235 KB | Four-gray sets; paintings on the SD card | Paintings at full colour, 372 KB each at 300×310 decoded; the rig, rasteriser, validator and derivation run here (art pipeline §11) |
| Lesson from v1 | The 1.4 MB image was 1.1 MB of flash data, mostly RGBA art and anti-aliased font tables. Indexed assets and bitmap type remove most of it | 470 KB Caddy UI compiled | Never ran on a Pi |

The Companion's pixel model (a 48-entry palette, indexes in memory, a lookup to 16-bit on the way to the panel) is the same model the sandbox already uses. The device enforces the palette for free.

### 4.2 The options

| Option | Strengths | Weaknesses | Verdict |
| --- | --- | --- | --- |
| **(a) LVGL in C on all three, and LVGL compiled to WebAssembly for the sandbox** | One UI codebase; the sandbox shows exactly the device's pixels; MIT licence; v1 compiled for the ESP32-S3 | The rules would move to C now, so the workbench, rig and stamp (JavaScript) would have to be copied or bridged, which breaks "imported, never copied". The compile-and-debug loop is slow just when the loop is still changing. LVGL is a widget toolkit: our vocabulary (rail, stamp label, message plate) still has to be built on top. The rig would need a native port for the Station | Not now. It pays the port cost before the loop is stable, against the owner's order of work |
| **(b) Browser now, with a declarative, data-driven screen layer, and a documented port later** | Fastest iteration; the imports stay imports; the journey and sign-off checks already run here; the spec becomes data a port can use | We build and keep the screen layer ourselves. Discipline is needed so it stays small | **Recommended for the sandbox,** for all three screens |
| **(c) A browser on the Station** (Chromium in kiosk mode on the Pi) | The Station would never port | A full browser on underpowered hardware, with no GPU acceleration to lean on | **Withdrawn by the owner, 2026-10-08.** Replaced by §4.3 |
| **(d1) Slint** (declarative markup; Linux and ESP32-S3) | Declarative screens, close to our spec-as-data idea; Espressif component tested on the S3 | Rust or C++ toolchain; on embedded it is GPLv3 or a paid licence (the royalty-free licence excludes embedded); younger on the S3 than LVGL | Credible fallback for the Companion and Caddy |
| **(d2) Embedded Rust** (embedded-graphics and similar) | Safe, small | Drawing primitives only: the same hand-drawing problem in a new language | No |
| **(d3) Flutter on the Pi** (flutter-pi) or **Qt Quick** | Mature retained UIs on Linux | Neither runs on the ESP32; the JavaScript models would be ported or bridged; a second UI stack beside the device one | No: a second, heavier UI stack beside LVGL (see §4.3) |
| **(d4) MicroPython** (excluded earlier) | Quick to write | Slower and heavier on 270 KB frames; the reasons for the earlier exclusion still hold | Not reopened |

**Companion and Caddy on the device (Proposal):** native C on ESP-IDF, with **LVGL 9** for chrome, lists and menus, and our own indexed renderer for the Companion's world view (tile map and sprites) inside it. The world view is a game renderer, not a widget. LVGL is MIT-licensed, proven on the S3 in v1, and drives an e-paper through a custom flush. The Caddy firmware is mostly service work (Wi-Fi, TLS, SD storage, a small HTTP server for the Station, the printer) with a quiet four-gray UI, so its service contract matters more than the toolkit.

**Wi-Fi between Station and Caddy:** the four HTTP routes of the Caddy service stay the contract (**Decided:** the Caddy brokers over Wi-Fi). The Station's client already queues in `outbox`, so the kit plays on when the Caddy is unreachable.

### 4.3 The Station's runtime, within the Pi 4

**Decided (owner, 2026-10-08):** the Pi 4 is the ceiling and the hardware won't grow; optimise for underpowered hardware.

The Station has two halves. **The face** (screens, focus, animation, drawing) must be light on a CPU-only Pi. **The logic** (rules, genome model, cross, stamp, rig, rasteriser, controls, derivation, Caddy client) is JavaScript imported from the workbench and the stamp: about 3,600 dense lines, still changing. Its heavy work runs in the background (a controls-and-placeholder set took about five seconds a mibi on the VM, while a bud grows for twenty minutes).

| Option | RAM (resident, Proposal) | CPU and boot | Upkeep | Verdict |
| --- | --- | --- | --- | --- |
| **S1 LVGL 9 face in C + the logic in a headless Node process beside it** (no browser): the face renders from the spec files and the view props the logic sends over a local socket, and sends back intents | Face: 4.8 MB of buffers plus an image cache of 20–40 MB. Node: about 45 MB idle, published figure, plus the rig's working set. Under 300 MB with the OS | LVGL on DRM held 30 fps at 4–6% CPU on a Pi 3B at 800×480 (LVGL forum figure); it redraws only what changed. Node starts in about a second. The system boot dominates: 15–20 s typical on Raspberry Pi OS, about 4–10 s on a trimmed Buildroot image (forum figures) | **One C face for all three devices**; the Station's logic stays the sandbox's own modules, imported, never copied; one seam (props in, intents out); Node's long-term releases | **Recommended** |
| **S2 LVGL face in C + the logic ported to C** (one process) | The lightest: tens of MB | The same face; the rig in C is faster | The genome, rig, stamp and cross exist twice, JavaScript in the workbench and C on the Station. Every workbench change is ported and re-verified with test vectors, forever | **Fallback,** if a JavaScript runtime on the device is ruled out |
| **S3 As S1 with QuickJS for the logic** | About 7 MB for the runtime (published figure) | An interpreter, about 17–25 times slower than Node in published comparisons: the rig would take minutes a mibi, and Create's close-ups seconds | As S1 | No, unless RAM ever drops below 512 MB |
| **S4 The sandbox's own JavaScript renderer, headless in Node, with a native canvas library writing to DRM** | 100–150 MB (estimate) | Every frame drawn in JavaScript | Saves the Station screen port; an uncommon path with few users; the Station on a different face from the other two devices; not an established framework | No: the owner asked for established frameworks |
| **S5 SDL2 + our own C renderer** | Light | Light | We write anti-aliased text, images and the face ourselves, apart from the ESP32s' LVGL: the hand-drawing problem again | No |
| **S6 Slint on Linux** | Light; software renderer | Light | A device counts as embedded, so GPLv3 or paid; a different toolkit from the ESP32s unless all three move | Only as the all-device fallback named in decision 3 |

**Proposal: S1.** The face is LVGL 9 in C on the Linux DRM driver, drawing in software, with the Companion's and Caddy's component library. It adds two layers: painted art as 32-bit images with straight alpha, and anti-aliased Inter at 16, 20 and 28 px from atlases baked from the bundled OFL file. The logic is the sandbox's own modules, run headless by Node as a service. It writes the save to a file atomically, talks to the Caddy over Wi-Fi, and puts rig renders and the stamp into an image cache the face reads by asset id. The seam is §5.2's view contract. **Fallback: S2**, at the price of a second genome model.

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
| **Renderers** (`ui/render/`) | `station-canvas` (layered), `indexed` (48 colours or four grays), `print` (1 bit, 384 dots); on the devices, the same three in C on LVGL | Game logic |
| **Input and focus** (`ui/focus.mjs`, `ui/timeline.mjs`) | Key events, the focus graph with spatial fallback, arm-then-confirm, input holds during reveals | Rule calls (it emits intents) |
| **Edges** | `storage` (the save adapter: `localStorage` in the sandbox, a file written by the logic process on the Pi, flash on the ESP32), `caddy` client, `art` placeholder register, `dev` tools, the asset manifest | Mix with each other |

### 5.2 Contracts and data shapes

A screen spec mirrors `station-layouts.md`, region by region (Pods shortened):

```json
{ "screen": "pods", "device": "station", "spec": "design/style-guide/station-layouts.md#pods-collection-pod-overview-chapter-page",
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
- **Scene node:** `{ kind: rect | sprite | nineSlice | glyphs | clip, layer, rect, asset?, font?, colour }`. Colours are palette names, except on the painted and type layers. `font` names a baked atlas (`inter-16`, `mibi-7x9@2`), never a CSS font string.
- **Asset:** `{ id, file, w, h, policy: palette48 | stationChrome | painted | gray4 | print1, status: placeholder | master, until, hash }`. Files are PNG: indexed for the palette policies, 32-bit with straight alpha for `painted`. A build tool converts them to LVGL's binary formats.

### 5.3 How the layout spec becomes code

The numbers get **one home**: the spec file. The UI designer keeps writing the reasoning in `station-layouts.md`. Its tables and the wireframes in `station-layouts/` are generated from the spec files, so the document and the build can't disagree. A builder never retypes a rectangle. CI compares every drawn region's box in the scene with its spec.

<img src="../style-guide/station-layouts/02b-pods-overview.png" width="1024" alt="Pods overview wireframe">

*Pods, pod overview. Wireframe, layout only, measured; shown at 1×. Today drawn by hand from the same numbers as the tables; under this proposal, generated from the spec file the screen draws from.*

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
| **H0 Host-build proof** (software only, optional, after T2) | The C component library on LVGL, built for Linux in CI, draws Pods and the Companion's HUD and bottom line from the specs and the props the journey records; its frames are compared with the sandbox's (exact on the palette and type layers, since both draw the same atlases) | No hardware (**Decided:** none until the loop is complete in software). A new check, so it needs the owner's approval when proposed |
| **P1 Port** | In order: the shared C face on Linux (the host build grown), then the **Station** (S1: the face on the Pi, the logic process, the image cache, the save file, GPIO keys), then the Companion and the Caddy firmware from the specs, assets and test vectors | **After the loop is stable** (owner's order). Hardware work starts here |

**The price of the Station decision.** With the withdrawn browser, the Station's port was a system image, a save service and key input, with no screens. Under S1, P1 adds the Station's eleven screens on the C component library, about as much screen work again as the Companion's nine or so. On top come the Station-only components (chapter rail, chapter page, stamp label, specimen, living window, the Library's spread and Book), the painted and type layers, and the props-and-intents seam. Against S2, it avoids porting the genome, rig, stamp, cross and Caddy client and keeping them twice. The face is built once for three devices.

**What T1 does now so this port stays cheap** (T1 stands as commissioned; these are additions for its builder):

1. **Type from baked atlases, not `fillText`.** Bake Inter at 16, 20 and 28 px (and Mibi 7×9) with LVGL's font converter, which runs in Node, into one atlas format with its metrics and kerning. The sandbox's type layer blits those glyphs and measures text from the atlas metrics. The device then draws the same pixels, and the type check reads the run log.
2. **A closed primitive set on the Station too.** Components use only rect, sprite, nine-slice, glyph runs and clip. No canvas paths, gradients, shadows, filters, transforms or `globalAlpha`. The focus ring and rounded panels become nine-slices or sprites. Painted light is an asset, never code.
3. **Image formats.** PNG only, indexed or 32-bit with straight alpha, registered at their pixel size; no WebP or run-time SVG.
4. **Rig renders through the asset cache.** Components ask for `{ kind: placeholder | closeUp | stamp, sha, w, h }` by asset id and never call the rasteriser themselves. This is where the device's logic process plugs in.
5. **Views, layout and scene run in Node.** No DOM or canvas imports outside the renderer. Props, intents and events are plain JSON. The journey can then record them, which H0 needs.

| Risk | Mitigation |
| --- | --- |
| The screen layer grows into a framework project | Its vocabulary is closed (station-layouts.md); rectangles are absolute from the spec; no general layout engine |
| T1 delays M5 | T1 replaces the layout pass rather than adding to it; M5 then builds faster on shared components |
| Spec files and the document drift apart | One home for the numbers; tables and wireframes generated from it |
| Node's memory or the rig's speed on the Pi 4 proves too much | Rig work is background and cached by genome hash; the seam lets S2 replace the logic process without touching the face; measured when hardware work starts |
| Inter from LVGL's atlases reads differently from the browser's today | T1 moves the sandbox to the same atlases now, so the owner judges the type the device will draw |
| The device port differs from the sandbox's pixels | A closed, exact primitive set; frame comparison from a host build |
| Splitting the Companion breaks the playable page | C1 makes no visible change; the smoke and parse checks stay |
| The Station palette is unsettled (69 in code, 96 in the UI kit, painted art on top) | The renderer takes the palette as data; the UI designer and the art director fix it; the check follows |

## 7. Decisions

**Decided** 2026-10-08: 2 and 3 as recommended. The first decision 1 (a browser on the Pi) was withdrawn by the owner; decision 1 below replaces it and is open.

1. **The Station's runtime. Decided 2026-10-08: S1.** The face is LVGL 9 in C on the Pi's display, the same component library as the Companion and the Caddy, with painted art and anti-aliased Inter from baked atlases. The logic (rules, genome, rig, stamp, Caddy client, the save) is the sandbox's own JavaScript, run headless by Node beside it as a service, with no browser. *Recommended: yes, with the logic ported to C as the fallback.* It fits well within a Pi 4 of 2 GB or less (under 300 MB resident, a few per cent of CPU at rest). It gives three devices one face. It keeps the genome model in one language, imported, never copied. Its price is the Station's screens in the port (§6); the fallback adds a second genome model to maintain.
2. **The sandbox gets its own small, declarative screen layer now** (screen specs as data, a component library, a retained scene, a focus model), built as T1 in place of the pending layout pass and before M5, with the regions check added to CI. *Recommended: yes.* It is the separation of concerns the owner asked for. Adopting LVGL-in-WebAssembly now would move the rules to C before the loop is stable and would copy what must be imported.
3. **The Companion and Caddy port to native C on ESP-IDF with LVGL 9** for chrome and our own indexed renderer for the world view, started only when the loop is stable. *Recommended: yes, with Slint as the fallback.* LVGL is MIT-licensed and proven on the S3. The palette model is the sandbox's own. Slint on embedded is GPLv3 or paid, and younger on the S3.

**Overall recommendation.** Keep the browser as the place where the game is defined, and give it what it lacks: a screen layer between the pure rules and the pixels. Once the loop holds, port all three faces to one LVGL component library in C, with no browser anywhere. The Companion and the Caddy carry specs, assets, fonts, palettes, the save and test vectors as data. The Station keeps its JavaScript logic, headless, behind the same view contract the sandbox uses. The port is then a translation checked by measurement, not a rewrite, and it fits the hardware we have.

## 8. Assessment: the real LVGL face in the sandbox now

**Proposal**, 2026-10-08, at the owner's question "are you even considering the LVGL framework? can we draw that?". **Decided:** the Station's device face is LVGL 9 in C (S1), and the Companion and the Caddy port to LVGL 9. The question here is only *when* the sandbox starts drawing through that same face. Can we? Yes. LVGL compiles to WebAssembly with Emscripten and draws through its SDL driver, or through a small display driver that copies dirty rectangles onto the page's canvas. The existing JavaScript logic drives it through the props-in, intents-out contract of §5.2.

**What it looks like.** The Station page loads `face.wasm`. The views compute Pods' props in JavaScript as they do today, and pass them as JSON. The C face sets LVGL objects from the spec file's rectangles, draws, and sends `{ target, verb }` back when a key is pressed. The rules never leave JavaScript, so the loop's mechanics still change at JavaScript speed.

### 8.1 What carries from T1, and what goes

| Carries unchanged | Re-expressed in C | Thrown away |
| --- | --- | --- |
| Spec files (`prototypes/ui/specs/station/*.json`), loaded at run time in the sandbox so a nudge needs no recompile, and compiled into tables for the ESP32s | The components (frame, top bar, bottom line, message plate, focus ring, panel, stamp label, chapter rail, chapter page, list, specimen) as LVGL objects at absolute positions from the spec (not flex, so the numbers stay the spec's) | `scene.mjs`, `render/station-canvas.mjs`, `layout.mjs`, `focus.mjs`, `timeline.mjs`, `type.mjs`, `components/*`: about 900 lines of the layer, written in the last days |
| Inter's source file and its `lv_font_conv` settings; the atlases are regenerated as LVGL C fonts from the same run | The focus graph as our key handler over LVGL objects (LVGL's own groups only step next and previous) | The atlas PNG and metrics form, replaced by the converter's LVGL output |
| The asset manifest and every PNG slice of the painted masters, converted at build time to LVGL images (32-bit, lz4 compressed) | The timeline as LVGL animations | The three-canvas compositing |
| Views, intents, rules, the save, the Caddy client, the journey's key presses | The layer checks, re-pointed at LVGL's framebuffer (below) | |
| The palette file and the sign-off checks' definitions | | |

**The checks.** LVGL draws one framebuffer, not three layers. In test mode the face renders each screen three times: chrome only, chrome with paintings, everything. That gives the palette check its exact zero on the chrome pass. The type check reads a log written by our label component (face, size, string). Grain and size are measured from the framebuffer as now.

### 8.2 Toolchain, build and speed

| | Today (T1) | LVGL face in the sandbox |
| --- | --- | --- |
| Toolchain | None beyond Node | Emscripten SDK pinned in CI and in builders' environments (about 1 GB installed, cached); CMake |
| Source | About 900 lines of JavaScript | LVGL 9.6.0 unmodified, the 39 MB tree already in the repository (`v1/native/vendor/lvgl`, moved to a shared home, no new download); our face in C |
| Build | None | Clean build of LVGL plus face, estimated 1–3 minutes in CI; changing one face file, estimated 5–20 seconds |
| Page weight | Atlases about 1.4 MB as PNG | `face.wasm` estimated 0.6–1 MB with the fonts compiled in (less gzipped); masters as now |
| Builder's loop for a layout change | Edit, reload | Spec file: edit, reload (no compile). Component: edit, compile, reload |
| Debugging | Browser tools on JavaScript | C in the browser through source maps and DWARF, clumsier; so the same face also builds natively for Linux with SDL, where a debugger works. That build is S1's Pi face and the H0 proof at once |
| Fidelity | A JavaScript imitation of the face; the port re-expresses it | **The Station's device face itself**, the same C on the Pi; the same component library on the ESP32s, with only the display format differing |

### 8.3 Risks

| Risk | Assessment |
| --- | --- |
| WebAssembly size | Within a page's budget at the estimate above; measured at L0 |
| Copying 1024×600 to the canvas | 2.4 MB a full frame; LVGL redraws only what changed, and the driver copies only those rectangles. Not a concern on a desktop; checked on a phone at L0 |
| Debugging C from a browser | Real, which is why the native Linux build comes with L0 |
| The Companion's indexed renderer inside LVGL | LVGL draws into 16- or 32-bit buffers, not palette indexes. The world view keeps our indexed renderer writing an 8-bit indexed image that LVGL shows. Chrome is drawn with anti-aliasing off, in palette colours, and checked at zero from the framebuffer. Palette enforcement by construction holds for the world view only |
| LVGL's XML components | Not in the open-source 9.6 tree we vendor, so we don't rely on them; our spec files feed absolute positions |
| Screens built twice | While the JavaScript layer stays, every new Station screen (T2, M5, M6) is built once in JavaScript and again in C at P1 |
| Slower iteration while art and layouts still move | Limited: rules, views and spec numbers stay hot-reloadable; only new or changed components compile |

### 8.4 Migration, with Pods working throughout

| | Ships | Days (one builder) |
| --- | --- | --- |
| **L0 Toolchain** | Emscripten in CI; the face as an empty 1024×600 LVGL display in the Station page behind `?face=lvgl`, the JavaScript layer still the default; the native Linux build; size and phone checks | 2–3 |
| **L1 The frame in LVGL** | Top bar, bottom line, message plate, focus ring, panel from `frame.json`, driven by today's views over the bridge; fonts from the converter | 4–5 |
| **L2 Pods to parity** | List, rail, page, specimen, stamp label; the focus graph and animations; the painted slices as LVGL images; checks on the framebuffer; the journey run against both faces | 5–7 |
| **L3 Switch** | LVGL becomes the default; the JavaScript layer's drawing modules are deleted; T2, M5 and M6 continue on the LVGL face | 1–2 |

**The price, honestly: 12 to 17 working days**, about three weeks, before the next new Station screen ships. Of those, roughly 9 to 12 are C work P1 needs anyway (the shared face, Station components, fonts and assets through LVGL). The rest, 3 to 5 days, is new: the WebAssembly glue, the bridge and the three-pass checks. Keeping the layer costs nothing now. At P1 it costs rebuilding in C every Station screen made in JavaScript in the meantime (Home, Create, Incubator, Habitat, the Library, Cross, Sitting), plus a period when sandbox and device faces can disagree.

### 8.5 Decision for the owner

**Switch the sandbox's Station face to LVGL now, or keep the JavaScript layer until the loop is stable and port then?** *Recommended: switch now*, through L0 to L3, before T2 and M5 build more screens.

- The device face is already decided as LVGL, so every Station screen built on the JavaScript layer would be built twice.
- What the owner judges in the sandbox becomes exactly what the Pi will draw.
- The loop's speed is kept where it matters: rules, views and spec numbers stay in JavaScript and data.

The cost is about three weeks before the next new screen, most of it pulled forward from the port. The Companion follows on the same build at C2, keeping its indexed world view.
