// The tall grass sways calmly in the walking view (owner, 2026-11-09): half as often, between two frames, and not at all at clock 0 (reduced motion).
import test from "node:test";
import assert from "node:assert/strict";
import { spriteFrame, walkFrame, SWAY_SLOW } from "../src/sprites.mjs";

const grass = { kind: "tall-grass", frames48: [0, 1, 2], frameMs: 300 };
const other = { kind: "reeds", frames48: [0, 1, 2], frameMs: 300 };

test("tall grass: its frame lasts twice as long as before and it uses two frames, not three", () => {
  assert.equal(SWAY_SLOW, 2);
  const seen = new Set(), changes = []; let last = walkFrame(grass, 0);
  for (let t = 0; t < 7200; t += 10) { const f = walkFrame(grass, t); seen.add(f); if (f !== last) { changes.push(t); last = f; } }
  assert.deepEqual([...seen].sort(), [0, 1], "two frames only");
  assert.ok(changes.length >= 10 && changes.every((t, i) => i === 0 || t - changes[i - 1] === 600), "a change every 600 ms, was every 300");
  let before = 0, lastB = 0; for (let t = 0; t < 7200; t += 10) { const f = spriteFrame(grass, t); if (f !== lastB) { before++; lastB = f; } }
  assert.ok(changes.length * 2 <= before + 2, `half as many changes: ${changes.length} against ${before}`);
});

test("at clock 0 (reduced motion) the grass stands on its first frame; other sprites and still sprites are as before", () => {
  assert.equal(walkFrame(grass, 0), 0);
  for (const t of [0, 100, 299, 777, 5000]) assert.equal(walkFrame(other, t), spriteFrame(other, t));
  const still = { kind: "tall-grass", frames48: [0], frameMs: 0 };
  assert.equal(walkFrame(still, 5000), 0);
});
