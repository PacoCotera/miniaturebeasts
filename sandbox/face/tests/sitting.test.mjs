// The sitting on the face (screens/sitting.c, a binding table on the kit) with the props views/sitting-props.mjs gives, in Node on the WebAssembly build, its door still shut (no golden takes it): every state of the
// spec's table (pose, place, confirm, armed, begin, portrait, and a juvenile, an S02, one habit, six cards) draws without an error or a refusal, its own nodes within 64 and the scene under 400 objects; the resident placed by
// its figure (the figure's centre on the axis 296, its last solid row on the feet 380; with no figure at the rect); the window's changes: the glass and the resident on one 200 ms clock of 16 levels (events.backdrop, the
// "dither" form), the resident held to the backdrop's end and cut there (the "cut" form, the host's props), the pose step's 16 levels over 180 ms, the lit gilt dithered out on begin, a from of another size and reduced motion
// cuts; and the keys: the pad walks focus.pose.graph by sitting.json focus.vectors on the pose and place steps, does nothing on the confirm step and the portrait, and ✓ ← and the room keys are intents. Skipped when the
// face has not been built (build.sh).
//   node --test prototypes/face/tests/sitting.test.mjs
import { test, before } from "node:test";
import "../../station/tests/fixtures/rooms.mjs";   // the rooms spec for the props builders, as the page registers it
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import * as T from "../../station/src/sitting.mjs";
import { sittingBuild } from "../../station/src/views/sitting-props.mjs";
import { loadStandLayersFs, loadStandLooksFs } from "../../station/tools/stand-layers-fs.mjs";
import { injectPortraitSource, dropPortraitSources } from "../../station/src/portrait-source.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), spec = J("sitting"), habitat = J("habitat");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours, framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const R = spec.regions, T0 = 1_000_000, settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, DIGEST = "0123456789abcdef0011223344556677";
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
before(() => { loadStandLooksFs(); loadStandLayersFs(); });

