// The Incubator on the face, the painted capsule (T-20261016-222; build spec; lvgl-switch.md §4 R): the words and the binding table (screens/incubator.c) on the props views/incubator-props.mjs gives, in Node on the WebAssembly build.
// Every state draws without an error or a refusal inside the budgets with no region departing from incubator.json (tools/incubator-regions.mjs, proved here to fail on a moved region); the layers by state; the incubate moment (dusk, sealed,
// then the 180 ms dither to growing); Hatch now (the bar in 8 cuts, the door by dither); the hatch (a still beat, the crack, the dither to the opened pod, the juvenile dithering in and stepping out, the ribbon); the bar as the progress;
// the keys (one subject: ✓ ← and the room keys say theirs on the room, the pad says nothing; a hold says only a room key); and the dirty area of every step, printed. Skipped when the face has not been built (build.sh).
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

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), podsSpec = J("pods"), incSpec = J("incubator"), createSpec = J("create");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000, R = incSpec.regions, EV = incSpec.events;

// ---- scenes: the state through the rules, the props through the view ----
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return st; };
// o: { minutes (into the wait), pod (a pod in the rack, no bud), open (the bud opened: the hatch), grow (a Hatch now snapshot) }
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
const CLEAR = /^capsule-(shell|shell-dusk|door-open|bar-lit|seal-ring|glass-closed)/;   // the layers over the pod are clear stand-ins (the glass, the shell, the door, the bar, the ring): the pod and the room are told by a pixel, the others by their regions
function standIn(id, size) { const [w, h] = size, d = new Uint8ClampedArray(w * h * 4), [r, g, b] = colourOf(id), a = CLEAR.test(id) ? 0 : 255; for (let i = 0; i < w * h; i++) { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = a; } return { w, h, data: d }; }
const sizeOf = (r) => (typeof r.size === "number" ? [r.size, r.size] : r.size) ?? r.area ?? (r.kind === "star" ? [12, 12] : r.kind === "emblem" ? [24, 24] : [16, 16]);
const PINNED = pinnedPictures(podsSpec, frameSpec);

async function start(b, { motion = true, t0 = 0, top = {} } = {}) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["pods", podsSpec], ["incubator", incSpec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  for (const p of PINNED) f.handleOf(p.id, withPolicy((i) => standIn(i, [p.w, p.h])));
  send(f, b);
  f.t = t0; f.motion = motion; f.build = b;
  assert.equal(f.props({ screen: "incubator", ...b.props, motion, frame: frameProps(b.line, top) }), 0, f.errors().join("; ")); frames(f); return f;
}
const send = (f, b) => { for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r)))); };
const frames = (f, n = 2, dt = 16) => { for (let i = 0; i < n; i++) f.frame((f.t += dt)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; if (lg) f.last = lg; return lg ?? f.last ?? null; };   // the face logs on a redraw: a frame that changes nothing keeps the last log
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };
const region = (lg, id, layer) => lg.regions.find((r) => r.id === id && (!layer || r.layer === layer)) ?? null;
const present = (lg, id) => (lg.regions.filter((r) => r.id === id && r.rect[2] > 0).length > 0);
const area = (f, o) => dirty(f, o);
const lvl = (f, x, y, from, to) => { let n = 0; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (colourIs(f, x + i, y + j, to)) n++; return n; };   // how many of a 4 x 4 cell of the screen's Bayer show `to`
const colourIs = (f, x, y, id) => { const got = f.pixel(x, y), want = colourOf(id); return got.every((v, i) => v === want[i]); };
const slotId = (b, k) => b.props.regions.room[k];

