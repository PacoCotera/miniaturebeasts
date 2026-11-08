// The map's fog over places (the map design): three states (darker, light dots, clear), no measure, no pending outline; and the in-place veil check:
// a fresh place draws its veil before any Call (generated at 32 and 48 px, and a baked generator 6 place).
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { fixture, plain } from "./walk-fixture.mjs";
import { FOG_NOT_BEEN, FOG_BEEN } from "../src/hearts.mjs";

// the screen rectangle of a reach-view cell
const RECT = `(c => { const q = reachGeom(), p = cxy(c); return { x: q.dx + (p.x - (q.s0.x - q.r)) * q.cs, y: q.dy + (p.y - (q.s0.y - q.r)) * q.cs, cs: q.cs }; })`;
function cellPixels(f, c) {
  const r = plain(f.run(`${RECT}(${c})`));
  f.run("FX.msg = ''; FX.notes = []; FX.lockUntil = 0; RT.key = null; scr.px().fill(-1); render(5)");
  const px = f.run("scr").px(), W = f.run("SCR_W"), out = [];
  const a = Math.round(r.cs * 0.4), b = r.cs - a;   // the middle of the cell: the corner slots (signs) stay outside
  for (let j = a; j < b; j++) for (let i = a; i < b; i++) out.push(px[(r.y + j) * W + r.x + i]);
  return out;
}
const night = (f, px) => px.filter((v) => v === f.run("C.night")).length;
function toMap(f) { f.run("S.exp.patch = null; S.phase = 'map'; S.exp.fog = null; S.exp.storm = null; for (const c of S.exp.reach) S.revealed[c] = 1;"); }

test("the three states: never been (one step darker, no dots), been in and not found (light dots, the same for 1 row lifted or 20), found (clear); no place, no dots", () => {
  assert.ok(FOG_NOT_BEEN === 0 && FOG_BEEN > 0, "never been is the dark table, not dots (dots over pale greens read grey)");
  const f = fixture({ canvas: true });
  f.run("S.exp.patch = { key: String(S.exp.pos), x: 14, y: 16, dir: 'up', noise: 'creep' }");
  toMap(f);
  const c = plain(f.run("S.exp.reach.find(c => c !== S.exp.pos && passable(c) && G.comp[c] && G.land[c] !== L.WATER && !gatedCell(c))")), key = String(c);
  assert.equal(f.run(`fogState(${c})`), 2, "never entered: darker");
  assert.equal(f.run(`reachRm(${c})`), 1, "never entered: drawn through the dark table");
  const dark = cellPixels(f, c), n2 = night(f, dark);
  f.run(`S.visited[${c}] = 1`);
  assert.equal(f.run(`fogState(${c})`), 2, "only crossed: still darker (standing on a cell on the map is not going down into it)");
  assert.equal(cellPixels(f, c).join(), dark.join());
  const H = f.run(`layout('${key}').h`), rows = (n) => `S.veil['${key}'] = new Array(${H}).fill(0); for (let y = 0; y < ${n}; y++) S.veil['${key}'][y] = 0x0fffffff;`;
  f.run(rows(1)); assert.equal(f.run(`fogState(${c})`), 1, "a place entered: light");
  const one = cellPixels(f, c), n1 = night(f, one), N = f.run("C.night"), mask = (px) => px.map((v) => v === N ? 1 : 0).join("");   // (a sign may appear on a place whose rows are lifted; the dots may not change)
  f.run(rows(20)); const m20 = mask(cellPixels(f, c)), m1 = mask(one); let moved = 0; for (let i = 0; i < m1.length; i++) if (m1[i] !== m20[i]) moved++;
  assert.ok(moved <= 4, `the same dots for 1 row and 20 rows lifted: a state, not a measure (${moved} pixels differ; a sign's outline may blink in)`);
  assert.ok(n1 > n2, `been in carries light dots (${n1}); never been carries none of its own (${n2})`);
  assert.equal(f.run(`reachRm(${c})`), 0, "been in: full colour under the dots");
  f.run(`(S.called = S.called || {})[${c}] = 1`);
  assert.equal(f.run(`fogState(${c})`), 0, "found: clear");
  const clear = cellPixels(f, c);
  assert.notEqual(clear.join(), dark.join(), "never been differs from found: one step darker");
  f.run("FOGV.n = 0; FOGV.b = 0"); assert.equal(mask(cellPixels(f, c)), mask(clear), "a found cell carries no night dots at all"); f.run(`FOGV.n = ${FOG_NOT_BEEN}; FOGV.b = ${FOG_BEEN}`);
  // open water: no place, never dotted
  const w = plain(f.run("(() => { for (let c = 0; c < MW * MH; c++) if (!passable(c)) return c; return -1; })()"));
  if (w >= 0) { f.run(`S.revealed[${w}] = 1`); assert.equal(f.run(`fogState(${w})`), 0); }
  assert.equal(f.run("fogState(0) * 0 + (S.revealed[0] ? 0 : fogState(0))"), 0, "an unseen cell has no state");
});

