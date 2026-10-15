// One mibi up close and the namer on the face (lvgl-switch.md §4 V): the words and the binding table (screens/habitat.c, screens/namer.c) on the props views/habitat-props.mjs and views/namer-props.mjs give, in Node on the WebAssembly build: every scene draws without
// an error or a refusal inside the object and picture budgets with no region departing from habitat.json (tools/habitat-regions.mjs, proved here to fail on a moved region), the namer drawn over it as an overlay (open and close are cuts: their dirty areas under the
// ceilings the architect measured, the named flash under a quarter of the screen, the namer's nodes gone when it closes, habitat's node order unchanged, no ring of habitat's while it is open), the keys (the pad is habitat.json's graph; the namer's own graph while it
// is open; ✓ ← and the room keys are intents with the overlay's id) and the events: the placeholder's two hops, the stamp's print, the swap's dither and the tag's flash. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/habitat.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames, frameOf } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { habitatBuild } from "../../station/src/views/habitat-props.mjs";
import { namerBuild } from "../../station/src/views/namer-props.mjs";
import { departures } from "../tools/habitat-regions.mjs";
import { dirty, dirtyRects } from "./dirty.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), spec = J("habitat"), namerSpec = J("namer"), homeSpec = J("home");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const T0 = 1_000_000, R = spec.regions, cfg = (bays) => ({ ...S.DEFAULT_SETTINGS, economy: "decided", bays });

