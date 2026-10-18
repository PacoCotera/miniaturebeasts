// The Incubator's props (lvgl-switch.md §2.1, §4 R; incubator.json): the view the face takes, views/incubator-props.mjs, in Node. The four states (empty, growing, ready, hatch), the leaves of the wait, the rail's tabs, the bottom line, the budget.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { incubatorBuild, knownChapters } from "../src/views/incubator-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const schema = JSON.parse(readFileSync(path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/specs/station"), "incubator.props.json"), "utf8"));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("incubator.json"), pods = J("pods.json");
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

function world(species = SPECIES[0]) {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false;
  S.seedPodFromGenome(st, podGenome(frameOf(species), 0), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p);
  return { st, p };
}
const build = (st, ui = { inc: {} }, now = T0, lamp = "") => incubatorBuild({ st, settings, now, ui, lamp }, spec, pods);

test("an empty Incubator is the open, empty capsule: no pod, no stamp, no code; it offers Choose a pod only when the rack holds a pod and a bay is free", () => {
  const { st } = world(), e = build(st);
  assert.deepEqual(validate(e.props, schema), [], "empty validates"); assert.equal(e.props.state, "empty"); assert.equal(e.line.ok, spec.strings.choose);
  assert.deepEqual(["inside", "stamp", "code", "readyIn", "juvenile", "ribbon"].filter((k) => k in e.props.regions), [], "nothing inside, bare wall");
  assert.equal(e.props.regions.capsule.barPx, 158, "the bar is off in the empty look: the face draws none"); assert.equal(e.line.subject, spec.strings.empty);
  st.tray.length = 0; assert.equal(build(st).line.ok, null);
});

test("a growing bud: the bar is floor(158 x progress) px, the time is 'ready in about {n} min' on the left wall, the sealed pod is inside; Hatch now and its price; ready: Open, the bar full (Hatch now is not offered on a ready bud)", () => {
  const { st, p } = world(); const r = S.grow(st, p, {}, settings, T0); assert.ok(r.ok);
  const g = build(st, { inc: {} }, T0 + 1000);
  assert.equal(g.props.state, "growing"); assert.equal(g.line.ok, spec.strings.grow); assert.ok(g.line.price); assert.equal(g.props.regions.readyIn, "ready in about " + S.budMinutesLeft(st, settings, T0 + 1000) + " min", "the minutes left, owner ruling 3"); assert.equal(S.budMinutesLeft(st, settings, T0 + st.bud.minutes * 60_000 - 1), 1, "at least one minute");
  assert.equal(g.props.regions.capsule.barPx, Math.floor(158 * S.budProgress(st, settings, T0 + 1000))); assert.match(g.line.subject, /bud$/, "the context is the bud, not the time");
  const mid = build(st, { inc: {} }, T0 + st.bud.minutes * 30_000); assert.ok(mid.props.regions.capsule.barPx > 70 && mid.props.regions.capsule.barPx < 90, "half way: about 79 px"); assert.equal(mid.props.regions.capsule.barPx, Math.floor(158 * S.budProgress(st, settings, T0 + st.bud.minutes * 30_000)));
  const near = build(st, { inc: {} }, T0 + st.bud.minutes * 60_000 - 1000); assert.equal(near.props.regions.capsule.barPx, Math.floor(158 * S.budProgress(st, settings, T0 + st.bud.minutes * 60_000 - 1000))); assert.ok(near.props.regions.capsule.barPx >= 157);
  assert.ok(g.props.regions.inside.pod.day && g.props.regions.inside.pod.dusk && !g.props.regions.inside.opened, "the sealed pod, day and dusk; no opened pod yet");
  const rd = build(st, { inc: {} }, T0 + st.bud.minutes * 60_000 + 10_000);
  assert.equal(rd.props.state, "ready"); assert.equal(rd.line.ok, spec.strings.open); assert.equal(rd.props.regions.capsule.barPx, 158); assert.ok(!("readyIn" in rd.props.regions), "ready: no time"); assert.equal(rd.props.regions.inside.pod.dusk, "", "ready has no dusk pod");
  assert.equal(spec.strings.grow, "Hatch now"); assert.notEqual(rd.line.ok, spec.strings.grow); assert.ok(!("price" in rd.line), "Open has no price");
});

test("while Hatch now plays the chamber is already empty, and the screen keeps the bud it hatched: growing, the bar at its width, the time, the stamp and the line as they were", () => {
  const { st, p } = world(); S.grow(st, p, {}, settings, T0); const now = T0 + 1000, B = st.bud, was = build(st, { inc: {} }, now);
  const grow = { known: knownChapters(st, B, settings, now), cost: S.instantGrowCost(st, settings, now), need: was.line.need, progress: S.budProgress(st, settings, now), left: S.budMinutesLeft(st, settings, now), bud: B, until: now + 580 };
  assert.equal(S.instantGrow(st, settings, now).ok, true); assert.equal(st.bud, null);
  const mid = build(st, { inc: { grow } }, now + 100); assert.equal(mid.props.state, "growing"); assert.deepEqual(mid.props.regions.capsule, was.props.regions.capsule); assert.deepEqual(mid.line, was.line); assert.equal(mid.props.regions.readyIn, was.props.regions.readyIn);
  assert.equal(mid.props.regions.code, was.props.regions.code); assert.deepEqual(mid.props.regions.stamp, was.props.regions.stamp);
  assert.equal(build(st, { inc: { grow } }, now + 580).props.state, "empty", "after the event the hatch (ui.inc.hatch) takes over; without it the chamber is empty");
});

