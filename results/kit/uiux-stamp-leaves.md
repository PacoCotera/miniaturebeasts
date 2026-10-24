# Stamp plate and leaves (UI/UX, 19:39 Mexico City)

Read at origin/station-gate 80068625 (fetched first); k6-gate.md section 4 and K7 line; incubator-object build-spec.md.

## Q1. Should the four stamp plates agree?

Yes. **No stamp, no plate, on all four.** "Named but not sent" counts as no stamp everywhere (K7's one meaning of "has").

Why:
- A plate with nothing on it reads as a blank label, a stamp that failed to print. A screen that has no stamp to show should show none.
- The Incubator's spec (build-spec section 2) says the column is "bare wall" in empty. A lone plate there would break that.
- Create and Habitat already behave this way. Pods is the odd one out (pods.c passes plateAlone 1).
- One rule is simpler to hold than "Pods differs".

Consequence for Pods: its plate stops standing empty. The case (back and front) still draws where the caller names one; only the plate goes.

Goldens: K7's own change (kit_stamp tests "sent" once) leaves the node records of the 181 golden states unchanged (k6-gate.md K7 line). Dropping Pods' plateAlone is a look change on Pods. It changes any Pods golden or state that shows a plate with no stamp. I did not render or diff goldens, so I cannot say whether any Pods golden has no stamp. Treat it as a separate ticket, not part of the K6/K7 refactor, and let that ticket's golden run say what moves.

## Q2. Leaves retired for good?

**Yes.** The Incubator: build-spec.md line 67 ("Gone: ... the leaves (regions.leaves)") and line 78 ("no leaves"), and incubator.json "retired" (T-20261016-222: "no longer drawn on the Incubator"). Create: create.json line 19 ("retired by fix 6, UI/UX 2026-10-15: Create shows no leaves"). Home: home.json has no leaf key and home.c draws none; the face README's Home sentence is stale text.

So the arc, both grids and the pictures leaf-empty-16x20 and leaf-full-16x20 have no reader left in the design. The pictures still sit in prototypes/ui/assets/masters/pods/ (picture files are the art director's, not mine to remove).
