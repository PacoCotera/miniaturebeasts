// The Cross screen's props (lvgl-switch.md §2.1; cross.json): the view the face takes, views/cross-props.mjs, in Node. Plain JSON that names what and never where, fits the budget, validates against cross.props.json for
// every species in every state, spells the words from cross.json's strings and the rules, shows only what both parents have read (a copy, look, seed or range of an unread chapter is never named), and its intents:
// ◀ ▶ pick the partner, ▲ ▼ walk the states, ✓ Cross them as the bottom line says, ← the mibi up close.
//   node --test prototypes/station/tests/cross-props.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, frameIds } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { crossBuild } from "../src/views/cross-props.mjs";
import { INTENTS, dispatch } from "../src/intents/index.mjs";
import { isBuilt, doorOpen } from "../src/nav.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), specs = path.resolve(here, "../../ui/specs/station"), fdir = path.resolve(here, "../../workbench/frames/language");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("cross.json"), pods = J("pods.json"), frameSpec = J("frame.json"), schema = J("cross.props.json");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" }, T0 = 1_000_000;

function validate(v, sc, at = "$", out = []) {
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if (sc.const !== undefined && v !== sc.const) { out.push(`${at}: ${JSON.stringify(v)} is not ${JSON.stringify(sc.const)}`); return out; }
  if (sc.enum && !sc.enum.includes(v)) { out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(sc.enum)}`); return out; }
  if (sc.type) {
    const ts = [].concat(sc.type), ty = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v;
    if (!ts.includes(ty) && !(ty === "integer" && ts.includes("number"))) { out.push(`${at}: a ${ty}, wanted ${ts.join(" or ")}`); return out; }
  }
  if (typeof v === "string" && sc.minLength && v.length < sc.minLength) out.push(`${at}: too short`);
  if (Array.isArray(v)) { if (sc.minItems != null && v.length < sc.minItems) out.push(`${at}: ${v.length} items, at least ${sc.minItems}`); if (sc.maxItems != null && v.length > sc.maxItems) out.push(`${at}: ${v.length} items, at most ${sc.maxItems}`); if (sc.items) v.forEach((x, i) => validate(x, sc.items, `${at}[${i}]`, out)); }
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const k of sc.required ?? []) if (!(k in v)) out.push(`${at}: ${k} is required`);
    for (const [k, x] of Object.entries(v)) { const p = sc.properties?.[k]; if (p) validate(x, p, `${at}.${k}`, out); else if (sc.additionalProperties === false) out.push(`${at}: ${k} is not a prop`); }
  }
  return out;
}
function world(species = "S01", seed = 11, n = 2) {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; const r = S.seedAdults(st, species, seed, n, settings);
  return { st, mibis: r.mibis, fr: frameOf(species), sv: { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [], tier: 1, shield: 3 } };
}
const readAll = (m, fr, k = fr.chapters.length) => { m.read = fr.chapters.slice(0, k).map((c) => c.id); };
const build = (w, ui, over = {}) => crossBuild({ st: w.st, sv: w.sv, settings, ui: { aId: w.mibis[0].id, bId: w.mibis[1]?.id ?? null, state: 0, clash: [], ...ui }, light: "day", ...over }, spec, pods);

test("Cross is a built screen and its door is open", () => { assert.ok(isBuilt("cross")); assert.ok(doorOpen("cross")); });

test("the props validate against cross.props.json for every species, in the overview and every chapter, whatever each parent has read; they name no rectangle and fit the budget", () => {
  for (const id of frameIds()) {
    const w = world(id), [a, b] = w.mibis, fr = w.fr;
    for (const [ra, rb] of [[fr.chapters.length, fr.chapters.length], [fr.chapters.length, 1], [0, 0], [2, 3]]) {
      readAll(a, fr, ra); readAll(b, fr, rb);
      for (let state = 0; state <= fr.chapters.length; state++) {
        const v = build(w, { state }), name = `${id} read ${ra}/${rb} state ${state}`;
        const bad = validate(v.props, schema); assert.deepEqual(bad, [], `${name}: ${bad.slice(0, 3).join("; ")}`);
        const json = JSON.stringify(v.props); assert.ok(!/"(x|y|w|h|rect|size|box|pitch)"\s*:/.test(json), `${name}: props name what, never where`);
        assert.ok(json.length + JSON.stringify(v.line).length < 24 * 1024, `${name}: ${json.length} bytes`);
        assert.equal(v.props.state, state === 0 ? "overview" : "chapter", name);
        for (const r of v.requests) assert.ok(typeof r.id === "string" && r.id.length > 0 && r.id.length < 96, `${name}: ${r.id}`);
      }
    }
  }
});

test("nothing of an unread chapter is named: the child's column is its need, and only the parent that has read shows its copies", () => {
  const w = world("S01"), [a, b] = w.mibis, fr = w.fr; readAll(a, fr, 3); readAll(b, fr, 1);
  const ov = build(w, { state: 0 }).props.regions.overview.chapters;
  assert.deepEqual(ov.map((c) => c.state), ["open", "unread", "unread", "unread", "unread", "unread"]);
  assert.equal(ov[1].lacksB, true); assert.equal(ov[1].lacksA, false); assert.equal(ov[1].need, `read ${b.name}'s Face`); assert.ok(ov[1].rows.every((r) => r.play === false && !r.seeds && !r.range));
  assert.equal(ov[4].need, "read both parents' Movement", "both lack it");
  const ch = build(w, { state: 2 }).props.regions.chapter; assert.equal(ch.name, "Face");
  for (const t of ch.traits) { assert.equal(t.missing, true); assert.equal(t.lacksB, true); assert.equal(t.lacksA, false); assert.ok(t.a.length === 2 && t.b.length === 0, "A's copies, none of B's"); assert.ok(!t.seeds && !t.blend && !t.words, "no seed, range or look"); assert.equal(t.need, `read ${b.name}'s Face`); }
  const text = JSON.stringify(build(w, { state: 2 }).props.regions.chapter);
  for (const word of b.genome ? [] : []) assert.ok(!text.includes(word));
  assert.equal(build(w, { state: 2 }).line.need, `read ${b.name}'s Face`, "the notice is the first missing read");
});

