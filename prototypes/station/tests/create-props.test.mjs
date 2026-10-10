// Create's props (lvgl-switch.md §2.1, §4 R; create.json): the view the face takes, views/create-props.mjs, in Node. Plain JSON that names what and never where: it validates against create.props.json in every state, holds no rectangle, no
// measure and no layout rule, fits the 32 KiB props budget with the frame beside it, spells the trait line, the context, the notice and the price from create.json's strings and the rules, puts the roll's pictures in the order of the spec
// (as the pod is, only the first copy, only the second), counts the leaves the bud will take, and follows the founder's picture through the rolls.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome, traitState } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { createBuild, reviewTraits, founderPicture, createPod } from "../src/views/create-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("create.json"), pods = J("pods.json"), schema = J("create.props.json");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000, SPECIES = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => f.slice(8, 11));

function validate(v, sc, at = "$", out = []) {
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if (sc.enum && !sc.enum.includes(v)) { out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(sc.enum)}`); return out; }
  if (sc.type) {
    const ts = [].concat(sc.type), ty = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v;
    if (!ts.includes(ty) && !(ty === "integer" && ts.includes("number"))) { out.push(`${at}: a ${ty}, wanted ${ts.join(" or ")}`); return out; }
  }
  if (Array.isArray(v) && sc.items) v.forEach((x, i) => validate(x, sc.items, `${at}[${i}]`, out));
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const k of sc.required ?? []) if (!(k in v)) out.push(`${at}: ${k} is required`);
    for (const [k, x] of Object.entries(v)) { const p = sc.properties?.[k]; if (p) validate(x, p, `${at}.${k}`, out); else if (sc.additionalProperties === false) out.push(`${at}: ${k} is not a prop`); }
  }
  return out;
}
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return st; };
function make(species, gs, read, over = {}) {
  const st = world(); S.seedPodFromGenome(st, podGenome(frameOf(species), gs), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p); frameOf(species).chapters.slice(0, read).forEach((c) => S.read(st, p, c.id, settings));
  const cr = { podId: p.id, pod: p, choices: {}, f: 0, clash: [], grown: null, ...over }; return { st, p, cr, build: (x = cr) => createBuild({ st, settings, ui: { create: x } }, spec, pods) };
}

test("Create's props validate against create.props.json for every species in every state, name no rectangle, and fit the budget", () => {
  const all = [];
  for (const id of SPECIES) {
    const fr = frameOf(id);
    for (const read of [0, 1, fr.chapters.length]) {
      const m = make(id, 3, read); all.push([`${id}, ${read} read`, m.build()]);
      const list = reviewTraits(m.p, fr); for (const f of [0, Math.floor(list.length / 2), list.length - 1]) if (list.length) { m.cr.f = f; all.push([`${id}, ${read} read, trait ${f}`, m.build()]); }
      const roll = list.findIndex(({ t }) => S.rollOptions(m.p, t.id).length > 1); if (roll >= 0) { m.cr.f = roll; m.cr.choices = { [list[roll].t.id]: 1 }; all.push([`${id}, a rolled look`, m.build()]); m.cr.clash = [list[roll].t.id]; all.push([`${id}, a clash`, m.build()]); }
    }
  }
  { const m = make("S01", 3, 2); m.st.bud = { kind: "founder" }; all.push(["busy", m.build()]); }
  { const m = make("S01", 3, 2); const r = S.grow(m.st, m.p, {}, settings, T0); m.cr.grown = { code: r.bud.code, cost: r.cost }; all.push(["grown", m.build()]); }
  for (const [name, b] of all) {
    const bad = validate(b.props, schema); assert.deepEqual(bad, [], `${name}: ${bad.slice(0, 3).join("; ")}`);
    const json = JSON.stringify(b.props); assert.ok(!/"(x|y|w|h|rect|size|box|pitch)"\s*:/.test(json.replace(/"size":\d+/, "")), `${name}: props name what, never where`);
    assert.ok(json.length + JSON.stringify(b.line).length < 8 * 1024, `${name}: ${json.length} bytes`);
    for (const r of b.requests) assert.ok(typeof r.id === "string" && r.id.length > 0 && r.id.length < 96, `${name}: ${r.id}`);
  }
});

test("the state: nothing read with no chapter read (no roll, the ring on the room), shape with one read, grow once ✓ has paid", () => {
  const a = make("S01", 3, 0).build(); assert.equal(a.props.state, "nothingRead"); assert.equal(a.props.regions.roll, undefined); assert.deepEqual(a.props.focus, { cur: "room", targets: [] }); assert.equal(a.props.regions.rail.open, -1);
  const b = make("S01", 3, 1).build(); assert.equal(b.props.state, "shape"); assert.deepEqual(b.props.focus, { cur: "roll", targets: [{ id: "roll", group: "roll" }] });
  const m = make("S01", 3, 1), r = S.grow(m.st, m.p, {}, settings, T0); m.cr.grown = { code: r.bud.code, cost: r.cost }; const g = m.build(); assert.equal(g.props.state, "grow"); assert.equal(g.props.regions.code, `${r.bud.code.slice(0, 3)} ${r.bud.code.slice(3, 6)} ${r.bud.code.slice(6, 9)}`);
  assert.equal(g.props.regions.bud.busy, false, "the bud that just grew is not 'another bud'"); assert.equal(g.line.price, S.priceText(r.cost.e, r.cost.d, r.cost.s), "the price as it was paid");
  assert.equal(createPod(m.st, m.cr).id, m.p.id, "the pod is the screen's own once it has left the rack");
});

test("the roll: three pictures in the order as the pod is, only the first copy, only the second (the look each shows); one picture for a doing, a trait with one look or a trait that cannot be shaped", () => {
  const m = make("S01", 3, 4), fr = frameOf("S01"), list = reviewTraits(m.p, fr);
  list.forEach(({ t }, f) => {
    m.cr.f = f; const r = m.build().props.regions.roll, opts = S.rollOptions(m.p, t.id);
    if (opts.length > 1) { assert.equal(r.form, "roll"); assert.equal(r.pictures.length, 3); assert.deepEqual(r.pictures, opts.map((o) => `roll-S01-${t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${o.look.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-128x72`)); }
    else { assert.equal(r.form, "single"); assert.equal(r.pictures.length, 1); assert.equal(r.chosen, 0); }
    assert.ok(r.notchUp && r.notchDown, "the notches are named in every state");
  });
});

test("the trait line: as the pod is, only <look> with the tag, one look, doing with the breed mark, a clash with the ✕ and no tag, an asleep trait; none when nothing is read; at most six words and no digits", () => {
  const T = spec.strings.traitLine;
  for (const id of SPECIES) {
    const fr = frameOf(id), m = make(id, 3, fr.chapters.length), list = reviewTraits(m.p, fr);
    list.forEach(({ t }, f) => {
      m.cr.f = f; m.cr.choices = {}; m.cr.clash = []; const opts = S.rollOptions(m.p, t.id), own = traitState(fr, t, m.p.genome); let L = m.build().props.regions.traitLine;
      const words = (s) => s.replace(/^✕ /, "").split(/\s+/).length;
      if (t.nature === "doing") { assert.equal(L.text, `${t.name}: breed to change`); assert.equal(L.doing, true); assert.equal(L.changed, false); }
      else if (opts.length <= 1) assert.equal(L.text, `${t.name}: one look in this pod`);
      else if (own.kind === "asleep") assert.equal(L.text, `${t.name}: ${own.shows}, ${own.asleep} asleep`);
      else assert.equal(L.text, `${t.name}: as the pod is`);
      assert.ok(!/\d/.test(L.text), `${id} ${t.name}: no digits in "${L.text}"`); assert.ok(words(L.text) <= spec.regions.traitLine.words, `${id} ${t.name}: "${L.text}" is ${words(L.text)} words`);
      if (opts.length > 1) { m.cr.choices = { [t.id]: 1 }; L = m.build().props.regions.traitLine; assert.equal(L.changed, true); assert.ok(words(L.text) <= spec.regions.traitLine.words && !/\d/.test(L.text), `${id} ${t.name} changed: "${L.text}"`); assert.equal(L.text, `${t.name}: ${traitState(fr, t, S.founderGenome(m.p, m.cr.choices)).line}`); m.cr.clash = [t.id]; L = m.build().props.regions.traitLine; assert.deepEqual([L.clash, L.changed, L.text], [true, false, `✕ ${t.name}: won't grow like this`]); }
    });
  }
  assert.equal(make("S01", 3, 0).build().props.regions.traitLine.text, T.none);
});

