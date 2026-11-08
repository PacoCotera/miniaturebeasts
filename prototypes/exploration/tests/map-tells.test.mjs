// C11: the map (walk slice W§7, minus miniatures): tells as signs on seen, unfound places (paw, beat, bolt, the new shimmer), the band's lines,
// the start guarantee extended to tells.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { fixture, plain } from "./walk-fixture.mjs";
import { HEART_TEXT } from "../src/hearts.mjs";
import { goldenStill } from "./png-golden.mjs";

test("setting out shows at least one tell sign within one cell of the start, on seeds 1 to 200", () => {
  const p = makePage({ console: "silent" });
  const kinds = {}; let struck = 0;
  for (let seed = 1; seed <= 200; seed++) {
    p.run(`newWorld(${seed}); TEST.calm = true;`);
    const want = p.run("G.spawns[0]");
    p.run(`startExpedition('weather', ${want})`);
    assert.equal(p.run("S.exp.start"), want, "the start never moves");
    if (p.run("S.exp.stats.tellStruck")) struck++;
    const near = plain(p.run(`(() => { const o = [], q = cxy(S.exp.start); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = q.x + dx, y = q.y + dy; if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
      const c = y * MW + x; if (S.exp.reach.includes(c) && S.revealed[c]) { const k = heartTell(c); if (k && mapSigns().some(e => e.c === c && e.list.some(s => s.kind === k))) o.push(k); } } return o; })()`));
    assert.ok(near.length >= 1, `seed ${seed}: a tell sign within one cell of the start`);
    for (const k of near) kinds[k] = (kinds[k] || 0) + 1;
    p.run("S.exp = null; S.phase = 'setup'");
  }
  assert.ok(struck <= 20, "a struck stone is the rare fix (" + struck + " of 200 seeds)");
  console.log("tell signs near the start over 200 seeds:", JSON.stringify(kinds), "· seeds that needed a stone struck:", struck);
});

test("when the cells beside the start hold only quiet stones, the sun strikes the nearest one: a bolt shows, the Energy guarantee counts it", () => {
  const p = makePage({ console: "silent" }); p.run("newWorld(19); TEST.calm = true;");   // seed 19: rock all round the first start
  const want = p.run("G.spawns[0]");
  p.run(`startExpedition('weather', ${want})`);
  assert.equal(p.run("S.exp.stats.tellStruck"), 1, "a stone was struck");
  const struck = plain(p.run(`(() => { const o = []; for (const c of S.exp.reach) { const key = String(c); for (const f of layout(key).feats) if (f.kind === 'k' && fs(key, f.id).ch === 2) o.push({ c, key, id: f.id }); } return o; })()`));
  assert.equal(struck.length, 1, "exactly one");
  assert.equal(p.run(`heartTellKind(${struck[0].c})`), "k", "its place shows the bolt");
  assert.ok(p.run("S.exp.stats.srcAtStart") >= 1, "and the Energy guarantee counted it (no extra warm stone was made for it)");
  assert.equal(p.run("S.exp.stats.preCharged"), 0);
  assert.ok(p.run(`cdist(${struck[0].c}, ${want})`) <= 1, "within one cell of the start");
});

test("a tell shows only on a seen cell, and goes when its heart is found", () => {
  const f = fixture({ canvas: true }), run = f.run;
  const c = run("S.exp.pos"), key = String(c);
  const kind = run(`heartTellKind(${c})`);
  assert.ok(kind, "the first place has a tell (seed 3)");
  const signs = () => plain(run("mapSigns()")).filter(e => e.c === c).flatMap(e => e.list.map(q => q.kind));
  assert.ok(signs().includes(kind), "seen: its sign is there");
  run(`S.revealed[${c}] = 0; S.signs = {}`);
  assert.deepEqual(signs(), [], "unseen: no sign at all");
  assert.equal(run(`heartTell(${c})`), null);
  run(`S.revealed[${c}] = 1`);
  assert.ok(signs().includes(kind));
  // the other cells of the reach: no tell sign on a cell that is not seen
  for (const o of plain(run("S.exp.reach"))) if (!plain(run(`S.revealed[${o}]`))) assert.equal(run(`heartTell(${o})`), null, "cell " + o);
  run("TEST.findHeart()");
  assert.ok(run(`explored(${c})`));
  assert.ok(!signs().includes(kind), "found: the tell is gone");
});

