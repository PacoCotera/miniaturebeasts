// What the pods hold (station step 9-1; the accepted walk-4 picture 13): the board of one kind's whole shelf. The model (nursery-board.mjs), its props (views/holds-props.mjs) and its keys (intents/holds.mjs).
//   node --test prototypes/station/tests/nursery-board.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { setFrames, frameOf } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as N from "../src/nursery.mjs";
import * as B from "../src/nursery-board.mjs";
import { shapeOf, scaleAt } from "../src/trait-shapes.mjs";
import { podsProps } from "../src/views/pods-props.mjs";
import { researchKey, intent } from "../src/intents/pods.mjs";
import { rng } from "../../species/framework/draws.mjs";
import { createFocus } from "../../ui/focus.mjs";
S.useNameList("en-short-1");

const here = import.meta.dirname, fdir = path.resolve(here, "../../species/frames/language"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const spec = JSON.parse(readFileSync(path.join(specs, "pods.json"), "utf8")), frame = JSON.parse(readFileSync(path.join(specs, "frame.json"), "utf8")), Sg = spec.strings.nursery.holds;
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 3 }, T0 = Date.UTC(2026, 10, 22, 12);
const sv = { v: 8, seed: 7, wid: "w1", turn: 4, bay: [], mibis: [], trips: [], carried: [], carrySeen: 0, carryRefused: [], tier: 1, shield: 3 };
const crate = (n, pods) => ({ id: "x" + n, n, turn: n, at: 0, e: 0, d: 0, s: 0, pods, met: [], explored: 5, of: 20, lines: [] });

// the picture's save: Tita, Kenya, Moss; wild pods from three places; pods of three pairs
function world({ wild = 12, pairs = [[0, 1, 4], [0, 2, 3], [1, 2, 3]], loikas = 3 } = {}) {
  const st = S.freshSt("w1", 3, T0); S.normalize(st, T0); st.e = 999; st.s = 999; st.d = 999; st.firstMibi = false;
  S.seedAdults(st, "S01", 11, loikas, settings); ["Tita", "Kenya", "Moss"].forEach((n, i) => { if (st.mibis[i]) st.mibis[i].name = n; });
  const places = ["pond", "rock", "wood"], pods = Array.from({ length: wild }, (_, i) => ({ id: "p" + i, sp: 0, g: places[i % 3], how: "calm", gs: 100 + i * 3, k: null }));
  const sv2 = { ...sv, bay: [crate(1, pods)], mibis: [] }; S.dockKey(st, sv2, settings, T0); S.openBay(st, sv2, settings, T0);
  const g = rng("board"); let t = 0;
  for (const [x, y, n] of pairs) for (let i = 0; i < n; i++) assert.ok(S.pairPod(st, sv, st.mibis[x], st.mibis[y], settings, T0 + t++, g).ok);
  return st;
}
const kindOf = (st) => S.speciesOf(st.tray[0]);
function host(st, u) { const said = []; return { st, sv, settings, ui: { pods: u, screen: "pods", inc: {}, hab: {}, home: {}, viv: {} }, specs: { pods: spec }, now: () => T0, save() {}, say: (t) => said.push(t), play() {}, at() {}, goto: () => {}, said, motion: () => false, holding: () => false }; }
const base = (over = {}) => ({ view: "nursery", focus: createFocus({}, null), ...over });
const props = (st, u) => podsProps({ st, settings, ui: u, focus: null, now: T0 }, spec, frame);
const texts = (b) => b.props.regions.page.scale.texts.map((t) => t.text);
const allTraits = (fr) => fr.chapters.filter((c) => !c.sealed).flatMap((c) => c.traits.filter((t) => t.nature !== "doing").map((t) => ({ ...t, chapter: c.id })));

test("1. the blue key in the nursery opens the board; the blue key or ← returns to the shelf with the ring where it was", () => {
  const st = world(), u = base({ ring: { z: "shelf", i: 2 } }), h = host(st, u);
  researchKey(h); assert.equal(u.view, "holds"); assert.deepEqual(u.ring, { z: "shelf", i: 2 }, "the shelf's ring is not touched");
  researchKey(h); assert.equal(u.view, "nursery"); assert.deepEqual(u.ring, { z: "shelf", i: 2 });
  researchKey(h); intent(h, null, "back"); assert.equal(u.view, "nursery"); assert.deepEqual(u.ring, { z: "shelf", i: 2 });
  assert.equal(props(st, { ...u, view: "holds" }).props.state, "page");
});

