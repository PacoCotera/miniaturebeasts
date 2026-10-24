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
import { panelBuild, initialFocus, growNowCards, dockCards } from "../src/views/panel-props.mjs";
import { INTENTS, dispatch } from "../src/intents/index.mjs";
import { openPanel } from "../src/intents/panel.mjs";
import { createMeasure } from "../../ui/specs/measure.mjs";
import { validate } from "./habitat-props.test.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
// The Grow this founder? panel (T-195 r2 sections 2 and 3: Grow it, Grow and watch, Grow keep reading, the arrival and fork jump modes) is retired with its fixture (T-20261016-222): Create's Incubate opens the Incubate | Keep shaping panel (build spec 6a).
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), panelSpec = J("panel.json"), frameSpec = J("frame.json"), podsSpec = J("pods.json"), createSpec = J("create.json"), schema = J("panel.props.json"), incSchema = J("panel.incubate.props.json"), hnSchema = J("panel.hatchnow.props.json"), incubatorSpec = J("incubator.json");
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

test("the geometry and the width limits: a card is 776, 380 or 248 wide for one, two or three; a name, line and cost fit the card less 32, measured, in the budgets (the two cards of the Hatch now? panel)", () => {
  const w = (n) => (P.cards.width - P.cards.gap * (n - 1)) / n;
  assert.deepEqual([1, 2, 3].map(w), [776, 380, 248]); assert.deepEqual([1, 2, 3].map((n) => P.limits[n].card), [776, 380, 248]); assert.deepEqual([1, 2, 3].map((n) => P.limits[n].text), [744, 348, 216]);
  assert.deepEqual([1, 2, 3].map((n) => P.limits[n].picture), [[744, 160], [348, 160], [216, 160]]);
  assert.deepEqual([P.rect, P.title.rect, P.cards.y, P.cards.h, P.card.picture.floor], [[92, 80, 840, 440], [124, 96, 776, 36], 152, 288, 168]);
  const st = world(), p = (S.seedPodFromGenome(st, podGenome(frameOf("S01"), 3), settings, T0), st.tray[0]); S.skipIdentify(st, p); assert.ok(S.grow(st, p, {}, settings, T0).ok);
  const cards = growNowCards({ st, settings, ui: {}, now: T0 }, panelSpec), limit = P.limits[2].text; assert.equal(cards.length, 2);
  for (const c of cards) {
    assert.ok(words(c.name) <= 3 && measure(c.name, 20) <= limit, `${c.name} (${measure(c.name, 20)} px of ${limit})`);
    if (c.line) assert.ok(words(c.line) <= 6 && measure(c.line, 16) <= Math.min(limit, 208), `${c.line} (${measure(c.line, 16)} px)`);
    assert.ok((c.cost.match(/[⚡❀◆⧗]/g) ?? []).length <= P.card.costs.groups, c.cost + ": at most four groups");
  }
  assert.ok(measure("to " + panelSpec.strings.rooms.research, 16) <= 208 && measure(panelSpec.strings.arrival.text.replace("{Species}", "Untuva"), 16) <= P.rect[2]);
});
test("focus opens on the first card that is neither dimmed nor a loss, else the way out", () => {
  assert.equal(initialFocus([{ id: "a", dim: true, loss: false }, { id: "b", dim: false, loss: true }, { id: "c", dim: false, loss: false }, { id: "d", dim: false, loss: false }]), "card.c");
  assert.equal(initialFocus([{ id: "a", dim: false, loss: true }, { id: "b", dim: true, loss: false }]), "card.b", "all dimmed or a loss: the way out");
});

