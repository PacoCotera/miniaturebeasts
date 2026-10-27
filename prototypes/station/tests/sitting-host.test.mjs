// The sitting's host and keys (host.mjs enterSitting, sittingBody; intents/sitting.mjs) on the real host over the real rules, its door open (nav.mjs BUILT lists "sitting"): the way in (Habitat's Portrait ✓, the portrait only while its picture is held), a Lift mid-ceremony, the steps (✓ a step forward,
// ← a step back keeping the choice), the armed confirm and begin (events.begin: the lit gilt out, then beginSitting and Habitat with the plate at 300 ms, input held 480 ms), the window's dithers (events.backdrop: the glass,
// and the resident's light change in both forms, "dither" and "cut"; the pose step's stand/curl change), reduced motion (cuts), the room key and leaving (the choices dropped), and sitting.json focus.vectors that leave the screen.
//   node --test prototypes/station/tests/sitting-host.test.mjs
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as T from "../src/sitting.mjs";
import { G, UI, SPECS, FX } from "../src/game.mjs";
import { dispatch } from "../src/intents/index.mjs";
import { createHost, onFaceMessage, screenProps, sittingBody, enterSitting } from "../src/host.mjs";
import { newSit } from "../src/intents/sitting.mjs";
import { capLine } from "../src/views/words.mjs";
import { measureRole } from "../../ui/specs/measure.mjs";
import { isBuilt, DROPS_ON_ROOM_KEY } from "../src/nav.mjs";
import { loadStandLayersFs, loadStandLooksFs } from "../tools/stand-layers-fs.mjs";
import { injectPortraitSource, dropPortraitSources } from "../src/portrait-source.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const J = (k) => JSON.parse(readFileSync(path.join(specs, k + ".json"), "utf8"));
for (const k of ["frame", "pods", "home", "cargo", "create", "vivarium", "habitat", "namer", "panel", "sitting"]) SPECS[k] = J(k);
const SIT = SPECS.sitting, HAB = SPECS.habitat, T0 = 1_000_000, settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 };
before(() => { loadStandLooksFs(); loadStandLayersFs(); });

// Dot (S01 adult) up close at night with a sitting held, its habits seen and its places been; the host on a clock the test moves
function rig({ motion = true, habits = ["sleep-curled", "shake-dry", "calm"], walked = ["wood", "pond"], held = true, light = "night" } = {}) {
  G.settings = settings; G.st = S.freshSt("w1", 3, T0); S.normalize(G.st); G.st.firstMibi = false;
  const mb = S.seedAdults(G.st, "S01", 5, 1, settings).mibis[0]; mb.name = "Dot"; for (const x of habits) T.recordHabit(G.st, mb, x); for (const g of walked) T.recordWalk(G.st, mb, g);
  if (held) G.st.sitting = { source: "dev", key: null, at: T0 };
  G.sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, carryReqs: [], st: G.st };
  UI.screen = "habitat"; UI.idle = false; UI.hab.id = mb.id; UI.hab.f = "portrait"; UI.sit = null; UI.panel = null; FX.msg = "";
  const sent = []; let t = 0; const h = createHost({ send: (m) => sent.push(m), nowMs: () => t, light: () => light, motion: () => motion }); h.save = () => {};
  const say = (target, verb) => { if (!h.holding()) dispatch(h, { screen: "sitting", target, verb }); },   // the sitting's intents, as the face says them
    focus = (target) => onFaceMessage(h, { t: "focus", seq: 1, screen: "sitting", target });
  const dithers = (target) => sent.filter((m) => m.kind === "dither" && m.target === target);
  return { h, sent, mb, say, focus, dithers, at: (ms) => { t = ms; h.frame(); }, body: () => sittingBody(light) };
}
const offerOf = (mb) => T.offer(G.st, mb, G.sv);
const ART = () => { const a = new Uint8ClampedArray(528 * 392 * 4); for (let i = 0; i < a.length; i += 4) { a[i] = 7; a[i + 1] = (i >> 2) & 255; a[i + 2] = 40; a[i + 3] = 255; } return a; };