test("2. every trait of the kind has one row in its own shape, grouped by chapter, as on her board", () => {
  const st = world(), kind = kindOf(st), b = B.boardOf(st, kind), fr = frameOf(kind), want = allTraits(fr);
  assert.deepEqual(b.flat.map((r) => r.id).sort(), want.map((t) => t.id).sort(), "one row a trait, no doing trait (never known before the hatch)");
  for (const g of b.chapters) for (const r of g.traits) { const t = want.find((x) => x.id === r.id); assert.equal(r.shape, shapeOf(fr, t)); assert.equal(t.chapter, g.id); }
  assert.deepEqual([...new Set(b.chapters.map((g) => g.col))].sort(), [0, 1]);
  assert.equal(b.pods, st.tray.length); assert.equal(b.pairs + b.found, b.pods); assert.equal(b.found, 12);
  const t = texts(props(st, { ...base(), view: "holds" })); assert.ok(t.includes(Sg.limit), "the honest limit, one line"); assert.ok(t.includes(Sg.title));
});

test("3. green on a row is what that pair row's pod page says: the same landOf, for every pair row", () => {
  const st = world(), kind = kindOf(st), b = B.boardOf(st, kind), fr = frameOf(kind), tr = (id) => allTraits(fr).find((t) => t.id === id);
  const pairRows = b.rows.filter((r) => r.kind === "pair"); assert.equal(pairRows.length, 3);
  for (const row of pairRows) {
    const [x, y] = row.parents.map((q) => S.mibiById(st, q.id)), land = S.landOf(st, x, y);
    for (const [trait, L] of [["body-hue", land.tint], ["body-value", land.shade]]) { if (!L) continue;
      const [a, c] = L.range.map((v) => scaleAt(fr, tr(trait), v)).sort((p, q) => p - q), g = b.flat.find((r) => r.id === trait).green;
      assert.ok(g.some(([lo, hi]) => lo <= a + 1e-6 && hi >= c - 1e-6), `${row.title} ${trait} [${a}, ${c}] is inside the board's green ${JSON.stringify(g)}`); }
    const all = S.landAllOf(st, x, y); for (const [id, set] of Object.entries(all.sets)) { const r = b.flat.find((q) => q.id === id); for (const l of set) assert.ok(r.green.includes(r.looks.indexOf(l)), `${id}: ${l} can land`); }
  }
  // one pair alone: green is exactly its own land
  const one = world({ wild: 0, pairs: [[0, 1, 2]] }), b1 = B.boardOf(one, kindOf(one)), [x, y] = [0, 1].map((i) => one.mibis[i]), L = S.landOf(one, x, y).tint;
  assert.deepEqual(b1.flat.find((r) => r.id === "body-hue").green, [L.range.map((v) => scaleAt(fr, tr("body-hue"), v)).sort((p, q) => p - q)]);
});

test("a pair whose parent is gone keeps what its row already says", () => {
  const st = world({ wild: 0, pairs: [[0, 1, 2]] }), row = N.shelfRows(st)[0]; st.mibis[0].released = true;
  const b = B.boardOf(st, kindOf(st)), r2 = N.shelfRows(st)[0]; assert.ok(r2.words.length);
  for (const w of r2.words) { const r = b.flat.find((q) => q.id === w.trait); assert.ok(r.shape === "set" ? r.green.includes(r.looks.indexOf(w.word)) : r.green.length > 0, "its words are green: " + w.word); }
  void row;
});

test("4. dashed white on a row is the found row's 'seen from afar' words on the shelf", () => {
  const st = world(), b = B.boardOf(st, kindOf(st)), found = b.rows.filter((r) => r.kind !== "pair"); assert.ok(found.length);
  for (const row of found) for (const w of row.words) { const r = b.flat.find((q) => q.id === w.trait);
    if (r.shape === "set") assert.ok(r.seen.includes(r.looks.indexOf(w.word)), `${w.trait}: seen ${w.word}`); else assert.ok(r.seen.some(([lo, hi]) => (w.at === 0 ? lo <= B.END : hi >= 1 - B.END)), `${w.trait}: seen near an end`); }
});

