// The Incubator's props (lvgl-switch.md §2.1, §4 R; incubator.json): the view the face takes, views/incubator-props.mjs, in Node. Option B, candling: the four states (empty, growing, ready, hatch), the ring and its cuts, the pod and its light, the shadow, the slip, the card, the focus, the context line (the one minute count), the budget.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { incubatorBuild, minutesLeft, toClear, lightStep } from "../src/views/incubator-props.mjs";
import { markSeen } from "../src/intents/incubator.mjs";
import { ANGLE_S, ANGLE_C } from "../src/angle-table.mjs";
import { habitatBuild } from "../src/views/habitat-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const schema = JSON.parse(readFileSync(path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/specs/station"), "incubator.props.json"), "utf8"));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), shipped = J("incubator.json"), spec = { ...shipped, regions: { ...shipped.regions, slip: { ...shipped.regions.slip, drawn: true } } }, pods = J("pods.json");   // `spec` draws the slip so its words stay tested; `shipped` is the build (the slip not drawn: the lab sweep)
function validate(v, sc, at = "$", out = []) {
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if (sc.oneOf) { const ok = sc.oneOf.filter((o) => validate(v, o, at, []).length === 0).length; if (ok !== 1) out.push(`${at}: matches ${ok} of oneOf`); return out; }   // the moving prop: "" or one object form (Station M1 §2.2)
  if ("const" in sc && v !== sc.const) out.push(`${at}: ${JSON.stringify(v)} is not ${JSON.stringify(sc.const)}`);
  if (sc.enum && !sc.enum.includes(v)) { out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(sc.enum)}`); return out; }
  if (sc.type) { const ts = [].concat(sc.type), ty = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v; if (!ts.includes(ty) && !(ty === "integer" && ts.includes("number"))) { out.push(`${at}: a ${ty}, wanted ${ts.join(" or ")}`); return out; } }
  if (typeof v === "number" && ((sc.minimum !== undefined && v < sc.minimum) || (sc.maximum !== undefined && v > sc.maximum))) out.push(`${at}: ${v} is outside ${sc.minimum}..${sc.maximum}`);
  if (Array.isArray(v) && sc.items) v.forEach((x, i) => validate(x, sc.items, `${at}[${i}]`, out));
  if (Array.isArray(v) && sc.maxItems !== undefined && v.length > sc.maxItems) out.push(`${at}: more than ${sc.maxItems}`);
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const k of sc.required ?? []) if (!(k in v)) out.push(`${at}: ${k} is required`);
    for (const [k, x] of Object.entries(v)) { const p = sc.properties?.[k]; if (p) validate(x, p, `${at}.${k}`, out); else if (sc.additionalProperties === false) out.push(`${at}: ${k} is not a prop`); }
  }
  return out;
}
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000;
const SPECIES = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => f.slice(8, 11));

function world(species = SPECIES[0], gs = 0) {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false;
  S.seedPodFromGenome(st, podGenome(frameOf(species), gs), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p);
  return { st, p };
}
const build = (st, ui = { inc: {} }, now = T0, lamp = "") => incubatorBuild({ st, settings, now, ui, lamp }, spec, pods);
const SG = spec.strings, ST = (st) => st.bud.minutes * 60_000;
const grown = (species = "S01", read = 0, shape = false, cross = false) => {
  const { st, p } = world(species, shape ? 3 : 0); frameOf(species).chapters.slice(0, read).forEach((c) => S.read(st, p, c.id, settings));
  const choices = {}; if (shape) { const t = frameOf(species).chapters.filter((c) => p.read.includes(c.id)).flatMap((c) => c.traits).find((x) => S.rollOptions(p, x.id).length > 1); if (t) choices[t.id] = 1; }
  assert.ok(S.grow(st, p, choices, settings, T0).ok); if (cross) { st.bud.kind = "cross"; st.bud.parents = [{ name: "dot" }, { name: "bean" }]; st.bud.from = { how: "cross", podId: null, of: ["dot", "bean"] }; } return st;
};
const cutAt = (a, r = 188) => [512 + Math.floor((r * ANGLE_S[a] + 16383) / 32767), 288 + Math.floor((r * ANGLE_C[a] + 16383) / 32767)];

test("an empty Incubator: the bare track and the empty cradle, 'the nest is empty', Choose a pod only when the rack holds a pod and a bay is free", () => {
  const { st } = world(), e = build(st);
  assert.deepEqual(validate(e.props, schema), [], "empty validates"); assert.equal(e.props.state, "empty"); assert.equal(e.line.ok, SG.choose); assert.equal(e.line.subject, "the nest is empty");
  assert.deepEqual([e.props.regions.ring.f, e.props.regions.ring.closed, e.props.regions.ring.cuts], [0, false, []]); assert.match(e.props.regions.cradle.picture, /^incubator-cradle-empty:/); assert.equal(e.props.regions.cradle.front, "");
  for (const k of ["pod", "shadow", "slip", "stamp", "code", "juvenile", "ribbon"]) assert.equal(e.props.regions[k], undefined, `no ${k} when empty`); assert.equal(e.props.regions.card, null);
  assert.deepEqual(e.props.focus, { cur: "room", targets: [] });
  for (const k of ["rail", "leaves", "dome", "domeFront", "nest", "nestFront", "base", "plaque", "plaqueAfter", "lamp", "bud", "bench"]) assert.ok(!(k in e.props.regions), `${k} is retired`);
  st.tray.length = 0; assert.equal(build(st).line.ok, null);
});

test("every state of every species is plain JSON, names no rectangle, validates against incubator.props.json and fits the budget", () => {
  for (const id of SPECIES) for (const read of [0, 2]) {
    const st = grown(id, read, true), now0 = T0 + 1000, B = st.bud;
    for (const now of [now0, T0 + B.minutes * 20_000, T0 + B.minutes * 45_000, T0 + B.minutes * 60_000 + 10_000]) {
      const b = build(st, { inc: {} }, now), s = JSON.stringify(b.props); assert.deepEqual(validate(b.props, schema), [], `${id} ${read}: validates`);
      assert.ok(s.length < 24_000, "props " + s.length); assert.ok(!/"(rect|x|y|w|h|box)":/.test(s), "no rectangle");
    }
    const bud = structuredClone(st.bud), o = S.openBud(st, {}, settings, T0 + B.minutes * 60_000 + 10_000); assert.ok(o.ok);
    const hatch = { mibi: o.mibi.id, species: o.mibi.species, code: o.mibi.code, read: o.mibi.read, kind: "founder", parents: null, bud };
    const h = build(st, { inc: { hatch } }, T0 + B.minutes * 60_000 + 10_000, "painting"); assert.deepEqual(validate(h.props, schema), [], `${id}: hatch validates`); assert.ok(JSON.stringify(h.props).length < 24_000);
  }
});

test("a growing founder: the ring's fill is the bud's progress in ten thousandths, a cut for each chapter that will clear at (k + 1) / (u + 1) of the arc (228° + 264°), centred on the track; Grow now and its price; ready: Open, the ring closed", () => {
  const st = grown("S01", 1), B = st.bud, fr = frameOf("S01"), U = toClear(B, settings), u = U.length; assert.ok(u >= 2, "chapters to clear: " + u);
  const g = build(st, { inc: {} }, T0 + B.minutes * 30_000), R = g.props.regions.ring;
  assert.equal(g.props.state, "growing"); assert.equal(g.line.ok, SG.grow); assert.ok(g.line.price); assert.equal(R.f, Math.floor(10000 * S.budProgress(st, settings, T0 + B.minutes * 30_000))); assert.equal(R.closed, false);
  assert.equal(R.cuts.length, u); R.cuts.forEach((c, k) => { assert.equal(c.chapter, U[k].id); assert.equal(c.at, (228 + Math.round((264 * (k + 1)) / (u + 1))) % 360, `cut ${k}`); assert.match(c.emblem, /^emblem:/); const [x, y] = cutAt(c.at); assert.ok(Math.hypot(x - 512, y - 288) > 186 && Math.hypot(x - 512, y - 288) < 190, "on the track's centre line"); });
  assert.deepEqual(R.cuts.map((c) => c.read), U.map((c) => S.budChapterKnown(st, c.id, settings, T0 + B.minutes * 30_000)), "a cut is read once its chapter clears");
  const early = build(st, { inc: {} }, T0 + 1000).props.regions.ring; assert.ok(early.cuts.every((c) => !c.read)); assert.equal(early.f, Math.floor(10000 * S.budProgress(st, settings, T0 + 1000)));
  const rd = build(st, { inc: {} }, T0 + B.minutes * 60_000 + 10_000), RR = rd.props.regions.ring; assert.equal(rd.props.state, "ready"); assert.equal(rd.line.ok, SG.open); assert.deepEqual([RR.f, RR.closed], [10000, true]); assert.ok(RR.cuts.every((c) => c.read)); assert.equal(rd.props.regions.pod.step, "ready");
  const cx = grown("S01", 1, false, true), cb = build(cx, { inc: {} }, T0 + cx.bud.minutes * 30_000); assert.deepEqual(cb.props.regions.ring.cuts, [], "a crossed bud has no cuts"); assert.equal(cb.props.regions.card, null);
  const all = grown("S01", fr.chapters.length), none = build(all, { inc: {} }, T0 + 1000); assert.deepEqual(none.props.regions.ring.cuts, [], "every chapter known before Grow: no cut"); assert.equal(none.props.regions.card, null, "and no card");
});

test("the context line: 'ready in about {n} min', n the minutes left rounded to the nearest whole, at least 1 (n = 1 at under 90 s); the card focused: the chapter's line; a crossed bud its parents; ready the bud", () => {
  const st = grown("S01", 1), B = st.bud, left = (s) => build(st, { inc: {} }, T0 + B.minutes * 60_000 - s * 1000).line.subject;
  assert.equal(left(B.minutes * 60 - 1), `ready in about ${B.minutes} min`); assert.equal(left(89), "ready in about 1 min"); assert.equal(left(30), "ready in about 1 min"); assert.equal(left(2), "ready in about 1 min"); assert.equal(left(150), "ready in about 3 min"); assert.equal(left(200), "ready in about 3 min"); assert.equal(left(209), "ready in about 3 min"); assert.equal(left(210), "ready in about 4 min");
  assert.equal(minutesLeft(st, settings, T0 + B.minutes * 60_000 - 1000), 1); assert.equal(SG.readyIn, "ready in about {n} min");
  for (let m = 0; m <= B.minutes; m++) assert.ok(/^ready in about \d+ min$/.test(left(m * 60)) || m === 0, "the only digits on the line are the count");
  const rd = build(st, { inc: {} }, T0 + B.minutes * 60_000 + 10_000).line.subject; assert.match(rd, /^an? \w+ bud$/);
  const cx = grown("S01", 1, false, true); assert.equal(build(cx, { inc: {} }, T0 + 1000).line.subject, "Dot and Bean's bud");
});

test("the card: 'Next to clear' with the chapter's emblem before the first clearing, 'Just cleared' with the newest chapter's trait picture and its look after; ready shows the last one; focus ◀ ▶ between the pod and the card, no card target when none is drawn", () => {
  const st = grown("S01", 1), B = st.bud, U = toClear(B, settings), at = (f, ui = { inc: {} }) => build(st, ui, T0 + B.minutes * 60_000 * f);
  const first = at(0.02).props.regions.card; assert.equal(first.heading, "Next to clear"); assert.equal(first.cleared, false); assert.equal(first.chapter, U[0].name); assert.equal(first.look, ""); assert.equal(first.id, U[0].id); assert.match(first.emblem, new RegExp(`^emblem:${U[0].id}:unread:24`)); assert.equal(at(0.02).line.subject, "ready in about " + minutesLeft(st, settings, T0 + B.minutes * 60_000 * 0.02) + " min");
  assert.equal(at(0.02, { inc: { f: "card" } }).line.subject, `${U[0].name} clears next`, "the card focused, before the first clearing");
  const k = U.findIndex((c, i) => S.budChapterKnown(st, c.id, settings, T0 + B.minutes * 60_000 * 0.45)); const mid = at(0.45); assert.ok(k >= 0, "a chapter has cleared by 0.45");
  const cleared = U.filter((c) => S.budChapterKnown(st, c.id, settings, T0 + B.minutes * 60_000 * 0.45)), last = cleared.at(-1), c1 = mid.props.regions.card;
  assert.equal(c1.heading, "Just cleared"); assert.equal(c1.cleared, true); assert.equal(c1.chapter, last.name); assert.equal(c1.id, last.id); assert.ok(c1.look.length > 0); assert.equal(at(0.45, { inc: { f: "card" } }).line.subject, `${last.name}: ${c1.look}`);
  const t = last.traits.find((x) => !x.doing); if (c1.picture) assert.match(c1.picture, /^trait-S01-[a-z0-9-]+-[a-z0-9-]+-160x128:160x128$/);
  const rd = at(1.01).props.regions.card; assert.equal(rd.chapter, U.at(-1).name, "ready shows the last chapter cleared"); assert.equal(at(1.01).props.state, "ready");
  assert.deepEqual(mid.props.focus, { cur: "pod", targets: [{ id: "pod", group: "pod" }, { id: "card", group: "card" }] }); assert.equal(at(0.45, { inc: { f: "card" } }).props.focus.cur, "card");
  const none = build(grown("S01", frameOf("S01").chapters.length), { inc: { f: "card" } }, T0 + 1000); assert.deepEqual(none.props.focus, { cur: "pod", targets: [{ id: "pod", group: "pod" }] }, "no card drawn: no card target, and the ring is on the pod");
  const cx = build(grown("S01", 1, false, true), { inc: { f: "card" } }, T0 + 1000); assert.deepEqual(cx.props.focus.targets, [{ id: "pod", group: "pod" }]);
  void t;
});

test("the slip: the species, how it was found, what the player changed, what the wait has cleared (newest first) and how many are still to come; a crossed bud 'laid at home' and 'read it when it's out'", () => {
  const st = grown("S01", 1, true), B = st.bud, U = toClear(B, settings), at = (f) => build(st, { inc: {} }, T0 + B.minutes * 60_000 * f).props.regions.slip;
  const s0 = at(0.02); assert.equal(s0.name, "Loika"); assert.ok(s0.found.length >= 1 && s0.found.length <= 2 && s0.found[0].startsWith("Found ")); assert.equal(s0.changes.length, 1); assert.match(s0.changes[0], /^\w[\w ]*: .+/); assert.deepEqual(s0.cleared, []); assert.match(s0.toCome, new RegExp(`^${["no", "one", "two", "three", "four", "five", "six"][U.length]} still to come$`));
  const s1 = at(0.6); assert.ok(s1.cleared.length >= 1 && s1.cleared.length <= 5); assert.ok(s1.cleared[0].startsWith(U.filter((c) => S.budChapterKnown(st, c.id, settings, T0 + B.minutes * 60_000 * 0.6)).at(-1).name + ": "), "newest first");
  const sr = at(1.01); assert.equal(sr.cleared.length, U.length); assert.equal(sr.toCome, "", "none still to come"); assert.ok(sr.cleared.every((l) => /^[\w &]+: .+/.test(l)));
  const cx = grown("S01", 1, false, true), sc = build(cx, { inc: {} }, T0 + 1000).props.regions.slip; assert.deepEqual([sc.cross, sc.changes, sc.cleared, sc.toCome], [true, [], [], ""]); assert.equal(sc.found[0], "laid at home, of Dot and Bean");
});

test("the pod and its light: the species' own shell at 224 × 272, the light of its step, the shadow with the chapters known; the ids change only when the step or the known chapters do", () => {
  const st = grown("S01", 1), B = st.bud, at = (f) => build(st, { inc: {} }, T0 + B.minutes * 60_000 * f).props.regions, ids = (r) => [r.pod.shell, r.pod.step, r.shadow.asset, r.cradle.picture];
  assert.equal(at(0.1).pod.shell, "pod:S01:i:224x272"); assert.deepEqual([at(0.1).pod.step, at(0.4).pod.step, at(0.8).pod.step, at(1.01).pod.step], ["cool", "warm", "glowing", "ready"]);
  assert.deepEqual([at(0.1).cradle.picture, at(0.4).cradle.picture, at(0.8).cradle.picture, at(1.01).cradle.picture].map((x) => x.split(":")[0]), ["incubator-cradle-cool", "incubator-cradle-warm", "incubator-cradle-glowing", "incubator-cradle-glowing"]);
  assert.deepEqual([at(0.1).cradle.front, at(1.01).cradle.front].map((x) => x.split(":")[0]), ["incubator-cradle-front-cool", "incubator-cradle-front-glowing"]);
  assert.match(at(0.1).shadow.asset, /^shadow:[0-9a-f]{16}:.*:cool:160x192$/); assert.deepEqual(ids(at(0.05)), ids(at(0.06)), "a minute passing in one step and one known set asks for nothing new");
  assert.notEqual(at(0.05).shadow.asset, at(0.4).shadow.asset); assert.equal(lightStep(st, settings, T0 + B.minutes * 60_000 * 0.4), "warm");
});

test("the hatch keeps the pod, the shadow, the slip, the stamp and the code from the snapshot of the bud that was opened; the ring, its cuts and the card go; the juvenile and the ribbon come", () => {
  const st = grown("S01", 1, true), B = st.bud, bud = structuredClone(B), now = T0 + B.minutes * 60_000 + 10_000, ready = build(st, { inc: {} }, now), o = S.openBud(st, {}, settings, now); assert.ok(o.ok);
  const hatch = { mibi: o.mibi.id, species: o.mibi.species, code: o.mibi.code, read: o.mibi.read, kind: "founder", parents: null, bud }, h = build(st, { inc: { hatch } }, now, ""), r = h.props.regions;
  assert.equal(h.props.state, "hatch"); assert.deepEqual([r.ring.f, r.ring.closed, r.ring.cuts], [0, false, []]); assert.equal(r.card, null); assert.deepEqual(h.props.focus, { cur: "room", targets: [] });
  assert.equal(r.pod.shell, ready.props.regions.pod.shell); assert.equal(r.pod.stage, "hatch"); assert.equal(r.shadow.asset, ready.props.regions.shadow.asset, "the same shadow at ready and through the hatch"); assert.deepEqual(r.slip, ready.props.regions.slip, "the slip stays"); assert.deepEqual(r.stamp.asset.split(":").slice(0, 3), ready.props.regions.stamp.asset.split(":").slice(0, 3));
  assert.equal(r.code, ready.props.regions.code); assert.ok(r.juvenile.picture && r.ribbon.includes(o.mibi.name)); assert.equal(h.line.ok, null);
});

test("growNow's snapshot: while it plays the screen shows the bud as it was (the ring, the cuts, the card, the line); after it, ready", () => {
  const st = grown("S01", 1), B = st.bud, now = T0 + B.minutes * 60_000 * 0.2, was = build(st, { inc: {} }, now), snap = { known: was.props.regions.ring.cuts.filter((c) => c.read).map((c) => c.chapter).concat(B.read), step: "cool", f: S.budProgress(st, settings, now), n: minutesLeft(st, settings, now), cost: S.instantGrowCost(st, settings, now), need: "", until: now + 400 };
  assert.ok(S.instantGrow(st, settings, now).ok); const g = build(st, { inc: { grow: snap } }, now + 100), a = build(st, { inc: {} }, now + 500);
  assert.equal(g.props.state, "growing"); assert.deepEqual(g.props.regions.ring.cuts, was.props.regions.ring.cuts); assert.equal(g.props.regions.ring.f, was.props.regions.ring.f); assert.equal(g.line.subject, was.line.subject); assert.equal(g.line.price, was.line.price);
  assert.equal(a.props.state, "ready"); assert.ok(a.props.regions.ring.closed && a.props.regions.ring.cuts.every((c) => c.read), "ready lands: the remaining cuts turn read");
});

test("the card's chapter is marked seen on the bud when the Incubator is shown with it (the flag Home will read)", () => {
  const st = grown("S01", 1), B = st.bud; assert.equal(B.seen, undefined); const c = build(st, { inc: {} }, T0 + B.minutes * 60_000 * 0.6).props.regions.card; assert.equal(c.cleared, true);
  markSeen(st, c.id); markSeen(st, c.id); assert.deepEqual(B.seen, [c.id]); markSeen({ bud: null }, c.id);
});

// L3: the hatch draws the mibi at the stage it has now, and the meet after it draws the same picture (one id, one request), whatever the world's adult turns
test("the hatch's juvenile and the meet's resident are one picture, for adultTurns 2 (a juvenile) and 0 (an adult already)", () => {
  const frameSpec = J("frame.json"), habSpec = J("habitat.json"), home = J("home.json");
  for (const adultTurns of [2, 0]) {
    const cfg = { ...settings, adultTurns }, { st, p } = world(); const r = S.grow(st, p, {}, cfg, T0); assert.ok(r.ok); const B0 = structuredClone(st.bud);
    const now = T0 + st.bud.minutes * 60_000 + 10_000, o = S.openBud(st, {}, cfg, now); assert.ok(o.ok);
    const hatch = { mibi: o.mibi.id, species: o.mibi.species, code: o.mibi.code, read: o.mibi.read, kind: "founder", parents: null, bud: B0 };
    const inc = incubatorBuild({ st, settings: cfg, now, ui: { inc: { hatch } }, lamp: "" }, spec, pods), sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, carryReqs: [] };
    const hab = habitatBuild({ st, sv, settings: cfg, docked: S.docked(st), light: "day", focus: null, habId: o.mibi.id, meetId: o.mibi.id, armed: false }, habSpec, frameSpec, home);
    assert.equal(S.mibiStage(st, o.mibi, cfg), adultTurns === 2 ? "juvenile" : "adult", "the stage of the world");
    assert.equal(inc.props.regions.juvenile.picture, hab.props.regions.resident.picture, `adultTurns ${adultTurns}: one picture id`);
    const a = inc.requests.find((x) => x.id === inc.props.regions.juvenile.picture), b = hab.requests.find((x) => x.id === hab.props.regions.resident.picture); assert.deepEqual(a, b, "one request");
  }
});

// ---- Station M1 §2.6: the hatch's juvenile with its moving set ----
import { setMoving } from "../src/moving.mjs";
{ const J2 = (f) => JSON.parse(readFileSync(path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/specs/station"), f), "utf8")), ix = J2("moving/index.json"), sets = {}; for (const id of ix.sets) sets[id] = J2(`moving/${id}.json`); setMoving(sets); }
test("the hatch's juvenile names its close atlas and shadow when its set may play, and fits incubator.props.json", () => {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; S.seedPodFromGenome(st, podGenome(frameOf("S01"), 3), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p); assert.ok(S.grow(st, p, {}, settings, T0).ok);
  const B0 = structuredClone(st.bud), r = S.openBud(st, {}, settings, T0 + 3600000); assert.ok(r.ok); const hatch = { mibi: r.mibi.id, species: r.mibi.species, code: r.mibi.code, read: r.mibi.read, kind: "founder", parents: null, bud: B0 };
  const b = incubatorBuild({ st, settings, now: T0, ui: { inc: { hatch } }, lamp: "", motionSets: true }, spec, pods);
  assert.deepEqual(validate(b.props, schema), []); assert.deepEqual(b.props.regions.juvenile.moving, { set: "S01", close: "moving:juvenile:S01:close:304x312:species", shadow: "moving:juvenile:S01:shadow:304x24" });
  assert.equal(incubatorBuild({ st, settings, now: T0, ui: { inc: { hatch } }, lamp: "", motionSets: false }, spec, pods).props.regions.juvenile.moving, undefined, "the play gate shut: none");
});

test("the lab sweep (T-20261016-125): the shipped spec does not draw the slip (regions.slip.drawn false), so growing, ready and the hatch send no slip and the region stays empty; the slip's words are still built when a ticket turns it on", () => {
  assert.equal(shipped.regions.slip.drawn, false);
  const st = grown("S01", 1, true), b = incubatorBuild({ st, settings, now: T0 + 60_000, ui: { inc: {} }, lamp: "" }, shipped, pods);
  assert.equal(b.props.regions.slip, undefined, "no slip in the props"); assert.ok(!b.requests.some((r) => /slip/.test(r.id)), "no slip picture asked for");
  assert.ok(build(st, { inc: {} }, T0 + 60_000).props.regions.slip, "with `drawn` on the slip is still built");
});