// ---- the Incubate | Keep shaping panel (T-20261016-222; build spec 6a): Create's `confirm` state ----
const incView = (h, focus = "card.incubate") => { h.ui.panel = { screen: "create", id: "incubate", focus }; return panelBuild({ st: h.st, settings: h.settings, ui: h.ui, jump: h.settings.jump, create: createSpec }, panelSpec, frameSpec, podsSpec); };
test("the Incubate panel's geometry (panel.json incubate): two bezels 490 x 506 at y 46 with a 12 px gap, each window inside its bezel (8 px in, under a 30 px header), the verbs and Incubate's price fit the header", () => {
  const I = panelSpec.incubate, [l, r] = [I.bezels.incubate, I.bezels.keep];
  assert.deepEqual([l, r], [[16, 46, 490, 506], [518, 46, 490, 506]]); assert.equal(r[0] - (l[0] + l[2]), 12);
  assert.deepEqual([I.windows.left, I.windows.right], [[24, 76, 474, 468], [526, 76, 474, 468]]); for (const [b, w] of [[l, I.windows.left], [r, I.windows.right]]) assert.deepEqual([w[0] - b[0], w[1] - b[1], b[2] - w[2], b[1] + b[3] - (w[1] + w[3])], [8, 30, 16, 8], "8 in, 30 under the top, 8 at the foot");
  assert.deepEqual([I.header.h, I.header.baseline, I.header.x, I.price.right, I.price.pod.size, I.price.pod.top, I.price.gap, I.bezels.radius, I.windows.radius], [30, 21, 12, 12, [16, 20], 5, 12, 10, 6]);
  const { h } = open(); const v = incView(h), Sg = createSpec.strings.panel;
  assert.deepEqual([v.overlay.regions.verbs.incubate, v.overlay.regions.verbs.keep, Sg.back], ["Incubate", "Keep shaping", "Back"]);
  const need = measure("Incubate", 16) + 12 + measure(v.overlay.regions.price.replace(/[⚡❀◆]/g, "xx"), 16) + 16 + 12 + 12; assert.ok(need <= 490, `the left header needs about ${need} of 490`);
  assert.deepEqual(I.left.layers, [116, 80]); assert.deepEqual(I.right.snapshot, [275, 90, 474, 468], "Create's stage rect fills the right window");
});
test("the Incubate panel's props validate against panel.incubate.props.json, name no rectangle, fit the budget; the price is the rules' (⚡ ❀ ◆, a figure of 0 left out), the pod is the last item, the right window sends nothing", () => {
  for (const short of [false]) {
    const { st, h, p } = open({ short }); const v = incView(h), bad = validate(v.overlay, incSchema, incSchema); assert.deepEqual(bad, [], bad.slice(0, 3).join("; "));
    const json = JSON.stringify(v.overlay); assert.ok(!/"(x|y|w|h|rect|at|box|pitch)"\s*:/.test(json), "props name what, never where"); assert.ok(json.length < 4096, json.length + " bytes");
    const c = S.growCost(st, {}, settings); assert.equal(v.overlay.regions.price, S.priceText(c.e, c.d, c.s, 0) === "free" ? "" : S.priceText(c.e, c.d, c.s, 0)); assert.ok(!/⧗/.test(v.overlay.regions.price), "no minutes on Create: the time belongs to the Incubator alone");
    assert.match(v.overlay.regions.pod, /^podicon:S01:16x20$/); assert.deepEqual(v.overlay.focus.targets.map((t) => t.id), ["card.incubate", "card.keep"]); assert.equal(v.overlay.regions.right, undefined);
    assert.ok(v.requests.some((r) => r.kind === "relit" && /^relit:S01:pod:dusk:\d+x\d+:v\d+$/.test(r.id)), "this founder's pod, relit at dusk"); assert.ok(v.requests.some((r) => r.kind === "podicon" && r.size.join("x") === "16x20"));
    assert.equal(p.id, h.ui.create.podId);
  }
});
test("focus opens on Incubate; the bottom line is the verb of the focused bezel with no price, no subject and no notice, and Back", () => {
  const { h } = open(); let v = incView(h); assert.equal(v.overlay.focus.cur, "card.incubate"); assert.deepEqual([v.line.ok, v.line.subject, v.line.need, v.line.back, "price" in v.line], ["Incubate", "", "", "Back", false]);
  v = incView(h, "card.keep"); assert.equal(v.overlay.focus.cur, "card.keep"); assert.deepEqual([v.line.ok, v.line.back, "price" in v.line], ["Keep shaping", "Back", false]);
});
test("the Incubate panel opens from Create's ✓ and spends nothing; ←, Keep shaping and a room key close it with nothing spent and Create as before; only ✓ Incubate pays", () => {
  const { st, h } = open(); const e0 = [st.e, st.d, st.s]; h.specs.incubator = incubatorSpec; h.ui.screen = "create";
  INTENTS.create.intent(h, "roll", "confirm"); assert.deepEqual([h.ui.panel.id, h.ui.panel.focus, st.bud], ["incubate", "card.incubate", null]); assert.deepEqual([st.e, st.d, st.s], e0);
  dispatch(h, { screen: "panel", target: "card.incubate", verb: "back" }); assert.equal(h.ui.panel, null); assert.ok(h.ui.create && !h.ui.create.grown, "Create as before"); assert.deepEqual([st.e, st.d, st.s], e0);
  INTENTS.create.intent(h, "roll", "confirm"); dispatch(h, { screen: "panel", target: "card.keep", verb: "confirm" }); assert.equal(h.ui.panel, null, "Keep shaping closes it"); assert.equal(st.bud, null); assert.equal(h.saved, 0);
  assert.deepEqual(h.played.map((e) => [e.kind, e.target, e.ms, e.hold]), Array(4).fill(["dither", "stage", 180, 180]), "open, back, open, Keep shaping: the dither each way");
  { const r = open(); r.h.ui.screen = "create"; INTENTS.create.intent(r.h, "roll", "confirm"); dispatch(r.h, { screen: "create", target: "roll", verb: "room:research" }); assert.equal(r.h.ui.panel, null, "a room key closes it as a cut"); assert.equal(r.st.bud, null); }
  INTENTS.create.intent(h, "roll", "confirm"); const log0 = st.log.length; dispatch(h, { screen: "panel", target: "card.incubate", verb: "confirm" }); assert.ok(st.bud && h.ui.create.grown, "✓ Incubate pays and the grow event plays"); assert.ok(st.log.slice(log0).some((l) => /Incubated /.test(l)), "the log line is Create's grow, unchanged"); assert.ok(st.log.some((l) => l.includes("Incubate | Keep shaping")), "the card pressed is in the log");
});
test("Incubate is refused before the panel opens when a bud is already growing, no bay is free or a material is short: no panel, and a short ✓ says what is short; if the state changes while the panel stands, ✓ Incubate closes it and Create shows its plate, nothing spent", () => {
  { const { st, h } = open(); h.specs.incubator = incubatorSpec; S.grow(st, st.tray[0], {}, settings, T0); }
  { const { st, h } = open({ short: true }); h.specs.incubator = incubatorSpec; st.e = 0; INTENTS.create.intent(h, "roll", "confirm"); assert.equal(h.ui.panel, null, "short: no panel"); assert.equal(h.said.length, 1); }
  { const { st, h } = open(); h.specs.incubator = incubatorSpec; INTENTS.create.intent(h, "roll", "confirm"); assert.ok(h.ui.panel); st.e = 0; st.d = 0; st.s = 0; const s0 = [st.e, st.d, st.s]; dispatch(h, { screen: "panel", target: "card.incubate", verb: "confirm" }); assert.equal(h.ui.panel, null); assert.equal(st.bud, null); assert.equal(h.said.length, 1, "Create's refusal plate"); assert.deepEqual([st.e, st.d, st.s], s0, "nothing spent"); }
});

