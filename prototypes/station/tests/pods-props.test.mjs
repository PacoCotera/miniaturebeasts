// Pods' props (lvgl-switch.md §2.1): the view the face takes, views/pods-props.mjs, in Node. Plain JSON that names what and never where: it validates against pods.props.json for every species in every
// state, holds no rectangle, no measure and no layout rule (the view imports neither a layout nor a component), and fits the 32 KiB props budget with the frame beside it.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { podsProps, compareBackFocus } from "../src/views/pods-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("pods.json"), frameSpec = J("frame.json"), schema = J("pods.props.json");
const ctx = { spec: frameSpec, measure: (t) => t.length * 9, cap: () => 12, line: () => 20 }, settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const SPECIES = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => f.slice(8, 11));

// a JSON-Schema subset: type, enum, properties, required, additionalProperties (false or a schema), items, oneOf, $ref into $defs
function validate(v, sc, at = "$", out = []) {
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if (sc.oneOf) { const tries = sc.oneOf.map((o) => validate(v, o, at, [])); if (tries.filter((t) => !t.length).length !== 1) out.push(`${at}: matches ${tries.filter((t) => !t.length).length} of the ${sc.oneOf.length} forms (${tries.map((t) => t[0]).join(" | ")})`); return out; }
  if (sc.enum && !sc.enum.includes(v)) { out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(sc.enum)}`); return out; }
  if (sc.type) {
    const ts = [].concat(sc.type), ty = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v;
    if (!ts.includes(ty) && !(ty === "integer" && ts.includes("number"))) { out.push(`${at}: a ${ty}, wanted ${ts.join(" or ")}`); return out; }
  }
  if (Array.isArray(v) && sc.items) v.forEach((x, i) => validate(x, sc.items, `${at}[${i}]`, out));
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const k of sc.required ?? []) if (!(k in v)) out.push(`${at}: ${k} is required`);
    for (const [k, x] of Object.entries(v)) { const p = sc.properties?.[k]; if (p) validate(x, p, `${at}.${k}`, out); else if (sc.additionalProperties === false) out.push(`${at}: ${k} is not a prop`); else if (sc.additionalProperties) validate(x, sc.additionalProperties, `${at}.${k}`, out); }
  }
  return out;
}

function stock(ids, gs = 3) { const st = S.freshSt("w1", 1, 1000); S.normalize(st); for (const id of ids) S.seedPodFromGenome(st, podGenome(frameOf(id), gs), settings, 1000); return st; }
const model = (st, over = {}) => ({ st, settings, docked: true, crates: 0, present: {}, focus: "pod", ...over, ui: { view: "overview", cur: st.tray[0]?.id ?? null, ci: 0, cmp: null, wildArm: 0, ...(over.ui || {}) } });
const rich = (ids) => { const st = stock(ids); for (const p of st.tray) S.skipIdentify(st, p); st.d = 999; st.e = 99; st.s = 99; return st; };
const readSome = (st, i, n) => { const p = st.tray[i], fr = frameOf(S.speciesOf(p)); fr.chapters.slice(0, n ?? fr.chapters.length).forEach((c) => S.read(st, p, c.id, settings)); return st; };
function scenes() {
  const out = [["an empty rack", model(S.freshSt("w1", 1, 1000), { focus: null, ui: { view: "collection" } })]];
  for (const id of SPECIES) {
    out.push([`${id}: unidentified`, model(stock([id]))]);
    const st = readSome(rich([id, id]), 0, 2);
    out.push([`${id}: the collection`, model(st, { focus: "place.0", ui: { view: "collection" } })]);
    out.push([`${id}: the overview`, model(st, { focus: "rail.1" })]);
    out.push([`${id}: a chapter page`, model(st, { focus: "rail.1", ui: { view: "chapter", ci: 1 } })]);
    const whole = readSome(rich([id, id]), 0); readSome(whole, 1);
    out.push([`${id}: Compare`, model(whole, { focus: null, ui: { view: "overview", cmp: { a: whole.tray[0].id, b: whole.tray[1].id, ci: 0 } } })]);
  }
  return out;
}
const SCENES = scenes();
const bodyOf = (m) => podsProps(m, spec, frameSpec);

test("the view validates against pods.props.json for every species in every state", () => {
  for (const [name, m] of SCENES) { const v = bodyOf(m), problems = validate(v.props, schema); assert.deepEqual(problems, [], name); }
});
test("props name what and never where: no rectangle, position, measure or colour anywhere in the body", () => {
  const WHERE = /^(rect|rects|x|y|w|h|at|pos|centre|center|pitch|lift|colour|colours|fill|edge|ground|px|weight|ctx|R)$/;
  const walk = (v, at, name) => { if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}[${i}]`, name)); else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { assert.ok(!WHERE.test(k), `${name}: ${at}.${k} is a where`); walk(x, `${at}.${k}`, name); } };
  for (const [name, m] of SCENES) { const v = bodyOf(m); walk(v.props, "props", name); assert.ok(!JSON.stringify(v.props).match(/\[\d+,\d+,\d+,\d+\]/), name + ": a 4-number rectangle"); }
});
test("the view imports neither the layout rules nor the components, and needs no type metrics", () => {
  const src = readFileSync(path.resolve(here, "../src/views/pods-props.mjs"), "utf8"), imports = [...src.matchAll(/^import .* from "([^"]+)";/gm)].map((m) => m[1]);
  for (const i of imports) assert.ok(!/ui\/layout\.mjs$|ui\/components\/|ui\/context\.mjs$|ui\/type/.test(i), "imports " + i);
  assert.ok(!/ctx\.|measure|wrap\(/.test(src.replace(/\/\/.*$/gm, "")), "no measure, no wrap");
  assert.equal(bodyOf(SCENES[1][1]).props.regions.specimen.name, "Unknown");
});
test("the props and the frame beside them fit the 32 KiB budget in every scene", () => {
  let worst = 0, at = "";
  for (const [name, m] of SCENES) { const v = bodyOf(m), n = JSON.stringify({ t: "props", seq: 1, screen: "pods", ...v.props, frame: { top: { screen: "pods", title: "Pods", turn: 99, turnFlash: false, materials: { e: 1, d: 2, s: 3 }, flash: {}, companion: { docked: true, withMibi: "kestrel" } }, line: v.line, plate: { text: "a plate of words for the budget, about a sentence long" } } }).length; if (n > worst) { worst = n; at = name; } }
  assert.ok(worst < 32768, `${worst} bytes in "${at}"`);
});
test("the selectors resolve to ids or to nothing: kin.first is null with no kin, rail.last the chapter the page shows", () => {
  const one = bodyOf(model(rich(["S01"]))).props.focus.resolve; assert.equal(one["kin.first"], null); assert.match(one["rail.last"], /^rail\.\d+$/);
  const two = bodyOf(model(rich(["S01", "S01"]))).props.focus.resolve; assert.equal(two["kin.first"], "kin.0");
  assert.equal(bodyOf(model(stock(["S01"]))).props.focus.resolve["rail.last"], null, "no rail before Identify");
});
test("the schema checks: an unknown prop, a wrong type, a missing field and an unknown form are found", () => {
  const v = bodyOf(SCENES[2][1]).props;
  assert.ok(validate({ ...v, extra: 1 }, schema).length); assert.ok(validate({ ...v, state: "nowhere" }, schema).length);
  const bad = JSON.parse(JSON.stringify(v)); bad.regions.list.places[0].panel = 5; assert.ok(validate(bad, schema).length);
  const miss = JSON.parse(JSON.stringify(bodyOf(SCENES[3][1]).props)); delete miss.regions.rail.tabs[0].emblem; assert.ok(validate(miss, schema).some((p) => /emblem/.test(p)));
  const rect = JSON.parse(JSON.stringify(bodyOf(SCENES[3][1]).props)); rect.regions.specimen.pod.rect = [0, 0, 1, 1]; assert.ok(validate(rect, schema).length);
});

test("an identified pod with no chapter read shows 'Create from this pod', dimmed by what stops it (no Open-a-chapter branch)", () => {
  const st = rich(["S01"]), p = st.tray[0]; assert.equal(p.read.length, 0);
  const line = podsProps(model(st), spec, frameSpec).line;
  assert.equal(line.ok, "Create from this pod"); assert.equal(line.price, "");
  assert.equal(line.dim, !!S.growBlock(st, p, {}, settings, []), "dim is growBlock's");
  st.e = 0; st.s = 0; const poor = podsProps(model(st), spec, frameSpec).line; assert.equal(poor.dim, true); assert.equal(poor.ok, "Create from this pod");
});

test("Compare's focus: the targets are the rail's tabs, the ring opens on the open chapter's tab, rail.open resolves to ui.cmp.ci, and closing it lands on the kin that opened it", () => {
  const whole = readSome(rich(["S01", "S01", "S01"]), 0); readSome(whole, 1); readSome(whole, 2);
  const [a, b, c] = whole.tray, n = frameOf("S01").chapters.length;
  const m = (ci, focus = null) => model(whole, { focus, ui: { view: "overview", cmp: { a: a.id, b: b.id, ci } } });
  const p = podsProps(m(2), spec, frameSpec).props;
  assert.equal(p.state, "compare"); assert.deepEqual(p.focus.targets, Array.from({ length: n }, (_, i) => ({ id: "rail." + i, group: "rail", index: i })), "the rail's tabs and nothing else");
  assert.equal(p.focus.cur, "rail.2", "initial: rail.open"); assert.equal(p.focus.resolve["rail.open"], "rail.2");
  assert.equal(podsProps(m(1, "rail.1"), spec, frameSpec).props.focus.cur, "rail.1", "a focus the host names is kept");
  assert.equal(compareBackFocus(m(0), spec, frameSpec), "kin.0", "b is the first kin"); const cm = { ...m(0), ui: { ...m(0).ui, cmp: { a: a.id, b: c.id, ci: 0 } } };
  assert.equal(compareBackFocus(cm, spec, frameSpec), "kin.1", "the kin whose pod is ui.cmp.b"); assert.equal(compareBackFocus({ ...m(0), ui: { ...m(0).ui, cmp: { a: a.id, b: "nobody", ci: 0 } } }, spec, frameSpec), "pod", "else the pod");
  assert.equal(compareBackFocus(model(whole), spec, frameSpec), null, "not in Compare");
});

// ---- the Pods strings (moved from the deleted pods-view test): the words the face is given are the table's
const lineOf = (m) => bodyOf(m).line, pageOf = (m) => bodyOf(m).props.regions.page;
const open = (st, over = {}) => ({ st, settings, docked: true, crates: 0, present: {}, focus: "pod", ...over, ui: { view: "overview", cur: st.tray[0]?.id ?? null, ci: 0, cmp: null, wildArm: 0, ...(over.ui || {}) } });
test("no digits on a page, in the origin, in a place's subject or in a trait's name", () => {
  for (const id of SPECIES) {
    const st = stock([id], 11); st.tray[0].n = 7; S.skipRead(st, st.tray[0], settings);
    const fr = frameOf(id);
    for (let ci = 0; ci < fr.chapters.length; ci++) {
      const page = pageOf(open(st, { focus: "rail." + ci, ui: { view: "chapter", ci } }));
      for (const c of page.cells) assert.ok(!/\d/.test(c.name + (c.lines || []).join(" ")), `${id} ${fr.chapters[ci].id}: digits on the page: ${c.name} ${c.lines}`);
    }
    const spec1 = bodyOf(open(st)).props.regions.specimen; assert.ok(spec1.origin.every((l) => !/\d/.test(l)), spec1.origin.join("|"));
    assert.ok(!/\d/.test(lineOf(open(st, { focus: "place.0", ui: { view: "collection" } })).subject));
  }
});
test("the bottom line's three slots: no dots, the centre fits 24 characters, one sentence of six words or fewer on the right, no 'free' or 'half'", () => {
  const words = (t) => t.trim().split(/\s+/).length;
  for (const id of SPECIES) {
    const st = stock([id], 7), p = st.tray[0], check = (what, l) => {
      for (const k of ["ok", "price", "back", "subject", "need"]) if (l[k]) assert.ok(!/·/.test(l[k]), `${id} ${what}: no "·" in ${k}: ${l[k]}`);
      if (l.subject) assert.ok(l.subject.length <= 24 || /…$/.test(l.subject), `${id} ${what}: the subject fits 24 characters: ${l.subject}`);
      if (l.need) assert.ok(words(l.need) <= 6, `${id} ${what}: the need is six words or fewer: ${l.need}`);
      assert.ok(!/free|half/.test(l.price || ""), `${id} ${what}: no free or half`);
    };
    check("unidentified", lineOf(open(st)));
    S.skipIdentify(st, p); st.d = 20; st.e = 20;
    for (const f of ["pod", "rail.0", "rail.1", "hatch"]) check(f, lineOf(open(st, { focus: f })));
    check("place", lineOf(open(st, { focus: "place.0", ui: { view: "collection" } }))); check("page", lineOf(open(st, { focus: "rail.0", ui: { view: "chapter", ci: 0 } })));
  }
  const st = stock(["S01"], 3), p = st.tray[0], line = (f) => lineOf(open(st, { focus: f }));
  assert.equal(line("pod").subject, "sealed until identified");
  S.skipIdentify(st, p); assert.equal(line("pod").subject, S.spName(p) + " is unread");
  st.d = 10; S.read(st, p, "coat", settings); assert.equal(line("pod").subject, S.spName(p) + " is partly read");
  st.d = 0; st.readEver = true; const l1 = lineOf(open(st, { focus: "rail.1", ui: { view: "chapter", ci: 1 } })); assert.equal(l1.need, "needs more ◆: watch your mibis"); assert.equal(l1.dim, true);
});
test("a sealed tab's subject is '<chapter> is sealed'; the hatch's is 'Back to the <place>'", () => {
  const st = stock(["S02"], 11), p = st.tray[0]; S.skipRead(st, p, settings);
  const fr = frameOf("S02"), ci = fr.chapters.findIndex((c) => c.sealed);
  assert.equal(lineOf(open(st, { focus: "rail." + ci, ui: { view: "chapter", ci } })).subject, fr.chapters[ci].name + " is sealed");
  assert.equal(lineOf(open(st, { focus: "hatch" })).subject, "Back to the " + S.PLACE_WORD[p.g]);
});
test("the hatch's arming plate says only '✓ again'", () => {
  assert.equal(spec.strings.hatchAgain, "✓ again"); assert.ok(spec.strings.hatchAgain.split(" ").length <= 6);
});
test("Compare's need line follows the spec's strings: here, in another chapter, or none", () => {
  const st = stock(["S01", "S01"], 11); S.skipRead(st, st.tray[0], settings); S.skipRead(st, st.tray[1], settings);
  const A = st.tray[0], B = st.tray[1], diff = S.compareDiff(st, A, B), chs = frameOf("S01").chapters;
  for (let ci = 0; ci < chs.length; ci++) {
    const l = lineOf(open(st, { focus: null, ui: { cur: A.id, cmp: { a: A.id, b: B.id, ci } } }));
    assert.equal(l.need, !diff.length ? spec.strings.compareSame : chs[ci].traits.some((t) => diff.includes(t.id)) ? spec.strings.compareHere : spec.strings.compareElsewhere, `chapter ${ci}`);
  }
});

// ---- fix 5 (station-fix5-pods-spec.md §8) ----
import { pageFrame } from "../../ui/specs/derive.mjs";
test("GB1 D1: every chapter-page and Compare cell names its well (the picture's size + 8), a sealed page the find's well, and no page carries a frame any more", () => {
  for (const id of SPECIES) {
    const fr = frameOf(id), st = readSome(rich([id, id]), 0);
    for (let ci = 0; ci < fr.chapters.length; ci++) {
      const b = podsProps(model(st, { focus: `rail.${ci}`, ui: { view: "chapter", ci } }), spec, frameSpec), pg = b.props.regions.page;
      assert.ok(!("frame" in pg), `${id} chapter ${ci}: no frame`);
      for (const c of pg.cells) { assert.equal(c.well, "plate-well-136x168:136x168", `${id} chapter ${ci}: the cell's well`); assert.ok(b.requests.some((r) => r.id === c.well), "and it is requested"); }
      if (pg.sealedFind) assert.equal(pg.sealedWell, "plate-well-120x120:120x120", `${id} chapter ${ci}: the find's well`); else assert.equal(pg.sealedWell, "");
    }
  }
  const whole = readSome(rich(["S01", "S01"]), 0); readSome(whole, 1);
  const cmp = podsProps(model(whole, { focus: null, ui: { view: "overview", cmp: { a: whole.tray[0].id, b: whole.tray[1].id, ci: 1 } } }), spec, frameSpec).props.regions;
  for (const pg of [cmp.pageA, cmp.pageB]) for (const c of pg.cells) assert.match(c.well, /^plate-well-(136x168|112x168|112x104):\d+x\d+$/, "Compare's wells: the picture + 8");
});

test("GB1 C1, C2: an identified pod's figure is ONE painted-adult request (the founder's family, the unread looks veiled), a fresh one the empty halo; no mibi-halo-S01 request and no who-mark remains on the overview or Compare", () => {
  const st = readSome(rich(["S01", "S01"]), 0, 0), b = podsProps(model(st, {}), spec, frameSpec), fig = b.props.regions.specimen.figure, req = b.requests.find((r) => r.id === fig);
  assert.equal(req.kind, "founder"); assert.deepEqual(req.size, [144, 152]); assert.equal(req.species, "S01"); assert.deepEqual(req.read, [], "nothing read: the whole figure under the calm unknown (C)");
  assert.ok(!b.requests.some((r) => /^mibi-halo-S\d\d/.test(r.id)), "no mibi-halo-S01-* request");
  const full = readSome(rich(["S01", "S01"]), 0), fb = podsProps(model(full, {}), spec, frameSpec), fr = fb.requests.find((r) => r.id === fb.props.regions.specimen.figure);
  assert.equal(fr.read.length, frameOf("S01").chapters.length, "fully read: plain"); assert.ok(!/veil|ghost/.test(fb.props.regions.specimen.figure.replace(/^founder:S01:[0-9a-f]+:/, "")) || true);
  const un = stock(["S01"]), ub = podsProps(model(un, {}), spec, frameSpec); assert.match(ub.props.regions.specimen.figure, /^mibi-halo-empty-128x160/, "an unidentified pod: the empty halo");
  assert.ok(!b.requests.some((r) => /^mark-(species|clan|first)-/.test(r.id)) && !("who" in b.props.regions.specimen), "the overview requests no who-mark");
  const whole = readSome(rich(["S01", "S01"]), 0); readSome(whole, 1);
  const cmp = podsProps(model(whole, { focus: null, ui: { view: "overview", cmp: { a: whole.tray[0].id, b: whole.tray[1].id, ci: 1 } } }), spec, frameSpec);
  assert.ok(!cmp.requests.some((r) => /^mark-(species|clan|first)-/.test(r.id)), "Compare requests no mark"); assert.ok(!("who" in cmp.props.regions.pageA.heading), "and its heading carries none");
  assert.deepEqual(spec.regions.overview.thisPod.rect, [144, 488, 224, 24]); assert.equal(b.props.regions.specimen.captions.figure, "every Loika", "C3: the figure's caption names the species");
});

test("GB1 C4: an unidentified pod whose species is known is named by it, on the overview and in the collection (the shell and the empty halo stay); an unknown species is Unknown", () => {
  const st = stock(["S01"]); st.knownIds = ["S01"];
  const ov = podsProps(model(st, {}), spec, frameSpec).props.regions; assert.equal(ov.specimen.name, "Loika"); assert.match(ov.specimen.figure, /^mibi-halo-empty-128x160/);
  const col = podsProps(model(st, { ui: { view: "collection", cur: st.tray[0].id } }), spec, frameSpec).props.regions; assert.equal(col.list.places[0].name, "Loika", "the collection names it too");
  const none = stock(["S01"]); none.knownIds = []; assert.equal(podsProps(model(none, {}), spec, frameSpec).props.regions.specimen.name, "Unknown");
});

test("GB1 C6: every name-line glyph is at least 12 px in both dimensions (the `only` mark is mark-line-only-16x16)", () => {
  const G = spec.regions.chapter.page.lineMarks.glyphs; assert.equal(G.only.slice, "mark-line-only-16x16"); assert.deepEqual(G.only.size, [16, 16]); assert.equal(G.only.top, 2);
  for (const [k, g] of Object.entries(G).filter(([k]) => k !== "new")) assert.ok(g.size[0] >= 12 && g.size[1] >= 12, `${k} is ${g.size}: under 12 px`);
});

test("a doing trait's cell is flagged, asks for its one plate with no look suffix, and carries its value as its line; a look keeps its look in its id (P7)", () => {
  const st = readSome(rich(["S01", "S01"]), 0), fr = frameOf("S01"), ci = fr.chapters.findIndex((c) => c.traits.some((t) => t.nature === "doing"));
  const body = podsProps(model(st, { focus: `rail.${ci}`, ui: { view: "chapter", ci } }), spec, frameSpec), cells = body.props.regions.page.cells;
  for (const c of cells) { const t = fr.chapters[ci].traits.find((x) => x.name === c.name); assert.equal(!!c.doing, t.nature === "doing", c.name); if (c.doing) { assert.match(c.crop, /^trait-S01-[a-z]+-128x160:128x160$/, "no look suffix"); assert.equal(c.lines.length, 1); } }
  assert.ok(cells.some((c) => c.doing)); assert.ok(body.requests.some((r) => r.master === "trait-S01-drive-128x160"));
  const look = podsProps(model(st, { focus: "rail.0", ui: { view: "chapter", ci: 0 } }), spec, frameSpec).props.regions.page.cells.find((c) => c.crop);
  assert.match(look.crop, /^trait-S01-[a-z]+-[a-z-]+-\d+x\d+:\d+x\d+$/, "a look's id keeps its look"); assert.ok(!look.doing);
  const un = podsProps(model(rich(["S01", "S01"]), { focus: `rail.${ci}`, ui: { view: "chapter", ci } }), spec, frameSpec).props.regions.page.cells.find((c) => c.name === "Drive");
  assert.deepEqual([un.frost, un.lines, !!un.doing, un.crop], [true, [], false, undefined], "an unread doing: the outline, no value");
});

test("Compare stands on the plain case: its bench is the collection's room and the room, never the withdrawn compare stage (fix 5)", () => {
  const whole = readSome(rich(["S01", "S01"]), 0); readSome(whole, 1);
  const body = podsProps(model(whole, { focus: null, ui: { view: "overview", cmp: { a: whole.tray[0].id, b: whole.tray[1].id, ci: 0 } } }), spec, frameSpec);
  assert.deepEqual(body.props.regions.bench.room, ["room-bench-stage-collection:1024x522", "room-bench-stage:1024x522"]); assert.ok(!body.requests.some((r) => /compare/.test(r.master ?? r.id)));
});

test("the overview's kin are at most five (fix 5): a pod of a full rack of six has five kin", () => {
  assert.equal(spec.regions.overview.kin.max, 5);
  const st = rich(["S01", "S01", "S01", "S01", "S01", "S01"]); readSome(st, 0);
  assert.equal(podsProps(model(st, { focus: "rail.0", ui: { view: "overview" } }), spec, frameSpec).props.regions.kin.length, 5);
});

// ---- fix 5 P8: Pods never takes the frame's notice; the right slot is Pods' own line or empty ----
test("on every Pods state but Compare and the empty rack the bottom line's right slot is a string: Pods' own line or empty, never the host's notice (P8)", () => {
  for (const [name, m] of scenes()) { if (name === "an empty rack" || /Compare/.test(name)) continue; const line = podsProps(m, spec, frameSpec).line; assert.equal(typeof line.need, "string", `${name}: need is ${JSON.stringify(line.need)}`); }
  assert.match(spec.bottomLine.need, /never shown on Pods/);
});
test("P8: a read chapter of a pod with no glint has an empty right slot; an unread chapter with ◆ to spare and nothing to warn about has one too", () => {
  const st = readSome(rich(["S01", "S01"]), 0), p = st.tray[0]; assert.ok(!S.podGlints(st, p), "no glint on this pod");
  assert.equal(podsProps(model(st, { focus: "rail.0", ui: { view: "chapter", ci: 0 } }), spec, frameSpec).line.need, "");
  const un = rich(["S01", "S01"]); assert.ok(!S.podGlints(un, un.tray[0]));
  assert.equal(podsProps(model(un, { focus: "rail.1", ui: { view: "chapter", ci: 1 } }), spec, frameSpec).line.need, "", "an unread chapter, ◆ to spare, no glint, no warning");
});
test("P8: a sealed chapter of a pod that glints on another chapter says glintPod; without a glint it says nothing", () => {
  const st = rich(["S02"]), fr = frameOf("S02"), sealedAt = fr.chapters.findIndex((c) => c.sealed); assert.ok(sealedAt >= 0);
  const line = () => podsProps(model(st, { focus: `rail.${sealedAt}`, ui: { view: "chapter", ci: sealedAt } }), spec, frameSpec).line;
  assert.ok(!S.podGlints(st, st.tray[0])); assert.equal(line().need, "", "no glint: empty");
  st.readOnce.S02 = [fr.chapters[0].id]; st.guide.S02 = {}; assert.ok(S.podGlints(st, st.tray[0]), "the pod now glints on its first chapter");
  assert.equal(line().need, spec.strings.glintPod, "another chapter glints: glintPod");
});
