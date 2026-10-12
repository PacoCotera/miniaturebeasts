// The Incubator on the face (lvgl-switch.md §4 R): the words and the binding table (screens/incubator.c) on the props views/incubator-props.mjs gives, in Node on the WebAssembly build: every state draws without an error or a refusal
// inside the budgets with no region departing from incubator.json (tools/incubator-regions.mjs, proved here to fail on a moved region), the leaves on their arcs and the filling leaf's rows, growNow (leaf k whole at floor(k · 400 / n) ms),
// the hatch (a still beat, the bud's cracks, the juvenile, the ribbon, the step-out table), the keys (one subject: ✓ ← and the room keys say theirs on the room, the pad says nothing; a hold says only a room
// key), and the dirty area of a refresh. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/incubator.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames, frameOf, podGenome } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { incubatorBuild } from "../../station/src/views/incubator-props.mjs";
import { pinnedPictures } from "../../ui/specs/derive.mjs";
import { departures } from "../tools/incubator-regions.mjs";
import { dirty } from "./dirty.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), distNode = path.resolve(here, "../dist/node"), built = existsSync(path.join(dist, "face.mjs")) && existsSync(path.join(distNode, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), podsSpec = J("pods"), incSpec = J("incubator");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000, R = incSpec.regions, EV = incSpec.events;

// ---- scenes: the state through the rules, the props through the view ----
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return st; };
// o: { minutes (into the wait), pod (a pod in the rack, no bud), open (the bud opened: the hatch), grow (a growNow snapshot), cross }
function scene(o = {}) {
  const st = world(), id = "S01"; S.seedPodFromGenome(st, podGenome(frameOf(id), 3), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p); frameOf(id).chapters.slice(0, o.read ?? 1).forEach((c) => S.read(st, p, c.id, settings));
  let now = T0, ui = { inc: {} }, lamp = o.lamp ?? "";
  if (!o.pod) { const r = S.grow(st, p, {}, settings, T0); assert.ok(r.ok); now = T0 + (o.minutes ?? 2) * 60000; }
  if (o.open) { const B = st.bud, r = S.openBud(st, {}, settings, now); assert.ok(r.ok); ui.inc.hatch = { mibi: r.mibi.id, species: r.mibi.species, code: r.mibi.code, read: r.mibi.read, kind: B.kind, parents: null }; }
  if (o.grow) ui.inc.grow = o.grow(st, now);
  return { ...incubatorBuild({ st, settings, now, ui, lamp }, incSpec, podsSpec), st, now };
}
const frameProps = (line = {}, top = {}) => ({ top: { screen: "incubator", title: "Incubator", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null }, ...top }, line: { back: null, need: "", ...line }, plate: { text: "", timed: false } });

// stand-in pictures: a flat block keyed by id, at the size the request names; the colour is the id's, so a picture is told by one pixel
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const colourOf = (id) => { const k = hash(id); return [70 + (k & 127), 70 + ((k >> 7) & 127), 70 + ((k >> 14) & 127)]; };
function standIn(id, size, hollow = false) { const [w, h] = size, d = new Uint8ClampedArray(w * h * 4), [r, g, b] = colourOf(id); for (let i = 0; i < w * h; i++) { const x = i % w, y = (i / w) | 0, edge = x === 0 || y === 0 || x === w - 1 || y === h - 1; d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = hollow && !edge ? 0 : 255; } return { w, h, data: d }; }   // a PH hollow has its edge only
const sizeOf = (r) => (typeof r.size === "number" ? [r.size, r.size] : r.size) ?? (r.kind === "star" ? [12, 12] : r.kind === "emblem" ? [24, 24] : [16, 16]);
const PINNED = pinnedPictures(podsSpec, frameSpec);

