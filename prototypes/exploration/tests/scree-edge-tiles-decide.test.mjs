// owner note #159: at a scree edge the step crosses wherever both sides of the seam are open ground on the same level; only the two scree crossing tiles keep the rambler rule.
//   node --test prototypes/exploration/tests/scree-edge-tiles-decide.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { MW, MH } from "../src/logic/world.mjs";

const mibi = (id, sp) => ({ id, name: "Fig", sp, born: 0, outings: 0, notches: 2, bonded: false, care: 0, tends: 0, tendDay: null, grownTurn: null });
const walk7 = (seed, sp) => { const p = makePage({ gen: 7, console: "silent" });
  p.run(`newWorld(${seed}); TEST.calm = true; S.turn = 5; S.tier = 2; S.known = [0, 1, 2]; S.mibis = [${JSON.stringify(mibi(1, sp))}]; S.carried = [1]; S.lead = 1; startExpedition('weather', G.spawns[0])`); return p; };
const J = (p, src) => JSON.parse(p.run(`JSON.stringify(${src})`));

test("a scree edge crosses over open ground on both sides of the seam; its two crossing tiles still say the rambler words", () => {
  let open = 0, shut = 0, gate = 0;
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]) {
    const p = walk7(seed, 0);   // a Loika: no rambler along
    const edges = J(p, "(() => { const out = []; for (let i = 0; i < 2 * MW * MH; i++) if (G.soft.scree[i]) out.push(i); return out; })()");
    for (const i of edges.slice(0, 2)) {   // two edges a seed keep the run short
      const a = i >> 1, dir = i & 1 ? "down" : "right", b = dir === "down" ? a + MW : a + 1;
      const go = (x, y) => { p.run(`S.exp.start = ${a}; S.exp.pos = ${a}; S.exp.range = 4; enterPatch(); if (RT.view) endView(); S.exp.patch.x = ${x}; S.exp.patch.y = ${y}; FX.msg = ''; crossEdge(${JSON.stringify(dir)})`); };
      const info = J(p, `(() => { S.exp.start = ${a}; S.exp.pos = ${a}; S.exp.range = 4; enterPatch(); if (RT.view) endView(); const la = layout(String(${a})), lb = layout(String(${b})); if (!sideReady(la, lb)) return null;
        const east = ${JSON.stringify(dir)} === 'right', len = east ? la.h : la.w, out = [];
        for (let k = 0; k < len; k++) { const ax = east ? la.w - 1 : k, ay = east ? k : la.h - 1;
          const ok = !!landingOf(la, lb, ${JSON.stringify(dir)}, ax, ay);
          const q = crossingAt(la, ax, ay); out.push({ ax, ay, ok, gate: !!(q && !q.bank && q.dir === ${JSON.stringify(dir)}) }); }
        return out; })()`);
      if (!info) continue;
      let tried = 0;
      for (const t of info) {
        if (!t.gate && tried >= 3) continue;   // three open tiles an edge keep the run short
        if (t.gate) {
          go(t.ax, t.ay); gate++;
          assert.equal(J(p, "S.exp.pos"), a, `seed ${seed} edge ${i}: the crossing tile refuses a Loika`);
          assert.match(JSON.stringify(J(p, "FX.notes")), /Loose scree · needs a rambler/, `seed ${seed} edge ${i}: the rambler words`);
        } else if (t.ok && !J(p, `T_BLOCK[layout(String(${a})).tiles[${t.ay} * layout(String(${a})).w + ${t.ax}]]`)) {
          go(t.ax, t.ay); open++; tried++;
          assert.equal(J(p, "S.exp.pos"), b, `seed ${seed} edge ${i} tile ${t.ax},${t.ay}: open ground both sides crosses`);
        } else shut++;
      }
    }
  }
  assert.ok(open >= 20 && gate >= 4, `crossed ${open}, gate tiles ${gate}, refused ${shut}`);
});
