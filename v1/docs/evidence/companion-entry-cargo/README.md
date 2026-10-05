# Companion entry and cargo repair evidence

Native LVGL output from clean pushed revision `e2413bbb948562d6e98d5121fc51ae9fbafcadd5`. Production is unchanged from `a37378d5996720dd7da9a9ed7fe8c35b8dcbc057`; later commits correct independent tests and add missing journey captures. PNGs are lossless conversions of native BMP output, not browser graphics or artwork mockups. Hashes are in [sha256.json](sha256.json).

## Player journey

The three-destination Companion home exposes existing mode purpose and current counts. Directions select vertically; Confirm enters without starting an expedition. Entered expedition choices now match Up/Down. Cargo shows its whole-unit manifest and sending consequence before one deliberate Send. Offline delivery remains sealed. Lab acceptance credits stock once and immediately empties current outgoing amounts on both devices, before Companion receives its acknowledgement. Historical quantities remain explicitly in received records.

| Proof | What it establishes |
| --- | --- |
| [Fresh home](initial-companion.png), [Cargo selected](mode-cargo-companion.png) | Actual populated root and selected destination; passive mode navigation |
| [Expedition chooser](expedition-chooser-companion.png) | Entered vertical choice layout; no automatic start |
| [Cargo](cargo-companion.png), [sealed offline](sending-offline-companion.png) | Visible terms, one Send, retained unaccepted cargo |
| [Accepted before receipt](accepted-offline-companion.png) | Zero current materials/capsule while acknowledgement is pending |
| [Accepted Lab overview](accepted-home-lab.png) | Actual credited stock14/14/12 and empty current source |
| [Receipt](receipt-companion.png) | Finished expedition and deliberate next outing |
| [Receipt-recovery fixture](fixture-reception-receipt-recovery.png) | Synthetic retained-operation fixture: zero current incoming source, credited stock, truthful recovery status |

The first eight images come from the isolated three-device HTTP/native journey using the actual physical-input protocol and temporary fresh saves. The final image is explicitly a synthetic focused recovery fixture, not human play or a real hardware fault. The journal/received log intentionally retains historical delivered quantities.

## Executed checks

Six affected native suites pass: action, reception and Kit at the production revision; Home, Probe and Cargo at test-corrected `fec9eb5a5d8669e9476fb2e7eea0cbfc3290c261`. The same-production HTTP journey passes at `e2413bb`, including fresh/stale input guards, passive entry, real field acquisition, single Send, repeated-Send identity stability, offline acceptance, once-only credit, source zero, receipt and new outing.

The added labels fit the existing LVGL pool. All retained Lab actions/research/reception/Home plus Companion and Dock measured215680 bytes used,217592 peak,230504 total; free space remained14824 bytes before/after repeated updates. Home and Cargo/Probe lifetime checks also retain stable allocation. These host measurements are not an ESP32 runtime or physical panel claim.

Independent architecture/technical and actual native UX/art repair assessments are recorded with the final PR review. This is a bounded entry/transfer repair, not final art approval or a complete V1 fun pass. Habitat population/collection previews, discovery gameplay, distinct open expeditions and rejected incubator replacement remain separate work.