// ---- the Release panels (spec §1.6): Release it ❀ +2 (a mibi) or ❀ +1 (a pod) from the rules, its fact in the text colour (no loss card), no title, the ring on Release, ← and Keep spend nothing ----
function wildHost(kind) {
  const st = world(), h = host(st); h.specs.habitat = J("habitat.json");
  if (kind === "mibi") { S.seedAdults(st, "S01", 5, 2, settings); h.ui.screen = "habitat"; h.ui.hab = { id: st.mibis[0].id, f: "wild", namer: null, prev: null }; h.ui.panel = { screen: "habitat", id: "wildMibi", focus: "" }; }
  else { S.seedPodFromGenome(st, podGenome(frameOf("S01"), 3), settings, T0); S.skipIdentify(st, st.tray[0]); h.ui.screen = "pods"; h.ui.pods.cur = st.tray[0].id; h.ui.panel = { screen: "pods", id: "wildPod", focus: "" }; }
  return h;
}
const wview = (h) => panelBuild({ st: h.st, sv: h.sv, settings: h.settings, ui: h.ui, jump: "arrival" }, panelSpec, frameSpec, podsSpec);
for (const [kind, gain] of [["mibi", S.PRICE.wildMibi], ["pod", S.PRICE.wild]]) {
  test(`the Release panel (${kind}): the gain from the rules, the fact in the text colour, no title, the ring opens on Release, the scene stands in the glow's place`, () => {
    const h = wildHost(kind), v = wview(h), [ret, keep] = v.cards, names = h.st.mibis.map((m) => m.name);
    assert.deepEqual(validate(v.overlay, schema, schema), [], "the overlay validates against panel.props.json");
    assert.equal(v.overlay.regions.title, "");
    assert.deepEqual([ret.id, keep.id], ["return", "keep"]);
    assert.equal(ret.cost, S.gainText(gain)); assert.equal(ret.gain, true); assert.equal(ret.loss, false); assert.equal(ret.line, kind === "mibi" ? `${names[0]} lives in the wild from now on` : `it goes back to the ${S.PLACE_WORD[h.st.tray[0].g] || "wild"}`); assert.equal(ret.name, kind === "mibi" ? `Release ${names[0]}` : "Release it"); assert.equal(ret.mark, frameSpec.regions.marks.room[kind === "mibi" ? "vivarium" : "research"]);
    assert.equal(keep.cost, ""); assert.equal(keep.mark, ""); assert.equal(keep.line, ""); assert.equal(keep.name, kind === "mibi" ? `Keep ${names[0]}` : "Keep it");
    assert.equal(v.overlay.focus.cur, "card.return", "the ring opens on Release, on the left");
    assert.equal(v.line.ok, ret.name);
    const rc = v.overlay.regions.cards; assert.match(rc[0].art.scene, /^panel-scene-wild-\d+x152$/); assert.equal(rc[0].art.glow, ""); assert.equal(rc[1].art.scene, undefined, "Keep keeps the glow"); assert.ok(rc[1].art.glow);
    for (const c of [ret, keep]) assert.ok(measure(c.name, 20) <= P.limits[2].text, c.name);
    assert.ok(!JSON.stringify(panelSpec.strings[kind === "mibi" ? "wildMibi" : "wildPod"]).match(/[❀\d]/), "no figure in the strings: the gain is the rules'");
  });
  test(`the Release panel (${kind}): the focused Release card puts the gain on the bottom line`, () => {
    const h = wildHost(kind); h.ui.panel.focus = "card.return"; const v = wview(h);
    assert.equal(v.line.ok, kind === "mibi" ? `Release ${h.st.mibis[0].name}` : "Release it"); assert.equal(v.line.price, S.gainText(gain)); assert.equal(v.line.subject, "", "the middle is empty on a card-form panel"); assert.ok(wview(h).cards[0].line, "the fact is on the card");
  });
}

