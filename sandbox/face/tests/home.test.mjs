// Home on the face (lvgl-switch.md §4 L2.2): the words and the binding table (screens/home_frame.c) on the props views/home-props.mjs gives, in Node on the WebAssembly build: every scene draws without an error or a refusal inside the object and
// picture budgets with no region leaving home.json's rectangle (tools/home-regions.mjs, proved here to fail on a moved region), the focus graph of the spec played on the face (every vector, the focus said on the frame of the key), the keys (✓ and
// the room keys are intents, ← does nothing), the rest (events.rest) at its instants with the screen change's dither covering the whole stage, the line (needs, goal, verb and subject, note: each inside its zone, never wrapping), the stations'
// words and the dirty area of a lamp change and of the ring moving between a bezel and a station. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/home.test.mjs
import { test } from "node:test";
import "../../station/tests/fixtures/rooms.mjs";   // the rooms spec for the props builders, as the page registers it
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy, installScene } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames, frameOf, podGenome } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { homeBuild, homeNeeds, wordsOf, setLibrary } from "../../station/src/views/home-props.mjs";
import { libraryOf, warmLibrary, glintAt, glintSpot, GLINT_TURNS } from "../../station/src/views/specimen-props.mjs";
import { renderSpecimen } from "../../station/src/specimen.mjs";
setLibrary(libraryOf);   // the host registers it; Home's Library module is the specimen (build spec 4.2)
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
  warmLibrary(st, settings);
  const sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: Array.from({ length: o.crates ?? 0 }, (_, i) => crate(i + 1, o.trips ? i % o.trips : 0)), mibis: [], carried: (o.carry ?? []).map((i) => st.mibis[i].id), tier: 1, shield: 3 };
  return { ...homeBuild({ st, sv, settings, docked: S.docked(st), ui: o.ui ?? {}, focus: o.focus ?? null, time: 12 * 3600 + 41 * 60, date: { y: 2026, m: 9, d: 17 }, now: Date.now() + 1000, place: o.place ?? "" }, homeSpec, frameSpec), st, sv };
}
const frameProps = () => ({ plate: { text: "" } });   // Home's frame carries the plate only: its bar and its line are its own

// stand-in pictures for the frame's marks: a flat block keyed by id at the size the id names
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function standIn(id, [w, h]) { const d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d }; }
const MARKS = [[frameSpec.regions.top.slice, [1024, 40]], ...Object.values(frameSpec.regions.marks.lamp12).map((id) => [id, [12, 12]]), [frameSpec.regions.marks.capConfirm, [16, 16]]];

