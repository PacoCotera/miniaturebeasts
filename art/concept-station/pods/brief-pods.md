# Station Pods: concept brief

For the art director and the image-generation operator. Flat screen design, 1024×600 at 1×, edge to edge, no bezel. Quality bar and sibling: `art/concept-station/round3/A-r3-a1-1024x600.png` (approved Home; its chrome, modules, light and type are what Pods must match so both read as one device). Anchor for the specimen stage: `art/concept-homepage/station-research-pod.png` (pod in a padded cradle under a beam; its icons and type are not specs). Layout only: `pods/layout/pods-wireframe.png`, `trait-window-states-wireframe.png` (their wooden-frame notes give way to instrument panes). Rejected: `design/proposals/ui-kit/station-trait-windows.png` (flat brown frames, blank frost, slab tray, bitmap type). Pip: `art/miniature-lives/assets/rich-plain-300x310.png`.

**Vibe (owner, 2026-10-07).** The Station's functions each carry their own vibe. The research bench (Pods, Create, Incubator, Probe bench) is a **modern digital lab**: clean glass, light surfaces or deep dark panes, precise readouts, the instrument lamp on the pod. Do not reuse Home's plasticky module chrome wholesale; Home's frame is the hardware overview. Still one device: the same type, counters, bottom line and light direction as Home. Judge candidates against this first. Round 1 was generated before this direction arrived and matches Home's chrome.

**Decided (carry in, do not reopen).** Station type is a smooth face, Inter, anti-aliased, never bitmap. Fine pixel grain only on creatures and world; chrome and type crisp. Module and object labels are one engraved word each, small and low-contrast, read second (the object and its lamp lead). Any name or caption inside a living window sits on a small tag or plate, never floating. The pod rack has exactly six wells. Pip's identity is placed, never re-imagined (charcoal, cream belly, orange eyes, three-leaf crest). Live text stays out of the art where possible; a candidate carries only the strings in §8. Terms: pod, crate, bay, Shield, Probe, Companion (the device), partner (the mibi). Never pocket, cairn or hull.

## 1. Purpose
- Identify a pod, study its trait windows, compare, return. **Reads first:** the pod and its name, within a second at 1×.

## 2. Information and hierarchy
1. The pod on its nest under the beam: the one warm thing on screen.
2. The four trait windows in an arc above it, and their states (which are open, which glint, which are frosted).
3. The fingerprint whorl on the stage plate, one petal lit.
4. The rack column at the left: six wells, three shells in place colours, the focused well lifted; the return gate with a leaf mark at its foot.
5. The top bar and the bottom line.

