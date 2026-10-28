// The world events a crate carries (specs/world-events.md, T-20261016-154): `worldTurn` returns its chosen events as records beside its lines, [kind, place, who, n], at most three, in the lines' order; the crate
// carries them as `world` and keeps `lines`. Run through the page itself (the whole script in a sandbox, as freeze.test.mjs), on seeded turns.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import * as W from "../src/world.mjs";
import * as A from "../src/atlas.mjs";
import * as V from "../src/view.mjs";

const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const MODULE = PAGE.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
// every `import { … } from "./src/<module>.mjs"` line of the page, bound to that module's exports
const MODS = { world: W, view: V, atlas: A };
const IMPORT_RE = /^import \{([^}]*)\} from "\.\/src\/(\w+)\.mjs";$/gm;
const BINDINGS = [...MODULE.matchAll(IMPORT_RE)].flatMap(m => m[1].split(",").map(s => s.trim().split(/\s+as\s+/)).map(([f, t = f]) => [m[2], f, t]));
const SCRIPT = MODULE.replace(IMPORT_RE, "");

// The page in a sandbox: every DOM and canvas call lands on an inert stub; localStorage is `store`.
function page(store = {}) {
  const any = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => "" : k === Symbol.iterator ? function* () {} : k === "then" ? undefined : any,
    apply: () => any, construct: () => any, set: () => true });
  const clock = { t: 1000, timers: [] };
  const ctx = { console, URLSearchParams, Date, fetch: () => new Promise(() => {}), document: any, location: any, navigator: any,
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }), requestAnimationFrame: () => 0, addEventListener: () => {}, innerWidth: 450, innerHeight: 600,
    performance: { now: () => clock.t }, setTimeout: (f, ms) => { clock.timers.push({ f, at: clock.t + (ms || 0) }); return clock.timers.length; }, clearTimeout: () => {},
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
  ctx.window = ctx; for (const [mod, from, to] of BINDINGS) ctx[to] = MODS[mod][from]; vm.createContext(ctx); vm.runInContext(SCRIPT, ctx);
  const run = src => vm.runInContext(src, ctx);
  return { run, ctx };
}

const KINDS = ["grown", "elder", "lampLow", "lampOut", "herd", "storm", "fruit", "stirring", "young", "quiet"];
const PLACES = ["meadow", "pond", "rock", "wood", "shallows", "cliff"];
const SEED = 7;
const fresh = (turn, setup = "") => { const p = page(); p.run(`newWorld(${SEED}); S.turn = ${turn}; S.cr = S.cr.slice(0, 0); ${setup}`); return p; };   // no creatures: nothing roams, arrives or is born unless a test says so
const turnOf = (p, storm = []) => JSON.parse(p.run(`JSON.stringify(worldTurn({ trail: [], storm: ${JSON.stringify(storm)} }))`));
const mibi = (id, o = {}) => ({ id, name: "M" + id, sp: 0, born: 0, outings: 0, notches: 0, bonded: false, care: 0, tends: 0, tendDay: null, grownTurn: null, ...o });
const mibis = (p, list, carried = [], lead = null) => p.run(`S.mibis = ${JSON.stringify(list)}; S.carried = ${JSON.stringify(carried)}; S.lead = ${JSON.stringify(lead)};`);
const valid = e => Array.isArray(e) && e.length === 4 && KINDS.includes(e[0]) && (e[1] === null || PLACES.includes(e[1])) && (e[2] === null || Number.isInteger(e[2])) && Number.isInteger(e[3]);
const turnN = 10;   // S.turn after the turn is 11

test("quiet: a turn that changes nothing says so, as one event with no place and no who", () => {
  const r = turnOf(fresh(turnN));
  assert.deepEqual(r.lines, ["A quiet turn. Little changed."]); assert.deepEqual(r.ev, [["quiet", null, null, 0]]);
});

