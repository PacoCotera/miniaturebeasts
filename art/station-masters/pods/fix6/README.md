# Fix 6: the art requests, by hand, 0 MXN

**A1. `leaf-empty-16x20`** (replaces the 1 px outline that read as a dotted arc).
- Shape: the full leaf's own alpha mask, blade, stem and tip.
- Fill: one flat, unlit sageD `#5d7a5f`; no outline, no vein, no light.
- Contrast on the Incubator's wall (107, 87, 71) is 1.43:1, under the full leaf's 2.70:1. It reads as the same leaf, not grown yet.
- sha256 `6f40440f3a15ba5f86419ac5d16c2bcd8930dcfe803d78a085bb8e9afe5b627c`.

**A2. `founder-shadow-224x14`**, at 400,529 under Create's founder, with the floor at 536.
- A soft contact shadow in the bench's shadow ink `#060c12`, as `pod-large-shadow` is.
- An ellipse at alpha 153 max, with its core 3 px right of the axis (the key light is upper left).
- Two denser pads under the feet (alpha 170, ±36 px from the axis), fading to clear at the ends.
- Painted at size.
- sha256 `9147ff2586b00132db2b91d557910b5159a072cee284c88343dc377764232dcd`.

**Proofs, on main's goldens** (`inc-A1-1x.png`, `create-A2-1x.png`, `before-after-crops.png`):
- On Incubator growing, the old outlines were cleared to the wall beside them before the silhouette was painted.
- On Create, the dotted residue is still in main's golden; the builder removes it at the source (fix 6 N4).

**Status:** new. The art director signs each in its whole 1× capture: A1 in `incubator-growing` beside `incubator-ready`, A2 in `create-shape`.
