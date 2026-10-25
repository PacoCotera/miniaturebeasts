// The sitting as props (sitting.json): the view the face takes, views/sitting-props.mjs, in Node. Plain JSON that names what and never where: it validates against sitting.props.json in every state (pose, place, confirm, armed,
// begin, portrait) for Dot (S01 adult) with sleep-curled only and with sleep-curled and shake-dry, a juvenile and an S02; every mibi picture is mibiReq with poseFor's pose, so an owed habit key marks its requests; a card's three requests
// share one pose and one set of looks; the window is the hour's light on the pose step and ungraded after; the portrait state is offered only while its opening is held (portrait-source.mjs keeps the last two).
//   node --test prototypes/station/tests/sitting-props.test.mjs
import { lineCased } from "./fixtures/line-case.mjs";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as T from "../src/sitting.mjs";
import { poseFor, layeredStand, standFigure } from "../src/layered-stand.mjs";
import { loadStandLayersFs, loadStandLooksFs, unloadStands } from "../tools/stand-layers-fs.mjs";
import { sittingBuild as sittingBuildUnchecked, portraitOffered } from "../src/views/sitting-props.mjs";
const sittingBuild = lineCased(sittingBuildUnchecked, "sitting");   // every body it builds goes through assertLineCase (report mode)
import { lightAt } from "../src/views/home-props.mjs";
import { injectPortraitSource, dropPortraitSources, portraitOpening, portraitSource, OPENINGS_KEPT } from "../src/portrait-source.mjs";
import { registerPictures } from "../src/pictures.mjs";
import { asset as assetOf, assetEntry, dropAsset, manifest } from "../../ui/assets.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), specs = path.resolve(here, "../../ui/specs/station"), framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("sitting.json"), habitat = J("habitat.json"), frameSpec = J("frame.json"), schema = J("sitting.props.json"), Sg = spec.strings;
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000;

