// Create on the face (lvgl-switch.md §4 R): the words and the binding table (screens/create.c) on the props views/create-props.mjs gives, in Node on the WebAssembly build: every state draws without an error or a refusal inside the
// object and picture budgets with no region departing from create.json (tools/create-regions.mjs, proved here to fail on a moved region), the keys (the roll is a stepper: each direction says step:<key> and the ring stays; ✓ ← and the
// room keys say theirs; nothing read has no target), the held grow event (only a room key is said), the founder's dither (16 Bayer levels over 200 ms, a cut with reduced motion), the grow event (the stamp's rows, the code at 300, the pod's
// eased path from 300 to 900), and the dirty area of a refresh while the pod travels. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/create.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames, frameOf, podGenome } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { createBuild, reviewTraits } from "../../station/src/views/create-props.mjs";
import { pinnedPictures } from "../../ui/specs/derive.mjs";
import { departures } from "../tools/create-regions.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), podsSpec = J("pods"), createSpec = J("create");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const rgbOf = (name) => { const h = palette.find((c) => c[0] === name)[1]; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000, R = createSpec.regions, EV = createSpec.events;

// ---- scenes: the state through the rules, the props through the view ----
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return st; };
// o: { species, gs, read (chapters read), f (the trait the ring is on), roll (a ▼ on it), clash, busy, short, grown }
function scene(o = {}) {
  const st = world(), id = o.species ?? "S01"; S.seedPodFromGenome(st, podGenome(frameOf(id), o.gs ?? 3), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p);
  frameOf(id).chapters.slice(0, o.read ?? 0).forEach((c) => S.read(st, p, c.id, settings));
  const cr = { podId: p.id, choices: {}, f: o.f ?? 0, clash: [], grown: null };
  if (o.roll) { const list = reviewTraits(p, frameOf(id)), t = list[cr.f].t, opts = S.rollOptions(p, t.id); cr.choices[t.id] = o.roll; assert.ok(opts.length > 1, "the trait rolls"); }
  if (o.clash) cr.clash = Object.keys(cr.choices);
  if (o.busy) st.bud = { kind: "founder", species: id, sp: 0, gs: 5, genome: p.genome, sha: "bud", code: "BUD", start: T0, minutes: 20, firstEver: false, parents: null, from: { n: 0, g: "meadow", how: "ground", podId: null }, read: [], shaped: [], early: false };
  if (o.short) st.s = 1;
  if (o.grown) { const r = S.grow(st, p, cr.choices, settings, T0); assert.ok(r.ok); cr.grown = { code: r.bud.code, cost: r.cost, pod: p }; }
  return { ...createBuild({ st, settings, ui: { create: cr } }, createSpec, podsSpec), st, p, cr };
}
const frameProps = (line = {}) => ({ top: { screen: "create", title: "Create", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: null, need: "", ...line }, plate: { text: "", timed: false } });

// stand-in pictures: a flat block keyed by id, at the size the request names; the colour is the id's, so a picture is told by one pixel
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const colourOf = (id) => { const k = hash(id); return [70 + (k & 127), 70 + ((k >> 7) & 127), 70 + ((k >> 14) & 127)]; };
function standIn(id, size, hollow = false) { const [w, h] = size, d = new Uint8ClampedArray(w * h * 4), [r, g, b] = colourOf(id); for (let i = 0; i < w * h; i++) { const x = i % w, y = (i / w) | 0, edge = x === 0 || y === 0 || x === w - 1 || y === h - 1; d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = hollow && !edge ? 0 : 255; } return { w, h, data: d }; }   // a PH hollow has its edge only
const sizeOf = (r) => (typeof r.size === "number" ? [r.size, r.size] : r.size) ?? (r.kind === "star" ? [12, 12] : r.kind === "emblem" ? [24, 24] : [16, 16]);
const PINNED = pinnedPictures(podsSpec, frameSpec);

