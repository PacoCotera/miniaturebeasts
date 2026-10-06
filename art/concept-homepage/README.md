# Homepage concept art: generated candidates

Everything in this folder is a **generated candidate** for the seven shots in
[`../concept-brief-homepage.md`](../concept-brief-homepage.md). Nothing is accepted
yet, nothing is placed on the page, and every image is concept art: caption it so
("Concept art"; "Concept screen, not from the build"), never as a capture.

[`prompts.json`](prompts.json) holds every call: the brief's prompt verbatim, the
reference images and their roles, the model, the sizes, the result and its hashes.
[`manifest.json`](manifest.json) lists every file with dimensions and SHA-256, the
crop and keying steps behind the derivatives, and the caveats. `raw/` keeps the
unaltered JPEG the API returned for each kept candidate; `rejected/` keeps the
other attempts as PNG, named by shot and attempt.

Tool: Gemini API, `generateContent` with image output at 2K. Two image models were
available to the key and both were used: `gemini-3.1-flash-image` and
`gemini-3-pro-image`. Outputs are 2528×1696 JPEG (or the portrait equivalent),
resampled with LANCZOS to the brief's sizes and stored as PNG. The API offers no
transparent output, so L1's alpha is keyed from a flat white background.

**Where generation stopped.** During the second L1 attempt the API returned
HTTP 429, "Your project has exceeded its monthly spending cap". No shot got a third
attempt and L1 has a single attempt. Each other shot had two attempts, one per model
(H1 pass A had three).

![Contact sheet](contact-sheet.png)

## The candidates

| Shot | File | Kept attempt | Model |
| --- | --- | --- | --- |
| H1 `hero-kit` | `hero-kit.png` 1536×1024 | pass A attempt 3, pass B attempt 2 | A: pro, B: flash |
| C1 `companion-map-hands` | `companion-map-hands.png` 1536×1024 | attempt 2 | flash |
| C2 `companion-storm` | `companion-storm.png` 1024×1536 | attempt 2 | flash |
| K1 `caddy-print` | `caddy-print.png` 1536×1024 | attempt 1 | pro |
| S1 `station-research-pod` | `station-research-pod.png` 1024×600 (crop of `-canvas.png`) | attempt 1 | pro |
| P1 `partner-patch` | `partner-patch.png` 900×1200, `-450x600.png` (crops of `-canvas.png`) | attempt 2 | flash |
| L1 `pip-life-stages` | `pip-life-stages.png` 1536×1024 RGBA | attempt 1 (only one) | pro |

`hero-kit-passA.png` is the pass A result (four-button Companion, new screen) that
pass B edited; it is kept because C1, C2 and K1 were generated against the pass B
result, so the device reference chain is on record.

## Checklist results per candidate

Judged at the size the page shows each image and, for screens, at 1×.

### H1 `hero-kit`
- Pass: Call sits directly above Back, both left of a visibly larger Confirm; Call is
  teal and ringed; the pad is on the left; speaker holes between; no extra controls.
  Shell labels CALL, BACK, CONFIRM are present, though CALL sits under the pad.
- Pass: Companion screen shows the HiBit clearing, "))) call Pip" top right,
  "✓ Bring Pip along" and "← menu" on the bottom line, spelled exactly.
- Pass: Station header "MINIATURE BEASTS / Research · Hopper pod", Data 4, Energy 5,
  Essence 2, footer "Findings saved"; Caddy e-paper "Hopper pod · waiting", counts
  4, 5, 2, "Pip · PIP-001", "1 resident"; Cached and Connections lines removed.
- Pass: Pip is plain-coated with cream belly, orange eyes and three leaves on all
  three devices.
- **Fail:** the printed card still reads "Sample A". The pass B prompt lists only
  screen strings, so the card was never asked to change. One more small edit is
  needed, or the card string gets covered on the page.
- Partial: outside the edits the render matches family-concept-v2 to the eye; small
  drift is visible on the Station header's original layout and the pad is drawn a
  little larger. The 50 % overlay check is for the owner.
- Rejected: pass A attempt 1 leaked the screen's bottom line onto the whole render
  and turned the pad teal; pass A attempt 2 drew no Back button; pass B attempt 1
  dropped the Station's "MINIATURE BEASTS" header line and garbled "call Pip".

### C1 `companion-map-hands`
- Pass: buttons follow rule 3 and the thumbs rest on the pad and on Confirm.
- Partial: seen cells (muted) and visited cells (white dots) read; **no cleared cell
  with a tick** is drawn. The dotted range square encloses 3×3 cells, not 5×5. All
  five signs read (paw prints, pulse arcs, bolt, pin, burrow).
- Pass: fog dominates and the revealed patch is small; the rain band is at the left.
- Pass: HUD "⚡5" and "))) pin 1"; bottom line "✓ Go down · wood · slow beat ·
  ← Wait · Send home", spelled exactly. The shield row shows two bright bars and one
  dimmed rather than three white.
