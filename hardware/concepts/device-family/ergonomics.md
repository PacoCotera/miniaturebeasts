# Ergonomic and printer envelope studies

These studies ask whether a prominent display, tactile controls and service access can share a usable object. They retain measured diagram assumptions and a sourced printer example. They are not dimensions for the current handheld Station or shared Caddy; [devices](../../specs/devices.md) owns those roles, and [physical references](concepts.md) explains the current appearance and construction questions.

## Whole-face paper layout

The editable [215×230mm template](compact-whole-face.svg) and [PNG](compact-whole-face.png) put display and controls at one millimetre scale. This is a developed flat face, rather than an assembled footprint or internal-fit proof. Its workspace grid, Zoom and action arrangement belong to the study; use [experience](../../specs/experience.md) for current simulator inputs.

Origin is upper-left. A 164.90×124.27mm H-module envelope sits at(25.05,10). The manufacturer's 164.90×106.96mm glass rectangle is distinct from the board and active pixels; its placement is illustrative, rather than a mounting definition. Source: [manufacturer H Rev4.1 drawing](https://www.waveshare.com/img/devkit/LCD/7HP/Exterior-Size.jpg).

| Control reservation | Position, mm | Paper size |
| --- | --- | --- |
| Workspace keys | top-left(12,158),(38,158),(12,184),(38,184) | 20mm square,26mm pitch |
| Cross | center(90,185) | 40mm span |
| Cancel / Confirm | centers(128,207)/(158,207) | 24mm caps,30mm pitch |
| Zoom | center(187,174) | 36mm cap |

Workspace-to-cross nominal horizontal clearance is12mm; cross-to-Cancel6mm. Primary caps have11mm front margin. Zoom has10mm right margin and approximately13.9mm cap-edge separation from Confirm. Center distances are cross→Confirm71.5mm, cross→Zoom97.6mm and Confirm→Zoom43.9mm. These are calculated diagram distances, not comfortable reach or grip envelopes.

Print at100% and verify the100mm line. Either hand can operate serially by repositioning; no chords are required. Housing depth, slope, cap force/travel, control mechanisms, boards, connectors and cable/service space are unallocated. A diagram cannot establish comfort or internal fit.

## A sourced printer example

The CAPD245 illustrates why paper width is not printer-bay width. The [manufacturer specification](https://www.sii.co.jp/sps/eg/product/lowvoltage/capd245.html) and [datasheet](https://seiko-instruments.de/wp-content/uploads/2023/04/capd245-345_screen.pdf) give83.1×35.4×26.9mm(W×D×H), excluding mounting parts, with a slide cutter and curved paper path. Paper is58mm wide; printable width is48mm. Neither dimension includes the roll, driver or service clearance.

The [recommended-paper table](https://www.sii.co.jp/sps/eg/product/paper1.html) lists TP-322L:58mm width,30mm external roll diameter and9mm internal diameter, without a separate core indication. The hole does not define a required spindle. This is a dimensional example, rather than a selected printer or consumable.

An integrated-printer case study reserved100×95×90mm internally for roll, mechanism, brackets and accessible paper path. That rounded reserve is hypothetical. Mounting, latch travel, guides and actual service may require more; driver/power boards and connectors need separate room. Beside the164.9mm module, the83.1mm mechanism alone yields248.0mm before walls, spacing and controls. This conditional sum is not a universal minimum enclosure width.

## Paper path, presentation and service

The old left-bay hypothesis keeps the roll axis left-to-right, with roll above/rear and mechanism toward the lower/front outlet. A useful model must trace paper tangency, supported mechanism entry, head/platen, cutter and discharge using the manufacturer's mechanical reference. A curved arrow or rotated roll cannot demonstrate a usable route.

A rear loading hatch and a fixed front presentation pad have different jobs. Reload needs access to thread paper and release the platen. A roll opening alone does not establish jam access; reserve a separate service route if needed. Output must clear hands and controls. Cutter guarding, isolated service and actual latch/interlock behavior remain unresolved.

A possible reader needs its own unquantified electronics/antenna reservation, clear of moving paper, roll change and service. Nearby motors and cutter metal are real constraints. No reader technology, detection range, RF spacing or board envelope is established. Presentation can identify a device and offer a next step; it cannot prove successful receipt, ownership or charging.

The [generated cutaway](printer-tap-packaging.png) lacks manufacturer-derived geometry and a shared dimensional model, so it is unsuitable as packaging evidence. The [muted-pad exterior](prototype-a-muted-pad.png) is appearance exploration only. Current printing belongs to the shared Caddy, so these earlier integrated-case allocations do not define the handheld.

A credible mechanical study needs matching side/rear/section views, mounting, paper route, roll reach, connectors and jam service from one model. Where dimensions remain unknown, retain an envelope study and say what is unresolved. Physical parts and handling are necessary before claiming access, safety, comfort or reliable operation.