test("the door is open: the screen is built, Habitat's Portrait ✓ opens the pose step and the page takes the sitting's props; a room key drops the sitting's choices", () => {
  const { h, mb } = rig(); assert.equal(isBuilt("sitting"), true); assert.ok(DROPS_ON_ROOM_KEY.includes("sitting"));
  onFaceMessage(h, { t: "intent", seq: 1, screen: "habitat", target: "portrait", verb: "confirm" }); assert.equal(UI.screen, "sitting", "the door is open"); assert.deepEqual(UI.sit, { ...newSit("habitat", "pose"), focus: UI.sit.focus });
  const p = screenProps("").msg; assert.deepEqual([p.screen, p.state, p.focus.cur], ["sitting", "pose", "card.0"]); assert.equal(p.frame.line.back, "Dot");
  onFaceMessage(h, { t: "intent", seq: 1, screen: "sitting", target: "card.0", verb: "room:home" }); assert.equal(UI.sit, null, "the room key drops the visit"); assert.equal(UI.screen, "home");
});

test("Habitat's Portrait ✓ on a portrayed mibi opens the portrait only while its picture is held; with none held it stays on Habitat", () => {
  dropPortraitSources();
  const { h, mb } = rig({ held: false }); mb.portrait = { state: "delivered", pose: "sleep-curled", place: "wood", crate: "sit1", start: T0, at: T0, digest: "0123456789abcdef0011223344556677" };
  onFaceMessage(h, { t: "intent", seq: 1, screen: "habitat", target: "portrait", verb: "confirm" }); assert.deepEqual([UI.screen, UI.sit], ["habitat", null], "no picture held: nothing opens");
  assert.equal(injectPortraitSource(mb.portrait.digest, ART()).ok, true);
  onFaceMessage(h, { t: "intent", seq: 1, screen: "habitat", target: "portrait", verb: "confirm" }); assert.deepEqual([UI.screen, UI.sit.step, UI.sit.from], ["sitting", "portrait", "habitat"]);
  dropPortraitSources();
});

test("a Lift between the place step and confirm keeps both choices: the confirm step reads portraitOut, ✓ neither arms nor begins; the Dock restores ✓ Portray", () => {
  const { h, mb, say } = rig(); enterSitting(h, mb); const o = offerOf(mb);
  say("card.0", "confirm"); G.sv.carried = [mb.id]; G.st.dock = { docked: false, at: T0 };   // the Caddy lifted with the mibi aboard
  say("card.0", "confirm"); assert.deepEqual([UI.sit.step, UI.sit.pose, UI.sit.place], ["confirm", o.poses[0], o.places[0]], "both choices kept");
  let p = screenProps("").msg; assert.deepEqual([p.frame.line.ok, p.frame.line.subject, p.regions.gilt.picture], [null, capLine(HAB.strings.portraitOut), SIT.regions.gilt.slices.rest]);   // the host cases the line (capLine)
  say("room", "confirm"); say("room", "confirm"); assert.deepEqual([UI.sit.step, UI.sit.armed], ["confirm", null], "✓ does nothing"); assert.ok(G.st.sitting, "nothing spent");
  G.st.dock = { docked: true, at: T0 + 1 };   // docked again
  p = screenProps("").msg; assert.deepEqual([p.frame.line.ok, p.frame.line.subject], ["Portray Dot", capLine(SIT.strings.once)]);
  say("room", "confirm"); assert.equal(UI.sit.armed, "room", "✓ arms again");
});

test("enterSitting never enters the portrait state while sittingBuild has nothing to show (its picture not held); with the opening held it opens on the portrait, ✓ does nothing, ← goes to Habitat with the ring on Portrait", () => {
  dropPortraitSources();
  const { h, mb, say } = rig({ held: false }); mb.portrait = { state: "delivered", pose: "sleep-curled", place: "wood", crate: "sit1", start: T0, at: T0, digest: "0123456789abcdef0011223344556677" };
  assert.equal(enterSitting(h, mb, { state: "portrait" }), false); assert.equal(UI.screen, "habitat"); assert.equal(UI.sit, null, "nothing changed");
  assert.equal(injectPortraitSource(mb.portrait.digest, ART()).ok, true);
  assert.equal(enterSitting(h, mb, { state: "portrait" }), true); assert.equal(UI.sit.step, "portrait"); assert.equal(sittingBody("night").props.state, "portrait");
  say("room", "confirm"); assert.equal(UI.screen, "sitting"); assert.equal(UI.sit.step, "portrait", "view only: ✓ does nothing");
  say("room", "back"); assert.deepEqual([UI.screen, UI.hab.f, UI.sit], ["habitat", "portrait", null]);
  dropPortraitSources();
});

