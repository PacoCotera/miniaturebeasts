// Station step 8-3: the pairing screen (picture 6) as props and intents: the stage picture, the words from the model, ◀ ▶ pick, ✓ Pair them puts a pod on the shelf and goes to the nursery. Fixture: the rounds' draw (0.35 per copy).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as P from "../src/pairing.mjs";
import { podsBuild } from "../src/views/pods-props.mjs";
import { partnersOf } from "../src/views/pairing-props.mjs";
import { pairIntent, openPair } from "../src/intents/pairing.mjs";
import { rng } from "../../species/framework/draws.mjs";
import { aimOf } from "../src/pairing-model.mjs";

const here = import.meta.dirname, fdir = path.resolve(here, "../../species/frames/language"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const pods = JSON.parse(readFileSync(path.join(specs, "pods.json"), "utf8"));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 3 };
const sv = { v: 8, seed: 7, wid: "w1", turn: 4, bay: [], mibis: [], trips: [], carried: [], carrySeen: 0, carryRefused: [], tier: 1, shield: 3 };

function world(seed) {
  for (let s = 0; s < 200; s++) {
    const st = S.freshSt("w1", 3, 1000); S.normalize(st); st.e = 99; st.s = 99; st.firstMibi = false;
    const r = S.seedAdults(st, "S01", seed + s, 6, settings); if (!r.ok) continue;
    const g = rng(`ps:${seed}:${s}`);
    for (const m of r.mibis) m.genome.loci[P.MARKING] = [g() < 0.35 ? "on" : "off", g() < 0.35 ? "on" : "off"];
    if (aimOf(st, "S01")) { for (const a of r.mibis) { const ps = partnersOf(st, sv, a, settings); if (ps.length) return { st, a, ps }; } }
  }
  throw new Error("no household");
}
const model = (st, ui) => ({ st, sv, settings, ui, now: 5_000_000 });
const fake = (st, ui) => { const said = []; const h = { st, sv, settings, ui, specs: { pods }, now: () => 5_000_000, say: (t) => said.push(t), goto: (s) => { ui.screen = s; }, save() {} }; return { h, said }; };

test("the pair view: one stage picture and the words over it; the second pick shows chances, the kin line and Pair them", () => {
  const { st, a, ps } = world(31), ui = { view: "pair", pair: { aId: a.id, bId: null } };
  const one = podsBuild(model(st, ui), pods);
  assert.equal(one.mode, "page"); assert.ok(one.page.stage); assert.ok(one.requests.some((r) => r.kind === "pairing"));
  assert.equal(one.line.ok, null, "no ✓ before the second pick"); assert.ok(one.page.scale.texts.some((t) => t.text === "Pair them" && t.role === pods.regions.page.pair.title.role));
  ui.pair.bId = ps[0];
  const two = podsBuild(model(st, ui), pods), t2 = two.page.scale.texts.map((t) => t.text);
  assert.equal(two.line.ok, "Pair them"); assert.ok(two.page.scale.texts.some((t) => t.text === "Pair them" && t.role === pods.regions.page.pair.ok.role)); assert.ok(t2.some((t) => t.includes("both aims together")));
  assert.ok(t2.some((t) => /No kin in common|vigour/.test(t))); assert.ok(t2.some((t) => /^Its pod grows in/.test(t)));
  assert.ok(t2.some((t) => /^marking \d of 2$/.test(t)) && t2.some((t) => /^eyes \d of 2$/.test(t)), "the copies on the faces");
  assert.equal(two.pairing.readout.chances.length, 2);
  const at = (re) => two.page.scale.texts.findIndex((t) => re.test(t.text)), both = at(/both aims together/), each = at(/^the .* marking: /);
  assert.ok(both >= 0 && each >= 0 && both < each, "the both-together chance comes first (lead 13:38)");
});

test("round 2: standing picks and young, the tint and shade bars with the parents' marks, marking cards, the aim in the looks' own words", () => {
  const { st, a, ps } = world(31), ui = { view: "pair", pair: { aId: a.id, bId: ps[0] } };
  const v = podsBuild(model(st, ui), pods), req = v.requests.find((r) => r.kind === "pairing"), t = v.page.scale.texts.map((x) => x.text);
  assert.equal(req.stands.length, 6, "two parents and four young, each a stand"); assert.equal(req.names.length, 2);
  for (const n of req.names) { const base = v.page.scale.texts.find((x) => x.role === pods.regions.page.pair.name.role && x.base > n[1] && x.base < n[1] + n[3]); assert.ok(base, "a name sits inside its pill"); }
  assert.ok(req.bars.length >= 1 && req.bars.every((b) => b.marks.length === 2 && b.range[0] <= b.range[1]), "a bar a blend, the parents' two marks");
  assert.ok(v.pairing.readout.markings.length >= 1);
  assert.ok(!t.some((x) => /step \d of \d|the on marking/.test(x)), "no raw words: " + t.join(" | "));
  assert.ok(t.some((x) => /^the \w+ marking$/.test(x)) && t.some((x) => /^eyes: .+/.test(x)), "the marking's name and the eyes' word");
});

test("item 6: a refused Pair them reads on the screen's line, with no plate and nothing spent (short of Energy)", () => {
  const { st, a, ps } = world(41), ui = { pods: {}, hab: { id: null }, screen: "habitat" }, { h, said } = fake(st, ui);
  openPair(h, a); st.e = 0; const was = [st.e, st.d, st.s, st.tray.length];
  const before = podsBuild(model(st, ui.pods), pods).line; assert.equal(before.ok, "Pair them"); assert.ok(!before.need, "no reason before the press");
  pairIntent(h, "rail.0", "confirm");
  assert.deepEqual([st.e, st.d, st.s, st.tray.length], was, "nothing spent, no pod"); assert.equal(said.length, 0, "no message plate over a page screen"); assert.equal(ui.pods.view, "pair");
  const after = podsBuild(model(st, ui.pods), pods).line; assert.match(after.need, /\S/, "the reason is on the line"); pairIntent(h, "rail.0", "step:right"); assert.ok(!podsBuild(model(st, ui.pods), pods).line.need, "a new pick clears it"); console.log("refusal line: " + after.need);
});

test("◀ ▶ pick the second mibi; ✓ Pair them makes a pod on the shelf and opens the nursery; ← goes to the mibi", () => {
  const { st, a, ps } = world(41), ui = { pods: {}, hab: { id: null }, screen: "habitat" }, { h, said } = fake(st, ui);
  openPair(h, a); assert.equal(ui.pods.view, "pair"); assert.equal(ui.pods.pair.bId, ps[0]); assert.equal(ui.screen, "pods");
  if (ps.length > 1) { pairIntent(h, "rail.0", "step:right"); assert.equal(ui.pods.pair.bId, ps[1]); pairIntent(h, "rail.0", "step:left"); assert.equal(ui.pods.pair.bId, ps[0]); }
  const e0 = st.e; pairIntent(h, "rail.0", "confirm");
  assert.equal(st.tray.length, 1); assert.ok(st.e < e0); assert.equal(ui.pods.view, "nursery"); assert.equal(said.length, 0, "no plate over a page screen");
  openPair(h, a); pairIntent(h, "rail.0", "back"); assert.equal(ui.screen, "habitat"); assert.equal(ui.hab.id, a.id);
});
