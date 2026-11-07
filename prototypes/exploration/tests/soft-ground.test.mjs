// L2c: soft ground (wades, scree), earth banks, Tuliko's long walk, Rupar's dig, the Tuikis needed on every visit, and the turn line that closes what was dug.
//   node --test prototypes/exploration/tests/soft-ground.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import * as W from "../src/world.mjs";
import { makePage } from "./page-harness.mjs";

const { MW, MH, L, EDGE, DIRS } = W, NC = MW * MH;
const SEEDS = Array.from({ length: 24 }, (_, i) => i * 37 + 5);
const BIOMES = ["mixed", "woods", "fells", "marsh", "downs", "thickets", "tallwood", "tarns", "meres"];
const worlds = function* () { for (const b of BIOMES) for (const s of SEEDS) yield [b, s, W.genWorld(s, 4, b)]; };
const stepCell = (c, dir) => { const x = c % MW + DIRS[dir][0], y = ((c / MW) | 0) + DIRS[dir][1]; return x < 0 || y < 0 || x >= MW || y >= MH ? -1 : y * MW + x; };
const edgeCells = i => { const a = i >> 1; return [a, i & 1 ? a + MW : a + 1]; };
const todaysPassable = (G, c) => { const l = G.land[c]; return (l !== L.WATER || G.ford[c] === 1) && l !== L.CLIFF; };
const todaysCanStep = (G, a, dir) => { const x = a % MW + DIRS[dir][0], y = ((a / MW) | 0) + DIRS[dir][1]; if (x < 0 || y < 0 || x >= MW || y >= MH) return false;
  const b = y * MW + x, k = W.edgeKindIn(G, a, dir); return todaysPassable(G, b) && (k === EDGE.OPEN || k === EDGE.RAMP); };

test("softGround and bankEdges are deterministic per seed, and pure (the world is not touched)", () => {
  for (const [b, s, G] of worlds()) {
    const before = JSON.stringify([...G.land]) + JSON.stringify([...G.edge]);
    const a = W.softGround(G, s), c = W.softGround(G, s), x = W.bankEdges(G, s), y = W.bankEdges(G, s);
    assert.deepEqual([...a.wade], [...c.wade]); assert.deepEqual([...a.scree], [...c.scree]); assert.deepEqual([...x], [...y]);
    assert.equal(JSON.stringify([...G.land]) + JSON.stringify([...G.edge]), before, b + s);
  }
});

test("wades are never fords, islands, fast water, nor within one edge of a ramp or ford; scree is a one-level edge with rock; scree and banks are disjoint", () => {
  for (const [b, s, G] of worlds()) {
    const sg = W.softGround(G, s), bk = W.bankEdges(G, s);
    for (let c = 0; c < NC; c++) if (sg.wade[c]) {
      assert.equal(G.land[c], L.WATER); assert.notEqual(G.ford[c], 1); assert.ok(!G.island[c]);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = c % MW + dx, y = ((c / MW) | 0) + dy; if (x >= 0 && y >= 0 && x < MW && y < MH) assert.ok(!G.island[y * MW + x], "fast water " + b + s); }
      for (const dir of Object.keys(DIRS)) { const d = stepCell(c, dir); if (d >= 0) { assert.notEqual(G.ford[d], 1, "ford beside " + b + s); assert.notEqual(G.edge[W.edgeIndex(c, dir)], EDGE.RAMP); } }
    }
    for (let i = 0; i < 2 * NC; i++) {
      assert.ok(!(sg.scree[i] && bk[i]), "disjoint");
      const [a, c] = edgeCells(i);
      if (sg.scree[i]) { assert.equal(G.edge[i], EDGE.CLIFF); assert.equal(Math.abs(G.level[a] - G.level[c]), 1); assert.ok(G.land[a] === L.ROCK || G.land[c] === L.ROCK); assert.ok(a !== G.gate && c !== G.gate); }
      if (bk[i]) { assert.equal(G.edge[i], EDGE.CLIFF); assert.equal(Math.abs(G.level[a] - G.level[c]), 1); assert.ok(a !== G.gate && c !== G.gate, "the gate's edge");
        for (const q of [a, c]) assert.ok(![L.ROCK, L.CLIFF, L.WATER].includes(G.land[q]), "bank beside " + G.land[q]); }
    }
  }
});