async function start(b, { motion = true, t0 = 0, top = {}, node = false } = {}) {   // node: the test build, which can say where a node stands (nodeBox)
  const f = await bootFace(pathToFileURL((node ? distNode : dist) + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["pods", podsSpec], ["incubator", incSpec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  for (const p of PINNED) f.handleOf(p.id, withPolicy((i) => standIn(i, [p.w, p.h])));
  for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r), hollowOf(r))));
  f.t = t0; f.motion = motion; f.build = b;
  assert.equal(f.props({ screen: "incubator", ...b.props, motion, frame: frameProps(b.line, top) }), 0, f.errors().join("; ")); frames(f); return f;
}
const frames = (f, n = 2, dt = 16) => { for (let i = 0; i < n; i++) f.frame((f.t += dt)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };
const region = (lg, id, layer) => lg.regions.find((r) => r.id === id && (!layer || r.layer === layer)) ?? null;

// the two fronts are painted with a clear window; their stand-ins are clear as well
const hollowOf = (r) => r.hollow || /^(dome|nest)-front-/.test(r.id);
const area = (f, o) => dirty(f, o);

const colourIs = (f, x, y, id) => { const got = f.pixel(x, y), want = colourOf(id); return got.every((v, i) => v === want[i]); };
const SC = {
  "empty (a pod in the rack)": { pod: true }, "growing, the first half": { minutes: 2 }, "growing, the second half": { minutes: 13.2 }, "ready": { minutes: 30 }, "ready, the waiting lamp": { minutes: 30, lamp: incSpec.strings.painting },
  "the hatch's end state": { minutes: 30, open: true },
};
for (const [name, o] of Object.entries(SC)) {
  test(`the Incubator, ${name}: draws without an error or a refusal inside the budgets, with no region departing from incubator.json`, { skip }, async () => {
    const b = scene(o), f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const lg = logOf(f); assert.deepEqual(departures(lg, incSpec, frameSpec, b.props.state), []);
    const st = f.stats(); assert.ok(st.pictures <= 200, `${st.pictures} pictures`); assert.ok(f.objects() <= 400, `${f.objects()} objects`);
    assert.ok(JSON.stringify(b.props).length + JSON.stringify(b.line).length < 32 * 1024, "props under 32 KiB");
  });
}
test("the departure check bites: the nest moved, the dome resized, the stamp off its label and a foot light drawn are each found", { skip }, async () => {
  const b = scene({ minutes: 2 }), f = await start(b), lg = logOf(f), bad = (fn, state = "growing") => { const c = JSON.parse(JSON.stringify(lg)); fn(c); return departures(c, incSpec, frameSpec, state); };
  assert.deepEqual(departures(lg, incSpec, frameSpec, "growing"), []);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "nest").rect[0] = 400; })[0], /nest/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "dome").rect[2] = 300; })[0], /chamber's back/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "stamp" && r.layer === "chrome").rect[1] = 380; })[0], /stamp label/);
  assert.match(bad((c) => { c.regions.push({ id: "footLight", layer: "chrome", rect: [352, 548, 320, 2] }); })[0], /footLight draws nothing/);
  assert.match(bad(() => {}, "empty").join("; "), /empty Incubator draws no/);
});

// ---- the leaves on their arcs: the oracle's boxes, the filling leaf's rows ----
test("the leaves: each at its oracle box (leafArc), the first `full` whole, the next filled from its foot by `rows`, the rest outlines; no leaf past the total", { skip }, async () => {
  const b = scene({ minutes: 13.2 }), L = b.props.regions.leaves, f = await start(b);
  assert.ok(L.total === 20 && L.full === 13 && L.rows > 0 && L.rows < 20, JSON.stringify(L));
  const want = leafBoxes(L.total);
  for (let i = 0; i < L.total; i++) {
    const [x, y, w, h] = want[i], mid = f.pixel(x + 8, y + 10).join(), full = colourOf(L.filled).join(), edge = f.pixel(x, y + 10).join() === colourOf(L.empty).join();
    if (i > L.full) assert.ok(edge, `leaf ${i}: its outline at ${x}, ${y}`);
    if (i < L.full) assert.equal(mid, full, `leaf ${i} whole`);
    else if (i === L.full) { assert.equal(f.pixel(x + 8, y + h - L.rows).join(), full, "the filling leaf's lowest row"); assert.notEqual(f.pixel(x + 8, y + h - L.rows - 1).join(), full, `rows ${L.rows}: no more than its lowest ${L.rows}`); }
    else assert.notEqual(mid, full, `leaf ${i} an outline`);
  }
  assert.deepEqual(f.errors(), []);
});
function leafBoxes(n) { const Lr = R.leaves, a = Math.min(n, Lr.leafArc.perArc), run = (key, k) => Array.from({ length: k }, (_, j) => [...Lr.leafArc[key][Lr.leafArc.perArc - k + 2 * j], ...Lr.leaf]); return [...run("inner", a), ...run("outer", n - a)]; }