test("the dots are on the screen's phase: two neighbouring heavy cells join with no seam", () => {
  const f = fixture({ canvas: true });
  toMap(f);
  const two = plain(f.run("(() => { const q = reachGeom(); for (const c of S.exp.reach) { const d = c + 1; if (c % MW < MW - 1 && fogState(c) === 2 && fogState(d) === 2 && S.exp.reach.includes(d)) return [c, d]; } return null; })()"));
  if (!two) return;
  const a = plain(f.run(`${RECT}(${two[0]})`)), b = plain(f.run(`${RECT}(${two[1]})`));
  assert.equal(b.x - a.x, a.cs);
  assert.equal(a.cs & 3, 0, "a cell is a multiple of the matrix, so the phase is the screen's");
});

test("the pending outline is gone from the reach view: no dotted border on a cell not found", () => {
  const f = fixture({ canvas: true });
  toMap(f);
  const c = plain(f.run("S.exp.reach.find(c => c !== S.exp.pos && passable(c) && G.comp[c] && !gatedCell(c))"));
  f.run("FOGV.n = 0; FOGV.b = 0");   // with the fog dots off, a cell not found must be its land and nothing more at its border
  const r = plain(f.run(`${RECT}(${c})`)), px = () => { f.run("RT.key = null; scr.px().fill(-1); render(5)"); return f.run("scr").px(); }, W = f.run("SCR_W");
  const before = px(); const edge = [];
  for (let k = 3; k < r.cs - 3; k += 3) edge.push(before[(r.y + 2) * W + r.x + k]);
  assert.ok(new Set(edge).size <= 3, "the cell's top border row is the land, not a dotted line of fog: " + [...new Set(edge)].join());
  f.run(`FOGV.n = ${FOG_NOT_BEEN}; FOGV.b = ${FOG_BEEN}`);
});

// ---- B6: does the in-place veil draw on a fresh place before any Call? ----
function veilPixels(p, size) {   // night-coloured pixels in the view of a fresh place, before any Call
  p.run("scr.px().fill(-1); RT.key = null; render(5)");
  const px = p.run("scr").px(), W = p.run("SCR_W"), H = p.run("VIEW_H"), Y0 = p.run("VIEW_Y"), n = p.run("C.night");
  let k = 0; for (let y = Y0; y < Y0 + H; y++) for (let x = 0; x < W; x++) if (px[y * W + x] === n) k++;
  return k;
}
test("B6: the veil draws in a fresh generated place at 32 px and at 48 px, before any Call", () => {
  for (const [label, setup] of [["32 px", "newWorld(7, 2); startExpedition('weather', 176); S.exp.fog = null; S.exp.storm = null; S.exp.pos = 176; enterPatch();"],
    ["48 px", "newWorld(7); startExpedition('weather', G.spawns[0]); S.exp.fog = null; S.exp.storm = null; enterPatch();"]]) {
    const p = makePage({ console: "silent", els: true, raf: 1, canvas: true }); p.run("TEST.calm = true;"); p.run(setup);
    assert.equal(p.run("S.found.includes('callintro') || FX.pulse != null"), false, label + ": no Call yet");
    const lay = plain(p.run("(() => { const k = S.exp.patch.key, lay = layout(k); let veiled = 0; for (let i = 0; i < lay.w * lay.h; i++) if (lay.reach[i] && !unveiled(k, i % lay.w, (i / lay.w) | 0)) veiled++; return { veiled }; })()"));
    assert.ok(lay.veiled > 20, label + ": most of the place is under the veil: " + lay.veiled);
    p.run("FX.msg = ''; FX.notes = []; FX.sign = null; FX.lockUntil = 0;");
    assert.ok(veilPixels(p) > 200, label + ": night pixels of the veil are on the screen");
  }
});
// (the baked generator 6 place is drawn by BakedView in a browser only: its B6 check is in baked-place.test.mjs, in real Chromium)