test("every soft feature opens a pocket of POCKET_MIN cells outside G.comp or a shortcut of SHORTCUT_MIN steps", () => {
  const dist = (G, src) => { const d = new Int16Array(NC).fill(-1), q = [src]; d[src] = 0;
    for (let h = 0; h < q.length; h++) for (const dir of Object.keys(DIRS)) { const n = stepCell(q[h], dir); if (n < 0 || d[n] >= 0 || G.island[n] || !W.canStepIn(G, q[h], dir)) continue; d[n] = d[q[h]] + 1; q.push(n); } return d; };
  let seen = 0;
  for (const [b, s, G] of worlds()) {
    const sg = W.softGround(G, s), pairs = [];
    for (let c = 0; c < NC; c++) if (sg.wade[c]) pairs.push([stepCell(c, "left"), stepCell(c, "right")]);
    for (let i = 0; i < 2 * NC; i++) if (sg.scree[i]) pairs.push(edgeCells(i));
    for (const [a, c] of pairs) { seen++; const da = dist(G, a);
      if (da[c] >= 0) assert.ok(da[c] >= W.SOFT.SHORTCUT_MIN, `${b}${s} shortcut ${da[c]}`);
      else { const f = G.comp[a] ? dist(G, c) : da; let n = 0; for (let q = 0; q < NC; q++) if (f[q] >= 0 && !G.comp[q]) n++; assert.ok(n >= W.SOFT.POCKET_MIN, `${b}${s} pocket ${n}`); } }
  }
  assert.ok(seen > 100, "features seen: " + seen);
});

test("passableIn and canStepIn with no opts equal today's on every cell and edge of generators 1 to 4, with the overlays attached or not", () => {
  for (const gen of [1, 2, 3, 4]) for (const s of [3, 41, 77, 120, 333, 902]) {
    const G = W.genWorld(s, gen), H = { ...G, soft: W.softGround(G, s), banks: W.bankEdges(G, s) };
    for (let c = 0; c < NC; c++) { assert.equal(W.passableIn(G, c), todaysPassable(G, c)); assert.equal(W.passableIn(H, c), todaysPassable(G, c)); assert.equal(W.passableIn(H, c, {}), todaysPassable(G, c));
      for (const dir of Object.keys(DIRS)) { assert.equal(W.canStepIn(G, c, dir), todaysCanStep(G, c, dir)); assert.equal(W.canStepIn(H, c, dir), todaysCanStep(G, c, dir)); } }
  }
});

test("opts: sure opens the wade and the scree edge, bank 'all' or a Set opens banks; a generator 1 world has wades only", () => {
  let wade = 0, scree = 0, bank = 0;
  for (const [b, s, G] of worlds()) {
    const H = { ...G, soft: W.softGround(G, s), banks: W.bankEdges(G, s) };
    for (let c = 0; c < NC; c++) for (const dir of Object.keys(DIRS)) { const d = stepCell(c, dir); if (d < 0) continue; const i = W.edgeIndex(c, dir);
      if (H.soft.scree[i]) { scree++; assert.ok(!W.canStepIn(H, c, dir) && W.canStepIn(H, c, dir, { sure: true }) && !W.canStepIn(H, c, dir, { bank: "all" })); }
      if (H.banks[i]) { bank++; assert.ok(!W.canStepIn(H, c, dir) && W.canStepIn(H, c, dir, { bank: "all" }) && W.canStepIn(H, c, dir, { bank: new Set([i]) }) && !W.canStepIn(H, c, dir, { bank: new Set() }) && !W.canStepIn(H, c, dir, { sure: true })); }
      if (H.soft.wade[d] && H.edge[i] === EDGE.OPEN) { wade++; assert.ok(!W.canStepIn(H, c, dir) && W.canStepIn(H, c, dir, { sure: true })); } }
  }
  assert.ok(wade && scree && bank, [wade, scree, bank].join());
  const G1 = W.genWorld(11, 1), s1 = W.softGround(G1, 11); assert.equal(s1.scree.reduce((a, v) => a + v, 0), 0); assert.equal(W.bankEdges(G1, 11).reduce((a, v) => a + v, 0), 0);
});