// ---- scenes: the state through the rules, the props through the views ----
function scene(o = {}) {
  const settings = cfg(o.bays ?? 8), st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: !o.away, at: T0 };
  S.seedAdults(st, "S01", 5, o.adults ?? 4, settings); for (const m of st.mibis) m.paint = { state: "landed" };
  if (o.waiting) st.mibis[0].paint = { state: "sent" };
  if (o.portrait) { st.sitting = { source: "dev", key: null, at: 0 }; if (o.portrait === "portrayed") st.mibis[0].portrait = { state: "delivered", ...(o.digest ? { digest: o.digest } : {}) }; }   // a sitting held; portrayed: its portrait came, with its picture when the digest is named
  if (o.bonded) { st.mibis[0].bonded = true; st.mibis[0].notches = 3; }
  const sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: (o.carry ?? []).map((i) => st.mibis[i].id), tier: 1, shield: 3, carryReqs: [] };
  const m = { st, sv, settings, docked: S.docked(st), light: o.light ?? "day", focus: o.focus ?? null, habId: st.mibis[o.shown ?? 0].id, meetId: o.meet ? st.mibis[o.shown ?? 0].id : null, armed: !!o.armed };
  const b = habitatBuild(m, spec, frameSpec, homeSpec);
  if (o.namer) { const n = { mode: o.meet ? "meet" : "rename", id: b.shown.id, text: o.text ?? b.shown.name, fs: o.fs ?? "selected", page: o.page ?? "letters", shift: false, f: o.nf ?? "act.done", say: o.say ?? null, sugg: -1 }, nb = namerBuild({ st, mibi: b.shown, ui: n }, namerSpec); b.props.overlay = nb.overlay; b.line = nb.line; b.requests = [...b.requests, ...nb.requests]; if (o.meet) { b.props.state = "rest"; b.props.regions.meetRibbon.text = ""; b.props.regions.nameTag.text = b.shown.name; } }
  return { ...b, st, m };
}
const frameProps = (line = {}) => ({ top: { screen: "habitat", title: "Vivarium", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: "Vivarium", need: "", ...line }, plate: { text: "" } });
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function standIn(id, size) { const [w, h] = size, d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d }; }
const SIZES = { "frame-companion-outline-16x24": [16, 24], "frame-companion-solid-16x24": [16, 24], "home-lamp-sky-12x12": [12, 12], "home-lamp-hairline-12x12": [12, 12], "home-lamp-sprout-12x12": [12, 12], "home-lamp-amber-12x12": [12, 12], "frame-lamp-8-stone": [8, 8], "heart-full-24": [24, 24], "notch-skill-16x24": [16, 24], "mark-out-with-companion-64x96": [64, 96], "face-loika-24": [24, 24], "face-loika-24-away": [24, 24] };
const sizeOf = (r) => Array.isArray(r.size) ? r.size : typeof r.size === "number" ? [r.size, r.size] : r.kind === "emblem" ? [24, 24] : [16, 16];
let UNSIGNED = null;   // ids whose master is not placed: no picture is handed to the face for them (fix 3c-habitat)
const push = (f, b, over = {}) => { const props = { screen: "habitat", ...b.props, motion: f.motion, frame: frameProps(b.line), ...over }; for (const r of b.requests) if (!UNSIGNED?.has(r.id)) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r)))); for (const [id, sz] of Object.entries(SIZES)) f.handleOf(id, withPolicy((i) => standIn(i, sz))); return f.props(props); };
async function start(b, { motion = true, t0 = 0 } = {}) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["habitat", spec], ["namer", namerSpec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0, f.errors().join("; "));
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  f.t = t0; f.motion = motion; f.build = b;
  assert.equal(push(f, b), 0, f.errors().join("; ")); frames(f); return f;
}
const frames = (f, n = 2, dt = 16) => { for (let i = 0; i < n; i++) f.frame((f.t += dt)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
const dirtyOf = (f, o) => dirty(f, o);   // raw: every rectangle LVGL says it redraws
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };
const withFocus = (f, cur) => { if (f.build.props.overlay) f.build.props.overlay.focus.cur = cur; else f.build.props.focus.cur = cur; assert.equal(push(f, f.build), 0, f.errors().join("; ")); frames(f); };

const SCENES = {
  "rest, the ring on the resident": { focus: "resident" },
  "the meet: the ribbon in the tag's place": { meet: true, focus: "resident" },
  "out with the Companion: the out mark, the ring on the name": { carry: [0], away: true, focus: "name" },
  "a bonded mibi: the heart, three notches": { bonded: true, focus: "plate.0" },
  "its painting on its way: the placeholder's lamp": { waiting: true, focus: "resident" },
  "twelve bays, compact tiles": { bays: 12, adults: 12, focus: "tile:3" },
  "the ring on the Companion, the Cross and the Wild modules": { focus: "door" }, "the ring on Cross": { focus: "cross" }, "the ring on Wild, armed": { focus: "wild", armed: true },
  "by the light of dusk": { light: "dusk", focus: "resident" },
  "the namer over the meet": { meet: true, namer: true }, "the namer, typed, the accents page": { namer: true, fs: "typed", text: "Mo", page: "accents", nf: "key.3" }, "the namer, a refusal": { namer: true, say: { text: "Start with a letter", tone: "refused" } },
};
for (const [name, o] of Object.entries(SCENES)) {
  test(`one mibi up close, ${name}: draws without an error or a refusal inside the budgets, with no region departing from habitat.json`, { skip }, async () => {
    const b = scene({ ...o, focus: o.focus?.startsWith("tile:") ? undefined : o.focus }); if (o.focus?.startsWith("tile:")) { b.props.focus.cur = "tile." + b.st.mibis[+o.focus.slice(5)].id; }
    const f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const lg = logOf(f); assert.deepEqual(departures(lg, spec, namerSpec, b.props.state, b.props.focus.cur, b.props.regions.tiles.items.length, !!b.props.overlay), []);
    const st = f.stats(); assert.ok(st.pictures <= 200, `${st.pictures} pictures`); assert.ok(f.objects() <= 400, `${f.objects()} objects`);
    assert.ok(JSON.stringify(b.props).length + JSON.stringify(b.line).length < 32 * 1024, "props under 32 KiB");
    if (b.props.overlay) { assert.ok(!lg.regions.some((r) => r.id === "focus" && r.layer === "chrome" && !(r.rect[0] >= 588)), "habitat draws no ring of its own while the namer is open"); }
    console.log(`# ${name}: ${f.objects()} objects, ${st.pictures} pictures`);
  });
}

test("the departure check bites: the card moved, a plate off its pitch, a module off its rectangle, the name tag off the glass, a word past the field are each found", { skip }, async () => {
  const b = scene({ focus: "resident", namer: true }), f = await start(b), lg = logOf(f), n = b.props.regions.tiles.items.length;
  const bad = (fn) => { const c = JSON.parse(JSON.stringify(lg)); fn(c); return departures(c, spec, namerSpec, b.props.state, b.props.focus.cur, n, true); };
  assert.deepEqual(departures(lg, spec, namerSpec, b.props.state, b.props.focus.cur, n, true), []);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "card" && r.layer === "painted").rect[0] += 8; })[0], /card/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "door.plate" && r.layer === "painted" && r.rect[2] === 272).rect[1] += 8; })[0], /door module/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "nameTag" && r.layer === "chrome" && r.rect[2] > 2).rect[0] = 2; })[0], /tag/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "field" && r.layer === "type").rect[0] = 940; })[0], /field/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "panel" && r.layer === "painted").rect[2] += 40; })[0], /panel/);
});

