# Main Sequence (Tumbling Dumpling Studio): what the art team learns

The owner asked for this at 14:23. I cover the look; UI/UX covers structure and interaction. The annotated sheet of 9 frames (built by `make-sheet.py`) was shared with the lead and kept out of this repository, since its frames are the game's own images; the frame numbers below refer to it.

## What I saw, and what I didn't

- **Seen:** the Steam store page's text and 12 of its 13 screenshots (one didn't download). Both store trailers, Gameplay (75 s) and Demo (101 s), sampled as stills every 4 s with ffmpeg: 44 frames in all.
- **Not seen:** the trailers as continuous motion (stills only, no sound), the demo itself (not played), the press kit, and any gameplay videos off the store page. Motion and feel are judged only from stills.

## What it is

A first-person space factory builder. Its stations are white-and-grey modular hard surfaces, with one orange accent and charcoal panels under bright studio light. Its world is entirely machine.

## Why it reads as "a station you run"

This is the owner's Home point ("doesn't look like a station to manage your game").

1. **The base is a place full of working machines, each showing its own state:** a glowing cell, a green lamp (frame 1). You read how the factory is doing from the objects, not from a panel.
2. **The flow is visible.** Belts join the machines, so you see things move from one to the next (frame 2).
3. **The UI is cut from the world's kit.** Panels share the hulls' chamfers and the one orange accent, so the screen and the station feel like one machine (frame 3).

All three are principles we already hold ("one machine", "the machine shows what changes"). Main Sequence shows them carried through the whole screen. Our rejected Home showed them only in its lamps.

## Adopt

- **State on the object, not in a list.** Home's modules should show their work as things (the bud in its chamber, crates in the bay, pods in their wells), each with its own light. This is where Home's round 2 was going.
- **Visible flow between the parts.** It is the strongest single lesson for Home. Lines of hand-off that the player sees (the bay's chute, the feed into the vivarium, a pod carried to the Incubator) make the screen a station, not a menu. It is my T-186 proposal 4, now with a reference.
- **One painted kit, recoloured** (frame 4). This is the T-200 method, confirmed by a shipped game: colour is a layer over the same painted model.
- **The device's own display** (frame 5). Readouts sit on the cockpit's dash, not on a HUD. Ours belong on the Station's face.
- **Red only for real danger** (frame 6), as our T-196 rule now says.

- **Trees for complex structured data** (frame 8), amended by the owner at 14:49: "the trees are valuables for certain screens, a genome for example. so dont discard them comoletely. the intellectual player appreciates the structure that trees give to complex data."
  - **Where they belong:** the genome (loci and chapters), lineage, and anywhere else the mechanics player reads structure.
  - **Our version:** the nodes are pictures, such as chapter emblems, look tiles and faces, more than named boxes. Lanes stay as quiet grouping, and locks and gaps are drawn as shapes. The tree is still in our slate kit.
  - **Avoid them only where a picture serves better,** as on Home and the decision panels.

## Don't adopt

- **The look itself.** White plastic under studio light, with no life in it, is the "sterile lab" our art direction rules out. Main Sequence is all instrument; we are life first. Their station is the subject. Ours holds the subject.
- **Holograms, blueprint grids and glowing previews** (frames 7 and 9): the sci-fi HUD our guide forbids.
- **Key-prompt labels and text legends.** The owner has said our panels already rely too much on text.
- **Density.** Dozens of identical machines work on a monitor. Our 1024 × 600 device needs a few large things, each one meaning something.
- **Orange as brand and accent at once.** For us, orange stays the one action.

## For Home, in one line

Keep the warm life as the window. Make the instrument side read as working machines joined by visible flow, each showing its state by its own light, in our slate kit. Don't use their white plastic, their holograms or their text.

## UI/UX's structure read (in summary; their findings, folded in)

UI/UX saw all 13 screenshots, the Gameplay trailer at a frame every 4 s and the Demo trailer at one every 3 s. Like me, they couldn't play it or see continuous motion.

- **The hall is the dashboard.** One glance at the room reads production. The management panels appear only when you choose to manage.
- **Asset cards:** a silhouette, a name, one plain status line and a gear. For us, a pod or resident card is its shell or stand plus one line.
- **One tracker and one alert:** a single standing objective, a toast for news, red only for real harm. It confirms our single ✓ need.
- **Every route shown on its key:** small key chips on the controls. UI/UX proposes key-colour chips on Home, so the routes sit on the hardware.
- **Ghost before commit:** the outcome is shown before you press, as in our decision windows. It should be a reduced-opacity image on a static ground, never translucency over the living window.
- **Don't take:**
  - the text density (hotkey legends, cost lists, stat strips). Trees are the exception: per the owner's 14:49 amendment they suit complex data such as the genome, though not Home or the panels;
  - the management overlays, which are lists of cards with gears, the menu the owner rejected for Home;
  - the branded white-and-orange look.

**Where we agree:** state as light on the machine, the card as picture plus one line, red only for harm, and the instrument's own screen. **One note from the look side:** if key chips land on Home, they take the device's own key colours and sit on its face as small marks, never as a strip of labels.
