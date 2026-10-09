# Technical architecture: one loop, three screens

**Decided** (owner, 2026-10-08): the three decisions of section 7, so this document is the architecture every Station, Companion and Caddy build follows. The Station's device runtime is **S1** (§4.3): an LVGL 9 face in C on the Raspberry Pi 4, with the logic run headless by Node beside it and no browser on the Pi. The Pi 4 is the ceiling; everything is optimised for underpowered hardware; no hardware prototyping until the loop is complete in software. **Decided** (owner, 2026-10-08 and 2026-10-09 11:27): the sandbox draws the Station through that same LVGL face, compiled to WebAssembly (§8), and the JavaScript drawing layer (the screen layer of decision 2, built as T1) is deprecated and frozen: no new screen or screen feature is built on it. The build plan for the face is [lvgl-switch.md](lvgl-switch.md), which governs where the two documents differ. Written by the architect for the owner, answering the direction to review the technical architecture of the Station and the Caddy (and, with them, the Companion) and to choose the tooling and frameworks that draw the screens and handle interaction on hardware we can ship. **Decided** marks owner decisions restated here; everything else is **Proposal**.

**Decided 2026-10-08 (owner).**

- Every Station and Caddy build follows a technical architecture review. The earlier rule "native C, everything drawn through LVGL" is reopened: moving away from LVGL or native C is allowed.
- The only fixed limits are the hardware: ESP32 for the Companion and the Caddy, a Raspberry Pi for the Station, and each screen's resolution and colour depth.
- **First define the loop**, honouring each device's pixels and colours; once the loop and the interactions are stable, **port**.

**Decided earlier, and not reopened here:** the Station at 1024×600 at 1× with Inter at 16, 20 and 28 px, anti-aliased, and painted full-colour art; the Companion at 450×600 on the 48-colour palette with 48 px tiles, HUD 32, view 532, bottom line 36, and the Mibi 7×9 bitmap type; the Caddy in four grays; the kit plays standalone with no internet; cargo moves only on docking; the Caddy brokers paintings over Wi-Fi from the Station; genome, rig and stamp are imported from `prototypes/workbench` and `prototypes/genome-stamp`, never copied; routine play uses the depicted keys only; the developer-tools mode is a build requirement; no MicroPython or Arduino.

## 1. What this is for

The kit has three screens and one game. Without this architecture each screen is built by drawing pixels at numbers typed into code. That is fast for the first screen and slow for every one after it, and it gets worse as more people work on the code at once.

**An example.** The layout spec says the stamp is "a 120×120 label, one rule, every screen that shows it". At the diagnosis (§2) the Station drew it in six places at five sizes: 196 px on Pods, 120 on Create and the Incubator, 96 on Cross, 88 on Habitat, 112 on the Library. To apply the rule, a builder edits six screen files and checks each by eye. On the face the stamp label is one C word and each screen's spec gives it a rectangle. The rule lives in one place, and CI measures it.

The architecture has three jobs:

1. **Builders implement; they don't invent.** A screen is a spec, a view of the state and a list of actions. It is never a page of coordinates.
2. **Each concern has one home.** Rules, layout, components, drawing, input, storage and the network edges each live in their own module, so two builders can work side by side without colliding.
3. **The port is cheap.** What we prove in the browser carries to the devices as data and tests. It is not rewritten from memory.

## 2. Diagnosis

Measured on `main` on 2026-10-08, before T1. It is the finding this architecture answers, not a description of the code now; the face's state is lvgl-switch.md and `prototypes/face/README.md`.

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

**Decided (owner, 2026-10-08):** define the loop first, then port.

**Proposal.** The browser sandbox stays the place where the loop and its interactions are defined and validated, at each device's true resolution and colour depth. The architecture is built so that what is proven there moves to the devices as **data and tests**, not as code read and retyped.

