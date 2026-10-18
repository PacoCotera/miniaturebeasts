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
import { openPanel } from "../src/intents/panel.mjs";
import { createMeasure } from "../../ui/specs/measure.mjs";
import { validate } from "./habitat-props.test.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
// The Grow this founder? panel was superseded (T-20261016-223; T-222 brings Incubate | Keep shaping): its strings are gone from panel.json and Create opens no panel. The frame and its code stay, so they are tested here on the retired strings kept as a fixture.
const GROW = JSON.parse(readFileSync(path.resolve(here, "fixtures/grow-panel.json"), "utf8")), withGrow = (sp) => ({ ...sp, panels: { ...sp.panels, grow: GROW.panel }, strings: { ...sp.strings, grow: GROW.strings } });
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), panelSpec = withGrow(J("panel.json")), frameSpec = J("frame.json"), podsSpec = J("pods.json"), createSpec = J("create.json"), schema = J("panel.props.json");
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
      assert.ok((c.cost.match(/[⚡❀◆⧗]/g) ?? []).length <= P.card.costs.groups && !/⧗/.test(c.cost), c.cost + ": at most four groups, no minute count (owner ruling 3)");
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
  assert.equal(v.overlay.focus.cur, "card.watch"); assert.deepEqual([v.line.ok, v.line.subject, v.line.back, v.line.price], ["Grow and watch", "watch it in the Incubator", "Back", "⚡ 2 ❀ 4"]);
  h.ui.panel.focus = "card.shape"; v = view(h); assert.deepEqual([v.line.ok, v.line.subject, v.line.back, "price" in v.line], ["Keep shaping", "", "Back", false], "the way out: no cost, no line, no destination");
  const s = open({ short: true }); s.h.ui.panel = { screen: "create", id: "grow", focus: "" }; v = view(s.h);
  assert.equal(v.overlay.regions.cards[0].dim, true); assert.equal(v.overlay.focus.cur, "card.shape", "every card but the way out is dimmed: the way out");
  s.h.ui.panel.focus = "card.grow"; v = view(s.h); assert.deepEqual([v.line.ok, v.line.dim, typeof v.line.short, v.line.need], ["Grow it", true, "string", "needs more ❀"], "a dimmed card can be focused and read: its short figure, its notice");
  assert.equal(initialFocus([{ id: "a", dim: true, loss: false }, { id: "b", dim: false, loss: true }, { id: "c", dim: false, loss: false }, { id: "d", dim: false, loss: false }]), "card.c");
  assert.equal(initialFocus([{ id: "a", dim: false, loss: true }, { id: "b", dim: true, loss: false }]), "card.b", "all dimmed or a loss: the way out");
  const dest = panelBuild({ st: h.st, settings: h.settings, ui: { ...h.ui, panel: { screen: "create", id: "grow", focus: "card.grow" } }, jump: "arrival" }, panelSpec, frameSpec, podsSpec);
  assert.equal(dest.line.subject, "chapters stay a surprise", "two chapters unread: the line is the card's"); assert.equal(dest.overlay.regions.cards[0].mark, frameSpec.regions.marks.room.research, "the destination mark is the title bar's");
});

