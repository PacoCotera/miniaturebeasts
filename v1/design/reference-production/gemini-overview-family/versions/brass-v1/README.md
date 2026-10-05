# Gemini Overview destination family

Four persistent destination symbols for the existing native Lab Overview. Gemini
authored the family together; preparation preserves that artwork. The original
PNG and prompt are retained unchanged. These metaphors identify destinations;
nearby game text supplies current activity, sample and resident facts.

## Native handoff

Use `exports/explore.png`, `research.png`, `incubator.png` and `habitat.png`.
Each is 136×144 and must be drawn 1:1. The compass has a deliberately smaller
painted footprint to balance its broad gold disk against the narrower subjects.
The [native sheet](exports/sheet-native.png) and [3× diagnostic](exports/sheet-3x.png)
show the exact handoff files.

**These assets are opaque.** The source PNG has four channels, but every alpha
byte is 255. Its dominant backing is RGB(40,51,57), `#283339`; small original
background variations are retained. Draw on a matching `#283339` region and
copy the prepared opaque pixels directly. Do not apply the legacy corner-color
`sprite_matte` path or claim transparent sprite edges. Direct-crop inspection
found the backing visually clean at the intended size.

`manifest.json` records source/export hashes, source crop coordinates, reduced
dimensions, padding and measured contrast bounds. Contrast bounds are descriptive
measurements, not a transparency mask. The native slot center is 68,72; preserve
the provided padding when placing the family together.

## Reproduction and preparation limits

With the existing Node.js/Sharp runtime, run:

```sh
node prepare.cjs
```

The recipe performs explicit crops, aspect-preserving Lanczos3 reduction and
opaque padding. It does not redraw, recolor, sharpen, color-key or flood-matte
the artwork. Native comparison favored Lanczos3 over nearest-neighbor reduction
because the compass shading and microscope's fine parts remained more coherent.
The 3× sheet uses nearest-neighbor enlargement only for inspection.

The source is a 1024×1024 Gemini image acquired with Copy image, not a screenshot
of the browser. Source art remains distinct from these reduced usage assets.
This preparation does not establish native-screen acceptance; the reviewer must
inspect the actual empty and populated Overview rendered by the application.