| Carries across unchanged | Re-expressed on a device | Thrown away |
| --- | --- | --- |
| Screen specs (regions, components, focus graph, strings) as data files | Companion and Caddy rules and state, in C, checked against shared test vectors (the same inputs must give the same outputs as the JavaScript reference) | The depicted device shells and side panels |
| Palettes, fonts (Mibi 7×9 glyph sheets, Inter baked to glyph atlases from the OFL file), the asset manifest and every asset at its pixel size | The component library, once, in C on LVGL for all three devices: same names, same behaviour | The page's fit and scale code, Google Fonts, `localStorage` |
| The save schema, migration ids and fixture saves | The renderer (indexed buffer on the ESP32s; layered 32-bit frame on the Pi) | Playwright hooks (replaced by a host build of the device code) |
| Species frames, catalogue, genome and stamp formats; **on the Station, the rules, genome, rig, stamp and Caddy client as code** (§4.3) | Input (GPIO keys to the same key events) and storage (flash or SD on the ESP32s, a file on the Pi; same save layout) | The developer panel's HTML (its settings contract carries; the device gets a hidden menu) |
| The Caddy service's four routes and their contracts | The Caddy service itself, as ESP-IDF firmware | |

**On the Station nothing of the face is re-expressed.** The sandbox's Station face is the device's own C, compiled to WebAssembly (§8, lvgl-switch.md): the component library, the renderer, focus and input run the same on the Pi, which adds only its platform layer, the Node host and the image cache (lvgl-switch.md §2.9). The middle column above holds for the Companion and the Caddy, whose words are the Station's `common/` words under their own profiles (lvgl-switch.md §2.2).

**What guarantees fidelity:**

