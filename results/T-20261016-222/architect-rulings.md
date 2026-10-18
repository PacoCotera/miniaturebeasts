# Architect: T-222 face rulings (01:50)
 the three T-222 face rulings.

1. The panel is Create's `confirm` state, drawn by the existing panel overlay. There is no new screen and no new face words.
   - Code: screens/panel.c with panel.json and frame.json regions.panel. It is built on batch/B-20261016-4 and not yet merged into station-gate, so T-222 must build on that batch or after it merges.
   - In `confirm`, Create's props carry overlay: { id: "panel", … } with the verb, the price, the "Incubate" and "Keep shaping" rows and their drawn outcomes.
   - The plate, the cards, the ring and the 180 ms dither are the panel's own.
   - create.c already takes no keys while an overlay is open.

2. The right window is a face-side snapshot, not a Node composite.
   - Node can't compose it, because the C face draws Create, not Node.
   - Add one primitive, prim_snapshot(handle, x, y, w, h): when Create is left, it copies that framebuffer rect into a face-owned picture (lv_snapshot).
   - The window shows it as a sprite window (rgb = sx&lt;&lt;16|sy), clipped to 474×468 at the spec's offset.
   - Cost: about 887 KB held, one ~222k px copy when Create is left, then nothing.
   - If the window must stay LIVE (Create animating inside it), that is a larger face change (Create's word tree drawn with an origin offset inside a clip). Ask before building it.

3. Relit pods and juveniles: confirmed, as pictures through the picture table, never in props.
   - The pixels travel as asset messages to handles, so the 32 KiB props budget is untouched.
   - Each is one sprite (the budget is 400 objects per screen; the table holds 1,024), on the painted layer because of the shadow and moss alpha.
   - Cache by id, as stamps are: relit:{species}:{genome digest or pod gs}:{light}:{w}x{h}:v{recipe}. Render in the logic process off the frame; the host's existing release frees them.
   - Bump v{recipe} whenever the relight changes.