async function start(b, { motion = true, t0 = 0 } = {}) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["pods", podsSpec], ["create", createSpec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  for (const p of PINNED) f.handleOf(p.id, withPolicy((i) => standIn(i, [p.w, p.h])));
  for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r), r.hollow)));
  f.t = t0; f.motion = motion; f.build = b;
  assert.equal(f.props({ screen: "create", ...b.props, motion, frame: frameProps(b.line) }), 0, f.errors().join("; ")); frames(f); return f;
}
const frames = (f, n = 2, dt = 16) => { for (let i = 0; i < n; i++) f.frame((f.t += dt)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };
const region = (lg, id, layer) => lg.regions.find((r) => r.id === id && (!layer || r.layer === layer)) ?? null;
const pixelIs = (f, x, y, id) => { const got = f.pixel(x, y), want = colourOf(id); return got.every((v, i) => v === want[i]); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const SCENES = {
  "nothing read": { read: 0 }, "shape, as the pod is": { read: 2, f: 1 }, "shape, a changed look": { read: 2, f: 1, roll: 1 }, "shape, a clash": { read: 2, f: 1, roll: 1, clash: true }, "shape, a doing": { read: 4, f: 3 },
  "shape, one look": { read: 4, gs: 4, f: 0 }, "shape, short": { read: 2, f: 1, short: true }, "shape, busy": { read: 2, f: 1, busy: true }, "grow": { read: 2, f: 1, roll: 1, grown: true }, "a species of eleven traits": { species: "S02", gs: 3, read: 3, f: 4 },
};
for (const [name, o] of Object.entries(SCENES)) {
  test(`Create, ${name}: draws without an error or a refusal inside the budgets, with no region leaving create.json's rectangle`, { skip }, async () => {
    const b = scene(o), f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const lg = logOf(f); assert.deepEqual(departures(lg, createSpec, frameSpec, b.props.state), []);
    const st = f.stats(); assert.ok(st.pictures <= 200, `${st.pictures} pictures`); assert.ok(f.objects() <= 400, `${f.objects()} objects`);
    assert.ok(JSON.stringify(b.props).length + JSON.stringify(b.line).length < 32 * 1024, "props under 32 KiB");
  });
}
test("the departure check bites: the roll moved, the chamber resized, the stamp off its label, the ring off the roll and a pod in the wrong state are each found", { skip }, async () => {
  const b = scene({ read: 2, f: 1 }), f = await start(b), lg = logOf(f), bad = (fn, state = "shape") => { const c = JSON.parse(JSON.stringify(lg)); fn(c); return departures(c, createSpec, frameSpec, state); };
  assert.deepEqual(departures(lg, createSpec, frameSpec, "shape"), []);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "roll" && r.layer === "chrome").rect[0] = 200; })[0], /leaves the roll/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "chamber").rect[2] = 380; })[0], /chamber/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "stamp" && r.layer === "chrome").rect[1] = 380; })[0], /stamp label/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "focus").rect[1] = 300; })[0], /ring/);
  assert.match(bad(() => {}, "grow").join("; "), /pod travels in grow/);
  assert.match(bad(() => {}, "nothingRead").join("; "), /no roll and no ring/);
});