- **Device-pixel surfaces.** Each target draws into a buffer of exactly its size: 1024×600, 450×600, 792×272, and 384 dots a line for the printer. The page may enlarge the finished frame by whole numbers for viewing, but never the drawing.
- **Palette enforced by construction.** The Companion and Caddy renderers write palette indexes, not colours, so an off-palette pixel cannot exist. On the Station, every primitive carries its layer (chrome, art, painted, type), and in test mode the face renders chrome only and chrome with art as separate passes, so those are checked at exactly 0 off palette, not under 8% (lvgl-switch.md §2.8).
- **A closed primitive set** on all three devices: rectangles, text runs from fonts baked by `lv_font_conv`, sprites (indexed, or 32-bit with straight alpha on the Station's painted layer), nine-slices, clip, and composed pictures for fine line work (lvgl-switch.md §2.2). It is the face's `prim/`, the only code that creates LVGL objects, so the sandbox and the device draw the same pixels, Inter included.
- **Measured in CI,** with the sign-off's checks (grain, type, palette, size), from the face's logs and framebuffer (§5.6).

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
| **(a) LVGL in C on all three, and LVGL compiled to WebAssembly for the sandbox** | One UI codebase; the sandbox shows exactly the device's pixels; MIT licence; v1 compiled for the ESP32-S3 | The rules would move to C now, so the workbench, rig and stamp (JavaScript) would have to be copied or bridged, which breaks "imported, never copied". The compile-and-debug loop is slow just when the loop is still changing. LVGL is a widget toolkit: our vocabulary (rail, stamp label, message plate) still has to be built on top. The rig would need a native port for the Station | **Decided for the Station's face** (owner, 2026-10-08, §8), without the weakness on the rules: they stay JavaScript behind the bridge (props in, intents out; lvgl-switch.md §2.1), so nothing is copied. The Companion and the Caddy follow on the same C words (§6, C2 and P1) |
| **(b) Browser now, with a declarative, data-driven screen layer, and a documented port later** | Fastest iteration; the imports stay imports; the journey and sign-off checks already run here; the spec becomes data a port can use | We build and keep the screen layer ourselves. Discipline is needed so it stays small | The sandbox page stays the place the loop is defined, with its spec files, views and rules. Its JavaScript screen layer is **deprecated and frozen** (owner, 2026-10-09 11:27; §5.1) |
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

**Decided** (owner, 2026-10-08): **S1.** The face is LVGL 9 in C on the Linux DRM driver, drawing in software, with the Companion's and Caddy's component library. It adds two layers: painted art as 32-bit images with straight alpha, and anti-aliased Inter at 16, 20 and 28 px from atlases baked from the bundled OFL file. The logic is the sandbox's own modules, run headless by Node as a service. It writes the save to a file atomically, talks to the Caddy over Wi-Fi, and puts rig renders and the stamp into an image cache the face reads by asset id. The seam is the bridge contract of lvgl-switch.md §2.1 (props in, intents out), the same bytes the sandbox carries. **Fallback: S2**, at the price of a second genome model.

## 5. The structure

### 5.1 Layers

**Decided** (owner, 2026-10-08 and 2026-10-09 11:27). JavaScript decides what each region shows; the LVGL face, in C, decides where it goes, how it looks, how focus moves and how it animates. The face's own layers (platform, bridge, prim, vocab, layout, screens) and the rule of the split are [lvgl-switch.md §2](lvgl-switch.md#2-target-architecture-of-the-face).

```
 keys ─▶ FACE: input & focus graph ─▶ intent ─▶ JS: intent table ─▶ rules (pure) ─▶ state + events
                                                                                       │
 spec (data) ─▶ FACE: spec loader ─▶ words + layout rules ◀── props ◀── JS: view (pure) ◀┘
                         │
                     FACE: primitives ─▶ LVGL ─▶ framebuffer ─▶ page canvas (sandbox) | DRM (Pi)
 edges (JS): storage · Caddy client · placeholder register · developer tools · asset manifest and producers
```

| Module | Holds | Never |
| --- | --- | --- |
| **Rules and state** (`state.mjs` and the Station's other rule modules; the Companion's `rules/` after its split) | The save's part and every rule as a pure function; returns new state and presentation events | Draws, reads keys, touches storage |
| **Views** (`views/<screen>.mjs`) | Pure selectors from state and focus to a screen's props: what each region shows, and the focus targets by id | Coordinates, geometry |
| **Intent tables** (`intents/<screen>.mjs`) | The face's `{ target, verb }` to one rule call; arm-then-confirm; the screen's UI state | DOM, canvas or drawing imports |
| **Screen specs** (`prototypes/ui/specs/<device>/<screen>.json`, with `<screen>.props.json`) | Regions with their word or composition, the focus graph, strings, the spec's limits, the props schema | Logic |
| **Timeline** (`ui/timeline.mjs`) | Which event plays and whether input is held; sends `event` messages | Positions or in-between states |
| **The face** (`prototypes/face/src/`, C) | Platform, bridge, primitives, the vocabulary's words, the layout rules, the screens' binding tables, focus and animation (lvgl-switch.md §2.2) | Reads the save, calls a rule, decides content |
| **Edges** | `storage` (the save adapter: `localStorage` in the sandbox, a file written by the Node host on the Pi, flash on the ESP32), `caddy` client, `art` placeholder register, `dev` tools, the asset manifest and the asset producers | Mix with each other |

**Deprecated and frozen** (lvgl-switch.md §5): the JavaScript layout (`ui/layout.mjs`), components (`ui/components/`), scene (`ui/scene.mjs`), the layered canvas renderer (`ui/render/station-canvas.mjs`), the atlas type (`ui/type.mjs`) and the drawing half of `station/src/gfx.mjs`. The freeze check fails on any change to them and on any new import of them; each is deleted when its last screen moves to the face, and all by L3. They are not the architecture a build follows. `ui/focus.mjs` is kept until L3 only as the JavaScript run of the focus vectors.

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

The other contracts (the wire format and every message are lvgl-switch.md §2.1):

- **View:** `view(state, focus) → props`, for example `{ pod: { asset, sealed }, rail: { chapters: [{ id, read, glint, sealed }] }, line: { ok, price, back, subject, need } }`. Props name what, never where. Pure, tested in Node against the screen's props schema, and sent to the face as a `props` message.
- **Intent:** a key goes through the face's focus graph, which gives either a focus move (a `focus` message) or `{ target, verb }` (an `intent` message). The screen's intent table maps it to one rule call, which returns `{ st, events }`.
- **Event:** `{ kind: "wipe", target: "page", ms: 2000, hold: true }`. The JavaScript timeline decides that it plays and holds input; the face plays it. No global timestamps.
- **Primitive:** the face's closed set (rect, text, sprite, nine-slice, clip, composed picture), each carrying its layer and the region that drew it. Colours are palette names, except on the painted and type layers. Fonts are LVGL fonts baked from the bundled file (`inter-16`, `inter-20`, `inter-28`; Mibi 7×9 when the Companion comes), never a CSS font string.
- **Asset:** `{ id, file, w, h, policy: palette48 | stationChrome | painted | gray4 | print1, status: placeholder | master, until, hash }`. Files are PNG: indexed for the palette policies, 32-bit with straight alpha for `painted`. `bake-images.mjs` converts them to LVGL's binary images (lvgl-switch.md §2.4).

### 5.3 How the layout spec becomes code

The numbers get **one home**: the spec file. The UI designer keeps writing the reasoning in `station-layouts.md`. Its tables and the wireframes in `station-layouts/` are generated from the spec files, so the document and the build can't disagree. A builder never retypes a rectangle. CI compares every drawn region's box in the face's region log with its spec, or with `ui/specs/derive.mjs` for a derived one (lvgl-switch.md §2.8).

<img src="../style-guide/station-layouts/02b-pods-overview.png" width="1024" alt="Pods overview wireframe">

*Pods, pod overview. Wireframe, layout only, measured; shown at 1×. Today drawn by hand from the same numbers as the tables; under this proposal, generated from the spec file the screen draws from.*

### 5.4 How a builder adds a screen

A screen is built on the LVGL face, never on the JavaScript drawing layer (§5.1). The face's side is lvgl-switch.md §2; the gate it passes is lvgl-switch.md §4.

1. **The spec lands one milestone ahead** (lvgl-switch.md §3). The UI designer delivers the layout section and the spec file, `prototypes/ui/specs/station/<screen>.json`, following the screen design method: every drawn region names its word (`component`) or composition (`build`), and the file carries the focus graph and the strings. A screen without its spec file waits. It is never built from the old screen's numbers.
2. **The view, as props.** The builder writes `views/<screen>.mjs`: state and focus to props, naming what each region shows (strings, states, counts, asset ids, flags, and the focus targets by id with their enabled flags), never where. Its schema is `<screen>.props.json` beside the spec file, and its Node tests assert props only.
3. **The intent table.** The builder writes `intents/<screen>.mjs`: each `{ target group, verb }` from the face to one rule call, with arm-then-confirm and the screen's UI state. Anything new in the rules lands in its rule module with tests. The view and the intent table import no DOM, canvas or `gfx.mjs`, so they run in the Node host as well as the page.
4. **The C words.** The face binds the spec's regions to words of the closed vocabulary in the screen's binding table (`prototypes/face/src/screens/`); a derived rect comes from a rule in `layout/`. A new word, composition or layout rule goes to the UI designer and the architect first.
5. **Focus is spec data.** The graph per state lives in the spec file, with the edge forms of lvgl-switch.md §2.6.1 (names, selectors, `nearestIn`, ordered lists, `order`, `axis`). The view supplies only `focus.targets`, `focus.resolve` and `focus.set`. No target rectangles and no focus order in JavaScript.
6. **Assets.** Every asset is registered in the manifest at its size, with placeholders flagged; masters are baked to LVGL images; nothing is scaled.
7. **The gate.** The journey gains the screen's steps on the face; regions, pixels, palette, type, goldens, budgets and reduced motion pass (lvgl-switch.md §4); the sign-off is filled in; the docs the screen touches show the current state.

### 5.5 Art placed 1:1 and registered

A sprite node names an asset id. Its slot's size must equal the asset's size, and the renderer refuses anything else: in development it shows a visible error, and in CI it counts it. Nothing can be drawn small and enlarged. A master replaces its placeholder by taking the same id and size, and the register counts the placeholders left per screen. Close-ups are rendered at their size by the rig's camera (the layout spec's rule), not cropped.

