// owner-notes-fix-159: a tile that blocks as scree looks like scree. Owner note mwvah01t64e23a (patch 11,17 tile 23,10): the map edge east of cell 283 is a scree edge, but the place draws scree on its two
// crossing tiles only; at row 10 the step said "Loose scree" over what is drawn as a cliff top. Outside the two tiles the side is the cliff, and says so.
//   node --test prototypes/exploration/tests/scree-block-drawn.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const J = (p, src) => JSON.parse(p.run(`JSON.stringify(${src})`));
const walk = seed => { const p = makePage({ gen: 7, console: "silent" });
  p.run(`newWorld(${seed}); TEST.calm = true; S.turn = 5; S.tier = 2; S.known = [0, 1, 2]; startExpedition('weather', G.spawns[0])`); return p; };
const stepFrom = (p, x, y, dir) => { p.run(`S.exp.patch.x = ${x}; S.exp.patch.y = ${y}; FX.msg = ''; FX.notes = []; patchStep('${dir}', 'tap');`); return { msg: p.run("FX.msg"), at: J(p, "[S.exp.patch.x, S.exp.patch.y, S.exp.pos]") }; };

test("his spot (seed 64, cell 283, tile 23,10): the step right says cliff, not scree; the scree tiles still say scree", () => {
  const p = walk(64);
  p.run("S.exp.start = 283; S.exp.pos = 283; S.exp.range = 4; enterPatch(); if (RT.view) endView();");
  const lay = J(p, "(() => { const l = curLay(); return { w: l.w, h: l.h, cross: l.cross }; })()");
  const q = (lay.cross || []).find(r => r.dir === "right" && r.kind === "scree");
  assert.ok(q, "the east side of cell 283 is a scree edge with its two crossing tiles");
  const r = stepFrom(p, lay.w - 1, 10, "right");
  assert.ok(!/scree/i.test(r.msg), "row 10 is not named scree: " + r.msg);
  assert.deepEqual(r.at, [lay.w - 1, 10, 283], "and the pawn stays");
  const s = stepFrom(p, lay.w - 1, q.s, "right");
  assert.match(s.msg, /Loose scree/, "the drawn scree tile names scree");
});

test("on 20 seeds no tile of a place's scree side blocks as scree unless it is one of the two drawn crossing tiles", () => {
  let seen = 0, scree = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const p = walk(seed), edges = J(p, "(() => { const out = []; for (let i = 0; i < 2 * MW * MH; i++) if (G.soft.scree[i]) out.push(i); return out; })()");
    for (const i of edges.slice(0, 1)) {
      const a = i >> 1, dir = i & 1 ? "down" : "right";
      p.run(`S.exp.start = ${a}; S.exp.pos = ${a}; S.exp.range = 4; enterPatch(); if (RT.view) endView();`);
      const lay = J(p, "(() => { const l = curLay(); return { w: l.w, h: l.h, cross: l.cross || [] }; })()");
      const q = lay.cross.find(r => r.dir === dir); if (!q) continue;
      const len = dir === "right" ? lay.h : lay.w;
      for (let k = 0; k < len; k++) {
        const x = dir === "right" ? lay.w - 1 : k, y = dir === "right" ? k : lay.h - 1;
        const r = stepFrom(p, x, y, dir); seen++;
        if (/Loose scree/.test(r.msg)) { scree++; assert.ok(k === q.s || k === q.s + 1, `seed ${seed} cell ${a} ${dir} tile ${x},${y} says scree off the crossing tiles`); }
      }
    }
  }
  assert.ok(seen >= 20 && scree >= 1, `tiles checked ${seen}, scree blocks ${scree}`);
});
