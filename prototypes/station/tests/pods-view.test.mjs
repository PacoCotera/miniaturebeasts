// The Pods view in Node: state and focus to props, with no canvas. Every species' frame, a pod of each unread, read in
// part and read whole; the props are plain JSON and carry what the layout spec says (the rail as many chapters as the
// species has, one word a tab, no status words, no digits on the page, the stamp cell by its rule, every picture at its size).
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { podsView, targetsOf, inWords } from "../src/views/pods.mjs";
import { nextFocus } from "../../ui/focus.mjs";
import { makeCtx } from "../../ui/context.mjs";
import { loadTypeNode } from "../../ui/type-node.mjs";
import { slantTabs } from "../../ui/layout.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const spec = JSON.parse(readFileSync(path.join(here, "../../ui/specs/station/pods.json"), "utf8")), frameSpec = JSON.parse(readFileSync(path.join(here, "../../ui/specs/station/frame.json"), "utf8"));
const ctx = makeCtx(frameSpec, loadTypeNode()), settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const SPECIES = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => f.slice(8, 11));

function stock(ids, gs = 3) {
  const st = S.freshSt("w1", 1, 1000); S.normalize(st);
  for (const id of ids) { const fr = frameOf(id); S.seedPodFromGenome(st, podGenome(fr, gs), settings, 1000); }
  return st;
}
const model = (st, over = {}) => ({ st, settings, docked: true, ui: { view: "overview", cur: st.tray[0]?.id ?? null, ci: 0, cmp: null, wildArm: 0, ...(over.ui || {}) }, focus: "pod", present: {}, ...over, ui: { view: "overview", cur: st.tray[0]?.id ?? null, ci: 0, cmp: null, wildArm: 0, ...(over.ui || {}) } });
const collection = (st, over = {}) => model(st, { focus: "place.0", ...over, ui: { view: "collection", ...(over.ui || {}) } });
const chapter = (st, ci, over = {}) => model(st, { focus: "rail." + ci, ...over, ui: { view: "chapter", ci, ...(over.ui || {}) } });
const OV = spec.regions.overview, CH = spec.regions.chapter;
const view = (m) => podsView(m, spec, ctx);

test("an empty rack: the collection of six empty places and nothing else on the stage", () => {
  const v = view(model(S.freshSt("w1", 1, 1000)));
  assert.equal(v.mode, "collection"); assert.equal(v.empty, true); assert.equal(v.specimen, null); assert.equal(v.rail, null); assert.equal(v.page, null); assert.equal(v.stamp, null);
  const empty = S.freshSt("w1", 1, 1000);
  assert.equal(v.line.subject, "the rack is empty"); assert.equal(v.line.need, spec.strings.explore);   // docked, the bay empty
  assert.equal(view(model(empty, { crates: 2 })).line.need, "open the crates first");   // docked, crates in the bay
  assert.equal(view(model(empty, { docked: false })).line.need, "dock the Companion for its crates");
  assert.equal(v.list.places.length, 6); assert.ok(v.list.places.every((w) => w.empty && !w.pod)); assert.equal(v.list.waiting, null);
  assert.deepEqual(v.targets, []);
});

test("an unidentified pod: the sealed pod, 'Unknown', its origin, no rail, no page, no stamp; ✓ Identify", () => {
  const st = stock(["S01"]), v = view(model(st));
  assert.equal(v.specimen.name, "Unknown"); assert.ok(v.specimen.pod.sealed && !v.specimen.pod.identified);
  assert.equal(v.mode, "overview"); assert.equal(v.rail, null); assert.equal(v.page, null); assert.equal(v.stamp, null); assert.deepEqual(v.kin, []); assert.equal(v.specimen.who.length, 2, "the two frosted marks");
  assert.ok(/^mibi-halo-empty-128x160:/.test(v.specimen.figure), "the figure is the empty halo before Identify");
  assert.equal(v.line.ok, "Identify"); assert.equal(v.line.price, ""); assert.equal(v.line.back, "Pods");   // free is not shown
  assert.ok(v.specimen.origin.length >= 1 && v.specimen.origin.length <= 2);
  const sealedPic = v.requests.find((r) => r.kind === "pod" && r.id.endsWith(":s:" + v.specimen.pod.size.join("x")));
  assert.ok(sealedPic && sealedPic.species === null, "the species stays unknown before Identify");
});