// ---- growNow: leaf k whole at floor(k · 400 / n) ms ----
test("growNow: the n leaves still to fill (the filling one first) each turn whole at floor(k · 400 / n) ms, in fill order; nothing else moves; the event ends at 400", { skip }, async () => {
  const b = scene({ minutes: 13.2 }), L = b.props.regions.leaves, f = await start(b, { t0: 1000 }), want = leafBoxes(L.total), n = L.total - L.full, t0 = f.t;
  f.send({ t: "event", kind: "growNow", target: "room", from: L.full, to: L.total, ms: EV.growNow.ms, hold: EV.growNow.hold });
  for (const e of [16, 100, 200, 300, 399]) {
    f.frame(t0 + e); const whole = (i) => { const [x, y] = want[i]; return f.pixel(x + 8, y + 10).join() === colourOf(L.filled).join() && f.pixel(x + 8, y + 1).join() === colourOf(L.filled).join(); };
    for (let k = 0; k < n; k++) assert.equal(whole(L.full + k), Math.floor(k * EV.growNow.ms / n) <= e, `${e} ms: leaf k = ${k}`);
    for (let i = 0; i < L.full; i++) assert.ok(whole(i), "the full leaves stay whole");
  }
  f.frame(t0 + 410); assert.equal(f.poll("done")?.kind, "growNow"); assert.deepEqual(f.errors(), []);
});

