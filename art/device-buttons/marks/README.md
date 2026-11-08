# Room marks

The Station's room marks, the icon of the device key that leads to each section, one Station palette colour each, matching its key. Each size is pixel-drawn by the art desk; never scale one size into another. `slices/manifest.json` gives each mark's size and hash. Signed by the art desk, 2026-11-07 17:21 (mibi-art 4be09dee5, `art-jobs/2026-11-07-key-caps`).

| Size | Where |
| --- | --- |
| 24 × 24 | the title bar at (16, 8), and the Call tags |
| 22 × 22 | Home's panel titles |
| 16 × 16 | the bottom-line cues |

## Marks (signed)

| Mark | Key | Colour |
| --- | --- | --- |
| `frame-room-home-{16,22,24}` | Home: the house | `#ffd441` |
| `frame-room-pods-{16,22,24}` | Pods: a pod, a flat-lid ribbed bulb (no crown, no stalk) | `#3084d8` |
| `frame-room-vivarium-{16,22,24}` | Vivarium: a glass dome with a mibi peeking out | `#5cbb4c` |
| `frame-room-library-{16,22,24}` | Library: an open book with a mibi's footprint (a heel and three round toes) | `#dbc0ff` |
| `frame-room-call-{16,22,24}` | Call | `#1f9d8f` |

The sandbox key icons `shell-key-{home,pods,vivarium,library,call}-{16,22,24}` share each mark's alpha in their key's ink (`#2f2b28` on Home and Vivarium, `#ffffff` on Pods and Call, `#f4f1ec` on Library, the signed cap inks).

Key order: Home, Pods, Vivarium, Library. Call is the Companion's cap, byte for byte.