test("the retired Grow this founder? panel (a fixture; Create opens none): it opens by openPanel and spends nothing; ←, a room key and a dimmed card spend nothing and the screen is as before", () => {
  const { st, h } = open(); const e0 = [st.e, st.d, st.s];
  openPanel(h, "create", "grow"); assert.equal(h.ui.panel.id, "grow"); assert.equal(h.ui.panel.focus, "card.grow"); assert.deepEqual([st.e, st.d, st.s], e0); assert.equal(st.bud, null);
  dispatch(h, { screen: "panel", target: "card.grow", verb: "back" }); assert.equal(h.ui.panel, null); assert.ok(h.ui.create && !h.ui.create.grown, "Create as before"); assert.deepEqual([st.e, st.d, st.s], e0);
  { const r = open(); openPanel(r.h, "create", "grow"); dispatch(r.h, { screen: "panel", target: "card.grow", verb: "room:research" }); assert.equal(r.h.ui.panel, null, "a room key closes it"); assert.equal(r.st.bud, null); }
  openPanel(h, "create", "grow"); dispatch(h, { screen: "panel", target: "card.shape", verb: "confirm" }); assert.equal(h.ui.panel, null, "Keep shaping closes it"); assert.equal(st.bud, null); assert.equal(h.saved, 0);
  const s = open({ short: true }); s.h.ui.panel = { screen: "create", id: "grow", focus: "card.grow" };
  dispatch(s.h, { screen: "panel", target: "card.grow", verb: "confirm" }); assert.ok(s.h.ui.panel, "a dimmed card does nothing"); assert.deepEqual(s.h.said.map((x) => x[0]), ["needs more ❀"]); assert.equal(s.st.bud, null);
});
test("the arrival mode end to end: ✓, ✓ Grow it, the event, the jump to the Incubator with the 2000 ms plate; ← returns to Pods, this pod's place, until another key; then ← is Home", () => {
  const { st, h, p } = open({ more: 2 }), place = st.tray.indexOf(p); assert.equal(place, 0);
  openPanel(h, "create", "grow"); dispatch(h, { screen: "panel", target: "card.grow", verb: "confirm" });
  assert.ok(st.bud && !st.tray.includes(p)); assert.deepEqual(h.played.map((e) => [e.kind, e.ms]), [["grow", 900]]); assert.ok(st.log.some((l) => l.includes("Grow this founder?") && l.includes("Grow it")), "the card pressed is in the log");
  h.timers[0].fn(); assert.equal(h.went.at(-1), "incubator");
  assert.deepEqual(h.said, [["Incubator: your Loika bud is growing", 2000]]); assert.ok(h.ui.arrival);
  INTENTS.incubator.intent(h, "room", "back"); assert.deepEqual([h.went.at(-1), h.ui.pods.view, h.ui.pods.focus.cur, h.ui.arrival], ["pods", "collection", "place.0", null], "← to Pods, this pod's place");
  h.ui.screen = "incubator"; INTENTS.incubator.intent(h, "room", "back"); assert.equal(h.went.at(-1), "home", "after that ← is Home as now");
});
test("the fork mode end to end: Grow and watch lands in the Incubator with no plate; Grow, keep reading lands in Pods' collection with the ring on the next pod; both pay the same and play the same event", () => {
  const a = open({ jump: "fork", more: 2 }); openPanel(a.h, "create", "grow"); assert.deepEqual(view(a.h).overlay.regions.cards.map((c) => c.id), ["watch", "read", "shape"]);
  dispatch(a.h, { screen: "panel", target: "card.watch", verb: "confirm" }); a.h.timers[0].fn();
  assert.deepEqual([a.h.went.at(-1), a.h.said.length, a.h.ui.arrival], ["incubator", 0, null], "no arrival plate in the fork"); assert.ok(a.st.log.some((l) => l.includes("Grow and watch")));
  const b = open({ jump: "fork", more: 2 }); openPanel(b.h, "create", "grow"); b.h.ui.panel.focus = "card.read"; dispatch(b.h, { screen: "panel", target: "card.read", verb: "confirm" }); b.h.timers[0].fn();
  assert.deepEqual([b.h.went.at(-1), b.h.ui.pods.view, b.h.ui.pods.focus.cur, b.h.ui.pods.cur], ["pods", "collection", "place.0", b.st.tray[0].id], "the next pod: the one now at the grown pod's place");
  assert.deepEqual([a.st.e, a.st.d, a.st.s], [b.st.e, b.st.d, b.st.s], "the same spend"); assert.deepEqual(a.h.played.map((e) => [e.kind, e.ms, e.hold]), b.h.played.map((e) => [e.kind, e.ms, e.hold]), "the same event");
  assert.ok(b.st.log.some((l) => l.includes("Grow, keep reading")));
});
test("reduced motion: the card's Grow jumps on the frame of ✓; the panel and the jump flag read ?jump= only for arrival and fork", () => {
  const { st, h } = open(); h.moving = false; openPanel(h, "create", "grow"); dispatch(h, { screen: "panel", target: "card.grow", verb: "confirm" });
  assert.deepEqual([h.went.at(-1), h.played.length, h.timers.length, !!st.bud], ["incubator", 0, 0, true]);
  assert.equal(S.DEFAULT_SETTINGS.jump, "arrival");
});

