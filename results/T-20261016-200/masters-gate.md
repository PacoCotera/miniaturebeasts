# The Loika's version 4 masters: the art director's gate (raw sheets on masters-pods 3a3a4918)

The five sheets, made to `masters-spec.md`, are in `art/station-masters/pods/concepts/loika-v4-masters/`. Six requests: M3's first try recoloured the cream body and is superseded.

| Sheet | Verdict |
| --- | --- |
| **M1** adult patches (6 keys) | **pass.** The patches follow every pose, sit on the visible back in the curl and blink keys, and read clearly on charcoal |
| **M2** adult stripes (6 keys) | **pass.** Broad pale bands behind the shoulder, tapering down the flank, never on the head or legs. Clearly a different look from M1 |
| **M3** juvenile patches (5 keys) | **pass.** The patches sit on the dark cap with the cream body kept. Where a patch meets the cap's lower edge, the cut takes the mark inside the cap mask only |
| **M4** juvenile stripes (5 keys) | **pass.** Two or three bands across the cap behind the head |
| **M5** pigments (adult and juvenile anchor, russet and ash) | **pass as ground truth.** The russet is a little bright and the ash reads blue-grey, as intended. The ramps are tuned to these, so each painted key is the calibration, not the shipped colour |

**The register test** (base input against M1 and M2, at the sheet's scale):
- **Outline:** about 1.6% of the figure's pixels differ at the edge. That is the pink fringe and edge softening; the base keys' outline is unchanged.
- **Inside the coat:** the mean difference is 15–21, the marks themselves.
- **Outside the coat:** the mean difference is about 8, a slight repaint drift.

**So the cut takes only the mark layer from each sheet, inside the key's own fur mask, and everything outside the coat stays the base key's pixels.** That makes 0 differing pixels outside the coat by construction, which is the spec's check 1.

**No retry needed.** The last request in the budget stays unspent.

**Next (mine):** cut the per-key layers (the fur and two-tone masks, the patches and stripes layers, the eye-ring overlays), despill the magenta fringe, tune the three ramps to M5, and redraw the four-pod window from the masters. They are delivered to T-20261016-203.

## The cut (`cut-layers.py`, outputs in `layers/`)

Placement is inverted exactly from `compose-m.py`. For every adult key (air, anchor, blink, crouch, curl, stand) and juvenile key (air, anchor, crouch, curl, stand), at 304 × 312 in the base key's frame:

- **`*-fur-mask`:** the coat, cut from the base key.
  - Adult: the charcoal fur, including the lit crown. Juvenile: the dark cap.
  - Pupils, nostrils and mouth lines are dropped as small separate parts.
- **`*-zone-mask`:** the two-tone split, the top 48% of each column of coat being the first pigment, with a soft edge.
- **`*-patches`, `*-stripes`:** the marks from M1–M4, kept only where the painted key is lighter than the bare coat, inside the fur mask. **0 pixels outside the coat on every layer** (`cut-report.json`).
- **`ramps.json`:** shadow, mid and highlight per pigment and stage.
  - Charcoal is read off the base keys.
  - Russet and ash are read off M5's painted anchors at the base's dark, mid and light values.

**Proofs:**
- `proof-cut-layers.png`: every key bare, with patches, and with stripes.
- `proof-ramps-vs-m5.png`: the coded ramps on the base anchor beside M5's painting. They match in hue and value.

**The window from the masters:** `home-window-four-v4-masters.png` and its four-grey twin show the same four pods, 165, 168, 10 and 116, now from the master layers with the crest overlays. It supersedes the proof window.

**Owed:**
- The eye-ring overlays (thin, wide) are hand work. Until they land, every stand draws the base's "between" rings, so 168's wide rings and 10's and 116's thin rings don't show yet.
- The magenta despill isn't needed for the mark layers, which never reach the edge.