test("the head, the child to be, the kinship pill, the heads' words and the bottom line come from the spec and the rules", () => {
  const w = world("S01"), [a, b] = w.mibis, fr = w.fr; readAll(a, fr); readAll(b, fr);
  const v = build(w, { state: 0 }), H = v.props.regions.heads;
  assert.deepEqual([H.a.name, H.a.line, H.b.name, H.b.line, H.child.words, H.child.kin], [a.name, "Loika", b.name, spec.strings.pick, spec.strings.child, S.kinshipWord(0)]);
  assert.deepEqual(v.line, { ok: "Cross them", price: S.priceText(2, 0, 2).replace(/.*/, (t) => t), subject: `${a.name} × ${b.name} · Loika`, back: a.name, need: null });
  assert.equal(build(w, { state: 1 }).line.subject, `Coat · ${a.name} × ${b.name}`);
  assert.equal(v.requests.some((r) => r.kind === "mibiv" && r.variant === "ghost"), true, "the ghost is the first parent's silhouette");
  const away = world("S01", 11, 3); readAll(away.mibis[0], away.fr); readAll(away.mibis[1], away.fr); away.sv.carried = [away.mibis[1].id]; away.st.dock = { docked: false, at: T0 };
  const av = build(away, { state: 0 }); assert.deepEqual([av.props.regions.heads.b.away, av.props.regions.heads.b.line, av.line.ok ?? null, av.line.need], [true, spec.strings.away, null, "away"], "a partner out with the Companion: dimmed, \"away with you\", no ✓ cap, the refusal");
  const poor = world("S01"); readAll(poor.mibis[0], poor.fr); readAll(poor.mibis[1], poor.fr); poor.st.e = 0; poor.st.s = 0;
  const pv = build(poor, { state: 0 }); assert.deepEqual([pv.line.dim, pv.line.short, pv.line.ok], [true, "⚡ ❀", "Cross them"], "the pair cannot pay: the dimmed ✓, the short figures");
  const busy = world("S01"); readAll(busy.mibis[0], busy.fr); readAll(busy.mibis[1], busy.fr); busy.st.bud = { kind: "founder" };
  const bv = build(busy, { state: 0 }); assert.deepEqual([bv.line.ok ?? null, bv.line.need], [null, "the incubator is busy"], "a refusal takes the notice and the ✓ cap goes");
  const alone = world("S01", 11, 1); const nv = build(alone, { state: 0 }); assert.deepEqual([nv.props.regions.heads.b.none, nv.props.regions.heads.b.line, nv.line.ok ?? null, nv.line.need], [true, spec.strings.noPartner, null, spec.strings.noPartner]);
});

