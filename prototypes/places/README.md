# Places: the foundation

LDtk levels, the dual grid, tile sets, the baked FlatBuffers format and the indexed renderer, for the walk's 18 × 22 tile places. The design is in `iwq/results/T-20261107-place-foundation/arch.md` (A§n below); the build order is `chunks.md`. Built so far (lane A, C1 to C4): the pins, the tile-set contract with the CC0 test kit, the dual grid with the seam proofs, and the baked format.

| Path | What |
| --- | --- |
| `VERSIONS.md` | Every pin: LDtk 1.5.3 (vendored schema, sha256), flatc 25.9.23 and how CI installs it, the npm tools (exact, in `package-lock.json`). |
| `vendor/` | The LDtk JSON schema. |
| `src/dualgrid.mjs` | A§2: corner index, layers, clamp, full-tile variants by hash, the refusals (three terrains at an opaque corner, a pair the set lacks, a terrain it cannot draw, a region with two looks). |
| `src/blit.mjs` | The indexed blitter: tiles and RLE sprites into a `Uint8Array`, clipped, index 0 transparent, optional remap. |
| `src/seams.mjs`, `tests/seams.test.mjs` | A§5: edge signatures per pair, the all-cases map (`src/allcases.json`, found by `tools/find-allcases.mjs`). |
| `src/format/place.fbs`, `src/format/gen/place.mjs` | A§1.5: the schema and the reader/writer generated from it (`tools/gen-format.mjs`; the test regenerates and compares). `write.mjs` and `read.mjs` are the plain-object helpers. |
| `src/format/set.schema.json`, `src/setload.mjs` | A§3: the tile-set contract (`set.json`) and its loader. |
| `src/bakeset.mjs` | A loaded set to the `.mbtiles` object; the 24 px derivation. |
| `tools/prepare-set.mjs` | A§3.3: a licensed kit and a recipe to a set. Recipe: `art/places/sets/<id>/recipe.json`. |
| `golden/seams/` | The seam goldens: `<set>-<pair>-sheet-48.png` (the 16 tiles in corner order), `<set>-<pair>-48.png` (the all-cases map). Compared by decoded pixels; `MB_UPDATE_GOLDENS=1` rewrites them on purpose, and a human looks at every changed one. |

## Run

```
npm ci --prefix prototypes/places
node --test prototypes/places/tests/*.test.mjs
```

`format.test.mjs` regenerates the reader with flatc: put the pinned flatc on `PATH` or in `MB_FLATC` (`sh tools/get-flatc.sh <dir>` downloads and checks it); without it that one test skips locally and fails in CI. `set-contract.test.mjs` regenerates the test set from the kit when the kit is at `research/tilesets` (or `MB_TILESETS`) and skips otherwise.

## Adding a tile set

1. Put the source under `research/tilesets/<kit>/` with its licence and `SOURCE.md` (the kit must be on the allow-list in `prepare-set.mjs`).
2. Write `art/places/sets/<id>/recipe.json` (copy `ninja-test`'s).
3. `node prototypes/places/tools/prepare-set.mjs art/places/sets/<id>/recipe.json --tilesets research/tilesets`
4. `MB_UPDATE_GOLDENS=1 node --test prototypes/places/tests/set-contract.test.mjs prototypes/places/tests/seams.test.mjs`, then look at every new golden at 1×. A seam failure is fixed in the recipe or the art, never allow-listed.
