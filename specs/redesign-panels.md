# Decision panels, redesigned from purpose (UI/UX)

Ticket T-20261016-165, 2026-10-17. The owner rejected the Return panel (picture 22) at 06:38 UTC. This document gives the purpose, the owner's lines as acceptance tests, three concepts for Return to the wild and the shared look shown on Grow. Sketches for the art director to paint (art T-20261016-170) are in `specs/redesign-panels/`. They are composition only, not specs.

## What went wrong (UI/UX's own reading)

Both cards showed the same Pip, in the same pose, on the same plinth, at the same size. Only the backdrop differed. The options were labels on one picture, not two outcomes. The panel itself was brown on brown, a cream-era box drifting away from the research-hands quality bar.

## Purpose

A panel appears only at a real decision. It shows each option as **what will happen**, painted so that the two outcomes look different before a word is read, with the price and any loss stated plainly under each.

## Acceptance tests (the owner, 06:38, verbatim)

| # | The owner | Answered by |
| --- | --- | --- |
| 1 | "Colors are brown on brown on brown for all the pannels, that doesn't look right." | Every panel is a pane of the machine's display, on the guide's dark matte slate with one bevel; the outcome paintings carry the colour. No brown panel, no cream. (The sketches' deep blue is a question for the owner: it would change the guide) |
| 2 | "side by side the two options look the same with the exception of some tiny text and a "wild" background." | Each option is its outcome, a different scene: Return shows Pip small in its place's wide landscape, walking away with a glance back; Keep shows Pip big and close at home in the Vivarium, facing you. They differ in distance, size, direction, setting and light |
| 3 | "This screen needs a rethinking and more work, the quality expected is not there." | Painted outcomes at the research-hands bar, and one frame shared by every panel |

## Return to the wild: three concepts

| Concept | Sketch | What it is | Strength | Risk |
| --- | --- | --- | --- | --- |
| **P1, two windows** (UI/UX's pick) | `P1-two-windows.png` | Two full-bleed outcome paintings side by side, the option's name and consequence under each ("❀ +2", "gone for good" in its loss colour) | A side-by-side comparison is what a choice needs; it scales to every panel (2 or 3 cards) | Two paintings per decision |
| **P2, one scene, two halves** | `P2-one-scene-two-halves.png` | One painting with the wild on the left and home on the right; the focused half is lit and the other is its painted dim variant | The most striking; a single image | One painting per pair of outcomes; doesn't scale to 3 options |
| **P3, the stage** | `P3-the-stage.png` | One big painting of the focused outcome; ◀ ▶ swap it | The biggest picture | The outcomes are never seen together, which is weaker for a choice |

## The shared look (all panels: Grow, Hatch, Fit, Cross, Sitting, Return)

Shown on Grow in `P1-shared-look-grow.png`:
- the display pane (deep blue) with the title;
- one window per option, the outcome painted full bleed;
- under each window, the option's name, its cost icons and at most one line of consequence;
- the focus ring in the focus colour.

**Grow's two outcomes:** the founder you made, lit, against the pod's own founder, plain. **Fit's:** the Probe at tier 2 against tier 1 (T-162's pictures sit in the windows). The decision-panel spec's rects (§1) are reworked once the owner chooses.

## Asks

- **The game designer:** the outcome scene for each option of every panel (what Pip is doing in each), and the consequence line.
- **The creative director**: the shared panel look, and P1 against P2. The outcome scenes for each option follow the game designer's §3 in `specs/purpose-briefs-b20261017-1.md`.
- **The art director** (T-20261016-170): paint P1 and P2 for Return to the wild (Pip, a pond-edge place), and P1 on Grow, to the research-hands bar.
- **The lead:** builds on panels stay parked until the owner chooses.
