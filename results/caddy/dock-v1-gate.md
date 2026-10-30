# Gate: the Caddy dock v1 (merged to station-gate fb4adf9e)

Verdict: SIGNED WITH FIXES; both fixes applied before the merge.

## Fixes applied
1. The 30-day sweep never fired: the Station cradle is seated once per world and never lifted, and the sweep required no cradle seated. The sweep now counts the Companion's cradle only, and only a Companion seat resets its clock (prototypes/caddy/dock.mjs); the sweep test seats the Station cradle.
2. A Companion name past the face's stamp slot made the face throw. Names are kept to 12 characters by the service (NAME_MAX); a test draws the face with a 40-character name.

## Checks (all exit 0)
caddy tests 20/20; station 816 (1 skipped); ui 252; playtest 25 (1 skipped); face 679; goldens --check; station journey; play journey; face guard; public guard.

## Carried, low (for the Caddy-as-the-only-road work with the hardware emulation)
- The play page ignores the service's fault state from another tab or a reload (C4c not shown there).
- The page's 1 s abort on a seat can leave the service seated while the page shows lifted; nothing corrects it until the next change.
- GET /dock without a world lists every world id, with open CORS (sandbox only; scope it before any shared host).
- The save documents a companionId field nothing writes; its reader is dead code. companionDocked and knownCompanion fall back to Math.random for ids.
- Test gaps: a 503 over HTTP; a refused write on an existing world keeping its file.

Known seam, by design: replacing a lost Companion.
