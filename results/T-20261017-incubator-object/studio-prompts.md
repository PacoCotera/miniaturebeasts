# The Incubator as one object: the prompt intent for the Station studio (three directions, closed and open)

Six paintings: three directions, each closed and then open. Revised after the owner's second set of five references: premium minimal product design, with a window onto a living micro-world and moss as the nest. The art director gates them, then the creative director, then the owner.

## Shared, for every request

- **References:**
  - `ref-loika-pod-sealed-3x.png` (this folder): the pod. This exact Loika pod, with its charcoal shell, russet dots and russet rounded cap; keep its shape and colours.
  - The owner's five reference images, for mood only. Copy no specific product or design from them.
- **Format:** 3:2, cropped to 1024 × 600 afterwards. Keep the object within the middle 90% of the width, and about 60% of the frame's height.
- **Camera:** front three-quarter, slightly above, a calm still-life. The open painting uses the closed one as its reference: same object, same camera, same room, same light. Only the opening changes.
- **The prompt core, every time:** "A premium, minimal designer incubator, a beautifully made object someone would keep on their desk. It holds one egg-like pod nested in a living micro-world of moss and fine grass, seen through a large clear window. Lit like a product hero shot: soft, tactile, matte surfaces with fine material detail, and a shallow depth of field with a softly blurred background in warm dark and sage tones. The pod's warm inner glow and the object's own light are the warmest things in the picture. Calm, precious, loved. Satin and matte finishes only."
- **Always say NO to:** a boxy appliance or kitchen look, chrome, mirror gloss, exposed cables or wires, robot arms, screens, displays, gauges, dials, rivets, brass, holograms, text, logos, orange bands or trim, pink, a lab, a creature or chick inside, hands, a frame or border.
- **The pod:** sealed and whole, upright on its bed, glowing softly from its core so the shell's charcoal and russet still read. It is not a plain white egg.

## A. The capsule

- **Closed:** "A tall, rounded capsule in dark slate-grey matte (like #2b3138), its whole front a clear curved glass window. Inside, a thin warm arch of light stands behind the pod like a halo, and the pod rests on a round plug of dark soil topped with moss and fine grass. A slim soft mint light bar (like #adf6e0) glows in the capsule's base: the only cool light."
- **Open:** "The same capsule with its curved glass front swung open on a hinge at one side, the pod on its moss plug open to the air, the arch light still glowing behind it."

## B. The egg

- **Closed:** "A smooth, egg-shaped incubator, two-tone: warm cream above and soft sage green below, divided by a fine seam. A large oval window in the cream half looks into a lush micro-world of moss and tiny ferns, where the pod sits nested. Soft daylight from one side, as if near a window."
- **Open:** "The same egg with its cream upper shell lifted and tilted back on a hinge at the rear, like a lid, the mossy micro-world and the pod open to the light."

## C. The porthole

- **Closed:** "A rounded, softly squared cream object, like a small vintage television reimagined as a designer piece, with one deep round porthole window. Inside, the pod glows warm amber-gold on a bed of moss, filling the window with warm light. A slim warm gold light slot glows below the window. It sits on a soft sage felt mat."
- **Open:** "The same object with its round porthole glass swung open on a side hinge, warm light spilling out over the felt mat, the pod on its moss bed now in the open."

## What the art director gates

- The pod is this pod: charcoal and russet, readable through the glow.
- The object reads as premium, minimal and loved, at the finish of the owner's references. It is not a lab, a box or a diagram.
- One warm light, with the object the warmest and brightest thing.
- Closed and open share their camera and object exactly.
- None of the NO list appears.
- At 1× it holds as a picture people would want on their desk.

## The capsule, chosen: the master and the two moments (four calls)

The owner chose the capsule. Four calls, in this order, each passing the named references. No retries without the art director.

**References for all four:**
- `ref-loika-pod-sealed-3x.png`;
- your `capsule-closed-1024x600.png` (masters-pods aa017583);
- this folder's `capsule-open-mint-1024x600.png`.

