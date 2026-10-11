// X2, the first expedition always finds pods (game designer's first-pod ruling and its tests 1 to 6, plus the Untuva meal hint).
// The whole page script is read out of index.html and run in a sandbox with the browser stubbed (freeze.test.mjs's harness),
// so firstPods, genLife and the play run are the page's own.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";
import * as W from "../src/world.mjs";

const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const MODULE = PAGE.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const IMPORT = /^import \{([^}]*)\} from "\.\/src\/world\.mjs";$/m;
const BINDINGS = MODULE.match(IMPORT)[1].split(",").map(s => s.trim().split(/\s+as\s+/));
const SCRIPT = MODULE.replace(IMPORT, "");

function page(store = {}) {
  const any = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => "" : k === Symbol.iterator ? function* () {} : k === "then" ? undefined : any,
    apply: () => any, construct: () => any, set: () => true });
  const clock = { t: 1000, timers: [] };
  const ctx = { console, URLSearchParams, Date, fetch: () => new Promise(() => {}), document: any, location: any, navigator: any,
    matchMedia: () => ({ matches: true }), requestAnimationFrame: () => 0, addEventListener: () => {}, innerWidth: 450, innerHeight: 600,
    performance: { now: () => clock.t }, setTimeout: (f, ms) => { clock.timers.push({ f, at: clock.t + (ms || 0) }); return clock.timers.length; }, clearTimeout: () => {},
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
  ctx.window = ctx; for (const [from, to = from] of BINDINGS) ctx[to] = W[from]; vm.createContext(ctx); vm.runInContext(SCRIPT, ctx);
  const run = src => vm.runInContext(src, ctx);
  const p = {
    run, store,
    get S() { return run("S"); },
    pass(ms) { const end = clock.t + ms; for (;;) { clock.timers.sort((a, b) => a.at - b.at); const n = clock.timers[0]; if (!n || n.at > end) break; clock.timers.shift(); clock.t = n.at; n.f(); } clock.t = end; },
    key(k) { p.pass(400); run("act(" + JSON.stringify(k) + ")"); },
  };
  return p;
}
const plain = x => JSON.parse(JSON.stringify(x));
const buried = p => p.h === 1 && p.bur === 1;
const SEEDS = Array.from({ length: 1000 }, (_, i) => i + 1);
// One sandbox for the pure checks: G is set per seed, S is never read by genLife or firstPods.
const P0 = page();
const life = s => { P0.run(`G = genWorld(${s}, 2)`); return plain(P0.run(`genLife(${s})`)); };
const first = (s, glint, pods) => plain(P0.run(`firstPods(${s}, ${glint}, ${JSON.stringify(pods)})`));
const geo = () => plain(P0.run(`({ spawns: G.spawns, gate: G.gate, deep: G.deep, swim: G.swim, glow: G.glow, land: G.land, comp: G.comp, island: G.island,
  pass: G.land.map((_, c) => passable(c)), reach: Object.fromEntries(G.spawns.map(g => [g, reachCells(g, TIER[1].range)])) })`));
const dist = (a, b) => W.cheb(W.cxy(a), W.cxy(b));

// Every seed and glint, computed once: the world pods, the added ones, the geography they are judged on.
const ROWS = [];
for (const s of SEEDS) {
  const { pods } = life(s), g = geo();
  for (const glint of g.spawns) ROWS.push({ s, glint, pods, add: first(s, glint, pods), g });
}

// ---- test 1 ----
// Baseline measured on main c54b90f9 before the change (pods = genLife's alone): of the 5,000 glints, 3,174 hold no buried pod
// in tier 1 reach and 4,928 fail this test's whole rule (fewer than 2 in reach, or no Loika pod at distance 1 in reach).
test("1. the guarantee: 1,000 seeds × 5 glints, at least 2 buried pods in tier 1 reach and a Loika pod next to the glint", () => {
  let pass = 0, before = 0, none = 0;
  const ok = (pods, r, glint) => pods.filter(p => buried(p) && r.includes(+p.k)).length >= 2 && pods.some(p => buried(p) && p.sp === 0 && r.includes(+p.k) && dist(+p.k, glint) === 1);
  for (const { glint, pods, add, g } of ROWS) {
    const r = g.reach[glint];
    if (ok([...pods, ...add], r, glint)) pass++;
    if (!ok(pods, r, glint)) before++;
    if (!pods.some(p => buried(p) && r.includes(+p.k))) none++;
  }
  assert.equal(ROWS.length, 5000);
  assert.equal(pass, 5000, "every glint of every seed holds the guarantee");
  assert.equal(none, 3174, "the baseline: glints with no buried pod in reach before the rule");
  assert.equal(before, 4928, "the baseline: glints failing the whole rule before the rule");
});

