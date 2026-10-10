// The Incubator's props (lvgl-switch.md §2.1, §4 R; incubator.json): the view the face takes, views/incubator-props.mjs, in Node. The four states (empty, growing, ready, hatch), the leaves of the wait, the rail's tabs, the bottom line, the budget.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { incubatorBuild, leavesOf } from "../src/views/incubator-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("incubator.json"), pods = J("pods.json");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000;
const SPECIES = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => f.slice(8, 11));

function world(species = SPECIES[0]) {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false;
  S.seedPodFromGenome(st, podGenome(frameOf(species), 0), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p);
  return { st, p };
}
const build = (st, ui = { inc: {} }, now = T0, lamp = "") => incubatorBuild({ st, settings, now, ui, lamp }, spec, pods);

test("an empty Incubator offers Choose a pod only when the rack holds a pod and a bay is free", () => {
  const { st } = world(), e = build(st);
  assert.equal(e.props.state, "empty"); assert.equal(e.line.ok, spec.bottomLine.states?.empty?.ok ?? spec.strings.choose); assert.equal(e.props.regions.leaves, undefined);
  st.tray.length = 0; assert.equal(build(st).line.ok, null);
});

test("a growing bud: the leaves count the minutes, the filling one its rows; Grow now and its price; ready: Open", () => {
  const { st, p } = world(); const r = S.grow(st, p, {}, settings, T0); assert.ok(r.ok);
  const g = build(st, { inc: {} }, T0 + 1000);
  assert.equal(g.props.state, "growing"); assert.equal(g.line.ok, spec.strings.grow); assert.ok(g.line.price);
  const L = g.props.regions.leaves; assert.ok(L.total >= 1 && L.full === 0 && L.rows >= 0 && L.rows <= 19);
  const mid = leavesOf(st, settings, T0 + st.bud.minutes * 30_000, 40); assert.ok(mid.full >= 0 && mid.rows <= 19);
  const rd = build(st, { inc: {} }, T0 + st.bud.minutes * 60_000 + 10_000);
  assert.equal(rd.props.state, "ready"); assert.equal(rd.line.ok, spec.strings.open); assert.equal(rd.props.regions.leaves.full, rd.props.regions.leaves.total);
});

test("every state is plain JSON, names no rectangle, and fits the 32 KiB budget", () => {
  const { st, p } = world(); S.grow(st, p, {}, settings, T0);
  for (const now of [T0 + 1000, T0 + st.bud.minutes * 60_000 + 10_000]) {
    const b = build(st, { inc: {} }, now), s = JSON.stringify(b.props);
    assert.ok(s.length < 24_000, "props " + s.length); assert.ok(!/"(rect|x|y|w|h)":/.test(s));
  }
  const now = T0 + st.bud.minutes * 60_000 + 10_000, o = S.openBud(st, {}, settings, now); assert.ok(o.ok);
  const hatch = { mibi: o.mibi.id, species: o.mibi.species, code: o.mibi.code, read: o.mibi.read, kind: "founder", parents: null };
  const h = build(st, { inc: { hatch } }, now, "painting");
  assert.equal(h.props.state, "hatch"); assert.equal(h.line.ok, null); assert.ok(h.props.regions.juvenile.picture); assert.ok(JSON.stringify(h.props).length < 24_000);
});
