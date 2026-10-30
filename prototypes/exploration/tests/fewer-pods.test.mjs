// Fewer shed pods: a plain creature of a known species is ready 1 in 10, one of a species not yet known
// always, a fed or settled one sheds 1 in 2 at its moment, at most one moment pod an expedition (a returned line's pod apart), and the pod's why
// rides into the hold and the crate. The page script runs in a sandbox with the browser stubbed (first-pods.test.mjs's harness).
//   node --test prototypes/exploration/tests/fewer-pods.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";
import * as W from "../src/world.mjs";
import * as A from "../src/atlas.mjs";
import * as V from "../src/view.mjs";

const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const MODULE = PAGE.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const MODS = { world: W, view: V, atlas: A };
const IMPORT_RE = /^import \{([^}]*)\} from "\.\/src\/(\w+)\.mjs";$/gm;
const BINDINGS = [...MODULE.matchAll(IMPORT_RE)].flatMap(m => m[1].split(",").map(s => s.trim().split(/\s+as\s+/)).map(([f, t = f]) => [m[2], f, t]));
const SCRIPT = MODULE.replace(IMPORT_RE, "");

function page(store = {}) {
  const any = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => "" : k === Symbol.iterator ? function* () {} : k === "then" ? undefined : any,
    apply: () => any, construct: () => any, set: () => true });
  const clock = { t: 1000, timers: [] };
  const ctx = { console, URLSearchParams, Date, fetch: () => new Promise(() => {}), document: any, location: any, navigator: any,
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }), requestAnimationFrame: () => 0, addEventListener: () => {}, innerWidth: 450, innerHeight: 600,
    performance: { now: () => clock.t }, setTimeout: (f, ms) => { clock.timers.push({ f, at: clock.t + (ms || 0) }); return clock.timers.length; }, clearTimeout: () => {},
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
  ctx.window = ctx; for (const [mod, from, to] of BINDINGS) ctx[to] = MODS[mod][from]; vm.createContext(ctx); vm.runInContext(SCRIPT, ctx);
  return src => vm.runInContext(src, ctx);
}
const plain = x => JSON.parse(JSON.stringify(x));

// The creatures each open place loads on expedition n, as (species, ready): the expedition's live places are dropped between loads, so each load rolls afresh.
const LOADS = `(n) => { S.exp.n = n; S.exp.live = {}; const out = [];
  for (const c of [...new Set(S.cr.filter(w => !w.cv).map(w => w.c))]) for (const k of ensureLive(String(c)).cr) out.push([k.sp, k.ready]);
  return out; }`;

test("1. plain chance: over 2,000 seeded loads of known species, each species is ready 0.1 ± 0.02", () => {
  const n = [0, 0, 0], ready = [0, 0, 0];
  for (let s = 1; n.some(k => k < 2000) && s < 400; s++) {
    const run = page(); run(`newWorld(${s}); TEST.calm = true; S.known = [0, 1, 2]; startExpedition('weather', G.spawns[0])`);
    const loads = run("(" + LOADS + ")");
    for (let e = 3; e <= 6; e++) for (const [sp, r] of plain(loads(e))) { if (sp < 0 || sp > 2) continue; n[sp]++; if (r) ready[sp]++; }
  }
  for (const sp of [0, 1, 2]) {
    assert.ok(n[sp] >= 2000, `species ${sp}: ${n[sp]} loads`);
    const share = ready[sp] / n[sp]; assert.ok(Math.abs(share - 0.1) <= 0.02, `species ${sp}: ready ${share.toFixed(3)} of ${n[sp]}`);
  }
  console.log(`# loads ${n.join(" / ")}, ready ${ready.map((r, i) => (r / n[i]).toFixed(3)).join(" / ")}`);
});

test("2. never seen: a creature of a species not in S.known is always ready, a known one mostly not", () => {
  let unknown = 0, known = 0, knownReady = 0;
  for (const s of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const run = page(); run(`newWorld(${s}); TEST.calm = true; S.known = [0]; startExpedition('weather', G.spawns[0])`);
    const loads = run("(" + LOADS + ")");
    for (let e = 3; e <= 5; e++) for (const [sp, r] of plain(loads(e))) {
      if (sp === 1 || sp === 2) { unknown++; assert.equal(r, true, `seed ${s}: a never-seen ${sp} is ready`); }
      else if (sp === 0) { known++; if (r) knownReady++; }
    }
  }
  assert.ok(unknown > 100 && known > 50, `${unknown} never seen, ${known} known`);
  assert.ok(knownReady / known < 0.25, "the known species keeps the plain chance");
});

// Inside the first place: the creatures as the page loads them, an X for creatureTick, a creature put at its moment ('full' sheds as a meal).
function inPlace(s, setup = "") {
  const run = page(); run(`newWorld(${s}); TEST.calm = true; S.known = [0, 1, 2]; ${setup} startExpedition('weather', G.spawns[0]); enterPatch(); S.exp.n = 5;`);
  run(`globalThis.__X = () => ({ lay: curLay(), live: curLive(), key: S.exp.patch.key, P: S.exp.patch, raining: false, fog: false, strike: null, ring: null, pulse: false, reach: 7, moved: false, noise: 'act', carry: null, ptName: null, away: () => false, pt: null, ptAb: null, ptSp: -1, ptElder: false });
    globalThis.__moment = (c) => { const before = S.exp.stats.sheds; c.st = 'full'; creatureTick(c, __X()); return S.exp.stats.sheds > before; };`);
  return run;
}

