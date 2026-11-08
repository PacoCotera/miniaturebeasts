// L4b2: in the vivarium's room-view goldens no mibi is more than a quarter hidden by the mibis drawn in front of it (review row 23: the dark Loika of twelve-v2 was more than a third behind the brown sleeper).
// A figure's box is its drawn picture's ink box; the share is the part of it the later-drawn figures (and the bed's sleepers) cover. Runs the goldens' own scenes on the Station page (about two minutes).
//   PW_DIR=... node --test prototypes/face/tests/hidden-figures.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { hiddenShares, measure, LIMIT } from "../tools/hidden-figures.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), built = existsSync(path.join(here, "../dist/face.wasm")), skip = !built && "face not built (prototypes/face/build.sh)";
// the developer switch's mechanism golden catches the walkers 8 s into the walk, two of them mid-crossing (a walker passing behind another is allowed: L4-22); its figures are not placed, they are caught in motion
const IN_MOTION = new Set(["vivarium-moving-8000ms"]);

test("hiddenShares: the part of a box that later boxes cover, once where they overlap", () => {
  assert.deepEqual(hiddenShares([[0, 0, 10, 10], [5, 0, 10, 10]]), [0.5, 0]);
  assert.deepEqual(hiddenShares([[0, 0, 10, 10], [5, 0, 10, 10], [5, 0, 10, 10]]), [0.5, 0, 0]);   // the same area twice counts once
  assert.deepEqual(hiddenShares([[0, 0, 10, 10], [20, 0, 10, 10]]), [0, 0]);
});

test("no mibi is more than a quarter hidden by another in any vivarium room-view golden (twelve-v2 among them)", { skip, timeout: 600000 }, async () => {
  const rows = await measure(), names = rows.map((r) => r.name);
  for (const n of ["vivarium-twelve-v2", "vivarium-eight", "vivarium-forty-boulders", "vivarium-coming-out", "vivarium-full-bud"]) assert.ok(names.includes(n), n + " was measured");
  const bad = rows.filter((r) => !IN_MOTION.has(r.name)).map((r) => ({ name: r.name, worst: Math.max(...r.shares) })).filter((r) => r.worst > LIMIT);
  assert.deepEqual(bad, [], "figures more than a quarter hidden: " + bad.map((b) => `${b.name} ${(b.worst * 100).toFixed(0)}%`).join(", "));
});