// ---- the hatch (events.hatch) ----
async function hatching(o = {}, node = false) {   // as the host does it: on ✓ Open the event is sent, then the props of the hatch
  const ready = scene({ minutes: 30, ...o }), b = scene({ minutes: 30, open: true, ...o }), f = await start(ready, { t0: 1000, node }), t0 = f.t; logOf(f);
  for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r), hollowOf(r))));
  f.send({ t: "event", kind: "hatch", target: "room", ms: EV.hatch.ms, hold: EV.hatch.hold });
  assert.equal(f.props({ screen: "incubator", ...b.props, motion: true, frame: frameProps(b.line) }), 0, f.errors().join("; ")); f.build = b;
  return { b, f, t0, at: (ms) => { f.frame(t0 + ms); return logOf(f); } };
}
test("the hatch is a still beat: the chamber's back, the nest and the window's front stay where they stand from 0 to the hand-off, nothing lifts or opens", { skip }, async () => {
  const { b, f, at } = await hatching(), back = b.props.regions.dome.back, front = b.props.regions.domeFront.picture;
  assert.equal(back, "dome-inside-ready-304x272:304x272"); assert.equal(front, "dome-front-304x272:304x272");
  const [dx, dy, dw, dh] = R.dome.rect;
  for (const ms of [1, 40, 100, 300, 599, 600, 900, 999]) {
    const lg = at(ms); assert.ok(colourIs(f, dx + 20, dy + 40, back), `${ms} ms: the back at rest`); assert.ok(colourIs(f, dx, dy + 100, front), `${ms} ms: the window's front's edge at rest`);
    assert.deepEqual(lg.regions.find((r) => r.id === "dome").rect, R.dome.rect); assert.deepEqual(lg.regions.find((r) => r.id === "domeFront").rect, R.domeFront.rect);
  }
  assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
});
test("the hatch: the bud is the ready picture with its shape and its front until 600, crack-1 over the ready bud at 600, crack-2 alone over it at 800, gone at 1000; the juvenile stands from 1000 and steps out at 1400 and 1800 by the table; the ribbon shows at 1200; no leaves, no plaque word", { skip }, async () => {
  const { b, f, at } = await hatching({}, true), B = b.props.regions.bud, J = b.props.regions.juvenile.picture, [bx, by] = R.bud.rect, [jx, jy, jw] = R.juvenile.rect, BP1 = [bx + 62, by + 16], BP2 = [bx + 61, by + 16];
  assert.equal(b.props.regions.leaves.total, 0); assert.equal(b.props.regions.plaque, "");
  const shown = (id) => { const n = f.nodeBox(id); return !!n && n.box[2] > 0; }, nodes = () => ["early", "late", "ready", "shape", "front", "crack1", "crack2"].filter((k) => shown(`bud.${k}`)).join();
  // the cracks are overlays: crack-1's pixel (bud + (62, 16)) is crack-1's, crack-2's pixel (bud + (61, 16)) is crack-2's and crack-1 lacks it; the ready bud has no pixel free of its front, so it is told by the nodes shown
  for (const [ms, want] of [[650, B.crack1], [799, B.crack1]]) { at(ms); assert.ok(colourIs(f, ...BP1, want), `${ms} ms: the bud's ${want}`); }
  for (const ms of [850, 999]) { at(ms); assert.ok(colourIs(f, ...BP2, B.crack2), `${ms} ms: the bud's ${B.crack2}`); }
  for (const [ms, want] of [[100, "ready,shape,front"], [300, "ready,shape,front"], [599, "ready,shape,front"], [650, "ready,crack1"], [799, "ready,crack1"], [850, "ready,crack2"], [999, "ready,crack2"], [1000, ""], [1100, ""]]) { at(ms); assert.equal(nodes(), want, `${ms} ms: the nodes shown`); }
  for (const ms of [100, 300, 599]) { at(ms); assert.ok(shown("bud.front"), `${ms} ms: bud.front is shown`); assert.ok(shown("bud.ready"), `${ms} ms: bud.ready is shown under it`); }
  for (const ms of [650, 850]) { at(ms); assert.ok(shown("bud.ready"), `${ms} ms: bud.ready is shown under the crack`); assert.ok(!shown("bud.shape") && !shown("bud.front"), `${ms} ms: the shape and the front are gone (in the hatch until the crack at 600)`); }
  for (const ms of [1000, 1100]) { const lg = at(ms); assert.ok(!colourIs(f, ...BP2, B.crack2), `${ms} ms: the bud has gone`); assert.ok(colourIs(f, jx + 40, jy + 40, J), `${ms} ms: the juvenile stands`); assert.equal(lg.type.some((t) => t.region === "plaque"), false); }
  at(999); assert.ok(!colourIs(f, jx + 40, jy + 40, J), "the juvenile is not there at 999");
  let lg = at(1199); assert.ok(!lg.type.some((t) => t.region === "ribbon" && t.text), "no ribbon at 1199"); lg = at(1200); assert.ok(lg.type.some((t) => t.region === "ribbon" && /young/.test(t.text)), "the ribbon's words at 1200");
  const TABLE = EV.hatch.steps[6].lift, lift = (ms) => TABLE.filter(([m]) => ms >= m).at(-1)[1], top = (ms) => { for (let y = jy - 6; y < jy + 8; y++) if (colourIs(f, jx + 40, y, J)) return y; return null; };
  for (const start of [1400, 1800]) for (const d of [0, 20, 30, 60, 80, 110, 130, 160, 180, 199]) { at(start + d); assert.equal(top(start + d), jy - lift(d), `${start + d} ms: ${lift(d)} px up`); }
  for (const ms of [1300, 1600, 2000, 2400]) { at(ms); assert.equal(top(ms), jy, `${ms} ms: standing`); }
  assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
});
test("the hatch's waiting lamp: home-lamp-sky-12x12 at its rect while the painting is on its way, a node with no size otherwise", { skip }, async () => {
  const on = scene({ minutes: 30, lamp: incSpec.strings.painting }), off = scene({ minutes: 30 });
  assert.equal(on.props.regions.lamp.on, true); assert.equal(off.props.regions.lamp.on, false); assert.equal(on.props.regions.lamp.picture, off.props.regions.lamp.picture);
  const f = await start(on), lg = logOf(f); assert.deepEqual(region(lg, "lamp").rect, R.base.lamp.rect.length === 4 ? R.base.lamp.rect : null);
  const g = await start(off); assert.equal(logOf(g).regions.some((r) => r.id === "lamp" && r.rect[2] > 0), false);
});

