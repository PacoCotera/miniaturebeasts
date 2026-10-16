# The Library's met frame: its line (`spread.strings.subjects.met`)

Ticket T-20261015-10. The line shows in the bottom line's context when a met frame is focused. Limits (specs/station-library-spec.md, D2): {species}, at most 6 words, no digits, at most 208 px at Inter 16.

Widths were measured, not estimated: Inter Regular (the station-gate `prototypes/ui/fonts/inter/src/Inter-Regular-tnum.ttf`) at 16 px in Chromium's canvas, filled with every species name in station-gate design/proposals/species-names.md and Untuva (33 names). The widest fill was Graptoma in every case.

| # | Line | Words | Untuva | Widest (Graptoma) | Note |
|---|---|---|---|---|---|
| 1 | **{species}: identify a pod** | 4 | 166 px | 186 px | **Recommended** |
| 2 | {species}: identify its pod | 4 | 174 px | 195 px | "its" can read as one pod already at home |
| 3 | Identify one {species} pod | 4 | 181 px | 202 px | Reads naturally, but 6 px from the limit |
| 4 | Identify a {species} pod | 4 | 162 px | 182 px | Fails on vowel names: "Identify a Untuva pod" (the docs write "an Untuva" 28 times) |
| 5 | Find a {species} pod | 4 | 138 px | 158 px | The same article problem, and it names the trip, not identifying, so it is only half the step |

Too wide for the widest name, so not offered: "{species}: find and identify a pod" (252 px), "Bring home a {species} pod" (212 px), "{species}: one pod to identify" (225 px).

**Recommended: "{species}: identify a pod".** It names the species and the one act that makes the frame found. The name comes first, where it sits on a found frame ("{species}") and in today's met line ("{species}, only seen"), so focusing along a row keeps the name in place. It has no article before the name, so it reads right for every species. Bringing one home is implied, because a pod can only be identified at the Station.

- Words: 4, counting {species} as one.
- Characters: 25 with the placeholder; 22 filled with Untuva ("Untuva: identify a pod").
- Width: 166 px with Untuva, 186 px at the widest name, 22 px under 208.

`subjects.unmet`: keep "an empty frame". No candidate beat it within the same limits.
