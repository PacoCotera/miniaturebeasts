// The old chapter page's grid (regions.chapter.page), which the shared layout vectors still read: for one to eight traits the cells sit on the table and every well lies on the floor.
// The chapter page itself is retired (Pods is now the inventory and the reading room: pods-inventory.test.mjs draws those on the face).
//   node --test prototypes/face/tests/pods-page.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pageOrigin, pageGrid } from "../../ui/specs/derive.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), PG = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/pods.json"), "utf8")).regions.chapter.page;

test("GB1 D1: for counts 1 to 8 the cells' P rects are the table (x 384 + 144 a column; y 232, or 144 and 344), no well ends past x 952 or y 535, and no well of a two-row page starts above 140", () => {
  const ROWS = { 1: [232], 2: [144, 344] };
  for (let n = 1; n <= 8; n++) {
    const cols = n <= 4 ? n : n <= 6 ? 3 : 4, rows = n > 4 ? 2 : 1, [ox, oy] = pageOrigin(PG, cols, rows), cells = pageGrid({ ...PG, rect: [ox, oy, PG.rect[2], PG.rect[3]] }, n).cells;
    assert.equal(cells.length, n);
    cells.forEach(([x, y, w, h], i) => { const want = [384 + 144 * (i % cols), ROWS[rows][Math.floor(i / cols)]]; assert.deepEqual([x, y], want, `${n} traits, cell ${i}`); assert.ok(x - 4 >= 0 && x + 128 + 4 <= 952 && y + 160 + 4 <= 535 && (rows === 1 || y - 4 >= 140), `${n} traits, cell ${i}: its well lies on the floor`); });
  }
});