test("the pod is sized by its size class and bottom-centred on its axis, its foot on the spec's feet line", () => {
  for (const id of SPECIES) {
    const st = stock([id]); S.identify(st, st.tray[0], settings); const v = view(model(st)), fr = frameOf(id), [w, h] = spec.classes.pod[fr.pod.sizeClass];
    assert.deepEqual(v.specimen.pod.size, [w, h], id); assert.deepEqual(v.box, [OV.pod.axis - Math.round(w / 2), OV.pod.feet - h, w, h], id);
    const c = view(chapter(st, 0)); assert.deepEqual(c.box, [CH.pod.axis - Math.round(w / 2), CH.pod.feet - h, w, h], id + " on the chapter page");
  }
  assert.deepEqual(spec.classes.pod.large, OV.pod.rect.slice(2), "the large class is the pod's box");
});

test("every species: the rail shows all its chapters, one word each, no status words; the stamp label's cell follows its rule", () => {
  for (const id of SPECIES) {
    const st = stock([id]), p = st.tray[0]; S.skipIdentify(st, p); const v = view(model(st)), fr = frameOf(id);
    assert.equal(v.rail.tabs.length, fr.chapters.length, id + " rail tabs against the frame");
    assert.ok(fr.chapters.length <= 12);
    for (const t of v.rail.tabs) { assert.ok(t.word === "Legs & Tail" || !/\s/.test(t.word), `${id}: "${t.word}" is one word (the one decided exception is "Legs & Tail")`); assert.ok(!/read|sealed|cleared|misty|◆|\d/i.test(t.word)); assert.equal(t.pips, Math.min(6, fr.chapters.find((c) => c.id === t.id).traits.length)); assert.equal(t.filled, 0); }
    if (fr.chapters.some((c) => c.id === "legs-tail")) assert.ok(v.rail.tabs.some((t) => t.word === "Legs & Tail"));
    const placed = slantTabs(frameSpec.regions.rail, fr.chapters.length, -1); assert.equal(placed.tabs.length, fr.chapters.length); assert.ok(!placed.overflow); assert.equal(v.rail.open, -1, "no tab open on the overview");
    assert.equal(v.requests.find((r) => r.kind === "stamp").size, v.stamp.size);
  }
});

test("the stamp: cell = floor(104 / (N + 2)), at least 2, the label 120 and the stamp inside it", () => {
  for (const id of SPECIES) {
    const st = stock([id]); S.skipIdentify(st, st.tray[0]); const v = view(model(st)), sz = v.stamp.size;
    assert.ok(sz <= 104, `${id}: the stamp is ${sz} px, at most 104`); assert.ok(sz >= 17 * 2, id);
    assert.ok(v.stamp.size + 2 * 8 <= OV.stamp.rect[2], "on the 120 label");
  }
});

test("a read pod: the page by trait count, every picture at its grid size, no digits, frost for unread, marks from the traits", () => {
  for (const id of SPECIES) {
    const st = stock([id], 11), p = st.tray[0]; S.skipRead(st, p, settings);
    const fr = frameOf(id);
    for (let ci = 0; ci < fr.chapters.length; ci++) {
      const v = view(chapter(st, ci)), ch = fr.chapters[ci], page = v.page, sealed = ch.sealed && !settings.sealedOpen;
      assert.equal(v.mode, "chapter"); assert.equal(page.count, sealed ? 1 : Math.min(8, ch.traits.length), `${id} ${ch.id}`); assert.equal(page.overflow, false);
      if (sealed) { assert.deepEqual(page.cells, [], "a shut chapter has no cells"); assert.ok(page.sealedFind, "the find that opens it"); const kind = ch.findKind ?? null; if (kind) assert.match(page.sealedPicture, new RegExp(`^find-${kind}-112x112:112x112$`), "the find picture by the chapter's kind"); else assert.equal(page.sealedPicture, null, "no kind, the flat cell alone"); }
      assert.equal(page.cells.length, sealed ? 0 : page.count);
      for (const c of page.cells) {
        assert.ok(!/\d/.test(c.name + c.lines.join(" ")), `${id} ${ch.id}: digits on the page: ${c.name} ${c.lines}`);
        assert.ok(!c.frost && !c.picture && !c.frame, "an open cell: no card and no frame"); assert.equal(c.lines.length, 1);
        assert.ok(!v.requests.some((r) => /standin|picture-frame/.test(r.id) && r.kind === "slot" && r.size?.join("x") === "128x160"), "no stand-in card and no frame is asked for"); for (const g of c.glyphs) assert.equal(v.requests.find((r) => r.id === g.asset)?.kind, "slot", "a line glyph is the studio's, by id");
      }
      const sizes = new Set(page.cells.filter((c) => c.picture).map((c) => c.picture.split(":").at(-1)));
      assert.ok(sizes.size <= 1, "one picture size on a page: " + [...sizes]);
      if (sizes.size) assert.ok(Object.values(CH.page.grid).map((g) => g.picture.join("x")).includes([...sizes][0]), "a picture size from the spec's grid table: " + [...sizes][0]);
      assert.equal(v.rail.tabs[ci].state, sealed ? "sealed" : "read");
    }
    // unread: the frost and the name, no line, no picture
    const st2 = stock([id], 11); S.skipIdentify(st2, st2.tray[0]); const ui = fr.chapters.findIndex((c) => !c.sealed), u = view(chapter(st2, ui)); assert.ok(u.page.cells.length && u.page.cells.every((c) => c.frost && !c.picture && c.lines.length === 0));
    assert.ok(!u.requests.some((r) => r.kind === "trait"), "the build asks for no close-up of an unread trait");
  }
});

