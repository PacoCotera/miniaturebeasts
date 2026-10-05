# Physical-design references

The Miniature Beasts kit makes a field discovery portable, gives research room at home, and keeps accepted records visible on a shared Caddy. The physical design must support picking up either device, playing with its controls, returning it to the station and servicing it without losing that relationship.

[Devices](../../specs/devices.md) owns the product roles and open hardware choices. This page explains the appearance and construction studies; original images and generation prompts remain in this directory. They do not establish measured fit, finished electronics, ergonomic performance or manufacturing readiness.

## The current family reference

![Sage Lab, stone Companion and shared Caddy appearance](combined-family-materials.png)

The reference uses related matte sage/stone shells, charcoal protection, restrained orange controls, recessed Caddy identity and a grey OK key. [Its exact prompt](combined-family-materials-prompt.txt) preserves the source. Station is a home handheld research/world device; the combined Companion carries Probe, Cargo and Companions; Caddy provides charging, printing and a quiet summary. Screen artwork and depicted species remain illustrative.

The handheld direction favors a substantial rugged body and two-thumb use, with serial operation possible using either hand. Playing while supported in the Caddy needs clear control and finger approaches. A prominent useful display, accessible workspace controls, protection and straightforward assembly matter more than reproducing a generated silhouette. Current simulated controls are in [experience](../../specs/experience.md); older knobs, Inspect keys and separate-Probe studies cannot add controls to that mapping.

Caddy supplies one clear rest per device, accessible navigation and print/feed controls, and a paper path clear of the playing hands. Charging contact, retention, mechanism packing and reader technology remain open. Docking or presenting a device is not automatic successful transfer, ownership or reward.

## Construction and service questions

The proposed Station construction is a broad rectangular body with a front shell, passive rear cover, accessible standard fasteners and replaceable protection. An open electronics carrier or accessible rails are alternatives; a carrier earns its extra part only if it improves assembly and service.

```mermaid
flowchart TD
  Isolate[Use the eventual power-isolation procedure] --> Cover[Remove accessible rear-cover screws]
  Cover --> Rear[Open service space without a wire-tethered lid]
  Rear --> Harness[Reach and disconnect identified harnesses]
  Harness --> Support[Remove electronics support if needed]
  Support --> Module[Access independent display or control retainers]
```

Boards, battery and wiring do not attach to the passive service lid in this proposal. Harnesses need reachable latches, strain relief, identified mating directions and service slack. Connectors cannot carry structural loads. Independent module retention lets service replace one part without releasing unrelated controls. Guard removal must not require destructive opening.

A packing model needs actual module and PCB envelopes, component heights, control backs/travel, connector exits, cable bends, energy and power zones, antenna constraints, heat paths and tool access. Display, glass and active pixel aperture are different boundaries. Do not treat a rear plan area as vacant PCB capacity or invent a finished depth from a render. Generous first-build space supports assembly and learning; later density changes need evidence.

Caddy construction explores joined printable trays, removable cradles, a fascia centered between docked devices and independent printer service. The front and rear must come from one dimensioned model. Seam, contact, roll/jam access, print orientation and fasteners remain unresolved. This describes the retained hypothesis; missing old illustration exports do not establish it.

## Sizing and handling evidence

The [paper sizing trial](contour-sizing.pdf), [front SVG](contour-sizing-front.svg), [rear SVG](contour-sizing-rear.svg) and [generator](contour-sizing.py) use a provisional 215×190mm body with a 12mm corner radius. A 164.90×124.27mm module outline comes from the [manufacturer H drawing](https://www.waveshare.com/img/devkit/LCD/7HP/Exterior-Size.jpg), rather than an inferred image aperture.

Its front display origin is (25.05,18)mm. Control-center reservations are navigation(25,158), Back(170,158), Confirm(195,158), and four workspace keys at x64/88/112/136,y166. Navigation reserves 30mm; other caps reserve18mm. These are paper positions, not mechanism depths or comfortable reach. The side-wheel cue is an older exploration detail, rather than a current simulated control.

The rear mirrors X and marks a 185×160mm allocation boundary inside a 15mm perimeter allowance. Projected display/control backs occupy unknown depths; the area is not an empty board budget. Print at Actual size, verify the 100mm bar, and tile the 265×300mm pages on smaller paper. This is an inert proportion check, not a fabrication template. [Ergonomics and printer examples](ergonomics.md) retains the other measured study assumptions.

## Source studies by question

| Question | Original source and inputs |
| --- | --- |
| How do family materials and Caddy controls relate? | [Materials](combined-family-materials.png), [recessed identity](combined-family-caddy-v3.png), [control group](combined-family-caddy-v2.png), [branded family](combined-family-branded.png), [sage study](combined-family-sage.png); adjacent `*-prompt.txt` files retain exact inputs |
| How can one portable support three modes? | [Combined Companion](combined-companion.png), [two-device family](combined-family.png), [briefs](combined-system-prompts.txt) |
| How might handheld and station forms differ? | [Contour](architecture-a-contour.png), [Yoke](architecture-b-yoke.png), [Keel](architecture-c-keel.png), [briefs](architecture-prompts.txt), [earlier comparison](handheld-home-directions-v2.png) |
| What does rugged construction look like? | [Rugged Contour](contour-rugged-study.png), [prompt](contour-rugged-prompt.txt), [home/station study](contour-home-habitat.png), [inputs](contour-home-habitat-prompts.txt) |
| How do control arrangements affect reach? | [Instrument board](instrument-pitch-v1.png), [control family](control-family-v2.png), [workspace row](workspace-row-v1.png), [whole-face geometry](ergonomics.md) |
| What visual character could an enclosure have? | [Six directions](enclosure-divergence-v1.png), [five directions](five-enclosure-directions.png) |
| What did integrated-printer cases explore? | [Allocation](single-body-allocation-v1.png), [vertical keys](c-vertical-keys-v1.png), [screen prominence](screen-first-v2.png), [muted pad](prototype-a-muted-pad.png), [recline](prototype-a-reclined-grooves.png) |
| Which packaging image is unreliable? | [Printer cutaway](printer-tap-packaging.png): no manufacturer-derived path, common dimensional model or demonstrated service geometry |

Integrated-printer cases, separate Probe, living-scene Caddy and previous control layouts are scoped source studies. The current handheld-plus-Caddy responsibilities supersede their product allocation. Preserve the images and exact inputs without copying their obsolete arrangements into current rules.

## From appearance to a credible model

Convergence needs a single editable model in millimetres, explicit proposed dimensions and material assignments. Front, side, rear, section and service views use the same coordinate system. Check component intersections, opening paths, hand approaches and supported play before a beauty render claims fit. Generated appearance studies can inform character; they cannot establish or modify mechanical geometry. Physical mock parts and eventual board measurements must answer handling, refresh, power, thermal, radio and printer questions.
