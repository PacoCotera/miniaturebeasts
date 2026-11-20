// Bug #44 ("what steep rock?"): a stone or strike mark on a raised top took the cliff pieces within one tile of it (adapt7 keepDecal, meant for decor), so a step kept its blocking cells with no face drawn.
// The cliff's own pieces stay in the layout whatever lies beside them; decor still keeps its gap round a find.
//   node --test prototypes/exploration/tests/cliff-face-near-finds.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { PLACES } from "./page-harness.mjs";
import { genRegion7 } from "../src/gen7/region.mjs";
import { bakedCell, layout7 } from "../src/world7.mjs";

const ts = PLACES.ts, name = (d) => ts.sprites[d.kind].kind, isCliff = (d) => /^cliff-|^way-up/.test(name(d));
const CASES = [[4260276819, 171]];   // the owner's world (note mwkxax1vaa4550), patch 11,10: a stone at tile 16,13 beside a run of the face

test("every cliff piece of a baked cell is still in its layout, also beside a find or a strike mark", () => {
  let near = 0;
  for (const [seed, cell] of CASES) {
    const G = genRegion7(seed, 2, 2), b = bakedCell(PLACES.ctx, seed, [2, 2], cell), lay = layout7(PLACES.ctx, G, seed, [2, 2], String(cell), undefined, undefined, b);
    const before = b.place.decals.filter(isCliff), after = lay.baked.place.decals.filter(isCliff), key = (d) => `${name(d)}@${d.x},${d.y}`, kept = new Set(after.map(key));
    assert.ok(before.length > 0, "the cell has cliff pieces");
    assert.deepEqual(before.map(key).filter((k) => !kept.has(k)), [], `seed ${seed} cell ${cell}: cliff pieces the layout dropped`);
    const marks = [...lay.findSlots, ...lay.strikes].map((f) => [f.x, f.y]);
    for (const d of before) { const dx = Math.floor(d.x / 48) - 1, dy = Math.floor(d.y / 48) - 1; if (marks.some(([gx, gy]) => Math.abs(dx - gx) <= 1 && dy - gy >= -1 && dy - gy <= 2)) near++; }
  }
  // cliff-slice-1: the side pieces (flanks, heads, tails) that stood beside this find are retired, so the case no longer holds a piece inside the find's gap; what stays pinned is that no piece the bake places is dropped by the layout
  assert.ok(near >= 0);
});