test("the props are plain JSON; every picture asked for is registered once at one size", () => {
  const st = stock(["S01", "S03"], 5); S.skipRead(st, st.tray[0], settings); S.skipIdentify(st, st.tray[1]);
  const v = view(model(st)), back = JSON.parse(JSON.stringify(v)); assert.deepEqual(back, v);
  const sizes = new Map(); for (const r of v.requests) { const sz = Array.isArray(r.size) ? r.size.join("x") : r.w && r.h ? r.w + "x" + r.h : null; if (sizes.has(r.id) && sz) assert.equal(sizes.get(r.id), sz, "one id, one size: " + r.id); if (sz) sizes.set(r.id, sz); }
  const v2 = view(chapter(st, 0)); assert.ok(v2.requests.every((r) => !/standin|picture-frame/.test(r.id)) && v2.requests.some((r) => r.kind === "emblem" && r.id.endsWith(":24")));
});

test("the bottom line: the one action and its price as a number and an icon (no 'free', no 'half'), strings as decided", () => {
  const st = stock(["S01"], 3), p = st.tray[0], m = (f, extra = {}) => model(st, { focus: f, ...extra }), c = (f, ci) => chapter(st, ci, { focus: f });
  S.skipIdentify(st, p); st.d = 10;
  assert.equal(view(m("pod")).line.ok, "Open Coat", "✓ on an unread pod opens its first unread chapter, and the line says so"); assert.equal(view(m("rail.0")).line.ok, "Open Coat", "on the overview a tab opens its page"); assert.ok(!view(m("rail.0")).line.price);
  assert.equal(view(c("rail.0", 0)).line.ok, "Read Coat");
  st.readEver = true; assert.equal(view(c("rail.0", 0)).line.price, "◆ 1");
  st.readOnce.S01 = ["face"]; st.d = 10; assert.equal(view(c("rail.1", 1)).line.price, "◆ 1");   // a half price is the lower number, with no word
  S.read(st, p, "coat", settings); assert.equal(view(c("rail.0", 0)).line.ok, undefined); assert.equal(view(c("rail.0", 0)).line.subject, "Coat is read");
  assert.equal(view(c("rail.0", 0)).line.back, "Loika", "on the page ← names the pod it returns to");
  assert.equal(view(m("pod")).line.ok, "Shape a founder");
  assert.equal(view(m("hatch", { ui: { wildArm: 0 } })).line.ok, "Return to the wild");
  assert.equal(view(m("hatch", { ui: { wildArm: 1 } })).line.ok, "Again: return it");
  assert.equal(view(m("hatch")).line.price, "❀ +1");
});