test("banks: 3 to 5 per world (fewer only where no candidate qualifies), each opens a pocket or a shortcut of 6 steps or more, over 60 seeds per biome on generator 5 and on 2 to 4", () => {
  const dist = (G, src) => { const d = new Int16Array(NC).fill(-1), q = [src]; d[src] = 0;
    for (let h = 0; h < q.length; h++) for (const dir of Object.keys(DIRS)) { const n = stepCell(q[h], dir); if (n < 0 || d[n] >= 0 || G.island[n] || !W.canStepIn(G, q[h], dir)) continue; d[n] = d[q[h]] + 1; q.push(n); } return d; };
  const opens = (G, i) => { const [a, c] = edgeCells(i), da = dist(G, a);
    if (da[c] >= 0) return da[c] >= W.SOFT.SHORTCUT_MIN;
    if (!!G.comp[a] === !!G.comp[c]) return false;
    const f = G.comp[a] ? dist(G, c) : da; let n = 0; for (let q = 0; q < NC; q++) if (f[q] >= 0 && !G.comp[q]) n++; return n >= W.SOFT.POCKET_MIN; };
  const report = [];
  const sweep = (label, gen, biome) => {
    let worlds = 0, min = 99, max = 0, sum = 0, under = 0;
    for (let s = 1; s <= 60; s++) { const seed = s * 7919 + 13, G = W.genWorld(seed, gen, biome), bk = W.bankEdges(G, seed); let n = 0;
      for (let i = 0; i < 2 * NC; i++) if (bk[i]) { n++; assert.ok(opens(G, i), `${label} ${seed} bank ${i} opens nothing`); }
      assert.ok(n <= W.BANK.MAX, `${label} ${seed}: ${n} banks`); if (n < W.BANK.MIN) under++;
      worlds++; sum += n; min = Math.min(min, n); max = Math.max(max, n); }
    report.push(`${label}: worlds ${worlds} banks min ${min} max ${max} mean ${(sum / worlds).toFixed(2)} under-3 ${under}`);
    assert.ok(under <= worlds / 5, `${label}: ${under} worlds under ${W.BANK.MIN}`); };
  for (const b of BIOMES) sweep("gen5 " + b, 5, b);
  for (const g of [2, 3]) sweep("gen" + g + " mixed", g, "mixed");
  for (const b of BIOMES) sweep("gen4 " + b, 4, b);
  console.log(report.join("\n"));
});

// ---- the page ----
const mibi = (id, sp, o = {}) => ({ id, name: "Fig", sp, born: 0, outings: 0, notches: 0, bonded: false, care: 0, tends: 0, tendDay: null, grownTurn: null, ...o });
const walk = (seed, sp, { tier = 1, rider = false, elder = false } = {}) => {
  const p = makePage({}), run = p.run;
  run(`newWorld(${seed}); TEST.calm = true; S.turn = ${elder ? 25 : 5}; S.tier = ${tier}; S.known = [0, 1, 2]; S.mibis = [${JSON.stringify(mibi(1, sp, rider ? { born: 5 } : elder ? { born: 0 } : {}))}]; S.carried = [1]; S.lead = 1; startExpedition('weather', G.spawns[0])`);
  return p;
};
const J = (p, src) => JSON.parse(p.run(`JSON.stringify(${src})`));

test("Tuliko as the partner: range is the tier's + 1 at tier 1 and tier 2, the reach is a superset, firstPods and the hold are unchanged; the log says one ring further", () => {
  for (const tier of [1, 2]) for (const seed of [7, 19, 88]) {
    const base = walk(seed, 0, { tier }), tul = walk(seed, 19, { tier });
    const r0 = J(base, "S.exp.range"), r1 = J(tul, "S.exp.range"); assert.equal(r0, tier === 1 ? 2 : 4); assert.equal(r1, r0 + 1);
    const a = new Set(J(base, "S.exp.reach")), b = new Set(J(tul, "S.exp.reach")); for (const c of a) assert.ok(b.has(c), "superset " + seed); assert.ok(b.size >= a.size);
    assert.deepEqual(J(base, "S.pods"), J(tul, "S.pods"), "firstPods and the world's pods are the same");
    assert.deepEqual(J(base, "S.exp.hold"), J(tul, "S.exp.hold")); assert.ok(J(tul, "S.log").some(l => /one ring further/.test(JSON.stringify(l))));
  }
});