test("every state is plain JSON, names no rectangle, and fits the 32 KiB budget; the hatch names the opened pod, the cracks and the relit juvenile", () => {
  const { st, p } = world(); S.grow(st, p, {}, settings, T0);
  for (const now of [T0 + 1000, T0 + st.bud.minutes * 60_000 + 10_000]) {
    const b = build(st, { inc: {} }, now), s = JSON.stringify(b.props); assert.deepEqual(validate(b.props, schema), [], "validates");
    assert.ok(s.length < 24_000, "props " + s.length); assert.ok(!/"(rect|x|y|w|h)":/.test(s));
  }
  const now = T0 + st.bud.minutes * 60_000 + 10_000, o = S.openBud(st, {}, settings, now); assert.ok(o.ok);
  const hatch = { mibi: o.mibi.id, species: o.mibi.species, code: o.mibi.code, read: o.mibi.read, kind: "founder", parents: null };
  const h = build(st, { inc: { hatch } }, now, "waiting");
  assert.deepEqual(validate(h.props, schema), [], "hatch validates"); assert.equal(h.props.state, "hatch"); assert.equal(h.line.ok, null); assert.ok(h.props.regions.juvenile.picture); assert.ok(JSON.stringify(h.props).length < 24_000);
  const I = h.props.regions.inside; assert.ok(I.pod.crack1 && I.pod.crack2 && I.opened && I.pod.day); assert.match(I.opened, /^relit:S01:opened:day:384x216:v\d+$/); assert.match(h.props.regions.juvenile.picture, /^relit:S01:/);
  assert.equal(h.line.subject, spec.strings.painting, "the waiting painting's words stand on the line");
});

// the pictures the capsule asks for: the masters of the room view by id and size, the cache ids of the relit pictures (architect-rulings 3), and the glass
test("the capsule's pictures: every layer is a placed master of the room view's size, the relit pod's id is relit:{species}:{variant}:{light}:{w}x{h}:v{recipe}, the glass is drawn in code along the interior", () => {
  const { st, p } = world(); S.grow(st, p, {}, settings, T0); const e = build(st, { inc: {} }, T0 + 1000), C = e.props.regions.capsule, sl = (id) => e.requests.find((r) => r.id === id);
  for (const id of [e.props.regions.room.day, e.props.regions.room.dusk, C.interior.day, C.interior.dusk, C.shell.day, C.shell.dusk, C.door, C.bar, C.seal]) assert.equal(sl(id).kind, "slot", id);
  assert.deepEqual(sl(C.shell.day).size, [530, 532]); assert.deepEqual(sl(e.props.regions.room.day).size, [1024, 522]);
  assert.match(C.glass, /^capsule-glass:room:530x532:v1$/); assert.deepEqual(sl(C.glass).size, [530, 532]); assert.equal(sl(C.glass).mask, C.interior.day);
  const pod = sl(e.props.regions.inside.pod.day); assert.equal(pod.kind, "relit"); assert.deepEqual([pod.area, pod.anchor, pod.scale], [[384, 216], [192, 180], 170 / 160]); assert.equal(pod.bg.id, C.interior.day);
  assert.deepEqual(pod.parts.map((x) => x.id), [`pod:S01:s:144x176`]); assert.deepEqual(sl(e.props.regions.inside.pod.dusk).bg.id, C.interior.dusk);
});

// L3: the hatch draws the mibi at the stage it has now, and the meet after it draws the same mibi (one stand picture, one request), whatever the world's adult turns; the hatch's picture is that stand relit at 146 tall
test("the hatch's juvenile is the meet's mibi: its source request is the incubator view's stand at 304 x 312 (the figure 146 tall), relit once", () => {
  for (const adultTurns of [2, 0]) {
    const cfg = { ...settings, adultTurns }, { st, p } = world(); const r = S.grow(st, p, {}, cfg, T0); assert.ok(r.ok);
    const now = T0 + st.bud.minutes * 60_000 + 10_000, o = S.openBud(st, {}, cfg, now); assert.ok(o.ok);
    const hatch = { mibi: o.mibi.id, species: o.mibi.species, code: o.mibi.code, read: o.mibi.read, kind: "founder", parents: null };
    const inc = incubatorBuild({ st, settings: cfg, now, ui: { inc: { hatch } }, lamp: "" }, spec, pods), J = inc.props.regions.juvenile, relit = inc.requests.find((x) => x.id === J.picture);
    assert.equal(relit.kind, "relit"); assert.equal(relit.figH, 146); assert.deepEqual([J.size, J.anchor], [relit.area, relit.anchor]); const src = inc.requests.find((x) => x.id === relit.parts[0].id); assert.equal(src.kind, "mibi"); assert.deepEqual(src.size, [304, 312]);
    assert.equal(S.mibiStage(st, o.mibi, cfg), adultTurns === 2 ? "juvenile" : "adult", "the stage of the world"); assert.equal(src.stage, S.mibiStage(st, o.mibi, cfg));
  }
});
