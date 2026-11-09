# Places: the foundation

LDtk levels, the dual grid, tile sets, the baked FlatBuffers format and the indexed renderer, for the walk's 18 × 22 tile places. The design (A§n below) is the place-foundation architecture note kept with the work queue. Built so far (lane A, C1 to C4): the pins, the tile-set contract with the CC0 test kit, the dual grid with the seam proofs, and the baked format.

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
| `src/bake/` | A§1.4, the bake: `ldtk.mjs` (load, schema, definitions check, level to IR), `rules.mjs` (the level rules, each named), `mirror.mjs`, `build.mjs` (IR to place, the plain golden render), `bake.mjs` (all outputs in memory, write, check). |
| `src/ground.mjs`, `src/sprites.mjs`, `src/camera.mjs` | A§4, the renderer core: pass 1 ground (`renderGround`, the shared animation clock, `GroundCache`), pass 2 light and veil on 12 px blocks (`applyLight`: veil, fog bank, clear light level per cell, the 6 px storm step), pass 3 the sorted sprites (props take the remap of their anchor cell), pass 4 the canopy with the 22 px Bayer cut-out round the pawns, `renderView` (all four for a window), `renderHalfView` (432 x 528, no camera), `applyCycles` (palette cycling); the camera (half-screen steps: fixed rests no more than half a view apart, a move to the next rest when under 72 px of ground would show beyond the explorer's tile, a 280 ms ease-out slide, reduced motion cuts, the end rests are the clamp; the look-ahead and the pull to the tell are retired). Pure and integer; `eighthGrid`, `coverE`, `stormStep`, `BAYER4` are imported from `exploration/src/view.mjs`. |
| `src/adapter.mjs`, `src/page.mjs` | C7, into the page: `adaptPlace` (a baked place to the exploration page's `lay`, centred in its 28 x 32 grid until places of two sizes land) and `BakedView` (the page's side: ground and light to an `ImageData`, props and canopy as cached canvases, the camera). `PlaceGroundCache` keeps the whole place's ground once per animation frame. See `prototypes/exploration/README.md`, "Baked places". |
| `golden/render/` | The renderer's goldens (node, indexed blitter, palette from the meadow core plus the set): three camera spots (a centred clamp, no look-ahead), the veil's lifted disc, the storm edge, the canopy cut-out, water at frames 0 and 2, the half-scale view. |
| `tools/bake.mjs` | `node tools/bake.mjs` writes `baked/` and `golden/places/`; `--check` rebakes in memory and compares (CI); `--place <id>` bakes one place and its mirror. |
| `../../art/places/ldtk/` | The LDtk 1.5.3 project (`places.ldtk`) and one external level file per place (`places/*.ldtkl`). Edit in LDtk; the bake reads the files. |
| `baked/` | `<set>.mbtiles`, `<place>[~x].mbplace`, `index.json` (sha256 of each blob). Committed; CI fails when it is stale. |
| `golden/places/` | `<place>[~x]-48.png` and `-24.png`, rendered by the blitter from the baked data. Compared by decoded pixels. |
| `golden/seams/` | The seam goldens: `<set>-<pair>-sheet-48.png` (the 16 tiles in corner order), `<set>-<pair>-48.png` (the all-cases map). Compared by decoded pixels; `MB_UPDATE_GOLDENS=1` rewrites them on purpose, and a human looks at every changed one. |

## Open edges and the open style (walk content B5)

A 24 x 28 place (Windstep) is in the open style: no ring of trees, every side runs on into the next cell, an edge closes only where the land has a reason (a cliff, deep water, a thicket) and reads as that thing. Today's 18 x 22 places keep their walls.

- The art desk's pieces (`art/places/sets/ninja-test/DESK.json` lists each file with its sha256 and signed commit; `tools/desk-art.mjs`, run by `prepare-set` when the recipe says `desk`): the cliff, thicket, scrub and deep-water pairs, the cliff's tall sheets (`tall`), the way-up piece (`wayup`), the scrub variants (`variants`), the reed bank look (`looks`), and the small meadow flowers and tufts. The tile set lists these as extra pairs after the main ones (`setload.extraEntries`); no format change.
- Bake: `src/bake/openedges.mjs` picks each cliff tile by its corners plus the two cells under its bottom corners (s), the way-up pieces over a WayUp area, the reed look inside a ReedBank area, a scrub variant by hash; the cliff's lip and face block (the baked `blockMask`; the adapter blocks them), its top and the way up walk. LDtk: terrains cliff, thicket, scrub; entities WayUp and ReedBank.
- Rules (open style only): `cliff-foot` (no 1-row gully), `wayup`, `two-thirds-open` (every side walkable on at least two thirds), `seam-ground` and `path-short` (the last 2 rows and columns are grass, nothing on them), `heart-far` (10 from every arrival), `heart-clear` (no prop within 2 of the heart); up to 8 finds.
- The palette keeps the slots the range haze is keyed to (the kit's 43, then the open edges' 7); the decor's colours follow, and the haze ramp moves up after the set's palette (`hazeKit(..., setLen)`).
- The adapter closes a side the world closes (the map's end: a thicket stamped over the two outer rows; a cliff: the rows behind its lip), blocked; `tools/views-audit.mjs` holds every open-style side to it.

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