test("the steps: ✓ on a card goes a step forward, ← a step back keeping the choice (the ring on it); confirm is entered only with both choices made; from the pose step ← goes to Habitat with the ring on Portrait, the choices dropped", () => {
  const { h, mb, say, body } = rig(); enterSitting(h, mb); const o = offerOf(mb);
  assert.equal(body().props.focus.cur, "card.0", "the visit opens on card.0");
  say("card.1", "confirm"); assert.deepEqual([UI.sit.step, UI.sit.pose], ["place", o.poses[1]]); assert.equal(body().props.focus.cur, "card.0");
  say("card.1", "confirm"); assert.deepEqual([UI.sit.step, UI.sit.place], ["confirm", o.places[1]]); assert.equal(body().props.focus.cur, "room");
  say("room", "back"); assert.equal(UI.sit.step, "place"); assert.equal(body().props.focus.cur, "card.1", "back on the place step, the ring on the place chosen");
  say("card.1", "back"); assert.equal(UI.sit.step, "pose"); assert.equal(body().props.focus.cur, "card.1", "back on the pose step, the ring on the pose chosen"); assert.deepEqual([UI.sit.pose, UI.sit.place], [o.poses[1], o.places[1]], "every choice kept inside the screen");
  say("card.1", "back"); assert.deepEqual([UI.screen, UI.hab.f, UI.sit], ["habitat", "portrait", null]); assert.ok(G.st.sitting, "nothing spent");
  // confirm only with both choices: a place step with no pose chosen takes no ✓; a confirm step with a choice missing does not arm
  enterSitting(h, mb); UI.sit.step = "place"; say("card.0", "confirm"); assert.equal(UI.sit.step, "place", "no pose chosen: the place step stays");
  UI.sit.step = "confirm"; UI.sit.pose = o.poses[0]; UI.sit.place = null; say("room", "confirm"); assert.equal(UI.sit.armed, null, "no place chosen: nothing arms");
  say("card.9", "confirm"); assert.equal(UI.sit.step, "confirm");
});

test("the armed confirm and begin: the first ✓ arms (the lit gilt), the second plays events.begin (the lit gilt dithers out, input held 480 ms) and at 300 ms spends the sitting (beginSitting) and goes to Habitat with the plate and the ring on Portrait", () => {
  const { h, mb, say, sent, dithers, at, body } = rig(); enterSitting(h, mb); const o = offerOf(mb);
  say("card.0", "confirm"); say("card.0", "confirm"); assert.equal(UI.sit.step, "confirm"); assert.equal(body().props.regions.gilt.picture, SIT.regions.gilt.slices.rest);
  say("room", "confirm"); assert.equal(UI.sit.armed, "room"); assert.equal(body().props.regions.gilt.picture, SIT.regions.gilt.slices.armed, "armed: the gilt lights");
  const n = sent.length; say("room", "confirm"); const g = dithers("gilt").at(-1);
  assert.deepEqual([g.from, g.ms, g.hold], ["sitting-gilt-lit-560x424", 300, 480]); assert.equal(UI.sit.step, "begin"); assert.equal(h.holding(), true); assert.ok(G.st.sitting, "nothing spent before the step at 300");
  at(299); assert.equal(UI.screen, "sitting"); assert.ok(!mb.portrait);
  at(300); assert.equal(G.st.sitting, null, "the sitting is spent"); assert.deepEqual([mb.portrait.state, mb.portrait.pose, mb.portrait.place], ["painting", o.poses[0], o.places[0]]);
  assert.deepEqual([UI.screen, UI.hab.f, UI.sit], ["habitat", "portrait", null]); assert.equal(FX.msg, "Dot's portrait is on its way", "the plate: beganPlate alone");
  assert.ok(sent.slice(n).some((m) => m.kind === "dither" && m.target === "stage" && m.ms === 180), "the screen change's dither"); assert.equal(h.holding(), true); at(480); assert.equal(h.holding(), false, "input held to 480 ms");
});

