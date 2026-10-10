// A headless player: it plays the Station's loop from a fresh world by calling only the rules (state.mjs, sitting.mjs, library.mjs), never the drawing.
// The loop test (tests/loop.test.mjs) asserts what it does; the loop report (tools/loop-report.mjs) prints what each step cost. Both use this one player.
//   Time is a clock the player advances: a walk (the docs say 10 to 20 minutes) takes WALK_MS; a wait is the rule's own, and only what is still left of it when the player needs
//   the result (a bud to open, a crate to open). Waits overlap with the walks and the bench in between, as they would in play.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, speciesIndex } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as T from "../src/sitting.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames");
export const loadFrames = () => setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
export const MIN = 60000, WALK_MS = 15 * MIN;   // a walk of 10 to 20 minutes (research-economy.md §1): fifteen
// A walk's yield at a starter place (research-economy.md §2, §9): Energy 3 calm (tuned 2026-10-09 from 4), Data 2, Essence 3.
export const WALK = { e: 3, d: 2, s: 3 };
// What a walk spends in the field (world-and-exploration.md, the prices): a Call pins a cell, 1 Energy; a beacon is lit, 1 Energy; a Shield bar patched, 3 Energy. How many a walk
// makes is not in the docs: the report's own assumption, set per run.
export const FIELD = { call: 1, beacon: 1, patch: 3 };