test("the namer opens and closes as cuts: the raw dirty area of the opening and of the closing is under the architect's ceilings (panel with its shadow, the ribbon and the tag, the feet ring, the bottom line); opening on a cut moment adds the resident's lifted box; the named flash frames stay under a quarter of the screen; the nodes are gone when it closes", { skip }, async () => {
  const CEIL = 178_486 + 12_160 + 7_680 + 38_912, WITH_MOMENT = CEIL + 96_064;
  const b0 = scene({ meet: true, focus: "resident" }), f = await start(b0); const objects0 = f.objects();
  const b1 = scene({ meet: true, namer: true }); frames(f); assert.equal(dirtyOf(f), 0, "the settled meet: nothing dirty");
  assert.equal(push(f, b1), 0, f.errors().join("; ")); frames(f, 1); const openRects = dirtyRects(f), open = dirtyOf(f), opened = f.objects(); assert.ok(!openRects.some(([x, y]) => x === 0 && y === 0), `the opening redraws nothing at the origin: ${JSON.stringify(openRects.filter(([x, y]) => x === 0 && y === 0))}`); assert.ok(opened > objects0 && opened <= 400, `${opened} objects open`);
  assert.ok(open <= CEIL, `the opening ✓ redraws ${open} px, over ${CEIL}`); console.log(`# the opening ✓: ${open} px dirty (ceiling ${CEIL}), ${opened} objects`);
  const b2 = scene({ meet: false, focus: "resident" }); b2.props.regions.nameTag.text = b0.shown.name; frames(f); dirtyOf(f);
  assert.equal(push(f, { ...b2, props: { ...b2.props, state: "rest" } }), 0, f.errors().join("; ")); frames(f, 1); const close = dirtyOf(f);
  assert.ok(close <= CEIL, `the closing redraws ${close} px, over ${CEIL}`); console.log(`# the closing: ${close} px dirty (ceiling ${CEIL})`);
  // the namer's nodes are gone: the same screen with no overlay has as many objects as the settled rest drew before it opened
  const f2 = await start(b2); assert.equal(f.objects(), f2.objects(), "the namer's nodes are gone with it");
  // the opening ✓ of a meet whose moment is still playing: the key cuts the moment, so the resident's lifted box is redrawn with the panel
  const g = await start(scene({ meet: true, focus: "resident" })); g.send({ t: "event", kind: "moment", target: "resident", ms: 1800, hold: 0, cut: true }); frames(g, 10); dirtyOf(g);
  g.send({ t: "key", k: "confirm" }); assert.equal(push(g, scene({ meet: true, namer: true })), 0, g.errors().join("; ")); frames(g, 1); const momentRects = dirtyRects(g), withMoment = dirtyOf(g); assert.ok(!momentRects.some(([x, y]) => x === 0 && y === 0), "the opening on a cut moment redraws nothing at the origin");
  assert.ok(withMoment <= WITH_MOMENT, `the opening ✓ on a moment redraws ${withMoment} px, over ${WITH_MOMENT}`); console.log(`# the opening ✓ cutting a moment: ${withMoment} px dirty (ceiling ${WITH_MOMENT})`);
  // a meet that rests without the namer: the tag's slot (no size) becomes the tag, and nothing is redrawn at the origin
  const h = await start(scene({ meet: true, focus: "resident" })); frames(h); dirtyOf(h);
  assert.equal(push(h, scene({ focus: "resident" })), 0, h.errors().join("; ")); frames(h, 1); const restRects = dirtyRects(h); dirtyOf(h);
  assert.ok(!restRects.some(([x, y]) => x === 0 && y === 0), "meet → rest redraws nothing at the origin"); console.log(`# meet → rest: ${restRects.reduce((a, [, , w, hh]) => a + w * hh, 0)} px dirty`);
  // the named flash: the tag takes the frame's flash for 240 ms; each of its frames is a tag's area, far under a quarter of the screen
  f.send({ t: "event", kind: "flash", target: "nameTag", ms: 240, hold: 240 }); let worst = 0; for (let i = 0; i < 20; i++) { frames(f, 1, 16); worst = Math.max(worst, dirtyOf(f)); } assert.ok(worst <= 153_600, `the flash redraws ${worst} px`); console.log(`# the named flash: worst frame ${worst} px`);
});

test("habitat's node order is unchanged by the namer: the regions in the log before it opens and after it closes are the same list", { skip }, async () => {
  const b0 = scene({ focus: "name" }), f = await start(b0), order = (lg) => lg.regions.map((r) => r.id + "/" + r.layer).join();
  const before = order(logOf(f)); const b1 = scene({ namer: true, nf: "act.done", focus: "name" });
  assert.equal(push(f, b1), 0); frames(f); const open = logOf(f); assert.ok(open.regions.some((r) => r.id === "panel"));
  assert.equal(push(f, b0), 0); frames(f); const after = order(logOf(f)); assert.equal(after, before, "the same regions in the same order after the namer closes");
});

