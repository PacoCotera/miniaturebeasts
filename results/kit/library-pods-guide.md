# Pods guide target (UI/UX, 2026-10-24 06:45 Mexico City)

Ruling on F1 of the Library 2 gate (6e969e8a). Sources: pods.json regions.overview.figure.target, derived "ordered edges at L2.0", focus.overview; frame.json focus.ring.shapes; specs.test.mjs "fix 14, the shape rule"; focus.mjs (edge forms).

## Ticket lines for Library ticket 4

1. pods.json targets: add `"figure": { "group": "figure", "shape": "footprint", "state": "overview", "enabled": "the pod is identified (the figure is a target only then)" }`. Shape is `footprint`, one of the five kinds. Reason: the figure is the species' painted adult standing on the bench, the same object the Habitat resident is, and that object wears the footprint. The oval is the pod's own and the rect is for plates, so neither fits. No `ring` key, no `ground`.
2. specs.test.mjs SHAPES: in the `"pods.json"` row add `figure: "footprint"`. That adds no (radius, ground) pair, so the six-pair cap is untouched.
3. Ring: the footprint is drawn from the lowest 6 rows of the adult picture (mibi-adult-{SNN}-144x152, feet 392), with the creature lift 4 and the face-ring roles the Habitat resident uses. Check at the build: the ellipse (hMax 16, so 26 tall) must not cover the caption "every {species}" at (400, 400, 128, 24). The caption text is centred in its 24 px, so a ring bottom up to y 404 is acceptable; if it is lower, send it back to UI/UX, do not move the caption.
4. Edges, written in focus.overview once the L2.0 list port has landed (lists are already supported by focus.mjs; the derived note only waits for the spec test):
   - `figure`: `{ "left": "pod", "right": ["kin.first", "hatch"], "up": "rail.last", "down": "none" }`
   - `pod.right`: `["figure", "kin.first", "hatch"]` (the form already ruled on 2026-10-09; figure first).
   - `hatch.left`: `["figure", "pod"]` (today `"pod"`; the figure when it is a target, else the pod, so moves with no figure are unchanged).
   - `pod`, `kin`, `rail`: otherwise unchanged (`pod.up` rail.last, `pod.down` none, `kin.down` hatch, `kin.up` rail.last, `rail.down` pod).
   - Targets pointing back to the figure: `pod.right` and `hatch.left`. Nothing else points to it. Reason for `kin.left`: the kin group is an axis group, a group edge would also fire on kin.2 to kin.5 and break the stepping, so kin.1 keeps its stop on the left as it does today.
5. Unidentified pod: no figure target (the halo is drawn, not ringed); every edge above resolves as it does today (pod.right goes to kin.first, then hatch).
6. Action on the figure: `✓ Open the guide` (strings.openGuide), subject strings.everySpecies, free (no price), a jump to Library Level 1 with the ring on the pod's species (frame.json navigation.jumps entry for pods.overview, drop its "pending" and "shut" once the target exists). `←` from the guide returns to Pods overview with the ring on the figure. T-292 then retargets the jump to Level 2.
7. Vectors to add (focus.overview, played with ui/focus.mjs): pod right to figure; figure right to kin.1; figure right with no kin to hatch; figure left to pod; figure up to rail.last; figure down stays; hatch left to figure; hatch left with no figure to pod.

## Countersign: Library Level 1 focus rule (library.json l1.focus.initial)

Countersigned. The rule "the ring falls to the first target in species order when ui.lib.l1 (or the guide's species) is not a target; with none met there is no ring and ✓ does nothing" is the focus module's own ensure() fallback and matches the no-wrap, fallback "none" graph. Two conditions for the builder to keep: (a) the first target is the first met-and-found cell in species order, never an unmet cell; (b) a stale ui.lib.l1 is not rewritten on entry, only on leaving by a move or room key, so the memory is not lost by a visit that fell back.
