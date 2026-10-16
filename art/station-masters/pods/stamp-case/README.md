# The stamp's look (stampCase), fix 4, by hand

The look is the art director's hook `stampCase` (frame.json regions.stampSlot.look). The rects are UI/UX's, unchanged:
- Create 804,400;
- Incubator 804,256;
- one mibi up close 872,64;
- Pods 804,400 inside the case 788,384,152,152;
- the code line 776,525,176,25.

The real stamp is placed as it is: its geometry, ink and plate are never regenerated. The look is how the label sits on the device: unlit, in its shade.

- **The label (no case: Create, Incubator, one mibi up close).**
  - The stamp's 120×120 label, plate and ink together, is multiplied in linear light by **K = 0.20 × WARM (1.00, 0.93, 0.80)**. The paper reads aged, in the device's warm shade, never grey.
  - A 1 px edge, hairline `#3d434b`, runs all round.
  - There is no fill, light, glow, beam, frame or pane of its own.
  - The label is derived when the stamp is rasterised (a picture, placed 1:1), never a runtime overlay.
- **Pods.** The label at **K = 0.75 × WARM**, in the case:
  - `room-stamp-case-152x152` (under the label): a dim well moulded into the sage housing, with a lit top-left rim, a shaded lower-right, and four dark rubber corners. sha256 `793516357cb1670cc85cd4bb93be6c5a6c0c3f46d92d840f687883d09ab77544`.
  - `room-stamp-case-152x152-front` (over the label): ground `#1d232b` at 48 %, the glass, with no sheen. sha256 `fa704f60934f6e18cb598fb391e0370da6feb09f7d7ea2597b5e4513071e3f16`.
- **The code** (776,525,176,25): ink mist `#8d8aa6`, 16 px; the rule 1 px hairline `#3d434b` at y 549.

**Proof** (`make-stamp-case.py`), on main's goldens. The old goldens still show the previous label or case at its old place beside the new one (Pods 856,384; Incubator 840,296); that is the old layout, not this look.

`proof-luminance.json` gives relative luminance, label against the state's main object:

| Screen | label mean / p95 | main object mean / p95 | cell contrast |
| --- | --- | --- | --- |
| Pods | 0.176 / 0.223 | 0.218 / 0.676 | 4.11 |
| Create | 0.144 / 0.187 | 0.200 / 0.658 | 4.36 |
| Incubator | 0.144 / 0.187 | 0.320 / 0.398 | 4.36 |
| One mibi up close | 0.144 / 0.187 | 0.335 / 0.800 | 4.36 |

- On every screen the label's mean and p95 are below the main object's, and the cells keep a contrast of at least 4.
- The label's sRGB mean is 111 on Pods and 99 elsewhere, under pods.json `labelMeanMax` 115.

**Status:** new. The art director signs in the builder's whole-screen captures, never as a lone slice.