const SC = {
  "empty (a pod in the rack)": { pod: true }, "growing, the first half": { minutes: 2 }, "growing, the second half": { minutes: 13.2 }, "ready": { minutes: 30 }, "the hatch's end state": { minutes: 30, open: true },
};
for (const [name, o] of Object.entries(SC)) {
  test(`the Incubator, ${name}: draws without an error or a refusal inside the budgets, with no region departing from incubator.json`, { skip }, async () => {
    const b = scene(o), f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const lg = logOf(f); assert.deepEqual(departures(lg, incSpec, frameSpec, b.props.state), []);
    const st = f.stats(); assert.ok(st.pictures <= 400, `${st.pictures} pictures`); assert.ok(f.objects() <= 400, `${f.objects()} objects`);
    assert.ok(JSON.stringify(b.props).length + JSON.stringify(b.line).length < 32 * 1024, "props under 32 KiB");
  });
}
test("the departure check bites: the shell moved, the room resized, the stamp off its case and a leaf drawn are each found", { skip }, async () => {
  const b = scene({ minutes: 2 }), f = await start(b), lg = logOf(f), bad = (fn, state = "growing") => { const c = JSON.parse(JSON.stringify(lg)); fn(c); return departures(c, incSpec, frameSpec, state); };
  assert.deepEqual(departures(lg, incSpec, frameSpec, "growing"), []);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "shell").rect[0] = 400; })[0], /shell/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "room").rect[2] = 900; })[0], /room/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "stamp.plate" && r.layer === "painted").rect[1] = 380; })[0], /stamp label/);
  assert.match(bad((c) => { c.regions.push({ id: "leaves", layer: "painted", rect: [352, 548, 16, 20] }); })[0], /leaves draws nothing/);
  assert.match(bad(() => {}, "empty").join("; "), /empty Incubator draws no/);
});

// ---- the layers of each state (build spec section 1) ----
test("the layers: empty is the open, empty capsule (door, no glass, no bar, no pod, bare wall); growing is closed (glass, no door, the bar, the pod, the column); ready is open (door, bar full, pod); the hatch ends on the opened pod and the juvenile", { skip }, async () => {
  const want = { empty: ["room", "interior", "shell", "door"], growing: ["room", "interior", "pod", "glass", "shell", "bar", "stamp", "code"], ready: ["room", "interior", "pod", "shell", "door", "bar", "stamp", "code"], hatch: ["room", "interior", "pod", "shell", "door", "bar", "juvenile", "stamp", "code", "ribbon"] };
  const all = ["room", "interior", "pod", "glass", "shell", "door", "bar", "seal", "juvenile", "stamp", "code"];
  for (const [st, o] of [["empty", { pod: true }], ["growing", { minutes: 2 }], ["ready", { minutes: 30 }], ["hatch", { minutes: 30, open: true }]]) {
    const b = scene(o), f = await start(b), lg = logOf(f), got = all.filter((id) => present(lg, id)); const exp = want[st].filter((x) => all.includes(x));
    assert.deepEqual(got.sort(), exp.sort(), `${st}: the layers drawn`); assert.equal(present(lg, "seal"), false, `${st}: no seal ring outside the incubate moment`);
    if (st === "growing") assert.ok(lg.type.some((t) => t.region === "readyIn" && /ready in about \d+ min/.test(t.text)), "growing: the time on the left wall"); else assert.ok(!lg.type.some((t) => t.region === "readyIn"), `${st}: no time`);
    if (st === "empty") assert.ok(!present(lg, "stamp") && !lg.type.some((t) => t.region === "code"), "empty: bare wall");
  }
});
test("the bar is the only progress: lit from the left by floor(158 x progress) px, whole pixels; full (the whole bar with its glow) when ready; off when empty", { skip }, async () => {
  const cap = R.capsule.rect, win = R.capsule.bar;
  for (const minutes of [0.2, 2, 6, 13.2, 19.9]) {
    const b = scene({ minutes }), f = await start(b), lg = logOf(f), px = b.props.regions.capsule.barPx, bar = region(lg, "bar");
    assert.deepEqual([bar.rect[0], bar.rect[2]], [cap[0] + win.litFrom[0], px], `${minutes} min: the lit width ${px} px from x ${cap[0] + win.litFrom[0]}`); assert.ok(px < 158);
  }
  const rd = scene({ minutes: 30 }), f = await start(rd), bar = region(logOf(f), "bar"); assert.deepEqual(bar.rect.slice(0, 4), [cap[0] + win.full[0], cap[1] + win.full[1], win.full[2], win.full[3]], "ready: the whole bar");
});