function validate(v, sc, at = "$", out = []) {
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if ("const" in sc && v !== sc.const) out.push(`${at}: ${JSON.stringify(v)} is not ${JSON.stringify(sc.const)}`);
  if (sc.enum && !sc.enum.includes(v)) { out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(sc.enum)}`); return out; }
  if (sc.type) {
    const ts = [].concat(sc.type), ty = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v;
    if (!ts.includes(ty) && !(ty === "integer" && ts.includes("number"))) { out.push(`${at}: a ${ty}, wanted ${ts.join(" or ")}`); return out; }
  }
  if (typeof v === "string" && sc.pattern && !new RegExp(sc.pattern).test(v)) out.push(`${at}: ${JSON.stringify(v)} does not match ${sc.pattern}`);
  if (typeof v === "number" && ((sc.minimum !== undefined && v < sc.minimum) || (sc.maximum !== undefined && v > sc.maximum))) out.push(`${at}: ${v} is outside ${sc.minimum}..${sc.maximum}`);
  if (Array.isArray(v) && sc.maxItems !== undefined && v.length > sc.maxItems) out.push(`${at}: more than ${sc.maxItems}`);
  if (Array.isArray(v) && sc.minItems !== undefined && v.length < sc.minItems) out.push(`${at}: fewer than ${sc.minItems}`);
  if (Array.isArray(v) && sc.items) v.forEach((x, i) => validate(x, sc.items, `${at}[${i}]`, out));
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const k of sc.required ?? []) if (!(k in v)) out.push(`${at}: ${k} is required`);
    for (const [k, x] of Object.entries(v)) { const p = sc.properties?.[k]; if (p) validate(x, p, `${at}.${k}`, out); else if (sc.additionalProperties === false) out.push(`${at}: ${k} is not a prop`); }
  }
  return out;
}

const sv0 = () => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, carryReqs: [] });
// Dot: one mibi of the species, its habits seen and its places been (its pod's place is the meadow, seedAdults)
function dot({ species = "S01", habits = ["sleep-curled"], walked = ["wood"], juvenile = false, from = null } = {}) {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.firstMibi = false; const mb = S.seedAdults(st, species, 5, 1, settings).mibis[0]; mb.name = "Dot";
  if (juvenile) mb.born = st.turn; if (from) mb.from.g = from;
  for (const h of habits) assert.ok(T.recordHabit(st, mb, h).ok, h); for (const g of walked) T.recordWalk(st, mb, g);
  return { st, mb };
}
const build = ({ st, mb }, ui, light = "day") => sittingBuild({ st, sv: sv0(), settings, light, mibiId: mb.id, ui }, spec, habitat);
const ART = (n) => { const a = new Uint8ClampedArray(528 * 392 * 4); for (let i = 0; i < a.length; i += 4) { a[i] = n; a[i + 1] = (i >> 2) & 255; a[i + 2] = 40; a[i + 3] = 255; } return a; };
const DIGEST = "0123456789abcdef0011223344556677";
const portray = (w, pose, place, digest = DIGEST) => { w.mb.portrait = { state: "delivered", pose, place, crate: "sit1", start: T0, at: T0, digest }; return w; };
const mibiReqs = (b) => b.requests.filter((r) => r.kind === "mibi");
const wipe = () => { for (const e of manifest()) if (/^(mibi:|portrait:|stamp:)/.test(e.id)) dropAsset(e.id); };

before(() => { loadStandLooksFs(); loadStandLayersFs(); });
after(() => { wipe(); dropPortraitSources(); unloadStands(); });

// every state of one mibi: the steps walked with its first habit and its first place
const states = (w, habit, place) => ({
  pose: build(w, { step: "pose" }),
  place: build(w, { step: "place", pose: habit }),
  confirm: build(w, { step: "confirm", pose: habit, place }),
  armed: build(w, { step: "confirm", pose: habit, place, armed: "room" }),
  begin: build(w, { step: "begin", pose: habit, place, armed: "room" }),
});
const KINDS = {
  "Dot (S01 adult), sleep-curled only": () => dot(),
  "Dot (S01 adult), sleep-curled and shake-dry": () => dot({ habits: ["sleep-curled", "shake-dry"] }),
  "a juvenile (S01), sleep-curled": () => dot({ juvenile: true }),
  "an S02 adult, sleep-curled and sniff": () => dot({ species: "S02", habits: ["sleep-curled", "sniff"] }),
};

describe("each state's props validate against sitting.props.json, name no rectangle and fit the budget", () => {
  for (const [name, mk] of Object.entries(KINDS)) test(name, () => {
    const w = mk(), habit = S.habitsOf(w.mb)[0], all = states(w, habit, "wood");
    injectPortraitSource(DIGEST, ART(1)); all.portrait = build(portray(mk(), habit, "wood"), { step: "portrait" });
    for (const [st, b] of Object.entries(all)) {
      assert.ok(b, st); const bad = validate(b.props, schema); assert.deepEqual(bad, [], `${st}: ${bad.slice(0, 3).join("; ")}`);
      const json = JSON.stringify(b.props); assert.ok(!/"(x|y|w|h|rect|at|box|pitch|colour|color)"\s*:/.test(json), `${st}: props name what, never where`);
      assert.ok(json.length + JSON.stringify(b.line).length < 8 * 1024, `${st}: ${json.length} bytes`);
      assert.equal(b.props.state, st === "armed" ? "confirm" : st);
      for (const r of b.requests) assert.ok(["slot", "mibi", "portrait", "stamp"].includes(r.kind), `${st}: ${r.kind}`);
    }
    dropPortraitSources();
  });
});

test("the regions by state: the glass, the gilt, the heading, the cards, the chosen pair, the stamp, the steps and the focus", () => {
  const w = dot({ habits: ["sleep-curled", "shake-dry"], walked: ["wood", "pond"] }), b = states(w, "sleep-curled", "wood"), R = (s) => b[s].props.regions;
  // the glass: Habitat's own picture in the hour's light on the pose step (here day), the focused place's backdrop on the place step, the chosen place's after
  assert.equal(R("pose").glass.picture, "vivarium-near-day-544x408"); assert.equal(R("place").glass.picture, "sitting-backdrop-meadow-544x408", "the focused place card: card.0, the pod's place");
  assert.equal(build(w, { step: "place", pose: "sleep-curled", focus: "card.2" }).props.regions.glass.picture, "sitting-backdrop-pond-544x408");
  for (const s of ["confirm", "armed", "begin"]) assert.equal(R(s).glass.picture, "sitting-backdrop-wood-544x408", s);
  // the gilt: none on pose and place, at rest on confirm, lit when armed and through begin
  assert.deepEqual(["pose", "place", "confirm", "armed", "begin"].map((s) => R(s).gilt.picture), ["", "", "sitting-gilt-560x424", "sitting-gilt-lit-560x424", "sitting-gilt-lit-560x424"]);
  assert.deepEqual(["pose", "place", "confirm", "begin"].map((s) => R(s).heading.text), [Sg.heading.pose, Sg.heading.place, Sg.heading.confirm, Sg.heading.confirm]);
  // the cards: the poses in the species frame's habit order, the places as walked (the pod's place first); each on the 120 well; none from the confirm step
  assert.deepEqual(R("pose").cards.items.map((c) => c.pose), ["shake-dry", "sleep-curled"]); assert.deepEqual(R("place").cards.items.map((c) => c.place), ["meadow", "wood", "pond"]);
  assert.deepEqual(R("place").cards.items.map((c) => c.picture), ["place-meadow-96x96", "place-wood-96x96", "place-pond-96x96"]);
  for (const s of ["pose", "place"]) for (const c of R(s).cards.items) assert.equal(c.well, "plate-well-120x120");
  for (const s of ["confirm", "begin"]) { assert.deepEqual(R(s).cards.items, []); assert.equal(R(s).chosen.items.length, 2); assert.equal(R(s).chosen.items[1].picture, "place-wood-96x96"); }
  for (const s of ["pose", "place"]) assert.deepEqual(R(s).chosen.items, []);
  assert.deepEqual(R("confirm").chosen.items[0].picture, mibiReqs(b.confirm).find((r) => r.size[0] === 96).id, "the chosen pose card is the pose card's own picture");
  // the steps: current, done (the chosen picture at 48) or ahead, on their wells
  const steps = (s) => R(s).steps.items.map((i) => [i.state, i.word, i.picture === null ? null : "pic", i.well, i.frame]);
  assert.deepEqual(steps("pose"), [["current", "Pose", null, "plate-well-152x48-shown", ""], ["ahead", "Place", null, "plate-well-152x48", ""], ["ahead", "Portray", null, "plate-well-152x48", ""]]);
  assert.deepEqual(steps("place"), [["done", "Pose", "pic", "plate-well-152x48", ""], ["current", "Place", null, "plate-well-152x48-shown", ""], ["ahead", "Portray", null, "plate-well-152x48", ""]]);
  for (const s of ["confirm", "begin"]) assert.deepEqual(steps(s), [["done", "Pose", "pic", "plate-well-152x48", ""], ["done", "Place", "pic", "plate-well-152x48", ""], ["current", "Portray", null, "plate-well-152x48-shown", ""]]);
  assert.equal(R("confirm").steps.items[1].picture, "place-wood-48x48");
  // the stamp shows only in state portrait; the deck and the strip are device plates 1:1
  for (const s of ["pose", "place", "confirm", "begin"]) assert.deepEqual(R(s).stamp, { size: 0, N: 0, cell: 0, plate: "", asset: "", corner: "" });
  assert.deepEqual([R("pose").deck.plate, R("pose").strip.plate], ["plate-device-416x424", "plate-device-992x64"]);
  // the focus: the cards on pose and place, the ring kept on a valid card, card.0 else (or the card chosen before); the room after, armed only on the armed confirm
  assert.deepEqual(b.pose.props.focus, { cur: "card.0", targets: [{ id: "card.0", group: "card", enabled: true }, { id: "card.1", group: "card", enabled: true }], armed: null });
  assert.equal(build(w, { step: "pose", pose: "sleep-curled" }).props.focus.cur, "card.1", "coming back a step: the card chosen before"); assert.equal(build(w, { step: "pose", focus: "card.1" }).props.focus.cur, "card.1"); assert.equal(build(w, { step: "pose", focus: "card.5" }).props.focus.cur, "card.0");
  assert.deepEqual([b.confirm.props.focus, b.armed.props.focus.armed, b.begin.props.focus.armed], [{ cur: "room", targets: [], armed: null }, "room", null]);
  // the bottom line by state
  assert.deepEqual(b.pose.line, { ok: Sg.thisPose, subject: habitat.strings.watchHabits["shake-dry"], back: "Dot", need: null });
  assert.equal(build(w, { step: "pose", focus: "card.1" }).line.subject, "curled up asleep");
  assert.deepEqual(b.place.line, { ok: Sg.thisPlace, subject: "the meadow", back: Sg.steps.pose, need: null });
  assert.deepEqual(b.confirm.line, { ok: "Portray Dot", subject: Sg.once, back: Sg.steps.place, need: null }); assert.equal(b.armed.line.ok, "Again: portray Dot");
  assert.deepEqual(b.begin.line, { ok: null, subject: "", back: null, need: null });
});

test("the resident: the focused card's habit on the pose step in the hour's light, the chosen pose ungraded after; its figure is the picture's own", () => {
  const w = dot({ habits: ["sleep-curled", "shake-dry"] }), light = lightAt(23, frameSpec.light);   // 23:30
  assert.notEqual(light, "day");
  const pose = build(w, { step: "pose", focus: "card.1" }, light).props.regions.resident;   // card.1: sleep-curled (the frame's order: shake-dry, calm, sleep-curled)
  assert.equal(pose.pose, "sleep-curled"); assert.ok(pose.picture.endsWith(":" + light), "the pose step: the hour's light, as Habitat");
  for (const s of ["place", "confirm", "begin"]) {
    const r = build(w, { step: s, pose: "sleep-curled", place: "wood" }, light).props.regions.resident;
    assert.ok(!/:(dawn|dusk|night)$/.test(r.picture), `${s} at 23:30: the resident's id has no light suffix (ungraded)`); assert.equal(r.pose, "sleep-curled");
    assert.equal(r.picture, pose.picture.slice(0, -(light.length + 1)), "the same composition, ungraded");
  }
  assert.deepEqual(pose.figure, standFigure(layeredStand("S01", "adult", [304, 312], "habitat", "curl"), mibiReqs(build(w, { step: "pose", focus: "card.1" }, light)).find((r) => r.size[0] === 304).looks), "the curl's own figure");
  assert.deepEqual([pose.figure[2], pose.figure[3]], [129, 95], "the adult curl at the Habitat factor (the re-signed key, its painted contact shadow out)");
  const juv = build(dot({ juvenile: true }), { step: "place", pose: "sleep-curled" }).props.regions.resident; assert.equal(juv.stage, "juvenile"); assert.deepEqual([juv.figure[2], juv.figure[3]], [103, 79], "the juvenile curl");
  assert.equal(build(dot({ species: "S02" }), { step: "pose" }).props.regions.resident.figure, null, "S02 has no layered stand: no figure");
  const t = build(w, { step: "pose", focus: "card.0" }).props.regions.resident; assert.equal(t.pose, "shake-dry");
  assert.deepEqual(t.figure, standFigure(layeredStand("S01", "adult", [304, 312], "habitat", "shake"), mibiReqs(build(w, { step: "pose", focus: "card.0" })).find((r) => r.size[0] === 304).looks), "shake-dry draws its signed key: the shake's own figure");
});