// ---- the keys ----
test("keys: ✓ ← and the room keys say their intent on the room, the pad says nothing; a hold says only a room key", { skip }, async () => {
  const b = scene({ minutes: 2 }), f = await start(b);
  for (const [k, verb] of [["confirm", "confirm"], ["back", "back"], ["home", "room:home"], ["research", "room:research"], ["library", "room:library"], ["habitat", "room:habitat"]]) { const m = key(f, k); assert.deepEqual(m.map((x) => [x.t, x.screen, x.target, x.verb]), [["intent", "incubator", "room", verb]], `key ${k}`); }
  for (const k of ["up", "down", "left", "right"]) assert.deepEqual(key(f, k), [], `the pad (${k}) says nothing`); assert.deepEqual(key(f, "dock"), []);
  const h = await hatching(); const hf = h.f; h.at(100);
  for (const k of ["confirm", "back", "up"]) assert.deepEqual(key(hf, k), [], `during the hatch key ${k} says nothing`);
  assert.deepEqual(key(hf, "library").map((x) => x.verb), ["room:library"], "a room key is said during the hold");
});

// ---- the dirty area ----
test("no refresh redraws more than a quarter of the screen across the hatch (frames every 16 ms and every 40 ms) and growNow; the hatch's first frames and growNow's key frame are printed", { skip }, async () => {
  const worst = (f, t0, until, step) => { let w = 0; for (let t = step; t < until; t += step) { f.frame(t0 + t); w = Math.max(w, area(f)); } return w; };
  { const { f, t0 } = await hatching(); const at = {}; for (let t = 16; t < 2700; t += 16) { f.frame(t0 + t); at[t] = area(f); }   // the ruling's beats: the first frame (≤ 55,808), the cracks (20,480), the juvenile standing (94,848), the ribbon at 1200 (16,000 by the ruling), the steps (96,064)
    assert.ok(at[16] <= 55808, `t = 0: ${at[16]}`); assert.ok(at[608] <= 20480 && at[800] <= 20480, `cracks ${at[608]}, ${at[800]}`); assert.ok(at[1008] <= 94848, `1000: ${at[1008]}`); assert.ok(at[1200] <= 16000, `1200: ${at[1200]}`); console.log(`# the Incubator's hatch beats (px): t=0 ${at[16]} · 600 ${at[608]} · 800 ${at[800]} · 1000 ${at[1008]} · 1200 ${at[1200]} (the ruling: 16,000) · steps ${Math.max(...[1408, 1456, 1808, 1952].map((t) => at[t]))}`); }
  { const { f, t0 } = await hatching(); const w = worst(f, t0, 2700, 16); assert.ok(w <= 96064, `hatch (16 ms): dirty ${w} (${(100 * w / 614400).toFixed(1)}%)`); console.log(`# the Incubator's hatch, 16 ms frames: worst refresh ${w} px (${(100 * w / 614400).toFixed(1)}%)`); }
  { const { f, t0 } = await hatching(); const w = worst(f, t0, 2700, 40); assert.ok(w <= 96064, `hatch (40 ms): dirty ${w}`); console.log(`# the Incubator's hatch, 40 ms frames: worst refresh ${w} px (${(100 * w / 614400).toFixed(1)}%)`); }
  { const b = scene({ minutes: 13.2 }), L = b.props.regions.leaves, f = await start(b, { t0: 1000 }), t0 = f.t; f.send({ t: "event", kind: "growNow", target: "room", from: L.full, to: L.total, ms: EV.growNow.ms, hold: EV.growNow.hold });
    const w = worst(f, t0, 420, 16); assert.ok(w <= 153600, `growNow: dirty ${w}`); console.log(`# the Incubator's growNow: worst refresh ${w} px (${(100 * w / 614400).toFixed(1)}%)`); }
});
test("growNow with reduced motion is one cut on the key's frame: the leaves, the tabs and the ready state in one refresh of at most 162,432 px", { skip }, async () => {
  const before = scene({ minutes: 13.2 }), f = await start(before, { motion: false, t0: 1000, top: { materials: { e: 9, d: 10, s: 9 } } });   // the grow spends ◆ 4 (10 → 6): the top bar changes and flashes with the line, as on the page
  const after = scene({ minutes: 13.2, grow: undefined }); const st = after.st; S.instantGrow(st, settings, after.now);
  const b2 = incubatorBuild({ st, settings, now: after.now, ui: { inc: {} }, lamp: "" }, incSpec, podsSpec);
  for (const r of b2.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r), hollowOf(r))));
  assert.equal(b2.props.state, "ready"); assert.equal(f.props({ screen: "incubator", ...b2.props, motion: false, frame: frameProps(b2.line, { materials: { e: 9, d: 6, s: 9 }, flash: { d: true } }) }), 0, f.errors().join("; ")); f.frame((f.t += 16)); const a = area(f), n = f.M._face_dirty_count();
  assert.equal(f.invOverflows(), 0, "no overflow of LVGL's invalid areas"); console.log(`# the Incubator's growNow cut (motion off, ◆ 10→6 and the flash), the key's frame: ${a} px (${(100 * a / 614400).toFixed(1)}%) in ${n} flushes, ${f.invOverflows()} overflows`); assert.ok(a <= 162432, `dirty ${a}`);
});

