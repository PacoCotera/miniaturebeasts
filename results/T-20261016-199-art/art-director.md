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