test("each heart kind has its own sign: the spring a shimmer, a pod's heart a beat, a charged stone a bolt", () => {
  const p = makePage({ console: "silent" });
  const seen = new Set();
  for (const seed of [3, 7, 13, 42, 5, 9]) { p.run(`newWorld(${seed}); TEST.calm = true;`);
    for (const k of plain(p.run("Array.from(G.comp).map((v, c) => v && passable(c) && G.land[c] !== L.WATER ? c : -1).filter(c => c >= 0).map(c => { const h = heartOf(String(c)); return h ? h.kind + ':' + (heartTellKind(c) || '-') : null; }).filter(Boolean)"))) seen.add(k); }
  assert.ok(seen.has("spring:sh"), "spring → shimmer");
  assert.ok([...seen].filter(s => s.startsWith("nest:")).every(s => s === "nest:b"), "a pod's heart → beat: " + [...seen]);
  assert.ok([...seen].filter(s => s.startsWith("stone:")).every(s => s === "stone:k" || s === "stone:-"), "a stone → bolt when charged, nothing when quiet");
  assert.ok(![...seen].some(s => /^spring:(?!sh)/.test(s)));
});

test("the dot of a found place is filled on the reach grid", () => {
  const f = fixture({ canvas: true }), run = f.run;
  const geo = () => plain(run("(() => { const ex = S.exp, r = ex.range, d = r * 2 + 1 <= 5 ? 3 : 2, pitch = d + 1, s0 = cxy(ex.start), p = cxy(ex.pos), gw = (r * 2 + 1) * pitch - 1, y0 = HUD_T + Math.max(0, Math.floor((HUD_H - 2 * HUD_T - 1 - gw) / 2)); return { x0: 20, y0, i: p.x - (s0.x - r), j: p.y - (s0.y - r), pitch, mint: C.mint }; })()"));
  const dot = () => { const g = geo(); run("scr.px().fill(-1); drawReachGrid(20)"); const px = run("scr").px(), W = run("SCR_W"); return { v: px[(g.y0 + g.j * g.pitch) * W + g.x0 + g.i * g.pitch], mint: g.mint }; };
  const a = dot(); assert.notEqual(a.v, a.mint, "not found: hollow");
  run("TEST.findHeart()");
  const b = dot(); assert.equal(b.v, b.mint, "found: filled mint");
});

test("the band: the place you stand in, the nearest tell with its way, the way home", () => {
  const f = fixture({ canvas: true }), run = f.run;
  run("S.exp.patch = null; S.phase = 'map'; S.visited[S.exp.pos] = 1;");
  const cell = run("bandCell()");
  assert.match(cell, /^(Meadow|Pond edge|Rock field|Wood)( · (water glints|a slow beat|a struck stone|not found yet))?$/, cell);
  run("S.exp.patch = { key: String(S.exp.pos), x: 14, y: 16, dir: 'up', noise: 'creep' }; TEST.findHeart(); S.exp.patch = null; S.phase = 'map';");
  const found = run("bandCell()");
  assert.match(found, /^(Meadow|Pond edge|Rock field|Wood) · found( · .*)?$/, found);
  assert.doesNotMatch(found + run("JSON.stringify(bandTell())"), /\bheart\b|\bnest\b|survey|explored/i);
  // a known pod waiting there says so
  run(`S.pods.push({ id: 'zb', k: String(S.exp.pos), x: 12, y: 14, sp: 0, h: 0, g: 'meadow', how: 'ground' }); S.veil[String(S.exp.pos)] = new Array(PH).fill(0x0fffffff)`);
  assert.match(run("bandCell()"), /· 1 pod waits there$/);
  // the nearest tell: a cell with a sign other than this one; its words name the land and the way
  const t = plain(run("nearestTell()"));
  if (t) { assert.ok(["sh", "b", "k", "t"].includes(t.kind)); const forms = plain(run("bandTell()")); assert.ok(forms.length === 2);
    assert.notEqual(t.c, run("S.exp.pos"), "never the place you stand in");
    assert.match(forms[0], new RegExp(" in the (meadow|pond edge|rock field|wood), " + t.dir + "$")); }
  // the band draws, within the view, with the way home last
  run("FX.msg = ''; FX.notes = []; FX.lockUntil = 0; RT.key = null; scr.px().fill(-1); render(5)");
  goldenStill(assert, { run }, "map-band-reach.png");
});

test("the map has no quarter and keeps the shimmer's picture on the Probe screen", () => {
  const p = makePage({ console: "silent" }); p.run("newWorld(7)");
  assert.equal(p.run("TILES.some(t => t.id === 'shimmer' && PIC[t.pic])"), true);
  assert.equal(p.run("SIGN['m:sh'].line()"), "Shimmer · water nearby");
  assert.equal(HEART_TEXT.band.tell.sh, "Water glints");
});