test("reduced motion: begin lands on Habitat on the frame of the second ✓ with its plate, no gilt dither, nothing held; the window's changes are cuts", () => {
  const { h, mb, say, dithers } = rig({ motion: false }); enterSitting(h, mb); const s0 = dithers("stage").length;
  say("card.0", "confirm"); assert.deepEqual([dithers("glass").length, dithers("resident").length], [0, 0], "the backdrop and the resident cut"); say("card.0", "confirm"); say("room", "confirm"); say("room", "confirm");
  assert.equal(UI.screen, "habitat"); assert.equal(G.st.sitting, null); assert.equal(dithers("gilt").length, 0); assert.equal(dithers("stage").length, s0, "the screen change is a cut"); assert.equal(h.holding(), false); assert.equal(FX.msg, "Dot's portrait is on its way");
});

test("the place step's window: entering it dithers the glass from Habitat's vivarium-near-{light} to the focused place's backdrop and the resident from the hour's light to ungraded on one 200 ms clock; the ring moving among the places dithers the glass alone; going back dithers both back; every from is the glass's own size", () => {
  const { h, mb, say, focus, dithers, at, body } = rig(); enterSitting(h, mb); const o = offerOf(mb), size = HAB.light.size.join("x");
  const r0 = body().props.regions.resident.picture; assert.match(r0, /:night$/, "the pose step: the hour's light");
  say("card.0", "confirm"); const g = dithers("glass").at(-1), r = dithers("resident").at(-1), B = SIT.events.backdrop;
  assert.deepEqual([g.from, g.ms, g.hold], [`vivarium-near-night-${size}`, B.ms, B.hold]); assert.deepEqual([r.from, r.ms], [r0, B.ms], "the resident rides the backdrop's clock (events.backdrop.resident dither)");
  assert.deepEqual(UI.sit.prev, { glass: g.from, resident: r0, cut: false }, "the froms stay on the face for the event");
  assert.equal(body().props.regions.glass.picture, `sitting-backdrop-${o.places[0]}-${size}`); assert.doesNotMatch(body().props.regions.resident.picture, /:night$/, "ungraded on the place step");
  at(200); assert.deepEqual(UI.sit.prev, { glass: null, resident: null, cut: false });
  const nr = dithers("resident").length; focus("card.1"); assert.equal(dithers("glass").at(-1).from, `sitting-backdrop-${o.places[0]}-${size}`); assert.equal(dithers("resident").length, nr, "moving among the places: the backdrop alone");
  at(400); say("card.1", "back"); assert.equal(dithers("glass").at(-1).from, `sitting-backdrop-${o.places[1]}-${size}`); assert.doesNotMatch(dithers("resident").at(-1).from, /:night$/); assert.match(body().props.regions.resident.picture, /:night$/, "back on the pose step: the hour's light");
  for (const e of dithers("glass")) assert.ok(e.from.endsWith("-" + size), "only pictures of habitat.json light.size: " + e.from);
});

test("events.backdrop.resident \"cut\": no resident dither; the window keeps the hour's picture until the backdrop's 200 ms end, then cuts to ungraded", () => {
  const keep = SPECS.sitting; SPECS.sitting = { ...keep, events: { ...keep.events, backdrop: { ...keep.events.backdrop, resident: "cut" } } };
  try {
    const { h, mb, say, dithers, at, body } = rig(); enterSitting(h, mb); const r0 = body().props.regions.resident.picture;
    say("card.0", "confirm"); assert.equal(dithers("resident").length, 0); assert.equal(dithers("glass").length, 1, "the backdrop still dithers");
    assert.equal(body().props.regions.resident.picture, r0, "until the end: the picture it had"); at(199); assert.equal(body().props.regions.resident.picture, r0);
    at(200); assert.notEqual(body().props.regions.resident.picture, r0, "cut at 200 to ungraded"); assert.doesNotMatch(body().props.regions.resident.picture, /:night$/);
  } finally { SPECS.sitting = keep; }
});