test("every mibi picture is mibiReq with poseFor's pose: a card's three requests (card 96, thumb 48, window 304 × 312) share one pose and one set of looks", () => {
  for (const [species, habit] of [["S01", "sleep-curled"], ["S01", "shake-dry"], ["S02", "sniff"]]) {
    const w = dot({ species, habits: [habit] }), b = build(w, { step: "confirm", pose: habit, place: "wood" }), rs = mibiReqs(b), p = poseFor(species, "adult", habit);
    assert.deepEqual(rs.map((r) => r.size.join("x")).sort(), ["304x312", "48x48", "96x96"], "the chosen card, the step's thumb and the window"); assert.equal(new Set(rs.map((r) => r.id)).size, 3);
    for (const r of rs) { assert.equal(r.pose, p.pose === "anchor" ? undefined : p.pose); assert.deepEqual(r.looks, rs[0].looks); assert.equal(r.owed, p.owed ?? undefined); assert.equal(r.light, undefined, "day: ungraded"); }
    assert.deepEqual(rs.map((r) => r.view).sort(), species === "S02" ? [undefined, undefined, undefined] : ["default", "default", "habitat"]);
  }
});

test("owed habit keys: Dot with sleep-curled alone owes nothing; with shake-dry, whose key is cut, nothing is owed and its three requests carry the shake; an S02's every pose is owed", () => {
  const curl = dot(); for (const b of Object.values(states(curl, "sleep-curled", "wood"))) for (const r of b.requests) assert.equal(r.owed, undefined, r.id);
  const both = dot({ habits: ["sleep-curled", "shake-dry"] }), pose = build(both, { step: "pose" }), cards = mibiReqs(pose).filter((r) => r.size[0] === 96);
  assert.deepEqual(cards.map((r) => [r.pose, r.owed ?? null]), [["shake", null], ["curl", null]], "neither card is owed");
  const sd = build(both, { step: "confirm", pose: "shake-dry", place: "wood" }); assert.deepEqual(mibiReqs(sd).map((r) => [r.pose, r.owed]), [["shake", undefined], ["shake", undefined], ["shake", undefined]], "card, thumb and window");
  const s02 = dot({ species: "S02", habits: ["sleep-curled", "sniff", "puff"] });
  for (const b of [build(s02, { step: "pose" }), build(s02, { step: "confirm", pose: "puff", place: "wood" })]) { const rs = mibiReqs(b); assert.ok(rs.length >= 3); for (const r of rs) assert.match(r.owed, /^habit key /); }
  assert.deepEqual(mibiReqs(build(s02, { step: "pose" })).filter((r) => r.size[0] === 96).map((r) => r.owed), ["habit key sniff", "habit key puff", "habit key sleep-curled"], "the S02 frame's order");
});

