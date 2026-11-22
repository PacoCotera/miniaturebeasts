// night-draw-fix-1 (owner bug #113, "night looks exactly the same as every other time of the day"): the place view takes its light from the clock.
// Night draws through the place's dark2 table, dusk through the one-step table, a cave keeps its own light.
//   node --test prototypes/exploration/tests/night-draw-fix.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const start = () => { const p = makePage({ gen: 7, console: "silent", canvas: true });
  p.run("TEST.calm = true; newWorld(7, 2); startExpedition('weather', 176); S.exp.fog = null; S.exp.storm = null; S.exp.pos = 176; enterPatch(); S.exp.patch.x = 14; S.exp.patch.y = 14; S.veil[S.exp.patch.key] = new Array(PH).fill(0x0fffffff);"); return p; };
const shot = (p, spent) => { p.run(`S.day.spent = ${spent}; scr.px().fill(-1); RT.key = null; drawPatch(1);`); return Array.from(p.run("scr.px()")); };
const darker = (p, a, b) => { const lum = i => { const h = p.run(`RGB[${i}]`); return Array.isArray(h) || ArrayBuffer.isView(h) ? h[0] + h[1] + h[2] : 0; };
  let n = 0, d = 0; for (let i = 0; i < a.length; i++) if (a[i] >= 0 && b[i] >= 0 && a[i] !== b[i]) { n++; if (lum(b[i]) <= lum(a[i])) d++; } return [n, d]; };

test("clockLevel: night is dark2 (2), dusk the one-step table (1), the day 0, a cave 0", () => {
  const p = start();
  p.run("S.day.spent = 30"); assert.equal(p.run("clockLevel({ cave: false })"), 0);
  p.run("S.day.spent = 160"); assert.equal(p.run("clockLevel({ cave: false })"), 1);
  p.run("S.day.spent = 190"); assert.equal(p.run("clockLevel({ cave: false })"), 2);
  assert.equal(p.run("clockLevel({ cave: true })"), 0);
});

test("the same place drawn at day, dusk and night is three different pictures, darker as the clock goes", () => {
  const p = start();
  const day = shot(p, 30), dusk = shot(p, 160), night = shot(p, 190);
  const [n1, d1] = darker(p, day, dusk), [n2, d2] = darker(p, dusk, night);
  assert.ok(n1 > 500, "dusk differs from the day: " + n1); assert.ok(d1 / n1 > .95, "dusk is darker: " + d1 + "/" + n1);
  assert.ok(n2 > 500, "night differs from dusk: " + n2); assert.ok(d2 / n2 > .95, "night is darker: " + d2 + "/" + n2);
});
