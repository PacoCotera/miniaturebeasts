// Home on the face (lvgl-switch.md §4 L2.2): the words and the binding table (screens/home_frame.c) on the props views/home-props.mjs gives, in Node on the WebAssembly build: every scene draws without an error or a refusal inside the object and
// picture budgets with no region leaving home.json's rectangle (tools/home-regions.mjs, proved here to fail on a moved region), the focus graph of the spec played on the face (every vector, the focus said on the frame of the key), the keys (✓ and
// the room keys are intents, ← does nothing), the rest (events.rest) at its instants with the screen change's dither covering the whole stage, the line (needs, goal, verb and subject, note: each inside its zone, never wrapping), the stations'
// words and the dirty area of a lamp change and of the ring moving between a bezel and a station. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/home.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy, installScene } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames, frameOf, podGenome } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { homeBuild, homeNeeds, wordsOf } from "../../station/src/views/home-props.mjs";
import { departures, TARGETS } from "../tools/home-regions.mjs";
import { dirty } from "./dirty.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), homeSpec = J("home");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000, R = homeSpec.regions;

// ---- scenes: the state through the rules, the props through the view ----
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: true, at: T0 }; return st; };
const crate = (n, turn = 0) => ({ id: "c" + n, n, turn, at: T0, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] });
const painted = (st) => { for (const m of st.mibis) m.paint = m.paint ?? { state: "landed" }; return st; };
function scene(o = {}) {
  const st = world(); if (o.adults ?? 3) S.seedAdults(st, "S01", 5, o.adults ?? 3, settings); painted(st);
  for (let i = 0; i < (o.pods ?? 0); i++) { S.seedPodFromGenome(st, podGenome(frameOf("S01"), 3 + i), settings, T0); const p = st.tray.at(-1); S.skipIdentify(st, p); p.seen = 1; }
  if (o.unseen) { S.seedPodFromGenome(st, podGenome(frameOf("S01"), 9), settings, T0); }
  if (o.waiting) st.waiting.push({ id: "w1" });
  if (o.away) st.dock = { docked: false, at: T0 };
  if (o.bud) st.bud = { kind: "founder", species: "S01", sp: 0, gs: 5, genome: st.mibis[0].genome, sha: "bud", code: "BUD", start: Date.now() - o.bud * 60000, minutes: 20, firstEver: false, parents: null, from: { n: 0, g: "meadow", how: "ground", podId: null }, read: [], shaped: [], early: false };
  if (o.portrait) st.sittingCrates.push({ id: "sit1", mibiId: st.mibis[0].id, pose: "stand", place: "meadow", start: 0, source: "x", painted: true, opened: false });
  const sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: Array.from({ length: o.crates ?? 0 }, (_, i) => crate(i + 1, o.trips ? i % o.trips : 0)), mibis: [], carried: (o.carry ?? []).map((i) => st.mibis[i].id), tier: 1, shield: 3 };
  return { ...homeBuild({ st, sv, settings, docked: S.docked(st), ui: o.ui ?? {}, focus: o.focus ?? null, time: 12 * 3600 + 41 * 60, date: { y: 2026, m: 9, d: 17 }, now: Date.now() + 1000, place: o.place ?? "" }, homeSpec, frameSpec), st, sv };
}
const frameProps = () => ({ plate: { text: "" } });   // Home's frame carries the plate only: its bar and its line are its own

// stand-in pictures for the frame's marks: a flat block keyed by id at the size the id names
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function standIn(id, [w, h]) { const d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d }; }
const MARKS = [[frameSpec.regions.top.slice, [1024, 40]], ...Object.values(frameSpec.regions.marks.lamp12).map((id) => [id, [12, 12]]), [frameSpec.regions.marks.capConfirm, [16, 16]]];