// ---- the Return panels (T-20261016-51; spec §1.6): Return it ❀ +2 (a mibi) or ❀ +1 (a pod) from the rules, "gone for good" on the loss card, the ring on Keep, ← and Keep spend nothing ----
function wildHost(kind) {
  const st = world(), h = host(st); h.specs.habitat = J("habitat.json");
  if (kind === "mibi") { S.seedAdults(st, "S01", 5, 2, settings); h.ui.screen = "habitat"; h.ui.hab = { id: st.mibis[0].id, f: "wild", namer: null, prev: null }; h.ui.panel = { screen: "habitat", id: "wildMibi", focus: "" }; }
  else { S.seedPodFromGenome(st, podGenome(frameOf("S01"), 3), settings, T0); S.skipIdentify(st, st.tray[0]); h.ui.screen = "pods"; h.ui.pods.cur = st.tray[0].id; h.ui.panel = { screen: "pods", id: "wildPod", focus: "" }; }
  return h;
}
const wview = (h) => panelBuild({ st: h.st, sv: h.sv, settings: h.settings, ui: h.ui, jump: "arrival" }, panelSpec, frameSpec, podsSpec);
for (const [kind, gain, title] of [["mibi", S.PRICE.wildMibi, null], ["pod", S.PRICE.wild, "Return this pod?"]]) {
  test(`the Return panel (${kind}): the gain from the rules, the loss card says it is gone for good, the ring opens on Keep, the scene stands in the glow's place`, () => {
    const h = wildHost(kind), v = wview(h), [ret, keep] = v.cards, names = h.st.mibis.map((m) => m.name);
    assert.deepEqual(validate(v.overlay, schema, schema), [], "the overlay validates against panel.props.json");
    assert.equal(v.overlay.regions.title, title ?? `Return ${names[0]}?`);
    assert.deepEqual([ret.id, keep.id], ["return", "keep"]);
    assert.equal(ret.cost, S.gainText(gain)); assert.equal(ret.gain, true); assert.equal(ret.loss, true); assert.equal(ret.line, "gone for good"); assert.equal(ret.mark, frameSpec.regions.marks.room[kind === "mibi" ? "vivarium" : "research"]);
    assert.equal(keep.cost, ""); assert.equal(keep.mark, ""); assert.equal(keep.line, ""); assert.equal(keep.name, kind === "mibi" ? `Keep ${names[0]}` : "Keep it");
    assert.equal(v.overlay.focus.cur, "card.keep", "the ring opens on Keep, the way out");
    assert.equal(v.line.ok, "Keep " + (kind === "mibi" ? names[0] : "it").replace(/^Keep /, ""));
    const rc = v.overlay.regions.cards; assert.match(rc[0].art.scene, /^panel-scene-wild-\d+x152$/); assert.equal(rc[0].art.glow, ""); assert.equal(rc[1].art.scene, undefined, "Keep keeps the glow"); assert.ok(rc[1].art.glow);
    for (const c of [ret, keep]) assert.ok(measure(c.name, 20) <= P.limits[2].text, c.name);
    assert.ok(!JSON.stringify(panelSpec.strings[kind === "mibi" ? "wildMibi" : "wildPod"]).match(/[❀\d]/), "no figure in the strings: the gain is the rules'");
  });
  test(`the Return panel (${kind}): the focused Return card puts the gain on the bottom line`, () => {
    const h = wildHost(kind); h.ui.panel.focus = "card.return"; const v = wview(h);
    assert.equal(v.line.ok, "Return it"); assert.equal(v.line.price, S.gainText(gain)); assert.equal(v.line.subject, "gone for good");
  });
}

