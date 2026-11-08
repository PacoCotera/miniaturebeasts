// Pods' props (lvgl-switch.md §2.1): the view the face takes, views/pods-props.mjs, in Node: the pod inventory (the pod inventory's design), its filter tray and Find, the reading room (// the read's design) and Compare. Plain JSON that names what and never where: it validates against pods.props.json in every state, holds no rectangle, no measure and no layout rule, and fits the
// 32 KiB props budget with the frame beside it. Then what each state says: the count, the worth line, the sorts, the filter and Find, the freshness words, the panel's held buttons, the selectors the
// host answers for the ring, the reading room's index, page forms and band.
//   node --test prototypes/station/tests/pods-props.test.mjs
// PRE-LANGUAGE FIXTURE (release 21a): these rules are frame-independent, but their cases are the S01, S02 and S03 chapters of the form frames (versions 2 to 6, kept on disk beside the language frames), with their sealed chapters; the game itself loads the version 8 frames (frames-twenty.test.mjs).
import { lineCased } from "./fixtures/line-case.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome, chapterLooks } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { podsProps as podsPropsUnchecked, worthTags, listOf, findWords } from "../src/views/pods-props.mjs";
import { recommendedLane } from "../src/views/reading-props.mjs";
import { railLayout } from "../src/reading-rail.mjs";
import { compareLine } from "../src/views/pods-props.mjs";
S.useNameList("en-short-1");
const podsProps = lineCased(podsPropsUnchecked, "pods");

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))).filter((f) => !f.species.draft));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("pods.json"), frameSpec = J("frame.json"), schema = J("pods.props.json");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const SPECIES = readdirSync(framesDir).filter((f) => f.startsWith("species-") && !JSON.parse(readFileSync(path.join(framesDir, f), "utf8")).species.draft).map((f) => f.slice(8, 11));   // a draft species is not loaded

function validate(v, sc, at = "$", out = []) {
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if (sc.oneOf) { const tries = sc.oneOf.map((o) => validate(v, o, at, [])); if (tries.filter((t) => !t.length).length !== 1) out.push(`${at}: matches ${tries.filter((t) => !t.length).length} of the ${sc.oneOf.length} forms (${tries.map((t) => t[0]).join("; ")})`); return out; }
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

// ---- the worlds ----
const home = (n, species = "S01", gs = 3) => { const st = S.freshSt("w1", 1, 1000); S.normalize(st); for (let i = 0; i < n; i++) S.seedPodFromGenome(st, podGenome(frameOf(species), gs + i), settings, 1000); st.d = 40; st.e = 20; st.s = 20; st.readEver = true; return st; };
const mixed = () => { const st = home(0); for (const [sp, n] of [["S01", 4], ["S02", 3], ["S03", 2], ["S04", 3]]) for (let i = 0; i < n; i++) S.seedPodFromGenome(st, podGenome(frameOf(sp), 50 + i), settings, 1000); st.d = 99; st.e = 20; st.s = 20; return st; };
const ident = (st, n = st.tray.length) => { st.tray.slice(0, n).forEach((p) => S.identify(st, p, settings)); return st; };
const read = (st, i, n) => { const p = st.tray[i], fr = frameOf(S.speciesOf(p)); fr.chapters.filter((c) => !c.sealed).slice(0, n ?? 99).forEach((c) => S.read(st, p, c.id, settings)); return st; };
const ui = (over = {}) => ({ view: "inventory", sort: "use", chips: [], word: null, first: 0, focus: { cur: null }, ...over });
const model = (st, over = {}, focus = null) => ({ st, settings, docked: true, crates: 0, now: 5000, ui: ui(over), focus });
const body = (m) => podsProps(m, spec, frameSpec);
const P = (m) => body(m).props;

function scenes() {
  const out = [["no pods", model(home(0), {}, "sort")]];
  { const st = home(1); out.push(["one sealed pod", model(st, {}, "card.0")]); }
  { const st = mixed(); ident(st, 8); read(st, 0, 2); read(st, 4); out.push(["twelve pods by use", model(st, {}, "card.0")], ["twelve pods by species", model(st, { sort: "species" }, "card.3")], ["the verb line", model(st, {}, "verb.read")]);
    out.push(["the filter tray", model(st, { view: "filter", chips: ["S01", "unread"] }, "tchip.0.1")], ["Find", model(st, { view: "find", find: { letter: "U" } }, "letter.0")], ["Find's word chosen", model(st, { word: { word: "Untuva", kind: "species" }, chips: [] }, "find")]); }
  { const st = home(40); ident(st, 30); out.push(["forty pods, scrolled", model(st, { first: 5 }, "card.18")]); }
  { const st = home(3); S.putOnBench(st, st.tray[0]); st.turn = 10; S.dryPods(st); out.push(["the dried husks", model(st, {}, "card.0")]); }
  for (const id of SPECIES) {
    const st = home(2, id); S.putOnBench(st, st.tray[0]);
    out.push([`${id}: the reading screen, sealed`, model(st, { view: "room" }, "key")]);
    ident(st); out.push([`${id}: the rail, unread`, model(st, { view: "room", lane: 0 }, "rail")], [`${id}: an unread chapter open`, model(st, { view: "room", lane: 0, at: "right" }, "key")]);
    read(st, 0, 1); out.push([`${id}: a read chapter open`, model(st, { view: "room", lane: 0, at: "right" }, "plate.0")], [`${id}: the detail`, model(st, { view: "room", lane: 0, at: "detail", trait: 0 }, "trait")], [`${id}: the stamp view`, model(st, { view: "room", lane: 0, at: "stamp" }, "stamp")]);
    const sealedI = frameOf(id).chapters.findIndex((c) => c.sealed); if (sealedI >= 0) out.push([`${id}: a sealed lane`, model(st, { view: "room", lane: sealedI }, "rail")]);
    read(st, 1); out.push([`${id}: Compare`, model(st, { cmp: { a: st.tray[0].id, b: st.tray[1].id, ci: 0, from: "inventory" } }, null)]);
  }
  { const st = home(0); out.push(["the bare bench, no pods", model(st, { view: "room" }, null)]); }
  return out;
}
const SCENES = scenes();

test("the view validates against pods.props.json in every state of every species", () => {
  for (const [name, m] of SCENES) assert.deepEqual(validate(body(m).props, schema), [], name);
});
test("props name what and never where: no rectangle, position, measure or colour anywhere in the body", () => {
  const WHERE = /^(rect|rects|x|y|w|h|at|pos|centre|center|pitch|lift|colour|colours|fill|edge|ground|px|weight|ctx|R)$/;
  const walk = (v, at, name) => { if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}[${i}]`, name)); else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { assert.ok(!WHERE.test(k), `${name}: ${at}.${k} is a where`); walk(x, `${at}.${k}`, name); } };
  for (const [name, m] of SCENES) { const v = body(m); walk(v.props, "props", name); assert.ok(!JSON.stringify(v.props).match(/\[\d+,\d+,\d+,\d+\]/), name + ": a 4-number rectangle"); }
});
test("the props and the frame beside them fit the 32 KiB budget in every scene", () => {
  let worst = 0, at = "";
  for (const [name, m] of SCENES) { const n = JSON.stringify({ t: "props", seq: 1, screen: "pods", ...body(m).props, frame: { top: { screen: "pods", title: "Pods", turn: 99, materials: { e: 1, d: 2, s: 3 } }, line: body(m).line, plate: { text: "", timed: true } } }).length; if (n > worst) { worst = n; at = name; } }
  assert.ok(worst < 32768, `${worst} bytes in "${at}"`);
});
test("every focus target the props list is a target of the state's graph, and every selector names a target or the ring itself", () => {
  for (const [name, m] of SCENES) {
    const p = body(m).props, graph = spec.focus[p.state] ?? {}, ids = new Set(p.focus.targets.map((t) => t.id));
    for (const t of p.focus.targets) assert.ok(graph[t.group], `${name}: ${t.id}'s group ${t.group} is in focus.${p.state}`);
    for (const [k, v] of Object.entries(p.focus.resolve)) if (v != null) assert.ok(ids.has(v) || v === p.focus.cur, `${name}: ${k} → ${v} is not a target`);
  }
});