async function start(b, { motion = true, t0 = 0, dir = dist } = {}) {
  const f = await bootFace(pathToFileURL(dir + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["home", homeSpec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  for (const [id, size] of MARKS) f.handleOf(id, withPolicy((i) => standIn(i, size)));
  f.t = t0; f.motion = motion; f.build = b;
  assert.equal(f.props({ screen: "home", ...b.props, motion, frame: frameProps() }), 0, f.errors().join("; ")); frames(f); return f;
}
const frames = (f, n = 2, dt = 16) => { for (let i = 0; i < n; i++) f.frame((f.t += dt)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
const resend = (f, b, n = 2) => { f.build = b; assert.equal(f.props({ screen: "home", ...b.props, motion: f.motion, frame: frameProps() }), 0, f.errors().join("; ")); frames(f, n); };   // n: the frames drawn after the props (1: the frame that carries the change)
const withFocus = (f, cur, n = 2) => { f.build.props.focus.cur = cur; resend(f, f.build, n); };
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };
const typeIn = (lg, region) => (lg?.type ?? []).filter((t) => t.region === region);   // the face's log: every string it set, with its px and region
const node = path.resolve(here, "../dist/node");   // the test build: a node by its id (nodeBox)
const box = (f, id) => f.nodeBox(id)?.box ?? null;
const inside = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];

const SCENES = {
  "fresh": { adults: 0 },
  "rest, the goal in the line": { adults: 2, carry: [0, 1] },
  "rest, two needs": { adults: 3, carry: [0], crates: 2, bud: 1e8 / 60000, pods: 2 },
  "the Vivarium focused": { adults: 2, focus: "vivarium" }, "the Library focused": { adults: 2, focus: "library" },
  "Pods focused": { adults: 2, pods: 3, focus: "pods" }, "the Incubator focused": { adults: 2, bud: 1, focus: "incubator" }, "the Companion focused": { adults: 2, carry: [0], focus: "companion" }, "the Companion focused, away": { adults: 2, carry: [0], away: true, focus: "companion" }, "the Bay focused": { adults: 2, crates: 3, focus: "bay" },
  "all at home": { adults: 3 }, "some away": { adults: 3, carry: [0], away: true }, "none at home": { adults: 2, carry: [0, 1], away: true },
  "a bud ready": { adults: 2, bud: 1e8 / 60000 }, "crates and a portrait": { adults: 2, crates: 3, portrait: true }, "a place name": { adults: 1, place: "Burrow Station" },
};
for (const [name, o] of Object.entries(SCENES)) {
  test(`Home, ${name}: draws without an error or a refusal inside the budgets, with no region leaving home.json's rectangle`, { skip }, async () => {
    const b = scene(o), f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const lg = logOf(f); assert.deepEqual(departures(lg, homeSpec, frameSpec, b.props.focus.cur), []);
    const st = f.stats(); assert.ok(st.pictures <= 200, `${st.pictures} pictures`); assert.ok(f.objects() <= 400, `${f.objects()} objects (the table holds 1,024; at most 400 on a screen)`);
    assert.ok(JSON.stringify(b.props).length < 32 * 1024, "props under 32 KiB");
  });
}
test("the departure check bites: a station's lamp, the line and the panel of a bezel moved, and a ring where there is none, are each found", { skip }, async () => {
  const b = scene({ adults: 2, crates: 2, focus: "bay" }), f = await start(b), lg = logOf(f), bad = (fn, cur = "bay") => { const c = JSON.parse(JSON.stringify(lg)); fn(c); return departures(c, homeSpec, frameSpec, cur); };
  assert.deepEqual(departures(lg, homeSpec, frameSpec, "bay"), []);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "pods" && r.layer === "art").rect[0] += 3; })[0], /pods's lamp/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "vivarium" && r.layer === "chrome").rect[2] -= 8; })[0], /vivarium's panel/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "focus").rect[1] -= 4; })[0], /the ring/);
  assert.match(bad(() => {}, "room")[0], /a ring is drawn at rest/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "stage").rect[3] = 522; })[0], /stage/);
});

