# Companion 48 px redraw: brief and plan

**Proposal**, art-directed. Decided: 48 px tiles ([decisions](decisions/README.md) B), the 32/532/36 frame, Mibi 7×9 and the 48 colours ([ui-kit §6](ui-kit.md)), and Miniature Lives ([style guide](../style-guide/README.md), [Companion screens](../style-guide/companion-screens.md)). The [prototype](../../prototypes/exploration/README.md) still draws 32 px tiles in a 26/540/34 frame. Sheets first; the builder then hosts them.

## 1. The brief

HiBit, as the accepted Pip at 280×300: rounded volume, clustered forms, three or four steps of one ramp, one light from the top left, catch-lit eyes. Never childish: no sticker faces or 1 px noise. The [48 px comparison](decisions/tile-size-48.png) sets scale, not finish; companion-storm and companion-map-hands set the look.

## 2. Inventory

Sizes at 1×.

| Group | Assets | Size |
| --- | --- | --- |
| Meadow | grass ×4, tall grass ×2, flowers ×2, canopy shade | 48 |
| Pond edge, shallows | water ×2 frames, deep, reeds, sand, stepping stone, island; shore corner set (16 × 2 frames) | 48 |
| Wood | floor ×3, roots, trunk, wood-edge set (16), canopy ×2 | 48; canopy 132×114 |
| Rock field | gravel ×3, slab, stone, cliff set (16), overhang roof | 48; roof 156×33 |
| Cave | floor ×2, wall set (16), mouth, burrow closed and dug | 48 |
| Features | bush (plain, fruit, shaken), dew cup full and empty (distinct), fruit, tuft, pod, buried-pod outline, warm stone (2 frames), charged stone (2 frames), warned-strike outline, outpost (three flames ×2 frames, dark), beacon (dark, lit ×2) | ≤48; outpost, beacon 48×72 |
| Pawn | 4 facings × walk 3, creep 3, react 1; reach variant with 2 px dark silhouette; map pawn | 48; map 16 |
| Tokens | idle 2, walk 3; partner ring; name tag; bubbles `?` `!` fruit `…`, settle pips | 48; ring 40×12; bubbles 16×18 |
| Signs | paw, beat, bolt, hollow bolt, pin, gate, pod, flag, skull, outpost ×4, beacon ×2 | 24 reach tier 1; 16 tier 2 and map |
| Map | props (tree clump, bush, rocks, reeds, ×3 each); land cells ×3 per land; pending outline; quarter dot | props 12–24; cells 26 |
| Cloud and rim | 8 heap pieces, rim lit toward the island in 4 facings; 8 lapping-edge pieces | 48×32 to 128×72 |
| Weather | rain-sheet streaks and soft edge, 2 leans; place rain tile, 2 leans × 2 frames; fog puffs ×4; crackle | rain tile 96×96 |
| Pods, bay | pod shell with remaps per place colour; crate sealed, stamped, sliding; seal tag; empty bay place | 16, 64; crate 120×96 |
| HUD, bars | icons: Energy, Data, Essence, Shield, Pod, World turn, Call, Storm, Fog bank, Pin, Battery, Radio, plus hollow bolt, Shield gone, free slot, bond; Shield plates; reach-grid dots; key caps ✓ ← Call; condition bolts ◀ ▶; crate icon | 16; plates 10×14, 24×40 |
| Panels | 9-slices: ink, paper, name tag, message box, menu row; focus brackets; Call ring profile | radius 4 |

## 3. Who makes what, and how

The **pixel artist** is a project role, under the art director's sign-off. Paintings and generation come first; the cleaned Aseprite sheet is the master.