## 3. Layout at 1024×600
- Frame: top bar y 0–40; stage y 40–562; bottom line y 562–600. Unit 4 px, 16 px side margin, engraved hairline at y 40 and y 562.
- Top bar: "Pods  T5" left from x 16; counters centred around x 512; Companion state right-aligned to x 1008.
- Rack column x 16–176, y 52–550: a slate panel, six round wells of about 64 px stacked at 72 px pitch from y 64 (well 1 focused: cream ring, lifted 4 px, holding this hopper pod's green shell; wells 2 and 3 blue and violet shells; wells 4–6 empty, dark). Return gate x 40–152, y 496–546: a small hatch with an engraved leaf mark.
- Stage centre around x 600. Stage plate (brushed slate) x 380–880, y 440–510; the nest sits on it.
- Pod nest about 260 px wide centred x 600: x 470–730, y 290–500. Pod about 150×190 inside, cradle lip below it.
- Beam: a small instrument lamp housing at about x 470, y 236, under the arc's left; its cool cone falls down-right and pools warm on the pod.
- Four windows about 150×160 each (picture area about 130×110), in a shallow arc spanning x 300–904: markings x 300–448, y 70–230; crown x 452–600, y 56–216; colour x 604–752, y 56–216; gait x 756–904, y 70–230. One engraved word under each picture inside the ring; the markings line sits on a small plate under its window at y 236–254.
- Whorl 96 px on the plate at its right end: x 770–866, y 410–506.
- Name plate under the nest: x 520–680, y 506–536, "Hopper pod" at 28 px; origin line at 16 px centred x 600, y 540–558.
- Bottom line: ✓ part x 16–330 | subject centred around x 512 | what needs you right-aligned to x 1008.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 600" font-family="monospace" font-size="12" fill="none" stroke="#999">
<rect width="1024" height="600" fill="#1b2a33" stroke="none"/>
<rect width="1024" height="40" stroke="#777"/>
<text x="16" y="26" fill="#ddd" stroke="none">Pods  T5</text>
<text x="440" y="26" fill="#ddd" stroke="none">⚡ 9  ◆ 4  ❀ 6</text>
<text x="820" y="26" fill="#ddd" stroke="none">Companion away · with Dot</text>
<rect x="16" y="52" width="160" height="498" stroke="#8bb"/>
<circle cx="96" cy="96" r="32" stroke="#eda"/><text x="66" y="100" fill="#eda" stroke="none">focused</text>
<circle cx="96" cy="168" r="32"/><circle cx="96" cy="240" r="32"/><circle cx="96" cy="312" r="32"/><circle cx="96" cy="384" r="32"/><circle cx="96" cy="456" r="32"/>
<rect x="40" y="496" width="112" height="50"/><text x="54" y="526" fill="#999" stroke="none">gate · leaf</text>
<rect x="300" y="70" width="148" height="160" stroke="#eda"/><text x="318" y="150" fill="#eda" stroke="none">markings · open</text>
<rect x="452" y="56" width="148" height="160" stroke="#8bb"/><text x="476" y="136" fill="#8bb" stroke="none">crown · ✦ frost</text>
<rect x="604" y="56" width="148" height="160" stroke="#8bb"/><text x="630" y="136" fill="#8bb" stroke="none">colour · frost</text>
<rect x="756" y="70" width="148" height="160" stroke="#8bb"/><text x="776" y="150" fill="#8bb" stroke="none">gait · ∞ frost</text>
<text x="300" y="250" fill="#bbb" stroke="none">shows plain · hides pale</text>
<path d="M470 236 L600 300" stroke="#eda" stroke-dasharray="4 4"/><text x="380" y="276" fill="#eda" stroke="none">beam, upper left</text>
<rect x="380" y="440" width="500" height="70" stroke="#8bb"/><text x="392" y="500" fill="#8bb" stroke="none">stage plate</text>
<rect x="470" y="290" width="260" height="210" stroke="#eda"/><text x="520" y="400" fill="#eda" stroke="none">pod on nest · 260 wide</text>
<circle cx="818" cy="458" r="48"/><text x="792" y="462" fill="#999" stroke="none">whorl 96</text>
<text x="536" y="530" fill="#eda" stroke="none" font-size="22">Hopper pod</text>
<text x="498" y="556" fill="#bbb" stroke="none">rock field · a hopper felt safe</text>
<rect y="562" width="1024" height="38" stroke="#777"/>
<text x="16" y="586" fill="#f06d1e" stroke="none">✓ Study crown · 2 ◆ · ← Home</text>
<text x="430" y="586" fill="#ddd" stroke="none">Hopper pod · identified</text>
<text x="800" y="586" fill="#bbb" stroke="none">crown glints · something new</text>
</svg>
```

## 4. The specimen
- A hopper pod, so the window pictures are Pip's traits. A sealed, smooth seed-pod: warm green ribbed shell with the three-leaf mark embossed on its face, as in `station-research-pod.png`.
- Identified: the top of the shell has cleared to a soft translucence and the hopper's silhouette (round body, three-leaf crest) shows faintly through it; the lower shell stays opaque. A soft inner glow.
- On a padded cradle (moulded enamel or frosted glass, cream-grey, never felt or wood), on the slate stage plate.
- Under a cool instrument beam from above-left that pools warm on the pod; the cradle catches the pool's edge; the plate around it is cool.
- Origin line under the name plate: "rock field · a hopper felt safe".

## 5. The four windows
Machined instrument viewports: a brushed slate ring with a fine bevel, an engraved emblem on the ring (swirl, crown, drop, paw), one engraved word under the picture, a small status lamp on the ring (lit on an open window, dark on frost). Never an arch in a wooden frame, never a tray or a title bar. Left to right on this candidate:
1. **MARKINGS, studied.** The frost is gone: a close, warm drawing of Pip's plain charcoal flank, lit from the top left with the rich treatment's shading. On the sill, a misty pearl seed holding a ghost of pale islands (the hidden look). Line on its plate: "shows plain · hides pale". Lamp lit.
2. **CROWN, frosted with a glint.** Pale blue-white frost over the whole picture area and one crisp four-point star near the upper right. Lamp dark.
3. **COLOUR, frosted.** Pale blue-white frost, nothing behind it. Lamp dark.
4. **GAIT, family mark, frosted.** The same frost; two small joined rings engraved on the ring's lower edge. Lamp dark.
- Must not: frost never shows a blur, shape or hint of anatomy behind it (draw only what is known). The glint says "something new here", never what: no colour, no picture, no second symbol. The family mark is on the ring, not in the picture. No letters, ratios or loci anywhere. The three frosted windows differ by their marks and lamps, not by tint.

## 6. The whorl
- Round, 96 px, on the stage plate. Four petals clockwise from top left in the windows' order: markings, crown, colour, gait.
- Ink ridges: 3–7 nested arcs per petal, fine engraved lines in slate ink; fourfold symmetry keeps it pretty when plain.
- Only the markings petal is lit: charcoal fill with a small cream seed dot at its base. The other three stay plain ridges.
- The centre carries a tiny leaf emblem in the hopper's green. No code shown anywhere; codes appear only at Grow.

## 7. Light, material and type
- As Home (A-r3-a1): one key light from the top left; even cool light on all chrome, crisp edges, fine bevels, soft cast shadows. The pod is the warmest, brightest thing; nothing else warm but the open window's picture and the lit petal.
- Deep blue-teal ground; graphite and slate panels; enamel cradle; glass and frosted panes; small round status lamps (green lit, dark unlit; amber only where something needs you: the crown's glint does not use amber).
- Fine pixel grain allowed on the pod and the flank drawing; chrome, frost and type crisp. No wood, felt, shelves or evening greens.
- Inter, smooth, anti-aliased, tabular figures: pod name 4× (28 px) on the plate under the nest; origin 2× (16 px) mist; one word per window at 2× small, low-contrast engraved; window line 2×; top bar and bottom line 2×, screen name 3×. Cream on chrome; the ✓ verb in orange; context in mist.

## 8. Exact strings (no other text)
- Top bar: "Pods  T5" · counters as a yellow bolt "9", a blue diamond "4", a green drop "6" · "Companion away · with Dot".
- Name plate "Hopper pod"; origin "rock field · a hopper felt safe".
- Window words "markings", "crown", "colour", "gait"; window line "shows plain · hides pale".
- Bottom line: "✓ Study crown · 2" with a small blue diamond, then "← Home" | "Hopper pod · identified" | "crown glints · something new".

## 9. States of the screen (notes, not in this candidate)
- Unidentified pod: shell fully opaque, no inner silhouette, no windows above (the arc is empty chrome), whorl absent; bottom line "✓ Identify · 1 ⚡"; subject "Hopper pod" only if already known, else the place.
- Compare: a second pod of the same species slides in beside the first at 300 ms, both nests narrower; the two arcs align window for window; differing windows pulse.
- Return gate focused: the cream ring walks to the gate, it lifts; "✓ Return to the wild · +1 ❀".
- Shutter state for a window: closed horizontal slats in the ring with a small picture of what opens it (a crystal, Probe tier 2), never a bare "?".
- Through and through (any window): no seed; a small solid base under the drawing.

## 10. Pass checklist (yes / no)
1. Frosted windows show nothing behind the frost; only what is known is drawn.
2. The six window states can be told apart without colour (frost, star, seed, base, rings, slats).
3. The whorl is pretty when plain and its one lit petal reads as a study.
4. No letters, ratios or loci anywhere; no code.
5. The pod is the warmest, brightest thing on screen; chrome stays cool.
6. Windows read as machined instrument viewports, not wooden frames or arches.
7. Reads as the same device as Home (A-r3-a1): same chrome, lamps, light and type.
8. The rack has exactly six wells, three shells in place colours, the focused well lifted; a gate with a leaf mark.
9. Labels are one engraved word each, small, low-contrast, read second; names and captions sit on plates, never floating.
10. Pip's identity is placed: the flank drawing is charcoal with the rich treatment's light; the silhouette has the three-leaf crest.
11. Strings as §8, legible at 1×, spelled right (minor fail if garbled; major fail if an object or a light is wrong).
12. Flat screen, no bezel, fills the canvas edge to edge; no wood, felt, shelves, pocket, cairn or hull.
