// Walk content B8: an opening never promises a way that is closed, and never is the way in. Generator 7 holds it in the cell's IR: a side the land refuses (wide water, a cliff) has no opening,
// and the way in (the layout's spawn point) is never on a refused side. The map's end is the atlas's edge and is held by the views audit (views-agree.test.mjs, tools/views-audit.mjs auditGen7).
// The closed look (the set's thicket over a refused opening) belonged to the baked-template adapter, which the page no longer uses; its test is gone with it. The range line still moves with the tier (range-line.test.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { sideKind } from "../src/world.mjs";

const DIR = { N: "up", S: "down", W: "left", E: "right" };

test("on every land cell of three worlds no opening stands on a side the land refuses, and the way in is never on one", () => {
  let cells = 0, shut = 0;
  for (const seed of [7, 13, 42]) {
    const p = makePage({ gen: 7, console: "silent" }); p.run(`newWorld(${seed}); TEST.calm = true; S.tier = 2; startExpedition('weather', G.spawns[0]);`);
    const G = p.run("G");
    const keys = p.run("(() => { const out = []; for (let c = 0; c < MW * MH; c++) if (G.comp[c] && G.land[c] !== L.WATER) out.push(c); return out; })()");
    for (const c of keys) {
      const lay = p.run(`(() => { const l = layout('${c}'); return { open: l.openings.map(o => o.side), spawn: l.spawnPt, w: l.w, h: l.h }; })()`);
      cells++;
      for (const dir of ["up", "down", "left", "right"]) {
        const kind = sideKind(G, c, dir);
        if (kind !== "cliff" && kind !== "water") continue;   // the map's end (and a region's border) is the atlas's: the views audit
        shut++;
        assert.ok(!lay.open.some((s) => DIR[s] === dir), `seed ${seed} cell ${c}: an opening on the ${kind} side ${dir}`);
        const { x, y } = lay.spawn, onIt = dir === "up" ? y === 0 : dir === "down" ? y === lay.h - 1 : dir === "left" ? x === 0 : x === lay.w - 1;
        assert.ok(!onIt, `seed ${seed} cell ${c}: the way in is on the ${kind} side ${dir}`);
      }
    }
  }
  assert.ok(cells > 100 && shut > 0, `${cells} cells, ${shut} refused sides seen`);
});