test("the keys on the screen: ✓ ← and the room keys are intents on the focused target, the pad moves the ring by habitat.json's graph (▶ from the resident is the name, ▼ its tile), the host's `tile.shown` selector lands ▼ on the shown tile", { skip }, async () => {
  const b = scene({ focus: "resident" }), f = await start(b), cur0 = b.props.focus.cur;
  for (const [k, verb] of [["confirm", "confirm"], ["back", "back"], ["home", "room:home"], ["research", "room:research"], ["library", "room:library"], ["habitat", "room:habitat"]]) { const m = key(f, k); assert.deepEqual(m.map((x) => [x.t, x.screen, x.target, x.verb]), [["intent", "habitat", cur0, verb]], k); }
  const go = (k) => { const m = key(f, k); if (m[0]?.t === "focus") withFocus(f, m[0].target); return m; };
  let m = go("right"); assert.deepEqual(m.map((x) => [x.t, x.target]), [["focus", "name"]]); m = go("right"); assert.deepEqual(m.map((x) => [x.t, x.target]), [["focus", "species"]]);
  m = go("down"); assert.deepEqual(m.map((x) => [x.t, x.target]), [["focus", "plate.0"]]); m = go("down"); assert.equal(m[0].target, "door"); m = go("down"); assert.equal(m[0].target, "cross"); m = go("right"); assert.equal(m[0].target, "wild"); m = go("down"); assert.equal(m[0].target, "tile." + b.shown.id, "the shown tile");
  m = go("up"); assert.equal(m[0].target, "resident"); withFocus(f, "resident"); assert.deepEqual(key(f, "left"), [], "the left edge stops");
});

test("while the namer is open its graph is the only one: the pad walks the keys, ✓ ← and a room key are intents with the overlay's id, habitat's own ring is not drawn", { skip }, async () => {
  const b = scene({ namer: true, meet: true }), f = await start(b), go = (k) => { const m = key(f, k); if (m[0]?.t === "focus") withFocus(f, m[0].target); return m; };
  assert.deepEqual(key(f, "confirm").map((x) => [x.t, x.screen, x.target, x.verb]), [["intent", "namer", "act.done", "confirm"]]); assert.deepEqual(key(f, "back").map((x) => [x.screen, x.verb]), [["namer", "back"]]); assert.deepEqual(key(f, "habitat").map((x) => [x.screen, x.verb]), [["namer", "room:habitat"]]);
  let m = go("up"); assert.deepEqual(m.map((x) => [x.t, x.screen, x.target]), [["focus", "namer", "mod.page"]]); m = go("up"); assert.equal(m[0].target, "key.26"); m = go("left"); assert.equal(m[0].target, "key.25"); m = go("down"); assert.equal(m[0].target, "mod.space");
  m = go("down"); assert.equal(m[0].target, "act.done", "▼ from space lands on Done (the earlier of two equal scores)"); assert.deepEqual(key(f, "right"), [], "the ring stays at the end");
  withFocus(f, "key.0"); assert.deepEqual(key(f, "up"), [], "the first row is the top"); assert.deepEqual(key(f, "left"), []);
});

test("the events: the moment's two hops lift the creature by the spec's table (the box, the tag and the ring stay), the read prints the stamp row by row, the swap cross-dithers the resident, the flash turns the tag over", { skip }, async () => {
  const b = scene({ focus: "resident" }), f = await start(b, { t0: 1000 }), rect = R.resident.rect, resRect = () => { const lg = logOf(f); return lg?.regions.find((r) => r.id === "resident" && r.layer !== "chrome" && r.rect[2] === rect[2])?.rect; };
  frames(f, 1); logOf(f); const base = resRect()?.[1] ?? rect[1] - 4;
  f.send({ t: "event", kind: "moment", target: "resident", ms: 1800, hold: 300, cut: true }); const T = f.t, lifts = []; let now = T; for (const ms of [30, 110, 180, 260, 420, 700, 930, 1040, 1100, 1260, 1500]) { while (now < T + ms) f.frame(now = Math.min(now + 10, T + ms)); lifts.push([ms, base - (resRect()?.[1] ?? base)]); }   // 10 ms steps: the clock clamps a long step
  assert.deepEqual(lifts, [[30, 1], [110, 3], [180, 4], [260, 2], [420, 0], [700, 0], [930, 1], [1040, 3], [1100, 3], [1260, 0], [1500, 0]], "the lift of each instant: up 1 px every 50 ms to 4 at 150, down to 0 at 350; the second hop at 900; still from 1250");
  // the read: the stamp's rows print over 300 ms from the top
  const b2 = scene({ focus: "plate.0" }), g = await start(b2, { t0: 5000 }); g.send({ t: "event", kind: "read", target: "plate.0", ms: 300, hold: 300 }); g.frame(5100); const lg1 = logOf(g), cl = lg1.regions.find((r) => r.id === "stamp" && r.layer === "painted"); assert.ok(cl, "the stamp is drawn while it prints"); g.frame(5400); assert.equal(g.poll("done")?.kind, "read");
  // the swap: a dither on the resident from the old picture's id draws the old and the new mibi (a composed picture), ending in the new one
  const b3 = scene({ focus: "resident" }), h = await start(b3, { t0: 8000 }), from = b3.props.regions.resident.picture, other = scene({ shown: 1, focus: "resident" }); assert.equal(push(h, other), 0); h.send({ t: "event", kind: "dither", target: "resident", from, ms: 200, hold: 0 }); h.frame(8100); const mid = logOf(h);
  assert.ok(mid.regions.some((r) => r.id === "resident" && r.rect[2] === rect[2] && r.rect[3] === rect[3]), "the dither is drawn over the resident's box"); h.frame(8300);
  // the flash: the tag takes the frame's flash, solid for the event's 240 ms as a counter's (on at +10 and +130, gone at +250)
  const t = await start(scene({ focus: "resident" }), { t0: 9000 }); const h0 = t.hash(); t.send({ t: "event", kind: "flash", target: "nameTag", ms: 240, hold: 240 }); t.frame(t.t + 10); const h1 = t.hash(); t.frame(t.t + 130); const h2 = t.hash(); t.frame(t.t + 250); const h3 = t.hash();
  assert.notEqual(h1, h0, "the flash is on"); assert.equal(h2, h1, "and still on at +130"); assert.equal(h3, h0, "and gone at +250");
});