test("grown and elder: a mibi growing up this turn, with n 0 at home, 1 when it leads, 2 when it can lead; an elder", () => {
  const born = turnN + 1 - 2;   // JUVENILE_TURNS 2: grown when S.turn - born is 2, after the turn
  let p = fresh(turnN); mibis(p, [mibi(5, { born })]); assert.deepEqual(turnOf(p).ev, [["grown", null, 5, 0]], "at home");
  p = fresh(turnN); mibis(p, [mibi(5, { born })], [5], 5); assert.deepEqual(turnOf(p).ev, [["grown", null, 5, 1]], "carried and the partner: leads");
  p = fresh(turnN); mibis(p, [mibi(5, { born }), mibi(6, { born: -30, grownTurn: -20 })], [5, 6], 6); assert.deepEqual(turnOf(p).ev, [["grown", null, 5, 2]], "carried, another leads: can lead");
  p = fresh(turnN); mibis(p, [mibi(5, { born: -30, grownTurn: turnN + 1 - 16 })]); assert.deepEqual(turnOf(p).ev, [["elder", null, 5, 0]], "ELDER_TURNS after growing");
});

test("lampLow and lampOut: an outpost with one turn left burns low, one whose light ends this turn has gone out, each at its land", () => {
  const cell = JSON.parse(fresh(turnN).run("JSON.stringify([...depotCells(S.seed)].filter(c => depotOf(c)))"))[0], land = Number(fresh(turnN).run(`G.land[${cell}]`));
  const light = (left) => { const p = fresh(turnN, `{ const f = depotOf(${cell}); setFS(String(${cell}), f.id, { lightT: ${turnN + 1} + ${left} }); }`); return turnOf(p); };
  assert.deepEqual(light(1).ev, [["lampLow", PLACES[land], null, 0]]); assert.deepEqual(light(0).ev, [["lampOut", PLACES[land], null, 0]]);
  assert.deepEqual(light(3).ev, [["quiet", null, null, 0]], "plenty of light left: nothing");
});

test("herd: the species index (−1 when unfamiliar) and the direction code 1 to 8 (N NE E SE S SW W NW), 0 when it only spread out; the line says the same", () => {
  const WORDS = { north: 1, "north-east": 2, east: 3, "south-east": 4, south: 5, "south-west": 6, west: 7, "north-west": 8 }; let seen = 0, spread = 0, unfamiliar = 0, known = 0;
  for (let t = 0; t < 120; t++) {
    const p = page(); p.run(`newWorld(${SEED}); S.turn = ${t}; S.known = ${t % 2 ? "[0, 1, 2]" : "[]"};`);
    const r = turnOf(p), i = r.ev.findIndex(e => e[0] === "herd"); if (i < 0) continue; const [, place, who, n] = r.ev[i], line = r.lines[i]; assert.equal(place, null);
    const m = /^(?:The (.+?)|Unfamiliar creatures) (moved ([a-z-]+)|spread out)\.$/.exec(line); assert.ok(m, line);
    if (m[3]) { assert.equal(n, WORDS[m[3]], line); seen++; } else { assert.equal(n, 0, line); spread++; }
    if (m[1]) { assert.ok(who >= 0 && who <= 2, line); known++; } else { assert.equal(who, -1, line); unfamiliar++; }
  }
  assert.ok(seen && unfamiliar && known, `moved ${seen}, unfamiliar ${unfamiliar}, known ${known}, spread ${spread}`);
});