test("the pose step: a focus move to or from the curl cross-dithers the resident 16 levels over 180 ms, cut by the next press; a stand-to-stand move is a cut", () => {
  const { h, mb, focus, dithers, body } = rig(); enterSitting(h, mb); const o = offerOf(mb), at = (i) => "card." + i, curl = o.poses.indexOf("sleep-curled"), stands = o.poses.map((_, i) => i).filter((i) => i !== curl);
  focus(at(stands[0])); const a = body().props.regions.resident.picture; focus(at(curl)); const e = dithers("resident").at(-1);
  const P = SIT.events.pose; assert.deepEqual([e.kind, e.target, e.from, e.ms, e.levels, e.cut, e.hold], [P.kind, P.target, a, P.ms, P.levels, true, P.hold]); assert.deepEqual([P.ms, P.levels], [180, 16], "sitting.json events.pose: Habitat's 16 levels over 180 ms");
  const n = dithers("resident").length; focus(at(stands[0])); assert.equal(dithers("resident").length, n + 1, "from the curl: a dither too");
  focus(at(stands[1])); assert.equal(dithers("resident").length, n + 1, "stand to stand (shake and calm, or an owed habit's stand): a cut, whatever the picture");
});

test("sitting.json focus.vectors that leave the screen or arm: ← from the pose step and from the portrait go to Habitat with the ring on Portrait; ✓ on the confirm step arms the room", () => {
  for (const v of SIT.focus.vectors.filter((x) => x.screen || x.armed)) {
    dropPortraitSources(); const { h, mb, say } = rig(); const o = offerOf(mb);
    if (v.state === "portrait") { mb.portrait = { state: "delivered", pose: o.poses[0], place: o.places[0], crate: "sit1", start: T0, at: T0, digest: "00112233445566778899aabbccddeeff" }; assert.equal(injectPortraitSource(mb.portrait.digest, ART()).ok, true); assert.equal(enterSitting(h, mb, { state: "portrait" }), true); }
    else { enterSitting(h, mb); if (v.state === "confirm") { say("card.0", "confirm"); say("card.0", "confirm"); } }
    say(v.from, v.key);
    if (v.screen) assert.deepEqual([UI.screen, UI.hab.f], [v.screen, v.focus], JSON.stringify(v)); else assert.equal(UI.sit.armed, v.armed, JSON.stringify(v));
  }
  dropPortraitSources();
});

// Cargo's end (cargo.json keys.confirm.end, frame.json navigation.jumps): on the real host, a run that opened Dot's sitting crate ends with ✓ See the portrait; ✓ opens the sitting's state portrait (from cargo), ← goes to Habitat
// with the ring on Portrait. Without the opening kept, ✓ is Look at the pods, as before.
test("Cargo's end after a run that opened Dot's sitting crate: ✓ See the portrait opens the portrait full size, ← Habitat with the ring on Portrait; with the opening not kept, Look at the pods", () => {
  for (const held of [true, false]) {
    dropPortraitSources();
    const { h, mb, say, at } = rig({ motion: false, held: false }), DG = "0123456789abcdef0011223344556677";
    G.st.sittingCrates.push({ id: "sit1", mibiId: mb.id, pose: "sleep-curled", place: "wood", start: -1e10, source: "dev", painted: true, opened: false });
    mb.portrait = { state: "painting", pose: "sleep-curled", place: "wood", crate: "sit1", start: 0, digest: DG }; if (held) assert.equal(injectPortraitSource(DG, ART()).ok, true);
    G.sv.bay = [{ id: "c1", n: 1, turn: 2, at: T0, e: 3, d: 3, s: 4, met: [], explored: 5, of: 20, lines: [], pods: [{ id: "p0", species: "S01", sp: 0, g: "meadow", how: "calm", gs: 11, k: null }] }]; G.st.dock = { docked: true, at: T0 };
    UI.screen = "cargo"; UI.cargo = { state: "bay", crate: 0, at: 0, run: null, shown: null, arrival: null };
    dispatch(h, { screen: "cargo", target: "room", verb: "confirm" }); assert.equal(UI.cargo.state, "opening"); at(60000); assert.equal(UI.cargo.state, "end", held + ": the end"); assert.equal(mb.portrait.state, "delivered");
    const p = screenProps("").msg; assert.equal(p.frame.line.ok, held ? "See the portrait" : "Look at the pods", held + ": the line");
    dispatch(h, { screen: "cargo", target: "room", verb: "confirm" });
    if (!held) { assert.equal(UI.screen, "pods", "no opening kept: Look at the pods"); continue; }
    assert.deepEqual([UI.screen, UI.sit.step, UI.sit.from, UI.hab.id], ["sitting", "portrait", "cargo", mb.id]); assert.equal(sittingBody("night").props.state, "portrait"); assert.equal(UI.cargo.state, "bay", "the end closed");
    say("room", "back"); assert.deepEqual([UI.screen, UI.hab.f, UI.sit], ["habitat", "portrait", null], "← Habitat with the ring on Portrait");
  }
  dropPortraitSources();
});

