# Station Pods v2: brief for the "Pod list and Read" screen

Second brief, after the owner rejected round 3 ([README](README.md): trait windows and a petal whorl that did not scale to the genome, five wells, leaked captions, a cow hide). It is built on the approved [research loop](../../../design/proposals/research-loop.md) (§4, §6, §7, §8 rows "Pod list" and "Read"), the [species frames](../../../design/proposals/species-frames.md), the Station screens proposal ("Pods", "Chapters and pages") and the [style guide](../../../design/style-guide/station-screens.md) ("Four rooms, four vibes", "Pods"). Flat screen, 1024×600 at 1×, edge to edge, no bezel. Sibling and quality bar: `art/concept-station/round3/A-r3-a1-1024x600.png` (approved Home). The ring: `prototypes/genome-ring/img/station-300.png` and `station-300-unread.png`. Pip: `art/miniature-lives/assets/rich-plain-300x310.png`. No image generation is part of this brief.

**Owner rules, carried in.** The research bench is a **modern digital lab**: clean glass, light surfaces or deep dark panes, precise readouts, the instrument lamp on the pod; not Home's plasticky modules, yet one device with Home (same Inter smooth type, the same bolt, diamond and drop counters, the same bottom-line grammar, light from the upper left). Fine pixel grain only on creatures and world; chrome and type crisp. Labels are one engraved word, small, low-contrast, read second. Any name or caption inside a living window sits on a tag or plate, never floating. Exactly six wells. No digits of progress or locus counts anywhere. Pip's identity is placed, never re-imagined. The genome ring is the prototype's render placed, never re-imagined. Pods come from one renderer with species parameters (size class, proportion, shell pattern family, colour pair, glyph), so pods of a species match and never reveal an individual's genes.

## 1. Vibe and sibling
Deep dark glass and anodised graphite with lit edges, a floating glass stage plate, one cool beam, exact readouts: a lab, not a cottage and not Home's module rack. Next to A-r3-a1 it must read as the same device in another room: the same top bar and bottom line, the same counters, the same type, the same key light from the upper left, the same crisp chrome around one warm living thing.

## 2. Purpose and reads first
Identify a pod, read its chapters, compare, return. **Reads first:** the pod and its name, within a second at 1×; then which chapter glints (the star on its tab); then the price in the bottom line.

## 3. Information hierarchy
1. The current pod on its nest under the beam: the one warm thing on screen.
2. Its chapters as an arc of tabs above it, and the focused chapter open as a page of trait pictures beside it.
3. The genome ring, 300 px, on the stage plate, unread chapters as hairlines.
4. The pod list column: six wells, each with its place stamp, species glyph or seal, and progress ring; the current pod marked by the warm focus ring and lifted; the return gate with its leaf at the foot.
5. Top bar and bottom line.

## 4. The progress ring on the list
A 60 px ring around each shell in its well, a 3 px track. The **centre** (a soft grey disc behind the shell) fills at Identify. Then **one arc per chapter**, in the chapters' order clockwise from the top, each arc's length proportional to its trait count, 4 px gaps between arcs: unread arcs are hairlines, read arcs full weight. A tiny four-point **star** sits on an arc that glints. A **notch** (a gap with a tick) marks a sealed chapter. Never a digit, never a fraction.
**Hopper** (4 arcs over 5 traits): Coat one fifth of the circle, Face two fifths, Movement one fifth, Stamina one fifth; in the candidate Coat is solid, Face a hairline with a star, Movement and Stamina hairlines, so it reads "a little done, something new in the big arc". **Glowtail** (7 arcs over 23 traits: Coat 4, Face 3, Shape 3, Legs & tail 4, Movement 4, Stamina 3, Nature 2): finer arcs, 3 px gaps, a visibly denser ring that still reads filled or not at a glance. A puffcap's ring shows four arcs (Coat 3, Shape 4, Movement 3, Nature 2) with the Nature arc notched.