### 5.6 Tests that measure the sign-off

The sign-off's measured checks are approved. The face's test mode makes them exact, with no monkey-patching (lvgl-switch.md §2.8 holds the full list, with the goldens and the freeze):

| Sign-off check | Measured from |
| --- | --- |
| Screen size | The face's frame size, asserted |
| Palette | The chrome and chrome-with-art passes have 0 pixels off palette on every screen; the Companion and Caddy have 0 by construction |
| Type | The text word's log: every Station string in Inter at 16, 20 or 28 px from the baked fonts; the Companion's in Mibi 7×9 at 2× or 3× |
| Grain (G2) | Journey screenshots, as specified |
| Rail chapters, digits, stamp, placeholders | The face's logs: tab count against the frame; no digits in text on regions marked `noDigits`; stamp label at 120 or less and 96 px or more from the focal box; every sprite resolves in the manifest |
| Regions against the spec | The face's region log against the spec file. **Decided** (owner, 2026-10-08, decision 2) |

### 5.7 Conformance review checklist (for every build)

- [ ] No rule outside the rule modules (or the Companion's `rules/`); rules are pure and tested.
- [ ] No coordinates in screen code; every region comes from its spec file; no geometry in JavaScript outside `ui/specs/derive.mjs`.
- [ ] Only the vocabulary's C words; any new word, composition or layout rule approved by the UI designer and the architect.
- [ ] Nothing drawn by, changed in, or newly importing the deprecated JavaScript drawing layer (the freeze check green).
- [ ] The view and the intent table DOM-free and running in the Node host.
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
| **T1 Screen layer and Pods** | Built: `prototypes/ui/` with Pods from its spec, Inter bundled, Google Fonts removed. Its drawing modules are deprecated and frozen (§5.1) | Its spec files, timeline, manifest and checks carry to the face |
| **L2.0 to L2.5, then L3** | Every Station screen on the LVGL face, in lvgl-switch.md §3's order: L2.0 the platform and Pods on C words; L2.1 the Library, Book and field guide; L2.2 Home, Rest, Dock and arrival, Idle; L2.3 Cross; L2.4 Create and the Incubator; L2.5 Habitat and the Probe bench. L3 deletes the JavaScript drawing layer | **Replace T2 and M5 on the JavaScript layer.** Each milestone passes the gate of lvgl-switch.md §4 |
| **M6 Sitting and the whole journey** | As planned, on the face; the Sitting's first screen at L2.5, or built straight on the face when its spec lands | Unchanged in scope |
| **C1 Companion split** | The inline script into modules (rules, world, state, renderer, screens) with no visible change | Independent of the Station |
| **C2 Companion on the face** | HUD 32, view 532, line 36; Mibi 7×9; the map viewport for 48 px tiles, with the art redraw; the `common/` words under the Companion's profile, with its indexed world view inside (lvgl-switch.md §2.2) | Lands with the 48 px redraw |
| **H0 Host-build proof** | The native builds of the face: headless, SDL and aarch64 under qemu-user, with framebuffer hashes equal to WebAssembly's (lvgl-switch.md §2.9) | Part of L2.0. No hardware (**Decided:** none until the loop is complete in software) |
| **P1 Port** | The **Station** (S1: the face's DRM platform on the Pi, the Node host, the image cache, the save file, GPIO keys), then the Companion and the Caddy firmware from the C words, specs, assets and test vectors | **After the loop is stable** (owner's order). Hardware work starts here |

**The Station at the port.** The Station's screens are built once, on the LVGL face in the sandbox (L2.0 to L3), and the same C runs on the Pi. P1 adds no Station screen: only the platform layer (DRM display, keys), the Node host over the socket, the image cache and the save file. Against S2, it avoids porting the genome, rig, stamp, cross and Caddy client and keeping them twice. The face is built once for three devices.

**What keeps the port cheap** is the face's own rules (lvgl-switch.md §2.2 to §2.5): a closed primitive set in `prim/`, the only code that creates LVGL objects (no paths, gradients, shadows, filters, transforms or opacity on chrome and art; painted light is an asset); fonts baked by `lv_font_conv` from the bundled file; PNG masters, indexed or 32-bit with straight alpha, baked to LVGL images at their pixel size; rig renders through the asset cache by id, never called by a word; and views, intent tables and events as plain JSON that run in Node.

| Risk | Mitigation |
| --- | --- |
| The face's vocabulary grows into a framework project | Its vocabulary is closed (station-layouts.md); rectangles are absolute from the spec; layout rules are a closed list; no general layout engine |
| Spec files and the document drift apart | One home for the numbers; tables and wireframes generated from it |
| Node's memory or the rig's speed on the Pi 4 proves too much | Rig work is background and cached by genome hash; the seam lets S2 replace the logic process without touching the face; measured when hardware work starts (lvgl-switch.md §2.10) |
| Inter from LVGL's fonts reads differently from the browser's | The sandbox draws with LVGL's fonts, so the owner judges the type the device will draw |
| The device port differs from the sandbox's pixels | The same C face on both; golden framebuffer hashes equal on WebAssembly, native x86-64 and aarch64 |
| Splitting the Companion breaks the playable page | C1 makes no visible change; the smoke and parse checks stay |
| The Station palette is unsettled (69 in code, 96 in the UI kit, painted art on top) | The renderer takes the palette as data; the UI designer and the art director fix it; the check follows |

## 7. Decisions

**Decided** (owner, 2026-10-08): all three as recommended. Decision 2's screen layer is deprecated and frozen (owner, 2026-10-09 11:27): the sandbox draws the Station through the LVGL face (§8, lvgl-switch.md), and the regions check stands, measured on the face.

1. **The Station's runtime. Decided 2026-10-08: S1.** The face is LVGL 9 in C on the Pi's display, the same component library as the Companion and the Caddy, with painted art and anti-aliased Inter from baked atlases. The logic (rules, genome, rig, stamp, Caddy client, the save) is the sandbox's own JavaScript, run headless by Node beside it as a service, with no browser. *Recommended: yes, with the logic ported to C as the fallback.* It fits well within a Pi 4 of 2 GB or less (under 300 MB resident, a few per cent of CPU at rest). It gives three devices one face. It keeps the genome model in one language, imported, never copied. The Station's screens are built once, on the face in the sandbox (§6); the fallback adds a second genome model to maintain.
2. **The sandbox gets its own small, declarative screen layer now** (screen specs as data, a component library, a retained scene, a focus model), built as T1, with the regions check added to CI. **Decided** 2026-10-08. Its spec files, the regions check and the separation of concerns stand. Its JavaScript drawing (components, layout, scene, renderer) is deprecated and frozen (owner, 2026-10-09 11:27): the Station's components are the face's C words, and the rules stay JavaScript behind the bridge, so nothing is copied.
3. **The Companion and Caddy port to native C on ESP-IDF with LVGL 9** for chrome and our own indexed renderer for the world view, started only when the loop is stable. *Recommended: yes, with Slint as the fallback.* LVGL is MIT-licensed and proven on the S3. The palette model is the sandbox's own. Slint on embedded is GPLv3 or paid, and younger on the S3.

**Overall.** The sandbox page is where the game is defined: rules, views, intent tables, spec files and assets in JavaScript and data. Its Station face is the device's own: LVGL 9 in C, compiled to WebAssembly, driven through props in and intents out. On the Pi the same face runs natively beside the same JavaScript logic under Node, with no browser. Once the loop holds, the Companion and the Caddy port to the same C words, carrying specs, assets, fonts, palettes, the save and test vectors as data. The port is a platform layer and a host, checked by golden framebuffers, not a rewrite, and it fits the hardware we have.

## 8. Assessment: the real LVGL face in the sandbox now

**Decided** (owner, 2026-10-08): switch now (§8.5). The build plan is [lvgl-switch.md](lvgl-switch.md), which governs where the two differ. This section is the assessment, made at the owner's question "are you even considering the LVGL framework? can we draw that?". **Decided:** the Station's device face is LVGL 9 in C (S1), and the Companion and the Caddy port to LVGL 9. The question was only *when* the sandbox starts drawing through that same face. Can we? Yes. LVGL compiles to WebAssembly with Emscripten and draws through its SDL driver, or through a small display driver that copies dirty rectangles onto the page's canvas. The existing JavaScript logic drives it through the props-in, intents-out contract of §5.2.

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

| | The JavaScript layer (T1) | LVGL face in the sandbox |
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
| Screens built twice | Closed by decision (owner, 2026-10-09 11:27): no new screen or screen feature is built on the JavaScript drawing layer, and the freeze check enforces it (lvgl-switch.md §5.1), so every Station screen is built once, in C |
| Slower iteration while art and layouts still move | Limited: rules, views and spec numbers stay hot-reloadable; only new or changed components compile |

### 8.4 Migration, with Pods working throughout

| | Ships | Status |
| --- | --- | --- |
| **L0 Toolchain** | Emscripten in CI; the face as a 1024×600 LVGL display in the Station page behind `?face=lvgl`; the native Linux build; size and phone checks | Built |
| **L1 The frame in LVGL** | Top bar, bottom line, message plate, focus ring, panel from `frame.json`; fonts from the converter | Built |
| **L2 Pods to parity** | Pods drawn by the face, at pixel parity with the JavaScript capture | Built (ee1be339) |
| **L2.0 to L2.5, then L3** | Every screen on C words behind the bridge, in lvgl-switch.md §3's order, each through the gate of §4; L3 deletes the JavaScript drawing layer. They replace T2 and M5 on the JavaScript layer | [lvgl-switch.md](lvgl-switch.md) §3 and §4 |
| **L2.0 (in progress)** | The bridge, the spec loader, the primitives, the focus port, the frame's and Pods' words and layout rules, the face-composed focus ring, the animation events, the metrics table and the image baker are built and tested on the WebAssembly face (branch `l20-pods`); the SDL and DRM builds, the Node host, the goldens and Pods' switch remain | [lvgl-switch.md](lvgl-switch.md) §4 L2.0 |

The day estimates are withdrawn: L0 to L2 took about five hours against the 11 to 15 days estimated (lvgl-switch.md §4). Milestones are sized relative to L2.

### 8.5 Decision

**Decided** (owner, 2026-10-08): the sandbox's Station face switches to LVGL now, before more screens are built on the JavaScript layer. **Decided** (owner, 2026-10-09 11:27): "deprecate the javascript layer"; no new screen or screen feature is built on it, and the remaining screens move to the face (L2 for every screen, then L3).

- The device face is LVGL, so no Station screen is built twice.
- What the owner judges in the sandbox is exactly what the Pi will draw.
- The loop's speed is kept where it matters: rules, views and spec numbers stay in JavaScript and data.

The Companion follows on the same C words at C2, keeping its indexed world view.