// ---- Station M1 §3: one mibi up close with a moving set (the close atlas synthesized at 304 × 312; moving-scene.mjs) ----
import { MOVING as MSETS, sendMoving, atlasPicture, VIV_RULES } from "./moving-scene.mjs";
import { setMoving } from "../../station/src/moving.mjs";
setMoving(MSETS);
async function upClose(o = {}) {
  const settings = cfg(8), st = S.freshSt("w1", 3, T0); S.normalize(st); st.firstMibi = false; st.dock = { docked: true, at: T0 };
  S.seedAdults(st, o.species ?? "S01", 5, 2, settings); for (const m of st.mibis) m.paint = { state: "landed" }; if (o.juvenile) st.mibis[0].born = st.turn;
  const sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [], tier: 1, shield: 3, carryReqs: [] };
  const b = habitatBuild({ st, sv, settings, docked: true, light: "day", focus: o.focus ?? "name", habId: st.mibis[0].id, meetId: null, armed: false, time: o.time ?? 12 * 3600, restRules: VIV_RULES.rest, motionSets: true }, spec, frameSpec, homeSpec);
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["habitat", spec], ["namer", namerSpec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0, f.errors().join("; "));
  assert.equal(sendMoving(f), 0, f.errors().join("; "));
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  for (const r of b.requests) if (r.kind === "moving") f.handleOf(r.id, withPolicy((i) => atlasPicture(i)));
  f.t = 5000; f.motion = o.motion ?? true; f.build = b; assert.equal(push(f, b), 0, f.errors().join("; ")); frames(f); dirty(f, { fullCut: true });
  return { f, b };
}
const closeCells = (stage) => MSETS.S01[stage].close.cells;
const cellOf = (f, stage) => { const c = f.M._face_test_close_cell(); return c < 0 ? `dither ${-1 - c}` : closeCells(stage)[c]; };
const traceClose = (f, stage, ms, step = 20) => { const out = []; let last = null; for (let t = 0; t <= ms; t += step) { f.frame((f.t += step)); const k = cellOf(f, stage) + "/" + f.M._face_test_close_lift(); if (k !== last) { out.push({ t, cell: cellOf(f, stage), lift: f.M._face_test_close_lift() }); last = k; } } return out; };
test("up close (M1 §2.4, §3): the resident from its close atlas breathes on its own 80 ms ticks (+0/+1/+2), every frame inside 153,600 px", { skip }, async () => {
  const { f, b } = await upClose(); assert.ok(b.props.regions.resident.moving, "the resident names its close atlas"); assert.ok(f.M._face_test_close_cell() >= 0);
  let worst = 0; const seen = new Set(), changes = [];
  for (let t = 0; t < 8000; t += 16) { f.frame((f.t += 16)); worst = Math.max(worst, dirty(f)); const c = cellOf(f, "adult"); if (!seen.has(c) || changes.at(-1)?.c !== c) changes.push({ t, c }); seen.add(c); }
  console.log(`# up close (moving): worst frame ${worst} px`);
  for (const c of ["stand", "stand-b1", "stand-b2"]) assert.ok(seen.has(c), "the breath shows " + c); assert.ok([...seen].every((c) => ["stand", "stand-b1", "stand-b2", "blink"].includes(c)), [...seen].join()); assert.ok(worst <= 153600, `${worst} px`);
  for (let k = 1; k < changes.length; k++) assert.ok((changes[k].t + 16) % 80 < 32, `a change at ${changes[k].t} ms is on an 80 ms tick`);   // the face's tick from the screen's first frame, seen by 16 ms frames
});
test("up close with a moving set, focused (UI/UX Q8): the walkers' order, the glass, the shadow, the feet ring, the resident", { skip }, async () => {
  const { f } = await upClose({ focus: "resident" }), ids = logOf(f).regions.map((r) => r.id), at = (id) => ids.indexOf(id);
  assert.ok(at("resident.shadow") > at("glass") && at("glass") >= 0, ids.join()); assert.ok(at("focus") > at("resident.shadow"), "the ring draws over the shadow: " + ids.join()); assert.ok(at("resident") > at("focus"), "the resident over the ring: " + ids.join());
});
test("Greet up close with a moving set (M1 §2.4, override 4): hops at 0 and 900 ms, each crouch 160, air 400 on [8, 20, 24, 20, 8], crouch 160, then stand", { skip }, async () => {
  const { f } = await upClose({ focus: "resident" }); f.send({ t: "event", kind: "moment", target: "resident", ms: 1800, hold: 300, cut: true });
  const tr = traceClose(f, "adult", 1900), lifts = tr.filter((x) => x.cell === "air").map((x) => x.lift);
  assert.deepEqual(lifts.slice(0, 5), [8, 20, 24, 20, 8], "the first hop's lift"); assert.deepEqual(lifts.slice(5, 10), [8, 20, 24, 20, 8], "the second hop's");
  const air1 = tr.find((x) => x.cell === "air"), air2 = tr.filter((x) => x.cell === "air")[5]; assert.ok(Math.abs(air2.t - air1.t - 900) <= 20, `the hops 900 ms apart: ${air2.t - air1.t}`);
  assert.equal(tr.at(-1).cell, "stand");
});
test("a sleeper's Greet (M1 §2.4): wake (16-level dither in 180 ms, crouch 400, stand), the hops, crouch 320, dither 180, curl: 2,880 ms", { skip }, async () => {
  const { f, b } = await upClose({ time: 23 * 3600, focus: "resident" }); assert.equal(b.props.regions.resident.rest, "asleep"); assert.match(cellOf(f, "adult"), /^curl/);
  f.send({ t: "event", kind: "moment", target: "resident", ms: 2880, hold: 300, cut: true });
  const tr = traceClose(f, "adult", 2900, 10), dithers = tr.filter((x) => x.cell.startsWith("dither"));
  const first = dithers.filter((x) => x.t < 200).map((x) => +x.cell.slice(7)), last = dithers.filter((x) => x.t > 2000).map((x) => +x.cell.slice(7));
  assert.ok(first.length >= 12 && first.every((v, i) => i === 0 || v >= first[i - 1]), "the wake's dither climbs its levels within 180 ms: " + first); assert.ok(last.length >= 12, "the curl's dither: " + last);
  assert.ok(tr.filter((x) => x.cell === "air").length >= 10, "the hops"); assert.match(tr.at(-1).cell, /^curl/, "it ends curled"); assert.ok(tr.find((x) => x.cell === "crouch"));
});
test("motion off up close: stand, or curl asleep; the moment plays nothing", { skip }, async () => {
  const a = await upClose({ motion: false }); assert.equal(cellOf(a.f, "adult"), "stand");
  const b = await upClose({ motion: false, time: 23 * 3600 }); assert.equal(cellOf(b.f, "adult"), "curl");
  let worst = 0; for (let t = 0; t < 4000; t += 16) { a.f.frame((a.f.t += 16)); worst = Math.max(worst, dirty(a.f)); } assert.equal(worst, 0);
});
test("S05 up close (the animator's ruling): no hop: an eager step twice on the hop's schedule, crouch 160, stepa 320, stand; lift 0", { skip }, async () => {
  const { f, b } = await upClose({ species: "S05", juvenile: true, focus: "resident" }); assert.equal(b.props.regions.resident.moving.set, "S05");
  f.send({ t: "event", kind: "moment", target: "resident", ms: 1800, hold: 300, cut: true });
  const cells = MSETS.S05.juvenile.close.cells, tr = []; let last = null;
  for (let t = 0; t <= 1900; t += 20) { f.frame((f.t += 20)); const c = f.M._face_test_close_cell(), name = c < 0 ? "dither" : cells[c]; if (name !== last) { tr.push([t, name, f.M._face_test_close_lift()]); last = name; } }
  const steps = tr.filter((x) => x[1] === "stepa"); assert.equal(steps.length, 2, JSON.stringify(tr)); assert.ok(tr.every((x) => x[2] === 0), "lift 0"); assert.ok(Math.abs(steps[1][0] - steps[0][0] - 900) <= 20, "the steps 900 ms apart");
  const cr = tr.find((x) => x[1] === "crouch"); assert.ok(steps[0][0] - cr[0] >= 140 && steps[0][0] - cr[0] <= 180, "crouch 160 first");
});