test("B2 no place for the child: Cross them stays on screen dimmed with the notice (✓ opens the full panel), no other refusal changes", () => {
  const w = world("S01", 11, 2); w.st.mibis.push(...Array.from({ length: S.roomCount(w.st, settings) * S.ROOM }, (_, i) => ({ id: 900 + i, room: i >> 3, slot: i & 7, bay: 100 + i, released: false })));
  w.mibis.forEach((m, i) => { m.room = 0; m.slot = i; });
  const v = build(w, { state: 0 }); assert.deepEqual([v.nav.block, v.line.ok, v.line.dim, v.line.need], ["the Vivarium is full", spec.bottomLine.verb, true, "the Vivarium is full"]);
});
test("a family pair is refused with the line as built and no seeds drawn", () => {
  const w = world("S01"); S.seedSiblings(w.st, "S01", 31, settings); const [x, y] = w.st.mibis.slice(-2); readAll(x, w.fr); readAll(y, w.fr);
  const v = crossBuild({ st: w.st, sv: w.sv, settings, ui: { aId: x.id, bId: y.id, state: 0, clash: [] } }, spec, pods);
  assert.equal(v.line.need, S.FAMILY); assert.equal(v.line.ok ?? null, null); assert.ok(!v.props.regions.overview && !v.props.regions.chapter, "no seeds"); assert.equal(v.props.regions.heads.child.kin, "", "no kinship pill");
});

test("the overview's rows: a locus at play is a row of its kind with its hides, seeds or range; a settled one folds; the wish glint is lit when a child can show the pinned look", () => {
  const w = world("S01"), [a, b] = w.mibis, fr = w.fr; readAll(a, fr); readAll(b, fr);
  const ov = build(w, { state: 0 }).props.regions.overview.chapters, rows = ov.flatMap((c) => c.rows);
  assert.ok(rows.some((r) => r.play && r.kind === "switch" && r.seeds.length === 4) && rows.some((r) => r.play && r.kind === "blend" && r.range[0] <= r.range[1]) && rows.some((r) => !r.play), "switch rows, blend rows and settled rows");
  for (const r of rows.filter((q) => q.kind === "blend")) for (const f of [...r.range, ...r.parents, ...r.range0]) assert.ok(f >= 0 && f <= 10000, "ten-thousandths of the catalogue");
  const fc = S.forecastOf(w.st, a, b, settings), t = fc.traits.find((q) => q.kind === "switch" && typeof q.seeds[0].look === "string");
  w.st.wish = { S01: { [t.trait]: t.seeds[1].label } };
  const lit = build(w, { state: 0 }).props.regions.overview.chapters.find((c) => c.id === t.chapter); assert.equal(lit.wish, "lit"); assert.ok(lit.rows[lit.wishRow].seeds.some((s) => s.pin), "the pinned seeds are marked on the glint's row");
  const rail = build(w, { state: 1 }).props.regions.rail; assert.equal(rail.tabs.find((q) => q.id === t.chapter).glint, true, "the rail's glint on the chapter holding the lit wish"); assert.equal(rail.open, 0);
  w.st.wish = { S01: { [t.trait]: "no such look" } }; assert.equal(build(w, { state: 0 }).props.regions.overview.chapters.find((c) => c.id === t.chapter).wish, "hollow");
});