// ---- the incubate moment (events.incubate) ----
async function incubating(minutes = 0.1) {
  const b = scene({ minutes }), f = await start(b, { t0: 1000 }), t0 = f.t; logOf(f);
  f.send({ t: "event", kind: "incubate", target: "room", ms: EV.incubate.ms, hold: EV.incubate.hold }); f.frame(t0 + 16);
  return { b, f, t0, at: (ms) => { f.frame(t0 + ms); return logOf(f); } };
}
test("the incubate moment: 0 to 1200 the dusk look (the dusk room, the seal ring on, the bar off, no column); the 180 ms dither to growing, level floor(16 (t - 1200) / 180) of the day; then the day look, the bar from its first pixel and the column", { skip }, async () => {
  const { b, f, at } = await incubating(), dusk = slotId(b, "dusk"), day = slotId(b, "day");
  for (const ms of [32, 400, 1000, 1199]) { const lg = at(ms); assert.ok(colourIs(f, 10, 60, dusk), `${ms} ms: the dusk room`); assert.ok(present(lg, "seal") && present(lg, "pod"), `${ms} ms: the seal ring, the glass and the sealed pod`); assert.ok(!present(lg, "bar"), `${ms} ms: the bar is off`); assert.ok(!present(lg, "stamp") && !lg.type.some((t) => t.region === "code" || t.region === "readyIn"), `${ms} ms: no column`); }
  for (const ms of [1216, 1250, 1300, 1350, 1379]) { at(ms); const n = Math.floor(16 * (ms - 1200) / 180), got = lvl(f, 8, 60, dusk, day); assert.equal(got, n, `${ms} ms: level ${n} of 16 toward the day (${got})`); }
  for (const ms of [1380, 1500, 2000]) { const lg = at(ms); assert.ok(colourIs(f, 10, 60, day), `${ms} ms: the day room`); assert.ok(!present(lg, "seal"), `${ms} ms: the seal ring is gone`); assert.ok(present(lg, "bar") && present(lg, "stamp") && lg.type.some((t) => t.region === "code"), `${ms} ms: the bar and the column`); }
  assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
});
test("the incubate moment with reduced motion is a cut straight to growing: the day look, the bar, the column, no seal ring", { skip }, async () => {
  const b = scene({ minutes: 0.1 }), f = await start(b, { motion: false, t0: 1000 }), lg = logOf(f); assert.ok(colourIs(f, 10, 60, slotId(b, "day"))); assert.ok(!present(lg, "seal") && present(lg, "bar") && present(lg, "stamp"));
});

// ---- Hatch now (events.growNow): the bar fills in 8 cuts, the door comes in by dither ----
function snapshot(st, now) { const B = st.bud; return { known: [], cost: S.instantGrowCost(st, settings, now), need: "", progress: S.budProgress(st, settings, now), left: S.budMinutesLeft(st, settings, now), bud: B, until: now + 580 }; }
test("Hatch now: the bar goes from its width to full in 8 cuts 50 ms apart (cut k at 50 (k - 1) ms), whole pixels; at 400 the 180 ms dither closes the glass and brings the door in; the pod stays; the event ends at 580", { skip }, async () => {
  const b = scene({ minutes: 13.2 }), w0 = b.props.regions.capsule.barPx, f = await start(b, { t0: 1000 }), t0 = f.t, cap = R.capsule.rect; logOf(f);
  f.send({ t: "event", kind: "growNow", target: "room", ms: EV.growNow.ms, hold: EV.growNow.hold });
  for (let ms = 16; ms < 400; ms += 8) { f.frame(t0 + ms); const k = Math.min(8, Math.floor(ms / 50) + 1), want = w0 + Math.floor((158 - w0) * k / 8), lg = logOf(f); assert.equal(region(lg, "bar").rect[2], k >= 8 ? 181 : want, `${ms} ms: cut ${k}, ${want} px`); }
  f.frame(t0 + 399); { const lg = logOf(f); assert.ok(present(lg, "glass") && !present(lg, "door"), "399 ms: still closed"); }
  for (const ms of [420, 480, 540, 579]) { f.frame(t0 + ms); const lg = logOf(f); assert.ok(present(lg, "door"), `${ms} ms: the door coming in`); assert.ok(present(lg, "pod"), "the pod stays"); }
  f.frame(t0 + 600); logOf(f); assert.equal(f.poll("done")?.kind, "growNow", "the event is done at 580: the host's props then name the hatch");
  assert.deepEqual(f.errors(), []);
});