test("a rider Tuliko or Rupar changes nothing: range and reach are the same as with no partner", () => {
  for (const sp of [19, 7]) for (const seed of [7, 19]) {
    const none = makePage({}), run = none.run; run(`newWorld(${seed}); TEST.calm = true; S.known = [0, 1, 2]; startExpedition('weather', G.spawns[0])`);
    const rid = walk(seed, sp, { rider: true }); assert.equal(J(rid, "S.exp.pt"), null);
    assert.equal(J(rid, "S.exp.range"), J(none, "S.exp.range")); assert.deepEqual(J(rid, "S.exp.reach"), J(none, "S.exp.reach"));
  }
});

test("Rupar's reach is a superset of a Loika partner's", () => {
  let more = 0;
  for (const seed of [7, 19, 88, 140, 250, 400]) { const a = new Set(J(walk(seed, 0, { tier: 2 }), "S.exp.reach")), b = new Set(J(walk(seed, 7, { tier: 2 }), "S.exp.reach")); for (const c of a) assert.ok(b.has(c)); if (b.size > a.size) more++; }
  assert.ok(more >= 1, "banks open ground in some world");
});

// A bank edge inside a walk's range: its two cells and the direction from the first to the second.
const bankStep = p => { const e = J(p, "(() => { for (let i = 0; i < 2 * MW * MH; i++) if (G.banks[i]) return i; return -1; })()");
  const a = e >> 1, dir = e & 1 ? "down" : "right"; return { e, a, dir, b: dir === "down" ? a + 16 : a + 1 }; };

test("Rupar digs a bank: the first crossing costs one extra action (an elder two), then it crosses at a normal step for the walk; a Loika is refused and pins it", () => {
  const p = walk(7, 7, { tier: 2 }), { e, a, dir, b } = bankStep(p);
  p.run(`S.exp.start = ${a}; S.exp.pos = ${a}; S.exp.range = 4; S.exp.actions = 0`);
  p.run(`mapStep(${JSON.stringify(dir)})`);
  assert.equal(J(p, "S.exp.pos"), b); assert.equal(J(p, "S.exp.actions"), 2, "dig and step"); assert.deepEqual(J(p, "S.exp.dug"), [e]);
  assert.ok(J(p, "S.log").some(l => /dug a way (up|down) the bank/.test(JSON.stringify(l))));
  const back = dir === "down" ? "up" : "left"; p.run(`mapStep(${JSON.stringify(back)})`); assert.equal(J(p, "S.exp.pos"), a); assert.equal(J(p, "S.exp.actions"), 3, "a dug bank crosses at a normal step");
  const el = walk(7, 7, { tier: 2, elder: true }); el.run(`S.exp.start = ${a}; S.exp.pos = ${a}; S.exp.range = 4; S.exp.actions = 0; mapStep(${JSON.stringify(dir)})`);
  assert.equal(J(el, "S.exp.pos"), a); assert.equal(J(el, "S.exp.actions"), 1); assert.match(el.run("FX.msg"), /is digging · slow but sure/);
  el.run(`mapStep(${JSON.stringify(dir)})`); assert.equal(J(el, "S.exp.pos"), b); assert.equal(J(el, "S.exp.actions"), 3, "an elder pays two extra");
  const lo = walk(7, 0, { tier: 2 }); lo.run(`S.exp.start = ${a}; S.exp.pos = ${a}; S.exp.range = 4; mapStep(${JSON.stringify(dir)})`);
  assert.equal(J(lo, "S.exp.pos"), a); assert.equal(lo.run("FX.msg"), "Earth bank · needs a digger · pinned"); assert.ok(J(lo, "S.pins").some(q => q.k === "bank"));
});

