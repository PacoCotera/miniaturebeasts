// Pods' props (lvgl-switch.md §2.1): the view the face takes, views/pods-props.mjs, in Node: the pod inventory (the pod inventory's design), its filter tray and Find, the reading room (// the read's design) and Compare. Plain JSON that names what and never where: it validates against pods.props.json in every state, holds no rectangle, no measure and no layout rule, and fits the
// 32 KiB props budget with the frame beside it. Then what each state says: the count, the worth line, the sorts, the filter and Find, the freshness words, the panel's held buttons, the selectors the
// host answers for the ring, the reading room's index, page forms and band.
//   node --test prototypes/station/tests/pods-props.test.mjs
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
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("pods.json"), frameSpec = J("frame.json"), schema = J("pods.props.json");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const SPECIES = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => f.slice(8, 11));

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
  { const st = mixed(); ident(st, 8); read(st, 0, 2); read(st, 4); out.push(["twelve pods by use", model(st, {}, "card.0")], ["twelve pods by species", model(st, { sort: "species" }, "card.3")], ["the panel's first button", model(st, {}, "act.0")]);
    out.push(["the filter tray", model(st, { view: "filter", chips: ["S01", "unread"] }, "tchip.0.1")], ["Find", model(st, { view: "find", find: { letter: "U" } }, "letter.0")], ["Find's word chosen", model(st, { word: { word: "Untuva", kind: "species" }, chips: [] }, "chip.0")]); }
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
test("the count is a fact, never n of N: pods and species; a filter says how many of how many and what", () => {
  const st = mixed(); ident(st);
  assert.equal(P(model(st, {}, "card.0")).regions.inv.tools.count, "12 pods · 4 species");
  assert.equal(P(model(st, { chips: ["S02"] }, "card.0")).regions.inv.tools.count, "3 of 12 · Untuva");
  assert.equal(P(model(st, { chips: ["S02", "unread"] }, "card.0")).regions.inv.tools.count, "3 of 12 · Untuva, unread");
  assert.equal(P(model(home(1), {}, "card.0")).regions.inv.tools.count, "1 pod · 1 species", "one pod");
  const none = P(model(home(0), {}, "sort")).regions.inv; assert.deepEqual([none.tools.count, none.cabinet.empty, !!none.cabinet.bare, none.tools.dim, none.tools.sort], ["", "No pods yet · expeditions bring them home", true, true, "nothing to sort yet"], "no pods: the bare niches and the line; the tools dimmed with their reason on their face");
});
test("the worth line: at most two tags, from what the game holds, in their order; a sealed pod says identify ◆1", () => {
  const st = mixed(); assert.deepEqual(worthTags(st, st.tray[0], spec).map((t) => t.text), ["sealed · identify ◆ 1"]);
  ident(st); const p = st.tray[0]; assert.deepEqual(worthTags(st, p, spec).map((t) => t.key), ["newSpecies"], "no mibi of its species at home: new species");
  st.firstMibi = false; S.seedAdults(st, "S01", 9, 2, settings); assert.deepEqual(worthTags(st, p, spec).map((t) => t.key), ["nothing"], "a species at home, nothing to learn: nothing new");
  read(st, 0); assert.deepEqual(worthTags(st, p, spec).map((t) => t.key), ["full"], "every page read: known in full");
  const ch = frameOf("S01").chapters[0], t = ch.traits[0], look = chapterLooks(frameOf("S01"), ch, p.genome).find(([id]) => id === t.id)[1][0]; st.wish.S01 = { [t.id]: look };
  assert.deepEqual(worthTags(st, p, spec).map((t) => t.text), ["your goal · " + look + " may be here", "known in full"], "the goal first");
  const shed = st.tray[1]; shed.shed = 7; shed.of = "Fig"; assert.ok(worthTags(st, shed, spec).some((t) => t.text === "of Fig's line"));
});
test("sort by use puts the goal first and nothing new last; by species groups each species under its label; drying soon puts the fewest turns first and the bench pod last", () => {
  const st = mixed(); ident(st); read(st, 0); st.firstMibi = false; S.seedAdults(st, "S01", 9, 2, settings); S.seedAdults(st, "S02", 9, 2, settings);
  const ch = frameOf("S01").chapters[0], t = ch.traits[0]; st.wish.S01 = { [t.id]: chapterLooks(frameOf("S01"), ch, st.tray[0].genome).find(([id]) => id === t.id)[1][0] };
  const use = listOf(st, spec, ui()).map((e) => e.p.id); assert.equal(use[0], st.tray[0].id, "the goal pod leads");
  assert.ok(worthTags(st, S.podById(st, use.at(-1)), spec).some((x) => x.key === "nothing" || x.key === "full"), "nothing new last");
  const v = P(model(st, { sort: "species" }, "card.0")).regions.inv.cabinet; assert.ok(v.rows.filter((r) => r.label).length >= 2, "labels carved for the species"); assert.match(v.rows[0].label, /^Loika · 4$/);
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
test("a card: the niche, the pod, the mini rail, the strip; the name blank on a sealed pod; the drying words amber in place of the origin", () => {
  const st = mixed(); ident(st, 4); read(st, 0, 1); st.turn = 9;   // every pod 12 turns from turn 1: 4 left, amber
  const c = P(model(st, {}, "card.0")).regions.inv.cabinet.cards;
  const sealed = c.find((x) => x.name === ""); assert.ok(sealed, "a sealed card has no name"); assert.equal(sealed.worth, "sealed · identify ◆ 1"); assert.deepEqual(sealed.rail.map((l) => l.state), ["unread"]);
  const loika = c.find((x) => x.name === "Loika" && x.rail.filter((l) => l.state === "read").length === 1); assert.equal(loika.rail.length, 4); assert.deepEqual([loika.amber, loika.line, loika.fresh.left], [true, "dries out in 4 turns", 4]);
  st.turn = 2; const fresh = P(model(st, {}, "card.0")).regions.inv.cabinet.cards[0]; assert.equal(fresh.amber, false); assert.match(fresh.line, /^pond edge|^[a-z ]+( · [a-z' ]+)?$/);
});
test("the panel: the focused card in full and its five buttons in their order, a held one saying why on its own face", () => {
  const st = mixed(); ident(st); st.s = 0; const p = st.tray[0];
  const panel = (focus = "card.0", over = {}) => P(model(st, over, focus)).regions.inv.panel;
  assert.deepEqual(panel().acts.map((a) => a.word), ["Take to the reading room", "Grow it", "Freshen · already fresh", "Compare", "Let it go · its reads stay"]);
  st.turn = 7; assert.equal(panel().acts[2].word, "Freshen ❀ 2 · you have ❀ 0", "six turns down: two steps; short: says so on its face (review round 2)"); assert.equal(body(model(st, {}, "act.2")).line.need, "Freshen · needs ❀ 2 · you have ❀ 0", "and whole in the foot"); st.s = 5; assert.equal(panel().acts[2].word, "Freshen ❀ 2");
  S.putOnBench(st, p); const k = listOf(st, spec, ui()).findIndex((e) => e.p === p); assert.deepEqual(panel("card." + k).acts.map((a) => a.word).slice(0, 3), ["Open the reading room", "Grow it", "Freshen · the bench keeps it"]);
  assert.equal(panel("card." + k).fresh.words, "kept fresh on the bench");
  assert.equal(panel("card." + k, { choosing: true }).acts[0].word, "Bring onto the bench", "choosing mode");
  const lone = home(1); ident(lone); assert.equal(P(model(lone, {}, "card.0")).regions.inv.panel.acts[3].word, "Compare · the only Loika");
  assert.equal(P(model(lone, { ask: lone.tray[0].id }, "act.4")).regions.inv.panel.acts[4].word, "Let it go? The only Loika", "the guard asks on the button's own face");
});
test("the selectors: ▶ from the right-hand column is the panel's first button, ▲ from the top row the tool above it, ◀ from the panel the card it shows; the ring stays at an edge", () => {
  const st = mixed(); ident(st);
  const r = (focus) => P(model(st, {}, focus)).focus.resolve;
  assert.equal(r("card.2")["card.right"], "act.0"); assert.equal(r("card.1")["card.right"], "card.2"); assert.equal(r("card.0")["card.left"], "card.0", "the left edge: the ring stays");
  assert.deepEqual(["card.0", "card.1", "card.2"].map((c) => r(c)["card.up"]), ["sort", "filter", "find"]); assert.equal(r("card.4")["card.up"], "card.1");
  assert.equal(r("card.9")["card.down"], "card.9", "the last row: the ring stays");
  assert.equal(P(model(st, { panelPod: listOf(st, spec, ui())[4].p.id }, "act.2")).focus.resolve["card.back"], "card.4");
});
test("scrolling: the ring always sits on a whole card; a ring past the second row scrolls one row and keeps a row of context above it; the rail shows the share", () => {
  const st = home(40); ident(st);
  const at = (focus, first = 0) => body(model(st, { first }, focus));
  assert.equal(at("card.6").first, 1, "the third row: one row down"); assert.equal(at("card.3").first, 0); assert.equal(at("card.0", 5).first, 0, "back at the top");
  const v = at("card.30", 3); assert.equal(v.first, 9); const rail = v.props.regions.inv.rail; assert.ok(rail.share > 100 && rail.share < 200, "two of fourteen rows: about a seventh");
  assert.ok(v.props.regions.inv.cabinet.cards.every((c) => c.row >= -1 && c.row <= 2), "the rows on screen and one either side");
});
test("a dried pod shows once as the husk in its niche with its reads kept, then is gone; the count says it dried out", () => {
  const st = home(3); S.putOnBench(st, st.tray[0]); st.turn = 13; S.dryPods(st);
  const v = P(model(st, {}, "card.0")).regions.inv; assert.equal(v.cabinet.cards.filter((c) => c.husk).length, 2); assert.equal(v.cabinet.cards.find((c) => c.husk).worth, "dried out · its reads stay"); assert.equal(v.tools.count, "2 pods dried out");
  S.husksShown(st); assert.equal(P(model(st, {}, "card.0")).regions.inv.cabinet.cards.filter((c) => c.husk).length, 0, "gone after the visit");
});

// ---- the reading room ----
test("the reading screen (ux-reading-v2.md): the ground, the chamber of its place, the rail with the bracket on the chapter in hand, the right frame's form; a sealed pod Identify on the key", () => {
  const st = home(2); S.putOnBench(st, st.tray[0]);
  const s = body(model(st, { view: "room" }, "key")); assert.equal(s.props.state, "read"); assert.equal(s.props.regions.read.right.form, "identify"); assert.deepEqual(s.props.focus.targets.map((t) => t.id), ["key"]); assert.equal(s.line.ok, "Identify");
  ident(st); const rb = body(model(st, { view: "room", lane: 0 }, "rail")), r = rb.props.regions.read, chamberOf = (b) => b.requests.find((q) => q.id === b.props.regions.read.chamber);
  assert.deepEqual([r.base, r.glyph, r.name], ["reading-ground-1024x522", "reading-podline-26x32", "Loika"]); { const q = chamberOf(rb); assert.deepEqual([q.place, q.hand, q.part, q.outline, q.read], ["overview", "coat", "coat", true, []], "the overview, Coat tinted and outlined"); }
  assert.deepEqual(r.rail.lanes.map((l) => [l.id, l.n, l.state]), [["coat", 2, "unread"], ["face", 2, "unread"], ["movement", 1, "unread"], ["stamina", 1, "unread"]]); assert.equal(r.rail.hand, 0); assert.equal(r.rail.trait, -1);
  assert.equal(r.right.form, "unread"); assert.equal(r.right.plates.length, 2); assert.equal(r.right.key.price, "2"); assert.equal(r.right.chapter.name, "Coat");
  assert.equal(chamberOf(body(model(st, { view: "room", lane: 1, at: "right" }, "key"))).place, "close", "Face open: the close place");
  const mb = body(model(st, { view: "room", lane: 2 }, "rail")), mv = mb.props.regions.read; assert.equal(mv.right.beside.text, "free when it grows", "the sprout beside the key of the chapter growing teaches"); assert.deepEqual([chamberOf(mb).hand, chamberOf(mb).part], ["movement", "legs"], "Movement: the legs");
  st.d = 1; const short = body(model(st, { view: "room", lane: 0, at: "right" }, "key")); assert.equal(short.props.regions.read.right.key.state, "dim"); assert.deepEqual([short.line.ok, short.line.need], [null, "needs ◆ 2 · you have ◆ 1"], "the reason in the need role, never a greyed verb"); assert.equal(short.props.regions.read.right.beside.text, "Data comes as your mibis grow");
  st.d = 40; read(st, 0, 1); const rd = body(model(st, { view: "room", lane: 0, at: "right", plate: 0 }, "plate.0"));
  assert.equal(rd.props.regions.read.right.form, "read"); assert.ok(rd.props.regions.read.right.plates.every((p) => p.shown.caption && p.kind), "the read form: captions and kind lines"); assert.equal(rd.line.ok, "Closer look at Colour");
  const dt = body(model(st, { view: "room", lane: 0, at: "detail", trait: 0 }, "trait")); assert.equal(dt.props.regions.read.right.form, "detail"); assert.equal(dt.props.regions.read.rail.trait, 0); assert.equal(dt.line.back, "Coat"); assert.equal(dt.line.ok, null);
  st.tray[0].why = "a new species"; assert.equal(P(model(st, { view: "room" }, "rail")).regions.read.why, "a new species", "the pod's reason when it carries one");
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
test("the bottom line: the verb of what has the ring, or its reason when held; the way back named; Pods never shows the station's notice", () => {
  const st = mixed(); ident(st); st.s = 0; st.turn = 7;
  const line = (focus, over = {}) => body(model(st, over, focus)).line;
  assert.deepEqual(line("card.0"), { ok: "Take to the reading room", back: "Home", subject: "", need: "" });
  assert.deepEqual(line("act.2"), { ok: null, back: "Home", subject: "", need: "Freshen · needs ❀ 2 · you have ❀ 0" }, "held: the reason in the foot, no greyed verb");
  for (const [name, m] of SCENES) { const l = body(m).line; assert.ok(l && typeof l.need === "string", name + ": the line always has its own need"); }
});
test("the panel carries the pod's rail at the small size in place of the next-step line: a lane a chapter, its state, the marks over the unread lanes; an unidentified pod has none", () => {
  const st = home(1), panel = () => P(model(st, {}, "card.0")).regions.inv.panel;
  assert.equal(panel().rail, null, "a sealed pod has no chapters to show");
  ident(st); let r = panel().rail; assert.match(r.pic, /^readrail:S\d\d:[0-9a-f]{8}:small$/); assert.deepEqual(r.lanes.map((l) => l.state), ["unread", "unread", "unread", "unread"]); assert.ok(r.lanes.every((l) => l.n >= 1));
  assert.ok(r.lanes.every((l) => l.marks.every((m) => ["glint", "goal"].includes(m))), "the marks are a glint or the goal");
  read(st, 0); r = panel().rail; assert.ok(r.lanes.every((l) => l.state === "read" && !l.marks.length), "a read lane carries no marks");
  assert.deepEqual(Object.keys(r.marks), ["glint", "star"]);
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