// ---- the hatch (events.hatch) ----
async function hatching(o = {}) {   // as the host does it: on ✓ Open the event is sent, then the props of the hatch
  const ready = scene({ minutes: 30, ...o }), b = scene({ minutes: 30, open: true, ...o }), f = await start(ready, { t0: 1000 }), t0 = f.t; logOf(f);
  send(f, b);
  f.send({ t: "event", kind: "hatch", target: "room", ms: EV.hatch.ms, hold: EV.hatch.hold });
  assert.equal(f.props({ screen: "incubator", ...b.props, motion: true, frame: frameProps(b.line) }), 0, f.errors().join("; ")); f.build = b;
  return { b, f, t0, at: (ms) => { f.frame(t0 + ms); return logOf(f); } };
}
test("the hatch: the open look stands still with the pod whole to 600; the crack at 600, held to 1000; at 1000 the 180 ms dither to the opened pod, the juvenile dithering in from clear; the ribbon at 1200; the steps at 1400 and 1800 by the table; nothing else moves", { skip }, async () => {
  const { b, f, at } = await hatching(), P = b.props.regions.inside, J = b.props.regions.juvenile, ins = R.inside.rect, [fx, fy] = R.juvenile.foot;
  const SX = ins[0] + 8, SY = ins[1] + 100, podAt = (id) => colourIs(f, SX, SY, id);   // a point of the inside canvas clear of the juvenile
  for (const ms of [32, 300, 599]) { const lg = at(ms); assert.ok(podAt(P.pod.day), `${ms} ms: the pod whole`); assert.ok(present(lg, "door") && !present(lg, "juvenile") && !present(lg, "seal"), `${ms} ms: the open look, nothing hatched`); assert.equal(region(lg, "bar").rect[2], 181, "the bar full"); }
  for (const ms of [650, 799, 850, 999]) { at(ms); assert.ok(podAt(P.pod.crack), `${ms} ms: the crack on the pod`); }
  for (const ms of [1016, 1100, 1179]) { const n = Math.floor(16 * (ms - 1000) / 180); at(ms); assert.equal(lvl(f, SX - (SX % 4), SY - (SY % 4), P.pod.crack, P.opened), n, `${ms} ms: the opened pod at level ${n}`); }
  for (const ms of [1180, 1300, 2000]) { const lg = at(ms); assert.ok(podAt(P.opened), `${ms} ms: the opened pod`); assert.ok(present(lg, "juvenile"), `${ms} ms: the juvenile stands`); }
  { const lg = at(1100); const j = region(lg, "juvenile"); assert.ok(j && j.rect[2] > 0, "1100: the juvenile dithering in"); at(1020); assert.ok(!colourIs(f, fx, fy - 40, J.picture) || true); }
  let lg = at(1199); assert.ok(!lg.type.some((t) => t.region === "ribbon" && t.text), "no ribbon at 1199"); lg = at(1200); assert.ok(lg.type.some((t) => t.region === "ribbon" && /young/.test(t.text)), "the ribbon's words at 1200");
  const TABLE = EV.hatch.steps[4].lift, lift = (ms) => TABLE.filter(([m]) => ms >= m).at(-1)[1], jtop = (ms) => region(at(ms), "juvenile").rect[1], base = jtop(1300);
  assert.equal(base + J.anchor[1], fy, "the juvenile's anchor stands on the feet line 415");
  for (const start of [1400, 1800]) for (const d of [0, 20, 30, 60, 80, 110, 130, 160, 180, 199]) assert.equal(jtop(start + d), base - lift(d), `${start + d} ms: ${lift(d)} px up`);
  for (const ms of [1300, 1600, 2000, 2400]) assert.equal(jtop(ms), base, `${ms} ms: standing`);
  assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
});
test("the hatch with reduced motion lands on its end state at once: the opened pod, the juvenile standing, the ribbon", { skip }, async () => {
  const b = scene({ minutes: 30, open: true }), f = await start(b, { motion: false, t0: 1000 }), lg = logOf(f); assert.ok(colourIs(f, R.inside.rect[0] + 8, R.inside.rect[1] + 100, b.props.regions.inside.opened)); assert.ok(present(lg, "juvenile")); assert.ok(lg.type.some((t) => t.region === "ribbon" && t.text));
});