test("the frame's notice counts a ready portrait apart, docked or away: a portrait alone, then both with walk crates; a portrait still filling is not counted", () => {
  const { mb } = rig({ motion: false, held: false }), crate = (n) => ({ id: "c" + n, n, turn: n, at: T0, e: 3, d: 3, s: 4, met: [], explored: 5, of: 20, lines: [], pods: [] });
  const need = (screen) => { UI.screen = screen; return screenProps("").msg.frame.line.need; };
  G.st.dock = { docked: true, at: T0 }; assert.equal(need("vivarium"), "", "nothing: no notice");
  G.st.sittingCrates.push({ id: "sit1", mibiId: mb.id, pose: "calm", place: "wood", start: Date.now() - 1e10, source: "dev", painted: true, opened: false });
  assert.equal(need("vivarium"), "A portrait waits in the Bay", "a ready portrait alone");
  G.sv.bay = [crate(1)]; assert.equal(need("vivarium"), "Bay: a crate and a portrait");
  G.sv.bay = [crate(1), crate(2), crate(3)]; assert.equal(need("vivarium"), "Bay: three crates and a portrait");
  G.st.dock = { docked: false, at: T0 }; assert.equal(need("vivarium"), "A portrait waits in the Bay", "away: the walk crates are not counted, the portrait still waits");
  G.st.dock = { docked: true, at: T0 }; G.sv.bay = [crate(1)]; G.st.sittingCrates[0].start = Date.now() + 1e9; assert.equal(need("vivarium"), "A crate waits in the Bay", "a portrait still filling is not counted");
});

test("the both-at-once notice fits the frame's notice zone in every form it takes (a crate, two, three, the count dropped): the notice role's width with the lamp and its gap within the zone, and within the word limit", () => {
  const metrics = JSON.parse(readFileSync(path.resolve(here, "../../face/dist/metrics.json"), "utf8")), R = SPECS.frame.regions.need, width = measureRole(metrics, SPECS.frame, R.role);
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.dock = { docked: true, at: T0 }; const sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], with: null, tier: 1, shield: 3 };
  const bad = [];
  for (const n of [1, 2, 3, 4]) {
    sv.bay = Array.from({ length: n }, (_, i) => ({ id: "c" + i, n: i + 1, turn: 1, at: 0, e: 0, d: 0, s: 0, pods: [] }));
    const text = capLine(S.need(st, sv, settings, {}, 1).text), w = width(text) + R.lampGap + R.lamp[0];
    console.log(`  both-at-once notice, ${n} crate${n > 1 ? "s" : ""}: "${text}" ${width(text)} px + lamp ${R.lampGap + R.lamp[0]} = ${w} of ${R.rect[2]}, ${text.trim().split(/\s+/).length} words (limit ${R.words})`);
    if (w > R.rect[2]) bad.push(`${text}: ${w} px with its lamp, the zone is ${R.rect[2]}`); if (text.trim().split(/\s+/).length > R.words) bad.push(`${text}: more than ${R.words} words`);
  }
  assert.deepEqual(bad, []);
});