test("the bottom line: ✓ Grow it and the price with ◆ a change (the first founder no Essence), what stays a surprise, the first block in the rules' order with its notice; ← the pod", () => {
  const Sg = spec.strings, m = make("S01", 3, 2), fr = frameOf("S01"), list = reviewTraits(m.p, fr);
  let L = m.build().line; assert.deepEqual([L.ok, L.price, L.back, L.subject, L.need], ["Grow it", "⚡ 2 ❀ 4", "Loika", "two surprises to come", null]);
  const roll = list.findIndex(({ t }) => S.rollOptions(m.p, t.id).length > 1); m.cr.f = roll; m.cr.choices = { [list[roll].t.id]: 1 }; assert.equal(m.build().line.price, "⚡ 2 ❀ 4 ◆ 1");
  m.st.firstMibi = true; assert.equal(m.build().props.regions.leaves.total, 5, "the first founder: five leaves whatever is shaped"); m.st.firstMibi = false; assert.equal(m.build().props.regions.leaves.total, 21, "20 and one a change");
  assert.equal(make("S01", 3, 0).build().line.subject, Sg.surprise.all); assert.equal(make("S01", 3, 3).build().line.subject, "Stamina stays a surprise"); assert.equal(make("S01", 3, 4).build().line.subject, "A Loika, fully known");
  { const k = make("S01", 3, 2); k.st.bud = { kind: "founder" }; L = k.build().line; assert.deepEqual([L.blocked, L.need], [true, Sg.notices.busy]); assert.equal(k.build().props.regions.bud.busy, true); }
  { const k = make("S01", 3, 2); k.st.s = 1; L = k.build().line; assert.deepEqual([L.dim, L.short, L.blocked, L.need], [true, "❀", undefined, "needs more ❀"]); }
  { const k = make("S01", 3, 2); k.st.e = 0; k.st.s = 0; L = k.build().line; assert.equal(L.short, "⚡❀"); assert.equal(L.need, "needs more ⚡ ❀"); }
  { const k = make("S01", 3, 2); k.cr.f = roll; k.cr.choices = { [list[roll].t.id]: 1 }; k.cr.clash = [list[roll].t.id]; L = k.build().line; assert.deepEqual([L.blocked, L.need], [true, Sg.notices.clash]); }
  { const k = make("S01", 3, 2); k.st.bud = { kind: "founder" }; k.st.s = 0; assert.equal(k.build().line.need, Sg.notices.busy, "busy before short"); }
});