test("growNow with motion on: the props show the bud as it was until 400, then the ready state lands on one refresh of at most 153,600 px", { skip }, async () => {
  const b = scene({ minutes: 13.2 }), L = b.props.regions.leaves, f = await start(b, { t0: 1000 }), t0 = f.t;
  f.send({ t: "event", kind: "growNow", target: "room", from: L.full, to: L.total, ms: EV.growNow.ms, hold: EV.growNow.hold }); for (let t = 16; t < 400; t += 16) f.frame(t0 + t);
  const after = scene({ minutes: 13.2 }); S.instantGrow(after.st, settings, after.now);
  const b2 = incubatorBuild({ st: after.st, settings, now: after.now, ui: { inc: {} }, lamp: "" }, incSpec, podsSpec);
  for (const r of b2.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r), hollowOf(r))));
  assert.equal(f.props({ screen: "incubator", ...b2.props, motion: true, frame: frameProps(b2.line) }), 0, f.errors().join("; ")); f.frame(t0 + 400); const a = area(f);
  console.log(`# the Incubator's growNow, ready at 400 (motion on): ${a} px (${(100 * a / 614400).toFixed(1)}%)`); assert.ok(a <= 153600, `dirty ${a}`); assert.deepEqual(f.errors(), []);
});
test("the rail refuses a pip that is not 6 × 6: the composed marks are defined at 6, and the error says so", { skip }, async () => {
  const b = scene({ minutes: 2 }), f = await start(b), bad = JSON.parse(JSON.stringify(frameSpec));
  bad.regions.rail.pip.size = 8; assert.equal(f.send({ t: "spec", screen: "frame", json: bad }), 0);
  const b2 = scene({ minutes: 13.2 }); for (const r of b2.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r), hollowOf(r))));
  f.props({ screen: "incubator", ...b2.props, motion: true, frame: frameProps(b2.line) }); frames(f);
  assert.match(f.errors().join("; "), /a rail pip is 6 × 6/); assert.ok(f.refused() > 0, "the screen is refused");
});