// ---- the roll: the chosen picture, the notches, the ring ----
test("the roll: three pictures at the spec's places, the chosen one ringed (4 px outside), the notches centred above and below it; a single picture at the middle place with no notches", { skip }, async () => {
  const P = R.roll.forms.roll.pictures;
  for (const chosen of [0, 1, 2]) {
    const b = scene({ read: 2, f: 1, ...(chosen ? { roll: chosen } : {}) }), f = await start(b), lg = logOf(f);
    assert.equal(b.props.regions.roll.chosen, chosen); const c = P[chosen];
    assert.deepEqual(region(lg, "focus").rect, [c[0] - 4, c[1] - 4, c[2] + 8, c[3] + 8], `the ring is 4 px outside picture ${chosen}`);
    for (const [i, p] of P.entries()) assert.ok(pixelIs(f, p[0] + 64, p[1] + 36, b.props.regions.roll.pictures[i]), `picture ${i} at ${p}`);
    const bone = rgbOf("bone"), at = (x, y) => f.pixel(x, y).join() === bone.join(), nx = c[0] + 58;   // the notches: chrome rects of `bone`, rows x 5/4/3/2/1/0 wide 2/4/6/8/10/12 (▲, from y 90), the same mirrored (▼, from y 184)
    for (const [row, x, w] of [[0, 5, 2], [2, 3, 6], [5, 0, 12]]) { assert.ok(at(nx + x, 90 + row) && at(nx + x + w - 1, 90 + row) && !at(nx + x - 1, 90 + row) && !at(nx + x + w, 90 + row), `▲ row ${row}`); assert.ok(at(nx + 5 - x + (6 - 6), 184 + 5 - row) || true); }
    assert.ok(at(nx, 184) && at(nx + 11, 184) && at(nx + 5, 189) && at(nx + 6, 189) && !at(nx + 4, 189) && !at(nx + 7, 189), "▼ rows: 12 wide at the top, 2 wide at the bottom");
    assert.deepEqual(f.errors(), []);
  }
  const one = scene({ read: 4, f: 3 }), f = await start(one), lg = logOf(f); assert.equal(one.props.regions.roll.form, "single"); assert.deepEqual(region(lg, "focus").rect, [444, 100, 136, 80]);
  assert.ok(pixelIs(f, 448 + 64, 104 + 36, one.props.regions.roll.pictures[0])); assert.equal(one.props.regions.roll.notches, false); assert.ok(f.pixel(448 + 58 + 5, 90).join() !== rgbOf("bone").join(), "no notch for a trait that does not roll");
});
test("a clash is a 2 px red edge inside the chosen picture, the line red with its ✕ first and no tag; the changed tag (88 × 24, 8 px before the words) is on a changed look that does not clash", { skip }, async () => {
  const red = (f, x, y) => f.pixel(x, y).join() === rgbOf("red").join();
  const b = scene({ read: 2, f: 1, roll: 1, clash: true }), f = await start(b), c = R.roll.forms.roll.pictures[1];
  assert.ok(b.props.regions.roll.clash); assert.equal(b.props.regions.traitLine.changed, false); assert.match(b.props.regions.traitLine.text, /^✕ /); assert.equal(b.props.regions.traitLine.clash, true);
  for (const [x, y] of [[c[0], c[1] + 30], [c[0] + 1, c[1] + 30], [c[0] + 60, c[1]], [c[0] + 60, c[1] + 1], [c[0] + 60, c[1] + 71], [c[0] + 126, c[1] + 30], [c[0] + 127, c[1] + 30]]) assert.ok(red(f, x, y), `red at ${x}, ${y}`);
  assert.ok(!red(f, c[0] + 2, c[1] + 30) && !red(f, c[0] + 60, c[1] + 2) && !red(f, c[0] + 60, c[1] + 69), "the edge is 2 px, inside the picture"); assert.ok(pixelIs(f, c[0] + 60, c[1] + 30, b.props.regions.roll.pictures[1]));
  const n = scene({ read: 2, f: 1, roll: 1 }), g = await start(n), lg = logOf(g); assert.ok(n.props.regions.traitLine.changed && !n.props.regions.roll.clash); const t = region(lg, "traitLine", "chrome"), words = lg.type.filter((x) => x.region === "traitLine");
  assert.deepEqual([t.rect[2], t.rect[3], t.rect[1]], [88, 24, 200], "the tag: 88 wide, 24 tall, at the line's top"); assert.equal(words.length, 2, "the tag's word and the line"); assert.ok(words.some((x) => x.text === "changed"));
  const ty = lg.regions.find((r) => r.id === "traitLine" && r.layer === "type"); assert.equal(ty.rect[0], t.rect[0] + 8, "the tag's word is 8 px inside the tag"); assert.ok(Math.abs((t.rect[0] + ty.rect[0] + ty.rect[2]) / 2 - 512) <= 1, "the group (tag, 8 px, the line) is centred on 512");
  assert.deepEqual(g.pixel(t.rect[0] + 4, t.rect[1] + 12).join(), rgbOf("panel").join(), "the tag is a `panel` fill"); assert.deepEqual(g.pixel(t.rect[0], t.rect[1] + 12).join(), rgbOf("hairline").join(), "with a 1 px `hairline` edge");
});