test("the rail: a tab a chapter, the open tab the focused trait's chapter with its pip lifted, a pip a trait filled, hollow, changed or clash; nothing read opens none", () => {
  const m = make("S01", 3, 2), fr = frameOf("S01"), list = reviewTraits(m.p, fr); m.cr.f = 1; let rail = m.build().props.regions.rail;
  assert.deepEqual(rail.tabs.map((t) => t.state), ["read", "read", "unread", "unread"]); assert.equal(rail.open, fr.chapters.findIndex((c) => c === list[1].c)); assert.equal(rail.tabs[rail.open].lift, list[1].c.traits.indexOf(list[1].t)); assert.deepEqual(rail.tabs.filter((t, i) => i !== rail.open).map((t) => t.lift), [-1, -1, -1]);
  assert.deepEqual(rail.tabs[2].marks, ["hollow"]); assert.ok(rail.tabs.every((t) => t.glint === false)); assert.equal(rail.focused, null);
  const roll = list.findIndex(({ t }) => S.rollOptions(m.p, t.id).length > 1); m.cr.f = roll; m.cr.choices = { [list[roll].t.id]: 2 }; rail = m.build().props.regions.rail; const tab = rail.tabs[fr.chapters.findIndex((c) => c === list[roll].c)];
  assert.equal(tab.marks[list[roll].c.traits.indexOf(list[roll].t)], "changed"); m.cr.clash = [list[roll].t.id]; assert.equal(m.build().props.regions.rail.tabs.find((t) => t.marks.includes("clash")) != null, true);
});

test("the founder's picture follows the choices (the roll's dither runs from the old id to the new); the stamp and the cells follow what is read and changed; nothing read is one picture whatever the looks", () => {
  const m = make("S01", 3, 2), fr = frameOf("S01"), list = reviewTraits(m.p, fr), roll = list.findIndex(({ t }) => S.rollOptions(m.p, t.id).length > 1), size = spec.regions.founder.rect.slice(2);
  const was = m.build().props.regions.founder.picture; assert.equal(was, founderPicture(m.p, {}, size).id); m.cr.f = roll; m.cr.choices = { [list[roll].t.id]: 1 };
  const now = m.build().props.regions.founder.picture; assert.notEqual(now, was); assert.match(now, /^founder:S01:/); assert.ok(now.length < 96);
  const a = m.build().props.regions.stamp.asset; m.cr.choices = {}; assert.notEqual(m.build().props.regions.stamp.asset, a, "a changed look redraws the stamp");
  const n = make("S01", 3, 0); assert.match(n.build().props.regions.founder.picture, /:all:/);
});
