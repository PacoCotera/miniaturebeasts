# T-198: the owed edge (art director)

The two masters the UI/UX addendum asks for:

| Master | Drawn behind | Offset |
| --- | --- | --- |
| `berth-portrait-owed-18x24.png` | `berth-portrait-18x24` (Home's Bay station) | −3, −3 |
| `sitting-frame-owed-48x40.png` | `sitting-frame-held-48x40` (the Habitat's Portrait plate) | −4, −4 |

- **How they are made:** `make-owed-edges.py` takes each held frame and moves every colour one step down its ramp in the Station palette (its `darker` neighbour).
- **The outline stays `ink`,** so the two frames share one line.
- **No shadow is added.**
- **The masters are palette-exact,** with no partial alpha.
- **The whole frame is kept, not only the strip that shows,** so the edge still reads if an offset changes. The held frame is opaque and covers the rest.
- **How it reads:** with the words covered, one frame means a sitting held, and the darker gilt edge behind it means another after it. There is no number and no amber.
- **Proof:** `owed-proof-4x.png` shows the Bay with three shut berths, the 5 px gap and the portrait berth held, then held with one owed, then the plate held, then the plate held with one owed.