// ---- the map design: one sign per kind besides your own cell's, sticky, never on a cell that is not a choice ----
const NOT_OWN = "shownTells().filter(t => !t.own)";
test("at set-out the shown tells hold at most one per kind besides your own cell, and one lies within one cell of the start (seeds 1 to 200)", () => {
  const p = makePage({ console: "silent" });
  for (let seed = 1; seed <= 200; seed++) {
    p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
    const all = plain(p.run("shownTells()")), others = all.filter((t) => !t.own), kinds = others.map((t) => t.kind);
    assert.equal(new Set(kinds).size, kinds.length, `seed ${seed}: one per kind ${kinds}`);
    assert.ok(all.some((t) => plain(p.run(`cheb(cxy(${t.c}), cxy(S.exp.start))`)) <= 1), `seed ${seed}: a shown tell within one cell of the start`);
    p.run("S.exp = null; S.phase = 'setup'");
  }
});

test("never a tell on a cell that is unseen, found, fogged, gated or out of reach", () => {
  const p = makePage({ console: "silent" });
  for (const seed of [3, 7, 13, 42, 5, 9, 11, 19]) {
    p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
    const bad = plain(p.run(`${NOT_OWN}.filter(t => !S.revealed[t.c] || heartFound(t.c) || inFog(t.c) || gatedCell(t.c) || !S.exp.reach.includes(t.c) || t.c === S.exp.pos)`));
    assert.deepEqual(bad, [], "seed " + seed);
    p.run("S.exp = null; S.phase = 'setup'");
  }
});

test("a shown sign does not move when you step, unless it became invalid; stepping onto a pick hands that kind to the next place", () => {
  const f = fixture({ canvas: true }), run = f.run;
  run("S.exp.patch = null; S.phase = 'map'; S.exp.fog = null; S.exp.storm = null; for (const c of S.exp.reach) S.revealed[c] = 1; pickTells(S.exp);");
  let stepped = 0, onto = 0;
  for (let n = 0; n < 12 && stepped < 6; n++) {
    const before = plain(run(NOT_OWN)), dirs = plain(run("['up', 'right', 'down', 'left'].filter(d => canStep(S.exp.pos, d)).map(d => [d, stepCell(S.exp.pos, d)])"));
    if (!dirs.length) break;
    const pickCells = new Set(before.map((t) => t.c)), step = dirs.find(([, to]) => pickCells.has(to)) || dirs[n % dirs.length];
    run(`mapStep('${step[0]}')`); if (plain(run("S.phase")) !== "map" || !run("!!S.exp")) break; stepped++;
    const after = plain(run(NOT_OWN)), pos = run("S.exp.pos");
    for (const b of before) {
      const a = after.find((t) => t.kind === b.kind), valid = plain(run(`tellPickValid(S.exp, '${b.kind}', ${b.c})`));
      if (valid) assert.equal(a && a.c, b.c, `a ${b.kind} sign stays at ${b.c} after a step`);
      else { onto += b.c === pos ? 1 : 0; assert.ok(!a || a.c !== b.c, "a pick that is not valid is made again"); }
    }
  }
  assert.ok(stepped >= 1, "the walk stepped");
});

test("band line 2 names a shown sign's cell, and the glyph is that sign's kind", () => {
  const f = fixture({ canvas: true }), run = f.run;
  run("S.exp.patch = null; S.phase = 'map'; S.exp.fog = null; S.exp.storm = null; for (const c of S.exp.reach) S.revealed[c] = 1; pickTells(S.exp);");
  const t = plain(run("nearestTell()"));
  if (!t) return;
  assert.ok(plain(run(NOT_OWN)).some((s) => s.c === t.c && s.kind === t.kind), "the nearest tell is a shown sign");
  assert.equal(run("bandTell().kind"), t.kind, "the band's glyph is its kind");
});

test("a moment heart shows the paw on the map (generator 6)", () => {
  let seen = 0;
  for (const seed of [7, 13, 42, 3, 5, 9]) {
    const p = makePage({ gen: 6, console: "silent" }); p.run(`newWorld(${seed}); TEST.calm = true;`);
    const cells = plain(p.run("(() => { const o = []; for (let c = 0; c < MW * MH; c++) if (G.comp[c] && G.land[c] !== L.WATER && passable(c)) { const h = heartOf(String(c)); if (h && h.kind === 'moment') o.push(c); } return o; })()"));
    for (const c of cells) { assert.equal(p.run(`heartTellKind(${c})`), "t", "cell " + c); seen++; }
  }
  assert.ok(seen > 5, "moment hearts exist on the tested seeds: " + seen);
});
