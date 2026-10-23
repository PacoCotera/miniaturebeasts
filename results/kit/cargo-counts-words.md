# Cargo counts in words (copywriter, 2026-10-23 12:13 Mexico City)

## Rule
- Cargo counts read in words from one to twelve ("seven" ... "twelve"), and "many" from thirteen up. Never digits in a sentence.
- Reason: one number-word rule on every screen (Panel, Pods, Create), and "many" carries no meaning on Cargo that a count would lose.

## Why
- Can the counts reach 7-12? Waiting pods: yes, in principle. Each trip brings 2 to 3 pods (Probe tiers 1 and 2), only 6 wells take them, and the rest wait, with no cap in the code (so 7 or more needs 13+ pods held; rare, but not impossible). Crates: the bay shows at most three berths, and the opening plays at most nine, so crate counts reach 7+ only as a developer case.
- Does "many" mean something the player needs (a full bay)? No. The full state is already said elsewhere (the mat shows three pods and a "+n" past them; the bay line says "crates wait in the bay" with no number past three). "many" on Cargo is a fallback, not a signal, and it would hide a count the player can act on (how many pods must leave a well).
- 13 and above: "many", as Panel, Pods and Create already do. The register bars digits in a line (the bottom line: "no digits"), so no digits.
- Zero and one are unaffected: "a pod waits for a well" and "a sealed crate" stay (the plural strings are only used for 2 and up).

## Strings affected (prototypes/ui/specs/station/cargo.json)
- strings.subjects.waiting "{count} pods wait for a well": count 7-12 now reads "seven pods wait for a well" ... "twelve pods wait for a well"; 13+ "many pods wait for a well".
- strings.arrival.subjects.crates "{count} sealed crates": 7-12 now "seven sealed crates" ... "twelve sealed crates"; 13+ "many sealed crates".
- Text unchanged: subjects.waitingOne, arrival.subjects.cratesOne, arrival.subjects.empty. The template strings themselves are unchanged; only the table that fills {count} (the code's spelled / local table, SPELL1 in the arrival's mended words) changes: it becomes spell(n, "many") like the other screens.
- Not Cargo's, but same family: the Station's context line (countWord) spells only a to six and drops the count above its max; the frame's bottom-line crates strings use 1, 2, 3 and "many" ("crates wait in the bay"). Not part of this ruling; no change asked.
- Fit: "twelve sealed crates" and "eleven pods wait for a well" are the longest; the line is the subject slot, so layout should confirm they fit (layout's call, not wording).
