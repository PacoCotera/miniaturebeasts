# The Loika's version 4 masters: the spec (T-20261016-200, for the Station studio)

The owner approved the Loika at 13:44 ("yes, go with this loika"), and the lead approved the masters. The Station studio makes them after the S03 job, within the lead's limit. The art director gates what comes back, and T-20261016-203 builds with it.

## What already exists (masters-pods, `art/station-masters/pods/floor/S01/`)

- **Bare-headed base keys** (`keys/`), 304 × 312, feet on row 305:
  - adult: air, anchor, blink, crouch, curl, stand;
  - juvenile: air, anchor, crouch, curl, stand.
- **Crest overlays** (`overlays/`) for every key, placed 1:1. Blink uses the stand's.
- **The register and cut tools** (`guides/compose.py`, `cut.py`, `overlays.py`, `register.json`).

The crown is therefore done: base + crest overlay, or the base alone. **No new crown painting.**

## The layers each key needs

| Layer | How it is made | Painting |
| --- | --- | --- |
| **Colour** | A ramp per pigment (shadow, mid, highlight) driven by the key's own fur value, as `make-range.py` does. The base keys are the value source | none per key; one calibration sheet (M5) |
| **Two-tone zone** | A hand-cut mask per key: back and head against flanks and legs, the split following the body, with a short soft edge | none (hand-cut) |
| **Fur mask** | Cut per key: the coat, excluding the belly cream, eyes, crest and toes | none (cut) |
| **Patches** | A layer cut as the difference between a patched key and its base key, as the accepted marked/plain pair gives it | M1 adult, M3 juvenile |
| **Stripes** | A layer cut the same way, from a striped key: broad pale bands behind the shoulder, bowing back down the flank, tapering to a point, never on the head | M2 adult, M4 juvenile |
| **Eye rings** (thin, wide) | Overlays over the eye region, as the floor README notes: coat over the outer ring for thin, cream for wide. Open-eyed keys only, so not curl or blink | none (hand overlays) |

Stripes and patches stack. A key with both draws both layers. Each mark layer is shaded by the fur under it.

## The requests: five composed sheets

Each sheet places its keys on the floor job's compose guide, at the same proof scales (`guides/compose.json`), so they cut and register the same way as F1 and F2.

| Request | Input | Ask |
| --- | --- | --- |
| **M1** `loika-v4-adult-patches` | the six adult base keys, composed | the same keys, unchanged, with pale cream patches: the accepted Pip pair's patch shapes, carried onto every pose |
| **M2** `loika-v4-adult-stripes` | the six adult base keys | the same keys with stripes, per the layer table above |
| **M3** `loika-v4-juvenile-patches` | the five juvenile base keys | patches on the dark cap, scaled to the young body |
| **M4** `loika-v4-juvenile-stripes` | the five juvenile base keys | stripes on the cap, behind the head |
| **M5** `loika-v4-pigments` | adult and juvenile anchor, side by side | the same two keys painted in russet and in ash (catalogue 10, #8e98a4). This is the ramps' ground truth; charcoal is the base as painted |

- **Count:** 5 requests, with at most 2 retries (7 in all). There are no other requests.
- **The rule for every request:** the outline, pose, scale, light (top left), crest, eyes and belly cream don't change. Only the coat's marks or colour do.

## How the art director gates them

1. **Register.**
   - Each mark key, cut against its base, differs only inside the coat. Outside the fur mask, 0 differing pixels after the cut.
   - The outline holds within the floor job's numbers (p95 ≤ 2 px).
2. **Reading at Home's size** (144 × 152, the juvenile at 104 × 112):
   - stripes and patches each read on charcoal, russet and ash;
   - stripes against stripes and patches read as two looks;
   - four-grey still separates the three pigments.
3. **The ramps.** After M5, each pigment's ramp is tuned so the coded recolour matches the painted key at 1× (mean colour difference in the coat within a few levels). A ramp that can't match falls back to painted keys for that pigment, which would be a new request.
4. **The window.** `make-window.py` redrawn from the masters, with the same four pods.

## Delivered to the build (T-20261016-203)

Per key:
- the base (existing) and the crest overlay (existing);
- the fur mask and the two-tone zone mask;
- the patches layer and the stripes layer;
- the eye-ring overlays (thin, wide) on open-eyed keys;
- the three ramps (charcoal, russet, ash) as data.