// ---- test 2 ----
test("2. placement is legal: eligible cells, one buried pod per cell, A a Loika at distance 1, B a Tuikis at the edge only when needed", () => {
  const eligible = (g, glint, c, taken) => g.reach[glint].includes(c) && !g.spawns.includes(c) && c !== g.gate && c !== g.deep && c !== g.swim && !g.island[c]
    && g.land[c] !== W.L.WATER && g.comp[c] === 1 && g.pass[c] && !taken.has(String(c));
  let aGround = 0, bGround = 0, bAdded = 0;
  for (const { glint, pods, add, g } of ROWS) {
    assert.ok(add.length <= 2);
    const taken = new Set(pods.filter(buried).map(p => p.k)), r = g.reach[glint];
    for (const p of add) {
      assert.deepEqual(Object.keys(p).sort(), ["bur", "g", "h", "how", "id", "k", "sp", "x", "y"]);
      assert.ok(p.id === "fa" || p.id === "fb");
      assert.ok(p.h === 1 && p.bur === 1 && p.x === -1 && p.y === -1 && p.how === "ground");
      assert.equal(p.g, ["meadow", "pond", "rock", "wood", "pond", "rock"][g.land[+p.k]]);
      assert.ok(eligible(g, glint, +p.k, taken), `seed ${glint}: ${p.id} on an eligible cell`);
      taken.add(p.k);
    }
    const all = [...pods, ...add].filter(buried), keys = all.map(p => p.k);
    assert.equal(new Set(keys).size, keys.length, "one buried pod per cell");
    const a = add.find(p => p.id === "fa"), b = add.find(p => p.id === "fb");
    const loikaNext = pods.some(p => buried(p) && p.sp === 0 && r.includes(+p.k) && dist(+p.k, glint) === 1);
    assert.equal(!!a, !loikaNext, "A is added unless a buried Loika pod already lies next to the glint");
    const taken0 = new Set(pods.filter(buried).map(p => p.k));
    if (a) {
      assert.equal(a.sp, 0); assert.equal(dist(+a.k, glint), 1);
      const d1 = r.filter(c => dist(c, glint) === 1 && eligible(g, glint, c, taken0));
      if (d1.some(c => g.land[c] === W.L.MEADOW || g.land[c] === W.L.POND)) { assert.ok([W.L.MEADOW, W.L.POND].includes(g.land[+a.k])); aGround++; }
      else if (d1.some(c => !g.glow.includes(c))) assert.ok(!g.glow.includes(+a.k), "A off the glow cell when it can be");
    }
    const afterA = [...pods, ...(a ? [a] : [])].filter(p => buried(p) && r.includes(+p.k)).length;
    assert.equal(!!b, afterA < 2, "B exists only when the reach held fewer than 2 after A");
    if (b) {
      bAdded++;
      assert.equal(b.sp, 1); assert.equal(dist(+b.k, glint), 2);
      const taken1 = new Set([...taken0, ...(a ? [a.k] : [])]);
      const d2 = r.filter(c => dist(c, glint) === 2 && eligible(g, glint, c, taken1));
      if (d2.some(c => g.land[c] === W.L.ROCK || g.land[c] === W.L.WOOD)) { assert.ok([W.L.ROCK, W.L.WOOD].includes(g.land[+b.k])); bGround++; }
    }
  }
  console.log(`# A on meadow or pond ${aGround}, B added ${bAdded}, B on rock field or wood ${bGround}`);
});

// ---- test 3 ----
test("3. pure and deterministic: equal results, the pods argument unchanged", () => {
  for (const s of [1, 2, 3, 42, 999]) {
    const { pods } = life(s), before = JSON.stringify(pods);
    for (const glint of geo().spawns) {
      const ctxPods = P0.run(`(globalThis.__p = ${before})`);
      const a = plain(P0.run(`firstPods(${s}, ${glint}, __p)`)), b = plain(P0.run(`firstPods(${s}, ${glint}, __p)`));
      assert.deepEqual(a, b);
      assert.equal(JSON.stringify(ctxPods), before, "pods not mutated");
    }
  }
});

// ---- test 4 ----
// Pinned from main c54b90f9 before the change: genLife(s) for seeds 1 to 1000 on genWorld(s, 2), and world-vectors.json's bytes.
const GENLIFE_DIGEST = "bded648704592ec2944290393c1130442325dbcb12ff855a545da9fc51ff7dec";
const VECTORS_SHA = "e666da87d8100678a9d5d5d9bbd24473ef6477e343802cea5cb4451a48bd6709";
test("4. the world is unchanged: genLife's output and generator 2's frozen vectors", () => {
  const h = createHash("sha256");
  for (const s of SEEDS) h.update(JSON.stringify(life(s)) + "\n");
  assert.equal(h.digest("hex"), GENLIFE_DIGEST);
  const vec = readFileSync(new URL("./world-vectors.json", import.meta.url));
  assert.equal(createHash("sha256").update(vec).digest("hex"), VECTORS_SHA);
});