// ---- the keys ----
test("the pad is home.json's graph on the boxes the words drew: every vector of the spec is played on the face, and the focus is said on the frame of the key", { skip }, async () => {
  assert.equal(homeSpec.focus.vectors.length, 28, "seven places, four keys each");
  for (const v of homeSpec.focus.vectors) {
    const f = await start(scene({ adults: 2, focus: v.from === "room" ? null : v.from })), before = f.hash(), out = key(f, v.key);
    if (v.to === v.from) { assert.deepEqual(out, [], `${v.from} ${v.key} stays`); assert.equal(f.hash(), before, `${v.from} ${v.key}: nothing redrawn`); }
    else { assert.equal(out.length, 1, `${v.from} ${v.key}`); assert.deepEqual([out[0].t, out[0].screen, out[0].target], ["focus", "home", v.to], `${v.from} ${v.key}`); assert.notEqual(f.hash(), before, `${v.from} ${v.key}: the ring moves in the same frame`); }
  }
});
test("✓ on the focus says an intent on its target (on the room, on 'room'); the room keys say theirs; ← says nothing: Home is the top", { skip }, async () => {
  const f = await start(scene({ adults: 2 }));
  let [m] = key(f, "confirm"); assert.deepEqual([m.t, m.screen, m.target, m.verb], ["intent", "home", "room", "confirm"]);
  for (const id of TARGETS) { withFocus(f, id); [m] = key(f, "confirm"); assert.deepEqual([m.target, m.verb], [id, "confirm"], id); assert.deepEqual(key(f, "back"), [], "← on Home does nothing"); }
  withFocus(f, "bay"); [m] = key(f, "research"); assert.deepEqual([m.t, m.verb, m.target], ["intent", "room:research", "bay"]);
  [m] = key(f, "home"); assert.deepEqual([m.verb, m.target], ["room:home", "bay"], "the Home key: the host puts the ring back on the room, and at rest rests");
  [m] = key(f, "library"); assert.equal(m.verb, "room:library"); [m] = key(f, "habitat"); assert.equal(m.verb, "room:habitat");
});
test("while the rest holds, the face moves no focus and sends no intent but room:<x> (the host keeps it until the hold ends)", { skip }, async () => {
  const f = await start(scene({ adults: 2, focus: "pods" })); f.send({ t: "event", kind: "rest", target: "home", ms: 200, hold: 380 }); frames(f, 2);
  for (const k of ["up", "left", "confirm", "back"]) assert.deepEqual(key(f, k), [], k);
  const [m] = key(f, "research"); assert.deepEqual([m.t, m.verb], ["intent", "room:research"]);
});

// ---- the rest ----
const stageDither = (lg) => (lg?.regions ?? []).find((r) => r.id === "stage" && r.layer === "art");
test("the rest (events.rest): the ring is gone as it begins and stays away; the face says done at 200; the host's dither closes over the whole stage, to the foot of the screen, for 180 ms; input is held until 380", { skip }, async () => {
  const f = await start(scene({ adults: 2, focus: "pods" }), { t0: 1000 }), ring = (lg) => lg.regions.some((r) => r.id === "focus");
  let lg = logOf(f); assert.ok(ring(lg)); assert.ok(!stageDither(lg));
  const t0 = f.t, ev = homeSpec.events.rest; assert.deepEqual([ev.ms, ev.hold, ev.target], [200, 380, "home"]); f.send({ t: "event", kind: "rest", target: ev.target, ms: ev.ms, hold: ev.hold });
  f.frame(t0 + 150); lg = logOf(f); assert.ok(!ring(lg), "the ring goes as the rest begins"); assert.equal(f.poll("done"), null);
  f.frame(t0 + 210); lg = logOf(f); assert.equal(f.poll("done")?.kind, "rest", "the event ends at 200"); assert.ok(!ring(lg), "no ring while the hold runs");
  f.send({ t: "event", kind: "dither", target: "stage", ms: 180, from: 0, to: 16 }); f.frame(t0 + 330); lg = logOf(f);
  assert.deepEqual(stageDither(lg)?.rect, R.stage.rect, "the dither covers Home's stage down to y 600, the console's foot too"); const mid = f.hash(); f.frame(t0 + 370); assert.notEqual(f.hash(), mid, "it deepens");
  assert.deepEqual(key(f, "confirm"), [], "input is still held at 370"); f.frame(t0 + 400); assert.equal(f.poll("done")?.kind, "dither");
  assert.equal(f.send({ t: "event", kind: "rest", target: "home", ms: 200, hold: true }), -1, "a boolean hold is refused"); assert.match(f.errors()[0], /hold is a whole number of ms/);
});
test("the screen change onto Home is the 180 ms stage dither over the whole of Home's stage (16 levels), and the full-screen change from a bezel is the same", { skip }, async () => {
  const f = await start(scene({ adults: 2 }), { t0: 1000 }); logOf(f);
  f.send({ t: "event", kind: "dither", target: "stage", ms: 180, hold: 180 }); f.frame(f.t + 20); const lg = logOf(f);
  assert.deepEqual(stageDither(lg)?.rect, [0, 40, 1024, 560], "to the foot: Home has no bottom line"); const a = dirty(f, { fullCut: true }); assert.ok(a > 0);
  assert.equal(f.poll("done"), null); f.frame(f.t + 200); assert.equal(f.poll("done")?.kind, "dither"); assert.ok(!stageDither(logOf(f)), "gone when it ends");
});
test("motion off: the same hash holds at any later time", { skip }, async () => {
  const f = await start(scene({ adults: 4, crates: 2, carry: [0] }), { motion: false }), h0 = f.hash(); frames(f, 5, 1000); assert.equal(f.hash(), h0, "nothing moves with motion off");
});