// ---- fix 2: the device plates (F1 to F6, F8) ----
const painted = (lg, id) => lg.regions.filter((r) => r.id === id && r.layer === "painted" && r.rect[2] > 0).map((r) => r.rect), chromeOf = (lg, id) => lg.regions.filter((r) => r.id === id && r.layer === "chrome" && r.rect[2] > 2);
test("fix 2 F1, F2: the card and the four modules are their plates, 1:1 at the spec's rectangles and painted, with no fill, edge or bevel row; the focused module's plate lifts with it", { skip }, async () => {
  for (const focus of ["resident", "door", "wild"]) {
    const b = scene({ focus }), f = await start(b), lg = logOf(f);
    assert.deepEqual(painted(lg, "card").filter((r) => r[2] === 416), [R.card.rect], "the card's plate");
    assert.equal(chromeOf(lg, "card").length, 0, "no card fill, edge or top row");
    for (const m of ["door", "portrait", "cross", "wild"]) {
      const want = [R[m].rect[0], R[m].rect[1] - (focus === m ? (R[m].lift ?? 2) : 0), R[m].rect[2], R[m].rect[3]];
      assert.deepEqual(painted(lg, m + ".plate").filter((r) => r[2] === want[2] && r[3] === want[3]), [want], `${m}'s plate (focus ${focus})`);
      assert.equal(chromeOf(lg, m).filter((r) => r[2] === want[2]).length, 0, `${m} draws no panel`);
    }
  }
});
test("fix 2 F4: the Companion's three places are the 48 well in every state, a free place the well alone (no dash)", { skip }, async () => {
  for (const o of [{ carry: [] }, { carry: [1, 2, 3] }, { carry: [1], away: true }]) {
    const b = scene({ ...o, focus: "resident" }), f = await start(b), lg = logOf(f);
    const door = painted(lg, "door"); assert.ok(door.length >= 1 && door.every((r) => r[0] >= R.door.rect[0] - 2 && r[0] + r[2] <= R.door.rect[0] + R.door.rect[2]), "the door region draws its plate and wells: " + JSON.stringify(o));
    assert.equal(b.props.regions.door.places.length, 3); assert.ok(b.props.regions.door.places.every((p) => p.well === "plate-well-48x48"), "every place, filled or free, names its well");
    assert.equal(lg.regions.filter((r) => /dash/.test(r.id)).length, 0);
  }
});
test("fix 2 F5, F8: the namer's plate and its name well draw only while the namer is open, with no drop shadow", { skip }, async () => {
  const shut = await start(scene({ focus: "resident" })), lgShut = logOf(shut);
  assert.equal(painted(lgShut, "panel").length + painted(lgShut, "field").length, 0, "no namer plate while it is shut");
  const b = scene({ focus: "resident", namer: true }), f = await start(b), lg = logOf(f), P = namerSpec.regions.panel.rect;
  assert.deepEqual(painted(lg, "panel"), [P], "the namer's plate, 1:1");
  assert.deepEqual(painted(lg, "field").filter((r) => r[2] === 328), [namerSpec.regions.field.rect], "the name well, 1:1");
  assert.equal(chromeOf(lg, "panel").length, 0, "no panel fill, edge, bevel row or shadow");
  assert.ok(!lg.regions.some((r) => r.id === "panel.shadow"));
});
test("fix 2 F4: the strip's tiles name their well by form and state (full or compact; the shown tile its -shown well), a free bay none; the strip names its plate", { skip }, () => {
  for (const [bays, form] of [[8, "compact"], [4, "full"]]) {
    const b = scene({ bays, adults: 3, focus: "resident" }), w = form === "full" ? 152 : 72, T = b.props.regions.tiles.items;
    assert.equal(b.props.regions.strip.plate, "plate-device-992x64");
    T.forEach((t) => assert.equal(t.well, t.state === "free" ? "" : `plate-well-${w}x48${t.shown ? "-shown" : ""}`));
    assert.equal(T.filter((t) => t.shown).length, 1); assert.ok(T.some((t) => t.state === "free"), "a free bay");
  }
});
test("fix 2 F6: no plate picture, no plate: a module whose plate master is not there draws no fill and keeps no plate", { skip }, async () => {
  const b = scene({ focus: "resident" }); b.requests = b.requests.filter((r) => !/^plate-/.test(r.id));
  const f = await start(b), lg = logOf(f);
  assert.equal(painted(lg, "card").length, 0); assert.equal(chromeOf(lg, "card").length, 0, "nothing falls back to a fill");
  for (const m of ["door", "portrait", "cross", "wild"]) assert.equal(chromeOf(lg, m).filter((r) => r[2] === R[m].rect[2]).length, 0);
});