// the stations' pictures, as the host sends them: each id of the props at its size (a master's size is in its id; the rack pod and the glint are the spec's; the relit pod is the capsule's podSize)
function stationPictures(b) {
  const R = b.props.regions, out = new Map(), add = (id, size) => { if (id) out.set(id, size); }, sized = (id) => { const m = /(\d+)x(\d+)$/.exec(id); return [+m[1], +m[2]]; };
  for (const w of R.pods.wells) { add(w.pod, homeSpec.regions.rackPod.size); add(w.glint, [12, 12]); }
  const c = R.incubator.capsule; for (const k of ["interior", "shell", "door", "bar", "glass"]) add(c[k], sized(c[k])); add(c.pod, c.podSize);
  for (const id of R.library.levels ?? []) add(id, [344, 362]); add(R.library.star, [12, 12]);   // the Library's specimen: its four levels and the glint
  add(R.companion.picture, sized(R.companion.picture)); if (R.companion.plates) { add(R.companion.plates.wholePicture, [12, 24]); add(R.companion.plates.lostPicture, [12, 24]); }
  for (const id of Object.values(R.bay.pictures)) add(id, sized(id));
  return out;
}
async function start(b, { motion = true, t0 = 0, dir = dist } = {}) {
  const f = await bootFace(pathToFileURL(dir + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["home", homeSpec], ["rooms", J("rooms")]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  for (const [id, size] of MARKS) f.handleOf(id, withPolicy((i) => standIn(i, size)));
  for (const [id, size] of stationPictures(b)) f.handleOf(id, withPolicy((i) => standIn(i, size)));
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
    const f = await start(scene({ adults: 2, focus: v.from === "room" ? null : v.from }), { motion: false }), before = f.hash(), out = key(f, v.key);   /* reduced motion: the Library's glints and breathing are time, and a key that moves nothing must change no pixel */
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
  const f = await start(scene({ adults: 3, crates: 2, bud: 1e8 / 60000 }), { dir: node }), lg = logOf(f); assert.deepEqual(f.build.props.regions.line, { needs: ["Open the Bay", "The bud is ready"] });
  const N = lineNodes(f); assert.deepEqual(Object.keys(N).sort(), ["line.cap", "line.lamp", "line.needs.0"]); for (const [id, r] of Object.entries(N)) assert.ok(inside(r, lineBox), `${id} ${r} leaves the zone ${lineBox}`);
  assert.deepEqual([N["line.lamp"][2], N["line.lamp"][3], N["line.cap"][2], N["line.cap"][3]], [12, 12, 16, 16]); assert.equal(N["line.cap"][0], N["line.lamp"][0] + 12 + 4, "the lamp, 4, then the cap"); assert.equal(N["line.needs.0"][0], N["line.cap"][0] + 16 + 4, "the cap, 4, then the words");
  const left = N["line.lamp"][0], right = N["line.needs.0"][0] + N["line.needs.0"][2]; assert.ok(Math.abs((left + right) / 2 - 580) <= 1, `centred on the zone: ${(left + right) / 2}`);
  assert.deepEqual(typeIn(lg, "line").map((t) => [t.text, t.px]), [["Open the Bay \u00b7 The bud is ready", 16]]);
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
  const words = typeIn(lg, "line").map((t) => t.text); assert.equal(words[0], "Open the Bay"); assert.equal(words[1], "\u00b7"); assert.match(words[2], /\u2026$/, "the subject is cut with an ellipsis"); assert.ok(!words[0].includes("\u2026") && !words[1].includes("\u2026"), "only the subject may end in one");
  for (const [id, r] of Object.entries(lineNodes(f))) assert.ok(inside(r, lineBox), `${id} ${r} leaves the zone`); const sub = box(f, "line.subject.0"); assert.ok(sub[0] + sub[2] <= lineBox[0] + lineBox[2] && sub[0] + sub[2] >= lineBox[0] + lineBox[2] - 12, "it ends at the zone's edge");
  f = await drawn({ verb: "Open the Bay", subject: "a short one" }); assert.deepEqual(typeIn(logOf(f), "line").map((t) => t.text), ["Open the Bay", "\u00b7", "a short one"]);
  f = await start(scene({ adults: 2, carry: [0], away: true, focus: "companion" }), { dir: node }); lg = logOf(f); assert.deepEqual(f.build.props.regions.line, { note: "The Companion is on a trip" }); assert.equal(lineNodes(f)["line.cap"], undefined, "no cap: ✓ does nothing there"); assert.deepEqual(typeIn(lg, "line").map((t) => t.text), ["The Companion is on a trip"]);
});
test("the line never wraps: every pair of needs (the first by its action, the second by its notice, counts at their most) and every verb measures inside the zone, at the face's own Inter", { skip }, async () => {
  const f = installScene(await bootFace(pathToFileURL(node + "/"), { test: true })), W = (s) => f.measure(s, 16), sep = W(homeSpec.regions.line.sep), room = lineBox[2] - 12 - 4 - 16 - 4;
  const species = readdirSync(framesDir).filter((x) => x.startsWith("species-")).map((x) => JSON.parse(readFileSync(path.join(framesDir, x), "utf8")).species.name);
  const widest = species.reduce((a, b) => (W(b) > W(a) ? b : a)), NAME_MAX = 160;   // the namer's limit: a name is at most 160 px at Inter 16 (namer.json limit.inter16); the widest letters make the widest name
  let name = ""; while (W(name + "W") <= NAME_MAX) name += "W";
  const keys = homeSpec.strings.line.order, facts = (k, n) => ({ key: k, n, max: k === "crates" ? 3 : 6, name, species: widest, a: "an" }), words = (k, n) => wordsOf(facts(k, n), { strings: { needs: homeSpec.strings.line.needs } });
  let worst = 0, at = "";   // the first need comes before the second in the spec order: only those pairs can be on the line
  for (const a of keys) for (const b of keys) if (keys.indexOf(a) < keys.indexOf(b)) for (const na of [1, 2, 6]) for (const nb of [1, 2, 6]) { const w = W(words(a, na).action) + sep + W(words(b, nb).notice); if (w > worst) { worst = w; at = `${a} (${na}) then ${b} (${nb})`; } }
  console.log(`# the line: the widest pair of needs is ${worst} px of the ${room} the zone leaves its words (${at})`);
  assert.ok(worst <= room, `the widest pair of needs, ${at}, is ${worst} of ${room}`);
  for (const v of Object.values(homeSpec.strings.actions)) assert.ok(W(v) + 16 + 4 <= lineBox[2], v);
  assert.ok(W(homeSpec.strings.notes.companionAway) <= lineBox[2]);
});

// ---- the stations' words ----
test("the stations say what the spec says: Pods, Incubator in each state, Companion docked and away, Bay waiting and clear, each with the amber lamp where the spec turns it", { skip }, async () => {
  const P = (o) => scene({ adults: 2, ...o }).props.regions, model = (b, over = {}) => ({ st: b.st, sv: b.sv, settings, docked: true, ui: {}, time: 0, date: { y: 2026, m: 9, d: 17 }, now: Date.now(), ...over });
  { const r = P({}).pods; assert.deepEqual([r.line1, r.line2, r.lamp], ["empty", "", "off"]); }
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
  { const r = P({ portrait: true }).bay; assert.deepEqual([r.berths, r.lamp, r.line1], [4, "needsYou", "a portrait in"]); }
});
test("a station's words are Inter at its sizes at their places: the lamp at (12, 10), the name 16 at (30, 8), line 1 at 20 at (12, 34), line 2 at 16 at (12, 64), in the station's rectangle", { skip }, async () => {
  const f = await start(scene({ adults: 2, crates: 3 }), { dir: node }), S = R.bay.rect, lg = logOf(f);
  assert.deepEqual(typeIn(lg, "bay").map((t) => [t.text, t.px]), [["Bay", 16], ["3 crates in", 20], ["from the last trip", 16]]);
  const cap = (px, y, pitch) => y + Math.floor((pitch - { 16: 12, 20: 14 }[px]) / 2);
  for (const [id, x, y, px] of [["bay.name", 30, 8, 16], ["bay.line1", 12, 34, 20], ["bay.line2", 12, 64, 16]]) { const r = box(f, id); assert.equal(r[0], S[0] + x, id); assert.ok(r[1] >= S[1] + y && r[1] < S[1] + y + (px === 20 ? 28 : 20), `${id} ${r}: in its line box`); assert.ok(inside(r, S), `${id} ${r} leaves ${S}`); }
  void cap; const lamp = box(f, "bay.lamp"); assert.deepEqual(lamp.slice(0, 2), [S[0] + 12, S[1] + 10], "the lamp at (12, 10)");
  const pic = box(f, "bay.berth.0"), last = box(f, "bay.berth.2"); assert.equal(last[0] + last[2], S[0] + S[2] - 8, "the berths end 8 in from the right edge");
  for (const id of ["bay.line1", "bay.line2"]) { const r = box(f, id); if (id === "bay.line1") assert.ok(r[0] + r[2] <= pic[0] - 8, `${id} ${r}: a column, 8 clear of the picture`); }
});
test("the Pods station draws a slot for each pod (at most six) in a 3 x 2 grid, filled panels for pods and hairline outlines for the rest; a portrait alone makes the Bay say whose it is", { skip }, async () => {
  let f = await start(scene({ adults: 2, pods: 4 }), { dir: node }); const S = R.pods.rect, slots = [0, 1, 2, 3, 4, 5].map((i) => box(f, `pods.slot.${i}`));
  assert.equal(f.build.props.regions.pods.slots, 4); assert.ok(slots.slice(0, 4).every((r) => r && r[2] === 24 && r[3] === 32), "four filled slots of 24 x 32");
  assert.equal(slots[0][1], slots[1][1], "a row"); assert.ok(slots[3][1] > slots[0][1], "a second row"); for (const r of slots.filter(Boolean)) assert.ok(inside(r, S), `${r} leaves ${S}`);
  f = await start(scene({ adults: 2, portrait: true }), { dir: node }); const lg = logOf(f);
  assert.deepEqual(typeIn(lg, "bay").map((t) => [t.text, t.px]), [["Bay", 16], ["a portrait in", 16], [f.build.props.regions.bay.line2, 16]]);
  assert.match(f.build.props.regions.bay.line2, /'s portrait$|^from a sitting$/);
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
  assert.deepEqual(homeSpec.strings.line.order, ["crates", "full", "budReady", "portrait", "meet", "newPods", "glints", "waitingPods", "couldGrow"]);
  assert.deepEqual(b.props.regions.line, { needs: ["Open the Bay", "The bud is ready"] }, "at most two");
  b.sv.bay = []; assert.deepEqual(keys(b).slice(0, 2), ["budReady", "portrait"], "the crates are gone once opened");
});

// ---- the dirty area (build spec 7): the lamp change is asserted inside 153,600 px; the ring moving between a bezel and a station is PRINTED (the spec's "Print"): the ring is one nine-slice node and LVGL redraws the whole box of a node that appears,
//      moves or goes, so a ring round a 620 x 400 bezel redraws its box (258,300 px), over the bound. The numbers are in the log; the question is the lead's (the ring on a large target). ----
test("a lamp change redraws a small part of the screen; every move of the ring (a bezel or a station, to another) redraws at most 153,600 px, and the ring is eight LVGL objects that leave none behind", { skip }, async () => {
  const f = await start(scene({ adults: 2, crates: 1, focus: "vivarium" }), { t0: 1000 }); logOf(f); dirty(f);
  const moves = []; let prev = "vivarium";
  for (const to of ["library", "bay", "library", "vivarium", "pods", "vivarium", "incubator", "companion", "bay", "library", "vivarium"]) { withFocus(f, to, 1); moves.push([`${prev} to ${to}`, dirty(f)]); prev = to; assert.deepEqual(f.errors(), []); }
  for (const [n, d] of moves) assert.ok(d <= 153600, `${n}: ${d} px`);
  const lamp = scene({ adults: 2, crates: 1, focus: "vivarium" }), off = scene({ adults: 2, focus: "vivarium" }); resend(f, off, 1); dirty(f); resend(f, lamp, 1); const a = dirty(f);
  assert.ok(a > 0 && a <= 153600, `a lamp change redrew ${a} px`);
  console.log(`# Home's ring moving, px redrawn (the bound is 153,600): ${moves.map(([n, d]) => `${n} ${d}`).join(", ")}; a lamp change (the Bay's and the line's) ${a} px`);
  assert.equal(f.invOverflows(), 0, "no overflow of LVGL's invalid areas");
});
test("the ring moves between targets as the same eight LVGL objects; going away from Home's focus leaves none behind", { skip }, async () => {
  const f = await start(scene({ adults: 2, crates: 1, focus: "vivarium" }), { dir: node }); logOf(f);
  const withRing = f.objects(), lg = logOf(f) ?? {}; void lg;
  withFocus(f, "bay", 1); assert.equal(f.objects(), withRing, "the ring moved to a station: the same count of objects");
  const rest = scene({ adults: 2, crates: 1 }); rest.props.focus = { ...rest.props.focus, cur: "room" }; resend(f, rest, 3);
  const fresh = await start(scene({ adults: 2, crates: 1 }), { dir: node }); fresh.build.props.focus.cur = "room"; resend(fresh, fresh.build, 3);
  assert.equal(f.objects(), fresh.objects(), "after the ring went, the same objects as a Home that never had one: none left behind"); assert.deepEqual(f.errors(), []);
});

// ---- the Vivarium window (build spec 3, H2): the crop of Idle's painting, the inner shade, six walkers on the moved profile, the away frame and its keep-out, the event tag, and the budgets of section 7 ----
import { movingScene, bootScene, runFrames, STATE, SPEC } from "./moving-scene.mjs";
const vivSpec = SPEC("vivarium"), WIN = homeSpec.regions.window, RW = homeSpec.regions.resident.walk;
// Home's ground is the main level of the room (rooms.json, painting coordinates) in the window's: the painting less the crop's offset, x less 40 and y less 116 (home.json window.rect less painting.at)
const ROOMMAIN = SPEC("rooms").rooms.roots.levels[0], HDX = WIN.rect[0] - WIN.painting.cx, HDY = WIN.rect[1] - WIN.painting.rows[0];
const groundTopHome = (fx) => { const x = fx - HDX; let t = ROOMMAIN.top[0]; ROOMMAIN.x.slice(0, -1).forEach((b, i) => { if (x >= b) t = ROOMMAIN.top[i]; }); return t + HDY; };
const homeScene = (o = {}) => movingScene("home", { motionSets: false, ...o });
test("the window is the 1:1 crop at (64, 194) of Idle's painting of the light, 604 by 362 at (24, 78), with a 2 px inner shade on the top and left drawn as rects; the placeholder goes, the Library's stays", { skip }, async () => {
  assert.deepEqual([WIN.painting.cx, WIN.painting.at, WIN.painting.rows, WIN.rect], [64, [64, 194], [194, 555], [24, 78, 604, 362]]);
  for (const light of ["dawn", "day", "dusk", "night"]) {
    const sc = homeScene({ adults: 3, juveniles: 1, light }), f = await bootScene(sc, { motion: false, dir: node });
    assert.equal(sc.props.regions.glass.picture, `room-roots-idle-${light}-1024x568`, "the same painting the Vivarium uses, by the light: no new master");
    assert.deepEqual(f.errors(), []); assert.deepEqual(box(f, "vivarium.glass"), [24, 78, 604, 362]);
    assert.deepEqual(box(f, "vivarium.shade.t"), [24, 78, 604, 2]); assert.deepEqual(box(f, "vivarium.shade.l"), [24, 78, 2, 362]);
    assert.deepEqual(box(f, "vivarium.window").slice(2), [0, 0], "no placeholder under the painting"); assert.deepEqual(box(f, "library.window").slice(2), sc.props.regions.library.picture ? [0, 0] : [344, 362], "the Library is its placeholder only while no species has a look found");
  }
});
test("the window shows at most five of the mibis at home (R4b: the others rest, vivarium.json rules.show), in bay order; none at home shows none; the carried are never drawn; the residents are never focus targets", { skip }, async () => {
  const sc = homeScene({ adults: 8 }), res = sc.props.regions.residents, ids = res.filter((p) => p.shown).map((p) => p.id), all = sc.st.mibis.map((m) => String(m.id));
  assert.equal(res.length, 8); assert.equal(ids.length, 5); assert.deepEqual(res.map((p) => p.id), all, "bay order"); assert.deepEqual(ids, all.slice(3), "the same stage and born: the first three by id rest");
  assert.equal(homeScene({ adults: 3, carry: [0, 1, 2], docked: false }).props.regions.residents.length, 0, "all on a trip: nobody walks");
  assert.equal(homeScene({ adults: 3, carry: [0], docked: true }).props.regions.residents.length, 2, "docked, the carried one is not drawn either (R4b)");
  assert.ok(!sc.props.focus.targets.some((t) => /resident/.test(t.id)));
});
test("the walkers keep to the room's main floor in the window, x 32 to 620, feet to 435, and out of the away frame's keep-out while it shows, and never stand on a raised level (lv 0, no leg), over a minute of walking", { skip }, async () => {
  for (const [name, o] of [["stills", { motionSets: false }], ["moving", { motionSets: true }]]) for (const away of [false, true]) {
    const sc = homeScene({ adults: 5, juveniles: 3, ...o, ...(away ? { docked: false, carry: [0, 1] } : {}) }), f = await bootScene(sc, { motion: true, dir: node }), res = sc.props.regions.residents, M = f.M, shownIx = res.map((p, i) => i).filter((i) => res[i].shown !== false);
    assert.equal(!!sc.props.regions.glass.away, away); assert.equal(res.length, away ? 6 : 8); assert.equal(shownIx.length, 5); assert.deepEqual(f.errors(), []);
    const fig = res.map((p) => p.figure ?? [0, 0, p.stage === "juvenile" ? 104 : 144, p.stage === "juvenile" ? 112 : 152]);
    let moved = 0; const seen = new Set();
    runFrames(f, 60000, { each: () => { res.forEach((p, i) => { if (!shownIx.includes(i)) return; let x = M._face_test_mv(i, 0), feet = M._face_test_mv(i, 1); if (x < -1000) { const b = box(f, `g.${p.id}`); x = b[0] + WIN.rect[0]; feet = b[1] + b[3] + WIN.rect[1]; }   /* a still: its picture box (the clip's own coordinates), the feet its bottom edge */ const W = fig[i][2], fx = x + Math.floor(W / 2); seen.add(i);
      assert.ok(x >= RW.ground[0] && x + W <= RW.ground[0] + RW.ground[2], `${name}: ${p.id} x ${x} + ${W} leaves 32 .. 620`); assert.ok(feet <= 435, `${p.id} feet ${feet} below the foot 435`);
      assert.ok(feet >= groundTopHome(fx), `${name}: ${p.id} feet ${feet} above the main floor ${groundTopHome(fx)} at ${fx}`); assert.ok(feet >= RW.ground[1], `${name}: ${p.id} feet ${feet} above Home's band ${RW.ground[1]}`);
      { const st = STATE(M._face_test_state(i)); assert.deepEqual([st.lv, st.leg], [0, 0], `${name}: ${p.id} is on a raised level or a join`); }
      if (away) assert.ok(!(x + W > RW.keepOut[0] && feet >= RW.keepOut[1]), `${name}: ${p.id} at (${x}, ${feet}) meets the away frame's keep-out`); moved++; }); } });
    assert.ok(moved > 0 && seen.size === 5, `${name}: all five shown walked and were read`); assert.deepEqual(f.errors(), []);
  }
});
test("Home's starts (R4b-1b, home.json regions.resident.walk.start): five shown open apart, no shown resident's ink box overlapping another's widened by 25 px each side, on the first frame; Idle and the whole have no such rule", { skip }, async () => {
  assert.equal(RW.startWiden, 25, "home.json regions.resident.walk.startWiden"); assert.match(RW.start, /8 draws/);
  for (const [name, o] of [["stills", { motionSets: false }], ["moving", { motionSets: true }]]) {
    const sc = homeScene({ adults: 5, juveniles: 3, ...o }), f = await bootScene(sc, { motion: true, dir: node }), res = sc.props.regions.residents, M = f.M, shown = res.map((p, i) => i).filter((i) => res[i].shown !== false);
    runFrames(f, 1000); const ink = shown.map((i) => { const x = M._face_test_rest(i, 4), feet = M._face_test_rest(i, 5), w = M._face_test_rest(i, 11), h = M._face_test_rest(i, 10); return [x, feet + 1 - h, w, h]; });
    assert.equal(shown.length, 5); for (const b of ink) assert.ok(b[2] > 0 && b[3] > 0, `${name}: ink boxes read`);
    for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) if (a < b) { const A = ink[a], B = ink[b], meet = A[0] < B[0] + B[2] + 25 && B[0] - 25 < A[0] + A[2] && A[1] < B[1] + B[3] && B[1] < A[1] + A[3]; assert.ok(!meet, `${name}: ${a} ${JSON.stringify(A)} and ${b} ${JSON.stringify(B)} open on a heap`); }
    assert.deepEqual(f.errors(), []);
  }
});
test("the away frame: 64 x 64 at (556, 352), a panel ground and a hairline edge, the first mibi out on a trip at its world size bottom-centred, the caption 'away' in frost centred under it at y 418; with nobody away there is none", { skip }, async () => {
  const sc = homeScene({ adults: 4, docked: false, carry: [1, 2] }); sc.props.regions.glass.away.figure = [47, 105, 49, 43];   /* an adult's figure as the host measures it: [dx, dy, W, H] in its 144 x 152 picture (the Node test has no layered stand to measure) */
  const f = await bootScene(sc, { motion: false, dir: node }), fr = homeSpec.regions.away;
  assert.deepEqual([fr.rect, fr.fill, fr.edge, fr.caption.colour, fr.caption.y, fr.caption.centre], [[556, 352, 64, 64], "panel", "hairline", "frost", 418, 588]);
  assert.deepEqual(box(f, "away"), [556, 352, 64, 64]); assert.deepEqual(box(f, "away.et"), [556, 352, 64, 1]); assert.deepEqual(box(f, "away.el"), [556, 352, 1, 64]);
  const fb = box(f, "away.figure"), fg = fb && [fb[0] + 557, fb[1] + 353, fb[2], fb[3]];   /* the clip's own coordinates, its inside at (557, 353) */
  assert.ok(fg && fg[0] >= 557 && fg[0] + fg[2] <= 619 && fg[1] + fg[3] === 352 + 63, `the figure ${fg}: bottom-centred inside the edge`); assert.equal(Math.abs((fg[0] + fg[2] / 2) - 588) <= 1, true, "centred");
  const cap = box(f, "away.caption"), lg = logOf(f); assert.ok(Math.abs(cap[0] + cap[2] / 2 - 588) <= 1 && cap[1] >= 418 && cap[1] < 418 + 20, `the caption ${cap}`); assert.ok(typeIn(lg, "away").some((t) => t.text === "away" && t.px === 16));
  const none = await bootScene(homeScene({ adults: 4 }), { motion: false, dir: node }); assert.equal(box(none, "away"), null, "docked: no frame");
  const first = homeScene({ adults: 4, docked: false, carry: [2, 1] }); assert.equal(first.props.regions.glass.away.picture.includes("144x152"), true);
});
test("the event tag is the house name tag on that mibi only, at feetY + 16 (flipped over the figure past the window's foot), no lift; nobody else has one", { skip }, async () => {
  const sc = homeScene({ adults: 3, juveniles: 1, ui: { meet: 4 } }), f = await bootScene(sc, { motion: false, dir: node }), id = String(sc.st.mibis[3].id), W = sc.props.regions.residents;
  assert.equal(sc.props.regions.glass.tag, id); const tag = box(f, "nameTag"), mv = box(f, `g.${id}`); assert.ok(tag, "the tag"); assert.deepEqual(typeIn(logOf(f), "nameTag").map((t) => t.text), [W.find((p) => p.id === id).name]);
  assert.ok(tag[0] >= 24 + 8 && tag[0] + tag[2] <= 24 + 604 - 8, "slid inside the window"); assert.equal(homeScene({ adults: 3 }).props.regions.glass.tag, undefined);
  const g = await bootScene(homeScene({ adults: 3 }), { motion: false, dir: node }); assert.equal(box(g, "nameTag"), null); void mv;
});
test("budgets of section 7 on Home with the window: at most 400 objects, props at most 32 KiB, no frame over 153,600 px with six residents walking (stills and moving sets, a breathing swap included), the household tick inside 148,000", { skip }, async () => {
  assert.equal(vivSpec.rules.tickBudget, 148000);
  for (const [name, o] of [["stills", { motionSets: false }], ["moving", { motionSets: true }]]) {
    const sc = homeScene({ adults: 8, juveniles: 2, ...o, docked: false, carry: [0] }), f = await bootScene(sc, { motion: true, dir: node });
    assert.ok(f.objects() <= 400, `${name}: ${f.objects()} objects`); assert.ok(JSON.stringify(sc.props).length <= 32 * 1024, `${name}: props ${JSON.stringify(sc.props).length} B`);
    const r = runFrames(f, 30000, { cadence: [16, 0, 0], top: false }); console.log(`# Home's window (${name}): ${f.objects()} objects, worst frame ${r.worst} px, worst household tick ${r.worstTick} px, ${r.deferred} deferred`);
    assert.ok(r.worst <= 153600, `${name}: a frame redrew ${r.worst} px`); assert.ok(r.worstTick <= 148000, `${name}: a tick ${r.worstTick} px`); assert.equal(r.overflows, 0); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
  }
});
test("a lamp change and the ring moving between a bezel and a station stay inside the budget with the window drawn", { skip }, async () => {
  const sc = homeScene({ adults: 6, juveniles: 2, motionSets: true }), f = await bootScene(sc, { motion: false, dir: node }); f.sc = sc; logOf(f); dirty(f);
  const moves = []; let prev = "room";
  for (const to of ["vivarium", "library", "bay", "vivarium", "pods", "vivarium", "room"]) { sc.props.focus.cur = to; f.props({ ...sc.props, motion: false }); f.frame((f.t += 16)); moves.push([`${prev} to ${to}`, dirty(f)]); prev = to; }
  for (const [n, d] of moves) assert.ok(d > 0 && d <= 153600, `${n}: ${d} px`); console.log(`# Home's ring with the window, px: ${moves.map(([n, d]) => `${n} ${d}`).join(", ")}`);
});

// ---- the console's pictures (build spec 4.3, 11.4, H3): the signed masters 1:1 through the picture table, the case, the capsule, the Companion and the berths, and the budgets ----
import { createHash } from "node:crypto";
const StateRules = S;
const mastersDir = path.resolve(here, "../../ui/assets/masters"), mastersIndex = JSON.parse(readFileSync(path.join(mastersDir, "index.json"), "utf8")).masters;
const SIGNED_H3 = { "companion-upright-docked-28x46": [28, 46], "companion-upright-away-28x46": [28, 46], "berth-shut-26x24": [26, 24], "berth-crate-26x24": [26, 24], "berth-portrait-18x24": [18, 24] };
test("the five signed masters are placed unchanged in masters/home, at their own sizes, with their hashes in the index", () => {
  for (const [id, [w, h]] of Object.entries(SIGNED_H3)) {
    const e = mastersIndex[id]; assert.ok(e, `${id} is in the index`); assert.deepEqual([e.file, e.w, e.h], [`home/${id}.png`, w, h]);
    const buf = readFileSync(path.join(mastersDir, e.file)); assert.equal(createHash("sha256").update(buf).digest("hex"), e.sha256, `${id}: the file is its hash`); assert.deepEqual([buf.readUInt32BE(16), buf.readUInt32BE(20)], [w, h]);
  }
});
const picOf = (f, id) => { const r = box(f, id); return r && r.length ? r : null; };
test("Pods: the case's six slots 2 apart in 2 rows of 3 (76 x 66, 8 in, centred), a rack pod 24 x 32 in each slot that holds one and a hairline outline in the rest; a glint on a pod that has one", { skip }, async () => {
  const b = scene({ adults: 2, pods: 4 }), f = await start(b, { dir: node }), S = R.pods.rect, x0 = S[0] + S[2] - 8 - 76, y0 = S[1] + (S[3] - 66) / 2;
  assert.equal(b.props.regions.pods.wells.length, 6);
  for (let i = 0; i < 6; i++) { const r = box(f, `pods.slot.${i}`); assert.deepEqual(r, [x0 + (i % 3) * 26, y0 + Math.floor(i / 3) * 34, 24, 32], `slot ${i}`); assert.equal(!!b.props.regions.pods.wells[i].pod, i < 4, `slot ${i} holds a pod only when there is one`); }
  assert.equal(b.props.regions.pods.wells.filter((w) => w.pod).length, 4); assert.ok(b.props.regions.pods.wells.filter((w) => w.pod).every((w) => w.pod.startsWith("rackpod:")));
  // a glint: a pod identified whose chapter the player has read before and whose looks are not yet seen (state.mjs podGlints); the star is 12 x 12 over the slot's top right, at the spec's value
  const g = scene({ adults: 2, pods: 2 }); g.st.readOnce = { S01: frameOf("S01").chapters.map((c) => c.id) }; for (const p of g.st.tray) p.read = [];
  assert.ok(g.st.tray.some((p) => StateRules.podGlints(g.st, p)), "the scene glints");
  const gb = homeBuild({ st: g.st, sv: g.sv, settings, docked: true, ui: {}, focus: null, time: 0, date: { y: 2026, m: 9, d: 17 }, now: Date.now() }, homeSpec, frameSpec), fg = await start(gb, { dir: node });
  const n = gb.props.regions.pods.wells.filter((w) => w.glint).length; assert.ok(n >= 1 && gb.props.regions.pods.lamp === "needsYou", "a glinting pod, and the lamp turns amber");
  for (let i = 0; i < 6; i++) { const w = gb.props.regions.pods.wells[i], star = box(fg, `pods.glint.${i}`); if (!w.glint) { assert.equal(star, null, `slot ${i}: no glint`); continue; } const sl = box(fg, `pods.slot.${i}`);
    assert.deepEqual([star[2], star[3], star[0] - sl[0], star[1] - sl[1]], [12, 12, ...R.pods.glint.at], `slot ${i}: the glint (its place is ruled in build spec section 14)`); assert.ok(inside(star, R.pods.rect)); }
});
test("Incubator: the painted capsule 56 x 86 (8 in, centred) in its layers by the state, the bar lit to the bud's progress from its first pixel and whole when ready, nothing red and no minutes", { skip }, async () => {
  const S = R.incubator.rect, x0 = S[0] + S[2] - 8 - 56, y0 = S[1] + (S[3] - 86) / 2, C = R.incubator.capsule, layersOf = (b, f) => ["interior", "pod", "glass", "shell", "door", "bar"].filter((k) => box(f, `incubator.${k}`)).join();
  const empty = scene({ adults: 2 }), fe = await start(empty, { dir: node }); assert.equal(layersOf(empty, fe), "interior,shell,door", "empty: the interior, the shell, the door open"); assert.equal(empty.props.regions.incubator.capsule.barPx, 0);
  const grow = scene({ adults: 2, bud: 5 }), fg = await start(grow, { dir: node }); assert.equal(layersOf(grow, fg), "interior,pod,glass,shell,bar", "growing: the pod inside, the glass, the shell, the bar");
  const ready = scene({ adults: 2, bud: 1e8 / 60000 }), fr = await start(ready, { dir: node }); assert.equal(layersOf(ready, fr), "interior,pod,shell,door,bar", "ready: the door open, the bar whole");
  assert.equal(ready.props.regions.incubator.capsule.barPx, C.bar.max, "ready: the whole bar");
  for (const k of ["interior", "shell"]) assert.deepEqual(box(fg, `incubator.${k}`), [x0, y0, 56, 86], k);
  const bg = box(fg, "incubator.bar"), px = grow.props.regions.incubator.capsule.barPx; assert.ok(px >= 1 && px < C.bar.max, `${px} px of ${C.bar.max}`); assert.deepEqual(bg, [x0 + C.bar.rect[0], y0 + C.bar.rect[1], px, C.bar.rect[3]], "the bar's window from its left");
  const early = scene({ adults: 2, bud: 0 }); assert.ok(early.props.regions.incubator.capsule.barPx < grow.props.regions.incubator.capsule.barPx || early.props.regions.incubator.capsule.barPx === 1, "the bar grows with the progress");
  for (const [b, f] of [[empty, fe], [grow, fg], [ready, fr]]) { assert.deepEqual(f.errors(), []); for (const t of typeIn(logOf(f), "incubator")) assert.ok(!/\d+\s*(min|m\b)/.test(t.text), `no minutes on Home: "${t.text}"`); void b; }
});
test("Companion: the upright picture 28 x 46 (8 in, centred), docked or away; docked, the Probe's plates as line 2, up to four, whole then lost, 12 x 24 at (12, 64); away, no plates", { skip }, async () => {
  const S = R.companion.rect, docked = scene({ adults: 2, carry: [0] }), fd = await start(docked, { dir: node });
  assert.equal(docked.props.regions.companion.picture, "companion-upright-docked-28x46:28x46"); assert.deepEqual(box(fd, "companion.picture"), [S[0] + S[2] - 8 - 28, S[1] + 26, 28, 46]);
  const pl = docked.props.regions.companion.plates; assert.ok(pl.count >= 1 && pl.count <= 4 && pl.whole <= pl.count, JSON.stringify(pl));
  for (let i = 0; i < pl.count; i++) assert.deepEqual(box(fd, `companion.plate.${i}`), [S[0] + 12 + i * 16, S[1] + 64, 12, 24], `plate ${i}`);
  assert.equal(box(fd, `companion.plate.${pl.count}`), null, "no more plates than the Probe has");
  const lost = scene({ adults: 2, carry: [0] }); lost.sv.shield = 1; const hb = homeBuild({ st: lost.st, sv: lost.sv, settings, docked: true, ui: {}, time: 0, date: { y: 2026, m: 9, d: 17 }, now: Date.now() }, homeSpec, frameSpec); assert.equal(hb.props.regions.companion.plates.whole, 1, "a lost plate is the lost picture");
  const away = scene({ adults: 2, carry: [0], away: true }), fa = await start(away, { dir: node });
  assert.equal(away.props.regions.companion.picture, "companion-upright-away-28x46:28x46"); assert.equal(away.props.regions.companion.plates, undefined); assert.equal(box(fa, "companion.plate.0"), null); assert.deepEqual(box(fa, "companion.picture"), box(fd, "companion.picture"));
});
test("Bay: three berths 2 apart in line 1's row (y 32), the crates first then shut, the portrait berth last: 82 wide, 102 with the portrait, 8 in from the right edge", { skip }, async () => {
  const S = R.bay.rect;
  for (const [o, crates, n, name] of [[{}, 0, 3, "clear"], [{ crates: 1 }, 1, 3, "one"], [{ crates: 2 }, 2, 3, "two"], [{ crates: 5 }, 3, 3, "five crates: three berths"], [{ crates: 2, portrait: true }, 2, 4, "two and a portrait"], [{ portrait: true }, 0, 4, "a portrait alone: three shut and the frame"]]) {
    const b = scene({ adults: 2, ...o }), f = await start(b, { dir: node }), r = b.props.regions.bay, W = n === 4 ? 102 : 82; assert.deepEqual([r.crates, r.berths], [crates, n], name);
    const boxes = [0, 1, 2, 3].map((i) => box(f, `bay.berth.${i}`)); assert.equal(boxes.filter((x) => x && x[2] > 0).length, n, name);
    let x = S[0] + S[2] - 8 - W; for (let i = 0; i < n; i++) { const w = i < 3 ? 26 : 18; assert.deepEqual(boxes[i], [x, S[1] + 32, w, 24], `${name}: berth ${i}`); x += w + 2; }
    assert.equal(r.pictures.crate, "berth-crate-26x24:26x24"); assert.equal(r.pictures.shut, "berth-shut-26x24:26x24"); assert.equal(r.pictures.portrait, "berth-portrait-18x24:18x24");
    const col = box(f, "bay.line1"); assert.ok(col[0] + col[2] <= boxes[0][0] - 8, `${name}: line 1 stays clear of the berths`);
  }
});
// every state of the console at once: the budgets of section 7 (objects, props, pictures), asserted on the full scene and on each station state
const FULL_SCENES = { "all stations full": { adults: 6, pods: 6, bud: 1e8 / 60000, carry: [0], crates: 3, portrait: true, ui: {} }, "growing, away, clear": { adults: 3, pods: 3, bud: 5, carry: [0], away: true }, "empty": { adults: 1 } };
test("budgets (section 7) with the console's pictures: at most 400 objects, props at most 32 KiB, the picture table well inside its 1,024; printed per state", { skip }, async () => {
  for (const [name, o] of Object.entries(FULL_SCENES)) {
    const b = scene(o), f = await start(b, { dir: node }), st = f.stats(), props = JSON.stringify(b.props).length;
    assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0); assert.ok(f.objects() <= 400, `${name}: ${f.objects()} objects`); assert.ok(st.pictures <= 1024, `${name}: ${st.pictures} pictures`); assert.ok(props <= 32 * 1024, `${name}: props ${props} B`);
    console.log(`# Home, ${name}: ${f.objects()} objects (limit 400), ${st.pictures} pictures (table 1,024), props ${props} B (limit 32,768)`);
  }
});
test("the console's changes redraw at most 153,600 px a frame: a crate arriving, the bud growing then ready, a pod added, the Companion going away and docking, a lamp, and the ring over every station", { skip }, async () => {
  const f = await start(scene({ adults: 3, carry: [0], pods: 2 }), { t0: 1000 }); logOf(f); dirty(f); const seen = [];
  const to = async (o, name) => { const b = scene({ adults: 3, ...o }); for (const [id, size] of stationPictures(b)) f.handleOf(id, withPolicy((i) => standIn(i, size))); resend(f, b, 1); const d = dirty(f); seen.push([name, d]); assert.deepEqual(f.errors(), []); assert.ok(d <= 153600, `${name}: ${d} px`); };
  await to({ carry: [0], pods: 2, crates: 1 }, "a crate arrives"); await to({ carry: [0], pods: 2, crates: 3, portrait: true }, "more crates and a portrait"); await to({ carry: [0], pods: 3, crates: 3 }, "a pod added");
  await to({ carry: [0], pods: 3, bud: 5 }, "the bud grows"); await to({ carry: [0], pods: 3, bud: 10 }, "the bar advances"); await to({ carry: [0], pods: 3, bud: 1e8 / 60000 }, "the bud is ready");
  await to({ carry: [0], pods: 3, away: true }, "the Companion goes away"); await to({ carry: [0], pods: 3 }, "the Companion docks");
  for (const k of ["pods", "incubator", "companion", "bay", "pods"]) { const b = scene({ adults: 3, carry: [0], pods: 3, crates: 2, bud: 5, focus: k }); resend(f, b, 1); const d = dirty(f); seen.push([`ring on ${k}`, d]); assert.ok(d <= 153600, `ring to ${k}: ${d} px`); }
  console.log(`# Home's console, px redrawn (the bound is 153,600): ${seen.map(([n, d]) => `${n} ${d}`).join(", ")}`);
});