// ---- the top bar ----
test("the bar: Station at x 16, the place name 12 after it when the save has one, the date and the clock to the right edge at 1008; no counters and no Companion mark; the shared bar's picture is the bar", { skip }, async () => {
  for (const place of ["", "Burrow Station"]) {
    const f = await start(scene({ adults: 1, place }), { dir: node }), lg = logOf(f), words = typeIn(lg, "bar");
    assert.deepEqual(words.map((t) => [t.text, t.px]), [["Station", 20], ...(place ? [[place, 16]] : []), ["12:41", 20], ["Sat 17 Oct", 16]], "the words of the bar, in draw order");
    const title = box(f, "bar.title"), clock = box(f, "bar.clock"), date = box(f, "bar.date"); assert.equal(title[0], 16); assert.equal(clock[0] + clock[2], 1008, "the clock's right edge"); assert.ok(clock[0] - (date[0] + date[2]) === 12, "the date 12 before the clock");
    if (place) assert.equal(box(f, "bar.place")[0], title[0] + title[2] + 12, "12 after the title"); else assert.equal(box(f, "bar.place"), null);
    assert.ok(lg.regions.some((r) => r.id === "bar" && r.layer === "painted" && r.rect.join() === R.bar.rect.join()), "the shared bar's picture, 1:1");
    assert.ok(!lg.regions.some((r) => ["top", "materials", "time"].includes(r.id)), "no counter, no turn"); assert.equal(box(f, "top.comp"), null, "no Companion mark"); assert.equal(box(f, "top.m.e"), null, "no counter");
    assert.ok(!(lg.type ?? []).some((t) => /^[0-9]+$/.test(t.text)), "no counter figure");
  }
});

