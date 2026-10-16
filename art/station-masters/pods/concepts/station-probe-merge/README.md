# Probe merge, the slim handset in the matte rendering (Oct 10)

The art director's approved edit: the owner's variant-2 proportion (slim, waisted handset) in the variant-4 rendering (matte, painterly), sage over sand, the target's speckled eggs. One Pro request (gemini-3-pro-image), succeeded, no retry. Job `source/work/probe-merge.json`; call `log/calls.jsonl`.

References (project-owned crops under `source/work/guides/`, cleaned of captions, people, the red badge and the watermark): `mj-render-ref.png`, `mj-proportion-ref.png`, `mj-palette-ref.png`, `mj-silhouette-ref.png` (the 24x48 silhouette, 8x). The prompt asked for no text, no red, no glow, no hands or people.

| File |
| --- |
| `probe-merge-1376x768.jpg` |

Notes. Tier 1 left, tier 2 right, three-quarter from front left on plain grey: a slim waisted handset, sage over sand with a dark rubber base, a rubber-ringed dark screen with a sky sweep and sky/green/amber dots only, three unlit lamps, speckled eggs stacked in a vertical window, a tall free antenna on the left, a small carry loop on top, a side grille left, lens and port right. Tier 2 adds a fitted sand module in a right-side socket. No text, red, people or glow.

Flaws: **plate count**: tier 1 shows four white plates (two per side), not three; tier 2 shows four plus the module, so only the module separates the tiers. The screen is large and dark in the upper half. The unit is far larger than 288 px at 1376x768, and the 48 px silhouette was not drawn; whether the shape holds at 48 px is untested. Not cut, not in status.json: a concept only.

## The tier 1 plate count, corrected by hand (Oct 11)

The spec (internal boards/station-probe-merge.md) gives tier 1 three Shield plates and tier 2 a fourth. The painting gave tier 1 four.
Tier 1's lower right plate is painted out by hand, with no paid call. Each column under the plate was refilled from the
clean paint above and below it: the green front, the sand side strip and the grey ground, with a light grain to match the matte
rendering. The upper right plate is untouched. Tier 2 is unchanged: four plates and its module.

| File | What |
| --- | --- |
| `probe-merge-3plates-1376x768.png` | the corrected sheet: tier 1 with three plates (two left, one right), tier 2 with four and the module |
| `probe-tier1-480x768.png` | tier 1 alone, from the corrected sheet |
| `probe-tier2-480x768.png` | tier 2 alone |

The original `probe-merge-1376x768.jpg` is kept for the record.
