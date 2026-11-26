// night-table-1 (owner bug #113; art director: night must be darker AND cooler than dark2 and tell from dusk).
//   node --test prototypes/exploration/tests/night-table.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { nightTable } from "../../places/src/lighttables.mjs";

const lum = c => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const page = () => { const p = makePage({ gen: 7, console: "silent", canvas: true });
  p.run("TEST.calm = true; newWorld(7, 2); startExpedition('weather', 176); S.exp.fog = null; S.exp.storm = null; S.exp.pos = 176; enterPatch(); S.exp.patch.x = 14; S.exp.patch.y = 14; drawPatch(1);"); return p; };
const get = (p, e) => JSON.parse(p.run(`JSON.stringify(${e})`));

test("night table: the page's REMAP_PLACE carries it at 5, one entry per colour, dark2 left as it was", () => {
  const p = page();
  const rgb = get(p, "RGB"), night = get(p, "REMAP_PLACE[5]"), dark2 = get(p, "DARK2"), place2 = get(p, "REMAP_PLACE[2]");
  assert.equal(night.length, rgb.length);
  assert.deepEqual(night, nightTable(rgb));
  assert.deepEqual(place2, dark2, "level 2 is still dark2");
  assert.deepEqual(get(p, "REMAP_SHADE[5]"), night);
});

test("night grass is a cool dark green (about 26,50,56): darker than dark2 grass, cooler, and below dusk", () => {
  const p = page();
  const rgb = get(p, "RGB"), night = get(p, "REMAP_PLACE[5]"), dusk = get(p, "REMAP_PLACE[6]"), dark2 = get(p, "DARK2");
  const grass = rgb.findIndex(c => c.join() === "92,187,76");   // the page's meadow grass (day)
  assert.ok(grass > 0);
  const n = rgb[night[grass]], d = rgb[dark2[grass]], u = rgb[dusk[grass]];
  assert.ok(lum(n) < lum(d), "night grass " + n + " darker than dark2 grass " + d);
  assert.ok(lum(n) < lum(u) && lum(u) < lum(rgb[grass]), "day > dusk > night");
  assert.ok(n[2] >= n[0] + 8, "cooler: blue above red " + n);
  assert.ok(Math.abs(n[0] - 26) <= 14 && Math.abs(n[1] - 50) <= 14 && Math.abs(n[2] - 56) <= 16, "about (26,50,56): " + n);
});

test("every colour is darker at night than at dusk and than by day; the lightest stay the lightest", () => {
  const p = page();
  const rgb = get(p, "RGB"), night = get(p, "REMAP_PLACE[5]"), dusk = get(p, "REMAP_PLACE[6]");
  // (the palette's darkest night colour, #141b1b, is the floor: the storm table's own near-black ink for the darkest colours is not a colour night can match)
  let worse = 0; for (let i = 1; i < rgb.length; i++) if (lum(rgb[night[i]]) > 26 && (lum(rgb[night[i]]) > lum(rgb[dusk[i]]) + 0.5 || lum(rgb[night[i]]) > lum(rgb[i]) + 0.5)) worse++;
  assert.equal(worse, 0);
  const white = rgb.findIndex(c => c.join() === "255,255,255"), dark = rgb.findIndex(c => c.join() === "20,27,27");
  assert.ok(lum(rgb[night[white]]) > lum(rgb[night[dark]]) + 40);
  assert.ok(night.every((v, i) => i === 0 ? v === 0 : v > 0), "index 0 stays transparent and no colour maps to it");
});

test("warm colours lose their warmth at night (red above blue by day, blue at least level by night)", () => {
  const p = page();
  const rgb = get(p, "RGB"), night = get(p, "REMAP_PLACE[5]");
  let warm = 0, cooled = 0;
  for (let i = 1; i < rgb.length; i++) { const c = rgb[i]; if (c[0] > c[2] + 60 && c[0] > c[1]) { warm++; const n = rgb[night[i]]; if (n[2] >= n[0] - 2) cooled++; } }
  assert.ok(warm > 20 && cooled / warm > 0.95, cooled + "/" + warm);
});

test("bug #171: water's teals do not take the night grass; water reads as water at night (bluer than the grass)", () => {
  const p = page();
  const rgb = get(p, "RGB"), night = get(p, "REMAP_PLACE[5]");
  const grass = rgb.findIndex(c => c.join() === "92,187,76");
  const teals = [[58, 135, 133], [74, 159, 154], [122, 198, 187], [31, 157, 143]];   // the meadow set's water teals and the core's teal
  for (const t of teals) {
    const i = rgb.findIndex(c => c.join() === t.join()); if (i < 0) continue;
    const w = rgb[night[i]], g = rgb[night[grass]];
    assert.notDeepEqual(w, g, "teal " + t + " at night is not the night grass " + g);
    assert.ok(w[2] >= w[1], "and it is a blue, not a green: " + w);
  }
  assert.ok(teals.some(t => rgb.findIndex(c => c.join() === t.join()) >= 0), "at least one teal is in the table");
});

test("the place at night draws through it: the grass pixel is the night grass, and the clock level is 5", () => {
  const p = page();
  const top = s => { p.run(`S.day.spent = ${s}; scr.px().fill(-1); RT.key = null; drawPatch(1);`); const n = new Map(); Array.from(p.run("scr.px()")).forEach(v => { if (v >= 0) n.set(v, (n.get(v) || 0) + 1); }); return [...n].sort((a, b) => b[1] - a[1])[0][0]; };
  const day = top(80), nt = top(590), night = get(p, "REMAP_PLACE[5]");   // (read after the drawing: the page's colours and tables settle as its art loads)
  assert.notEqual(nt, day);
  const rgb = get(p, "RGB"); assert.ok(lum(rgb[nt]) < lum(rgb[day]) - 20, "the ground at night is far darker than by day: " + rgb[nt] + " vs " + rgb[day]);
  assert.ok(rgb[nt][2] > rgb[nt][0], "and cool: " + rgb[nt]); assert.equal(night.length, rgb.length);
});