- **Terrain, props, features:** a Pro-painted source at higher resolution, down-rendered onto the 48 ramps. Ground edges may start from a Retro Diffusion Wang tileset (C4), palette-converted.
- **Cloud, rim, weather pieces:** Retro Diffusion `rd_pro__topdown` with the 48-colour `input_palette` and one concept crop as reference (the trial's A3 and A4), snapped to the palette.
- **Mibi tokens:** derived on the Station from each mibi's painting: 48 px token (idle 2, walk 3), HUD face, 64 px partner face ([art pipeline](art-pipeline.md) §1.1, §6). Wild creatures and unmet silhouettes take the **generic token per species**, derived from the type specimen; a mibi awaiting its painting carries the placeholder set.
- **Cleaned in Aseprite (headless)**, where the trial showed generation fails: seamless repeats, the outline rule, the Bayer edges, rain sheet streaks, two-frame idles and stepped cycles (generated frames boil), icons and key caps at 16 px, 9-slices.
- **Assembled** as indexed sheets with a JSON atlas in `art/companion-48/`; sources, prompts and sidecars kept, generated stages labelled.
- **Contact sheets** of every asset at 1× and 3× go to the owner at each review.

## 4. Palette discipline

- The 48 colours of ui-kit §2 as one palette file, identical to the page's `PALETTE`; indexed sheets; nothing added.
- Ramps as ramps; 1 px outline in the part's darkest step, lighter on the lit side; shadows cool, highlights warm.
- No alpha, anti-aliasing or gradients. Bayer only in the signed tables and edges (veil, fog, fade, unsurveyed quarters); art shades in clean bands.
- Storms go blue; fog to pale bone, never lavender; lavender only for the cloud bank; red only for danger and fruit. Pawn and mibis never pass through a table.
- Every sheet: 0 off-palette pixels and a four-gray value check before review.

## 5. Page changes (spec for the builder)

Starts after the other builder's work in `index.html` lands.

1. **Frame:** `HUD_H` 32, `LINE_H` 36, view 532; HUD and three-part bottom line re-flowed per [Companion screens](../style-guide/companion-screens.md); Mibi 7×9 at 2×.
2. **Tiles:** `TS` 48; every hard-coded half tile (`+ 16`) and 32 derived from `TS`. Places stay 28×32 tiles (1344×1536 px); rules stay in tiles (Call, sight, walk lift). At most 11×13 tiles drawn.
3. **Camera:** scroll only when the pawn leaves the view's middle third; tweened; clamped.
4. **Assets:** load signed sheets (indexed PNG and a JSON atlas: frames, anchor, foot point). Retire each procedural builder as its sheet lands; meanwhile a labelled grey box, never code-drawn art.
5. **Light:** bake tiles per light level through the tables as now. The veil keeps its 16 px Bayer edge on 48 px tiles.
6. **Sprites:** 48 px, anchored and sorted by foot; canopies 132×114, roofs 156×33; 40 a frame.
7. **Reach view:** cells cut from the real 48 px ground, map props where the place's features stand (decision 1); tier 1 with 24 px signs and the silhouette pawn, tier 2 with 16 px. Cloud composed from the pieces by a seeded rule baked per world, rim toward the island, darkening through DARK away from it; rain as streaks behind one straight soft edge.
8. **Full map:** 26 px cells from the sheet, not crops.
9. **Active mibi:** the derived 280×300 resident replaces the 8× token.
10. **Checks:** `__mb.offPalette()` 0 everywhere; atlas sizes; cache size and `drawPatch` re-measured.

## 6. Order and reviews

1. Palette file and tables signed.
2. **Review place:** meadow and pond edge in a storm: meadow and shore sets, tree, bushes, three stones and a warned strike, outpost, pod, pawn, rain, HUD, bottom line, message box, with the creatures of decision 2. The builder hosts it meanwhile (§5, 1–6). **Review 1:** the owner sees this one place at 48 px, live at 1× on a true-size screen beside companion-storm and the 32 px mock-up, with its contact sheets. Nothing else is made until it is signed.
3. Reach view: cloud, rim, rain sheet, signs, props, pawn. **Review 2:** the concept test (§7).4. Wood, rock field, cave, fog bank, veil, full map. **Review 3:** one place per land, then the map.
5. HUD, bars, icons, pods, crates, panels. **Review 4:** each screen against its pass list.
6. Final checks and the sign-off sheet.

The art director critiques each round at 1× first.

## 7. The concept test

The reach view at 450×600, 1×, beside [companion-map-hands](../../art/concept-homepage/companion-map-hands.png) scaled to 450×600, as in [reach-vs-concept](ui-kit/reach-vs-concept.png), judged at arm's length at true size. It passes when:
- the owner still calls it beautiful, and rates it at least level with the accepted mock-up shown unlabelled;
- the island is a lit clearing in soft, layered cloud with a lit rim, drawn heaps, no circles or slabs;
- rain is one clean diagonal sheet;
- the pawn is found within a second; signs read large.

On failure, cloud and props are redrawn before any other land starts.

## 8. Risks

- **Down-render loses HiBit:** painted sources may turn to mush at 48 px. The review place tests the method first.
- **Generated drift:** references get copied, tilesets ignore the palette; every output is snapped and checked.
- **Derived tokens** may lose detail at 48 px. Only Pip's painting exists (decision 2).
- **Walking:** a place is about 3×3 screens and a reach already takes 538–845 actions. Place size goes to exploration design after Review 1.

## 9. Decided

**Decided** (2026-10-08):

1. **Reach-view ground.** Crops of the real ground plus map props at the place's features. Rejected: plain crops (wood reads as a blob, close-ups not little scenes); separate cell art (can disagree with the place).
2. **Review place creatures.** Pip and wild Loikas, others as labelled placeholders, so Review 1 is not held for the Tuikis and Untuva species pieces.