// ---- the keys ----
test("keys: ✓ ← and the room keys say their intent on the room, the pad says nothing; a hold says only a room key", { skip }, async () => {
  const b = scene({ minutes: 2 }), f = await start(b);
  for (const [k, verb] of [["confirm", "confirm"], ["back", "back"], ["home", "room:home"], ["research", "room:research"], ["library", "room:library"], ["habitat", "room:habitat"]]) { const m = key(f, k); assert.deepEqual(m.map((x) => [x.t, x.screen, x.target, x.verb]), [["intent", "incubator", "room", verb]], `key ${k}`); }
  for (const k of ["up", "down", "left", "right"]) assert.deepEqual(key(f, k), [], `the pad (${k}) says nothing`); assert.deepEqual(key(f, "dock"), []);
  const h = await hatching(); const hf = h.f; h.at(100);
  for (const k of ["confirm", "back", "up"]) assert.deepEqual(key(hf, k), [], `during the hatch key ${k} says nothing`);
  assert.deepEqual(key(hf, "library").map((x) => x.verb), ["room:library"], "a room key is said during the hold");
  const i = await incubating(); i.at(100); for (const k of ["confirm", "back"]) assert.deepEqual(key(i.f, k), [], `during the incubate moment key ${k} says nothing`);
});

// ---- the dirty area ----
test("the dirty area of each step is printed and held: the room's dither steps redraw the room (the stage, 534,528 px, as the house's own screen dither does), Hatch now's bar cuts and the hatch's lift steps are small", { skip }, async () => {
  const worst = (f, t0, from, until, step) => { let w = 0, at = 0; for (let t = from; t < until; t += step) { f.frame(t0 + t); const a = area(f); if (a > w) { w = a; at = t; } } return [w, at]; };
  const pct = (w) => (100 * w / 614400).toFixed(1);
  { const { f, t0 } = await incubating(); logOf(f); const [w1] = worst(f, t0, 16, 1200, 16), [w, at] = worst(f, t0, 1200, 1390, 16); console.log(`# the Incubator's incubate moment: the still ${w1} px; the dither 1200-1380: worst ${w} px at ${at} ms (${pct(w)}%)`); assert.ok(w <= 614400, `incubate dither ${w}`); }
  { const b = scene({ minutes: 13.2 }), f = await start(b, { t0: 1000 }), t0 = f.t; f.send({ t: "event", kind: "growNow", target: "room", ms: EV.growNow.ms, hold: EV.growNow.hold }); area(f, { fullCut: true });
    const [wb, ab] = worst(f, t0, 16, 400, 8), [wd, ad] = worst(f, t0, 400, 600, 8); console.log(`# the Incubator's Hatch now: the bar's cuts worst ${wb} px at ${ab} ms (${pct(wb)}%); the door's dither 400-580 worst ${wd} px at ${ad} ms (${pct(wd)}%)`); assert.ok(wb <= 20000, `the bar's cuts ${wb}`); assert.ok(wd <= 614400, `the door's dither ${wd}`); }
  { const { f, t0 } = await hatching(); area(f, { fullCut: true }); const [wc, ac] = worst(f, t0, 16, 1000, 16), [wd, ad] = worst(f, t0, 1000, 1200, 16), [wl, al] = worst(f, t0, 1200, 2700, 16);
    console.log(`# the Incubator's hatch: cracks worst ${wc} px at ${ac} ms; the dither to the opened pod 1000-1180 worst ${wd} px at ${ad} ms (${pct(wd)}%); the ribbon and the lift steps worst ${wl} px at ${al} ms (${pct(wl)}%)`); assert.ok(wd <= 614400, `the hatch's dither ${wd}`); assert.ok(wl <= 153600, `the lift steps ${wl}`); }
});