test("the Portrait picture: one node after the frame, at 920,316 resting and 920,314 lifted, 0x0 when there is none (ruling (c))", { skip }, async () => {
  const D = "0123456789abcdef", id = `portrait:${D}:40x30`, colour = (i) => Array.from(standIn(i, [1, 1]).data.slice(0, 3)), win = (dy) => [[920, 316 + dy], [959, 345 + dy], [940, 330 + dy]];
  const reg = (lg, layer) => lg.regions.find((r) => r.id === "portrait" && r.layer === layer && r.rect[2] > 0);
  const objects = {};
  for (const [focus, dy] of [["resident", 0], ["portrait", -2]]) {
    const b = scene({ portrait: "portrayed", digest: D, focus }), f = await start(b), lg = logOf(f); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    assert.equal(b.props.regions.portrait.picture, id); assert.deepEqual(reg(lg, "painted").rect, [920, 316 + dy, 40, 30]); assert.deepEqual(reg(lg, "art").rect, [916, 312 + dy, 48, 40]);
    assert.deepEqual(departures(lg, spec, namerSpec, b.props.state, b.props.focus.cur, b.props.regions.tiles.items.length, false), []);
    objects[focus] = f.objects(); f.pass(3); for (const [x, y] of win(dy)) assert.deepEqual(f.pixel(x, y), colour(id), `the picture shows at ${x},${y} (drawn after the frame)`);
    assert.deepEqual(f.pixel(918, 316 + dy), colour("sitting-frame-portrait-48x40:48x40"), "the frame's rail beside the window");
  }
  for (const [o, focus] of [[{ portrait: "portrayed" }, "resident"], [{ portrait: "held" }, "portrait"], [{}, "resident"]]) {
    const b = scene({ ...o, focus }), f = await start(b), lg = logOf(f); assert.equal(b.props.regions.portrait.picture, ""); assert.ok(!reg(lg, "painted"), "no picture: nothing painted in the module's window"); assert.equal(f.objects(), objects[focus], `the node is always there: the same object count (${JSON.stringify(o)} ${focus})`);
    const dy = focus === "portrait" ? -2 : 0, fr = b.props.regions.portrait.frame.id ?? b.props.regions.portrait.frame; f.pass(3); assert.deepEqual(f.pixel(940, 330 + dy), colour(fr), "the frame's own window shows"); assert.deepEqual(departures(lg, spec, namerSpec, b.props.state, b.props.focus.cur, b.props.regions.tiles.items.length, false), []);
  }
  const b = scene({ portrait: "portrayed", digest: D, focus: "resident" }), f = await start(b), lg = logOf(f), bad = (fn) => { const c = JSON.parse(JSON.stringify(lg)); fn(c); return departures(c, spec, namerSpec, b.props.state, b.props.focus.cur, b.props.regions.tiles.items.length, false); };
  assert.match(bad((c) => { reg(c, "painted").rect[0] += 1; })[0], /portrait/, "proved to fail on a moved picture");
});