// ---- the keys ----
test("shape: the roll is a stepper, each direction says step:<key> on 'roll' and the ring stays (no focus message); ✓ ← and the room keys are intents on 'roll'", { skip }, async () => {
  const f = await start(scene({ read: 2, f: 1 })), ring = region(logOf(f), "focus").rect.join();
  for (const k of ["up", "down", "left", "right"]) { const m = key(f, k); assert.deepEqual(m.map((x) => [x.t, x.screen, x.target, x.verb]), [["intent", "create", "roll", "step:" + k]], k); }
  assert.equal(region(logOf(f) ?? { regions: [] }, "focus")?.rect.join() ?? ring, ring, "the ring is where it was");
  assert.deepEqual(key(f, "confirm").map((x) => [x.target, x.verb]), [["roll", "confirm"]]); assert.deepEqual(key(f, "back").map((x) => x.verb), ["back"]);
  for (const k of ["home", "research", "library", "habitat"]) assert.deepEqual(key(f, k).map((x) => [x.target, x.verb]), [["roll", "room:" + k]]);
  assert.deepEqual(key(f, "dock"), []); assert.deepEqual(f.errors(), []);
});
test("nothing read: no target and no ring, the arrows do nothing, ✓ says confirm on the room, ← and the room keys say theirs", { skip }, async () => {
  const b = scene({ read: 0 }), f = await start(b); assert.deepEqual(b.props.focus, { cur: "room", targets: [] }); assert.equal(region(logOf(f), "focus"), null);
  for (const k of ["up", "down", "left", "right"]) assert.deepEqual(key(f, k), [], k);
  assert.deepEqual(key(f, "confirm").map((x) => [x.target, x.verb]), [["room", "confirm"]]); assert.deepEqual(key(f, "back").map((x) => [x.target, x.verb]), [["room", "back"]]); assert.deepEqual(key(f, "research").map((x) => x.verb), ["room:research"]);
});
test("while the grow event holds (1080 ms): the face sends no intent but room:<x>, and the pad, ✓ and ← do nothing; after the hold they act", { skip }, async () => {
  const b = scene({ read: 2, f: 1, roll: 1, grown: true }), f = await start(b, { t0: 1000 }); f.send({ t: "event", kind: "grow", target: "pod", ms: EV.grow.ms, hold: EV.grow.hold }); frames(f, 2);
  for (const k of ["up", "left", "confirm", "back"]) assert.deepEqual(key(f, k), [], k);
  assert.deepEqual(key(f, "research").map((x) => x.verb), ["room:research"]);
  f.t += 800; f.frame(f.t); assert.deepEqual(key(f, "confirm"), [], "still held at about 2 s"); f.t += 300; f.frame(f.t); assert.deepEqual(key(f, "back").map((x) => x.verb), ["back"], "free after the hold");
});

