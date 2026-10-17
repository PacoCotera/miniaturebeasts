// The decision panel (panel.json, frame.json regions.panel; specs/station-decision-panel-spec.md Part 1 and Part 3), in Node: its props (views/panel-props.mjs) validate against panel.props.json in both jump modes, name no rectangle, hold the
// spec's geometry and width limits (measured with the real metrics, with one, two and three cards), open on the first card that is neither dimmed nor a loss, dim a card that is short, and build the bottom line from the focused card (the line and
// the panel never disagree); its intents (intents/panel.mjs, create.mjs) open on ✓ Grow it, spend nothing on ←, a room key or a dimmed card, and land where the card said: both jump modes end to end.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { panelBuild, growCards, initialFocus } from "../src/views/panel-props.mjs";
import { INTENTS, dispatch } from "../src/intents/index.mjs";
import { createMeasure } from "../../ui/specs/measure.mjs";
import { validate } from "./habitat-props.test.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), panelSpec = J("panel.json"), frameSpec = J("frame.json"), podsSpec = J("pods.json"), createSpec = J("create.json"), schema = J("panel.props.json");
const measure = createMeasure(JSON.parse(readFileSync(path.resolve(here, "../../face/dist/metrics.json"), "utf8")));
const T0 = 1_000_000, settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, P = frameSpec.regions.panel;
const words = (t) => t.trim().split(/\s+/).filter(Boolean).length;

const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = st.d = st.s = 99; st.firstMibi = false; return st; };
function host(st, jump = "arrival") {
  const ui = { screen: "create", create: null, panel: null, arrival: null, home: { f: "room" }, pods: { view: "overview", cur: null, ci: 0, cmp: null, wildArm: 0, focusView: null, focus: { cur: null, set(v) { this.cur = v; } } }, inc: {}, cargo: {}, hab: {} };
  const h = { st, sv: { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [] }, settings: { ...settings, jump }, ui, specs: { frame: frameSpec, pods: podsSpec, create: createSpec, panel: panelSpec }, said: [], went: [], played: [], timers: [], saved: 0, moving: true, now: () => Date.now() };
  Object.assign(h, { motion: () => h.moving, say: (t, ms) => h.said.push([t, ms]), goto: (s) => { h.went.push(s); ui.screen = s; }, play: (e) => h.played.push(e), at: (ms, fn) => h.timers.push({ ms, fn }), save: () => { h.saved++; }, holding: () => false });
  return h;
}
function open(o = {}) {
  const st = world(), h = host(st, o.jump), id = "S01"; S.seedPodFromGenome(st, podGenome(frameOf(id), 3), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p);
  frameOf(id).chapters.slice(0, o.read ?? 2).forEach((c) => S.read(st, p, c.id, settings));
  for (let i = 0; i < (o.more ?? 0); i++) { S.seedPodFromGenome(st, podGenome(frameOf(id), 4 + i), settings, T0); S.skipIdentify(st, st.tray.at(-1)); }
  if (o.short) st.s = 1;
  h.ui.create = { podId: p.id, choices: {}, f: 1, clash: [], grown: null }; h.ui.pods.cur = p.id;
  return { st, h, p };
}
const view = (h) => panelBuild({ st: h.st, settings: h.settings, ui: h.ui, jump: h.settings.jump }, panelSpec, frameSpec, podsSpec);

