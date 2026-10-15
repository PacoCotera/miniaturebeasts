// The Station palette (design/proposals/ui-kit.md §2): the file holds the 62 colours, the Companion's 48 first and unchanged, and the Station's 14 exactly as the kit's table lists them with their
// neighbours (darker · lighter). Every neighbour is a colour of the file and every hex is its own. The kit is the source: this reads its table, so a colour changed in one place and not the other fails.
//   node --test prototypes/ui/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), P = JSON.parse(readFileSync(path.join(here, "../palettes/station.json"), "utf8")), kit = readFileSync(path.join(here, "../../../design/proposals/ui-kit.md"), "utf8");
const hexes = Object.fromEntries(P.colours), names = P.colours.map(([n]) => n);
const companion = JSON.parse(readFileSync(path.join(here, "../../../art/companion-48/palette/palette.json"), "utf8"));
// the kit's table of the 14: | `name` | `#hex` | role | `darker` · `lighter` | seen in |
const rows = [...kit.matchAll(/^\| `(\w+)` \| `(#[0-9a-f]{6})` \| .*? \| `(\w+)` · `(\w+)` \|/gm)].map((m) => ({ name: m[1], hex: m[2], darker: m[3], lighter: m[4] }));

test("the kit's table lists the Station's 14, and the file holds them with those hexes and neighbours", () => {
  assert.equal(rows.length, 14, rows.map((r) => r.name).join(" "));
  for (const r of rows) { assert.equal(hexes[r.name], r.hex, `${r.name}: the file says ${hexes[r.name]}, the kit ${r.hex}`); assert.equal(P.darker[r.name], r.darker, `${r.name} darker`); assert.equal(P.lighter[r.name], r.lighter, `${r.name} lighter`); }
  assert.deepEqual(names.slice(48), rows.map((r) => r.name), "the Station's 14 follow the 48, in the kit's order");
});
test("62 colours; every colour has a darker and a lighter neighbour that is a colour of the file; no hex is held by two names", () => {
  assert.equal(names.length, 62);
  for (const n of names) for (const k of ["darker", "lighter"]) assert.ok(names.includes(P[k][n]), `${n}.${k} is ${P[k][n]}`);
  const seen = new Map(); for (const [n, h] of P.colours) { assert.ok(!seen.has(h), `${n} and ${seen.get(h)} are both ${h}`); seen.set(h, n); }
});
test("the Companion's 48 are the signed palette, unchanged: names and hexes in order", () => {
  assert.equal(companion.count, 48);
  assert.deepEqual(P.colours.slice(0, 48), companion.colours.map((c) => [c.name, c.hex]));
});