// ---- scenes: the state through the rules, the props through the view ----
function scene(o = {}) {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.firstMibi = false; st.sitting = { source: "dev", key: null, at: T0 };
  const mb = S.seedAdults(st, o.species ?? "S01", 5, 1, settings).mibis[0]; mb.name = o.name ?? "Dot"; if (o.juvenile) mb.born = st.turn;
  for (const x of o.habits ?? ["sleep-curled", "shake-dry", "calm"]) T.recordHabit(st, mb, x); for (const g of o.walked ?? ["wood", "pond", "rock", "cave"]) T.recordWalk(st, mb, g);
  if (o.step === "portrait") { mb.portrait = { state: "delivered", pose: "sleep-curled", place: "wood", crate: "sit1", start: T0, at: T0, digest: DIGEST }; const a = new Uint8ClampedArray(528 * 392 * 4); for (let i = 0; i < a.length; i += 4) { a[i] = 9; a[i + 1] = (i >> 2) & 255; a[i + 2] = 40; a[i + 3] = 255; } injectPortraitSource(DIGEST, a); }
  const ui = { step: o.step ?? "pose", pose: o.pose ?? "sleep-curled", place: o.place ?? "wood", focus: o.focus ?? null, armed: o.armed ?? null };
  const b = sittingBuild({ st, sv: { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, carryReqs: [] }, settings, light: o.light ?? "night", mibiId: mb.id, ui }, spec, habitat);
  if (o.six) { const it = b.props.regions.cards.items; while (it.length < 6) it.push({ ...it[it.length % 3] }); b.props.focus.targets = it.map((_, i) => ({ id: "card." + i, group: "card", enabled: true })); }   // the worst case of the spec's budget: six cards
  return b;
}
const frameProps = (line = {}) => ({ top: { screen: "sitting", title: "Sitting", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { need: "", ...line }, plate: { text: "" } });
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const solid = (w, h, rgb) => { const d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) d.set([rgb[0], rgb[1], rgb[2], 255], i * 4); return { w, h, data: d }; };
const standIn = (id, [w, h]) => { const k = hash(id); return solid(w, h, [70 + (k & 127), 70 + ((k >> 7) & 127), 70 + ((k >> 14) & 127)]); };
const sizeOf = (r) => (Array.isArray(r.size) ? r.size : typeof r.size === "number" ? [r.size, r.size] : [16, 16]);
const giveAll = (f, b) => { for (const r of b.requests) if (!f.given.has(r.id)) { f.given.add(r.id); f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r)))); } };
const push = (f, b, over = {}) => { giveAll(f, b); return f.props({ screen: "sitting", ...b.props, motion: f.motion, frame: frameProps(b.line), ...over }); };
async function start(b, { motion = true, t0 = 0 } = {}) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true }); f.given = new Set();
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["sitting", spec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0, f.errors().join("; "));
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  f.t = t0; f.motion = motion; f.build = b;
  assert.equal(push(f, b), 0, f.errors().join("; ")); frames(f); return f;
}
const frames = (f, n = 2, dt = 16) => { for (let i = 0; i < n; i++) f.frame((f.t += dt)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };
// the screen's own nodes: the node table less the frame's own (the same props with no regions: the face draws the frame alone)
function ownNodes(f, b, all) { assert.equal(push(f, b, { regions: undefined }), 0, f.errors().join("; ")); frames(f); const frame = logOf(f).table; assert.equal(push(f, b), 0); frames(f); return all - frame; }
const placed = (fig) => [R.resident.axis - fig[0] - Math.floor(fig[2] / 2), R.resident.feet - fig[1] - fig[3] + 1];

const SCENES = {
  "pose, the ring on card.0 (the hour's light)": { step: "pose", focus: "card.0" },
  "pose, the ring on the curl": { step: "pose", focus: "card.2" },
  "pose, six cards (the budget's largest state)": { step: "pose", focus: "card.5", six: true },
  "pose, one habit": { step: "pose", habits: ["sleep-curled"], focus: "card.0" },
  "pose, a juvenile": { step: "pose", juvenile: true, focus: "card.2" },
  "pose, an S02 (no layered stand: no figure)": { step: "pose", species: "S02", habits: ["sniff", "sleep-curled"], pose: "sniff", focus: "card.0" },
  "place, five places": { step: "place", focus: "card.4" },
  "confirm": { step: "confirm" }, "confirm, armed": { step: "confirm", armed: "room" }, "begin": { step: "begin" }, "portrait": { step: "portrait" },
};
for (const [name, o] of Object.entries(SCENES)) {
  test(`the sitting, ${name}: draws without an error or a refusal, its own nodes within 64, under 400 objects, the resident placed by its figure`, { skip }, async () => {
    dropPortraitSources(); const b = scene(o); assert.ok(b, "the view builds"); const f = await start(b);
    assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0); assert.equal(b.props.state, o.step);
    const lg = logOf(f), objects = f.objects(), own = ownNodes(f, b, lg.table); assert.ok(own <= 64, `${own} own nodes`); assert.ok(objects < 400, `${objects} objects`);
    const rs = b.props.regions.resident, box = lg.regions.find((r) => r.id === "resident");
    if (o.step === "portrait") assert.equal(box, undefined, "the resident is a slot in state portrait");
    else if (rs.figure) { const [x, y] = placed(rs.figure); assert.deepEqual(box.rect, [x, y, 304, 312], "the picture's top-left from its figure"); assert.equal(x + rs.figure[0] + Math.floor(rs.figure[2] / 2), 296); assert.equal(y + rs.figure[1] + rs.figure[3] - 1, 380, "the last solid row on the feet"); }
    else assert.deepEqual(box.rect, R.resident.rect, "no figure: at the rect");
    if (o.step === "pose" && !o.name) { const tag = lg.regions.find((r) => r.id === "nameTag" && r.layer === "chrome"); assert.equal(tag.rect[2], 80, "Dot's tag: 20 px of name plus 24, rounded up to 8, at least 80"); assert.equal(tag.rect[0] + tag.rect[2] / 2, 296, "centred on 296"); assert.equal(tag.rect[1], 404, "its top at 404"); }
    console.log(`# ${name}: ${own} own nodes, ${objects} objects, ${f.stats().pictures} pictures; resident ${rs.picture ? rs.pose + " figure " + JSON.stringify(rs.figure) + " at " + JSON.stringify(box?.rect) : "a slot"}`);
  });
}

