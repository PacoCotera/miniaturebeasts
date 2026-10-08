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
import { railTabs } from "../../ui/layout.mjs";

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
const model = (st, over = {}) => ({ st, settings, docked: true, ui: { cur: st.tray[0]?.id ?? null, anchor: null, ci: 0, cmp: null, wildArm: 0 }, focus: "pod", present: {}, ...over });
const view = (m) => podsView(m, spec, ctx);

test("an empty rack: the empty cradle under the beam and nothing else on the stage", () => {
  const v = view(model(S.freshSt("w1", 1, 1000)));
  assert.equal(v.empty, true); assert.equal(v.specimen.pod, null); assert.equal(v.rail, null); assert.equal(v.page, null); assert.equal(v.stamp, null);
  const empty = S.freshSt("w1", 1, 1000);
  assert.equal(v.line.subject, "the rack is empty"); assert.equal(v.line.need, spec.strings.explore);   // docked, the bay empty
  assert.equal(view(model(empty, { crates: 2 })).line.need, "open the bay at Home");   // docked, crates in the bay
  assert.equal(view(model(empty, { docked: false })).line.need, "dock the Companion for its crates");
  assert.equal(v.list.wells.length, 6); assert.ok(v.list.wells.every((w) => w.pod === null));
  assert.deepEqual(v.targets, []);
});

test("an unidentified pod: the sealed pod, 'Unknown', its origin, no rail, no page, no stamp; ✓ Identify", () => {
  const st = stock(["S01"]), v = view(model(st));
  assert.equal(v.specimen.name, "Unknown"); assert.ok(v.specimen.pod.sealed && !v.specimen.pod.identified);
  assert.equal(v.rail, null); assert.equal(v.page, null); assert.equal(v.stamp, null);
  assert.equal(v.line.ok, "Identify"); assert.equal(v.line.price, "free");
  assert.ok(v.specimen.origin.length >= 1 && v.specimen.origin.length <= 2);
  const sealedPic = v.requests.find((r) => r.kind === "pod" && r.id.endsWith(":s:" + v.specimen.pod.size.join("x")));
  assert.ok(sealedPic && sealedPic.species === null, "the species stays unknown before Identify");
});

test("the pod is sized by its size class and bottom-centred on (344, 312)", () => {
  for (const id of SPECIES) {
    const st = stock([id]); S.identify(st, st.tray[0], settings); const v = view(model(st)), fr = frameOf(id), [w, h] = spec.classes.pod[fr.pod.sizeClass];
    assert.deepEqual(v.specimen.pod.size, [w, h], id); assert.deepEqual(v.box, [344 - Math.round(w / 2), 312 - h, w, h], id);
  }
  assert.deepEqual(spec.classes.pod.large, [160, 192]);
});

test("every species: the rail shows all its chapters, one word each, no status words; the stamp label's cell follows its rule", () => {
  for (const id of SPECIES) {
    const st = stock([id]), p = st.tray[0]; S.skipIdentify(st, p); const v = view(model(st)), fr = frameOf(id);
    assert.equal(v.rail.tabs.length, fr.chapters.length, id + " rail tabs against the frame");
    assert.ok(fr.chapters.length <= 12);
    for (const t of v.rail.tabs) { assert.ok(t.word === "Legs & tail" || !/\s/.test(t.word), `${id}: "${t.word}" is one word (the one decided exception is "Legs & tail")`); assert.ok(!/read|sealed|cleared|misty|◆|\d/i.test(t.word)); assert.equal(t.pips, Math.min(6, fr.chapters.find((c) => c.id === t.id).traits.length)); assert.equal(t.filled, 0); }
    if (fr.chapters.some((c) => c.id === "legs-tail")) assert.ok(v.rail.tabs.some((t) => t.word === "Legs & tail"));
    const placed = railTabs(spec.regions.rail, fr.chapters.length); assert.equal(placed.tabs.length, fr.chapters.length); assert.ok(!placed.overflow);
    assert.equal(v.requests.find((r) => r.kind === "stamp").size, v.stamp.size);
  }
});

test("the stamp: cell = floor(104 / (N + 2)), at least 2, the label 120 and the stamp inside it", () => {
  for (const id of SPECIES) {
    const st = stock([id]); S.skipIdentify(st, st.tray[0]); const v = view(model(st)), sz = v.stamp.size;
    assert.ok(sz <= 104, `${id}: the stamp is ${sz} px, at most 104`); assert.ok(sz >= 17 * 2, id);
    assert.ok(v.stamp.size + 2 * 8 <= spec.regions.stamp.rect[2], "on the 120 label");
  }
});