test("Tuliko crosses mud and scree; the first crossing of a walk is logged once; a Loika is told 'needs a rambler' and pins it", () => {
  const p = walk(7, 19, { tier: 2 });
  const sc = J(p, "(() => { for (let i = 0; i < 2 * MW * MH; i++) if (G.soft.scree[i]) return i; return -1; })()"), a = sc >> 1, dir = sc & 1 ? "down" : "right", b = dir === "down" ? a + 16 : a + 1;
  p.run(`S.exp.start = ${a}; S.exp.pos = ${a}; S.exp.range = 4; mapStep(${JSON.stringify(dir)})`);
  assert.equal(J(p, "S.exp.pos"), b); assert.equal(J(p, "S.log").filter(l => /crosses the scree, sure-footed/.test(JSON.stringify(l))).length, 1);
  const lo = walk(7, 0, { tier: 2 }); lo.run(`S.exp.start = ${a}; S.exp.pos = ${a}; S.exp.range = 4; mapStep(${JSON.stringify(dir)})`);
  assert.equal(J(lo, "S.exp.pos"), a); assert.equal(lo.run("FX.msg"), "Loose scree · needs a rambler · pinned");
});

test("a Tuikis is needed on every visit: dug this walk it is open for the walk only; a save with S.opened keeps it open for any partner", () => {
  const p = walk(7, 1, { tier: 2 }), key = J(p, "String(G.gate)");
  p.run(`{ ensureLive(${JSON.stringify(key)}); const g = layout(${JSON.stringify(key)}).feats.find(f => f.kind === 'g'); S.exp.patch = { key: ${JSON.stringify(key)}, x: g.x, y: g.y + 1, dir: 'up', noise: 'creep' }; dig(); }`);
  assert.ok(!J(p, "!!S.opened[G.gate]")); assert.equal(J(p, "S.exp.burrowDug"), 1); assert.ok(J(p, "burrowOpen()"));
  assert.ok(J(p, "S.log").some(l => /dug the burrow out wide enough/.test(JSON.stringify(l))));
  const lo = walk(7, 0, { tier: 2 }); lo.run(`{ const k = String(G.gate); ensureLive(k); const g = layout(k).feats.find(f => f.kind === 'g'); S.exp.patch = { key: k, x: g.x, y: g.y + 1, dir: 'up', noise: 'creep' }; unveil(k, g.x, g.y, 2); }`);
  assert.ok(!J(lo, "burrowOpen()")); assert.equal(J(lo, "patchAction().label"), "Too narrow");
  lo.run("S.opened[G.gate] = 1"); assert.ok(J(lo, "burrowOpen()")); assert.equal(J(lo, "patchAction().label"), "Go down the burrow");
});

test("the turn after a walk that dug a bank or the burrow says the ground shifted back, with a shift event; at most three lines", () => {
  const p = walk(7, 7, { tier: 2 }), { e, a, dir } = bankStep(p);
  p.run(`S.exp.start = ${a}; S.exp.pos = ${a}; S.exp.range = 4; mapStep(${JSON.stringify(dir)})`);
  let r = J(p, "worldTurn({ trail: [], storm: [] })"); const i = r.ev.findIndex(x => x[0] === "shift");
  assert.ok(i >= 0 && r.ev.length <= 3 && r.lines.length === r.ev.length, JSON.stringify(r)); assert.equal(r.lines[i], "The ground shifted, and the bank Fig dug is whole again."); assert.equal(r.ev[i][2], 1); assert.equal(r.ev[i][3], 1);
  const t = walk(7, 1, { tier: 2 }); t.run("S.exp.burrowDug = 1"); r = J(t, "worldTurn({ trail: [], storm: [] })");
  assert.ok(r.lines.includes("The ground shifted, and the burrow Fig dug out is narrow again."), JSON.stringify(r.lines));
  const q = walk(7, 7, { tier: 2 }); q.run(`S.exp.dug = [${e}]; S.carried = []`); r = J(q, "worldTurn({ trail: [], storm: [] })");
  assert.ok(r.lines.includes("The ground shifted, and the dug bank is whole again."), JSON.stringify(r.lines));
});

test("the ab keys and ability lines: sure (Tuliko), bank (Rupar), dig (Tuikis, the new line); every other kind stays without one", () => {
  const p = makePage({}); p.run("newWorld(7)");
  assert.deepEqual(J(p, "[SPECIES[19].name, SPECIES[19].ab, SPECIES[19].abText]"), ["Tuliko", "sure", "crosses mud and scree; reaches one ring further"]);
  assert.deepEqual(J(p, "[SPECIES[7].name, SPECIES[7].ab, SPECIES[7].abText]"), ["Rupar", "bank", "digs a way up or down earth banks"]);
  assert.deepEqual(J(p, "[SPECIES[1].ab, SPECIES[1].abText]"), ["dig", "digs out narrow burrows"]);
  assert.deepEqual(J(p, "SPECIES.map((s, i) => [i, s.ab]).filter(([i, a]) => a && ![0, 1, 2, 7, 19].includes(i))"), []);
  assert.deepEqual(J(p, "[PIN_TEXT.soft, PIN_TEXT.bank, PIN_TEXT.burrow]"), ["needs a rambler", "needs a digger", "too narrow"]);
});