// ---- the line ----
const lineBox = R.line.rect, lineNodes = (f) => { const ids = ["line.lamp", "line.cap", "line.needs.0", "line.verb.0", "line.sep.0", "line.subject.0", "line.note.0", "line.goal.0", "line.goal.1", "line.goal.2"]; return Object.fromEntries(ids.map((id) => [id, box(f, id)]).filter(([, v]) => v && v[2] > 0)); };
async function drawn(line, o = {}) { const b = scene({ adults: 1, ...o }); b.props.regions.line = line; return start(b, { dir: node }); }
test("the line at rest with two needs: the amber lamp, the ✓ cap and the first need's action, then its dot and the second's notice, all in the zone, centred, the words in the need colour", { skip }, async () => {
  const f = await start(scene({ adults: 3, crates: 2, bud: 1e8 / 60000 }), { dir: node }), lg = logOf(f); assert.deepEqual(f.build.props.regions.line, { needs: ["Open the Bay", "the bud is ready"] });
  const N = lineNodes(f); assert.deepEqual(Object.keys(N).sort(), ["line.cap", "line.lamp", "line.needs.0"]); for (const [id, r] of Object.entries(N)) assert.ok(inside(r, lineBox), `${id} ${r} leaves the zone ${lineBox}`);
  assert.deepEqual([N["line.lamp"][2], N["line.lamp"][3], N["line.cap"][2], N["line.cap"][3]], [12, 12, 16, 16]); assert.equal(N["line.cap"][0], N["line.lamp"][0] + 12 + 4, "the lamp, 4, then the cap"); assert.equal(N["line.needs.0"][0], N["line.cap"][0] + 16 + 4, "the cap, 4, then the words");
  const left = N["line.lamp"][0], right = N["line.needs.0"][0] + N["line.needs.0"][2]; assert.ok(Math.abs((left + right) / 2 - 580) <= 1, `centred on the zone: ${(left + right) / 2}`);
  assert.deepEqual(typeIn(lg, "line").map((t) => [t.text, t.px]), [["Open the Bay \u00b7 the bud is ready", 16]]);
});
test("the line at rest with one need, with none and a goal, and with none and no goal", { skip }, async () => {
  let f = await start(scene({ adults: 2, crates: 1 }), { dir: node }), lg = logOf(f); assert.deepEqual(f.build.props.regions.line, { needs: ["Open the Bay"] }); assert.deepEqual(typeIn(lg, "line").map((t) => t.text), ["Open the Bay"]);
  f = await start(scene({ adults: 2, carry: [0, 1] }), { dir: node }); lg = logOf(f); const line = f.build.props.regions.line; assert.ok(line.goal && line.goal.text, "the goal"); assert.equal(lineNodes(f)["line.lamp"], undefined, "no lamp"); assert.equal(lineNodes(f)["line.cap"], undefined, "no cap");
  assert.equal(typeIn(lg, "line")[0].text.startsWith(line.goal.text), true);
  f = await start(scene({ adults: 0 }), { dir: node }); lg = logOf(f); if (!f.build.props.regions.line.goal) { assert.deepEqual(f.build.props.regions.line, {}); assert.equal(typeIn(lg, "line").length, 0, "nothing at all"); }
});
test("the goal: a name too wide for the zone with its icons falls back to the nameless sibling; both fit", { skip }, async () => {
  const widthOf = async (goal) => { const f = await drawn({ goal }), r = box(f, "line.goal.0"); assert.ok(inside(r, lineBox), `${goal.text}: ${r}`); return r[2]; };
  const wide = await widthOf({ text: "read WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW's chapters", icons: "", plain: "read the new mibi's chapters" }), plain = await widthOf({ text: "read the new mibi's chapters", icons: "", plain: "" });
  assert.equal(wide, plain, "too wide: the nameless sibling is what is drawn"); const narrow = await widthOf({ text: "read Dot's chapters", icons: "", plain: "read the new mibi's chapters" }); assert.notEqual(narrow, plain);
  const f = await drawn({ goal: { text: "watch your mibis for more", icons: "\u25c6", plain: "" } }); for (const [id, r] of Object.entries(lineNodes(f))) assert.ok(inside(r, lineBox), `words and icons fit the zone: ${id} ${r}`);
});
test("a target's verb with its cap, and its subject in mist after a dot, clipped with an ellipsis at the zone's edge only; the Companion away says it is on a trip, with no cap", { skip }, async () => {
  let f = await drawn({ verb: "Open the Bay" }), lg = logOf(f); assert.ok(lineNodes(f)["line.cap"], "the cap"); assert.deepEqual(typeIn(lg, "line").map((t) => t.text), ["Open the Bay"]); assert.equal(lineNodes(f)["line.lamp"], undefined, "no lamp on a target");
  f = await drawn({ verb: "Open the Bay", subject: "two sealed crates from the last trip, all of them waiting at the berths for their turn to be opened" }); lg = logOf(f);
  const words = typeIn(lg, "line").map((t) => t.text); assert.equal(words[0], "Open the Bay"); assert.equal(words[1], " \u00b7 "); assert.match(words[2], /\u2026$/, "the subject is cut with an ellipsis"); assert.ok(!words[0].includes("\u2026") && !words[1].includes("\u2026"), "only the subject may end in one");
  for (const [id, r] of Object.entries(lineNodes(f))) assert.ok(inside(r, lineBox), `${id} ${r} leaves the zone`); const sub = box(f, "line.subject.0"); assert.ok(sub[0] + sub[2] <= lineBox[0] + lineBox[2] && sub[0] + sub[2] >= lineBox[0] + lineBox[2] - 12, "it ends at the zone's edge");
  f = await drawn({ verb: "Open the Bay", subject: "a short one" }); assert.deepEqual(typeIn(logOf(f), "line").map((t) => t.text), ["Open the Bay", " \u00b7 ", "a short one"]);
  f = await start(scene({ adults: 2, carry: [0], away: true, focus: "companion" }), { dir: node }); lg = logOf(f); assert.deepEqual(f.build.props.regions.line, { note: "the Companion is on a trip" }); assert.equal(lineNodes(f)["line.cap"], undefined, "no cap: ✓ does nothing there"); assert.deepEqual(typeIn(lg, "line").map((t) => t.text), ["the Companion is on a trip"]);
});
test("the line never wraps: every pair of needs (the first by its action, the second by its notice, counts at their most) and every verb measures inside the zone, at the face's own Inter", { skip }, async () => {
  const f = installScene(await bootFace(pathToFileURL(node + "/"), { test: true })), W = (s) => f.measure(s, 16), sep = W(homeSpec.regions.line.sep), room = lineBox[2] - 12 - 4 - 16 - 4;
  const species = readdirSync(framesDir).filter((x) => x.startsWith("species-")).map((x) => JSON.parse(readFileSync(path.join(framesDir, x), "utf8")).species.name);
  const widest = species.reduce((a, b) => (W(b) > W(a) ? b : a)), NAME_MAX = 160;   // the namer's limit: a name is at most 160 px at Inter 16 (namer.json limit.inter16); the widest letters make the widest name
  let name = ""; while (W(name + "W") <= NAME_MAX) name += "W";
  const keys = homeSpec.strings.line.order, facts = (k, n) => ({ key: k, n, max: k === "crates" ? 3 : 6, name, species: widest, a: "an", module: homeSpec.strings.needs[k].module }), words = (k, n) => wordsOf(facts(k, n), homeSpec);
  let worst = 0, at = "";
  for (const a of keys) for (const b of keys) if (a !== b) for (const na of [1, 2, 6]) for (const nb of [1, 2, 6]) { const w = W(homeSpec.strings.needs[a].lineAction ?? words(a, na).action) + sep + W(words(b, nb).notice); if (w > worst) { worst = w; at = `${a} (${na}) then ${b} (${nb})`; } }
  console.log(`# the line: the widest pair of needs is ${worst} px of the ${room} the zone leaves its words (${at})`);
  assert.ok(worst <= room, `the widest pair of needs, ${at}, is ${worst} of ${room}`);
  for (const v of Object.values(homeSpec.strings.actions)) assert.ok(W(v) + 16 + 4 <= lineBox[2], v);
  assert.ok(W(homeSpec.strings.notes.companionAway) <= lineBox[2]);
});

