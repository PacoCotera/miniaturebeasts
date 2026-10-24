# Sittings rule review (2026-10-23 20:28 Mexico City), 38b95239

Branch build/sittings-rule, one commit 38b95239 on 9fbfc9a9 (author and committer Paco Cotera <paco@cotera.org>, no trailers). Ticket T-20261023-285; rule: results/sittings-rule-gd.md item 1 (logic only).

## Verdict: PASS, merge

No blocking items. The notes below are non-blocking.

## (a) No sitting lost or paid twice
- Grant while held: grantSitting writes the ledger key first, then queueSitting; returns { ok: true, queued: true, position }. A second grant of the same key returns again, queued or held (test :59, :243).
- Welcome: guarded by welcomeGiven, now set when it is earned; it is held at once or queued { key: null, at: now, source: "welcome" }. A second checkWelcome returns again (test :94).
- Two moments from one act: collectMoments grants in momentsEarned order with one now; equal at keeps arrival order (strict > in queueSitting), so sealed then guide (test :189).
- Door sweep: openSittingDoor puts each unpaid key in the ledger and the queue at the door time, then giveOwed. X21 test stands.
- Reload mid-queue: st.owed is plain JSON; normalize keeps it as is (test :264, 42 entries, never trimmed or expired). Probe: normalize run twice and after a JSON round trip gives the same save.
- devGrantSitting: still refuses while held; leaves the ledger alone.
- beginSitting clears the slot and calls giveOwed in the same call, so the head comes forward at once with its own source.
- Only writers of st.sitting: grantSitting, devGrantSitting, giveOwed, beginSitting (and the schema-2 migration's null). No path drops an owed entry.

## (b) Order rule
Matches the text: one queue, oldest first by at, stable ties, the welcome placed by when it came due, "welcome first" removed from giveOwed and beginSitting. Tests :255 (m:early, welcome, m:late) and :235 (welcome due before the door: it comes first).

## (c) Save migration (state.mjs normalize)
- welcomePending true: unshift { key: null, at: 0, source: "welcome" }, welcomeGiven = true, flag deleted. at 0 keeps it first, as the old code gave it. Correct.
- welcomePending false: only deleted. Owed entries without source get "moment". Already-migrated save: unchanged (probe).
- Idempotent: the flag is gone after the first pass, and source is only filled when missing.
- Readers, grepped across prototypes/ (views, props, ui specs, face tools and tests): welcomePending only in normalize; welcomeGiven only in sitting.mjs, dev.mjs sittingText, state.mjs fresh save and schema-2 migration, and tests; st.owed only in sitting.mjs, dev.mjs and tests; sittingWarning, readWarning, crossWarning, WARNING, momentsOf, losesOne: no code reader left (README only, see notes). No screen or prop reads any of them, so setting welcomeGiven at earning changes no output.

## (d) Judgement calls: accepted
- The welcome as a queue entry (key null, source "welcome"): accepted; it keeps 1a ("owed" = st.owed.length >= 1) in one place.
- Door-swept moments get the door time: accepted; moments are derived from the save, so the door time is the only honest earned time, and X21 says nothing is paid before it.
- beginSitting returns welcome or owed (the giveOwed result) or null: accepted; only tests and the dev panel read them. checkWelcome still returns { ok: false, waits: true } when it queues (see note 3).

## (e) No screen output changed
All run in a scratch worktree at 38b95239, with a fresh face build (build.sh all, private FACE_BUILD_DIR, since removed): face_test 15177 checks, 0 failed; layout 753 cases, 0 differ.
- node --test prototypes/station/tests/*.test.mjs: 590 pass, 0 fail
- node --test prototypes/ui/tests/*.test.mjs: 80 pass, 0 fail
- node --test prototypes/face/tests/*.test.mjs: 588 pass, 0 fail (extra)
- station journey.mjs: "journey ok", no FAIL, no "differs from the golden" line, exit 0
- play journey.mjs: "play journey ok", exit 0
- checks.mjs: "layer checks ok"
- goldens.mjs --check (all sets): exit 0 (every set matches)
- git merge-tree --write-tree with 80068625: clean (cabb2cdd); with current origin/station-gate a2db600e (it moved on: a face guard commit, no station file touched): clean (2183b16d)
- node .github/public-guard/guard.mjs --base origin/station-gate: public guard ok, exit=0

## Non-blocking notes
1. Stale README. prototypes/station/README.md:155 still says "`readWarning` and `crossWarning` precede a sealed chapter's first read and a cross that completes a deep line." Fix: replace it with "A sitting earned while one is held joins `st.owed`, oldest first by when it was earned, and comes forward at each begin; nothing warns, because nothing is lost." At :161, delete the sentence that begins "The warnings (`readWarning`, `crossWarning`)". :143 is a record of an earlier ruling: add "(superseded 2026-10-23: sittings are never lost)".
2. The header of sitting.test.mjs:1 still says "the research moments that earn it and their warnings". Fix: drop "and their warnings".
3. checkWelcome returns { ok: false, waits: true } when it queues the welcome, but grantSitting returns { ok: true, queued: true } in the same case. headless.mjs:62 marks the welcome on .ok, as before, so behaviour is unchanged. Align the two when the screens read them.
4. A save with an empty slot and a non-empty queue would strand the queue until a dev grant and a begin. The designer (1a) calls that state a bug, and no old-code path reaches it, because welcomePending was only set while a sitting was held. Optional hardening in normalize: `if (!st.sitting && st.owed.length) { const o = st.owed.shift(); st.sitting = { source: o.source || "moment", key: o.key, at: now }; }`.
5. A migrated welcome never writes st.moments.welcome; nothing reads that key, so this is harmless.
6. ui/specs/station/sitting.json plate: "welcomePlate, only when begin gave a waiting welcome sitting (sitting.mjs beginSitting, checkWelcome)". beginSitting's .welcome is now set only when the welcome is the next in the queue. That spec text is for the later screen ticket (Bay berth, slide) to revisit.
7. design/proposals/the-portrait.md:105 and :115 still describe "not given" and the warning. That is the designer's document; the ruling cites it "as rewritten", so leave it to the designer.
8. If the clock goes backwards, a later sitting can queue ahead of an earlier one. Nothing is lost.
9. Disk: 6 /tmp/bake-* dirs remain (two a/b/c sets, both made in the window of my face tests at 01:56 and 01:59 UTC; the 18 seen at the start were removed by someone else meanwhile). I could not tell which set is mine, so I deleted neither.
