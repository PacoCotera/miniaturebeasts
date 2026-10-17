# Each mibi as itself: the art director's proposal (T-20261016-190, S01 first)

## The craft: a stand is a base plus one layer per locus it can show

Today every adult Loika on Home is the same stand. I propose that a species' stand be painted as **a base plus one layer for each locus a stand can show**, all in the same pose and frame, so the build stacks the layers a mibi's read looks call for. Nothing is painted per individual. The parts are painted once per species and per pose.

For **S01, the Loika**, the frame's looks that a stand can show at Home's and the Vivarium's sizes are:

| Locus | Looks | The layer |
| --- | --- | --- |
| Crown | bare head, leaf crest | The base is painted **bare-headed**; the crest is a layer on top. A bare head is simply no layer |
| Markings | plain, pale patches | A patch layer over the body, the same shapes in every pose. The accepted marked/plain Pip pair gives it exactly, as their difference |
| Eyes | thin rings, between, wide pale rings | Three small swaps over the eye region; "between" is the base |

The doings (Drive, Efficiency) are behaviour, not stand parts. They show in motion, not in the stand.

Four Loikas from these layers already read as four individuals at a glance: in `S01-four-stands.png` and `home-window-four-loikas.png`, the silhouette (crest or not) and the patches carry it. The eye rings are the subtlest of the three, and are best read up close.

*`home-window-four-loikas.png`: four real pods, chosen to differ. It is not a typical rack.*

## What the build draws

- **Read looks only.** A trait whose chapter is unread draws the species' most common look on pods (the game designer's call). For the Loika that is the base: crest, plain, eyes between, not the painted stand's wide rings. Hidden copies never show; the layer is the expressed look.
- **The same individual everywhere.** The same layer choice drives the Home and Vivarium stand, the up-close 304, the Companion's HiBit resident and the 48 px token. Those are derived from the Station painting, never painted small.
- **Sizes:** layers are authored at 304×312 and derived down for Home and the Vivarium (about 110–150 px tall). Nothing is upscaled.
- **One scale and pose rules:** size is not a locus, so every adult draws at one scale. The facing and the pose come from the resident's routine, not its genes.

## Poses

The motion keys in `concepts/mibi-motion-proof/keys/` share one frame (304×312, feet on row 305):
- `pip-anchor`, with its breath steps `b1` and `b2`;
- `pip-crouch-b`;
- `pip-air`;
- `pip-curl`, with its breath step `b1`;
- `pip-blink`.

Each pose needs the same layers:
- a bare-headed base;
- a crest layer;
- a patch layer;
- two eye swaps (none on the curl and the blink, since the eyes are shut).

The breath steps are row repeats of their key, so they reuse its layers.

## What the proof is, and what is owed

- **The proof** (`make-stands.py`) is composited from the accepted Pip pair:
  - the patch layer is their exact difference;
  - the bare head is the crest removed and the head closed from the fur below;
  - the ring swaps narrow or widen the pale ring.

  The patches are exact. The crown and the rings are proof-quality edits, good enough to judge the idea at Home's size, not masters.
- **Owed, as masters:**
  - a painted bare-headed base for each of the five poses;
  - the crest and patch layers cut from them;
  - the eye swaps for the open-eyed poses.

  The bare-headed bases are the only new painting: five edits of existing keys, the same pose and scale with the crest removed. Everything else is cut from the bases and the accepted pair, by hand.
- **Budget:** the ticket is "0 (no paid calls)". Five single-key edit requests would make the bare-headed bases. Without them, the crown can only be a proof edit. That is the lead's call and cap; nothing was requested.

## Where this meets the genome engineer's part

The genome engineer maps each mibi's read looks to these layers: which locus, which look, read or not. The art needs from that mapping only the expressed look per stand locus, per mibi. Every other locus stays out of the stand.