test("fords: a ford cell is a 'ford' in the map's words, never 'shallows'", () => {
  const p = makePage({}); p.run("newWorld(7)");
  assert.equal(J(p, "LAND_NAME[4]"), "ford"); const f = J(p, "(() => { for (let c = 0; c < MW * MH; c++) if (G.ford[c]) return c; return -1; })()");
  if (f >= 0) assert.equal(p.run(`landWord(${f})`), "ford");
});

// A place that holds a crossing of the kind (a wade, scree edge or bank edge), entered with the partner along; the screen tile of the first soft tile there.
const inPlace = (p, kind) => { const cell = J(p, `(() => { for (let c = 0; c < MW * MH; c++) { if (!("${kind}" === "WADE" ? G.soft.wade[c] : G.comp[c])) continue; const l = layout(String(c)); if (l.tiles.some(t => t === T.${kind})) return c; } return -1; })()`);
  if (cell < 0) return null; p.run(`S.exp.start = ${cell}; S.exp.pos = ${cell}; S.exp.range = 4; enterPatch()`); return J(p, `(() => { const l = curLay(); const i = l.tiles.findIndex(t => t === T.${kind}); return [i % PW, (i / PW) | 0]; })()`); };
const standX = "{ key: S.exp.patch.key, lay: curLay(), live: curLive(), P: S.exp.patch }";

test("in a place the partner follows across what it can cross: Tuliko on mud and scree, Rupar on its dug bank, nobody else", () => {
  let seen = 0;
  for (const [kind, sp] of [["WADE", 19], ["SCREE", 19], ["BANK", 7]]) for (const seed of [7, 19, 88, 140, 250, 400, 555, 777]) {
    const p = walk(seed, sp, { tier: 2 }), at = inPlace(p, kind); if (!at) continue; seen++;
    const [x, y] = at, who = "curLive().pt"; if (!J(p, who)) continue;
    const open = () => J(p, `canStand(${standX}, ${x}, ${y}, ${who})`);
    if (kind === "BANK") { assert.ok(!open(), "an undug bank holds nobody"); const q = J(p, `crossingAt(curLay(), ${x}, ${y})`); if (!q) continue; p.run(`S.exp.dug = [${q.ei}]`); }
    assert.ok(open(), kind + " seed " + seed);
    const other = walk(seed, 0, { tier: 2 }); inPlace(other, kind); if (J(other, who)) assert.ok(!J(other, `canStand(${standX}, ${x}, ${y}, ${who})`), "a Loika partner stays off it");
  }
  assert.ok(seen >= 3, "places with soft tiles seen: " + seen);
});

test("a walk that dug a bank but explored nothing still turns the world and says the ground shifted", () => {
  const p = walk(7, 7, { tier: 2 }), { a, dir } = bankStep(p);
  p.run(`S.exp.start = ${a}; S.exp.pos = ${a}; S.exp.range = 4; mapStep(${JSON.stringify(dir)})`);
  assert.ok(J(p, "S.exp.dug.length") === 1 && !J(p, "exploredAny(S.exp)"), "dug, nothing explored");
  const turn = J(p, "S.turn"); p.run("endExpedition('end')");
  assert.equal(J(p, "S.turn"), turn + 1, "the world turned"); assert.ok(!J(p, "S.report.waited")); assert.ok(J(p, "S.report.lines").some(l => /^The ground shifted/.test(l)), JSON.stringify(J(p, "S.report.lines")));
});

