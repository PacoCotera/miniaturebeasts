# S01 floor: bare keys and crest overlays (Oct 11)

Under internal boards/mibi-motion/s01-floor-studio-brief.md (passed 14:33) and bare-keys-plan.md §2, §7. The programme lead's go: hard stop 19.20 MXN on the trait-layers line.

| Request | Input | Cost |
| --- | --- | --- |
| F1 `floor-S01-juvenile-bare-b` | `guides/compose-juvenile.png` (P1 + the signed young stand in cell 5) | 3.65 MXN |
| F2 `floor-S01-adult-bare-b` | `guides/compose-adult.png` (P2 + crouch-b in cell 2 + Pip in cell 6) | 3.88 MXN |

The round total is 7.52 of 19.20. No retries. Scales and offsets are in `guides/compose.json`.

**What came back.** Both sheets have round, whole bare heads on every key, with no stub, scar or flat cut. Young S01's rings came back thin. Pip's rings came back at his own width, not thin. I did not retry for that: a ring step is an overlay either way (coat painted over the outer ring for thin, cream for wide). Only the crest needs a bare base, because an overlay cannot take a part away from the outline.

**Cut** (`guides/cut.py`): each bare key is placed by its crested twin's body (centre and ground), at the sheet's proof scale (0.601 young, 0.733 adult). `crested/` holds the twins, cut from the composed inputs.
- Fixed on the way: the proof cut's cell-border rule (very dark, neutral pixels) was eating Pip's darkest charcoal and leaving holes. It now applies only in the crop's 12 px edge band (`concepts/mibi-motion-proof/guides/cut-motion.py`). The proof keys already cut are unaffected.

**Register** (`guides/register.json`), outside the crest zone dilated 10 px:
- Young: outline p95 1 px, max ≤ 2 px; mean RGB difference 2.0–3.3.
- Adult: outline p95 1.0–2.2 px, max ≤ 4.2 px, except crouch at 8.1 px (a notch at the back of the composed crouch-b, a cut fault on the crested side); mean RGB difference 2.7–3.8.
- Brief check 5 asks for ≤ 1 px everywhere. The young set passes. The adult set is 1–2 px over on its 95th percentile, which is not visible at 1× (proof below). Overlays are placed 1:1, never scaled.

**Overlays** (`guides/overlays.py`, `overlays/`): the crest's pixels plus a 4 px root band into the head, cut from the crested key. Base + overlay equals the base outside mask and band on every key: 0 differing pixels. Blink uses the stand's crest overlay.

**Proof:** `proof/bare-1x.png`, one row per key, crested | bare | bare + crest at 304×312 over #D6CEBE.

**Art director's read at 1×, not signed yet.** The bare heads pass, and every bare + crest reads as its crested key. Before I sign:
1. The pale 1–2 px fringe on the adult keys' edges needs a hand clean (sign-off check 5).
2. The crested crouch's back notch needs a re-cut.
3. The curl's crest overlay needs a check against the crested curl at 3×.
4. The ring steps (mid, wide) are not cut yet.

Then: walk sizes, 96×88, breath and HiBit.