test("the places in the frame's order: the pod's place first, then the order walked to; a bred mibi only the places it walked to", () => {
  const w = dot({ walked: ["cave", "rock", "wood"] }); assert.deepEqual(build(w, { step: "place", pose: "sleep-curled" }).props.regions.cards.items.map((c) => c.place), ["meadow", "cave", "rock", "wood"]);
  const r = dot({ walked: ["pond", "meadow"], from: "rock" }); assert.deepEqual(build(r, { step: "place", pose: "sleep-curled" }).props.regions.cards.items.map((c) => c.place), ["rock", "pond", "meadow"]);
  const c = dot({ walked: ["wood", "cave"] }); c.mb.from.how = "cross"; assert.deepEqual(build(c, { step: "place", pose: "sleep-curled" }).props.regions.cards.items.map((x) => x.place), ["wood", "cave"]);
});

test("the portrait state is offered only while portraitOpening holds its digest: the picture 1:1, the gilt at rest, the stamp with its corner, every step done", () => {
  dropPortraitSources(); wipe();
  const w = portray(dot({ walked: ["wood"] }), "sleep-curled", "wood");
  assert.equal(portraitOffered(w.mb), false); assert.equal(build(w, { step: "portrait" }), null, "not entered: its opening is not held");
  injectPortraitSource(DIGEST, ART(7)); assert.equal(portraitOffered(w.mb), true);
  const b = build(w, { step: "portrait" }), R = b.props.regions;
  assert.equal(b.props.state, "portrait"); assert.equal(R.portrait.picture, `portrait:${DIGEST.slice(0, 16)}:528x392`); assert.deepEqual(b.requests.find((r) => r.id === R.portrait.picture), { kind: "portrait", id: R.portrait.picture, digest: DIGEST, size: [528, 392] });
  assert.equal(R.gilt.picture, "sitting-gilt-560x424", "at rest, never lit"); assert.equal(build(w, { step: "portrait", armed: "room" }).props.regions.gilt.picture, "sitting-gilt-560x424");
  assert.deepEqual([R.resident.picture, R.resident.figure, R.nameTag.text], ["", null, ""], "the resident and the tag are slots"); assert.equal(R.glass.picture, "sitting-backdrop-wood-544x408");
  assert.equal(R.heading.text, "Dot's portrait"); assert.deepEqual(R.cards.items, []); assert.equal(R.chosen.items.length, 2);
  assert.equal(R.stamp.corner, "spread-gilt-corner-16x16"); assert.equal(R.stamp.plate, "plate-well-120x120"); assert.match(R.stamp.asset, /^stamp:/); assert.ok(R.stamp.size > 0 && R.stamp.size <= 104);
  assert.deepEqual(R.steps.items.map((i) => [i.state, i.frame]), [["done", ""], ["done", ""], ["done", "sitting-frame-portrait-48x40"]]); assert.equal(R.steps.items[2].picture, `portrait:${DIGEST.slice(0, 16)}:40x30`);
  assert.deepEqual(b.props.focus, { cur: "room", targets: [], armed: null }); assert.deepEqual(b.line, { ok: null, subject: Sg.portraitContext, back: "Dot", need: null }); assert.equal(Sg.portraitContext, "painted and framed", "the context is the copywriter's (CW-2)");
  // the picture: derived from the kept opening, byte for byte; an empty slot once it is no longer kept
  registerPictures(b.requests.filter((r) => r.kind === "portrait"), {}); const e = assetEntry(R.portrait.picture);
  assert.deepEqual([e.status, e.w, e.h], ["derived", 528, 392]); assert.ok(Buffer.from(assetOf(R.portrait.picture).rgba()).equals(Buffer.from(ART(7))));
  // two later digests push it out (the last two are kept): not offered any more
  injectPortraitSource("1".repeat(32), ART(2)); injectPortraitSource("2".repeat(32), ART(3)); assert.equal(OPENINGS_KEPT, 2);
  assert.equal(portraitOpening(DIGEST), null); assert.ok(portraitSource(DIGEST), "the 40 × 30 stays"); assert.equal(build(w, { step: "portrait" }), null);
  wipe(); registerPictures(b.requests.filter((r) => r.kind === "portrait" && r.size[0] === 528), {}); assert.deepEqual([assetEntry(R.portrait.picture).status, assetEntry(R.portrait.picture).w], ["empty", 528], "no kept opening: an empty slot");
  // a painting crate (not yet delivered) is never offered
  injectPortraitSource(DIGEST, ART(7)); w.mb.portrait.state = "painting"; assert.equal(build(w, { step: "portrait" }), null); w.mb.portrait.state = "delivered"; assert.ok(build(w, { step: "portrait" }));
  dropPortraitSources(); assert.equal(build(w, { step: "portrait" }), null, "dropPortraitSources clears the openings");
  wipe();
});