test("3. bond: a fed or settled creature sheds at its moment about half the time; one never fed nor settled about 1 in 10", () => {
  let bondN = 0, bondShed = 0, plainN = 0, plainShed = 0;
  for (let s = 1; s <= 12; s++) {
    const run = inPlace(s);
    // every creature of every open place, as known species, on several expeditions: its moment with and without a bond (the cap reset each time)
    const r = plain(run(`(() => { const out = []; for (let n = 5; n <= 8; n++) { S.exp.n = n; S.exp.live = {}; S.exp.momented = {};
      for (const c of [...new Set(S.cr.filter(w => !w.cv).map(w => w.c))]) for (const k of ensureLive(String(c)).cr) { if (k.sp < 0 || k.sp > 2) continue;
        const w = crById.get(k.id), was = w.s;
        S.exp.stats.sheds = 0; const plainOk = shedAllowed({ ...k, st: 'full' }, { live: ensureLive(String(c)) });
        S.exp.momented[k.id + ':' + (k.sp === 1 ? 'settle' : 'eat')] = 1;
        S.exp.stats.sheds = 0; const bondOk = shedAllowed({ ...k, st: 'full' }, { live: ensureLive(String(c)) });
        w.s = was; out.push([plainOk, bondOk]); } } return out; })()`));
    for (const [p, b] of r) { plainN++; bondN++; if (p) plainShed++; if (b) bondShed++; }
  }
  const pb = bondShed / bondN, pp = plainShed / plainN;
  console.log(`# bond ${pb.toFixed(3)} of ${bondN}, plain ${pp.toFixed(3)} of ${plainN}`);
  assert.ok(bondN > 10000);
  // a bond sheds when ready (0.1) or on its 1 in 2 roll: about 0.55
  assert.ok(pb >= 0.47 && pb <= 0.63, `bond ${pb}`);
  assert.ok(pp >= 0.07 && pp <= 0.13, `plain ${pp}`);
  // end to end: a fed creature at its moment drops a pod that says why
  let shown = 0;
  for (let s = 1; s <= 40 && !shown; s++) {
    const run = inPlace(s);
    const got = run(`(() => { for (const c of curLive().cr) { if (c.sp < 0 || c.sp > 2) continue; c.ready = false; S.exp.momented[c.id + ':eat'] = 1;
      if (__moment(c)) return { pod: S.pods.at(-1), msg: FX.notes.map(x => x.text).join(' | ') }; } return null; })()`);
    if (got) { shown++; assert.equal(got.pod.why, "bond"); assert.match(got.msg, /a pod rolled loose · you fed it|Something dropped a pod/); }
  }
  assert.equal(shown, 1, "a fed creature shed in play");
});

test("4. the cap: after one moment pod a second ready creature sheds nothing; the returned line's pod still arrives", () => {
  let checked = 0;
  for (let s = 1; s <= 40 && checked < 5; s++) {
    // a mibi's line pod is due: the Station's record (its part of the save) says so
    const run = inPlace(s, `S.st = { wid: S.wid, sheds: [{ id: 77, name: 'Dot', sp: 0, species: 'S01', g: 'meadow', due: 0, genome: null, state: 'due' }] };`);
    const r = plain(run(`(() => { const cr = curLive().cr.filter(c => c.sp >= 0 && c.sp <= 2); if (cr.length < 2) return null;
      for (const c of cr) c.ready = true;
      const first = __moment(cr[0]), second = __moment(cr[1]);
      return { first, second, sheds: S.exp.stats.sheds, line: S.pods.filter(p => p.shed === 77).length, moment: S.pods.filter(p => /^p\\d/.test(p.id)).length }; })()`));
    if (!r) continue;
    checked++;
    assert.deepEqual(r, { first: true, second: false, sheds: 1, line: 1, moment: 1 }, `seed ${s}`);
  }
  assert.equal(checked, 5);
});

test("5. why: the pod carries 'new' or 'bond' (or nothing) into the hold and the crate", () => {
  let n = 0;
  for (let s = 1; s <= 40 && n < 3; s++) {
    const run = inPlace(s, "S.known = [0];");
    const r = plain(run(`(() => { const c = curLive().cr.find(c => c.sp === 1 || c.sp === 2); if (!c) return null;
      if (!__moment(c)) return 'no shed';
      const p = S.pods.at(-1), plainPod = { id: 'zz', k: S.exp.patch.key, x: p.x, y: p.y, sp: 0, h: 0, g: 'meadow', how: 'shake' };
      S.pods.push(plainPod); takePod(p); takePod(plainPod);
      const held = S.exp.cargo.pods.map(q => [q.id, q.why ?? null]);
      endExpedition('home'); const box = S.bay.length ? S.bay.at(-1).pods : S.hold.pods;
      return { why: p.why, held, crate: box.map(q => [q.id, q.why ?? null]) }; })()`));
    if (r == null) continue;
    assert.notEqual(r, "no shed", `seed ${s}: a never-seen species sheds at its moment`);
    n++;
    assert.equal(r.why, "new");
    assert.deepEqual(r.held.map(x => x[1]), ["new", null], "the hold keeps the why, a plain pod has none");
    assert.deepEqual(r.crate, r.held, "the crate keeps it");
  }
  assert.equal(n, 3);
});

// Pinned on station-gate a1b778eb, before the change: the world vectors file, byte for byte (world.test.mjs runs them; this says none were added).
const VECTORS_FILE_SHA = "6daf5a01a95e79c0445fa95bea7e3cf2c858b581f37dc1dfe680c8dd059e7b59";
test("6. the world is unchanged: world-vectors.json holds no new vectors", () => {
  assert.equal(createHash("sha256").update(readFileSync(new URL("./world-vectors.json", import.meta.url))).digest("hex"), VECTORS_FILE_SHA);
});
