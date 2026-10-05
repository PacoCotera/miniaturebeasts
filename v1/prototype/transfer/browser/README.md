# Transfer pixel browser study

Run `npm start`, then open `/transfer/` on the local prototype server. This separate study displays authored lab-only observations using the reviewed presentation adapter. It adds no API, persistence, live transfer, sample opening or staging delivery. The surrounding prototype server still has its existing unrelated writable APIs.

The device image is a native 640 × 480 indexed bitmap. All player text, controls and caller navigation are drawn with authored 5 × 7 glyphs enlarged exactly 2×. The transfer-local lowercase/punctuation supplement preserves mixed-case 64-character IDs. Unsupported glyphs use a visible box; authored fixture overflow/missing glyphs fail tests. The CSS never shrinks the native screen. Color-8 and binary Mono-1 use identical geometry and shape-based focus/status cues.

Fixture choices, read/render delays and read-loss controls are explicitly outside the device. Each scenario starts a new presentation instance; palette changes retain state. Global monotonically increasing frame IDs and one replaceable draw timer guard both drawing and readiness. Host readiness is two animation callbacks after drawing, optionally delayed; it is not panel timing. A separate pure gate consumes whole keyboard/pointer gestures. Back can escape a pending frame; other blocked input is discarded. Caller reentry occupies the middle physical slot (key 2).

## Commands and files

```text
node prototype/transfer/browser/generate.mjs
node --test prototype/tests/transfer-browser.test.mjs
node prototype/transfer/browser/browser-check.mjs <installed-playwright-directory>
```

`generate.mjs` uses existing domain transitions and host projection to produce `observations.json`; browser imports remain pure. The explicit server map excludes the generator, browser harness, Node domain/projection/storage modules and artifacts. `font.mjs` and `render.mjs` compose pixels; `input.mjs` handles physical gesture state; `host.mjs` connects the canvas, fixture controls and existing semantic controller.

Unit checks cover supplied states, glyph/layout bounds, input gates and served imports. The Chromium harness checks gestures, read/draw interruption and frame buffers, saving screenshots and a report. Install its optional dependencies as described in [builder setup](../../../docs/builders/getting-started.md).

One unpacked index plane costs 307,200 bytes in either palette. The host retains a displayed plane and at most one pending composition; RGBA upload adds 1,228,800 bytes and canvas/browser backing storage is additional. Mono pixels are not packed bits here. Glyphs are authored string rows, not a measured firmware font binary. Device RAM, refresh, readability and power need a separately selected hardware implementation and bench testing.