test("portrait-source keeps the 528×392 opening for the last two digests, least recently used out first; reading one keeps it; a refused source keeps nothing", () => {
  dropPortraitSources();
  const [a, b, c] = ["a", "b", "c"].map((x) => x.repeat(32));
  injectPortraitSource(a, ART(1)); injectPortraitSource(b, ART(2)); assert.ok(portraitOpening(a), "reading a makes it the most recent");
  injectPortraitSource(c, ART(3)); assert.equal(portraitOpening(b), null, "b was the least recently used"); assert.ok(portraitOpening(a) && portraitOpening(c));
  assert.deepEqual([portraitOpening(c).w, portraitOpening(c).h], [528, 392]); assert.equal(portraitOpening(c).rgba()[0], 3);
  const src = ART(9); injectPortraitSource(a, src); src[0] = 0; assert.equal(portraitOpening(a).rgba()[0], 9, "the opening is a copy");
  const bad = ART(4); bad[3] = 0; assert.ok(injectPortraitSource("d".repeat(32), bad).error); assert.equal(portraitOpening("d".repeat(32)), null);
  dropPortraitSources(); assert.equal(portraitOpening(a), null); assert.equal(portraitSource(a), null);
});

test("the pictures register: every request of every state (the layered cards, thumbs and windows, the slots, the stamp and the portraits)", () => {
  const w = dot({ habits: ["sleep-curled", "shake-dry"] }); injectPortraitSource(DIGEST, ART(5));
  const env = { podById: () => null, frameOf, mibiGenome: (i) => S.mibiById(w.st, i)?.genome };
  const all = [...Object.values(states(w, "shake-dry", "wood")), build(portray(w, "sleep-curled", "wood"), { step: "portrait" })];
  for (const b of all) { registerPictures(b.requests, env); for (const r of b.requests) assert.ok(assetEntry(r.id), r.id); }
  dropPortraitSources(); wipe();
});

