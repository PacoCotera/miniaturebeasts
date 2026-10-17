# The Station experience review (T-20261016-168)

Creative director, 2026-10-17. Judged on the whole Station side by side: `results/T-20261016-175/device-sheet-1x.png` (46 frames, flow order Home → Decision panels). Also used: the owner's verbatims on T-163 to T-166 (06:38–06:43), the game designer's `specs/purpose-briefs-b20261017-1.md`, UI/UX's redesign briefs, `design/art-direction.md` and the style guide at 13e5c9d2.

This file sets the direction. It does not paint or lay out anything:
- the art director owns the look;
- UI/UX owns the layouts;
- the game designer owns the meaning.

Where this file differs from §8 of the style guide, this file wins, and the art director updates §8 to match.

---

## 1. What is incoherent across the device

Read the sheet top to bottom and the Station is five devices, not one. Every screen was approved alone, and each fix was right for its own screen.

| | What the sheet shows | Where |
| --- | --- | --- |
| **Grounds** | Five different fields: the slate field (Home, Vivarium), a brown painted stage (Pods, Probe bench, Incubator), a flat lilac field (Create), a sage louvred bay (Cargo) and paper (Library). Only the Library's paper is meant as a ground | every row |
| **The brown** | Brown is the device's default panel: Home's modules (#383029), the mibi's card and modules, the namer, all five decision panels and the Incubator's card. With the brown stages, it is brown on brown on brown, as the owner said | Home, up close, namer, panels, Pods, Probe, Incubator |
| **The cream** | The Incubator's ring and pod cap, the pods' caps, the Cargo ribbon plate ("The Companion is home") | Pods, Incubator, Cargo |
| **Frames** | Three frame metaphors. Home and Vivarium are full-bleed display. Pods, the Probe bench and the Incubator put a second riveted sage bezel inside the screen, a box seen through a window, so the device draws itself twice. Create has no frame at all | Pods, Probe, Incubator vs Home vs Create |
| **Panels** | Every pane is drawn differently: brown with an olive hairline (panels), a brown fill with a yellow-green border (Incubator card), double bevels (namer keys), plain boxes (Create). No two families share a pane | everywhere |
| **Plaques** | The genome stamp is a green plastic plaque on the Incubator and Pods, a flat label on the mibi's card, and a framed box on Create. One object, three looks | Pods, Incubator, Create, up close |
| **The pod** | The same pod is a blue spotted shell in Pods, the Incubator and Cargo, and a plain orange egg in the "Grow it now?" panel | Pods, Incubator, panels |
| **Type and density** | Home and Vivarium are rich and quiet. Create is a near-empty wireframe. The Probe bench and Create carry lines at 13 px or smaller ("each plate takes one strike / no plates: the trip ends"). Labels float on the painted stage ("Shield", "every Loika") | Create, Probe, Pods |
| **Metaphors** | Home is a living window; Pods is a sample case; the Probe bench is a service dock; the Incubator is an egg on moss; Cargo is a shelf; Create is a diagram. Only the first three are instruments of one lab machine | Incubator, Cargo, Create |

**The one finding under all of these:** only Home holds the owner's look, a living subject on a quiet slate machine. Every other family invented its own ground, pane and frame. **The redesign does not repaint five screens. It makes them one machine:** one ground, one pane, one frame, one pod, one stamp, with the life as the only colour.

## 2. The device-wide rules (apply to every family before its own direction)

These rules are the guide's, stated here as the order for this redesign:

1. **One ground.**
   - The stage is the display's slate (`ground`), with no brown and no lilac.
   - The only exceptions are the painted living window (Home, Vivarium, up close) and the Library's book.
   - Painted subjects keep their full Miniature Lives colour; the ground behind them does not.
2. **One frame.**
   - The housing frames the screen once.
   - Instrument screens (Pods, Create, the Incubator, the Probe bench, Cargo) **lose their inner riveted bezel**.
   - Their subject sits in a recess cut into the slate face, lit from the top left, with its contact shadow. Pods' fitted cut-outs are the model.
3. **One pane:** `panel` slate with the bevel and the hairline (§4 Pane), everywhere a pane exists. This includes Home's module panes, the mibi's card and modules, the namer, the Probe bench's Mend and Upgrade, and every decision panel. There is no coloured border, and no pane on a pane.
4. **One pod:** the species' own shell, painted once per species and used everywhere the pod appears (Pods, Create, the Incubator, Cargo and the panels). There are no generic eggs.
5. **One stamp:** the genome stamp drawn on the display with its text id beside it (§4 Stamp), the same on every screen. There is no plaque.
6. **Light does the work:**
   - device light (`mint` on `tealD`) for progress and change;
   - `amber` for needs-you;
   - `orange` for the action only.
   - Nothing else on the machine carries colour.
7. **Words:** the guide's §10 budget. No line under 16 px on the Station, and no label floating on a painting.
8. **Slate, as the owner ruled** (08:42: "slate is. ok"). The display ground is dark matte slate, and the life and the lit parts carry the colour. UI/UX's deep-blue sketches are repainted on slate.
9. **Paper is static, never status** (owner, 10:12: "paper is fine as long as it is not an interactive part of the device. you can add a paper tag to the pod, you cannot make a clipboard become a status screen").
   - Paper, tags and labels may appear anywhere, provided they never change while on screen.
   - Anything that changes with the player's input or with time is on the machine's display, lamps or moving parts, never paper.
   - **The pod's tag comes back**, as the field collector's label tied to the pod. It carries only what is fixed from the moment the pod was picked up: **where it was found**, as the place's mark or name, written once.
   - The species name, whether it is identified and what is known of it all change, so they live on the display pane, not the tag.
   - A tag never carries a state, a count or a mark that moves.

## 3. The direction for each screen family

### 3.1 Decision panels, and the shared pane (T-165): P1

- **Chosen: P1, two windows.** The owner's complaint was "side by side the two options look the same". The fix is to keep them side by side and make them differ.
  - P2 (one scene, two halves) doubles the art in dimmed variants and blurs which half is which at a glance.
  - P3 never shows both futures at once, so it fails the comparison the panel exists for.
- **Look:**
  - the slate panel over the veiled screen;
  - the title is the question, at most 4 words, at 20 px;
  - each window is its outcome, painted full-bleed in the window, the two differing in distance, size, direction, setting and light (the game designer's §6.1 table gives every scene);
  - under each window: the verb, the cost icons with figures, and one consequence line of at most 8 words, with a loss in `coral` and its cross.
- **Two windows is the norm.** A third appears only where the rules give three futures.
- **This pane is the device's pane.** The same slate pane, bevel and hairline become Home's modules, the mibi's card, the namer and every instrument's side pane. T-165 delivers the pane for the whole device, not only for panels.
- **Gate test (game designer §5):** cover the words, and the two windows still say "if I pick this, that happens".

### 3.2 The genome (T-166): G2's rack, with the body answering in light

- **Chosen: G2's structure, with the link G1 was reaching for done as light, not as leader lines.**
  - G1's callout panes pinned by dashed lines lay floating panes and lines over the painting (§5: no floating text over art). They also need a layout per rig (six rigs) and crowd on S09, which is drift built into the design.
  - G3 draws the animal twice.
- **What it is in the world:** the gene bench's readout. The founder stands in a scanning recess on the slate face, painted big and lit. Beside it, one column of rows is the machine's readout of its genome.
- **The rows:**
  - each row is headed by a crop of **this founder's own part** (its coat, its face, its legs and tail), or for a doing, its behaviour picture, with the chapter's one word;
  - each gene is a picture of the look it makes, at the tier size, in a lit socket.
- **The link:**
  - focusing a row lights that part on the founder with the machine's scan light (`mint`);
  - focusing a gene lights the part it makes;
  - a turn changes the founder in the same beat.
  - This is the "you know what you're looking at" the owner asked for, and it is what makes the screen read as an advanced instrument rather than a list. The machine scans the body as you move.
- **The tiles are the controls, and the drum tray goes. Accepted, on the game designer's four conditions** (`specs/redesign-genome-incubator.md`). The same gene must not be shown twice, as a tile and a drum; that would be a patch on a patch.
- **Marks:** the guide's §10 register, drawn as distinct silhouettes that read in four-gray. Plate 04e is redrawn for this.
- **Gate test:** "this row is its coat; this gene I can change, this one only breeding changes; this is what I changed".

### 3.3 The Incubator (T-163): candling, done as an instrument

- **What it is in the world:** the machine's candling chamber, a growth instrument built into the Station. **Candling stays** (owner, 06:43). The execution changes completely.
- **The chamber:**
  - the player's own pod (its species shell, §2 rule 4) is held upright in a clamp of the machine, inside a recess of the slate face, behind the chamber's clear, matte-edged glass (plate 03d);
  - there is no moss, no cushion and no plinth.
- **The candling:**
  - the machine's lamp shines up through the shell from below, in the device's light, not cream;
  - the shell turns translucent where lit, and the founder's form reads inside as a living silhouette;
  - **the parts already known show in their colour through the shell, and the unknown stay frost.** The candling therefore shows how much the player knows, not only that something grows.
  - The light pool stays within the chamber (§3 Light sources). There is no glow and no halo.
- **Time:** the ring around the chamber in `mint` on `tealD`, with the chapters as studs where a reveal will happen. Beside it, "ready in about n min", the one minute count the rules allow.
- **The reveal** is the event of each visit. When a chapter clears, its stud lights, and the revealed part is shown large in the side pane as the founder's own painted part (a look), or as a short behaviour moment (a doing, per the game designer's §1). The pane carries the trait's plain words only.
  - "Just cleared", glyphs and bare adjectives are gone.
- **The genome:** G2's pictures, compact, in the side column, with the cleared chapters lit as they clear.
- **The stamp:** drawn on the display with its text id (rule 5).
- **Gate test:** "the machine is candling something alive in my pod; it's about this far along; and this is what it just showed", said while pointing, without reading.

### 3.4 Cargo (T-164): the receiving bay, crate by crate (C2)

- **What it is in the world:** the Station's receiving bay. The Companion docks in the Caddy, and its crates slide through the bay door onto the bay floor, one crate per trip. The bay is part of the machine: the slate face, the floor and the bay door.
  - It is not a shelf, and it has no louvred sage wall.
- **Chosen: C2, crate by crate.**
  - The game designer's purpose is "one crate at a time, each a small reveal", and the owner's complaint was that the screen "relies more on text and tiny icons". C2 gives the biggest pictures and the clearest "where it goes".
  - C1's static frame is nine crossing flight lines.
  - C3 is a list, the old report again.
  - **Pace:** the crates open in turn by themselves, each skippable with any key, and ✓ takes everything in at once.
- **Each crate:**
  - the crate itself, with its place badge (which trip it was) at 32 px or more;
  - its contents laid out in front as the things themselves: pods as their species' shells, Energy as cells, Data as cartridges, Essence as vials, and finds as their objects.
- **Where things go:**
  - **the materials fly from the crate into the top bar's counters**, which tick. The top bar already is the Station's stock.
  - **No store tanks:** I overrule UI/UX's tanks and the §6.2 line on this. Three coloured tanks would be a second picture of the same three numbers. With their colour fills, they would be the next "colour bars".
  - **The pods** go out through the Pods hatch, which shows its free wells. A pod with no free well waits sealed on the bay floor, and the hatch shows that it is full.
- **What goes:** the colour bars, the materials row, the pod rack, "Fit the Probe upgrade", reach and the world rows (the game designer's §6.2 routes them to the Companion's map and the return signals), and the cream ribbon plate.
- **Gate test:** "this crate is from that trip; these came out of it; the energy went to my stock; the pods went to the rack".

### 3.5 The instrument family: Pods, Create's stage and the Probe bench

These were not rejected, but the device sheet shows they carry the same brown stage, inner bezel and plaque as the rejected screens. They are re-toned **as one family pass** once §2's ground, frame and pane exist, not as screen-by-screen tweaks:
- brown stage to slate face;
- the inner riveted bezel removed;
- recesses for the subject;
- the slate pane;
- the pod's tag, if shown, follows §2 rule 9;
- no floating labels;
- no line under 16 px.

The Probe stays upright in its vertical cradle (the owner's ruling). Create's lilac field and empty boxes go with the genome redesign (3.2).

### 3.6 Kept as accepted

- **Home, Vivarium, a mibi up close and Idle:** the living window leads, and it stays.
- **The only change** is their panes, which take the shared slate pane (§2 rule 3), so the accepted screens lose only their brown.
- **The Library** keeps its paper as its ground: the book is a page you read, and it never changes while on screen.

## 4. The order of redesign

| Step | Work | Why this order | Owners |
| --- | --- | --- | --- |
| 1 | **The style guide's plate batch** (T-173 fixes) | Every concept cites the guide. A guide whose plates contradict it would seed the next mess | art director, then both gates |
| 2 | **The shared pane and the decision panels** (T-165, P1) | Every other screen sits on this pane. Painting concepts before it exists repeats the brown | UI/UX layout, art director paint |
| 3 | **The genome** (T-166, G2 with the light link) | The Incubator's side column and reveal reuse its pictures | UI/UX, game designer, art director; genome engineer verifies |
| 4 | **The Incubator** (T-163, candling chamber) | It needs the pane, the pod and the genome pictures | UI/UX, art director, game designer |
| 5 | **Cargo** (T-164, C2) | It is independent of 3–4 and may be laid out in parallel. Its concept is judged with the others in the sheet, not alone | UI/UX, art director, game designer |
| 6 | **The instrument family pass** (Pods, Create's stage, the Probe bench) | It follows 2–4 as one batch, and needs a new ticket from the lead | art director, UI/UX |

**How the work is reviewed:**
- Concepts for steps 2–5 come as painted 1× PNGs, placed into the device sheet beside the live neighbours. I judge them as one set.
- No screen's concept is signed while its neighbours still carry the old look in a way that hides whether it fits.
- Small fixes are batched per family. A screen that needs a second patch on the same point goes back to concept.

## 5. Calls made here, for the record

| Question (asker) | Call |
| --- | --- |
| Genome: G1, G2 or G3 (UI/UX) | G2's rack, with G1's body link done as scan light; no leader lines |
| Tiles as controls, drum tray goes (UI/UX, game designer) | Accepted, on the game designer's four conditions |
| Panels: P1 or P2 (UI/UX) | P1 |
| Cargo: what it is, and C1 or C2 (UI/UX) | The Station's receiving bay; C2, crate by crate, auto-paced and skippable |
| Store tanks (UI/UX, game designer §6.2) | No. Materials fly into the top bar's counters |
| The Incubator's instrument (style guide §8, pending) | The candling chamber of 3.3 |
| Display ground | Slate: ruled by the owner, 08:42 |
| The Pods tag (lead, after the owner's 10:12 paper ruling) | It returns as a static collector's label: where the pod was found, written once. Species, identification and knowledge stay on the display |