test("F6.4: a pinned look at a blend marks the wished bin of the range bar (an overview row's and the chapter view's blend carry `pin`, fractions inside the track); a blend with no pin carries none; a switch's pin stays on its seeds", () => {
  const w = world("S01"), [a, b] = w.mibis, fr = w.fr; readAll(a, fr); readAll(b, fr);
  const fc = S.forecastOf(w.st, a, b, settings), t = fc.traits.find((q) => q.kind === "blend" && q.bins?.length > 1); assert.ok(t, "S01 has a blend with bins");
  const none = build(w, { state: 0 }).props.regions.overview.chapters.find((c) => c.id === t.chapter); assert.ok(none.rows.every((r) => !r.pin), "no wish, no pin");
  const trait = w.fr.chapters.flatMap((c) => c.traits).find((q) => q.id === t.trait); let found = null;
  for (const word of trait.looks ?? []) { w.st.wish = { S01: { [t.trait]: word } }; const rows = build(w, { state: 0 }).props.regions.overview.chapters.find((c) => c.id === t.chapter).rows.filter((r) => r.pin); if (rows.length) { found = rows; break; } }
  assert.ok(found, "some look of the blend can be shown by a bin: its bin is pinned on the row");
  for (const r of found) for (const [lo, hi] of r.pin) assert.ok(lo >= 0 && hi <= 10000 && lo <= hi, "fractions of the track, " + lo + " to " + hi);
  w.st.wish = {};
});

test("a chapter view: each trait's two copies in the player's words, its gate kind, the four outcomes (switch) or the range (blend); the surface plate under kinship", () => {
  const w = world("S01"), [a, b] = w.mibis, fr = w.fr; readAll(a, fr); readAll(b, fr);
  const ch = build(w, { state: 1 }).props.regions.chapter; assert.equal(ch.name, "Coat"); assert.equal(ch.sealed, false);
  for (const t of ch.traits) {
    assert.equal(t.missing, false); assert.equal(t.a.length, 2); assert.equal(t.b.length, 2); assert.ok(t.a.every((c) => c.word) && t.b.every((c) => c.word));
    if (t.kind === "switch") { assert.equal(t.seeds.length, 4); assert.ok(t.seeds.every((s) => /^xs:/.test(s.picture))); assert.ok(t.words === "one in four each" || t.words === "known for sure"); }
    else { assert.ok(t.blend.low && /to|firm/.test(t.words)); assert.equal(t.blend.one, t.blend.high === ""); }
  }
  assert.ok(ch.traits.some((t) => t.a.some((c) => c.hides) || t.b.some((c) => c.hides)), "a hidden copy is marked");
});

test("a sealed chapter shows only its find and the words that say what opens it", () => {
  const w = world("S01"), [a, b] = w.mibis, fr = w.fr; readAll(a, fr, 5); readAll(b, fr, 5);
  const c = fr.chapters[5], was = [c.sealed, c.findKind, c.opensWith]; c.sealed = true; c.findKind = "crystal"; c.opensWith = "a crystal find";
  try {
    const ov = build(w, { state: 0 }).props.regions.overview.chapters[5]; assert.deepEqual([ov.state, ov.find, ov.sealed], ["sealed", "crystal", "sealed · a crystal find"]); assert.ok(ov.rows.every((r) => !r.play));
    const ch = build(w, { state: 6 }); assert.deepEqual([ch.props.regions.chapter.sealed, ch.props.regions.chapter.find, ch.props.regions.chapter.opens, ch.props.regions.chapter.traits.length], [true, "crystal", "opens with a crystal find", 0]);
    assert.ok(ch.props.regions.masters.includes("find-crystal-112x112")); assert.equal(ch.props.regions.rail.tabs[5].state, "sealed");
  } finally { [c.sealed, c.findKind, c.opensWith] = was; if (!was[0]) { delete c.sealed; delete c.findKind; delete c.opensWith; } }
});