test("the geometry and the width limits: a card is 776, 380 or 248 wide for one, two or three; a name, line and cost fit the card less 32, measured, in the budgets", () => {
  const w = (n) => (P.cards.width - P.cards.gap * (n - 1)) / n;
  assert.deepEqual([1, 2, 3].map(w), [776, 380, 248]); assert.deepEqual([1, 2, 3].map((n) => P.limits[n].card), [776, 380, 248]); assert.deepEqual([1, 2, 3].map((n) => P.limits[n].text), [744, 348, 216]);
  assert.deepEqual([1, 2, 3].map((n) => P.limits[n].picture), [[744, 160], [348, 160], [216, 160]]);
  assert.deepEqual([P.rect, P.title.rect, P.cards.y, P.cards.h, P.card.picture.floor], [[92, 80, 840, 440], [124, 96, 776, 36], 152, 288, 168]);
  const S0 = panelSpec.strings.grow;
  assert.ok(words(S0.title) <= 4 && measure(S0.title, 28) <= P.title.rect[2], S0.title);
  for (const [n, jump] of [[2, "arrival"], [3, "fork"]]) {
    const { h } = open({ jump }), cards = growCards({ st: h.st, settings: h.settings, ui: h.ui, jump }, panelSpec, frameSpec, []), limit = P.limits[n].text;
    assert.equal(cards.length, n);
    for (const c of cards) {
      assert.ok(words(c.name) <= 3 && measure(c.name, 20) <= limit, `${c.name} (${measure(c.name, 20)} px of ${limit})`);
      if (c.line) assert.ok(words(c.line) <= 6 && measure(c.line, 16) <= Math.min(limit, 208) && !/\d/.test(c.line), `${c.line} (${measure(c.line, 16)} px): ≤ 6 words, never a figure, and inside the bottom line's subject zone (208)`);
      assert.ok((c.cost.match(/[⚡❀◆⧗]/g) ?? []).length <= P.card.costs.groups, c.cost);
      assert.ok(c.pictureSize[0] <= P.limits[n].picture[0] && c.pictureSize[1] <= P.limits[n].picture[1], "the picture fits its slot, never scaled");
    }
  }
  // the one-chapter line names the chapter: the widest name of every species fits the subject zone
  let widest = 0; for (const id of ["S01", "S02", "S03", "S04", "S05", "S06", "S07", "S08", "S09", "S10", "S11", "S12", "S13", "S14", "S15", "S16"]) for (const c of frameOf(id)?.chapters ?? []) widest = Math.max(widest, measure(S0.cards.grow.line.one.replace("{Chapter}", c.name), 16));
  assert.ok(widest <= 208, widest + " px");
  assert.ok(measure("to " + panelSpec.strings.rooms.research, 16) <= 208 && measure(panelSpec.strings.arrival.text.replace("{Species}", "Untuva"), 16) <= P.rect[2]);
});
test("the props validate against panel.props.json in both modes, name no rectangle, and fit the budget", () => {
  for (const jump of ["arrival", "fork"]) for (const short of [false, true]) {
    const { h } = open({ jump, short }); h.ui.panel = { screen: "create", id: "grow", focus: "" }; const v = view(h), bad = validate(v.overlay, schema, schema);
    assert.deepEqual(bad, [], `${jump} ${short}: ${bad.slice(0, 3).join("; ")}`);
    const json = JSON.stringify(v.overlay); assert.ok(!/"(x|y|w|h|rect|at|size|box|pitch)"\s*:/.test(json), "props name what, never where"); assert.ok(json.length < 4096, json.length + " bytes");
    assert.deepEqual(v.overlay.focus.targets.map((t) => t.id), v.overlay.regions.cards.map((c) => "card." + c.id)); assert.equal(v.overlay.regions.cards.at(-1).id, "shape", "the way out is last");
  }
});
test("focus opens on the first card that is neither dimmed nor a loss, else the way out; a dimmed card can be focused and read; the bottom line is the focused card's", () => {
  const { h } = open({ jump: "fork" }); h.ui.panel = { screen: "create", id: "grow", focus: "" }; let v = view(h);
  assert.equal(v.overlay.focus.cur, "card.watch"); assert.deepEqual([v.line.ok, v.line.subject, v.line.back, v.line.price], ["Grow and watch", "watch it in the Incubator", "Back", "⚡ 2 ❀ 4 ⧗ 20"]);
  h.ui.panel.focus = "card.shape"; v = view(h); assert.deepEqual([v.line.ok, v.line.subject, v.line.back, "price" in v.line], ["Keep shaping", "", "Back", false], "the way out: no cost, no line, no destination");
  const s = open({ short: true }); s.h.ui.panel = { screen: "create", id: "grow", focus: "" }; v = view(s.h);
  assert.equal(v.overlay.regions.cards[0].dim, true); assert.equal(v.overlay.focus.cur, "card.shape", "every card but the way out is dimmed: the way out");
  s.h.ui.panel.focus = "card.grow"; v = view(s.h); assert.deepEqual([v.line.ok, v.line.dim, typeof v.line.short, v.line.need], ["Grow it", true, "string", "needs more ❀"], "a dimmed card can be focused and read: its short figure, its notice");
  assert.equal(initialFocus([{ id: "a", dim: true, loss: false }, { id: "b", dim: false, loss: true }, { id: "c", dim: false, loss: false }, { id: "d", dim: false, loss: false }]), "card.c");
  assert.equal(initialFocus([{ id: "a", dim: false, loss: true }, { id: "b", dim: true, loss: false }]), "card.b", "all dimmed or a loss: the way out");
  const dest = panelBuild({ st: h.st, settings: h.settings, ui: { ...h.ui, panel: { screen: "create", id: "grow", focus: "card.grow" } }, jump: "arrival" }, panelSpec, frameSpec, podsSpec);
  assert.equal(dest.line.subject, "chapters stay a surprise", "two chapters unread: the line is the card's"); assert.equal(dest.overlay.regions.cards[0].mark, frameSpec.regions.marks.room.research, "the destination mark is the title bar's");
});

