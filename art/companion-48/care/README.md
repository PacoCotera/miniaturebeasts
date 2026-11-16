# Companion care: the hearts

The bonded heart on the Companion: the same enamel heart as the Station's Vivarium card, lit from the top left, `coral` body with a `peach`/`blush` light, its outline in the red ramp's dark `wine` (never black). No face, no sparkle. Fully opaque pixels on a clear ground. Painted by an image model, never drawn by code.

How made: Retro Diffusion `rd_plus__low_res`, native size, text-to-image (no init), remove_bg, bypass_prompt_expansion, input_palette = wine/red/coral/peach/blush from `palette/palette.json`. Prompt: "a small glossy enamel heart pin, lit from the top left, dark wine outline, no black, no face, no sparkle". The 24 is seed 5201 (request `6218b0bd-9338-48a4-aa07-b3dd558ff052`); the 16 is its own drawing, seed 5203 (request `46a91cc6-7b3f-4faa-a447-fd13833ea27d`). Place step: poststeps replay with an empty step list (the raw already has a clear ground and only palette entries; a palette snap would change 0 pixels: 24 has 0 of 201 opaque pixels off the 48, the 16 has 0 of 127). Raws and call log: `art-jobs/2026-11-16-companion-heart-2/`.

| Id | Size | Where | sha256 |
| --- | --- | --- | --- |
| `c-heart-24` | 24×24 | The active mibi's name row; at 2× (48×48, pixel for pixel) in the bond event; copied byte for byte to the Vivarium's `heart-full-24.png` (two paths) | `9b8c3cef9018f3b1a095d1cf993a38c61465e5c5489da4c13fabe8a40d21942f` |
| `c-heart-16` | 16×16 | Roster rows, the Lead card, the expedition choice's partner card; its own drawing, not the 24 shrunk | `8c9059b6f431636bfd2872354c6a46e48ad7a4c184dc71aabb202cc7b5c15894` |
