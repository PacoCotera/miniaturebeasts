# Fix 5 Create CA1: the hand attempt (AD, 10-15), not delivered

`relight.py` (the tray: a floor plane, rows 248-303 local, and a pool) and `relight-stage.py` (the bench's key-light gradient) are a hand attempt at 0 MXN. Nothing in slices/ is changed.

What works: the tray gains a floor plane, so the founder's far and near feet stand on floor, not on a seam.

What fails, measured on the composed screen (`proof/hand-attempt-1x.png`):
- **C12, the pool:** its 300x52 mean relative luminance is 0.134. The brightest other bench window of that size is 0.253, at the housing's top-left. A pool bright enough to pass by multiplying the paint reads as a code-drawn spotlight, not light.
- **The key light** on the dark bench wall is a gradient too weak to read at 1×. Raising it turns it into a vignette.

**Verdict:** CA1 needs a painted relight, the spec's studio edit (≤ 8 MXN, on the programme lead's go). The hand floor plane is kept here as the edit's guide for the floor line and the pool's place.

## Delivered: the studio edit, cut by hand (10-15)
- **Source:** one Pro edit, `source/raw/ca1-create-relight.jpg` (job `source/work/ca1-create-relight.json`). 3.71 MXN on the programme lead's go; no retry.
- **Cut:** `cut-relight.py` writes `room-bench-stage-create` and `chamber-back-400x320` under their ids and rects.
  - The housing outside the bench's interior is the signed stage, pixel for pixel (0 px changed).
  - The edit's dish (CA3) is taken out: it came 40 px under the pod's feet, in a new glossy metal. Its place is refilled with the signed paint relit by the edit's light.
- **C12, measured on the composed screen:**
  - the tray's pool is the brightest 224×52 bench window at 0.379, against 0.293 for the best elsewhere;
  - the founder's p95 is 0.680, the highest of any stage object.
- **Proof:** `proof/relit-1x.png`.

## CA3: the dish, by hand (10-15)
`paint-dish.py` presses a shallow worn dish into the relit bench at the pod's place (axis 160, feet 408), at 0 MXN. It is a height field shaded by the same top-left key. `room-cradle-front-create-224x96` is its near lip, as its own layer at (48, 344) over the pod's feet. Create gets its own id because `room-cradle-front` is Pods' signed piece. Proof: `proof/dish-pod-and-empty-2x.png`, with the pod and empty.