test("a read pod: the page by trait count, every picture at its grid size, no digits, frost for unread, marks from the traits", () => {
  for (const id of SPECIES) {
    const st = stock([id], 11), p = st.tray[0]; S.skipRead(st, p, settings);
    const fr = frameOf(id);
    for (let ci = 0; ci < fr.chapters.length; ci++) {
      const v = view(model(st, { ui: { cur: p.id, anchor: null, ci, cmp: null, wildArm: 0 }, focus: "rail." + ci })), ch = fr.chapters[ci], page = v.page;
      assert.equal(page.cells.length, Math.min(6, ch.traits.length), `${id} ${ch.id}`); assert.equal(page.overflow, false);
      const sealed = ch.sealed && !settings.sealedOpen;
      for (const c of page.cells) {
        assert.ok(!/\d/.test(c.name + c.lines.join(" ")), `${id} ${ch.id}: digits on the page: ${c.name} ${c.lines}`);
        if (sealed) { assert.ok(c.sealed && c.seals && !c.picture); continue; }
        assert.ok(c.picture && !c.frost); assert.equal(c.lines.length, 1);
        const pic = v.requests.find((r) => r.id === c.picture); assert.ok(pic && pic.w > 0 && pic.h > 0);
      }
      const sizes = new Set(page.cells.filter((c) => c.picture).map((c) => c.picture.split(":").at(-1)));
      assert.ok(sizes.size <= 1, "one picture size on a page: " + [...sizes]);
      if (sizes.size) assert.ok(["448x312", "216x304", "216x112", "144x112"].includes([...sizes][0]), [...sizes][0]);
      assert.equal(v.rail.tabs[ci].state, sealed ? "sealed" : "read");
    }
    // unread: the frost and the name, no line, no picture
    const st2 = stock([id], 11); S.skipIdentify(st2, st2.tray[0]); const u = view(model(st2)); assert.ok(u.page.cells.every((c) => (c.frost || c.sealed) && !c.picture && c.lines.length === 0));
  }
});

test("the props are plain JSON; every picture asked for is registered once at one size", () => {
  const st = stock(["S01", "S03"], 5); S.skipRead(st, st.tray[0], settings); S.skipIdentify(st, st.tray[1]);
  const v = view(model(st)), back = JSON.parse(JSON.stringify(v)); assert.deepEqual(back, v);
  const sizes = new Map(); for (const r of v.requests) { const sz = Array.isArray(r.size) ? r.size.join("x") : r.w && r.h ? r.w + "x" + r.h : null; if (sizes.has(r.id) && sz) assert.equal(sizes.get(r.id), sz, "one id, one size: " + r.id); if (sz) sizes.set(r.id, sz); }
  assert.ok(v.requests.some((r) => r.kind === "trait") && v.requests.some((r) => r.kind === "emblem" && r.id.endsWith(":24")));
});

test("the bottom line: the one action and its price, 'half' only on the line, strings as decided", () => {
  const st = stock(["S01"], 3), p = st.tray[0], m = (f, extra = {}) => model(st, { focus: f, ...extra });
  S.skipIdentify(st, p); st.d = 10;
  assert.equal(view(m("pod")).line.ok, "Read its chapters"); assert.equal(view(m("rail.0")).line.ok, "Read Coat");
  st.readEver = true; assert.equal(view(m("rail.0")).line.price, "1 ◆");
  st.readOnce.S01 = ["face"]; st.d = 10; assert.equal(view(m("rail.1")).line.price, "1 ◆ · half");
  S.read(st, p, "coat", settings); assert.equal(view(m("rail.0")).line.ok, undefined); assert.equal(view(m("rail.0")).line.subject, "Coat · read");
  assert.equal(view(m("pod")).line.ok, "Shape a founder");
  assert.equal(view(m("list.hatch", { ui: { cur: p.id, anchor: null, ci: 0, cmp: null, wildArm: 0 } })).line.ok, "Return to the wild");
  assert.equal(view(m("list.hatch", { ui: { cur: p.id, anchor: null, ci: 0, cmp: null, wildArm: 1 } })).line.ok, "Again: return it");
  assert.equal(view(m("list.hatch")).line.price, "+1 ❀");
});

