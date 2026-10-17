# The r4 vivarium pane: a taller framing (the art director)

The creative director's ask: r4's vivarium pane is 384 × 497 at 1× (x 624–1007, y 48–544, rounded corners of about 12). It needs the residents and the ground to fill more of it, with only the top 20% or so a calm band of canopy.

## Route 1, a crop of the existing day master (no paid call): `pane-r4-route1-crops.png`

A 384 × 497 crop fits inside `idle-vivarium-day-1024x568` at 1×, so nothing is upscaled. The residents are placed per r4, from the v4 stands (`make-pane-crop.py`).

| Crop | Reads |
| --- | --- |
| **Burrow side** (x 0–383) | **Usable now.** The mound and the burrow lift the ground on the left, so the life fills about the lower 60% of the pane. But the canopy still takes about the top 35%, not 20%. The left edge shows the wall and the hose |
| **Centre** (x 300–683) | **Fails.** The floor starts at y 259 of 497, so about half the pane is blurred canopy, which is what the creative director flagged |

The source's floor is only about 210 px tall, so no 497-tall crop of it can be 80% life. **The burrow-side crop is the interim. The brief needs route 2.**

## Route 2, a painted tall master: the spec for the lead and the studio

- **One request**, plus at most one retry. **Needs the lead's approval and cap.**
- **The size:** painted at 768 × 994 (2×) and reduced to 384 × 497. A reduction, never an upscale.
- **The scene:** the same vivarium as the day master, in the same warm daylight from the top left, with the same moss, stones, roots, burrow and water. Feed `idle-vivarium-day-1024x568` as the reference.
- **The framing:** the camera low and close on the floor.
  - **Lower 75–80%:** the moss bed, the burrow mound at one side and the small pool, a floor deep enough front to back for six residents to stand at two depths without crowding.
  - **Top 20%:** one calm band of canopy and light, softly out of focus.
  - **Kept out:** the device wall, the hose and the mister (the pane has no bezel, and the instrument lives in Home's other panes); no creatures (the build places the residents); no text.
- **The ground:** the floor's walking line is level enough that stands at 96–150 px tall read as standing on it. Soil shows only as a thin edge at the bottom.
- **The variants:** day first. Dawn, dusk and night follow from the same framing once day passes, as the existing four do.

## Route 2 delivered and gated (masters-pods f2116095, `concepts/vivarium-day-tall/`)

The studio made two requests, the first and its one retry.
- **Sheet a: not used.** Too much canopy; the floor starts at about 52% of the height.
- **Sheet b: passes.** Deep open moss, the burrow mound left with its hole, the small pool right, and no wall, hose, creatures or text, in the day master's warm light.

**The cut** (`cut-tall-master.py`): rows 200–1200 of b at the pane's aspect, from the burrow side, reduced (never enlarged) to **`vivarium-pane-day-384x497.png`**. In it:
- a calm canopy and light band takes about the top fifth;
- the burrow and the pool sit in the middle;
- the floor fills the lower two thirds and more, deep enough for the residents at two depths.

`pane-r4-route1-vs-tall.png` shows it against the route 1 crop, with the same residents. **It replaces the route 1 interim.** Dawn, dusk and night follow from this same framing under a separate approval.