// ---- the inventory ----
test("the worth line: at most two tags, from what the game holds, in their order; a sealed pod says identify ◆1", () => {
  const st = mixed(); assert.deepEqual(worthTags(st, st.tray[0], spec).map((t) => t.text), ["sealed · identify ◆ 1"]);
  ident(st); const p = st.tray[0]; assert.deepEqual(worthTags(st, p, spec).map((t) => t.key), ["newSpecies"], "no mibi of its species at home: new species");
  st.firstMibi = false; S.seedAdults(st, "S01", 9, 2, settings); assert.deepEqual(worthTags(st, p, spec).map((t) => t.key), ["nothing"], "a species at home, nothing to learn: nothing new");
  read(st, 0); assert.deepEqual(worthTags(st, p, spec).map((t) => t.key), ["full"], "every page read: known in full");
  const ch = frameOf("S01").chapters[0], t = ch.traits[0], look = chapterLooks(frameOf("S01"), ch, p.genome).find(([id]) => id === t.id)[1][0]; st.wish.S01 = { [t.id]: look };
  assert.deepEqual(worthTags(st, p, spec).map((t) => t.text), ["your goal · " + look + " may be here", "known in full"], "the goal first");
  const shed = st.tray[1]; shed.shed = 7; shed.of = "Fig"; assert.ok(worthTags(st, shed, spec).some((t) => t.text === "of Fig's line"));
});
test("the partner tag: a lone mibi of the species, or a home of one family, names the newest in need; a pair of unrelated founders needs nothing; a shed pod keeps its line tag", () => {
  const st = mixed(); ident(st); const p = st.tray[0]; st.firstMibi = false;
  const founders = S.seedAdults(st, "S01", 9, 1, settings).mibis, lone = founders[0];
  const tag = () => worthTags(st, p, spec).find((t) => t.key === "partner");
  assert.equal(tag()?.text, spec.strings.inv.worth.partner.replace("{name}", lone.name), "one mibi of the species: it needs a partner");
  const sib = S.seedSiblings(st, "S01", 4242, { ...settings, rooms: 3 }); assert.equal(sib.ok, true, sib.msg);
  assert.equal(tag(), undefined, "two unrelated founders and their children: a pair is allowed");
  st.mibis = st.mibis.filter((m) => sib.mibis.includes(m)); st.mibis[0].born = 1; st.mibis[1].born = 2;
  assert.equal(tag()?.text, spec.strings.inv.worth.partner.replace("{name}", st.mibis[1].name), "all of the species is one family: the newest is named");
  const shed = st.tray[1]; shed.shed = 7; shed.of = "Fig"; assert.ok(!worthTags(st, shed, spec).some((t) => t.key === "partner"));
});
test("sort by use puts the goal first and nothing new last; by species groups each species under its label; drying soon puts the fewest turns first and the bench pod last", () => {
  const st = mixed(); ident(st); read(st, 0); st.firstMibi = false; S.seedAdults(st, "S01", 9, 2, settings); S.seedAdults(st, "S02", 9, 2, settings);
  const ch = frameOf("S01").chapters[0], t = ch.traits[0]; st.wish.S01 = { [t.id]: chapterLooks(frameOf("S01"), ch, st.tray[0].genome).find(([id]) => id === t.id)[1][0] };
  const use = listOf(st, spec, ui()).map((e) => e.p.id); assert.equal(use[0], st.tray[0].id, "the goal pod leads");
  assert.ok(worthTags(st, S.podById(st, use.at(-1)), spec).some((x) => x.key === "nothing" || x.key === "full"), "nothing new last");
  { const sp = listOf(st, spec, ui({ sort: "species" })).map((e) => (e.p.idd ? S.speciesOf(e.p) : "~")); assert.deepEqual(sp, [...sp].sort(), "each species together, the sealed last"); }
  st.turn = 0; st.tray[3].dryAt = 2; st.tray[5].dryAt = 3; S.putOnBench(st, st.tray[2]); st.tray[2].keep = 1;
  const dry = listOf(st, spec, ui({ sort: "drying" })).map((e) => e.p.id); assert.deepEqual(dry.slice(0, 2), [st.tray[3].id, st.tray[5].id]); assert.equal(dry.at(-1), st.tray[2].id, "the bench pod last");
});
test("filter chips: in one row they widen (or), across rows they narrow (and); each chip names its count; a chip that would show nothing reads 0 and is dimmed", () => {
  const st = mixed(); ident(st, 8);
  const ids = (chips) => listOf(st, spec, ui({ chips })).map((e) => e.p.id).length;
  assert.equal(ids(["S01"]), 4); assert.equal(ids(["S01", "S02"]), 7, "or"); assert.equal(ids(["S01", "sealed"]), 0, "and: the identified Loikas are not sealed"); assert.equal(ids(["sealed"]), 4);
  const rows = P(model(st, { view: "filter" }, "tchip.0.0")).regions.tray.rows;
  assert.deepEqual(rows.map((r) => r.head), ["Reading", "Marks", "Species", ""]); assert.equal(rows[0].chips[0].word, "sealed 4");
  assert.ok(rows[1].chips.find((c) => c.id === "goal").dim, "your goal 0: dimmed"); assert.deepEqual(rows[3].chips.map((c) => c.id), ["clear", "freshenThese", "letThese"]);
});
test("Find: the closed set the save holds, under the letters that start a word; a word picked filters to the pods it matches", () => {
  const st = mixed(); ident(st); read(st, 4);
  const words = findWords(st, spec); assert.ok(words.some((w) => w.kind === "species" && w.word === "Untuva")); assert.ok(words.some((w) => w.kind === "place")); assert.ok(words.some((w) => w.kind === "look"));
  const f = P(model(st, { view: "find", find: { letter: "U" } }, "letter.0")).regions.find; assert.ok(f.letters.some((l) => l.lit && l.ch === "U")); assert.ok(f.words.every((w) => w.word[0].toUpperCase() === "U")); assert.equal(f.first, "Pick a letter, then a word");
  assert.equal(listOf(st, spec, ui({ word: { word: "Untuva", kind: "species" } })).length, 3);
});
test("the reading screen (ux-reading-v2.md): the ground, the chamber of its place, the rail with the bracket on the chapter in hand, the right frame's form; a sealed pod Identify on the key", () => {
  const st = home(2); S.putOnBench(st, st.tray[0]);
  const s = body(model(st, { view: "room" }, "key")); assert.equal(s.props.state, "read"); assert.equal(s.props.regions.read.right.form, "identify"); assert.deepEqual(s.props.focus.targets.map((t) => t.id), ["key"]); assert.equal(s.line.ok, "Identify");
  ident(st); const rb = body(model(st, { view: "room", lane: 0 }, "rail")), r = rb.props.regions.read, chamberOf = (b) => b.requests.find((q) => q.id === b.props.regions.read.chamber);
  assert.deepEqual([r.base, r.glyph, r.name], ["reading-ground-1024x522", "reading-podline-26x32", "Loika"]); { const q = chamberOf(rb); assert.deepEqual([q.place, q.hand, q.part, q.outline, q.read], ["overview", "coat", "", true, []], "the overview, Coat tinted and outlined (no part masks: the S01 and S03 cuts are retired, release 21a)"); }
  assert.deepEqual(r.rail.lanes.map((l) => [l.id, l.n, l.state]), [["coat", 2, "unread"], ["face", 3, "unread"], ["movement", 1, "unread"], ["stamina", 1, "unread"]]); assert.equal(r.rail.hand, 0); assert.equal(r.rail.trait, -1);
  assert.equal(r.right.form, "unread"); assert.equal(r.right.plates.length, 2); assert.equal(r.right.key.price, "2"); assert.equal(r.right.chapter.name, "Coat");
  assert.equal(chamberOf(body(model(st, { view: "room", lane: 1, at: "right" }, "key"))).place, "close", "Face open: the close place");
  const mb = body(model(st, { view: "room", lane: 2 }, "rail")), mv = mb.props.regions.read; assert.equal(mv.right.beside.text, "free when it grows", "the sprout beside the key of the chapter growing teaches"); assert.deepEqual([chamberOf(mb).hand, chamberOf(mb).part], ["movement", ""], "Movement: the whole body (no part masks since release 21a)");
  st.d = 1; const short = body(model(st, { view: "room", lane: 0, at: "right" }, "key")); assert.equal(short.props.regions.read.right.key.state, "dim"); assert.deepEqual([short.line.ok, short.line.need], [null, "needs ◆ 2 · you have ◆ 1"], "the reason in the need role, never a greyed verb"); assert.equal(short.props.regions.read.right.beside.text, "Data comes as your mibis grow");
  st.d = 40; read(st, 0, 1); const rd = body(model(st, { view: "room", lane: 0, at: "right", plate: 0 }, "plate.0"));
  assert.equal(rd.props.regions.read.right.form, "read"); assert.ok(rd.props.regions.read.right.plates.every((p) => p.shown.caption && p.kind), "the read form: captions and kind lines"); assert.equal(rd.line.ok, "Closer look at Colour");
  const dt = body(model(st, { view: "room", lane: 0, at: "detail", trait: 0 }, "trait")); assert.equal(dt.props.regions.read.right.form, "detail"); assert.equal(dt.props.regions.read.rail.trait, 0); assert.equal(dt.line.back, "Coat"); assert.equal(dt.line.ok, null);
  st.tray[0].why = "a new species"; assert.equal(P(model(st, { view: "room" }, "rail")).regions.read.why, "a new species", "the pod's reason when it carries one");
});
test("the reading room's mate: a shed pod shows no odds with its own parent, and takes an adult that is not its direct kin", () => {
  const st = home(2); S.putOnBench(st, st.tray[0]); ident(st); st.d = 40; read(st, 0, 1); st.firstMibi = false;
  const [fa, fb] = S.seedAdults(st, "S01", 9, 2, settings).mibis, pod = st.tray[0];
  const mate = () => body(model(st, { view: "room", lane: 0, at: "detail", trait: 0 }, "trait")).props.regions.read.right.mate;
  assert.ok(mate() && [fa.name, fb.name].includes(mate().name), "a wild pod: any adult of its species");
  pod.genome = { ...pod.genome, origin: { ...pod.genome.origin, kind: "shed", parents: ["x", "x"], parentIds: [fa.id, fa.id] } };
  assert.equal(mate()?.name, fb.name, "the shed pod of Fa is shown with Fb, never with Fa");
  st.mibis = st.mibis.filter((m) => m !== fb); assert.ok(!mate(), "no one but its parent at home: no odds");
});
test("the stamp in progress: the view on ▲ once taught, its plate and stamp at the reading screen's cell, the blocks lane by lane", () => {
  const st = home(2); S.putOnBench(st, st.tray[0]); ident(st); read(st, 0, 1); st.stampTaught = true;
  const v = body(model(st, { view: "room", at: "stamp" }, "stamp")), sp = v.props.regions.read.stamp; assert.equal(sp.mode, "view"); assert.equal(sp.cell, 8); assert.equal(sp.plateSize, 232, "the Loika's plate: 25 cells at 8 px and 32"); assert.equal(sp.blocks.length, 4); assert.equal(v.line.back, "Loika");
  assert.equal(P(model(st, { view: "room" }, "rail")).regions.read.rail.notch, true, "the stamp notch on the bracket once taught");
});
test("the recommended lane: a goal glint, a glint, never the sprout lane while another is unread; a fresh pod its first lane", () => {
  const st = home(2); ident(st); assert.equal(recommendedLane(st, st.tray[1]), 0, "a fresh pod: its first lane");
  read(st, 0, 1); const q = st.tray[1]; q.read = ["coat", "face"]; assert.equal(recommendedLane(st, q), 3, "Movement is the sprout lane: Stamina first"); q.read = ["coat", "face", "stamina"]; assert.equal(recommendedLane(st, q), 2);
});
test("the rail's layout floors (UI/UX 2026-10-30): B and x0 at the small size, x0 at the large, so every species' rail fits its picture", () => {
  const frames = SPECIES.map((id) => [id, frameOf(id)]);
  for (const [id, fr] of frames) {
    const counts = fr.chapters.map((c) => c.traits.length), n = counts.reduce((a, b) => a + b, 0), L = counts.length, G = n < 16 ? 12 : 4;
    const s = railLayout(counts, true), B = Math.max(4, Math.min(16, Math.floor((272 - G * (L - 1) - 2 * (n - L)) / n))), total = counts.reduce((a, c) => a + c * B + 2 * (c - 1), 0) + G * (L - 1);
    assert.equal(s.B, B, id + ": B is floored"); assert.equal(s.x0, Math.floor((272 - total) / 2), id + ": x0 is floored"); assert.ok(s.x0 >= 0 && s.x1 <= 272, `${id}: the small rail runs ${s.x0} to ${s.x1} in the 272 px picture`);
    const g = railLayout(counts), gt = counts.reduce((a, c) => a + c * g.B + 3 * (c - 1), 0) + g.G * (L - 1);
    assert.equal(g.x0, Math.floor(304 - gt / 2), id + ": the large rail's x0 is floored"); assert.ok(g.x0 >= 40 && g.x1 <= 566, `${id}: the large rail runs ${g.x0} to ${g.x1} in its picture (40 to 566)`);
  }
  const by = Object.fromEntries(frames.map(([, fr]) => [fr.species.name, railLayout(fr.chapters.map((c) => c.traits.length), true)]));
  assert.deepEqual([by.Igara.x0, by.Igara.x1, by.Lehten.x1 - by.Lehten.x0], [0, 272, 262], "the widest, Igara, is exactly 272; Lehten is 262");
});
test("Compare's rails (UI/UX 2026-10-30): each paper carries the pod's rail with the bracket on the open chapter, the differs mark over the lanes that differ, no worth line, tiles at 36", () => {
  const st = home(2, "S01", 92); ident(st); read(st, 0, 2); read(st, 1, 1);
  const cmpOf = (ci, nudge) => P(model(st, { cmp: { a: st.tray[0].id, b: st.tray[1].id, ci, from: "inventory", ...(nudge ? { nudge } : {}) } }, "takeA")).regions.compare;
  let c = cmpOf(0); const diff = S.compareDiff(st, st.tray[0], st.tray[1]), fr = frameOf("S01");
  for (const s of c.sides) { assert.ok(!("worth" in s), "no worth line"); assert.equal(s.rail.hand, 0, "the bracket on the open chapter"); assert.equal(s.rail.nudge, 0); assert.match(s.rail.pic, /^readrail:S01:[0-9a-f]{8}:small$/); assert.equal(s.rail.inset, "reading-inset-24x24");
    assert.deepEqual(Object.keys(s.rail.marks), ["glint", "star", "differs"]); assert.equal(s.rail.lanes.length, fr.chapters.length);
    assert.deepEqual(s.rail.lanes.map((l) => l.marks.includes("differs")), fr.chapters.map((ch) => ch.traits.some((t) => diff.includes(t.id))), "the differs mark over every lane that holds a trait in compareDiff, on both rails"); }
  assert.ok(c.sides[0].rail.lanes[0].marks.includes("differs"), "Coat differs on this pair");
  assert.ok(c.sides.every((s) => s.rail.lanes.filter((l) => l.marks.includes("differs")).every((l) => l.state === "read" && !l.marks.some((m) => m === "glint" || m === "goal"))), "a differs mark never shares a lane with a glint or a star");
  assert.equal(cmpOf(2).sides[1].rail.hand, 2, "the chapter index is the lane index, whatever the lane's state"); assert.equal(cmpOf(1, { dir: 1, until: 0 }).sides[0].rail.nudge, 1, "a stop's direction rides on both rails");
  assert.ok(c.sides[0].rows.every((r) => !r.picture || /:adult:36x36$/.test(r.picture)), "the trait tiles are asked for at 36");
  const rails = c.sides.map((s) => s.rail.lanes.map((l) => [l.id, l.n, l.state])); assert.deepEqual(rails[0].map((l) => [l[0], l[1]]), rails[1].map((l) => [l[0], l[1]]), "lane for lane: the same frame order and count on both papers");
});
test("Compare's need line (UI/UX 2026-10-30): the subject slot says one of four things and the need slot stays empty", () => {
  const line = (st, ci) => { const b = body(model(st, { cmp: { a: st.tray[0].id, b: st.tray[1].id, ci, from: "inventory" } }, "takeA")); return b.line; };
  const st = home(2, "S01", 92); ident(st); read(st, 0, 2); read(st, 1, 1);
  const ch = frameOf("S01").chapters.map((c) => c.name);
  let l = line(st, 0); assert.deepEqual([l.subject, l.need], ["they differ here", ""], "A: a trait of the open chapter differs");
  l = line(st, 1); assert.deepEqual([l.subject, l.need], ["they differ in " + ch[0], ""], "B: it differs, not here (Face is not read on both)");
  const s2 = home(2, "S01", 92); ident(s2); read(s2, 0, 2); s2.tray[1].read.length = 0; assert.equal(line(s2, 0).subject, "nothing read on both yet", "D: nothing read on both");
  const eq = home(2, "S01", 92); ident(eq); read(eq, 0, 1); read(eq, 1, 1); eq.tray[1].genome = JSON.parse(JSON.stringify(eq.tray[0].genome)); assert.equal(line(eq, 0).subject, "no read trait differs", "C: nothing read on both differs");
  for (const x of ["they differ here", "they differ in Legs & Tail", "no read trait differs", "nothing read on both yet"]) assert.ok(!/\d/.test(x) && (x.match(/[A-Za-z]+/g) ?? []).length <= 5, x + ": five words or fewer, no digits");
  // B names the nearest lane with a differs mark, the one after (▼) on a tie
  const chs = frameOf("S01").chapters, A = { read: chs.map((c) => c.id) }, ids = (...k) => new Set(k.map((i) => chs[i].id)), sp = spec;
  assert.ok(compareLine(spec.strings, chs, 1, ids(0, 2), A, A, sp).endsWith(chs[2].name), "a tie goes to the chapter after");
  assert.ok(compareLine(spec.strings, chs, 3, ids(0, 1), A, A, sp).endsWith(chs[1].name), "the nearest");
});
test("Compare in the reading room's look: the bench and two papers, this pod on the left and its kin on the right, the open chapter's traits in rows, a trait read on both that differs raised with its word, Take to the reading room on each", () => {
  const st = home(3); ident(st); read(st, 0); read(st, 1);
  const m = model(st, { cmp: { a: st.tray[0].id, b: st.tray[1].id, ci: 0, from: "inventory" } }, null), b = body(m), c = b.props.regions.compare, fr = frameOf("S01");
  assert.equal(b.props.state, "compare"); assert.equal(c.bench, "reading-bench-1024x520"); assert.deepEqual(Object.keys(b.props.regions), ["compare"], "no rail, no device pages");
  assert.deepEqual(c.sides.map((s) => [s.title, s.which, s.chapter, s.count, s.take]), [["Loika", "this pod", "Coat", "1 of 4", "Take to the reading room"], ["Loika", "its kin · ▶ another", "Coat", "1 of 4", "Take to the reading room"]]);
  assert.deepEqual(c.sides[0].rows.map((r) => r.name), fr.chapters[0].traits.map((t) => t.name));
  const diff = S.compareDiff(st, st.tray[0], st.tray[1]); for (const s of c.sides) assert.deepEqual(s.rows.map((r) => r.differs), fr.chapters[0].traits.map((t) => diff.includes(t.id)), "the mark on both papers, only where both read it and the looks differ");
  assert.deepEqual([b.props.focus.cur, b.props.focus.targets.map((t) => t.id)], ["takeA", ["takeA", "takeB"]]); assert.equal(b.line.ok, "Take this Loika to the reading room"); assert.equal(b.line.back, "Pods");
  const u = home(2); ident(u); read(u, 0); const cu = P(model(u, { cmp: { a: u.tray[0].id, b: u.tray[1].id, ci: 0, from: "inventory" } }, "takeB")).regions.compare;
  assert.ok(cu.sides[1].rows.every((r) => r.look === "not read yet" && !r.differs && r.picture === ""), "an unread page: its trait names and not read yet, no tile and no mark"); assert.equal(cu.sides[1].which, "its kin");
});

