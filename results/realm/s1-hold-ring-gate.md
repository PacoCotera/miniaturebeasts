# Gate: Realm S1, the Station's hold ring (merged to station-gate 86258bb83)


Verdict: SIGN. One test added (2c2740fde); no change to the ring or to any source. UI/UX signed the look; this gate is code only.

## Fixes
None to the code. Added one test: station/tests/hold-ring-host.test.mjs (the host's gate: holdOn needs UI.hold and the developer setting realmSleep; keyDown takes only confirm; a key-up with no kept key-down passes nothing; a press made while the plate did not hold passes no up later). Breaking holdOn to ignore realmSleep fails it.

## Read of the code
- Hold state machine (anim/hold.c), IDLE / HOLDING / FULL / EMPTYING: down when unarmed returns 0 (ordinary key); down in HOLDING or FULL returns 1 and changes nothing (repeats ignored, so confirm:held cannot be said twice); down in IDLE or EMPTYING starts a fresh hold from 0; up in HOLDING empties (a cut with reduced motion); up in FULL is ignored, and the ring stays full until hold_arm(0) (frame_words arms from the props every draw, so a frame without hold drops it, saying nothing); up in IDLE or EMPTYING does nothing; another key down calls hold_cancel (= up), so it empties a partial ring and leaves a full one. hold_tick says confirm:held on the one HOLDING to FULL edge only.
- Fresh press: the face refuses a down while unarmed (never remembered); the host adds to downKeys only when holdOn at key-down, and keyUp passes an up only for a key in downKeys. A press from before the plate held therefore never fills.
- Let-go paths on the page: pointerup, pointercancel and lostpointercapture all call release(k); keyup calls it; blur releases confirm. Keyboard repeats are dropped (e.repeat) and the face ignores repeats anyway.
- Time: only anim_now() / the frame's ms (face_frame) are read; no wall clock. Quarters come from spec_int frame hold.quarters (test sets 2 and sees it change). The fill is integer arithmetic; hold_sin is a table.
- Per frame: no malloc, no loops beyond the ring's fixed draw; hold_tick, hold_fill are O(1).
- not_built skip: `spec_len(props, frame.hold) >= 0` only; a frame without hold still draws the line (hold test "a frame without hold").
- Reach: UI.hold is set nowhere in shipped code (only by tools/settings-states.mjs), and holdOn also needs G.settings.realmSleep. Nothing reaches the player.

## Deliberate breaks (each rebuilt, hold.test.mjs run, reverted; tree clean after)
1. A key repeat after full restarts the hold (confirm:held twice): FAIL, 1 test ("confirm:held is sent once, however long").
2. A full ring empties on let-go: FAIL, 2 tests ("confirm:held is sent once", "full stays full").
3. A press carried over into an armed frame is accepted: FAIL, 1 test ("a fresh press is needed").
Control (no-op edit, same rebuild): 16/16 pass. Unmodified: hold.test.mjs 16/16.

## Checks
hold.test.mjs 16/16, exit 0; hold-ring-host.test.mjs 2/2, exit 0.
tools/gate/full-parallel.sh (FACE_BUILD_DIR of my own, tree at 2c2740fde): exit=0, TOTAL 427s; 158 jobs, 0 failed. station-journey rc=0 (journey ok), play-journey rc=0 (play journey ok), layer-check rc=0, face-guard rc=0, station-checks rc=0, masters rc=0 (1471 placed, 0 problems), public-guard rc=0, vivarium 61 tests ran, goldens and every node suite rc=0.
node .github/public-guard/guard.mjs --base origin/station-gate: public guard ok, exit=0.
prototypes/station/img restored with git checkout; tree clean; scratch removed.

## Carried to later tickets
- S2/S3: a plate sets UI.hold and h.held (host.mjs calls h.held?.() on confirm:held; no plate does yet).
- Blur releases only confirm; a held pointer on a non-confirm key is not a hold, so fine today. If a second held key is ever added, release all downKeys on blur.
- The host tests cannot see the page handlers (main.mjs pointer/blur/keyup wiring); they were read, not run in a browser. The station journey does not press ✓ with the ring armed on the page; the settings-states capture does.