export class Player {
  constructor({ settings = {}, species = "S01", seed = 1, start = 1_000_000, field = { calls: 0, beacons: 0.5, patches: 0 }, probe = true, energy = WALK.e, growNow = false, bench = false } = {}) {
    loadFrames();
    this.settings = { ...S.DEFAULT_SETTINGS, economy: "decided", ...settings };   // the decided prices, no top-up
    this.species = species; this.seed = seed; this.start = start; this.now = start; this.walks = 0; this.podN = 0; this.field = field; this.probe = probe; this.walkE = energy; this.growNow = growNow; this.bench = bench; this.carry = 0;
    this.sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], trips: [], carried: [], lead: null, carrySeen: 0, tier: 1, shield: 3 };
    this.st = S.freshSt("w1", 0, this.now); S.normalize(this.st);
    this.steps = []; this.with = null; this.marks = {};
  }
  mark(name) { if (!(name in this.marks)) this.marks[name] = this.now - this.start; }
  // One recorded step: what it changed in Energy, Data and Essence, and the minutes it made the player wait.
  step(name, fn, { wait = 0 } = {}) {
    const a = [this.st.e, this.st.d, this.st.s], t0 = this.now, r = fn();
    this.now += wait;
    this.steps.push({ name, e: this.st.e - a[0], d: this.st.d - a[1], s: this.st.s - a[2], ms: this.now - t0, ok: r === undefined ? true : !!(r && (r.ok ?? true)), stock: [this.st.e, this.st.d, this.st.s], t: this.now - this.start });
    return r;
  }
  // A walk: one pod is brought home (with the mibi that walked with you, if any, and what it did), the crate docks and opens (research-economy.md §1); Probe tier 2 is bought at the
  // dock when it is affordable; then the Companion sets out again. Returns the pod, and whether the welcome sitting came.
  walk(species = this.species) {
    this.walks++; this.now += WALK_MS; this.sv.turn++;
    const fr = frameOf(species), gs = (Math.imul(this.seed + this.podN++ * 7919, 2654435761) ^ this.podN * 40503) >>> 0;
    const crate = { id: "w" + this.walks, n: this.walks, turn: this.sv.turn, at: this.now, e: this.walkE, d: WALK.d, s: WALK.s, pods: [{ id: "p0", sp: speciesIndex(species), species, g: "meadow", how: "calm", gs, k: null }], met: [species], explored: 5, of: 20, lines: [] };
    this.sv.bay.push(crate);
    const m = this.with != null ? S.mibiById(this.st, this.with) : null;
    this.sv.mibis = m ? [{ id: m.id, outings: (m.outings || 0) + 1, habitsDone: [S.frameFor(m).habits[this.walks % S.frameFor(m).habits.length]] }] : [];   // the Companion's hand-off: the outing and the habit; the places come in the trip record
    this.sv.carried = m ? [m.id] : []; if (m) this.sv.trips.push({ v: 1, n: this.walks, partner: m.id, places: ["wood"], storm: false, carried: [m.id] });
    if (S.docked(this.st)) S.dockKey(this.st, this.sv, this.settings, this.now);   // lift, so the next dock docks
    const d = T.dock(this.st, this.sv, this.settings, this.now), o = S.openBay(this.st, this.sv, this.settings, this.now);
    let tier2 = null; if (this.probe && S.tier2Ready(this.st, this.settings)) { const a = [this.st.e, this.st.d, this.st.s]; S.installTier2(this.st, this.settings); tier2 = { e: this.st.e - a[0], d: this.st.d - a[1], s: this.st.s - a[2] }; }   // bought at the dock
    S.dockKey(this.st, this.sv, this.settings, this.now);   // lift again: the Companion sets out
    return { ok: d.ok && o.ok, pod: this.st.tray.concat(this.st.waiting).find((p) => p.id === crate.id + ":p0"), welcome: d.welcome, tier2 };
  }
  // A walk as a step, with what it spent in the field, the welcome if it came, and the Probe if it was bought.
  takeWalk(label = "a walk (" + this.species + ")") {
    const r = this.step(this.with != null ? label + " with " + S.mibiById(this.st, this.with).name : label, () => this.walk()), walkRow = this.steps[this.steps.length - 1];
    const f = this.field, owed = f.calls * FIELD.call + f.beacons * FIELD.beacon + f.patches * FIELD.patch + this.carry, spend = Math.floor(owed + 1e-9);   // a half beacon is one every other walk: the remainder carries to the next walk
    this.carry = owed - spend;
    if (spend) this.step("the field: " + [f.calls && f.calls + " Call" + (f.calls > 1 ? "s" : ""), f.beacons && (f.beacons < 1 ? "a beacon" : f.beacons + " beacon"), f.patches && f.patches + " patch"].filter(Boolean).join(", "), () => { this.st.e -= spend; return { ok: this.st.e >= 0 }; });
    if (r.welcome && r.welcome.ok) { this.mark("welcome"); this.step("the welcome sitting", () => ({ ok: true })); }
    if (r.tier2) {   // the walk's row is its own yield; the Probe, bought at that dock, is its own row
      const w = walkRow; w.e -= r.tier2.e; w.d -= r.tier2.d; w.s -= r.tier2.s; w.stock = [w.stock[0] - r.tier2.e, w.stock[1] - r.tier2.d, w.stock[2] - r.tier2.s];
      this.mark("probe"); this.steps.push({ name: "Probe tier 2", e: r.tier2.e, d: r.tier2.d, s: r.tier2.s, ms: 0, ok: true, stock: [this.st.e, this.st.d, this.st.s], t: this.now - this.start }); }
    return r;
  }
  // Take walks until the stock covers a price (the player's patience, counted in walks).
  afford(e = 0, d = 0, s = 0) { let n = 0; while (!S.canPay(this.st, e, d, s) && n < 40) { this.takeWalk(); n++; } return n; }
  identify(p) { this.afford(S.identifyCost(this.st, this.settings)); return this.step("identify " + p.id, () => S.identify(this.st, p, this.settings)); }
  read(p, ch) { this.afford(0, S.readCost(this.st, p, ch, this.settings) || 0); return this.step("read " + ch + " on " + p.id, () => S.read(this.st, p, ch, this.settings)); }
  // Shape one read trait of the pod to a look it can carry that it does not show, if there is one.
  shape(p) { for (const t of S.shapeableTraits(p)) { const o = S.rollOptions(p, t.id); const alt = o.find((x) => x.choice && x.look !== o[0].look); if (alt) return { [t.id]: alt.choice }; } return {}; }
  grow(p, choices = {}, label = "grow") { const c = S.growCost(this.st, choices, this.settings); this.afford(c.e, c.d, c.s); return this.step(label, () => S.grow(this.st, p, choices, this.settings, this.now)); }
  // The bud: wait out what is left of its minutes (the rule's own, from its start), then open it (a press). With `growNow` the player pays Grow now (1 Essence per 2 minutes left) instead
  // of waiting whenever it can pay.
  waitBud() {
    const B = this.st.bud, left = () => Math.max(0, B.start + B.minutes * MIN - this.now);
    if (this.growNow && left() > 0) { const c = S.instantGrowCost(this.st, this.settings, this.now); if (S.canPay(this.st, c.e, c.d, c.s)) { const was = left(); this.step("grow now (" + Math.round(was / MIN) + " min left)", () => S.instantGrow(this.st, this.settings, this.now)); return this.step("the bud is grown now", () => ({ ok: true })); } }
    const ms = left(); return this.step("the bud grows (" + B.minutes + " min" + (ms ? ", " + Math.round(ms / MIN) + " left" : ", done") + ")", () => ({ ok: true }), { wait: ms });
  }
  open() { return this.step("open the bud", () => S.openBud(this.st, this.sv, this.settings, this.now)); }
  // Walks until a mibi is adult (the Companion's world turns: one expedition each).
  growUp(m) { let n = 0; while (!S.isAdult(this.st, m, this.settings) && n < 10) { this.takeWalk(); n++; } return n; }
  cross(a, b) { const c = S.crossCost(this.settings); this.afford(c.e, c.d, c.s); return this.step("cross " + a.name + " × " + b.name, () => S.doCross(this.st, this.sv, a, b, this.settings, this.now, mulberry(this.seed))); }
  readMibi(m, ch) { this.afford(0, S.mibiReadCost(this.st, m, ch, this.settings) || 0); return this.step("read " + ch + " on " + m.name, () => S.readMibi(this.st, m, ch, this.settings)); }
  // The bench's Data trickle (opt-in, as it is a minute of the player's day): one mibi watched for its minute, one pair compared; each earns what the day's cap allows.
  benchDay(m, a, b) {
    const need = this.settings.watchMs ?? 60000;
    const w = this.step("watch " + m.name + " (" + Math.round(need / 1000) + " s)", () => { let r; for (let t = 0; t < need; t += 250) r = S.benchWatch(this.st, this.sv, m, 250, this.settings, this.now); return r; }, { wait: need });
    const c = this.step("compare " + a.name + " and " + b.name, () => S.benchCompare(this.st, this.sv, a, b, this.settings, this.now)); return { w, c };
  }
  // The sitting: the held sitting (from the welcome), a ceremony, a wait that overlaps the rest, the crate.
  // The sitting is begun at the dock (a mibi that is out with the Companion sits only while it is docked; the sitting goes on after the Companion sets out again).
  sit(m, pose, place) { return this.step("begin the sitting", () => { const was = S.docked(this.st); this.st.dock = { ...(this.st.dock || {}), docked: true }; const r = T.beginSitting(this.st, m, pose, place, this.settings, this.now, this.sv); this.st.dock.docked = was; return r; }); }
  waitCrate(c) { const ms = Math.max(0, c.start + T.sittingWaitMs(this.settings) - this.now); return this.step("the crate fills (" + Math.round(T.sittingWaitMs(this.settings) / MIN) + " min" + (ms ? ", " + Math.round(ms / MIN) + " left" : ", done") + ")", () => ({ ok: true }), { wait: ms }); }
  openCrate(c) { const r = this.step("the crate opens", () => T.openSittingCrate(this.st, c.id, this.settings, this.now)); if (r.ok) this.mark("crate"); return r; }
}
function mulberry(a) { return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// The whole journey from a fresh world, by the rules only, in the order a player's day runs: a walk's crate docks, a pod is identified and read, a founder is shaped and grown, a second
// walk brings the next pod, the founder opens and goes out with you, and the first dock at which it comes home gives the welcome sitting, which is begun at once so its wait runs while
// the second founder is grown, two adults are crossed and the child is read; the crate is opened when its wait is over. Returns the player (its steps and its save).
export function playJourney(opts = {}) {
  const P = new Player(opts), id = P.species, fr = frameOf(id), chapters = fr.chapters.filter((c) => !c.sealed).map((c) => c.id);
  const podA = P.takeWalk().pod; P.identify(podA);
  P.read(podA, chapters[0]); P.read(podA, chapters[1]);
  const choices = P.shape(podA); P.grow(podA, choices, "grow the first founder (shaped)");
  const podB = P.takeWalk().pod; P.waitBud(); const a = P.open().mibi;   // the second pod came while the first founder grew
  P.with = a.id;   // the first founder goes out with you
  const w = P.takeWalk();   // the first dock at which a mibi comes home from a walk: the welcome sitting
  const held = P.st.sitting; const pose = a.habits[0], place = S.placesOf(a).slice(-1)[0];
  const sr = P.sit(a, pose, place), crate = sr.crate;
  P.identify(podB); P.grow(podB, {}, "grow the second founder (unshaped)"); P.growUp(a); P.waitBud(); const b = P.open().mibi; P.growUp(b);
  P.cross(a, b); P.waitBud(); const child = P.open().mibi;
  for (const ch of chapters) if (!child.read.includes(ch)) P.readMibi(child, ch);
  if (P.bench) P.benchDay(b, b, child);   // a minute of watching b, then the pair compared
  P.waitCrate(crate); P.openCrate(crate);
  return { P, a, b, child, podA, podB, choices, chapters, held, welcome: w.welcome, crate };
}