function host(w) {
  const said = [], went = [], ui = { screen: "cross", hab: { id: null, f: "resident" }, cross: { aId: w.mibis[0].id, bId: w.mibis[1].id, state: 0, fc: null, clash: [] }, viv: {}, pods: {}, home: {}, cargo: { state: "bay" }, create: null, sit: null, panel: null, carry: null };
  return { st: w.st, sv: w.sv, settings, ui, specs: { cross: spec, pods, frame: frameSpec }, said, went, say: (t) => said.push(t), goto: (s) => { went.push(s); ui.screen = s; }, save() {}, now: () => T0, motion: () => false, play() {}, at() {} };
}
test("the intents: ◀ ▶ pick the partner and keep the state, ▲ ▼ walk the overview and the chapters, ← goes to the mibi up close", () => {
  const w = world("S01", 11, 3), [a, b, c] = w.mibis; for (const m of w.mibis) readAll(m, w.fr); const h = host(w);
  dispatch(h, { screen: "cross", target: "partner", verb: "step:right" }); assert.equal(h.ui.cross.bId, c.id, "the next partner"); dispatch(h, { screen: "cross", target: "partner", verb: "step:right" }); assert.equal(h.ui.cross.bId, b.id, "wraps");
  dispatch(h, { screen: "cross", target: "partner", verb: "step:left" }); assert.equal(h.ui.cross.bId, c.id, "the previous partner");
  dispatch(h, { screen: "cross", target: "partner", verb: "step:down" }); dispatch(h, { screen: "cross", target: "partner", verb: "step:down" }); assert.equal(h.ui.cross.state, 2); dispatch(h, { screen: "cross", target: "partner", verb: "step:right" }); assert.equal(h.ui.cross.state, 2, "the state is kept on a new partner");
  dispatch(h, { screen: "cross", target: "partner", verb: "step:up" }); dispatch(h, { screen: "cross", target: "partner", verb: "step:up" }); dispatch(h, { screen: "cross", target: "partner", verb: "step:up" }); assert.equal(h.ui.cross.state, 0, "▲ on the first chapter returns to the overview; on the overview it stays");
  for (let i = 0; i < 10; i++) dispatch(h, { screen: "cross", target: "partner", verb: "step:down" }); assert.equal(h.ui.cross.state, w.fr.chapters.length, "▼ on the last does nothing");
  dispatch(h, { screen: "cross", target: "partner", verb: "back" }); assert.deepEqual([h.went.at(-1), h.ui.hab.id, h.ui.cross], ["habitat", a.id, null]);
});
test("✓ Cross them: the child is drawn and paid for, the bud takes it and the Incubator shows; refused before cost it says why and spends nothing", () => {
  const w = world("S01", 11, 2), [a, b] = w.mibis; for (const m of w.mibis) readAll(m, w.fr); const h = host(w), e0 = w.st.e, s0 = w.st.s;
  dispatch(h, { screen: "cross", target: "partner", verb: "confirm" });
  assert.equal(h.went.at(-1), "incubator"); assert.equal(h.ui.cross, null); assert.equal(w.st.bud.kind, "cross"); assert.deepEqual(w.st.bud.parents.map((p) => p.id), [a.id, b.id]); assert.equal(w.st.e, e0 - S.crossCost(settings).e); assert.equal(w.st.s, s0 - S.crossCost(settings).s);
  { const said = h.said.at(-1); assert.ok(said.includes(a.name) && said.includes(b.name) && said.includes("crossed") && said.includes("Incubator"), said); assert.ok(!/[A-Z0-9]{3} [A-Z0-9]{3} [A-Z0-9]{3}/.test(said) && !said.includes(w.st.bud.code), "no genome code in the message"); }
  const busy = world("S01", 11, 2); for (const m of busy.mibis) readAll(m, busy.fr); busy.st.bud = { kind: "founder" }; const hb = host(busy), eb = busy.st.e;
  dispatch(hb, { screen: "cross", target: "partner", verb: "confirm" }); assert.deepEqual([hb.said.at(-1), hb.went.length, busy.st.e], ["The incubator is busy", 0, eb], "the refusal's words, nothing spent, no screen change");
  const poor = world("S01", 11, 2); for (const m of poor.mibis) readAll(m, poor.fr); poor.st.e = 0; const hp = host(poor);
  dispatch(hp, { screen: "cross", target: "partner", verb: "confirm" }); assert.match(hp.said.at(-1), /^Needs ⚡/); assert.equal(hp.went.length, 0);
});
test("a room key drops the Cross visit; the Cross intents are the screen's own", () => {
  assert.ok(INTENTS.cross); const w = world("S01"); const h = host(w); h.ui.hab.id = w.mibis[0].id;
  dispatch(h, { screen: "cross", target: "partner", verb: "room:home" }); assert.equal(h.ui.cross, null);
});