// ---- the stations' words ----
test("the stations say what the spec says: Pods, Incubator in each state, Companion docked and away, Bay waiting and clear, each with the amber lamp where the spec turns it", { skip }, async () => {
  const P = (o) => scene({ adults: 2, ...o }).props.regions, model = (b, over = {}) => ({ st: b.st, sv: b.sv, settings, docked: true, ui: {}, time: 0, date: { y: 2026, m: 9, d: 17 }, now: Date.now(), ...over });
  { const r = P({}).pods; assert.deepEqual([r.line1, r.line2, r.lamp], ["the case is empty", "", "off"]); }
  { const r = P({ pods: 3 }).pods; assert.deepEqual([r.line1, r.line2, r.lamp], ["3 in the case", "", "off"], "one kind: no second line"); }
  { const b = scene({ adults: 2, pods: 2 }); b.st.tray[1].species = "S05"; b.st.tray[1].sp = 4; const r = homeBuild(model(b), homeSpec, frameSpec).props.regions.pods; assert.equal(r.line1, "2 in the case"); assert.equal(r.line2, "2 kinds"); }
  { const b = scene({ adults: 2, pods: 1 }); b.st.tray[0].seen = 0; b.st.tray[0].idd = false; const r = homeBuild(model(b), homeSpec, frameSpec).props.regions.pods; assert.equal(r.lamp, "needsYou", "a new pod unread: amber"); }
  { const r = P({}).incubator; assert.deepEqual([r.state, r.line1, r.line2, r.lamp], ["empty", "empty", "", "off"]); }
  { const r = P({ bud: 1 }).incubator; assert.deepEqual([r.state, r.line1, r.lamp], ["growing", "a bud growing", "off"]); assert.match(r.line2, /^an? [A-Z]\w+$/); }
  { const r = P({ bud: 1e8 / 60000 }).incubator; assert.deepEqual([r.state, r.line1, r.lamp], ["ready", "the bud is ready", "needsYou"], "only the lamp turns"); assert.match(r.line2, /^an? [A-Z]\w+$/); }
  { const r = P({ carry: [0] }).companion; assert.deepEqual([r.state, r.line2, r.lamp], ["docked", "", "off"]); assert.match(r.line1, / at home$/); }
  { const r = P({ carry: [0], away: true }).companion; assert.deepEqual([r.state, r.line2, r.lamp], ["away", "", "off"]); assert.match(r.line1, / on a trip$/); }
  { const r = P({}).bay; assert.deepEqual([r.state, r.line1, r.line2, r.lamp, r.berths], ["clear", "berths clear", "", "off", 3]); }
  { const r = P({ crates: 3 }).bay; assert.deepEqual([r.state, r.line1, r.line2, r.lamp, r.berths], ["waiting", "3 crates in", "from the last trip", "needsYou", 3]); }
  { const r = P({ crates: 4, trips: 2 }).bay; assert.deepEqual([r.line1, r.line2], ["4 crates in", "from 2 trips"]); }
  { const r = P({ crates: 2, portrait: true }).bay; assert.deepEqual([r.berths, r.lamp], [4, "needsYou"], "the fourth berth, frame-shaped, while a portrait crate is in"); }
  { const r = P({ portrait: true }).bay; assert.deepEqual([r.berths, r.lamp, r.line1], [4, "needsYou", "berths clear"]); }
});
test("a station's words are Inter at its sizes at their places: the name 16 at (12, 8), line 1 at 20 at (12, 34), line 2 at 16 at (12, 64), in the station's rectangle", { skip }, async () => {
  const f = await start(scene({ adults: 2, crates: 3 }), { dir: node }), S = R.bay.rect, lg = logOf(f);
  assert.deepEqual(typeIn(lg, "bay").map((t) => [t.text, t.px]), [["Bay", 16], ["3 crates in", 20], ["from the last trip", 16]]);
  const cap = (px, y, pitch) => y + Math.floor((pitch - { 16: 12, 20: 14 }[px]) / 2);
  for (const [id, x, y, px] of [["bay.name", 12, 8, 16], ["bay.line1", 12, 34, 20], ["bay.line2", 12, 64, 16]]) { const r = box(f, id); assert.equal(r[0], S[0] + x, id); assert.ok(r[1] >= S[1] + y && r[1] < S[1] + y + (px === 20 ? 28 : 20), `${id} ${r}: in its line box`); assert.ok(inside(r, S), `${id} ${r} leaves ${S}`); }
  void cap;
});
test("the Vivarium's readout: each part only when non-zero, 'all on a trip' when nobody is home, nothing with no mibi; the Library's header has no count", { skip }, async () => {
  const ro = (o) => scene({ adults: 3, ...o }).props.regions.vivarium.readout;
  assert.equal(ro({}), "3 at home"); assert.equal(ro({ carry: [0], away: true }), "2 at home \u00b7 1 on a trip"); assert.equal(ro({ carry: [0, 1, 2], away: true }), "all on a trip"); assert.equal(ro({ adults: 0 }), "");
  const f = await start(scene({ adults: 3, carry: [0], away: true }), { dir: node }), lg = logOf(f); assert.deepEqual(typeIn(lg, "vivarium").map((t) => t.text), ["Vivarium", "2 at home \u00b7 1 on a trip"]); assert.deepEqual(typeIn(lg, "library").map((t) => t.text), ["Library"]);
  const v = box(f, "vivarium.title"), r = box(f, "vivarium.readout"); assert.equal(r[0], v[0] + v[2] + 8, "the readout 8 after the title"); assert.equal(v[0], R.vivarium.rect[0] + 12);
});

