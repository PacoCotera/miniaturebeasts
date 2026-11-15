// The Caddy's "Station quiet" (C4b) while the page itself is stalled by the Companion making a world (station-heartbeat-1).
// node --test prototypes/play/tests/stall.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { faceOf, QUIET_MS } from "../../caddy/face.mjs";
import { createStall, TICK_MS } from "../src/stall.mjs";

const cradles = { companion: { state: "lifted", seats: 0, seq: 0, at: 0 }, station: { state: "seated", seats: 0, seq: 0, at: 0 } };
const T0 = Date.UTC(2026, 9, 17, 18, 0, 0);   // the face prints clock times: the run's ms are offsets from this
const faceAt = (t, heardAt) => faceOf({ now: T0 + t, tz: -360, bootAt: T0, cradles, cradles, who: null, hold: null, fault: false, station: { at: T0 + heardAt, partner: null, along: null, opened: null, crates: 0, ledger: null } }).id;

// the shell's loop: a tick every TICK_MS, the Station's beat every 5 s; a stall holds both until it ends (one thread), the tick running first
function run({ stallAt, stallMs, stationStopsAt = Infinity, until }) {
  const stall = createStall(); let heardAt = 0, t = 0, nextBeat = 5000; const seen = []; seen.at = [];   // the face ids, and the time of each
  while (t < until) {
    t += TICK_MS; if (t >= stallAt && t < stallAt + stallMs) continue;   // nothing runs during the stall
    heardAt = stall.credit(heardAt, t);   // the tick first, as the timers fall due together
    seen.push(faceAt(t, heardAt)); seen.at.push(t);
    while (nextBeat <= t) { if (nextBeat < stationStopsAt) heardAt = t; nextBeat += 5000; }
  }
  return seen;
}

test("a 36 s stall (the world making) does not read as a quiet Station", () => {
  assert.ok(!run({ stallAt: 10000, stallMs: 36000, until: 60000 }).includes("C4b"));
});
test("a Station that truly stops reads quiet after the same listening time", () => {
  const seen = run({ stallAt: 10000, stallMs: 36000, stationStopsAt: 50000, until: 90000 });
  assert.ok(seen.includes("C4b"), "quiet shows");
  assert.ok(seen.at[seen.indexOf("C4b")] >= 50000 + QUIET_MS - 5000, "not before the Station stopped and 15 s of listening went by: " + seen.at[seen.indexOf("C4b")]);
});
test("with no stall, the quiet rule is the face's own 15 s", () => {
  const seen = run({ stallAt: Infinity, stallMs: 0, stationStopsAt: 20000, until: 60000 });
  const first = seen.at[seen.indexOf("C4b")];
  assert.ok(first >= 20000 - 5000 + QUIET_MS - TICK_MS && first <= 20000 + QUIET_MS + 5000, "first quiet at " + first);
});