## 5. Layout at 1024×600
The task's trial boxes collide (a 280 px pod and a 300 px ring cannot stack in a 522 px stage, and the pod at x 640–880 sits inside the ring's box), so the three stage objects share one band: **page left, pod centre, ring right.** Unit 4 px, 16 px side gutter, engraved hairlines at y 40 and y 562.
- Frame: top bar y 0–40 ("Pods  T5" from x 16, counters centred around x 512, Companion state right-aligned to x 1008); stage y 40–562; bottom line y 562–600 (✓ part from x 16 | subject centred around x 512 | what needs you right-aligned to x 1008).
- List column x 16–176, y 52–550, a graphite panel: six round wells of 64 px at a 72 px pitch from y 64 (centres x 96; y 96, 168, 240, 312, 384, 456), each a shell with its place dust, glyph or seal, and progress ring; well 1 is the current hopper pod, lifted 4 px inside the cream focus ring; well 2 an identified puffcap pod with four hairline arcs and a notch; well 3 a sealed unknown pod with an empty ring; wells 4–6 empty and dark. Return gate x 40–152, y 496–546, a small hatch with an engraved leaf.
- Chapter arc: N machined tabs of 72×36, centred on the pod's axis x 578, on a shallow arc that drops 16 px toward its ends (4 tabs at a 128 px pitch, centres x 386, 514, 642, 770, the inner pair y 56–92, the outer pair y 72–108; 7 or 8 tabs at a 96 px pitch, spanning about x 254–902). Each tab carries an emblem and a small lamp; its one word sits under it at 2×, engraved. The focused tab's lamp is lit and a hairline runs from it to the page. Never more buttons than tabs.
- Open page x 192–456, y 130–420: a deep pane of dark glass with a lit inner edge, warm from inside when read; one trait picture of 150×110 per row, centred (x 249–399), its line on a small plate 14 px below; two rows visible (pictures at y 160 and y 290), more traits scroll within the page.
- Pod on its nest x 464–692, y 170–450: the pod about 150×190 centred on x 578 in a moulded frosted-glass cradle (never felt or wood); the instrument lamp housing at about x 470, y 126 under the arc, its cool cone falling down-right and pooling warm on the pod.
- Name plate x 488–668, y 456–486, "Hopper pod" at 28 px; origin line y 490–508, centred on x 578.
- Stage plate x 692–1008, y 232–548, a glass plate with a brushed rim; the real ring 300 px at x 700–1000, y 240–540, placed from the prototype render.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 600" font-family="sans-serif" font-size="12" fill="none" stroke="#999">
<rect width="1024" height="600" fill="#141c22" stroke="none"/>
<rect width="1024" height="40" stroke="#777"/><rect y="562" width="1024" height="38" stroke="#777"/>
<text x="16" y="26" fill="#ddd" stroke="none">Pods  T5</text><text x="446" y="26" fill="#ddd" stroke="none">⚡ 9  ◆ 4  ❀ 6</text><text x="820" y="26" fill="#ddd" stroke="none">Companion away · with Dot</text>
<rect x="16" y="52" width="160" height="498" stroke="#8bb"/>
<circle cx="96" cy="96" r="32" stroke="#eda"/><text x="40" y="100" fill="#eda" stroke="none">current · ring</text>
<circle cx="96" cy="168" r="32"/><circle cx="96" cy="240" r="32"/><circle cx="96" cy="312" r="32"/><circle cx="96" cy="384" r="32"/><circle cx="96" cy="456" r="32"/>
<text x="62" y="172" fill="#999" stroke="none">puffcap</text><text x="68" y="244" fill="#999" stroke="none">sealed</text><text x="70" y="316" fill="#666" stroke="none">empty</text>
<rect x="40" y="496" width="112" height="50"/><text x="54" y="526" fill="#999" stroke="none">gate · leaf</text>
<rect x="350" y="72" width="72" height="36" stroke="#eda"/><rect x="478" y="56" width="72" height="36" stroke="#8bb"/><rect x="606" y="56" width="72" height="36" stroke="#8bb"/><rect x="734" y="72" width="72" height="36" stroke="#8bb"/>
<text x="372" y="124" fill="#eda" stroke="none">Coat</text><text x="500" y="108" fill="#8bb" stroke="none">Face ✦</text><text x="612" y="108" fill="#8bb" stroke="none">Movement</text><text x="744" y="124" fill="#8bb" stroke="none">Stamina</text>
<path d="M386 108 L386 130" stroke="#eda"/>
<rect x="192" y="130" width="264" height="290" stroke="#eda"/><text x="204" y="150" fill="#eda" stroke="none">page · Coat · lit inside</text>
<rect x="249" y="160" width="150" height="110" stroke="#eda"/><text x="262" y="220" fill="#eda" stroke="none">markings · seed</text>
<text x="246" y="296" fill="#bbb" stroke="none">shows plain · hides pale</text><text x="204" y="400" fill="#666" stroke="none">row 2 · more scroll</text>
<path d="M470 126 L578 220" stroke="#eda" stroke-dasharray="4 4"/><text x="470" y="160" fill="#eda" stroke="none">beam</text>
<rect x="464" y="170" width="228" height="280" stroke="#eda"/><text x="502" y="320" fill="#eda" stroke="none">hopper pod on nest</text>
<rect x="692" y="232" width="316" height="316" stroke="#8bb"/><circle cx="850" cy="390" r="150"/><text x="786" y="394" fill="#999" stroke="none">ring 300 · placed</text>
<rect x="488" y="456" width="180" height="30" stroke="#eda"/><text x="524" y="477" fill="#eda" stroke="none" font-size="20">Hopper pod</text>
<text x="488" y="504" fill="#bbb" stroke="none">rock field · a hopper felt safe</text>
<text x="16" y="586" fill="#f06d1e" stroke="none">✓ Read Face · 2 ◆ · ← Home</text><text x="440" y="586" fill="#ddd" stroke="none">Hopper pod · identified</text><text x="840" y="586" fill="#bbb" stroke="none">Face glints · something new</text>
</svg>
```

## 6. A read result as pictures
Each trait on the page is one close, warm drawing of that part of this pod's mibi (the rich treatment, lit from the upper left, grain allowed), with one short line on its plate. **Shows and hides:** the look that shows, and on the sill a misty pearl seed with a ghost of the hidden look inside: "shows plain · hides pale". **Only:** no seed, a small solid base under the drawing: "only tall crest". **Asleep:** the look drawn sleeping, eyes shut, soft: "asleep: bands, if they wake". **Breed to change:** two joined rings on the plate of a doings trait: "breed to change".
**Unread page:** cool blue-white frost over the whole pane, nothing behind it, not even a blur. **Sealed chapter:** the tab shut, a notch in its edge, and a small picture of the crystal that opens it on the page; never a bare "?".
**Prices:** the bottom line reads "✓ Read Face · 2" with a blue diamond; a chapter already read on an earlier pod of the species costs half; the first read ever is free. A read chapter's tab offers the free "Detail" instead of a price.

## 7. The pod from the renderer
One seed-pod form for every species: body, seam, cap, short stem; the accepted material and light; the outline rule; the glyph on the cap. **Candidate, the hopper pod:** medium (about 150×190), squat (body wider than tall, a low cap), a smooth-dot shell, charcoal body with cream dots, seam and cap; the three-leaf glyph on the cap, lit, with the seal's crack line across the cap now that it is identified; the rock field's grey dust at its base. Nothing on the shell says plain or pale.
**Corner note, same renderer:** the **puffcap** pod is large and tall, its shell in radial segments, coral with marigold seams and cap, the wide-cap glyph; the **glowtail** pod is small and squat, its shell in overlapping plates, lagoon with marigold plate edges, the bulb-on-a-tail glyph. Only size, proportion, pattern, colour pair and glyph change; the form, seam, stem, material and light are one.

## 8. The states of the screen
**Unidentified:** the cap sealed and the glyph hidden, no tabs in the arc, the ring absent from the plate, the bottom line "✓ Identify · 1 ⚡".
**Identified, nothing read:** the ring shows only its grey band and glyph, every tab hairline, the page frosted.
**Partly read with a glint (the candidate):** Coat read and its page lit, the Face tab wearing a star, Movement and Stamina hairline and frosted.
**Fully read:** every sector of the ring marked, every tab full weight, every tab offering "Detail".
**A sealed chapter:** the puffcap's Nature tab shut with a notch, its page showing the small crystal picture, the ring notched at that sector.

## 9. Scaling
The hopper's 4 tabs, the glowtail's 7 and a later species' 8 share one arc at one tab size; the pitch closes from 128 to 96 px and nothing else moves. More loci make fuller pages (two rows of trait pictures, the pad scrolling within the page) and a denser ring (more, finer spokes in the same 300 px); never more buttons, never a second row of tabs.

## 10. Light, materials, type
One key light from the upper left; even cool light on glass and graphite, crisp edges, fine bevels, soft cast shadows. The pod is the warmest, brightest thing; the open page is lit warm from inside; everything else cool. Inter, smooth, anti-aliased, tabular figures: pod name 4× (28 px) on its plate, origin 2× in mist, chapter words 2× engraved and quiet, trait lines 2× on small plates, top bar and bottom line 2×, screen name 3×. Cream on chrome, the ✓ verb in orange, context in mist.
**Exact strings, nothing else:** top bar "Pods  T5", a yellow bolt "9", a blue diamond "4", a green drop "6", "Companion away · with Dot". Plate "Hopper pod"; origin "rock field · a hopper felt safe". Tabs "Coat", "Face", "Movement", "Stamina". Page (Coat), one trait: "shows plain · hides pale". Bottom line "✓ Read Face · 2 ◆ · ← Home" | "Hopper pod · identified" | "Face glints · something new".

## 11. Pass checklist (yes / no)
1. The list shows every pod at a glance: place stamp, glyph or seal, progress ring, glint star, what it waits for; the current pod marked; six wells and the gate.
2. The progress ring reads at a glance with no digits.
3. The chapters read as arcs (tabs) and as pages; the glinting chapter is found in one glance; what each read costs is in the bottom line.
4. The result is pictures: shows and hides (seed), only (base), asleep, breed to change (joined rings); all seven states told apart without colour.
5. Unread shows nothing: frost with nothing behind it, hairlines on the ring; no guesses for unread parts.
6. Never: digits of progress, locus counts, letters like Pp, ratios, or "locked" used for "unknown".
7. The genome ring is the prototype's render placed, not redrawn; pretty with only its band; holds up in one colour.
8. The pod is the warmest, brightest thing; the chrome stays cool.
9. Pods of one species match and come from the renderer; no shell shows an individual's genes; Pip's identity is placed.
10. One device with Home (Inter, counters, bottom-line grammar, light from the upper left) in a modern digital lab, not Home's modules.
11. Labels are one engraved word, small, low-contrast, read second; names and captions sit on plates, never floating.
12. Strings exact (minor fail if garbled, major fail if an object or a light is wrong); flat screen, no bezel, edge to edge.