// ---- the window's changes, by the pixels ----
const A = [200, 40, 40], B = [40, 200, 40], C = [40, 40, 200], D = [220, 220, 30];
async function window2({ motion = true, glassFrom = [544, 408] } = {}) {
  const b = scene({ step: "place", focus: "card.0" }); b.props.regions.gilt.picture = ""; const f = await start(b, { motion, t0: 1000 });
  for (const [id, sz, c] of [["t:glass-old", glassFrom, A], ["t:glass-new", [544, 408], B], ["t:res-old", [304, 312], C], ["t:res-new", [304, 312], D]]) f.handleOf(id, withPolicy(() => ({ ...solid(sz[0], sz[1], c), policy: "painted" })));
  const set = (glass, res) => { const pr = JSON.parse(JSON.stringify(b.props)); pr.regions.glass.picture = glass; pr.regions.resident.picture = res; assert.equal(f.props({ screen: "sitting", ...pr, motion, frame: frameProps(b.line) }), 0, f.errors().join("; ")); };
  set("t:glass-old", "t:res-old"); frames(f); return { f, b, set };
}
const px = (f, x, y) => Array.from(f.pixel(x, y));
const GLASS_AT = [[40, 100], [41, 101], [42, 102], [43, 103]];
test("events.backdrop, the \"dither\" form: the glass and the resident cross-dither on one clock, 16 levels over 200 ms (level = floor(16 t / 200)), a pixel new where BAYER < level; at the end the new pictures whole", { skip }, async () => {
  const { f, b, set } = await window2(), ev = spec.events.backdrop, t = f.t, rx = placed(b.props.regions.resident.figure); assert.equal(ev.resident, "dither");
  f.send({ t: "event", kind: "dither", target: "glass", from: "t:glass-old", ms: ev.ms, hold: 0 }); f.send({ t: "event", kind: "dither", target: "resident", from: "t:res-old", ms: ev.ms, hold: 0 }); set("t:glass-new", "t:res-new");
  const RES_AT = [[0, 0], [1, 1], [2, 2], [3, 3]].map(([dx, dy]) => [rx[0] + 150 + dx, rx[1] + 150 + dy]), seen = new Set();
  for (const ms of [0, 40, 80, 120, 160, 199]) {
    f.frame(t + ms); const level = Math.floor(16 * ms / ev.ms); seen.add(level);
    for (const [x, y] of GLASS_AT) assert.deepEqual(px(f, x, y), BAYER[(y & 3) * 4 + (x & 3)] < level ? B : A, `glass at ${ms} ms (level ${level}), ${x},${y}`);
    for (const [x, y] of RES_AT) assert.deepEqual(px(f, x, y), BAYER[(y & 3) * 4 + (x & 3)] < level ? D : C, `resident at ${ms} ms (level ${level}), ${x},${y}`);
  }
  f.frame(t + 200); for (const [x, y] of GLASS_AT) assert.deepEqual(px(f, x, y), B); for (const [x, y] of RES_AT) assert.deepEqual(px(f, x, y), D); assert.deepEqual([...seen], [0, 3, 6, 9, 12, 15]); assert.deepEqual(f.errors(), []);
});
test("events.backdrop, the \"cut\" form: the glass dithers while the resident keeps its picture (the host's props) and cuts to the new one at 200 ms", { skip }, async () => {
  const { f, b, set } = await window2(), ev = spec.events.backdrop, t = f.t, rx = placed(b.props.regions.resident.figure), at = [rx[0] + 150, rx[1] + 150];
  f.send({ t: "event", kind: "dither", target: "glass", from: "t:glass-old", ms: ev.ms, hold: 0 }); set("t:glass-new", "t:res-old");
  for (const ms of [40, 120, 199]) { f.frame(t + ms); assert.deepEqual(px(f, at[0], at[1]), C, `the resident's old picture at ${ms} ms`); }
  set("t:glass-new", "t:res-new"); f.frame(t + 200); assert.deepEqual(px(f, at[0], at[1]), D, "cut at 200"); assert.deepEqual(px(f, 40, 100), B);
});
test("the pose step's change to or from the curl: the resident cross-dithers 16 levels over 180 ms (level = floor(16 t / 180)); reduced motion and a glass from of another size are cuts", { skip }, async () => {
  const { f, b, set } = await window2(), t = f.t, rx = placed(b.props.regions.resident.figure), at = [[rx[0] + 150, rx[1] + 150], [rx[0] + 151, rx[1] + 151], [rx[0] + 152, rx[1] + 150], [rx[0] + 153, rx[1] + 151]];
  f.send({ t: "event", kind: "dither", target: "resident", from: "t:res-old", ms: 180, hold: 0, cut: true }); set("t:glass-old", "t:res-new");
  for (const ms of [0, 40, 80, 120, 160, 179]) { f.frame(t + ms); const level = Math.floor(16 * ms / 180); for (const [x, y] of at) assert.deepEqual(px(f, x, y), BAYER[(y & 3) * 4 + (x & 3)] < level ? D : C, `at ${ms} ms (level ${level})`); }
  f.frame(t + 180); for (const [x, y] of at) assert.deepEqual(px(f, x, y), D, "the curl whole at 180");
  const r = await window2({ motion: false }); r.f.send({ t: "event", kind: "dither", target: "resident", from: "t:res-old", ms: 180, hold: 0 }); r.f.send({ t: "event", kind: "dither", target: "glass", from: "t:glass-old", ms: 200, hold: 0 }); r.set("t:glass-new", "t:res-new"); r.f.frame(r.f.t + 40);
  for (const [x, y] of at) assert.deepEqual(px(r.f, x, y), D, "reduced motion: a cut"); for (const [x, y] of GLASS_AT) assert.deepEqual(px(r.f, x, y), B, "reduced motion: the glass cuts");
  const g = await window2({ glassFrom: [100, 100] }); g.f.send({ t: "event", kind: "dither", target: "glass", from: "t:glass-old", ms: 200, hold: 0 }); g.set("t:glass-new", "t:res-old"); g.f.frame(g.f.t + 100);
  for (const [x, y] of GLASS_AT) assert.deepEqual(px(g.f, x, y), B, "a from that is not of the glass's size: no dither"); assert.deepEqual(g.f.errors(), []);
});
test("events.begin: the lit gilt dithers out to clear over 300 ms (a pixel clear where BAYER < level), the glass showing through", { skip }, async () => {
  const b = scene({ step: "begin" }), f = await start(b, { t0: 1000 }), lit = R.gilt.slices.armed, out = spec.events.begin.steps[0]; assert.equal(b.props.regions.gilt.picture, lit); assert.equal(out.from, lit);
  f.handleOf("t:gilt-lit", withPolicy(() => ({ ...solid(560, 424, D), policy: "painted" }))); f.handleOf("t:glass", withPolicy(() => ({ ...solid(544, 408, B), policy: "painted" })));
  const pr = JSON.parse(JSON.stringify(b.props)); pr.regions.glass.picture = "t:glass"; pr.regions.gilt.picture = "t:gilt-lit"; assert.equal(f.props({ screen: "sitting", ...pr, motion: true, frame: frameProps(b.line) }), 0); frames(f);
  const at = [[26, 300], [27, 301], [28, 302], [29, 303]]; for (const [x, y] of at) assert.deepEqual(px(f, x, y), D, "the lit gilt over the glass's edge");
  const t = f.t; f.send({ t: "event", kind: "dither", target: out.target, from: "t:gilt-lit", ms: out.ms, hold: spec.events.begin.hold });
  for (const ms of [0, 75, 150, 225, 299]) { f.frame(t + ms); const level = Math.floor(16 * ms / out.ms); for (const [x, y] of at) assert.deepEqual(px(f, x, y), BAYER[(y & 3) * 4 + (x & 3)] < level ? B : D, `at ${ms} ms (level ${level})`); }
  assert.deepEqual(f.errors(), []);
});

