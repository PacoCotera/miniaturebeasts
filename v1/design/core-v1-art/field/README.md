# Native Companion field art

One bounded32px terrain/place family from an actual Gemini atlas. Original PNG,
exact submitted prompt and provenance are preserved in `source/`; unrelated brass
illustrations in its lower half are never exported. These are provisional native
derivatives, not an approved palette, creature family or claim of generated native
pixel masters.

The provider did not follow the requested128px source-slot/4× logical-pixel grid.
`crops.json` therefore records actual source rectangles and deliberately authored
silhouette masks. Ground/path crops use nearest32px derivatives. Objects preserve
aspect inside32×32; masks preserve the retained source RGB without a flood matte,
color key or painted reconstruction. Shrub/tree/boulder terrain descriptors
compose their source silhouettes on retained quiet grass so one opaque image per
cell suffices; five place descriptors keep alpha for sparse overlays.

Use the existing Node/Sharp runtime:

```sh
node design/core-v1-art/field/build.cjs
node native/selected-lab/convert-field-art.cjs
```

The build writes individual PNGs, measured hash manifest, native1×/3× contact
sheets, path-join/causeway proofs and a384×288 native viewport. The viewport's
route/place/player data comes only from the captured permitted field projection
in `source/permitted-route-proof.json`; its deterministic decorative terrain is
an art proof, not runtime world/save authority or a new procedural-map generator.
No hidden connector or Cache appears in that initial view.

The converter checks preserved-source, PNG and decoded-RGBA hashes and emits
`field_art.c/h` with29 immutable32×32 straight-RGBA `CoreArtSprite` descriptors.
Path IDs0–15 are contiguous N=1/E=2/S=4/W=8 neighbor-mask variants. Path0 is quiet
ground fallback, not invented isolated walkability. The live renderer computes
neighbor masks only from copied permitted paths. Natural stone uses the boulder
terrain rather than the paving texture when path distinction matters. World
objects remain entirely inside their32px cells. No renderer/domain state lives
in these source assets or converter.

Actual1×/3× inspection finds distinct Camp/Relay/Stone shelf/Moss bend/closed Cache
subjects, clear compatible route openings and improved tree/stone forms. Quiet
grass is the normal field; the noisier grass/moss textures stay sparse. Path art
may cover a cosmetic water cell: the actual causeway proof preserves an unbroken
earth route with aligned blue river immediately beside it. This bounded interpretation adds no swimming, bridge item, hazard or terrain mechanic. A future authored crossing remains optional
craft, not a new rule or an excuse for another full atlas.

The map-led450×600 Probe/site composition, live player/labels at world edges and
physical-input feedback need their own actual native output review. Source
inspection and reproducible exports do not approve gameplay enjoyment, final
art canon or hardware performance.

## Environmental craft limit

Actual `native-viewport-1x.png` inspection exposed a broad flat lime field and
isolated objects, which read as a toy map rather than the retained reference's
environmental depth. One existing-source comparison,
`native-viewport-grouped-comparison.png`, grouped trees/shrubs next to connected
uneven texture patches while preserving the permitted route/player. It still
shows conspicuous rectangular ground transitions and extensive flat field.
These sources offer no intermediate grass/moss edge family. Adding more random
texture or rearranging the same objects cannot establish the missing craft.

Individual native32px subjects and route joins remain viable provisional assets;
the full environment has not passed a broad art-quality review. This family can
support a visibly different functional LVGL composition proof. It does not
substantiate finished HiBit terrain or the reference's layered richness. The
comparison is disposable art evidence, not a new runtime layout/terrain rule.
No additional masks, variants or source generations follow automatically.