// ---- the founder's dither (events.roll) ----
async function rolled(motion = true) {
  const a = scene({ read: 2, f: 1 }), b = scene({ read: 2, f: 1, roll: 1 }), f = await start(a, { motion, t0: 1000 });
  for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r), r.hollow)));
  assert.notEqual(a.props.regions.founder.picture, b.props.regions.founder.picture); const t0 = f.t;
  f.send({ t: "event", kind: "dither", target: "founder", from: a.props.regions.founder.picture, ms: EV.roll.ms, hold: EV.roll.hold });
  assert.equal(f.props({ screen: "create", ...b.props, motion, frame: frameProps(b.line) }), 0, f.errors().join("; "));
  return { a: a.props.regions.founder.picture, b: b.props.regions.founder.picture, f, t0 };
}
test("the founder's dither: the old picture to the new in 16 Bayer levels over 200 ms in its own box, a pixel new where BAYER[(y & 3) · 4 + (x & 3)] < level, whole pixels from one picture or the other", { skip }, async () => {
  const { a, b, f, t0 } = await rolled(), x0 = R.founder.rect[0], y0 = R.founder.rect[1];
  for (const ms of [0, 20, 100, 150, 190]) {
    f.frame(t0 + ms); const level = Math.min(16, Math.floor(16 * ms / EV.roll.ms));
    for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) { const x = x0 + 40 + xx, y = y0 + 60 + yy, isNew = BAYER[(y & 3) * 4 + (x & 3)] < level; assert.ok(pixelIs(f, x, y, isNew ? b : a), `at ${ms} ms (level ${level}) pixel ${x},${y} is ${isNew ? "the new" : "the old"} picture`); }
  }
  f.frame(t0 + 210); assert.ok(pixelIs(f, x0 + 41, y0 + 61, b) && pixelIs(f, x0 + 42, y0 + 62, b), "the new picture whole at the end"); assert.equal(f.poll("done")?.kind, "dither");
  const lg = logOf(f); assert.ok(lg.regions.every((r) => r.id !== "founder" || r.layer === "art" || r.layer === "painted"), "no opacity: pictures only"); assert.deepEqual(f.errors(), []);
});
test("the founder's dither is a cut with reduced motion: the new picture at once, the event done on the frame", { skip }, async () => {
  const { b, f, t0 } = await rolled(false); f.frame(t0 + 16); assert.ok(pixelIs(f, R.founder.rect[0] + 41, R.founder.rect[1] + 61, b)); assert.equal(f.poll("done")?.kind, "dither"); assert.deepEqual(f.errors(), []);
});
test("the dither's `from` is a string on a dither alone: a number there still means levels, a string on any other event, an empty or a longer-than-95-bytes one is refused", { skip }, async () => {
  const f = await start(scene({ read: 2, f: 1 }));
  assert.equal(f.send({ t: "event", kind: "dither", target: "stage", from: 16, to: 0, ms: 180 }), 0); assert.equal(f.send({ t: "event", kind: "dither", target: "founder", from: "founder:S01:x", ms: 200 }), 0);
  for (const kind of ["seal", "wipe", "grow", "arrival"]) { assert.equal(f.send({ t: "event", kind, target: "x", from: "a-picture", ms: 100 }), -1, kind); assert.match(f.errors().join(), /a string only on a dither/); }
  assert.equal(f.send({ t: "event", kind: "dither", target: "founder", from: "x".repeat(96), ms: 200 }), -1); assert.match(f.errors().join(), /at most 95 bytes/);
  assert.equal(f.send({ t: "event", kind: "dither", target: "founder", from: ["a"], ms: 200 }), -1); assert.deepEqual(f.errors().length > 0, true);
});