test("Tuliko's ring is drawn on the reach view; the message box keeps off the soft tiles of a place", () => {
  const tul = walk(7, 19, { tier: 1 }); tul.run("S.exp.pos = S.exp.start; render(0)");
  assert.ok(J(tul, "canSure()") && J(tul, "S.exp.range") === 3);
  const p = walk(7, 19, { tier: 2 }), at = inPlace(p, "SCREE");
  if (at) { p.run("RT.softScr = null; fxSign('call')"); p.run("render(0)"); const rects = J(p, "RT.softScr"), m = J(p, "msgGeom()");
    if (m) for (const r of rects) assert.ok(!(r.x < m.x + m.w && r.x + r.w > m.x && r.y < m.y + m.h && r.y + r.h > m.y), "the box covers a soft tile"); }
});

test("the card fields: abCard and abCardShort, and every changed line fits its slot at the worst-case 8-letter name", () => {
  const p = makePage({}); p.run("newWorld(7)"); const W8 = "Wmwmwmwm";
  const w = (s, f = "textW") => p.run(`${f}(${JSON.stringify(s)}, 2)`), ab = (sp, short) => p.run(`abCardOf(${sp}, ${!!short})`);
  assert.equal(ab(19), "mud and scree · one ring further"); assert.equal(ab(19, true), "one ring further");
  assert.equal(ab(7), "digs up or down banks"); assert.equal(ab(7, true), "digs up or down banks"); assert.equal(ab(1), "digs out burrows"); assert.equal(ab(0), "calms wary creatures");
  const slow = " · slow, keen", sizes = [];
  for (const [sp, nm] of [[19, "Tuliko"], [7, "Rupar"], [1, "Tuikis"]]) {
    const set = ab(sp), page = [nm + " · " + ab(sp), nm + " · " + ab(sp, true) + " once grown", nm + " · " + ab(sp, true) + slow], card = [ab(sp), ab(sp, true) + slow];
    sizes.push([nm, "set-out " + w(set)]); assert.ok(w(set) <= 306, nm + " set-out card " + w(set));
    for (const s of page) { sizes.push([s, w(s)]); assert.ok(w(s) <= 390, s + " " + w(s)); }
    for (const s of card) { sizes.push([s, w(s)]); assert.ok(w(s) <= 314, s + " " + w(s)); } }
  const deep = "Caves · " + W8 + " digs a way in"; sizes.push([deep, w(deep)]); assert.ok(w(deep) <= 306, "deep ground card " + w(deep));
  p.run(`S.turn = 5; S.known = [0, 1, 2]; S.mibis = [{ id: 1, name: ${JSON.stringify(W8)}, sp: 19, born: 0, outings: 0, notches: 0, bonded: false, care: 0, tends: 0, tendDay: null, grownTurn: null }]; S.carried = [1]; S.lead = 1`);
  for (const sp of [19, 7, 1]) { p.run(`S.mibis[0].sp = ${sp}`);
    const r = p.run(`lineCtx({ ok: 'Open Mibis', back: 'menu', ctx: partnerCtx() })`), forms = p.run("partnerCtx()"), last = forms[forms.length - 1];
    sizes.push(["bottom line " + sp + " (avail " + r.avail + ")", w(last, "textWT")]); assert.ok(!r.r.includes("…")); assert.equal(r.r, forms.find(f => w(f, "textWT") <= r.avail) ?? r.r); }
  p.run("S.mibis[0].name = \"Fig\""); { const forms = p.run("partnerCtx()"), r = p.run("lineCtx({ ok: \"Open Mibis\", back: \"menu\", ctx: partnerCtx() })"); assert.ok(w(forms[forms.length - 1], "textWT") <= r.avail, "the tight form fits a 3-letter name (a longer name drops to the name alone at the dot cut, never an ellipsis): " + w(forms[forms.length - 1], "textWT") + " of " + r.avail); }
  p.run("S.mibis[0].sp = 19"); const forms = p.run("partnerCtx()"); assert.equal(forms.length, 3); assert.match(forms[0], /crosses mud and scree; reaches one ring further$/); assert.match(forms[1], /mud and scree · one ring further$/); assert.match(forms[2], /Partner: Fig · one ring further$/);
  for (const l of ["Needs a rambler", "Needs a digger"]) assert.ok(l.length <= 24);
  assert.ok(w("Mud or scree · needs a rambler") <= 322, "the sign name line");
  console.log(sizes.map(([s, n]) => n + "  " + s).join("\n"));
});