1. **master-closed**, an edit of `capsule-closed`.
   - Keep the capsule, room, camera and light identical.
   - Change two things:
     - (a) "The pod is exactly the reference pod: a charcoal slate shell (#465459), russet dots and russet ribs (#ae674d), a rounded russet cap, glowing softly from its core."
     - (b) "The warm arch is a lamp, not an outline. It is a wider, soft warm light set into the capsule's back wall above and behind the pod. It casts warm light down over the moss and onto the pod's shoulders, with a gentle falloff across the moss and soil. It is not a thin neon line hugging the pod's silhouette."
   - The mint bar in the base stays mint.
2. **master-open**, from 1 as the reference, with `capsule-open-mint` for the door.
   - "The same capsule, camera and light as the reference, with only the curved glass door swung open on its side hinge, as in the second reference."
   - The mint bar stays mint. The pod and the arch-lamp are as in 1.
3. **incubate**, from 2.
   - "The same capsule and camera. The door is just closing, almost shut. The pod has been set down on the moss and is settling. A thin mint light traces the door's seam as it seals. The arch-lamp glows warm on the moss. A calm, tucked-in moment, the room a touch dimmer, as at evening."
   - No hands, arms or tools.
4. **hatch-now**, from 2, also passing `mibi-juvenile-S01-304x312.png` (station-gate `prototypes/ui/assets/masters/pods/`).
   - "The same capsule with its door open, the arch-lamp warm. On the moss, the pod has opened: its shell lies in two halves with the russet cap tipped aside. Standing on the moss between them is this exact young creature from the reference: same colours, markings and face, facing the same way as in the reference (not mirrored), small and new, looking out of the open door. A soft, bright, joyful light. The mint bar glows."
   - The creature is the reference juvenile, unchanged in design. It must not be redrawn as a different animal.

**The shared NO list applies.** One camera across all four.

## The capsule in the house style (four calls)

The owner's ruling: close the style gap. The capsule set came out near-photographic, while the creatures and every other screen are illustrated. Repaint the four in the game's own illustrated style, so the signed pod and juvenile sit in them natively. The capsule is not redesigned: keep its form, colours, light and composition exactly. Only the rendering changes.

**Style references, passed to every call:**
- station-gate `prototypes/ui/assets/masters/pods/mibi-juvenile-S01-304x312.png` and `mibi-adult-S01-304x312.png`: how a creature is painted;
- `ref-loika-pod-sealed-3x.png` (this folder): how the pod is painted;
- masters-pods `art/station-masters/pods/idle-seam/idle-vivarium-day-1024x568.png`: how moss, soil and light are painted;
- station-gate `prototypes/ui/assets/masters/pods/cargo-bay-992x320.png`: how a Station object is painted.

**Content reference per call:** the capsule picture it repaints (masters-pods 45d903da `concepts/incubator-capsule/`).

**The style, in the prompt:** "Repaint this exact scene in the soft, tactile, hand-painted illustration style of the style references: rounded, softly modelled forms; gentle painterly texture; simplified but careful detail; clean soft edges; warm, even, storybook-real lighting, like a cosy miniature diorama painted for a children's-book-quality game (not childish). The same composition, camera, objects, colours and light as the content reference. NOT photographic: no photo grain, no lens blur or bokeh, no glossy CG, no fine photographic texture in the moss or soil. The background is a soft painted wall in the same muted sage and warm tones, simplified, not blurred."

1. **closed:** repaints `master-closed`. The matte slate capsule, the round warm roof lamp lighting the moss, the pod on its moss-and-soil plug, the mint base bar.
2. **open:** repaints `master-open`. The same, with the curved glass door open on its hinge.
3. **incubate:** repaints `incubate`. The capsule shut at dusk, a thin mint ring sealing the window, the base bar dark, the room in evening light.
4. **hatch-now:** repaints work-queue `hatch-now-signed-juvenile-1024x600.png` (this folder), the version with our signed juvenile already in place, and passes the juvenile master as well. The shell is in two halves with the cap tipped aside, and the juvenile stands on the moss, facing as in its reference (not mirrored), looking out of the open door. Paint the juvenile exactly as the reference creature: the same colours, markings and face. The art director may composite the signed master over it again.

**The pod in every call** is the reference pod: charcoal #465459, russet dots and ribs, a rounded russet cap. The shared NO list still applies.