test("the focus graph over the targets: the collection's grid; the overview's pod, rail, kin and hatch; the page's rail", () => {
  const st = stock(["S01", "S01", "S03"], 9); for (const q of st.tray) S.skipIdentify(st, q);
  const A = view(collection(st)), places = A.targets.map((t) => t.id); assert.deepEqual(places, ["place.0", "place.1", "place.2"]);
  assert.equal(nextFocus(spec.focus.collection, A.targets, "place.0", "right"), "place.1"); assert.equal(nextFocus(spec.focus.collection, A.targets, "place.2", "right"), "place.2");
  for (const t of A.targets) assert.deepEqual(t.rect, [16 + 336 * +t.id.slice(6), 48, 320, 224]);
  const v = view(model(st)), g = spec.focus.overview, T = v.targets, ids = T.map((t) => t.id);
  assert.deepEqual(ids.filter((i) => !i.startsWith("rail")), ["pod", "kin.0", "hatch"], "the other S01 pod is the one kin"); assert.equal(ids.filter((i) => i.startsWith("rail")).length, frameOf("S01").chapters.length);
  const resolve = (sel) => (sel === "rail.last" ? "rail.1" : sel === "kin.first" ? "kin.0" : null);
  assert.equal(nextFocus(g, T, "pod", "up", resolve), "rail.1"); assert.equal(nextFocus(g, T, "pod", "right", resolve), "kin.0"); assert.equal(nextFocus(g, T, "pod", "left", resolve), "pod"); assert.equal(nextFocus(g, T, "pod", "down", resolve), "pod");
  assert.equal(nextFocus(g, T, "kin.0", "down", resolve), "hatch"); assert.equal(nextFocus(g, T, "hatch", "up", resolve), "kin.0"); assert.equal(nextFocus(g, T, "hatch", "left", resolve), "pod"); assert.equal(nextFocus(g, T, "kin.0", "up", resolve), "rail.1");
  assert.equal(nextFocus(g, T, "rail.1", "right", resolve), "rail.2"); assert.equal(nextFocus(g, T, "rail.1", "down", resolve), "pod");
  const C = view(chapter(st, 1)); assert.deepEqual(C.targets.map((t) => t.id), ids.filter((i) => i.startsWith("rail")), "only the rail on the page");
  assert.equal(nextFocus(spec.focus.chapter, C.targets, "rail.1", "right"), "rail.2"); assert.equal(nextFocus(spec.focus.chapter, C.targets, "rail.1", "down"), "rail.1");
  for (const t of [...T, ...A.targets]) assert.ok(t.rect.every((n) => Number.isInteger(n)));
});

test("Compare: two pages at the spec's rectangles with their pods at 40×48, the traits that differ marked, the rail kept", () => {
  const st = stock(["S01", "S01"], 21); st.tray[1].genome = podGenome(frameOf("S01"), 77); for (const q of st.tray) S.skipRead(st, q, settings);
  const v = view(model(st, { ui: { view: "overview", cur: st.tray[0].id, ci: 0, cmp: { a: st.tray[0].id, b: st.tray[1].id, ci: 1 }, wildArm: 0 }, focus: null }));
  assert.equal(v.mode, "compare"); assert.equal(v.pages.length, 2); assert.equal(v.rail.tabs.length, frameOf("S01").chapters.length); assert.equal(v.rail.current, 1);
  assert.match(v.line.subject, /^two Loika pods$/);
  const pods = v.requests.filter((r) => r.kind === "pod" && r.size.join("x") === "40x48"); assert.ok(pods.length >= 2);
  const diff = S.compareDiff(st, st.tray[0], st.tray[1]), traits = frameOf("S01").chapters[1].traits;
  assert.deepEqual(v.pages[0].cells.map((c) => c.diff), traits.map((t) => diff.includes(t.id))); assert.deepEqual(v.pages[1].cells.map((c) => c.diff), v.pages[0].cells.map((c) => c.diff));
});