test("the dock strip's Open the bay line: the crates in words to twelve, many from thirteen", () => {
  const line = (n) => dockCards({ ui: { cargo: { arrival: { crates: n } } } }, panelSpec, frameSpec, []).find((c) => c.id === "open").line;
  assert.equal(line(1), panelSpec.strings.dock.oneCrate); assert.equal(line(12), "twelve crates to the case"); assert.equal(line(13), "many crates to the case");
});

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
  assert.equal(v.overlay.focus.cur, "card.fit"); assert.equal(v.line.ok, "Fit it"); assert.equal(v.line.price, "⚡ 12 ◆ 4"); assert.equal(v.line.subject, "", "the middle is empty on a card-form panel");
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
test("the Hatch now | Wait panel: the price from the rules, the minute count only in the caption, the threshold is a spec value, the props validate and name no rectangle", () => {
  const h = growNowHost(), v = gview(h), [grow, wait] = v.cards, c = S.instantGrowCost(h.st, settings, T0), n = S.budMinutesLeft(h.st, settings, T0), R = v.overlay.regions;
  assert.equal(panelSpec.growNowAbove, 4); assert.ok(c.s > panelSpec.growNowAbove, "this bud is above the threshold");
  assert.deepEqual(validate(v.overlay, hnSchema, hnSchema), []); assert.equal(v.overlay.form, "hatchnow"); assert.equal(R.title, undefined, "no title");
  assert.deepEqual([grow.id, wait.id], ["grow", "wait"]); assert.equal(grow.cost, S.priceText(c.e, c.d, c.s)); assert.equal(R.price, grow.cost); assert.match(R.price, /^❀ \d+$/); assert.equal(wait.cost, ""); assert.equal(R.caption, `ready in about ${n} min`);
  assert.deepEqual([R.verbs.grow, R.verbs.wait], ["Hatch now", "Wait"]);
  for (const t of [R.verbs.grow, R.verbs.wait, R.price]) assert.ok(!/\bmin\b|⧗/.test(t), "no minute count outside the caption: " + t);
  assert.equal(v.overlay.focus.cur, "card.grow"); h.ui.panel.focus = "card.wait"; assert.equal(gview(h).overlay.focus.cur, "card.wait");
  assert.ok(!/"(rect|x|y|at)"/.test(JSON.stringify(v.overlay)), "props name what, never where");
  assert.ok(R.barPx >= 1 && R.barPx <= panelSpec.hatchnow.bar.max, "the bar is max(1, floor(max x progress))");
});
test("the Hatch now | Wait panel's pictures: the hatched look (the opened pod, the juvenile it becomes, the open door) on the left, the growing look (the sealed pod, the glass, the bar) on the right, in the day set", () => {
  const h = growNowHost(), v = gview(h), R = v.overlay.regions, ids = new Set(v.requests.map((r) => r.id));
  for (const id of [R.left.room, R.left.interior, R.left.shell, R.left.door, R.left.bar, R.left.opened, R.left.juvenile, R.right.glass, R.right.pod]) assert.ok(ids.has(id), `${id} is requested`);
  assert.match(R.left.room, /^capsule-room-day-474x468/); assert.match(R.left.door, /^capsule-door-open-457x459/); assert.match(R.right.glass, /^capsule-glass-closed-296x459/);
  assert.match(R.left.opened, /^relit:S01:opened[^:]*:day:/); assert.match(R.left.juvenile, /^relit:S01:/); assert.match(R.right.pod, /^relit:S01:pod:day:/);
  const jr = v.requests.find((r) => r.id === R.left.juvenile); assert.equal(jr.figH, panelSpec.hatchnow.left.juvenile.height, "the juvenile stands 126 tall");
  assert.deepEqual(v.requests.map((r) => r.id), [...new Set(v.requests.map((r) => r.id))], "no picture twice");
});
test("the Hatch now | Wait panel when short of Essence: Hatch now is dimmed with the short icon, the ring opens on Wait (the Incubator itself refuses before it opens)", () => {
  const h = growNowHost({ s: 1 }), v = gview(h); assert.deepEqual([v.cards[0].dim, v.cards[0].short], [true, "❀"]); assert.equal(v.overlay.focus.cur, "card.wait");
});
