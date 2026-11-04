# Gate: the Peplos as the sail-wing (build/peplos-sailwing)

Squash-merged to station-gate f837b000c.

SIGNED

Branch build/peplos-sailwing (fce68516e, 3b1a81aff, 8464d9b57) over origin/station-gate.

1. Scope: 41 files changed = 40 S12 PNGs (all under masters/pods) + masters/index.json. Scratch check: index key order identical (1471 entries), exactly 40 entries differ, all S12, same file/w/h; only sha256 and "signed" changed; non-"masters" top-level keys unchanged; every one of the 1471 hashes matches the file on disk. Scratch script deleted-not-committed (kept outside repo).
2. Every replaced PNG: IHDR width/height, bit depth and colour type equal the old file and the index w/h. No added/removed paths (git --name-status shows only M). Nothing outside the masters tree.
3. place-masters.mjs --check (also the gate's "masters" job): "masters: 1471 placed, 0 problems".
4. Full gate: TOTAL 506s; 158 jobs, 0 failed (vivarium 61 tests, play-journey, layer-check, face-guard, station-checks, masters, public-guard all rc=0). No flake rerun needed.
5. Public guard: "public guard ok", exit=0.
6. Deliberate break: changed one byte of pods/face-S12-24.png; --check reported "FAIL face-S12-24 ... does not match its hash", 1 problems. Reverted with git checkout; re-check 0 problems; tree clean.

Nothing pushed.
