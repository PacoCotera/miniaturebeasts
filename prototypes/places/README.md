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

All four places (Windstep, the Hollow Tree, the Split Stone and Reedpool, since walk content B9) are 24 x 28 and in the open style: no ring of trees, every side runs on into the next cell, an edge closes only where the land has a reason (a cliff, deep water, a thicket) and reads as that thing. The four levels are committed LDtk files (`art/places/ldtk/places/`); the tools that wrote them (`make-*-open.mjs`, `open-level-lib.mjs`) are gone: generator 7 (`prototypes/exploration/src/gen7/decor.mjs`) lays props and the desk's meadow-decor density from world positions, and the bake rules `seam-ground` and `path-short` below are kept only until G4 swaps the page to generator 7. Every level: 8 find slots (a pod, an Essence source and a stone certain, the rest at one in two: a place averages 5.5 finds), three spawn areas (two open to any kind, one by the heart for the moment's species), the heart on its own 3 x 3 clearing of worn earth (on sand for the Split Stone and Reedpool: darker earth, not more sand) 14 or more cells from every opening, no prop within 2 of it but the landmark. The Hollow Tree: groves of broad and autumn trees, a dense thicket in the east, low scrub in the west, the great hollow tree (the kit's, no larger one is signed yet), a road from the south and a footpath from the west. The Split Stone: sun-baked sand flats among the grass with clumps of grey and brown boulders, two trees in the north, a thicket in the south-east, the split stone on its earth clearing and two trodden trails. Reedpool: a pond in the north with a deep pool, a reed bank, a sand shore and an island with the island stone, a sand spit from the west shore, groves west and south, a thicket in the west.

Groves, not an orchard (the lead's look at the Hollow Tree's whole view): the trees and boulders of a place stand in clumps of 3-5 that touch, with open glades between and a few on their own, never an even lattice, rows or a ring. The bake rule `grove-lattice` (`rules.mjs`, `GROVE`) measures the nearest-neighbour spacing of the standing things in a level with 12 or more: at least 40% have a neighbour within 2.3 cells, the spacing varies by at least 0.35 (coefficient of variation) and at least 2 stand alone (4 cells from any other). It fails on the Hollow Tree's old layout and on a ring of stones (`tests/groves-closed.test.mjs`).

Closed looks (walk content B8): every opening of a place in the open style carries a closed look, the set's dense thicket stamped over its span (and one cell either side), two rows deep (`adapter.mjs` `closedLooks`, `CLOSED_DEPTH`); the bake rule `closed-look` holds that every open-style level has a 3 x 3 block of thicket to stamp from (`openedges.thicketDonor`). The page passes `o.closed` (the sides the land refuses: `closedSidesOf` in the exploration page); the adapter then draws that side's look as ground patches, blocks its cells, drops the opening from `lay.openings` and never arrives there. The world's own bands (water, a cliff's lip, the map's thicket) still close the sides they draw. A thicket in every land is a stand-in: each land's own closed look is listed for the art desk.

- The art desk's pieces (`art/places/sets/ninja-test/DESK.json` lists each file with its sha256 and signed commit; `tools/desk-art.mjs`, run by `prepare-set` when the recipe says `desk`): the cliff, thicket, scrub and deep-water pairs, the cliff's tall sheets (`tall`), the way-up piece (`wayup`), the scrub variants (`variants`), the reed bank look (`looks`), and the small meadow flowers and tufts. The tile set lists these as extra pairs after the main ones (`setload.extraEntries`); no format change.
- Terrain layers (`set.json` `layers` and `tone`; `src/dualgrid.mjs` `terrainLayers` and `packDepth`; `setload` `fillTiles`, `layerTiles`, `layerDescriptors`, `layerRows`): one fill per terrain plus one transparent 16-slot sheet per over kind, drawn in terrain.json z order; the kind is picked by the lower terrain (`lowers`, first kind listed wins), a `drawAs` terrain is drawn as another until its own layers are signed. They sit beside `pairs`, which the bake still reads, until the pair path is removed. Fills are slot 15 of a signed sheet (DESK.json `from: <sheet>#15`) or the desk's own strip; the reed look of the sand beach is the signed reed pixels over transparency. Thicket and cliff layers are not in the set yet (soft shade pixels, see the report of terrain-layers-a).
- Bake: `src/bake/openedges.mjs` picks each cliff tile by its corners plus the two cells under its bottom corners (s), the way-up pieces over a WayUp area, the reed look inside a ReedBank area, a scrub variant by hash; the cliff's lip and face block (the baked `blockMask`; the adapter blocks them), its top and the way up walk. LDtk: terrains cliff, thicket, scrub; entities WayUp and ReedBank.
- Rules (open style only): `cliff-foot` (no 1-row gully), `wayup`, `two-thirds-open` (every side walkable on at least two thirds), `seam-ground` and `path-short` (the last 2 rows and columns are grass, nothing on them), `heart-far` (10 from every arrival), `heart-clear` (no prop within 2 of the heart), `closed-look` (a 3 x 3 block of thicket to stamp the openings' closed looks from), `grove-lattice` (groves, not an even lattice); up to 8 finds.
- The palette keeps the slots the range haze is keyed to (the kit's 43, then the open edges' 7); the decor's colours follow, and the haze ramp moves up after the set's palette (`hazeKit(..., setLen)`).
- The adapter closes a side the world closes (the map's end: a thicket stamped over the two outer rows; a cliff: the rows behind its lip), blocked; `tools/views-audit.mjs` holds every open-style side to it.

## Generated places (world generation, G2)

The bake also takes the IR of a generated place (`prototypes/exploration/src/gen7/place.mjs`): `buildPlace` is the same call. An IR may carry `origin` (the world tile of its first tile), `groundMix` and no heart.
- With `origin`, the full-tile variants, the scrub variants and the reed look are picked by `hash32('', world x, world y)` instead of the place id, so a tile is the same in every place that shows it. IR without `origin` (the LDtk places) keeps the place-id hash.
- `groundMix` (`src/bake/groundmix.mjs`): 0, 1 or 2 per dual tile, from a noise field at world position. Every full grass tile of the baked place (grass's full tiles, grass as a lower side, the raised top's fill) takes the plain ground or one of the set's two swirl variants by it, so the ground forms patches of a few tiles. Only tile ids change.
- The cliff-grass pair is the art desk's second cliff job (mibi-art 4315b9d25: rounded corners, east and west walls, north lip, tall sheets), listed in `DESK.json` and pinned in `tools/desk-art.mjs`.
- The ground pixels of the grass-lower pieces (the flat fill and the plain lower grass of the cliff, thicket and scrub pieces) still carry their own fill, not the textured meadow's pixels (the set change of round 4 is not made in the set yet); only full tiles are patched.

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