// ---- the needs ----
test("the needs hold in the spec's order and clear when acted on: crates, the bud, a portrait, a new mibi to meet, new or glinting pods, pods waiting for a well, a pod that could be incubated", { skip }, async () => {
  const b = scene({ adults: 3, crates: 2, bud: 1e8 / 60000, portrait: true, unseen: true, waiting: true, ui: { meet: 1 } });
  const keys = (x) => homeNeeds(x.st, x.sv, settings, x.ui ?? { meet: 1 }, Date.now() + 1000).map((n) => n.key); assert.deepEqual(keys(b), ["crates", "budReady", "portrait", "meet", "newPods", "waitingPods"]);
  assert.deepEqual(homeSpec.strings.line.order, ["crates", "budReady", "portrait", "meet", "newPods", "glints", "waitingPods", "couldGrow"]);
  assert.deepEqual(b.props.regions.line, { needs: ["Open the Bay", "the bud is ready"] }, "at most two");
  b.sv.bay = []; assert.deepEqual(keys(b).slice(0, 2), ["budReady", "portrait"], "the crates are gone once opened");
});

// ---- the dirty area (build spec 7): the lamp change is asserted inside 153,600 px; the ring moving between a bezel and a station is PRINTED (the spec's "Print"): the ring is one nine-slice node and LVGL redraws the whole box of a node that appears,
//      moves or goes, so a ring round a 620 x 400 bezel redraws its box (258,300 px), over the bound. The numbers are in the log; the question is the lead's (the ring on a large target). ----
test("a lamp change redraws a small part of the screen; the ring moving between a bezel and a station is measured and printed", { skip }, async () => {
  const f = await start(scene({ adults: 2, crates: 1, focus: "vivarium" }), { t0: 1000 }); logOf(f); dirty(f);
  const moves = []; let prev = "vivarium";
  for (const to of ["library", "bay", "library", "vivarium", "pods", "vivarium", "incubator", "companion", "bay", "library", "vivarium"]) { withFocus(f, to, 1); moves.push([`${prev} to ${to}`, dirty(f)]); prev = to; assert.deepEqual(f.errors(), []); }
  const stations = moves.filter(([n]) => !/vivarium|library/.test(n)); for (const [n, d] of stations) assert.ok(d <= 153600, `${n}: ${d} px`);
  const lamp = scene({ adults: 2, crates: 1, focus: "vivarium" }), off = scene({ adults: 2, focus: "vivarium" }); resend(f, off, 1); dirty(f); resend(f, lamp, 1); const a = dirty(f);
  assert.ok(a > 0 && a <= 153600, `a lamp change redrew ${a} px`);
  console.log(`# Home's ring moving, px redrawn (the bound is 153,600): ${moves.map(([n, d]) => `${n} ${d}`).join(", ")}; a lamp change (the Bay's and the line's) ${a} px`);
  assert.equal(f.invOverflows(), 0, "no overflow of LVGL's invalid areas");
});
