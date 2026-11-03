# Gate: the Station's sleep sequence, F3 (merged to station-gate 85d110830)

Verdict: FIX, then signed; all five fixes applied before the merge.

## Fixes applied
1. A committed sleep is never rolled back: rollback refuses a journal at or after commit, and a failure after the commit rolls forward.
2. The crash tests check, at the instant the commit lands, that the Caddy holds the file with a kept ledger line and the Station holds the same bytes. Before this, a commit written before the upload still passed the crash tests.
3. A test: recovery called during a hold answers "running" and changes nothing.
4. A test: a store that hands back a damaged copy makes the sleep roll back.
5. A test: rotation keeps the oldest copy while the Caddy lists it only as kept.

Every deliberate break of the sequence (16 kinds) now fails at least one test. The crash table beside the test (31 writes, each with a crash before it, a lost reply, a failure, a power cut and a lift) did not change: every cell ends with the realm back as it was, or asleep on both ledgers.

## Checks (all exit 0)
sleep tests 23/23; node suites 2265 (2263 pass, 2 skipped); face_test 0 failed; goldens --check; station journey; play journey; face guard; layer checks; place masters; public guard.

## Behind the developer setting realmSleep, off by default; nothing reaches the player.

## Carried to later tickets
- S3: freeze Station saves while a sleep is open (any autosave in the hold rolls it back today); keep the Station a single writer (a second tab mid-hold rolls the first back); wire recovery at boot, dock and Caddy return, and cancel on a lift; a way out when the Companion was reset onto a third realm after the commit (the same realm with no tombstone is tampering: keep waiting).
- C4: hide Reset game while a sleep is pending or committed.
- D1: write the upload-again-on-404 at commit into the sequence's documentation.
- S2: the plain "no room" line (the room check is an estimate).