test("a Lift mid-ceremony: in state confirm, while beginBlock says the mibi sits when you dock, the line is { ok null, habitat.json strings.portraitOut, ← strings.steps.place } and the gilt does not light, even armed; docked again, ✓ Portray", () => {
  const w = dot({ habits: ["sleep-curled", "calm"], walked: ["wood"] }), ui = { step: "confirm", pose: "calm", place: "wood", focus: null, armed: null }; w.st.sitting = { source: "dev", key: null, at: T0 }; w.st.dock = { docked: true, at: T0 };
  const at = (docked, armed = null) => { w.st.dock = { docked, at: T0 }; return sittingBuild({ st: w.st, sv: { ...sv0(), carried: docked ? [] : [w.mb.id] }, settings, light: "day", mibiId: w.mb.id, ui: { ...ui, armed } }, spec, habitat); };
  assert.equal(T.beginBlock(w.st, w.mb, "calm", "wood", { ...sv0(), carried: [w.mb.id] }), "", "docked, nothing blocks");
  w.st.dock = { docked: false, at: T0 }; assert.equal(T.beginBlock(w.st, w.mb, "calm", "wood", { ...sv0(), carried: [w.mb.id] }), habitat.strings.portraitOut, "the rule's word is habitat.json's portraitOut");
  for (const armed of [null, "room"]) {
    const b = at(false, armed); assert.deepEqual(validate(b.props, schema), []);
    assert.deepEqual(b.line, { ok: null, subject: habitat.strings.portraitOut, back: Sg.steps.place, need: null }, "the confirm step reads portraitOut, ✓ has no cap");
    assert.equal(b.props.regions.gilt.picture, spec.regions.gilt.slices.rest, "the gilt does not light"); assert.equal(b.props.focus.armed, null);
    assert.deepEqual(b.props.regions.chosen.items.map((x) => x.picture).length, 2, "both choices kept");
  }
  const d = at(true); assert.deepEqual(d.line, { ok: "Portray Dot", subject: Sg.once, back: Sg.steps.place, need: null }, "docked: ✓ Portray again"); assert.equal(d.props.regions.gilt.picture, spec.regions.gilt.slices.rest);
  w.st.dock = { docked: false, at: T0 };
  const notCarried = sittingBuild({ st: w.st, sv: sv0(), settings, light: "day", mibiId: w.mb.id, ui }, spec, habitat); assert.equal(notCarried.line.ok, "Portray Dot", "lifted but not carried: nothing blocks");
});