// ---- the keys ----
test("the keys: the pad walks focus.pose.graph by sitting.json focus.vectors on the pose and place steps; on the confirm step and the portrait it does nothing; ✓ ← and the room keys are intents on the focused card or the room", { skip }, async () => {
  const K = { right: "right", left: "left", up: "up", down: "down" };
  for (const v of spec.focus.vectors.filter((x) => x.to && K[x.key] && (x.state === "pose" || x.state === "place" || x.state === "confirm"))) {
    const f = await start(scene({ step: v.state, focus: v.from === "room" ? null : v.from })); const m = key(f, v.key);
    if (v.to === v.from) assert.deepEqual(m, [], JSON.stringify(v)); else assert.deepEqual(m.map((x) => [x.t, x.screen, x.target]), [["focus", "sitting", v.to]], JSON.stringify(v));
  }
  for (const step of ["pose", "confirm", "portrait"]) {
    dropPortraitSources(); const b = scene({ step, focus: step === "pose" ? "card.1" : null }), f = await start(b), cur = b.props.focus.cur;
    for (const [k, verb] of [["confirm", "confirm"], ["back", "back"], ["home", "room:home"], ["research", "room:research"], ["library", "room:library"], ["habitat", "room:habitat"]]) assert.deepEqual(key(f, k).map((x) => [x.t, x.screen, x.target, x.verb]), [["intent", "sitting", cur, verb]], step + " " + k);
    if (step !== "pose") for (const k of ["up", "down", "left", "right"]) assert.deepEqual(key(f, k), [], `${step}: the pad does nothing`);
  }
  dropPortraitSources();
});