test("the focus graph over the targets: ▲▼ through the wells and the hatch, → to the pod, ← back, ▲ to the last chapter, ▼ back", () => {
  const st = stock(["S01", "S01", "S03"], 9); for (const q of st.tray) S.skipIdentify(st, q);
  const v = view(model(st)), g = spec.focus, T = v.targets, ids = T.map((t) => t.id);
  assert.deepEqual(ids.filter((i) => i.startsWith("list")), ["list.0", "list.1", "list.2", "list.hatch"]); assert.equal(ids.filter((i) => i.startsWith("rail")).length, frameOf("S01").chapters.length);
  const resolve = (sel) => (sel === "list.current" ? "list.0" : sel === "rail.last" ? "rail.1" : null);
  assert.equal(nextFocus(g, T, "list.2", "down", resolve), "list.hatch"); assert.equal(nextFocus(g, T, "list.hatch", "down", resolve), "list.hatch");
  assert.equal(nextFocus(g, T, "list.1", "right", resolve), "pod"); assert.equal(nextFocus(g, T, "pod", "left", resolve), "list.0"); assert.equal(nextFocus(g, T, "pod", "up", resolve), "rail.1");
  assert.equal(nextFocus(g, T, "rail.1", "right", resolve), "rail.2"); assert.equal(nextFocus(g, T, "rail.1", "down", resolve), "pod"); assert.equal(nextFocus(g, T, "pod", "right", resolve), "pod");
  for (const t of T) assert.ok(t.rect.every((n) => Number.isInteger(n)));
});

test("Compare: two pages at the spec's rectangles with their pods at 32×40, the traits that differ marked, the rail kept", () => {
  const st = stock(["S01", "S01"], 21); st.tray[1].genome = podGenome(frameOf("S01"), 77); for (const q of st.tray) S.skipRead(st, q, settings);
  const v = view(model(st, { ui: { cur: st.tray[0].id, anchor: null, ci: 0, cmp: { a: st.tray[0].id, b: st.tray[1].id, ci: 1 }, wildArm: 0 }, focus: null }));
  assert.equal(v.mode, "compare"); assert.equal(v.pages.length, 2); assert.equal(v.rail.tabs.length, frameOf("S01").chapters.length); assert.equal(v.rail.current, 1);
  assert.match(v.line.subject, /^two Loika pods$/);
  const pods = v.requests.filter((r) => r.kind === "pod" && r.size.join("x") === "32x40"); assert.ok(pods.length >= 2);
  const diff = S.compareDiff(st, st.tray[0], st.tray[1]), traits = frameOf("S01").chapters[1].traits;
  assert.deepEqual(v.pages[0].cells.map((c) => c.diff), traits.map((t) => diff.includes(t.id))); assert.deepEqual(v.pages[1].cells.map((c) => c.diff), v.pages[0].cells.map((c) => c.diff));
});

test("no digits where a word does: the origin drops the expedition's number, a well's subject its number, the shared need line is said in words", () => {
  const st = stock(["S01"], 11); st.tray[0].n = 7; S.skipIdentify(st, st.tray[0]);
  const v = view(model(st, { focus: "list.0" }));
  assert.ok(v.specimen.origin.every((l) => !/\d/.test(l)), v.specimen.origin.join("|")); assert.ok(!/\d/.test(v.line.subject), v.line.subject);
  assert.equal(inWords("3 new pods wait"), "three new pods wait"); assert.equal(inWords("2 crates in the bay"), "two crates in the bay"); assert.equal(inWords("a Belatz pod waits · needs 3 ◆"), "a Belatz pod waits · needs 3 ◆"); assert.equal(inWords("14 pods wait"), "many pods wait");
});
test("Compare's need line follows the spec's strings: here, in another chapter, or none", () => {
  const st = stock(["S01", "S01"], 11); S.skipRead(st, st.tray[0], settings); S.skipRead(st, st.tray[1], settings);
  const A = st.tray[0], B = st.tray[1], diff = S.compareDiff(st, A, B), chs = frameOf("S01").chapters;
  const at = (ci) => view(model(st, { ui: { cur: A.id, anchor: null, ci: 0, cmp: { a: A.id, b: B.id, ci }, wildArm: 0 }, focus: null })).line.need;
  for (let ci = 0; ci < chs.length; ci++) assert.equal(at(ci), !diff.length ? spec.strings.compareSame : chs[ci].traits.some((t) => diff.includes(t.id)) ? spec.strings.compareHere : spec.strings.compareElsewhere);
});

test("the hatch's arming plate is six words or fewer for every place", () => {
  for (const p of Object.keys(spec.strings.hatchPlace)) assert.ok(spec.strings.hatchArm.replace("{place}", spec.strings.hatchPlace[p]).split(" ").length <= 6, p);
});

test("the bottom line's subjects: a sealed tab's \"<chapter> · sealed\", the hatch's \"the hatch · <pod name>\"", () => {
  const st = stock(["S02"], 11), p = st.tray[0]; S.skipRead(st, p, settings);
  const fr = frameOf("S02"), ci = fr.chapters.findIndex((c) => c.sealed);
  assert.equal(view(model(st, { ui: { cur: p.id, anchor: null, ci, cmp: null, wildArm: 0 }, focus: "rail." + ci })).line.subject, fr.chapters[ci].name + " · sealed");
  assert.equal(view(model(st, { focus: "list.hatch" })).line.subject, "the hatch · " + S.podName(p));
});
