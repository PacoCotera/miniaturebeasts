// L2b F10: the Rupar's fresh hole (art desk 2026-11-07, mibi-art 0f21d0919), a 40 x 32 ground mark drawn under the shed pod.
//   node --test prototypes/exploration/tests/rupar-hole.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./walk-fixture.mjs";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../index.html", import.meta.url), "utf8");
test("the hole is 40 x 32, its two frames differ, and rock or cave ground leaves out the torn grass", () => {
  const f = fixture();
  assert.equal(f.run("freshHoleArt(1, false).w"), 40); assert.equal(f.run("freshHoleArt(1, false).h"), 32);
  const names = f.run("[freshHoleArt(0, false), freshHoleArt(1, false), freshHoleArt(1, true)].map(p => [...STONE_PIECES].find(([, v]) => v === p)[0])");
  assert.deepEqual(Array.from(names), ["prop-hole-fresh", "prop-hole-fresh-f2", "prop-hole-fresh-bare"], "the art desk's three paintings: the dig, the settled hole, bare ground");
  for (const n of names) assert.deepEqual(Array.from(f.run(`[STONE_PIECES.get('${n}').w, STONE_PIECES.get('${n}').h]`)), [40, 32]);
  assert.equal(f.run("HOLE_BARE.rock && HOLE_BARE.cave && !HOLE_BARE.grass ? 1 : 0"), 1);
});
test("wired in the three places the patch names: shedPod remembers it for a dig, drawPatch and the place card draw it", () => {
  assert.match(page, /if \(how === 'dig'\) \(X\.live\.holes = X\.live\.holes \|\| \[\]\)\.push\(\{ x: p\.x, y: p\.y, g: groundName/);
  assert.match(page, /for \(const h of live\.holes \|\| \[\]\) \{ const x = h\.x \* ts[^\n]*\n[^\n]*freshHoleArt\(holeFrame\(h\)/);
  assert.match(page, /for \(const h of live\.holes \|\| \[\]\) if \(here\(h\.x, h\.y\)\) blit\(freshHoleArt\(1/);
});