test("regions.glass.load: on the place step the requests hold every place card's backdrop (at most five), the focused one first; the pose step asks for none, the confirm step for the chosen one alone", () => {
  const size = habitat.light.size.join("x"), w = dot({ habits: ["sleep-curled"], walked: ["pond", "rock", "wood", "cave"] }), places = T.offer(w.st, w.mb, sv0()).places;
  assert.equal(places.length, 5);
  const backdrops = (b) => b.requests.filter((r) => r.id.startsWith("sitting-backdrop-")).map((r) => r.id);
  const p = build(w, { step: "place", pose: "sleep-curled", place: null, focus: "card.4", armed: null });
  assert.equal(p.props.regions.glass.picture, `sitting-backdrop-${places[4]}-${size}`);
  assert.deepEqual(backdrops(p), [places[4], ...places.slice(0, 4)].map((g) => `sitting-backdrop-${g}-${size}`), "every place's backdrop, once, the focused first");
  for (const id of backdrops(p)) assert.ok(spec.regions.glass.backdrops.includes(id), id + " is one of regions.glass.backdrops");
  assert.deepEqual(backdrops(build(w, { step: "pose", pose: null, place: null, focus: null, armed: null })), []);
  assert.deepEqual(backdrops(build(w, { step: "confirm", pose: "sleep-curled", place: "rock", focus: null, armed: null })), [`sitting-backdrop-rock-${size}`]);
});
