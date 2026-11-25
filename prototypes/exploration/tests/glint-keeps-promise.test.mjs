// owner-notes-fix-160 (owner note mwve5exk9e1ed1): a glint marks a find that is there and that he can reach and take where it shows.
//   node --test prototypes/exploration/tests/glint-keeps-promise.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makePage } from "./page-harness.mjs";
import { syntheticPieces, SYNTH_TONE, fnv as fnvStr } from "../tools/world-vectors.mjs";

const SAVE = readFileSync(new URL("./fixtures/owner-notes-160.save", import.meta.url), "utf8");
const CUE_SYN = syntheticPieces().map(q => ({ ...q, fill: parseInt(fnvStr(q.name), 16) % 40 + 4 }));
// paint: the painted sparkle keeps its colours on the fake canvas; the synthetic 48 px atlas lets the place draw (as world.test.mjs's cuePlace does)
const mk = () => { const p = makePage({ console: "collect", els: true, canvas: true, paint: true, raf: "count" });
  p.run(`atlasInstall(${JSON.stringify(CUE_SYN)}.map(q => { const px = new Int16Array(q.w * q.h).fill(q.fill);
    for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) if (!x || !y || x === q.w - 1 || y === q.h - 1) px[y * q.w + x] = C.ink; return Object.assign(q, { px }); }), null, ${JSON.stringify(SYNTH_TONE)})`);
  return p; };
const js = (p, e) => JSON.parse(p.run(`JSON.stringify(${e}) ?? 'null'`));
const frame = (p, now) => { p.run(`NOW = ${now}; scr.px().fill(-1); render(5)`); return Int16Array.from(p.run("scr").px()); };

test("his save (patch 8,3 tile 2,22): the left glint's find is there after the crossing, glints, and is taken", () => {
  const p = mk(); p.store[p.KEY] = SAVE; assert.equal(p.run("load()"), true);
  p.run("NOW = 5000; RT.pl = null; RT.key = null; render(5); callPlace(); scr.px().fill(-1); render(5);");
  const tabs = js(p, "edgeTabs()");
  const w = tabs.find(t => t.kind === "find" && t.side === "W");
  assert.ok(w, "the Call at the edge draws the framed glint on the left");
  assert.equal(js(p, "leadWay(S.exp.patch, layout(S.exp.patch.key)).cell"), 55, "it points at the place next door, west");
  assert.ok(js(p, "leftItems(55)").some(i => i.k === "dew"), "a find is there: the full cup");
  // he crosses to the left
  p.run("S.exp.patch.x = 0; crossEdge('left');");
  assert.equal(p.run("S.exp.pos"), 55, "he is next door");
  p.run("scr.px().fill(-1); render(5)");
  const dew = js(p, "leftItems('55').find(i => i.k === 'dew')");
  assert.ok(dew, "the find is still there where it pointed");
  // the glint is not gone: an edge tab to it (off screen) or the sparkle on it (on screen), until it is taken
  const arrived = js(p, "S.exp.patch");
  const onTab = js(p, "edgeTabs()").some(t => t.kind === "find" && t.tx === dew.x && t.ty === dew.y);
  const onScreen = !onTab;   // a find in view needs no tab; the sparkle shows it
  assert.ok(onTab || onScreen, `on arrival at ${arrived.x},${arrived.y} the cup at ${dew.x},${dew.y} shows: a tab toward it, or in view`);
  if (onScreen) assert.ok(js(p, "tileOnScreen(cueView().v, cueView().cam, " + dew.x + ", " + dew.y + ", ON_SCREEN)"), "no tab only because it is in view");
  // close by: the sparkle is drawn on its on-phase and not on its off-phase
  p.run(`S.exp.patch.x = ${dew.x}; S.exp.patch.y = ${dew.y + 1}; RT.pl = null; RT.key = null; RM.matches = false;`);   // moving (the harness says reduced motion otherwise)
  const h = js(p, `hash(${dew.x}, ${dew.y}, 7) % 1600`), on = 1600 * 400 - h + 100, off = on + 800;
  const A = frame(p, on), B = frame(p, off);
  assert.ok(A.some((v, i) => v !== B[i]), "close by, the sparkle is drawn on it");
  // a place that was never explored: only the mark makes its finds glint
  p.run("delete S.called[55];");
  const C1 = frame(p, on); p.run("RT.pointed = {};"); const C2 = frame(p, on);
  assert.ok(C1.some((v, i) => v !== C2[i]), "in a place not yet explored, the pointed find still glints");
  p.run("RT.pointed = { 55: 1 };");
  // taken: reachable from the tile below it
  p.run(`S.exp.patch.dir = 'up'; takeDew(leftItems('55').find(i => i.k === 'dew') && layout('55').feats.find(f => f.kind === 'u' && f.x === ${dew.x} && f.y === ${dew.y}));`);
  assert.equal(js(p, "leftItems('55').filter(i => i.k === 'dew').length"), 0, "the find is taken");
  p.run("scr.px().fill(-1); render(5)");
  assert.equal(js(p, "edgeTabs().filter(t => String(t.id).startsWith('p')).length"), 0, "nothing glints once it is taken");
  assert.ok(!js(p, "!!(RT.pointed && RT.pointed[55])"), "the mark is let go");
});

test("20 seeds: no find glint (a take or a buried-pod way) is drawn with nothing behind it", () => {
  let seen = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const p = mk();
    p.run(`newWorld(${seed}); startExpedition('weather', G.spawns[0]); S.exp.storm = null; S.exp.fog = null; enterPatch(); NOW = 5000;`);
    // let every place of the reach have been seen, so what is left in them counts
    p.run("for (const c of S.exp.reach) { if (!passable(c)) continue; const k = String(c), l = layout(k); S.visited[c] = 1; S.veil[k] = new Array(l.h).fill(0).map(() => (2 ** l.w - 1) >>> 0); }");
    for (let n = 0; n < 4; n++) {
      p.run(`{ const P = S.exp.patch, l = layout(P.key); P.x = ${[0, 5, 12, 20][n]} % l.w; P.y = ${[0, 6, 14, 22][n]} % l.h; } RT.pl = null; RT.key = null; RT.lead = null; RT.leadPin = null; render(5); callPlace(); scr.px().fill(-1); render(5);`);
      const way = js(p, "leadWay(S.exp.patch, layout(S.exp.patch.key))");
      const tabs = js(p, "edgeTabs().filter(t => t.id === 'beat')");
      if (!tabs.length || !way) continue;
      seen++;
      if (way.kind === "take") assert.ok(js(p, `leftItems(${way.cell})`).length > 0, `seed ${seed}: a take glint has a find behind it`);
      if (way.kind === "beat") assert.ok(js(p, "S.pods.some(q => q.h)"), `seed ${seed}: a buried-pod glint has a pod behind it`);
    }
  }
  assert.ok(seen > 0, "the seeds drew at least one find glint to check (saw " + seen + ")");
});
