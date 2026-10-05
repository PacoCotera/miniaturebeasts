# Gemini Overview destination family

Four persistent destination symbols for the existing native Lab Overview. Gemini
authored the family together, then corrected structural materials against the
selected hardware reference. Preparation preserves that artwork. The active
source is `gemini-family-hardware-materials.png`, paired with
`hardware-materials-prompt.txt`; both are retained unchanged. These metaphors identify destinations;
nearby game text supplies current activity, sample and resident facts.

## Prepared usage assets

Use the prepared Explore, Research and Habitat exports. The current incubator
export remains implemented but has unclear incubation meaning and remains a provisional source treatment. Its original is preserved; the replacement Gemini state
study needs a clear native-size treatment before replacing it. Developing and ready remain
concealed until deliberate Open.
Each is 136×144 and must be drawn 1:1. The compass has a deliberately smaller
painted footprint to balance its broad compass face against the narrower subjects.
The [native sheet](exports/sheet-native.png) and [3× diagnostic](exports/sheet-3x.png)
show the exact handoff files.

**These assets are opaque.** The source PNG has four channels, but every alpha
byte is 255. Its dominant backing is RGB(42,51,56), `#2a3338`; small original
background variations are retained. Draw on a matching `#2a3338` region and
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
The [empty](native-proof/final-empty.png) and [populated](native-proof/final-populated.png)
proofs are actual 1024x600 C17 Linux host renders from pushed source
`492b90f9dd3d74286c282e3d0696bf1dc0d75c2e`. All four asset regions in both
frames match these exports pixel for pixel. Recorded native input/frame checks and target builds passed for that source. These images demonstrate host rendering,
not physical Pi/display performance or approval of other screens.

## Preserved first version

`versions/brass-v1/` preserves the superseded brass source, prompt, preparation
recipe, manifest and derived PNGs. `snapshot.json` hashes the original snapshot
files. It is provenance, not a competing active family. The archived recipe
retains its original relative runtime/font paths; reproduce it in the original
workbench context if needed. Root-level first-source files also remain untouched.