test("no digits where a word does: the origin drops the expedition's number, a place's subject its number, the shared need line is said in words", () => {
  const st = stock(["S01"], 11); st.tray[0].n = 7; S.skipIdentify(st, st.tray[0]);
  const v = view(model(st)), c = view(collection(st));
  assert.ok(v.specimen.origin.every((l) => !/\d/.test(l)), v.specimen.origin.join("|")); assert.ok(!/\d/.test(c.line.subject), c.line.subject); assert.ok(c.list.places.every((w) => !/\d/.test(w.name || "")));
  assert.equal(inWords("3 new pods wait"), "three new pods wait"); assert.equal(inWords("2 crates in the bay"), "two crates in the bay"); assert.equal(inWords("a Belatz pod waits for ◆ 3 more"), "a Belatz pod waits for ◆ 3 more"); assert.equal(inWords("14 pods wait"), "many pods wait");
});
test("Compare's need line follows the spec's strings: here, in another chapter, or none; the Differs mark is the studio's, by id, on the traits read on both that differ", () => {
  const st = stock(["S01", "S01"], 11); S.skipRead(st, st.tray[0], settings); S.skipRead(st, st.tray[1], settings);
  const A = st.tray[0], B = st.tray[1], diff = S.compareDiff(st, A, B), chs = frameOf("S01").chapters;
  const at = (ci) => view(model(st, { ui: { view: "overview", cur: A.id, ci: 0, cmp: { a: A.id, b: B.id, ci }, wildArm: 0 }, focus: null }));
  for (let ci = 0; ci < chs.length; ci++) {
    const v = at(ci); assert.equal(v.line.need, !diff.length ? spec.strings.compareSame : chs[ci].traits.some((t) => diff.includes(t.id)) ? spec.strings.compareHere : spec.strings.compareElsewhere);
    const marked = v.pages[0].cells.filter((c) => c.diff).length; assert.equal(marked, chs[ci].traits.filter((t) => diff.includes(t.id)).length, "a mark on each trait that differs");
    assert.match(v.pages[0].differs, /^frame-lamp-12-amber:12x12$/, "the slot by the studio's id"); assert.equal(v.pages[1].differs, v.pages[0].differs, "the same mark on both pages");
  }
});

test("the hatch's arming plate says only \"✓ again\": the bottom line already names the place", () => {
  assert.equal(spec.strings.hatchAgain, "✓ again"); assert.ok(spec.strings.hatchAgain.split(" ").length <= 6);
});

test("the bottom line's subjects: a sealed tab's \"<chapter> is sealed\", the hatch's \"Back to the <place>\"", () => {
  const st = stock(["S02"], 11), p = st.tray[0]; S.skipRead(st, p, settings);
  const fr = frameOf("S02"), ci = fr.chapters.findIndex((c) => c.sealed);
  assert.equal(view(chapter(st, ci)).line.subject, fr.chapters[ci].name + " is sealed");
  assert.equal(view(model(st, { focus: "hatch" })).line.subject, "Back to the " + S.PLACE_WORD[p.g]);
});

test("the bottom line's three slots follow the Words on Pods table: groups without dots, a short sentence in the centre, one amber sentence of six words or fewer on the right", () => {
  const words = (t) => t.trim().split(/\s+/).length;
  for (const id of SPECIES) {
    const st = stock([id], 7), p = st.tray[0], base = { ui: { cur: p.id, ci: 0, cmp: null, wildArm: 0 } };
    const check = (what, l) => {
      for (const k of ["ok", "price", "back", "subject", "need"]) if (l[k]) assert.ok(!/·/.test(l[k]), `${id} ${what}: no "·" in ${k}: ${l[k]}`);
      if (l.subject) assert.ok(l.subject.length <= 24 || /…$/.test(l.subject), `${id} ${what}: the subject fits 24 characters: ${l.subject}`);
      if (l.need) assert.ok(words(l.need) <= 6, `${id} ${what}: the need is six words or fewer: ${l.need}`);
      assert.ok(!/free|half/.test(l.price || ""), `${id} ${what}: no free or half`);
    };
    check("unidentified", view(model(st, base)).line);
    S.skipIdentify(st, p); st.d = 20; st.e = 20;
    for (const f of ["pod", "rail.0", "rail.1", "hatch"]) check(f, view(model(st, { ...base, focus: f })).line);
    check("place", view(collection(st, base)).line); check("page", view(chapter(st, 0, base)).line);
  }
  const st = stock(["S01"], 3), p = st.tray[0], line = (f) => view(model(st, { focus: f })).line;
  assert.equal(line("pod").subject, "sealed until identified");
  S.skipIdentify(st, p); assert.equal(line("pod").subject, S.spName(p) + " is unread");
  st.d = 10; S.read(st, p, "coat", settings); assert.equal(line("pod").subject, S.spName(p) + " is partly read");
  const onPage = (f) => view(chapter(st, +f.slice(5))).line;
  st.d = 0; st.readEver = true; assert.equal(onPage("rail.1").need, "needs more ◆"); assert.equal(onPage("rail.1").dim, true);
});