test("5. the gold dot and the top strip list exactly the looks no living Loika shows that some pod can bring", () => {
  for (const o of [{}, { loikas: 3, wild: 0 }]) {
    const st = world(o), kind = kindOf(st), b = B.boardOf(st, kind), fr = frameOf(kind);
    const want = new Set();   // set looks: reached by a pod (green or seen), shown by none of the living
    for (const t of allTraits(fr).filter((x) => shapeOf(fr, x) === "set")) {
      const r = b.flat.find((q) => q.id === t.id), reach = new Set([...r.green, ...r.seen]);
      for (const i of reach) if (!r.yours.includes(i)) want.add(t.id + ":" + r.looks[i]);
    }
    assert.deepEqual(new Set(b.strip.filter((s) => s.shape === "set").map((s) => s.trait + ":" + s.word)), want);
    for (const r of b.flat) assert.equal(r.gold, r.news.length > 0); assert.deepEqual(Object.keys(b.byTrait).sort(), b.flat.filter((r) => r.gold).map((r) => r.id).sort());
    for (const s of b.strip) assert.ok(s.pods > 0 && s.keys.length > 0);
  }
  const none = world({ wild: 0, pairs: [[0, 1, 2]], loikas: 3 }); none.mibis.forEach((m) => { m.released = true; });
  const bn = B.boardOf(none, kindOf(none)); assert.ok(bn.flat.every((r) => r.yours.length === 0), "no Loika: every row's dots are empty"); assert.ok(bn.strip.length > 0, "the strip lists every look the pods bring");
});

test("6. ✓ on a row shows only the rows that could bring that look; ← returns to the board on the same row", () => {
  const st = world(), kind = kindOf(st), b = B.boardOf(st, kind), u = base({ ring: { z: "shelf", i: 1 } }), h = host(st, u);
  researchKey(h); const i = b.flat.findIndex((r) => r.gold); assert.ok(i >= 0);
  for (let k = 0; k < i; k++) intent(h, null, "step:down");   // the pad walks the rows (a column at a time)
  const at = u.hold.i, row = b.flat[at]; let guard = 0; while (!row.gold && guard++ < 40) intent(h, null, "step:down");
  const gold = b.flat.findIndex((r) => r.gold); u.hold = { i: gold }; intent(h, null, "confirm");
  assert.equal(u.view, "nursery"); const news = b.byTrait[b.flat[gold].id], shown = N.shelfRows(st, "newest", u.only.keys);
  assert.deepEqual(shown.map((r) => r.key).sort(), [...news.keys].sort()); assert.ok(shown.length <= N.shelfRows(st).length);
  const t = texts(props(st, u)); assert.ok(t.includes(fillOnly(b.flat[gold].name)), "the shelf says it is filtered: " + t.join(" | "));
  intent(h, null, "back"); assert.equal(u.view, "holds"); assert.equal(u.hold.i, gold, "← returns to the board on the same row"); assert.deepEqual(u.ring, { z: "shelf", i: 1 }, "and the shelf's ring is put back");
  const none = b.flat.findIndex((r) => !r.gold); if (none >= 0) { u.hold = { i: none }; intent(h, null, "confirm"); assert.equal(u.view, "holds", "a row nothing new on it opens nothing"); }
});
const fillOnly = (name) => Sg.only.replace("{trait}", name.toLowerCase());

test("7. a pod is never read: the board does not move when a pod's hidden genome does", () => {
  const st = world(), kind = kindOf(st), before = JSON.stringify(B.boardOf(st, kind));
  for (const p of st.tray) if (!p.parents) { const l = p.genome.loci; for (const id of Object.keys(l)) l[id] = [...l[id]].reverse(); }   // the same copies in the other order: nothing a pod says changes
  assert.equal(JSON.stringify(B.boardOf(st, kind)), before);
  for (const p of st.tray) if (p.parents) p.genome = structuredClone(st.tray.find((q) => !q.parents).genome);   // a pair's pod carries something else: its row still says only its parents' green
  assert.equal(JSON.stringify(B.boardOf(st, kind).flat.map((r) => [r.id, r.green])), JSON.stringify(JSON.parse(before).flat.map((r) => [r.id, r.green])));
});

test("with no pods the board says so in one line; with no mibi and no pod it says that", () => {
  const st = world({ wild: 0, pairs: [] }); assert.equal(st.tray.length, 0);
  const t = texts(props(st, { ...base(), view: "holds" })); assert.ok(t.includes(Sg.none), t.join(" | "));
  const e = S.freshSt("w1", 3, T0); S.normalize(e, T0); assert.ok(texts(props(e, { ...base(), view: "holds" })).includes(Sg.noKind));
});