test("✓ Grow it opens the panel and spends nothing; ←, a room key and a dimmed card spend nothing and the screen is as before", () => {
  const { st, h } = open(); const e0 = [st.e, st.d, st.s];
  INTENTS.create.intent(h, "roll", "confirm"); assert.equal(h.ui.panel.id, "grow"); assert.equal(h.ui.panel.focus, "card.grow"); assert.deepEqual([st.e, st.d, st.s], e0); assert.equal(st.bud, null);
  dispatch(h, { screen: "panel", target: "card.grow", verb: "back" }); assert.equal(h.ui.panel, null); assert.ok(h.ui.create && !h.ui.create.grown, "Create as before"); assert.deepEqual([st.e, st.d, st.s], e0);
  { const r = open(); INTENTS.create.intent(r.h, "roll", "confirm"); dispatch(r.h, { screen: "panel", target: "card.grow", verb: "room:research" }); assert.equal(r.h.ui.panel, null, "a room key closes it"); assert.equal(r.st.bud, null); }
  INTENTS.create.intent(h, "roll", "confirm"); dispatch(h, { screen: "panel", target: "card.shape", verb: "confirm" }); assert.equal(h.ui.panel, null, "Keep shaping closes it"); assert.equal(st.bud, null); assert.equal(h.saved, 0);
  const s = open({ short: true }); s.h.ui.panel = { screen: "create", id: "grow", focus: "card.grow" };
  dispatch(s.h, { screen: "panel", target: "card.grow", verb: "confirm" }); assert.ok(s.h.ui.panel, "a dimmed card does nothing"); assert.deepEqual(s.h.said.map((x) => x[0]), ["needs more ❀"]); assert.equal(s.st.bud, null);
});
test("the arrival mode end to end: ✓, ✓ Grow it, the event, the jump to the Incubator with the 2000 ms plate; ← returns to Pods, this pod's place, until another key; then ← is Home", () => {
  const { st, h, p } = open({ more: 2 }), place = st.tray.indexOf(p); assert.equal(place, 0);
  INTENTS.create.intent(h, "roll", "confirm"); dispatch(h, { screen: "panel", target: "card.grow", verb: "confirm" });
  assert.ok(st.bud && !st.tray.includes(p)); assert.deepEqual(h.played.map((e) => [e.kind, e.ms]), [["grow", 900]]); assert.ok(st.log.some((l) => l.includes("Grow this founder?") && l.includes("Grow it")), "the card pressed is in the log");
  h.timers[0].fn(); assert.equal(h.went.at(-1), "incubator");
  assert.deepEqual(h.said, [["Incubator: your Loika bud is growing", 2000]]); assert.ok(h.ui.arrival);
  INTENTS.incubator.intent(h, "room", "back"); assert.deepEqual([h.went.at(-1), h.ui.pods.view, h.ui.pods.focus.cur, h.ui.arrival], ["pods", "collection", "place.0", null], "← to Pods, this pod's place");
  h.ui.screen = "incubator"; INTENTS.incubator.intent(h, "room", "back"); assert.equal(h.went.at(-1), "home", "after that ← is Home as now");
});
test("the fork mode end to end: Grow and watch lands in the Incubator with no plate; Grow, keep reading lands in Pods' collection with the ring on the next pod; both pay the same and play the same event", () => {
  const a = open({ jump: "fork", more: 2 }); INTENTS.create.intent(a.h, "roll", "confirm"); assert.deepEqual(view(a.h).overlay.regions.cards.map((c) => c.id), ["watch", "read", "shape"]);
  dispatch(a.h, { screen: "panel", target: "card.watch", verb: "confirm" }); a.h.timers[0].fn();
  assert.deepEqual([a.h.went.at(-1), a.h.said.length, a.h.ui.arrival], ["incubator", 0, null], "no arrival plate in the fork"); assert.ok(a.st.log.some((l) => l.includes("Grow and watch")));
  const b = open({ jump: "fork", more: 2 }); INTENTS.create.intent(b.h, "roll", "confirm"); b.h.ui.panel.focus = "card.read"; dispatch(b.h, { screen: "panel", target: "card.read", verb: "confirm" }); b.h.timers[0].fn();
  assert.deepEqual([b.h.went.at(-1), b.h.ui.pods.view, b.h.ui.pods.focus.cur, b.h.ui.pods.cur], ["pods", "collection", "place.0", b.st.tray[0].id], "the next pod: the one now at the grown pod's place");
  assert.deepEqual([a.st.e, a.st.d, a.st.s], [b.st.e, b.st.d, b.st.s], "the same spend"); assert.deepEqual(a.h.played.map((e) => [e.kind, e.ms, e.hold]), b.h.played.map((e) => [e.kind, e.ms, e.hold]), "the same event");
  assert.ok(b.st.log.some((l) => l.includes("Grow, keep reading")));
});
test("reduced motion: the card's Grow jumps on the frame of ✓; the panel and the jump flag read ?jump= only for arrival and fork", () => {
  const { st, h } = open(); h.moving = false; INTENTS.create.intent(h, "roll", "confirm"); dispatch(h, { screen: "panel", target: "card.grow", verb: "confirm" });
  assert.deepEqual([h.went.at(-1), h.played.length, h.timers.length, !!st.bud], ["incubator", 0, 0, true]);
  assert.equal(S.DEFAULT_SETTINGS.jump, "arrival");
});