- Minor: a ring on one finger, which the prompt excluded.
- Rejected: attempt 1 drew a Companion with no buttons at all; its map was the
  stronger one (all three cell states and all five signs), kept in `rejected/` as
  a screen reference.

### C2 `companion-storm`
- Pass: HUD reads as Shield 2 of 3, a filled pod outline and an empty one, a tiny
  Pip face, two storm bolts, "⚡5" and a teal "))) call" at the right.
- Pass: the charged stone, the warned tile (yellow outline with a bolt) and the
  shelter of the tree are each distinct; Pip stands beside the pawn under the tree.
- Pass: Pip matches the HiBit Pip (charcoal, cream belly, orange eyes, three leaves).
- Partial: it reads as a storm and is green rather than brown or grey, but darker and
  less playful than the brief asks.
- **Fail (minor):** a small purple-grey token at the left edge of the screen is an
  invented element (carried over from the prototype reference).
- Rejected: attempt 1 is more saturated and playful but its shield icon does not read
  as 2 of 3 and its bottom line wraps onto two lines.

### K1 `caddy-print`
- Pass: the printed Pip has the same silhouette, crown and plain coat as the screen
  Pip, in black dithered print on white only.
- Pass: the card says only "Pip" and "PIP-001" with a thin rule.
- Pass: no status lights; no Critter Lab mark; the Caddy matches the hero's Caddy
  (materials, PRINT and FEED, slot, e-paper beside it, docked bases in frame).
- Partial: the Dirty Pawz Press mark the prompt asks for is not visible in this
  crop, and the MINIATURE BEASTS embossing sits outside the frame. (The checklist's
  "no marks other than MINIATURE BEASTS" line conflicts with rule 4 and the prompt;
  the brief should say which it means.)
- Rejected: attempt 2 re-rendered the whole kit, greyed out the Station screen,
  lifted the Companion off the dock with a blank screen and floated the card in
  mid-air with two Dirty Pawz Press marks.

### S1 `station-research-pod`
- Pass: the sealed pod is the subject, in a padded cradle under a warm pool of light,
  with the three-leaf mark; nothing inside is shown.
- Pass: "Hopper pod", amber "Needs 2 more Essence", "Hopper · known" and the counts
  4, 5, 2 read at 1024×600.
- Pass: Pip matches the rich Pip (plain coat, cream belly, orange eyes, three
  leaves, three-quarter pose facing viewer-left).
- Pass: no tables, lab glassware or report look; it reads as a game screen.
- Note: the model placed the header bar in the canvas's top margin, so the
  1024×600 crop is the top 900/1024 band of the canvas, not the centred band.
- Rejected: attempt 2 is close (olive pod in a bowl cradle, Pip in a tile); the kept
  one follows the prompt's pod colour, cradle and spot light more closely.

### P1 `partner-patch`
- Pass: Pip reads as the HiBit Pip at 450×600, 1× (`partner-patch-450x600.png`).
- Pass: the Call ring around the pawn, the glinting soil and Pip beside the pawn
  read as one moment; Pip looks up at the pawn.
- Partial: the HUD (three shield bars, two pod outlines, tiny Pip face, "⚡3",
  "))) call") and the bottom line ("✓ Dig here · meadow · ← Wait · Leave") follow
  rule 5 and are spelled exactly, but the model drew them on the dark margin
  **outside** the 900×1200 block. The cropped screen therefore holds the scene only;
  see `partner-patch-canvas.png` for the HUD and bottom line as generated.
- Minor: the buried pod is drawn visibly in the soil rather than only as a glint;
  the pixel grid is generated, not an exact 2× of 450×600.
- Rejected: attempt 1 filled the whole canvas with the screen (no 3:4 block to
  crop), drew the dew cups as large bowls and its HUD's Pip face as a white blob.

### L1 `pip-life-stages`
- Pass: coat, cream belly, orange eyes and three crown lobes are the same in all
  three; no added marks, horns or tails.
- Pass: age reads from proportion and bearing: the juvenile is smaller and rounder
  with larger eyes and bright buds; the elder is heavier and lower-set with
  half-lidded eyes and broader, drooping, deeper green leaves.
- Partial: the adult is close to the rich Pip but not an exact copy; the elder's
  cream muzzle area is a little larger than the others'. The three figures are not
  confined to equal 512×1024 cells (the adult and elder cross the cell lines).
- Pass: transparent alpha with no halo (keyed from a flat white background; canvas
  corners are alpha 0). This is keyed, not generated, alpha.
- Only one attempt: the second was refused by the spending cap.

## Limits

- Generated pixel-style screens are resampled 2K outputs, not authored native
  450×600 masters; a production renderer still has to draw the real HUD and bottom
  line from the design.
- Device renders show the devices as designed as far as the model followed the
  prompt; the checklist lines above say where it did not.
- Nothing here establishes a runtime, a renderer or hardware behaviour.