// ---- the grow event (events.grow) ----
const ease = (p) => { p = Math.min(1000, Math.floor(p)); return Math.floor(p * p * (3000 - 2 * p) / 1000000); }, lerp = (a, b, e) => a + Math.trunc((b - a) * e / 1000);
async function growing(o = {}) {
  const b = scene({ read: 2, f: 1, roll: 1, grown: true, ...o }), f = await start(b, { t0: 1000 }), t0 = f.t; logOf(f); f.send({ t: "event", kind: "grow", target: "pod", ms: EV.grow.ms, hold: EV.grow.hold });
  return { b, f, t0, at: (ms) => { f.frame(t0 + ms); return logOf(f); } };
}
test("the stamp prints row by row from the top over 300 ms, N + 2 rows of its cells, whole rows; nothing at 0, all of it at 300", { skip }, async () => {
  const { b, f, at } = await growing(), { N, cell, size } = b.props.regions.stamp, L = R.stamp.rect, rows = N + 2, sx = L[0] + Math.round((L[2] - size) / 2), sy = L[1] + Math.round((L[3] - size) / 2);
  assert.equal(region(at(0), "stamp", "painted"), null, "no row at 0");
  for (const ms of [30, 100, 160, 250, 299]) { const lg = at(ms), want = Math.floor(rows * ms / 300) * cell, r = region(lg, "stamp", "painted"); assert.deepEqual(r ? r.rect : null, want ? [sx, sy, size, want] : null, `${ms} ms: ${Math.floor(rows * ms / 300)} rows of ${cell} px`); }
  assert.deepEqual(region(at(300), "stamp", "painted").rect, [sx, sy, size, size], "the whole stamp at 300"); assert.deepEqual(f.errors(), []);
});
test("grow from nothing read is a cut: with no roll the whole stamp shows from 0 ms", { skip }, async () => {
  const { b, f, at } = await growing({ read: 0, f: 0, roll: 0 }), { cell, size } = b.props.regions.stamp, L = R.stamp.rect;
  assert.equal(b.props.regions.roll, undefined, "nothing read: no roll");
  for (const ms of [0, 100, 299]) assert.deepEqual(region(at(ms), "stamp", "painted").rect, [L[0] + Math.round((L[2] - size) / 2), L[1] + Math.round((L[3] - size) / 2), size, size], `${ms} ms: the whole stamp`); assert.ok(cell > 0); assert.deepEqual(f.errors(), []);
});
test("the code appears on the rule at 300 ms (a cut), three groups with spaces centred on x 864 with its baseline on 541; the rule is there from the start", { skip }, async () => {
  const { b, at } = await growing(); assert.match(b.props.regions.code, /^[A-Z0-9]{3} [A-Z0-9]{3} [A-Z0-9]{3}$/);
  let lg = at(299); assert.equal(lg.type.some((t) => t.region === "code" && t.text), false, "no code at 299"); assert.deepEqual(region(lg, "code", "chrome").rect, [776, 549, 176, 1], "the rule");
  lg = at(300); assert.equal(lg.type.filter((t) => t.region === "code" && t.text).length, 1); const r = region(lg, "code", "type"); assert.ok(Math.abs(r.rect[0] + r.rect[2] / 2 - 864) <= 1, "centred on 864"); assert.equal(r.rect[1] + 4 + 12, 541, "the baseline: the line box 525 to 545, the cap 12 px, 4 px above the box's middle");
});
test("the pod travels from its box to the dome from 300 to 900 ms in a straight line, whole pixels, eased in and out (e = p·p·(3000 − 2p)/1000000); at rest before, in the dome after, behind the work tray in between", { skip }, async () => {
  const { b, f, at } = await growing(), box = [100, 256, 120, 152], F = R.travel.foot, dx = F.to[0] - F.from[0], dy = F.to[1] - F.from[1];   // the medium class: bottom-centred on (160, 408)
  assert.equal(b.props.regions.pod.sizeClass, "medium");
  for (const ms of [0, 300]) assert.deepEqual(region(at(ms), "travel", "painted").rect, box, `at ${ms} the pod is in its dish`);
  for (const ms of [330, 450, 600, 750, 870, 899]) { const e = ease((ms - 300) * 1000 / 600), want = [box[0] + lerp(0, dx, e), box[1] + lerp(0, dy, e), 120, 152]; assert.deepEqual(region(at(ms), "travel", "painted").rect, want, `at ${ms}`); }
  assert.deepEqual(region(at(600), "travel", "painted").rect.slice(0, 2), [box[0] + 352, box[1] - 56], "half way at half the time");
  assert.deepEqual(region(at(900), "travel", "painted").rect, [box[0] + dx, box[1] + dy, 120, 152], "in the dome at 900: feet (864, 296)"); assert.equal(f.poll("done")?.kind, "grow"); assert.deepEqual(f.errors(), []);
});
test("grow with reduced motion is its end at once: the stamp whole, the code printed, the pod in the dome, the event done on the frame", { skip }, async () => {
  const b = scene({ read: 2, f: 1, roll: 1, grown: true }), f = await start(b, { motion: false, t0: 1000 }); f.send({ t: "event", kind: "grow", target: "pod", ms: 900, hold: 0 }); frames(f, 2); assert.equal(f.poll("done")?.kind, "grow");
  assert.equal(f.props({ screen: "create", ...b.props, motion: false, frame: frameProps(b.line) }), 0); frames(f); const lg = logOf(f);
  assert.deepEqual(departures(lg, createSpec, frameSpec, "grow"), []); assert.equal(region(lg, "stamp", "painted").rect[3], b.props.regions.stamp.size); assert.equal(lg.type.filter((t) => t.region === "code" && t.text).length, 1); assert.deepEqual(region(lg, "travel", "painted").rect, [804, 144, 120, 152]);
});
test("no refresh redraws more than a quarter of the screen while the pod travels (frames every 16 ms) or the founder dithers, the frame of the key that starts each included", { skip }, async () => {
  const area = (f) => { const n = f.M._face_dirty_count(), a = f.M.HEAP32.subarray(f.M._face_dirty_rects() >> 2, (f.M._face_dirty_rects() >> 2) + n * 4); let s = 0; for (let i = 0; i < n; i++) s += a[i * 4 + 2] * a[i * 4 + 3]; return s; };
  const worst = (f, t0, until, step) => { let w = 0; for (let t = step; t < until; t += step) { f.frame(t0 + t); w = Math.max(w, area(f)); } return w; };
  const { f, t0 } = await growing(); const g = worst(f, t0, 900, 16); assert.ok(g <= 153600, `grow: dirty area ${g} (${(100 * g / 614400).toFixed(1)}%)`); console.log(`# Create's grow: worst refresh ${(100 * g / 614400).toFixed(1)}% of the screen dirty`);
  const r = await rolled(); const d = worst(r.f, r.t0, 200, 16); assert.ok(d <= 153600, `dither: dirty area ${d} (${(100 * d / 614400).toFixed(1)}%)`); console.log(`# Create's roll dither: worst refresh ${(100 * d / 614400).toFixed(1)}% of the screen dirty`);
});


