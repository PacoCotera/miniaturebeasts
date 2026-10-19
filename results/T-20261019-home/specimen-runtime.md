# Home H4: the specimen generator's runtime (architect ruling; build-spec §4.2 at 32fb0179)

## Ruling: port its drawing calls to a small pure-JavaScript canvas subset in the logic process. No canvas library, no Chromium.

| Option | Verdict | Why |
| --- | --- | --- |
| node-canvas, skia-canvas | No | Native addons (Cairo, Skia) built per platform. The public build has no npm dependencies at all, and the Pi image would have to build or fetch them. Their anti-aliasing can change with the library version and the CPU, so the same looks could give different bytes on x86 CI and the aarch64 Pi, which breaks the digest cache and the goldens |
| Headless Chromium (Playwright) | No | The Station runs no browser on the device (decided, design/devices.md and design/proposals/technical-architecture.md §4.3). Chromium stays a test tool |
| **A port to a pure-JS canvas subset** | **Yes** | Dependency-free and the same bytes everywhere, as `workbench/framework/raster.mjs` and `station/src/derive.mjs` already are. It runs unchanged in Node on the Pi, in CI and in the sandbox page |

## Where it sits
- **`prototypes/station/src/specimen.mjs`:** the generator, ported from `art/specimen3.js` with its logic and parameters unchanged. It is a logic-process module beside `layered-stand.mjs`, imported by `pictures.mjs` through a new `specimen` request kind. It returns `{ rgba: 344×362 painted RGB (alpha 255, not snapped to the palette), beads: [{x, y}], levels: [4 brightness levels] }`.
- **`prototypes/station/src/paint2d.mjs`:** the canvas subset. It is a `Float32Array` RGBA surface with exactly the Canvas 2D calls `specimen3.js` uses, and no more. The builder lists them first, from the source. Expected:
  - fillRect, and paths (moveTo, lineTo, bezierCurveTo, arc, ellipse, closePath) filled by even-odd or non-zero scanline coverage;
  - linear and radial gradients;
  - globalAlpha and source-over;
  - save, restore and setTransform.
  - Anti-aliasing is by fixed 4×4 supersampling, with integer weights. If the source uses `filter`, `shadowBlur` or text, the builder reports it before porting: blur is the separable Gaussian with integer weights of specs/face-arc-and-shadow.md §2, and text must not be drawn into a painting at all.
- **Output to the face:** a painted-layer picture through the picture table, cached by id `specimen:{species}:{digest of the found looks, sorted}:v{recipe}`, and re-rendered only when a look is found (the id changes). The beads and levels ride in the request's props as plain numbers. Bump `v{recipe}` whenever `specimen.mjs` changes what it draws.
- **Time:** the build test prints the render time on the development machine. Budget: ≤ 1 s there, off the face's frame (the discovery's own reveal covers it). The Pi figure is measured at P1.

## Fidelity check (tests)
- **Oracle:** the original `art/specimen3.js` run in Playwright's Chromium in CI only, on three fixture species × two found-look sets. The port must match it to a mean absolute difference ≤ 2 and a maximum ≤ 24 a channel (browser anti-aliasing differs from 4×4 supersampling), with every bead centre equal. The port's own bytes are the golden.
- Two calls with the same looks give identical bytes, and a different look set gives a different id.
- Run on the device's logic process: the same test runs under plain Node, with no browser.