// ---- Station M1 §2.5, §3: the hatch with a moving set (the close atlas synthesized at 304 × 312; moving-scene.mjs) ----
import { MOVING as MSETS, sendMoving, atlasPicture } from "./moving-scene.mjs";
import { setMoving } from "../../station/src/moving.mjs";
setMoving(MSETS);
async function hatchMoving({ motion = true, id = "S01" } = {}) {
  const st = world(); S.seedPodFromGenome(st, podGenome(frameOf(id), 3), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p); S.read(st, p, frameOf(id).chapters[0].id, settings);
  assert.ok(S.grow(st, p, {}, settings, T0).ok); const now = T0 + 30 * 60000, r = S.openBud(st, {}, settings, now); assert.ok(r.ok);
  const b = incubatorBuild({ st, settings, now, ui: { inc: { hatch: { mibi: r.mibi.id, species: r.mibi.species, code: r.mibi.code, read: r.mibi.read, kind: "founder", parents: null } } }, lamp: "", motionSets: true }, incSpec, podsSpec);
  assert.ok(b.props.regions.juvenile.moving, "the juvenile names its close atlas");
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["pods", podsSpec], ["incubator", incSpec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0); assert.equal(sendMoving(f), 0, f.errors().join("; "));
  for (const i of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${i}:16`, withPolicy((x) => standIn(x, [16, 16])));
  for (const q of PINNED) f.handleOf(q.id, withPolicy((x) => standIn(x, [q.w, q.h])));
  for (const q of b.requests) f.handleOf(q.id, withPolicy((x) => (q.kind === "moving" ? atlasPicture(x) : standIn(x, sizeOf(q), hollowOf(q)))));
  f.t = 5000; f.motion = motion; f.build = b;
  assert.equal(f.props({ screen: "incubator", ...b.props, motion, frame: frameProps(b.line) }), 0, f.errors().join("; ")); frames(f); dirty(f, { fullCut: true });
  const ev = EV.hatch.moving; f.send({ t: "event", kind: "hatch", target: "room", ms: ev.ms, hold: ev.hold, cut: true }); return f;
}
const hatchCell = (f) => { const c = f.M._face_test_hatch_cell(), cells = MSETS.S01.juvenile.close.cells; return c === -50 ? "none" : c < 0 ? "dither" : cells[c]; };
test("the hatch with a moving set (M1 §2.5, R2): the table by face_test_cell: nothing to 1000, the curl's dither-in to 1180, curl, curl·b1 at 1500, the dither to crouch at 2140, crouch at 2320, stand at 2720 and its breath, the first hop at 5120 on [6, 14, 17, 14, 6], stand at 5840; every frame inside 153,600 px", { skip }, async () => {
  const f = await hatchMoving(), seen = []; let worst = 0, last = null;
  for (let t = 16; t <= 6400; t += 16) { f.frame((f.t += 16)); worst = Math.max(worst, dirty(f)); const c = hatchCell(f); if (c !== last) { seen.push([t, c]); last = c; } }
  const at = (ms) => { let c = "none"; for (const [t, x] of seen) if (t <= ms) c = x; return c; };
  for (const [ms, want] of [[900, "none"], [1090, "dither"], [1300, "curl"], [1800, "curl-b1"], [2200, "dither"], [2500, "crouch"], [2800, "stand"], [3700, "stand-b1"], [4000, "stand-b2"], [5150, "crouch"], [5440, "air"], [5700, "crouch"], [5900, "stand"]]) assert.equal(at(ms), want, `at ${ms} ms: ${JSON.stringify(seen)}`);
  assert.ok(worst <= 153600, `${worst} px`);
  console.log(`# the hatch with a moving set: worst frame ${worst} px; ${seen.map(([t, c]) => t + " " + c).join(", ")}`);
});
test("the hatch with a moving set, motion off: the cut to its end (the stand)", { skip }, async () => {
  const f = await hatchMoving({ motion: false }); frames(f); assert.equal(hatchCell(f), "stand");
});
test("the S05 hatch (the animator's ruling): at 5120 one step, not a hop: stepa 320, then stand", { skip }, async () => {
  const f = await hatchMoving({ id: "S05" }), cells = MSETS.S05.juvenile.close.cells, seen = []; let last = null;
  for (let t = 16; t <= 6300; t += 16) { f.frame((f.t += 16)); const c = f.M._face_test_hatch_cell(), n = c === -50 ? "none" : c < 0 ? "dither" : cells[c]; if (n !== last) { seen.push([t, n]); last = n; } }
  const step = seen.find(([, n]) => n === "stepa"); assert.ok(step && step[0] >= 5120 && step[0] <= 5136, JSON.stringify(seen)); const after = seen.find(([t, n]) => t > step[0] && n !== "stepa"); assert.equal(after[1], "stand"); assert.ok(after[0] >= 5440 && after[0] <= 5456);
});
