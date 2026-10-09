// A headless player: it plays the Station's loop from a fresh world by calling only the rules (state.mjs, sitting.mjs, library.mjs), never the drawing.
// The loop test (tests/loop.test.mjs) asserts what it does; the loop report (tools/loop-report.mjs) prints what each step cost. Both use this one player.
//   Time is a clock the player advances: a walk (the docs say 10 to 20 minutes) takes WALK_MS; a wait is the rule's own (the bud's minutes, the sitting's hours).
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, speciesIndex } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as T from "../src/sitting.mjs";
import * as L from "../src/library.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames");
export const loadFrames = () => setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
export const MIN = 60000, WALK_MS = 15 * MIN;   // a walk of 10 to 20 minutes (research-economy.md §1): fifteen
// A walk's yield at a starter place (research-economy.md §2): Energy 3 to 5, Data 2, Essence 3.
export const WALK = { e: 4, d: 2, s: 3 };

export class Player {
  constructor({ settings = {}, species = "S01", seed = 1, start = 1_000_000 } = {}) {
    loadFrames();
    this.settings = { ...S.DEFAULT_SETTINGS, economy: "decided", ...settings };   // the decided prices, no top-up
    this.species = species; this.seed = seed; this.now = start; this.walks = 0; this.podN = 0;
    this.sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], with: null, tier: 1, shield: 3 };
    this.st = S.freshSt("w1", 0, this.now); S.normalize(this.st);
    this.steps = [];
  }
  // One recorded step: what it changed in Energy, Data and Essence, and the minutes it made the player wait.
  step(name, fn, { wait = 0 } = {}) {
    const a = [this.st.e, this.st.d, this.st.s], t0 = this.now, r = fn();
    this.now += wait;
    this.steps.push({ name, e: this.st.e - a[0], d: this.st.d - a[1], s: this.st.s - a[2], ms: this.now - t0, ok: r === undefined ? true : !!(r && (r.ok ?? true)), stock: [this.st.e, this.st.d, this.st.s] });
    return r;
  }
  // A walk: one pod is brought home, the crate docks and opens (research-economy.md §1; the arrival).
  walk(species = this.species) {
    this.walks++; this.now += WALK_MS; this.sv.turn++;
    const fr = frameOf(species), gs = (Math.imul(this.seed + this.podN++ * 7919, 2654435761) ^ this.podN * 40503) >>> 0;
    const crate = { id: "w" + this.walks, n: this.walks, turn: this.sv.turn, at: this.now, e: WALK.e, d: WALK.d, s: WALK.s, pods: [{ id: "p0", sp: speciesIndex(species), species, g: "meadow", how: "calm", gs, k: null }], met: [species], explored: 5, of: 20, lines: [] };
    this.sv.bay.push(crate);
    if (S.docked(this.st)) S.dockKey(this.st, this.sv, this.settings, this.now);   // lift, so the next dock docks
    const d = S.dockKey(this.st, this.sv, this.settings, this.now); const o = S.openBay(this.st, this.sv, this.settings, this.now);
    S.dockKey(this.st, this.sv, this.settings, this.now);   // lift again: the Companion sets out
    return { ok: d.ok && o.ok, pod: this.st.tray.concat(this.st.waiting).find((p) => p.id === crate.id + ":p0") };
  }
  // Take walks until the stock covers a price (the player's patience, counted in walks).
  afford(e = 0, d = 0, s = 0) { let n = 0; while (!S.canPay(this.st, e, d, s) && n < 40) { this.step("a walk (" + (this.species) + ")", () => this.walk()); n++; } return n; }
  identify(p) { this.afford(S.identifyCost(this.st, this.settings)); return this.step("identify " + p.id, () => S.identify(this.st, p, this.settings)); }
  read(p, ch) { this.afford(0, S.readCost(this.st, p, ch, this.settings) || 0); return this.step("read " + ch + " on " + p.id, () => S.read(this.st, p, ch, this.settings)); }
  // Shape one read trait of the pod to a look it can carry that it does not show, if there is one.
  shape(p) { for (const t of S.shapeableTraits(p)) { const o = S.rollOptions(p, t.id); const alt = o.find((x) => x.choice && x.look !== o[0].look); if (alt) return { [t.id]: alt.choice }; } return {}; }
  grow(p, choices = {}, label = "grow") { const c = S.growCost(this.st, choices, this.settings); this.afford(c.e, c.d, c.s); return this.step(label, () => S.grow(this.st, p, choices, this.settings, this.now)); }
  // The bud: wait out its minutes (the rule's own, from its start), then open it (a press).
  waitBud() { const B = this.st.bud, ms = Math.max(0, B.start + B.minutes * MIN - this.now); return this.step("the bud grows (" + B.minutes + " min)", () => ({ ok: true }), { wait: ms }); }
  open() { return this.step("open the bud", () => S.openBud(this.st, this.sv, this.settings, this.now)); }
  // Walks until a mibi is adult (the Companion's world turns; each walk is one turn here).
  growUp(m) { let n = 0; while (!S.isAdult(this.st, m, this.settings) && n < 10) { this.step("a walk (a world turn)", () => this.walk()); n++; } return n; }
  cross(a, b) { const c = S.crossCost(this.settings); this.afford(c.e, c.d, c.s); return this.step("cross " + a.name + " × " + b.name, () => S.doCross(this.st, this.sv, a, b, this.settings, this.now, mulberry(this.seed))); }
  readMibi(m, ch) { this.afford(0, S.mibiReadCost(this.st, m, ch, this.settings) || 0); return this.step("read " + ch + " on " + m.name, () => S.readMibi(this.st, m, ch, this.settings)); }
  // The sitting: earned by the welcome, a ceremony, a wait, the crate.
  habit(m, habit, place) { return this.step(m.name + " is watched (" + habit + ") and walks to the " + place, () => { T.recordHabit(this.st, m, habit); T.recordWalk(this.st, m, place); return { ok: true }; }); }
  welcome() { return this.step("the welcome sitting", () => T.checkWelcome(this.st, this.now)); }
  sit(m, pose, place) { return this.step("begin the sitting", () => T.beginSitting(this.st, m, pose, place, this.settings, this.now)); }
  waitCrate(c) { const ms = Math.max(0, c.start + T.sittingWaitMs(this.settings) - this.now); return this.step("the crate fills (" + Math.round(T.sittingWaitMs(this.settings) / MIN) + " min)", () => ({ ok: true }), { wait: ms }); }
  land(c) { return this.step("the portrait lands", () => T.landPortrait(this.st, c.id)); }
  openCrate(c) { return this.step("the crate opens", () => T.openSittingCrate(this.st, c.id, this.settings, this.now)); }
}
function mulberry(a) { return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// The whole journey from a fresh world, by the rules only: a walk's crate docks, a pod is identified and read, a founder is shaped and grown, it opens, a second founder
// follows, two adults are crossed, the child is read, a sitting is held and its crate comes home. Returns the player (its steps and its save).
export function playJourney(opts = {}) {
  const P = new Player(opts), id = P.species, fr = frameOf(id), chapters = fr.chapters.filter((c) => !c.sealed).map((c) => c.id);
  const podA = P.step("a walk (" + id + ")", () => P.walk()).pod; P.identify(podA);
  P.read(podA, chapters[0]); P.read(podA, chapters[1]);
  const choices = P.shape(podA); P.grow(podA, choices, "grow the first founder (shaped)"); P.waitBud(); const a = P.open().mibi;
  const podB = P.step("a walk (" + id + ")", () => P.walk()).pod; P.identify(podB);
  P.grow(podB, {}, "grow the second founder (unshaped)"); P.waitBud(); const b = P.open().mibi;
  P.growUp(a); P.growUp(b);
  P.cross(a, b); P.waitBud(); const child = P.open().mibi;
  for (const ch of chapters) if (!child.read.includes(ch)) P.readMibi(child, ch);
  P.habit(a, "dig", "wood"); P.welcome();
  const sr = P.sit(a, "dig", "wood"); const crate = sr.crate; P.waitCrate(crate); P.land(crate); P.openCrate(crate);
  return { P, a, b, child, podA, podB, choices, chapters };
}