test("the Companion's line 1 names the carried mibi in every scene that carries one (the lead, else the first carried), and reads 'at home' or 'on a trip' alone only when none is carried", { skip }, async () => {
  for (const [name, o] of Object.entries(SCENES)) {
    const b = scene(o), c = b.props.regions.companion, carried = S.carriedIds(b.st, b.sv), mb = carried.length ? S.mibiById(b.st, b.sv.lead != null && carried.includes(b.sv.lead) ? b.sv.lead : carried[0]) : null;
    if (mb) { assert.ok(c.line1.startsWith(mb.name + " "), `${name}: "${c.line1}" must name ${mb.name}`); assert.equal(c.name, mb.name); } else assert.match(c.line1, /^(at home|on a trip)$/, `${name}: no one carried`);
  }
});

// ---- the Library module (build spec 4.2, H4): the specimen in the window, its words, the glints and the breathing ----
import { flatPicture } from "./moving-scene.mjs";
const L = homeSpec.regions.library, LS = L.specimen;
const rgbOf = (id) => [...flatPicture(id, [1, 1]).data.slice(0, 3)];
const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
test("the Library's window is the specimen 344 x 362 at (656, 78), its 2 px inner shade on the top and left, the placeholder gone; the header is 'Library' alone; the captions '{n} new' (gold, hidden at 0) and '{Species} genome' (mist, right-aligned at x 988), both at y 412", { skip }, async () => {
  assert.deepEqual([L.window, LS.shade.px, LS.shade.colour, LS.captions.new.at, LS.captions.new.colour, LS.captions.genome.right, LS.captions.genome.y, LS.captions.genome.colour], [[656, 78, 344, 362], 2, "void", [668, 412], "gold", 988, 412, "mist"]);
  for (const n of [0, 3]) {
    const sc = homeScene({ adults: 3, libNew: n, motionSets: false }), R = sc.props.regions.library, f = await bootScene(sc, { motion: false, dir: node }), lg = logOf(f);
    assert.deepEqual(f.errors(), []); assert.equal(R.picture, R.levels[0]); assert.equal(new Set(R.levels).size, 4); assert.match(R.picture, /^specimen:S01:[0-9a-f]{8}:v\d+$/); assert.deepEqual(R.levels.slice(1).map((id) => id.slice(R.picture.length)), [":b2", ":b3", ":b4"]);
    assert.deepEqual(box(f, "library.picture"), [656, 78, 344, 362]); assert.deepEqual(box(f, "library.shade.t"), [656, 78, 344, 2]); assert.deepEqual(box(f, "library.shade.l"), [656, 78, 2, 362]); assert.deepEqual(box(f, "library.window").slice(2), [0, 0], "no placeholder under the specimen");
    assert.deepEqual(typeIn(lg, "library").map((t) => t.text), ["Library"], "the header is the title alone: no count");
    assert.equal(R.genome, "Loika genome"); const gn = box(f, "library.genome"); assert.ok(gn && Math.abs(gn[0] + gn[2] - 988) <= 1 && gn[1] >= 412 && gn[1] < 412 + 20, `the genome caption ${gn}`);
    assert.deepEqual(typeIn(lg, "library.window").map((t) => [t.text, t.px]), n ? [[`${n} new`, 16], ["Loika genome", 16]] : [["Loika genome", 16]]);
    if (n) { const c = box(f, "library.new"); assert.ok(c && c[0] === 668 && c[1] >= 412 && c[1] < 412 + 20, `the new caption ${c}`); assert.equal(R.new, `${n} new`); } else { assert.equal(R.new, undefined); assert.equal(box(f, "library.new"), null, "hidden at 0"); }
    assert.equal(R.glints.length, n, `${n} glints`);
    R.glints.forEach(([x, y], i) => { const g = box(f, `library.glint.${i}`); assert.deepEqual(g, [656 + x - 6, 78 + y - 6, 12, 12], `glint ${i} is where the props put it`); assert.ok(x >= 18 && x <= 326 && y >= 18 && y <= 344, "inside the 12 px margin"); });
  }
});
test("with nothing found anywhere the window shows the starter's form in its empty state (every look a dormant open ring), captioned 'Loika genome', with no '{n} new' and no glint", { skip }, async () => {
  const sc = homeScene({ adults: 0 }), R = sc.props.regions.library, f = await bootScene(sc, { motion: false, dir: node }); assert.equal(R.species, "S01"); assert.equal(R.genome, "Loika genome"); assert.equal(R.new, undefined); assert.deepEqual(R.glints, []);
  assert.deepEqual(box(f, "library.picture"), [656, 78, 344, 362]); assert.deepEqual(box(f, "library.window").slice(2), [0, 0], "no placeholder"); assert.equal(box(f, "library.new"), null); assert.ok(box(f, "library.genome")); assert.deepEqual(f.errors(), []);
});
test("the glint stands beside its bead: its centre 8 px from the bead's, along the ray from the form's hub, outward, and kept inside the window's margin", () => {
  const hub = [177, 185];
  for (const b of [{ x: 100, y: 185 }, { x: 177, y: 40 }, { x: 250, y: 300 }]) { const [x, y] = glintAt(b), d = Math.hypot(x - b.x, y - b.y), out = Math.hypot(x - hub[0], y - hub[1]) - Math.hypot(b.x - hub[0], b.y - hub[1]); assert.ok(Math.abs(d - 8) <= 1, `8 px off: ${d}`); assert.ok(out > 6, "outward"); }
  // a neighbour bead at the outward spot turns the offset around its bead (or moves out to 10 or 12); with no spot clear the one with the largest clearance is taken, never the outward spot by default
  { const b = { x: 100, y: 185, r: 4.3 }, out = glintSpot(b, [b], []), nb = { x: out.x, y: out.y, r: 4.3 }, t = glintSpot(b, [b, nb], []);
    assert.equal(out.clearance, Infinity); assert.ok(!t.fallback && t.clearance >= 3, `clearance ${t.clearance}`); assert.ok(Math.hypot(t.x - nb.x, t.y - nb.y) >= 6 + 5.3 + 3 - 1, "clear of the neighbour's edge");
    const ring = []; for (const d of [8, 10, 12]) for (let a = 0; a < 360; a += 15) ring.push({ x: b.x + d * Math.cos(a * Math.PI / 180), y: b.y + d * Math.sin(a * Math.PI / 180), r: 4.3 });
    const f = glintSpot(b, [b, ...ring], []); assert.ok(f.fallback && f.clearance < 3, "nothing clears: flagged as the fallback");
    for (const q of [8, 10, 12]) for (const turn of GLINT_TURNS) { const a = Math.atan2(0, -1) + turn * Math.PI / 180, x = Math.round(b.x + q * Math.cos(a)), y = Math.round(b.y + q * Math.sin(a)), c = Math.min(...ring.map((o) => Math.hypot(x - o.x, y - o.y) - 6 - 5.3)); assert.ok(c <= f.clearance + 1e-9, `the fallback has the largest clearance: ${c} against ${f.clearance}`); } }
  // the late state with 3 new: each glint's spot and clearance, printed; each at least 3, or the fallback
  { const r = renderSpecimen(frameOf("S01"), JSON.parse(readFileSync(path.resolve(here, "../../station/tests/fixtures/specimen/states/late.json"), "utf8"))), rows = [];
    const fresh = r.beads;
    for (const b of fresh) { const g = glintSpot(b, r.beads, r.rays), own = Math.hypot(g.x - b.x, g.y - b.y), other = Math.min(Infinity, ...r.beads.filter((o) => o !== b).map((o) => Math.hypot(g.x - o.x, g.y - o.y)));
      rows.push(`${b.trait}|${b.look} bead (${b.x.toFixed(1)}, ${b.y.toFixed(1)}) spot (${g.x}, ${g.y}) clearance ${g.clearance.toFixed(2)}${g.fallback ? ` FALLBACK own bead ${own.toFixed(2)}, nearest other bead ${other.toFixed(2)}` : ""}`);
      assert.ok(g.clearance >= 3 || g.fallback, rows.at(-1));
      if (g.fallback) assert.ok(own < other, `a fallback passes only while its spot is nearer its own bead than any other bead: ${rows.at(-1)}`); }
    console.log("# glint spots, late state (every bead, as if new):\n#   " + rows.join("\n#   ")); }
  assert.deepEqual(glintAt({ x: 20, y: 185 }), [18, 185]); assert.deepEqual(glintAt({ x: 177, y: 350 }), [177, 344]);
});
test("more than eight new looks: eight glints are drawn and the caption counts them all", { skip }, async () => {
  const sc = homeScene({ adults: 3, motionSets: false }), R = sc.props.regions.library, f = await bootScene(sc, { motion: false, dir: node });   // nothing opened yet: every look found is new
  const n = +/^(\d+) new$/.exec(R.new)[1]; assert.ok(n > 8, `${n} new`); assert.equal(R.glints.length, LS.glint.max); assert.equal(LS.glint.max, 8);
  for (let i = 0; i < 8; i++) assert.ok(box(f, `library.glint.${i}`)); assert.equal(box(f, "library.glint.8"), null);
});
test("reduced motion: no breathing and no fade, the glints simply show and the picture never changes", { skip }, async () => {
  const sc = homeScene({ adults: 3, libNew: 3, motionSets: true }), R = sc.props.regions.library, f = await bootScene(sc, { motion: false, dir: node }), star = rgbOf(R.star), main = rgbOf(R.levels[0]), seen = new Set();
  const glintPx = () => { let n = 0; for (const [x, y] of R.glints) for (let j = -6; j < 6; j++) for (let i = -6; i < 6; i++) if (same(f.pixel(656 + x + i, 78 + y + j), star)) n++; return n; };
  for (let t = 0; t < 7000; t += 400) { f.frame((f.t += 400)); seen.add(f.pixel(990, 120).join(",")); assert.equal(glintPx(), 3 * 144, "every glint whole"); }
  assert.deepEqual([...seen], [main.join(",")], "level 1 only"); assert.deepEqual(f.errors(), []);
});
test("the breathing: one whole-picture swap every 2 s through levels 1 2 3 4 3 2; a swap frame redraws the picture (124,528 px) and the residents do not step on it, so no frame passes 153,600 px (stills and moving sets, six residents walking)", { skip }, async () => {
  assert.deepEqual([LS.breath.ms, LS.breath.cycle], [2000, [0, 1, 2, 3, 2, 1]]);
  for (const [name, o] of [["stills", { motionSets: false }], ["moving", { motionSets: true }]]) {
    const sc = homeScene({ adults: 5, juveniles: 3, libNew: 0, ...o }), R = sc.props.regions.library, f = await bootScene(sc, { motion: true, dir: node }), cols = R.levels.map(rgbOf);
    assert.equal(new Set(cols.map((c) => c.join(","))).size, 4); assert.equal(R.glints.length, 0, "no glint to add to the swap");
    let prev = -1, t0 = null; const swaps = [], seq = []; let stepsAway = 0, worst = 0;
    const r = runFrames(f, 14500, { cadence: [16, 0, 0], top: false, each: (t, area) => {
      const lvl = cols.findIndex((c) => same(c, f.pixel(990, 120))), steps = f.M._face_test_steps(); assert.ok(lvl >= 0, "a level's picture is drawn");
      if (lvl !== prev) { if (prev >= 0) { swaps.push([t, area, steps]); seq.push(lvl); } else { seq.push(lvl); t0 = t; } prev = lvl; } else stepsAway += steps; worst = Math.max(worst, area);
    } });
    const C = LS.breath.cycle, k0 = C.findIndex((v, i) => v === seq[0] && C[(i + 1) % 6] === seq[1]);   // the clock starts when Home is first drawn, so the run starts anywhere in the cycle: it goes round it in order
    assert.ok(k0 >= 0, `${name}: levels ${seq}`); assert.ok(seq.length >= 7, `${name}: ${seq.length} levels`); assert.deepEqual(seq, Array.from({ length: seq.length }, (_, i) => C[(k0 + i) % 6]), `${name}: the levels in order`);
    swaps.forEach(([t, area, steps], k) => { assert.ok(area >= 344 * 362 && area <= 153600, `${name}: swap ${k + 1} redrew ${area} px`); assert.equal(steps, 0, `${name}: swap ${k + 1}: the residents stepped on the swap frame`); if (k) assert.ok(Math.abs(t - swaps[k - 1][0] - 2000) <= 16, `${name}: swaps ${t - swaps[k - 1][0]} ms apart`); });
    assert.ok(stepsAway > 0, `${name}: the residents walk between the swaps`); assert.ok(swaps.length >= 6, `${name}: ${swaps.length} swaps in 14.5 s`); assert.ok(r.worst <= 153600 && r.worstTick <= 148000, `${name}: a frame redrew ${r.worst} px, a tick ${r.worstTick}`); assert.equal(r.overflows, 0); assert.deepEqual(f.errors(), []);
    console.log(`# Home's Library breathing (${name}): swap frames ${swaps.slice(0, 6).map(([, a]) => a).join(", ")} px with the residents held (${f.objects()} objects), worst frame ${r.worst} px, worst household tick ${r.worstTick} px`);
  }
});
test("the glints fade in and out on the 16-level stage dither over 2 s: whole stars at the half, none at the turn, in steps of the sixteen levels", { skip }, async () => {
  const sc = homeScene({ adults: 3, libNew: 3, motionSets: false }), R = sc.props.regions.library, f = await bootScene(sc, { motion: true, dir: node }), star = rgbOf(R.star);
  f.frame((f.t = 6000)); const t0 = f.t;   // the Library's clock began when Home was first drawn (the face's clock was 0 then): 6,000 ms is the start of a 2 s period
  const count = () => { let n = 0; for (const [x, y] of R.glints) for (let j = -6; j < 6; j++) for (let i = -6; i < 6; i++) if (same(f.pixel(656 + x + i, 78 + y + j), star)) n++; return n; };
  const series = []; for (let t = 16; t <= 2000; t += 16) { f.frame((f.t = t0 + t)); series.push([t, count()]); }
  const at = (ms) => series.find(([t]) => t >= ms)[1];   // frames every 16 ms: 1,000 is the frame at the half assert.equal(at(1000), 3 * 144, `whole at the half: ${series.filter((_, i) => i % 6 === 0).map(([t, n]) => t + ":" + n)}`); assert.ok(at(16) < 3 * 144 / 4 && at(500) > 0 && at(500) < 3 * 144, `in: ${at(16)}, ${at(500)}`); assert.equal(series.at(-1)[1], 0, "none at the turn");
  const up = series.filter(([t]) => t <= 1000).map(([, n]) => n), down = series.filter(([t]) => t >= 1000).map(([, n]) => n);
  assert.ok(up.every((n, i) => !i || n >= up[i - 1]), "fading in never goes back"); assert.ok(down.every((n, i) => !i || n <= down[i - 1]), "fading out never goes back");
  assert.ok(new Set(series.map(([, n]) => n)).size <= 17 + 1, "at most the sixteen levels and none"); assert.deepEqual(f.errors(), []);
});
test("the budgets of section 7 with the Library's module: at most 400 objects and 12 for the module, props at most 32 KiB, a glint step a small area, the picture table inside 1,024", { skip }, async () => {
  for (const o of [{ adults: 0 }, { adults: 6, juveniles: 2, libNew: 0 }, { adults: 6, juveniles: 2 }]) {
    const sc = homeScene({ motionSets: false, ...o }), f = await bootScene(sc, { motion: true, dir: node }), pr = JSON.stringify(sc.props).length;
    assert.ok(f.objects() <= 400, `${f.objects()} objects`); assert.ok(pr <= 32 * 1024, `props ${pr} B`); assert.ok(f.stats().pictures <= 1024);
    if (sc.props.regions.library.glints?.length) { dirty(f); f.frame((f.t += 64)); const d = dirty(f); assert.ok(d > 0 && d <= 153600, `a glint step redrew ${d} px`); console.log(`# Home's Library glint step: ${d} px, ${f.objects()} objects, props ${pr} B`); }
  }
});

// ---- R3 (the rooms design): Home draws the pieces of the room that fall in its window (the painting less (40, 116)), clipped by the glass ----
test("R3: Home draws the room's pieces that fall in its window, at the painting's coordinates less (40, 116): Roots' sorrel tuft, not the stone or the mister that lie right of it", { skip }, async () => {
  const fnv = (q) => { let h = 2166136261; for (const c of q) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const b = scene({ adults: 3 }), f = await start(b), sizeOfId = (id) => id.match(/(\d+)x(\d+)$/).slice(1).map(Number);
  assert.equal(b.props.regions.room.id, "roots"); assert.equal(b.props.regions.glass.picture, b.props.regions.room.base);
  for (const id of Object.values(b.props.regions.room.pieces)) f.handleOf(id, withPolicy((i) => standIn(i, sizeOfId(id)))); resend(f, b);
  const lg = logOf(f), pieces = lg.nodes.filter((n) => n[3] === "room");
  assert.deepEqual(pieces.map((n) => n[0]), [fnv("p.roots-sorrel-1")], "only the sorrel tuft falls in the window"); assert.deepEqual(pieces[0].slice(4, 8), [78, 380, 96, 46], "(118, 496) less (40, 116)");
  assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
});