// ---- the pod picker (the pods picker's design B) ----
const inv = (m) => P(m).regions.inv, cardsOf = (m) => inv(m).grid.cards;
test("the count is a fact, never n of N: pods and species; a filter says how many of how many and what; no pods: the empty seat and its two lines, the tools dimmed with their reason", () => {
  const st = mixed(); ident(st);
  assert.equal(inv(model(st, {}, "sort")).detail.right, "12 pods · 4 species", "the ring off the pods: the count");
  assert.equal(inv(model(st, {}, "card.0")).detail.right, "not read yet", "the ring on an identified pod: the reading, with the dial in front");
  assert.equal(inv(model(st, { chips: ["S02"] }, "card.0")).detail.right, "3 of 12 · Untuva");
  assert.equal(inv(model(st, { chips: ["S02", "unread"] }, "card.0")).detail.right, "3 of 12 · Untuva, unread");
  assert.equal(inv(model(home(1), {}, "card.0")).detail.right, "1 pod · 1 species", "one pod");
  const none = inv(model(home(0), {}, "sort")); assert.deepEqual([none.detail.right, none.empty, none.tools.dim, none.tools.sort, none.verbs], ["", ["No pods yet", "Expeditions bring pods home"], true, "nothing to sort yet", []], "no pods: no verbs, the empty seat and its lines");
  assert.deepEqual(inv(model(st, { chips: ["S04", "sealed"] }, "filter")).empty, ["No pods match", "Change Filter or Find to see more"]);
});
test("a card: the pod at its large class, its name, one mark (the goal star before the drying drop before the new dot); a sealed pod says so quietly; fade and held are flags", () => {
  const st = mixed(); ident(st, 4); read(st, 0, 1); st.turn = 9;   // every pod 12 turns from turn 1: 4 left, amber
  const c = cardsOf(model(st, {}, "card.0"));
  assert.ok(c.every((x) => /^pod:S\d\d:[is]:144x176$|^pod:-:s:144x176$/.test(x.pod)), "the large class, 144 x 176: " + c.map((x) => x.pod).join(" "));
  const sealed = c.find((x) => x.sealed); assert.equal(sealed.name, "a sealed pod"); assert.ok(c.filter((x) => !x.sealed).every((x) => /^[A-Z][a-z]+$/.test(x.name)));
  assert.ok(c.every((x) => ["drying", "star", "new", ""].includes(x.mark)) && c.some((x) => x.mark === "drying"), "twelve turns on: the pods are drying");
  const fresh = home(2); ident(fresh); fresh.tray[1].seen = 0; const m = cardsOf(model(fresh, {}, "card.0")); assert.deepEqual(m.map((x) => x.mark).sort(), ["", "new"].sort(), "a pod not yet seen carries the new dot, the other nothing");
  assert.ok(c.every((x) => x.fade === false && x.held === false), "Read: nothing fades");
});
test("the verbs: Read, Grow, Freshen, Compare and Let go, each only while some pod can take it; the caller's alone when it fixed one; a pod that cannot take the verb fades and says why", () => {
  const st = mixed(); ident(st); st.turn = 7;
  assert.deepEqual(inv(model(st, {}, "card.0")).verbs.map((v) => [v.id, v.on]), [["read", true], ["freshen", false], ["compare", false], ["letgo", false]]);
  st.bud = { species: "S01" }; assert.ok(!inv(model(st, {}, "card.0")).verbs.some((v) => v.id === "grow"), "Grow is the green key's: never on the browse line"); st.bud = null;
  const f = home(2); ident(f); assert.ok(inv(model(f, {}, "card.0")).verbs.some((v) => v.id === "freshen"), "Freshen is always on the line (a fresh pod fades and says so)"); assert.equal(cardsOf(model(f, { verb: "freshen" }, "card.0")).every((x) => !x.fade), true, "Freshen no longer fades the fresh pods");
  const one = home(1); ident(one); assert.ok(!inv(model(one, {}, "card.0")).verbs.some((v) => v.id === "compare"), "no Compare when no species has two pods");
  const fx = inv(model(st, { verb: "grow", fixed: true }, "card.0")); assert.deepEqual([fx.verbs, fx.heading], [[], "Choose a pod to grow"], "a caller's fixed verb: no pill, one plain heading");
  assert.equal(inv(model(st, { verb: "bring", fixed: true, choosing: true }, "card.0")).heading, "Choose a pod for the bench");
  const sealed = home(2); ident(sealed, 1); const g = cardsOf(model(sealed, { verb: "grow", fixed: true }, "card.0")), list = listOf(sealed, spec, ui({ verb: "grow", fixed: true })); assert.deepEqual(g.map((x) => [list[x.k].p.idd, x.fade]), g.map((x) => [list[x.k].p.idd, false]), "the sealed pod cannot grow, but it stays in full colour: a blocked verb never greys a pod");
  const lz = body(model(sealed, { verb: "grow", fixed: true }, "card." + g.find((x) => !list[x.k].p.idd).k)).line; assert.deepEqual([lz.ok, lz.subject], [null, "identify it first"], "no ✓ on a pod that cannot take the verb: the reason in the middle"); assert.match(lz.subject, /identify it first/);
  const fr = cardsOf(model(st, { verb: "freshen" }, "card.0")); assert.ok(fr.every((x) => x.fade === false), "every pod six turns down can be freshened");
  const two = mixed(); ident(two, 2); const cmp = cardsOf(model(two, { verb: "compare" }, "card.0")); assert.equal(cmp.filter((x) => x.fade).length, 0, "Compare before a pod is held: no pod is veiled (only the second pick veils)");
  const held = ident(mixed()), a = held.tray[0], hm = cardsOf(model(held, { verb: "compare", hold: a.id }, "card.0")), L = listOf(held, spec, ui({ hold: a.id })); assert.ok(hm.filter((x) => !x.fade).every((x) => S.speciesOf(L[x.k].p) === S.speciesOf(a)) && hm.filter((x) => !x.fade).length >= 2, "held for Compare: only its kin stay bright"); assert.ok(hm.find((x) => L[x.k].p === a).held);
});
test("the detail line: the focused pod's first tag and where it was found, the freshness in amber when it dries; on the verb line what the verb does and how many pods can take it", () => {
  const st = mixed(); ident(st); const v = (focus, over = {}) => inv(model(st, over, focus)).detail;
  assert.match(v("card.0").left, /^.+ · .+$/); assert.equal(v("card.0").amber, false); st.turn = 9; assert.deepEqual([v("card.0").amber, v("card.0").right], [true, "dries out in 4 turns"]);
  st.turn = 2; assert.deepEqual([v("verb.read").left, v("verb.read").right], ["Read works on the bright pods", "twelve bright pods"]);
  assert.deepEqual([v("verb.freshen", { verb: "freshen" }).left, v("verb.freshen", { verb: "freshen" }).right], ["Freshen works on the bright pods", "twelve bright pods"], "a turn down: every pod can be freshened");
});
test("the selectors: ▶ at the right edge and ◀ at the left stay; ▲ from the top row is the verb that is on (a tool when the caller fixed the verb), ▼ from the verb line the first pod that can take it; ▼ at the last row stays", () => {
  const st = mixed(); ident(st);
  const r = (focus, over = {}) => P(model(st, over, focus)).focus.resolve;
  assert.equal(r("card.4")["card.right"], "card.4", "the right edge: the ring stays"); assert.equal(r("card.1")["card.right"], "card.2"); assert.equal(r("card.0")["card.left"], "card.0", "the left edge: the ring stays");
  assert.equal(r("card.2")["card.up"], "verb.read"); assert.equal(r("card.2", { verb: "grow", fixed: true })["card.up"], "filter", "a fixed verb: the tool above"); assert.deepEqual([0, 1, 2, 3, 4].map((c) => r("card." + c, { verb: "grow", fixed: true })["card.up"]), ["sort", "sort", "filter", "filter", "find"]);
  assert.equal(r("card.7")["card.up"], "card.2"); assert.equal(r("card.11")["card.down"], "card.11", "the last row: the ring stays");
  assert.equal(r("verb.read")["verb.down"], "card.0"); const g = r("verb.freshen", { verb: "freshen" }); assert.match(g["verb.down"], /^card\./);
  assert.deepEqual([r("sort")["sort.down"], r("filter")["filter.down"], r("find")["find.down"]], ["card.0", "card.2", "card.4"], "Sort over the first column, Filter the third, Find the fifth");
});
test("scrolling: the ring always sits on a whole card; a ring past the second row scrolls one row and keeps a row of context above it; the rail shows the share", () => {
  const st = home(40); ident(st);
  const at = (focus, first = 0) => body(model(st, { first }, focus));
  assert.equal(at("card.10").first, 1, "the third row: one row down"); assert.equal(at("card.9").first, 0); assert.equal(at("card.0", 5).first, 0, "back at the top");
  const v = at("card.30", 3); assert.equal(v.first, 5); const rail = v.props.regions.inv.rail; assert.ok(rail.share > 200 && rail.share < 300, "two of eight rows: a quarter");
  assert.ok(v.props.regions.inv.grid.cards.every((c) => c.row >= -1 && c.row <= 2), "the rows on screen and one either side");
  assert.equal(P(model(home(10), {}, "card.0")).regions.inv.rail, null, "two rows: no rail");
});
test("a dried pod shows once in the detail line (it dried out, its reads stay), then is gone", () => {
  const st = home(3); S.putOnBench(st, st.tray[0]); st.turn = 13; S.dryPods(st);
  assert.equal(inv(model(st, {}, "sort")).detail.right, "2 pods dried out"); S.husksShown(st); assert.equal(inv(model(st, {}, "sort")).detail.right, "1 pod · 1 species", "gone after the visit");
});
test("the hold Let go asks: the frame carries it with the ring on a pod under Let go (slower for a pod that carries the goal or is the only of its species, and the line says why); none under any other verb; the tray's Let these go holds too", () => {
  const st = mixed(); ident(st); const on = (focus, over = {}) => podsProps(model(st, over, focus), spec, frameSpec);
  assert.equal(on("card.0").hold, null, "Read: no hold"); assert.deepEqual(on("card.0", { verb: "letgo" }).hold, { ms: 0, why: "" }, "Let go: the frame's own 3 s");
  assert.equal(on("verb.letgo", { verb: "letgo" }).hold, null, "the ring on the verb line: no hold");
  const lone = home(1); ident(lone); const g = podsProps(model(lone, { verb: "letgo" }, "card.0"), spec, frameSpec); assert.deepEqual([g.hold.ms, g.hold.why], [6000, "your only Loika pod"], "the only of its species: slower, and the line says why"); assert.deepEqual([g.line.ok, g.line.subject], ["Hold longer to let go", "your only Loika pod"]);
  assert.equal(on("card.0", { verb: "letgo" }).line.ok, "Hold to let go");
  assert.deepEqual(on("tchip.3.2", { view: "filter" }).hold, { ms: 0, why: "" }, "Let these go"); assert.equal(on("tchip.0.0", { view: "filter" }).hold, null);
});
test("the reading dial: each identified card carries its dial and picture, an unidentified one none; the detail line says the reading in words (no digits) with the dial, below drying, a flash and the filter", () => {
  const st = mixed(); ident(st, 11);
  const cs = cardsOf(model(st, {}, "card.0")); for (const c of cs) assert.deepEqual([!!c.dial, !!c.dialPic], [c.sealed ? false : true, c.sealed ? false : true]);
  const d = inv(model(st, {}, "card.0")).detail; assert.match(d.rightDial, /^dial:0:\d+(:s)?$/); assert.equal(d.right, "not read yet");
  const p = st.tray[0], fr = frameOf(S.speciesOf(p)), open = fr.chapters.filter((c) => !c.sealed); S.read(st, p, open[0].id, settings);
  const part = inv(model(st, {}, "card.0")).detail; assert.match(part.right, /^\w+ of \w+ (chapters )?read/); assert.ok(!/\d/.test(part.right), "no digits"); assert.match(part.rightDial, /^dial:1:/);
  assert.equal(inv(model(st, { chips: ["S01"] }, "card.0")).detail.rightDial ?? "", "", "the filter words rank above the reading");
  assert.equal(inv(model(st, {}, "sort")).detail.rightDial ?? "", "", "the ring off the pods: the count, no dial");
});
test("the bottom line: ✓ does the verb on the pod (its button's own words), a pod that cannot take it says why with no ✓, the verb line says ▼; Pods never shows the station's notice", () => {
  const st = mixed(); ident(st); st.s = 0; st.turn = 7;
  const line = (focus, over = {}) => body(model(st, over, focus)).line;
  assert.deepEqual(line("card.0"), { ok: "Take to the reading room", back: "Home", subject: "▲ other actions", need: "" }, "browse, the ring on the top row: the foot hints the verb strip");
  assert.equal(line("card.0", { blocked: "the incubator is busy" }).subject, "The incubator is busy", "a fixed verb no pod can take: the reason in the foot");
  assert.deepEqual(line("verb.read"), { ok: "Read", back: "Home", subject: "▼ choose a pod", need: "" });
  assert.deepEqual(line("card.0", { verb: "freshen" }), { ok: null, back: "Home", subject: "needs ❀ 2 · you have ❀ 0", need: "" }, "held: the reason in the middle, no greyed verb");
  assert.equal(line("card.0", { verb: "grow", fixed: true }).ok, "Grow it"); assert.equal(line("card.0", { verb: "bring", fixed: true, choosing: true }).ok, "Bring onto the bench");
  assert.equal(line("card.0", { verb: "letgo", waits: true }).subject, "A new pod needs room");
  for (const [name, m] of SCENES) { const l = body(m).line; assert.ok(l && typeof l.need === "string", name + ": the line always has its own need"); }
});