test("fix 3c-habitat: with no Wild gate, chapter plate or guide mark master placed nothing is drawn at the gate (916,416), the plates' grounds (608+48i,200) or the guide mark; with them, each is drawn", { skip }, async () => {
  const drawn = (lg, id) => lg.regions.filter((r) => r.id === id && (r.layer === "art" || r.layer === "painted") && r.rect[2] > 0);   // the picture layers (the emblems on the plates are art too, 24 high; a ground is 40)
  try {
    const b = scene({ focus: "resident" }), ids = new Set(b.requests.filter((r) => r.kind === "slot" && /^(gate-wild|chapter-plate|mark-guide)/.test(r.id)).map((r) => r.id)); assert.ok(ids.size >= 3, [...ids].join());
    UNSIGNED = ids; const f = await start(b), lg = logOf(f); assert.deepEqual(f.errors(), []);
    assert.deepEqual(drawn(lg, "wild"), [], "no gate at 916,416"); assert.deepEqual(drawn(lg, "speciesLine"), [], "no guide mark"); assert.ok(drawn(lg, "plates").every((r) => r.rect[3] < 40), "no plate ground at 608+48i,200: only the emblems");
    UNSIGNED = null; const g = await start(scene({ focus: "resident" })), lg2 = logOf(g);
    assert.deepEqual(drawn(lg2, "wild").map((r) => r.rect), [[916, 416, 48, 48]], "the gate, placed"); assert.ok(drawn(lg2, "plates").some((r) => r.rect[1] === 200 && r.rect[3] === 40), "the plates' grounds, placed"); assert.deepEqual(drawn(lg2, "speciesLine").map((r) => r.rect[2] + "x" + r.rect[3]), ["16x16"], "the guide mark, placed");
  } finally { UNSIGNED = null; }
});