// ---- test 5 ----
const added = p => plain(p.S.pods.filter(q => q.id === "fa" || q.id === "fb").map(q => q.id));
test("5. it runs once: the first placement adds the pods, a second expedition and a loaded save add nothing", () => {
  for (const s of [1, 7, 42]) {
    const store = {}, p = page(store);
    p.run(`newWorld(${s}); TEST.calm = true; startExpedition('weather', G.spawns[0])`);
    const want = first(s, p.run("G.spawns[0]"), life(s).pods).map(q => q.id);
    assert.ok(want.length >= 1);
    assert.deepEqual(added(p), want, "the first placement adds them");
    const n = p.S.pods.length;
    p.run("mapStep('right'); mapStep('left'); mapStep('up'); mapStep('down'); endExpedition('home'); save()");
    p.run("startExpedition('weather', G.spawns[0])");
    assert.equal(p.S.pods.length, n, "a second expedition adds nothing");
    p.run("endExpedition('home'); save()");
    const q = page(store);
    assert.equal(q.run("load()"), true);
    const m = q.S.pods.length;
    q.run("startExpedition('weather', G.spawns[1])");
    assert.equal(q.S.pods.length, m, "a save past first placement adds nothing");
    assert.equal(q.S.pods.filter(x => x.id === "fa").length <= 1, true);
  }
});

// ---- test 6 ----
// Walk the map on foot to a cell, the page's keys only.
function mapPath(p, to) {
  const from = p.S.exp.pos, reach = new Set(p.run("S.exp.reach")), prev = new Map([[from, null]]), q = [from];
  while (q.length) { const c = q.shift(); if (c === to) break;
    for (const dir of ["up", "down", "left", "right"]) { const d = p.run(`stepCell(${c}, '${dir}')`);
      if (d < 0 || prev.has(d) || !reach.has(d) || !p.run(`canStep(${c}, '${dir}')`)) continue; prev.set(d, [c, dir]); q.push(d); } }
  const out = []; for (let c = to; prev.get(c); c = prev.get(c)[0]) out.unshift(prev.get(c)[1]);
  return out;
}
// Inside a place: the first step of a shortest walk to a tile beside (x, y), creatures and things in the way; null when boxed in.
const NEXT_STEP = `(x, y) => { const P = S.exp.patch, D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, seen = new Map([[P.y * PW + P.x, null]]), q = [[P.x, P.y]];
  while (q.length) { const [cx, cy] = q.shift();
    for (const [dir, [dx, dy]] of Object.entries(D)) { const X = cx + dx, Y = cy + dy, i = Y * PW + X;
      if (X < 0 || Y < 0 || X >= PW || Y >= PH || seen.has(i) || occupant(P.key, X, Y, 'player')) continue;
      seen.set(i, [cy * PW + cx, dir]); if (Math.abs(X - x) + Math.abs(Y - y) === 1) { let j = i, st = null; while (seen.get(j)) { st = seen.get(j)[1]; j = seen.get(j)[0]; } return st; } q.push([X, Y]); } }
  return null; }`;
