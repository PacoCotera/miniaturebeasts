# Station Dock and arrival: concept brief

For the art director and the image-generation operator. Flat screen design, 1024×600 at 1×, edge to edge. Dock and arrival plays **on** the approved Home concept `art/concept-station/round3/A-r3-a1-1024x600.png`: its chrome, module column, vivarium, light and type are fixed; only what the arrival changes is new here. Layout only: `dock/layout/dock-arrival-wireframe.png`. The device in the dock is the Companion of `art/concept-homepage/hero-kit.png` (warm stone shell, charcoal bumpers, portrait screen, cross pad, teal Call, dark Back, orange Confirm). Light quality: `art/concept-homepage/station-research-hands.png`. Guide: `design/style-guide/station-screens.md` (The frame, Home, Dock and arrival); design: `design/proposals/station-loop.md` §"Cargo arrived", §2.

**Vibe (owner, 2026-10-07).** The overview (Home's frame, Dock and arrival) keeps the **industrial, plasticky hardware design** of A-r3-a1, because it mimics the device; the vivarium inside it is the cozy place for the pets. The research bench and the library have their own vibes and are not this screen's concern.

**Owner decisions carried in.** Smooth Inter type. Fine pixel grain on creatures and world only; chrome crisp. Module labels one engraved word (or two), small, low-contrast, read second. The name tag inside the vivarium sits on a small plate under the creature. Six pod wells (A-r3-a1 still shows eight: fix). Pip is placed, not re-imagined. Live text stays out of the art where possible. Terminology: pod, crate, bay, Shield, Probe, Companion (device), partner (mibi); never pocket, cairn or hull. The Station draws nothing of the field: no map, no live counters from the Companion.

## 1. Purpose
Cargo arrives when the Companion docks and the player opens the bay. Docking alone shows crates and accepts nothing; the open door is the result of a press. **Reads first:** how many crates are in the bay, then the ribbon.

## 2. The moment this candidate freezes
One still frame tells the story. The Companion is seated upright in the Probe dock module, its screen dark, a small lamp beside it lit green, the engraved word "Probe dock" quiet beneath. The sample bay door stands open, the inside lit by a cool blue-white beam. The front crate's seal is broken, its orange tag hanging, and its two pods are travelling along a short rail from the bay toward the pod rack: one is already seated in a well (four of six wells now filled: green, blue, violet, and the new amber-brown), the second is on the rail mid-curve. Behind the open crate a second sealed crate waits, slate and teal, orange seal tag intact, a small place stamp on its face (a mark, not words). A slim slate ribbon crosses the top of the stage: "Expedition 4 home · 2 pods". In the top bar the three counters are mid-tick, brighter than Home's. The Probe dock's Shield plates show two lit cream, one dark: the free mend to two bars. In the vivarium the residents turn toward the bay: Pip looks right, the glowtail and the puffcap too. Pip's plate still reads "Pip" / "hopper · adult". The frosted-glass nest at the lower right is now occupied by the partner, Dot, asleep: Dot is a second hopper, Pip's silhouette and colours (charcoal, cream belly, three leaves), slightly smaller, curled with eyes closed. Do not invent a new species.

## 3. Layout at 1024×600
- Frame as Home: top bar y 0–40; stage y 40–562; bottom line y 562–600; 16 px side margin.
- Vivarium x 16–656, y 52–550. Pip centred about x 340, y 300 (300×310), plate under at y 462–502. Glowtail lower left (x 50–160, y 390–470), puffcap right (x 510–620, y 370–470), nest lower right (x 560–644, y 470–540) with Dot.
- Module column x 672–1008: Sample bay y 52–162, Pod rack y 174–274, Incubation y 286–436, Probe dock y 448–550; 12 px gaps; lamp top right of each; label engraved top left.
- Ribbon: slim slate band x 16–1008, y 48–84, over the vivarium's top edge and the bay's top strip (the band is faintly translucent; "Sample bay" reads through it, second, as engraved labels should). Text centred, 3×.
- Bay: door hinged right, open; open crate front left (x 690–770, y 108–154), sealed crate behind right (x 800–870); the beam from the bay's ceiling.
- Rail: leaves the bay floor at the module's left edge (about x 680, y 150), drops through the gap and curves right above the wells to feed them from above; one pod on it at the curve.
- Rack: six wells in one row, centres x 708, 762, 816, 870, 924, 978 at y 236, 40 px across. Wells 1–4 filled, 5–6 empty.
- Probe dock: the Companion upright in a sunk cradle at x 690–762, about 120 px tall (y 438–550, its top rising into the gap without touching Incubation), screen dark; Shield plates ▮▮▯ to the right (x 890–990, y 500–518); lamp green.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 600" font-family="monospace" font-size="12" fill="none" stroke="#999">
<rect width="1024" height="600" fill="#1b1f24" stroke="none"/><rect width="1024" height="40" stroke="#777"/>
<text x="16" y="26" fill="#ddd" stroke="none">Home  T5</text>
<text x="400" y="26" fill="#ffd34d" stroke="none">⚡ 9  ◆ 4  ❀ 6  (mid-tick, brighter)</text>
<text x="770" y="26" fill="#ddd" stroke="none">● Companion docked · 2 crates</text>
<rect x="16" y="52" width="640" height="498" stroke="#8bb"/>
<rect x="16" y="48" width="992" height="36" fill="#2c3a44" stroke="#9bd"/>
<text x="340" y="72" fill="#eee" stroke="none" font-size="18">Expedition 4 home · 2 pods</text>
<text x="24" y="104" fill="#8bb" stroke="none">vivarium · residents look right toward the bay</text>
<circle cx="340" cy="300" r="150" stroke="#eda"/><text x="296" y="305" fill="#eda" stroke="none">Pip, looks right</text>
<rect x="290" y="462" width="100" height="40" stroke="#eda"/><text x="298" y="486" fill="#eda" stroke="none">plate: Pip</text>
<ellipse cx="105" cy="430" rx="55" ry="35"/><text x="70" y="434" fill="#9cf" stroke="none">glowtail →</text>
<ellipse cx="565" cy="420" rx="50" ry="45"/><text x="533" y="424" fill="#faa" stroke="none">puffcap ↗</text>
<rect x="560" y="470" width="84" height="70" rx="22" stroke="#bcd"/><text x="564" y="510" fill="#bcd" stroke="none">nest: Dot asleep</text>
<rect x="672" y="52" width="336" height="110" stroke="#9bd"/><text x="680" y="100" fill="#9bd" stroke="none">Sample bay · door open · cool beam</text>
<rect x="690" y="108" width="80" height="46" stroke="#f90"/><text x="694" y="136" fill="#f90" stroke="none">crate, seal broken</text>
<rect x="800" y="110" width="70" height="44" stroke="#f90" stroke-dasharray="4 3"/><text x="803" y="138" fill="#f90" stroke="none">sealed·tag·stamp</text>
<path d="M680 154 C 680 205 700 206 924 206 L 924 216" stroke="#9cf" stroke-dasharray="3 3"/>
<circle cx="700" cy="204" r="10" fill="#a86a3a" stroke="none"/><text x="716" y="208" fill="#9cf" stroke="none">pod on rail → well 5</text>
<rect x="672" y="174" width="336" height="100" stroke="#9bd"/><text x="680" y="192" fill="#9bd" stroke="none">Pod rack · six wells</text>
<g stroke="#8ab"><circle cx="708" cy="236" r="20" fill="#4a8a3a"/><circle cx="762" cy="236" r="20" fill="#3a5aaa"/><circle cx="816" cy="236" r="20" fill="#6a3a9a"/><circle cx="870" cy="236" r="20" fill="#a86a3a"/><circle cx="924" cy="236" r="20"/><circle cx="978" cy="236" r="20"/></g>
<rect x="672" y="286" width="336" height="150" stroke="#9bd"/><text x="680" y="304" fill="#9bd" stroke="none">Incubation · dome, leaf ring · quiet</text>
<rect x="672" y="448" width="336" height="102" stroke="#9bd"/><text x="790" y="470" fill="#9bd" stroke="none">Probe dock · lamp green</text>
<rect x="690" y="438" width="72" height="112" rx="8" stroke="#dcb"/><text x="696" y="498" fill="#dcb" stroke="none">Companion</text>
<rect x="890" y="500" width="28" height="18" fill="#eee" stroke="none"/><rect x="926" y="500" width="28" height="18" fill="#eee" stroke="none"/><rect x="962" y="500" width="28" height="18"/>
<text x="876" y="540" fill="#bcd" stroke="none">Shield ▮▮▯ · free mend</text>
<rect y="562" width="1024" height="38" stroke="#777"/>
<text x="16" y="586" fill="#f90" stroke="none">✓ Look at the new pods</text><text x="480" y="586" fill="#ddd" stroke="none">the room</text><text x="890" y="586" fill="#ddd" stroke="none">arrival playing</text>
</svg>
```

## 4. Light and material
As Home: one key light from the top left, even cool light on crisp chrome, the vivarium the only warm light. The bay's inner beam is cool blue-white, never warm; it lights the crates and the pods on the rail, not the vivarium. Crates slate and teal with orange seal tags; the broken seal hangs. Counters flash yellow while ticking. The Companion is matte warm stone with charcoal bumpers under the same cool light, its screen dark glass; a green lamp beside it. Dot in the nest shares the vivarium's warm light, dimmer behind frosted glass. No wood, felt, shelves or bench lamp.

## 5. Type and strings
Smooth Inter throughout, as A-r3-a1. Top bar: "Home  T5" (the turn jumps after the arrival, so still T5 here, T5 brighter); counters bolt "9", diamond "4", drop "6", all brighter, mid-tick; right: "Companion docked · 2 crates" with a green lamp. Ribbon, 3×: "Expedition 4 home · 2 pods" (the full design string is "Expedition 4 home · 2 pods · explored 9 of 21"; "9 of 21" is dropped in this frame to keep strings few). Plate: "Pip" / "hopper · adult". Module words, engraved and quiet: "Sample bay", "Pod rack", "Incubation", "Probe dock". Bottom line: "✓ Look at the new pods" | "the room" | "arrival playing". No other text anywhere: no digits on crates, no readouts, no words on the Companion's screen.

## 6. Other states (notes only)
- Docked, bay unopened: door shut, two crates visible behind its glass, bay lamp green; no ribbon, no rail; counters at rest; bottom line "✓ Open the bay · 2 crates" | "the room" | "Companion docked".
- Docked, Station not answering: Companion seated, dock lamp amber, door shut, crates dim; nothing ticks; the Companion's own screen carries that message, not the Station.
- After the arrival: door shut again, bay empty, six wells with four filled, ribbon gone, "Home  T8" (clock jumped), counters at rest at their new values; "✓ Look at the new pods".
- Bay full: three crates behind the door, no empty slot; "✓ Open the bay · 3 crates".

## 7. Pass checklist
- [ ] 1. Same device as Home: chrome, modules, vivarium, light and type match A-r3-a1; nothing moved, nothing re-skinned.
- [ ] 2. Docking alone accepts nothing: the open door reads as the result of a press (door swung, beam on), not a default.
- [ ] 3. Each crate's arrival reads as one event: one seal broken, its pods on one rail, the second crate still sealed and waiting.
- [ ] 4. The free mend shows on the Probe dock: two Shield plates lit, one dark.
- [ ] 5. Nothing of the field is drawn: no map, no explored count, no live Companion counters; the Companion's screen is dark.
- [ ] 6. A still frame tells the same story: crates in the bay, then the ribbon, in that reading order.
- [ ] 7. The Companion in the dock is the hero-kit Companion (stone shell, charcoal bumpers, portrait screen, cross pad, teal, dark, orange buttons), about 120 px, upright.
- [ ] 8. Six wells, four filled (green, blue, violet, amber-brown); one pod on the rail; two wells empty.
- [ ] 9. Residents react: Pip, glowtail and puffcap face the bay; Dot asleep in the frosted nest is Pip's silhouette, not a new species.
- [ ] 10. The vivarium stays the only warm light; the bay's beam is cool; counters flash yellow, nothing else glows warm on the chrome.
- [ ] 11. Labels engraved, quiet, read second; smooth Inter; fine grain on creatures and world only, chrome crisp.
- [ ] 12. Strings spelled right and no others (minor if garbled; major if an object or light is wrong); flat screen filling the canvas edge to edge, no bezel.