// ---- the Fit the upgrade? panel (T-20261016-53; spec §1.6): ⚡ 12 ◆ 4 from the rules, dimmed with what is short, Not now spends nothing ----
function fitHost(o = {}) {
  const st = world(); st.dock = { docked: true, at: T0 }; st.probe = { shield: 2, smax: 3, tier: 1, seq: 1 }; if (o.e != null) st.e = o.e; if (o.d != null) st.d = o.d;
  const h = host(st); h.ui.screen = "bench"; h.ui.bench = { f: "slot", install: false }; h.ui.panel = { screen: "bench", id: "fitUpgrade", focus: "" }; return h;
}
test("the Fit the upgrade? panel: the cost from the rules, the part fitted and the part dimmed, no mark, the ring on Fit it, nothing in the strings carries a figure", () => {
  const h = fitHost(), v = wview(h), [fit, later] = v.cards, e = S.price(S.PRICE.tier2E, settings), d = S.price(S.PRICE.tier2D, settings);
  assert.deepEqual(validate(v.overlay, schema, schema), []); assert.equal(v.overlay.regions.title, "Fit the upgrade?");
  assert.deepEqual([fit.id, later.id], ["fit", "later"]); assert.equal(fit.cost, S.priceText(e, d, 0)); assert.equal(fit.cost, "⚡ 12 ◆ 4"); assert.equal(fit.gain, false); assert.equal(fit.dim, false); assert.equal(fit.short, "");
  assert.equal(fit.picture, "bench-part-t2-fitted-128"); assert.equal(later.picture, "bench-part-t2-dim-128"); assert.deepEqual([fit.mark, later.mark, fit.line, later.cost], ["", "", "reaches further", ""]);
  assert.equal(v.overlay.focus.cur, "card.fit"); assert.equal(v.line.ok, "Fit it"); assert.equal(v.line.price, "⚡ 12 ◆ 4"); assert.equal(v.line.subject, "reaches further");
  for (const c of [fit, later]) assert.ok(measure(c.name, 20) <= P.limits[2].text && words(c.name) <= 3, c.name);
  assert.ok(measure(fit.line, 16) <= 208 && words(fit.line) <= 6); assert.ok(!JSON.stringify(panelSpec.strings.fitUpgrade).match(/[⚡◆❀\d]/), "no figure in the strings");
});
test("the Fit the upgrade? panel when short: Fit it is dimmed with the short icons, the ring opens on Not now, the bottom line says what is short", () => {
  for (const [o, icons] of [[{ e: 11 }, "⚡"], [{ d: 3 }, "◆"], [{ e: 0, d: 0 }, "⚡ ◆"]]) {
    const v = wview(fitHost(o)), fit = v.cards[0]; assert.deepEqual([fit.dim, fit.short], [true, icons]); assert.equal(v.overlay.focus.cur, "card.later"); assert.equal(v.overlay.regions.cards[0].dim, true);
  }
  const h = fitHost({ e: 11 }); h.ui.panel.focus = "card.fit"; const v = wview(h); assert.equal(v.line.dim, true); assert.equal(v.line.short, "⚡"); assert.match(v.line.need, /⚡/);
});

// ---- the Hatch now? panel (T-20261016-54; spec §1.6): above ❀ 4 only; the minute count only in the Wait card and its line ----
function growNowHost(o = {}) {
  const st = world(); S.seedPodFromGenome(st, podGenome(frameOf("S01"), 3), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p); frameOf("S01").chapters.forEach((c) => S.read(st, p, c.id, settings));
  assert.ok(S.grow(st, p, {}, settings, T0).ok); if (o.s != null) st.s = o.s;
  const h = host(st); h.ui.screen = "incubator"; h.ui.inc = {}; h.ui.panel = { screen: "incubator", id: "growNow", focus: "" }; return h;
}
const gview = (h) => panelBuild({ st: h.st, sv: h.sv, settings: h.settings, ui: h.ui, jump: "arrival", now: T0 }, panelSpec, frameSpec, podsSpec);
test("the Hatch now? panel: the price from the rules, the ready bud and the bud as it is, the minute count only in the Wait card and its line, the threshold is a spec value", () => {
  const h = growNowHost(), v = gview(h), [grow, wait] = v.cards, c = S.instantGrowCost(h.st, settings, T0), n = S.budMinutesLeft(h.st, settings, T0);
  assert.equal(panelSpec.growNowAbove, 4); assert.ok(c.s > panelSpec.growNowAbove, "this bud is above the threshold");
  assert.deepEqual(validate(v.overlay, schema, schema), []); assert.equal(v.overlay.regions.title, "Hatch now?");
  assert.deepEqual([grow.id, wait.id], ["grow", "wait"]); assert.equal(grow.cost, S.priceText(c.e, c.d, c.s)); assert.match(grow.cost, /^❀ \d+$/); assert.equal(grow.line, "ready at once"); assert.equal(wait.cost, ""); assert.equal(wait.line, `ready in about ${n} min`);
  assert.equal(grow.picture, "bud-ready-128x160"); assert.match(wait.picture, /^bud-(early|late)-128x160$/);
  for (const t of [grow.name, grow.line, grow.cost, wait.name, v.overlay.regions.title]) assert.ok(!/\bmin\b|⧗/.test(t), "no minute count outside the Wait line: " + t);
  assert.equal(v.overlay.focus.cur, "card.grow"); h.ui.panel.focus = "card.wait"; assert.equal(gview(h).line.subject, `ready in about ${n} min`, "the context carries the count");
  for (const x of [grow, wait]) assert.ok(measure(x.name, 20) <= P.limits[2].text && measure(x.line, 16) <= 208, x.name + " / " + x.line);
});
test("the Hatch now? panel when short of Essence: Hatch now is dimmed with the short icon, the ring opens on Wait", () => {
  const h = growNowHost({ s: 1 }), v = gview(h); assert.deepEqual([v.cards[0].dim, v.cards[0].short], [true, "❀"]); assert.equal(v.overlay.focus.cur, "card.wait");
});