// Walk toward the pod until done() holds, one creep step at a time (recomputed each step: creatures move).
function walkPod(p, id, done) {
  const next = p.run("(" + NEXT_STEP + ")");
  for (let n = 0; n < 200; n++) {
    const pod = p.S.pods.find(q => q.id === id); if (!pod || done(pod, p.S.exp.patch)) return true;
    const st = next(pod.x, pod.y); p.key(st || "confirm");   // boxed in by creatures: wait a beat
  }
  return false;
}
// Beside it: face it and dig it up.
function digUp(p, id) {
  const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  for (let n = 0; n < 5; n++) {
    if (!walkPod(p, id, (pod, P) => Math.abs(P.x - pod.x) + Math.abs(P.y - pod.y) === 1)) return false;
    const pod = p.S.pods.find(q => q.id === id); if (!pod) return true;
    const P = p.S.exp.patch, dir = Object.keys(D).find(d => P.x + D[d][0] === pod.x && P.y + D[d][1] === pod.y);
    p.key(dir); p.key("confirm"); if (!p.S.pods.some(q => q.id === id)) return true;
  }
  return false;
}
const PLAY_SEEDS = +(process.env.FIRST_PODS_SEEDS || 200);   // the full 1,000: FIRST_PODS_SEEDS=1000
test(`6. gettable in play: calm, start at glint 0, walk in, Call, dig up fa and fb (seeds 1 to ${PLAY_SEEDS})`, () => {
  let a = 0, b = 0, again = 0, wantA = 0, wantB = 0;
  for (let s = +(process.env.FIRST_PODS_FROM || 1); s <= PLAY_SEEDS; s++) {
    const p = page();
    p.run(`newWorld(${s}); TEST.calm = true;`);
    p.key("confirm"); p.key("confirm");   // Weather, then the cursor's glint: glint 0 on a new world
    assert.equal(p.S.exp.start, p.run("G.spawns[0]"), `seed ${s}: started at glint 0`);
    for (const id of ["fa", "fb"]) {
      const pod = p.S.pods.find(q => q.id === id); if (!pod) continue;
      if (id === "fa") wantA++; else wantB++;
      if (p.S.exp.patch) p.run("leavePatch()");
      for (const dir of mapPath(p, +pod.k)) p.key(dir);
      assert.equal(p.S.exp.pos, +pod.k, `seed ${s}: walked into ${id}'s cell`);
      p.key("confirm"); assert.equal(p.S.phase, "patch");
      p.key("call");
      // a fog bank muffles the Call to 6 tiles: walk on toward it and Call again, as the muffled line says
      if (p.S.pods.find(q => q.id === id).h) { again++; assert.ok(walkPod(p, id, (pod, P) => Math.hypot(P.x - pod.x, P.y - pod.y) <= 5), `seed ${s}: walked toward ${id}`); p.key("call"); }
      const seen = p.S.pods.find(q => q.id === id);
      assert.ok(seen.h === 0 && seen.x >= 0, `seed ${s}: the Call lifts ${id}`);
      assert.ok(digUp(p, id), `seed ${s}: ${id} dug up`);
      assert.ok(p.S.exp.cargo.pods.some(q => q.id === id), `seed ${s}: ${id} in the cargo`);
      if (id === "fa") a++; else b++;
    }
  }
  console.log(`# taken in play: fa ${a}, fb ${b} over ${PLAY_SEEDS} seeds; a second Call after a short walk (fog) ${again}`);
  assert.equal(a, wantA); assert.equal(b, wantB);
});

// ---- the Untuva meal hint (copywriter's cmp.hint.untuvaMeal) ----
const KNOWN = "A well-fed Untuva may drop a pod · put the fruit down, back off three tiles";
const UNKNOWN = "A well-fed round creature may drop a pod · put the fruit down, back off three tiles";
function withUntuva(known) {
  const p = page();
  p.run(`newWorld(3); TEST.calm = true; ${known ? "S.known.push(2);" : ""} startExpedition('weather', G.spawns[0]); enterPatch(); S.found.push('callintro', 'backplace');`);
  const put = () => p.run(`(() => { const P = S.exp.patch, live = curLive(); live.cr = live.cr.filter(c => c.sp !== 2);
    for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, -2]]) if (!occupant(P.key, P.x + dx, P.y + dy, 'player')) {
      live.cr.push({ id: 9999, sp: 2, x: P.x + dx, y: P.y + dy, st: 'idle', t: 0, wet: 0, calm: 0, curl: 0, hide: 0, b: .5, face: 1, ready: false }); return true; } return false; })()`);
  // one creep step onto a free tile: an action that keeps the fruit in hand
  const step = () => { const dir = ["left", "right", "up", "down"].find(d => p.run(`(() => { const P = S.exp.patch, [dx, dy] = DIRS['${d}'], x = P.x + dx, y = P.y + dy;
    return x > 0 && y > 0 && x < PW - 1 && y < PH - 1 && !occupant(P.key, x, y, 'player'); })()`)); p.key(dir); };
  return { p, put, step };
}
test("the Untuva meal hint: the unknown variant names no species, the known one does, and it fires once", () => {
  for (const known of [false, true]) {
    const { p, put, step } = withUntuva(known), want = known ? KNOWN : UNKNOWN, other = known ? UNKNOWN : KNOWN;
    assert.ok(put()); step();   // empty-handed: no hint
    assert.ok(!p.run("FX.msg").includes(want));
    assert.ok(put()); p.run("S.exp.carry = 'fruit'"); step();   // fruit in hand, an Untuva in sight
    if (!p.run("FX.msg").includes(want)) step();   // a line too full for both (the fruit bubble's first help) shows it on the next action
    assert.ok(p.run("FX.msg").includes(want), `shown: ${p.run("FX.msg")}`);
    assert.ok(!p.run("FX.msg").includes(other));
    if (!known) assert.ok(!/Untuva/.test(p.run("FX.msg")), "the unknown variant never names the species");
    assert.ok(p.S.found.includes("cmp.hint.untuvaMeal"), "spent once shown");
    for (let i = 0; i < 4; i++) { put(); p.run("S.exp.carry = 'fruit'"); step(); assert.ok(!p.run("FX.msg").includes(want), "never again"); }
  }
});