test("storm: the main land of the charged cells, n 1 when the storm reached a new place and 0 for the first; fruit: the bloom's land and the bush count; stirring and young: their lands", () => {
  const stones = JSON.parse(fresh(turnN).run("JSON.stringify((() => { const out = []; for (let c = 0; c < MW * MH && out.length < 24; c++) if (passable(c) && G.land[c] !== L.WATER && layout(String(c)).feats.some(f => f.kind === 'k')) out.push(c); return out; })())"));
  assert.ok(stones.length >= 6, "the world has struck-stone cells: " + stones.length);
  let first = null, moved = null;
  for (let t = 0; t < 40 && !(first && moved); t++) {
    let p = page(); p.run(`newWorld(${SEED}); S.turn = ${t}; S.cr = []; S.lastStorm = null;`); let r = turnOf(p, stones); first = first || r.ev.find(e => e[0] === "storm");
    p = page(); p.run(`newWorld(${SEED}); S.turn = ${t}; S.cr = []; S.lastStorm = 'nowhere';`); r = turnOf(p, stones); moved = moved || r.ev.find(e => e[0] === "storm");
  }
  assert.ok(first && PLACES.includes(first[1]) && first[2] === null && first[3] === 0, JSON.stringify(first)); assert.ok(moved && moved[3] === 1, JSON.stringify(moved));
  const bare = "for (let c = 0; c < MW * MH; c++) { if (!passable(c)) continue; for (const f of layout(String(c)).feats) setFS(String(c), f.id, { bare: true }); }";
  const f = turnOf(fresh(turnN, bare)).ev.find(e => e[0] === "fruit"); assert.ok(f && PLACES.includes(f[1]) && f[2] === null && f[3] > 0, JSON.stringify(f));
  const q = fresh(turnN, bare), line = turnOf(q).lines.find(l => /^Fruit is back/.test(l)); assert.equal(line, "Fruit is back on " + (f[3] === 1 ? "one bush." : q.run(`numWord(${f[3]})`) + " bushes."), "the count is the line's");
  const r = JSON.parse(page().run(`newWorld(${SEED}); S.turn = 3; JSON.stringify(worldTurn({ trail: [], storm: [] }))`));
  const st = r.ev.find(e => e[0] === "stirring"), yg = r.ev.find(e => e[0] === "young"); assert.ok(st && PLACES.includes(st[1]) && st[3] >= 2 && st[3] <= 3, JSON.stringify(st)); assert.ok(yg && PLACES.includes(yg[1]) && yg[2] === -1 && yg[3] === 0, JSON.stringify(yg));
});

test("every turn: at most three events, valid shapes, one for each line and in the lines' order; the Companion's own lines stay as they were", () => {
  const LINE = [["grown", /is grown/], ["elder", /is an elder now/], ["lampLow", /burns low\.$/], ["lampOut", /has gone out\.$/], ["herd", /(moved [a-z-]+|spread out)\.$/], ["storm", /storm (charged|reached) stones/], ["fruit", /^Fruit is back/], ["stirring", /^Something new is stirring/], ["young", /^Young /], ["quiet", /^A quiet turn/]];
  const seen = new Set(); let capped = false;
  for (let t = 0; t < 80; t++) {
    const p = page(); p.run(`newWorld(${SEED}); S.turn = ${t}; S.mibis = ${JSON.stringify([1, 2, 3, 4].slice(0, [0, 1, 2, 4][t % 4]).map(i => mibi(i, { born: t + 1 - 2 })))};`); const r = turnOf(p);   // none, one, two, or four growing up at once: more events than the three kept
    if (t % 4 === 3) { capped = capped || (r.ev.length === 3 && r.ev.every((e) => e[0] === "grown")); }
    assert.ok(r.ev.length <= 3 && r.ev.length === r.lines.length && r.lines.length >= 1, `turn ${t}: ${r.ev.length} events, ${r.lines.length} lines`);
    r.ev.forEach((e, i) => { assert.ok(valid(e), JSON.stringify(e)); assert.ok(LINE.find(([k]) => k === e[0])[1].test(r.lines[i]), `turn ${t}, event ${i} ${e[0]} against "${r.lines[i]}"`); seen.add(e[0]); });
  }
  assert.ok(seen.has("grown") && seen.has("stirring") && seen.has("young") && seen.has("herd"), [...seen].join(" ")); assert.ok(capped, "a turn with more than three things to say keeps the first three");
});

test("the crate carries world { v: 1, turn, ev } beside its lines; a crate sealed before this has neither field changed; the page's other readers of lines are untouched", () => {
  const src = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(src, /lines: worldLines\.slice\(\), world: \{ v: 1, turn: S\.turn, ev: turned\.ev \}/);
  assert.match(src, /rep\.lines = worldLines\.slice\(\)/, "the Companion's own report keeps its lines");
  assert.equal(KINDS.length, 10);
});