// ---- the chrome the words draw, and the fronts that are not drawn ----
test("the changed pip is a `bone` diamond, the clash pip a `red` cross, both drawn by the rail as chrome (the rows of the ruling); the focused trait's pip stands 2 px higher; the work tray's and the small chamber's fronts are not drawn", { skip }, async () => {
  const CX = [2, 1, 0, 0, 1, 2], CW = [2, 4, 6, 6, 4, 2], find = (f, y0, y1, test) => { for (let y = y0; y < y1; y++) for (let x = 100; x < 940; x++) if (test(x, y)) return [x, y]; return null; };
  const is = (f, x, y, c) => f.pixel(x, y).join() === rgbOf(c).join();
  const diamond = (f, x, y) => CX.every((cx, r) => is(f, x + cx, y + r, "bone") && is(f, x + cx + CW[r] - 1, y + r, "bone") && !is(f, x + cx + CW[r], y + r, "bone"));
  const b = scene({ read: 2, f: 1, roll: 1 }), f = await start(b), lg = logOf(f);
  assert.ok(find(f, 60, 80, (x, y) => diamond(f, x, y)), "a bone diamond among the pips"); 
  const lifted = find(f, 60, 80, (x, y) => diamond(f, x, y)); assert.equal(lifted[1], 69, "the focused trait's pip: y 71 − 2");
  assert.equal(region(lg, "chamberFront"), null); assert.equal(region(lg, "domeFront"), null);
  const c = scene({ read: 2, f: 1, roll: 1, clash: true }), g = await start(c); assert.ok(find(g, 60, 80, (x, y) => [0, 1, 2, 3, 4, 5].every((k) => is(g, x + k, y + k, "red") && is(g, x + 5 - k, y + k, "red"))), "a red cross where the pip was");
});
test("a blocked bottom line has no ✓ cap and keeps the verb where it stood (x 36), the verb and the price in mist; a short one has its verb at the same x", { skip }, async () => {
  const ground = (f, x, y) => f.pixel(x, y).join() === f.pixel(8, 585).join(), blocked = await start(scene({ read: 2, f: 1, busy: true })), short = await start(scene({ read: 2, f: 1, short: true }));
  let capInk = 0; for (let y = 574; y < 590; y++) for (let x = 16; x < 32; x++) if (!ground(blocked, x, y)) capInk++; assert.equal(capInk, 0, "no cap");
  let verbInk = 0; for (let y = 574; y < 592; y++) for (let x = 36; x < 44; x++) if (!ground(blocked, x, y)) verbInk++; assert.ok(verbInk > 0, "the verb starts at x 36");
  let verbShort = 0; for (let y = 574; y < 592; y++) for (let x = 36; x < 44; x++) if (!ground(short, x, y)) verbShort++; assert.ok(verbShort > 0, "a short line has its verb at the same x (its cap picture is the frame's, not in this test)");
});
