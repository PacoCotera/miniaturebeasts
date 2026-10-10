// Animation on the face (lvgl-switch.md §2.7): the timeline in JavaScript says that something plays, and for how long; the face plays it on the host's clock, in whole pixels, tells the host when it is
// done, holds input while an event holds, and jumps to the end when motion is off. Pods' scenes from tests/vectors/pods-words.json carry the props. Skipped when the face has not been built.
//   node --test prototypes/face/tests/anim.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), frameSpec = JSON.parse(readFileSync(path.join(specs, "frame.json"), "utf8")), podsSpec = JSON.parse(readFileSync(path.join(specs, "pods.json"), "utf8"));
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const { cases } = JSON.parse(readFileSync(path.join(here, "vectors/pods-words.json"), "utf8"));
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const standIn = (id, w, h, slice, tile) => { const d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d, ...(slice ? { slice, tile } : {}) }; };

async function start(c, over = {}) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", colours: palette }); f.send({ t: "spec", screen: "frame", json: frameSpec }); f.send({ t: "spec", screen: "pods", json: podsSpec });
  for (const p of c.pictures) f.handleOf(p.id, withPolicy((id) => standIn(id, p.w, p.h, p.slice, p.tile)));
  const props = JSON.parse(JSON.stringify(c.props)); Object.assign(props, over); f.t = 1000; f.frame(f.t); assert.equal(f.props(props), 0, f.errors().join()); f.frame((f.t += 16)); f.pass(3); f.poll("log"); return f;
}
// the face's clock to `ms` into the event, and the frame drawn at once (the display's own refresh period is 33 ms)
const at = (f, ms) => { f.frame((f.t = f.t0 + ms)); f.pass(3); };
const send = (f, e) => { f.t0 = f.t; assert.equal(f.send({ t: "event", ...e }), 0, f.errors().join()); };
const msgs = (f, t) => { const out = []; for (let m; (m = f.poll());) if (!t || m.t === t) out.push(m); return out; };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
const find = (state, re) => cases.find((c) => c.state === state && re.test(c.name));

test("a seal clears from the top down over its length: the cut grows in whole pixels, the frame is drawn each step, and `done` says it ended", { skip }, async () => {
  const c = find("overview", /the seal half cleared/), f = await start(c); const pod = c.props.regions.specimen.pod, hs = [];
  send(f, { kind: "seal", target: pod.id, ms: 2000, hold: 2000 });
  for (const ms of [250, 500, 750, 1000]) { at(f, ms); hs.push(f.hash()); }   // the cradle's front lip hides the pod below its 88th row, so the cut shows to 76 px
  assert.equal(new Set(hs).size, hs.length, "each step draws a different frame"); assert.deepEqual(msgs(f, "done"), [], "not done yet");
  at(f, 2000); const done = msgs(f, "done"); assert.deepEqual(done, [{ t: "done", kind: "seal", target: pod.id }]);
  const end = f.hash(); at(f, 2200); assert.equal(f.hash(), end, "the end state stays");
});
test("a held event holds input: no key is acted on until it ends", { skip }, async () => {
  const c = find("overview", /unidentified pod, the pod focused/), f = await start(c);
  send(f, { kind: "seal", target: c.props.regions.specimen.pod.id, ms: 2000, hold: 2000 }); at(f, 100);
  f.send({ t: "key", k: "right" }); f.send({ t: "key", k: "confirm" }); assert.deepEqual(msgs(f).filter((m) => m.t === "focus" || m.t === "intent"), [], "held");
  at(f, 2000); f.send({ t: "key", k: "right" }); assert.equal(msgs(f).filter((m) => m.t === "focus").length, 1, "free again");
  send(f, { kind: "plate", target: "msg", ms: 4000 }); at(f, 100); f.send({ t: "key", k: "left" }); assert.equal(msgs(f).filter((m) => m.t === "focus").length, 1, "a plate does not hold");
});
test("motion off: every event jumps to its end (done at once, nothing drawn in between)", { skip }, async () => {
  const c = find("overview", /the seal half cleared/), f = await start(c, { motion: false }), before = f.hash();
  send(f, { kind: "seal", target: c.props.regions.specimen.pod.id, ms: 2000, hold: 2000 }); assert.equal(msgs(f, "done").length, 1); at(f, 500); assert.equal(f.hash(), before);
});
test("the ribbon shows from its `from` and not before; the same event again starts over", { skip }, async () => {
  const c = find("overview", /a ribbon in the origin/), f = await start(c);
  const text = () => (logOf(f)?.type ?? []).map((t) => t.text), pod = c.props.regions.specimen.pod.id; let lg;
  send(f, { kind: "ribbon", target: pod, ms: 7400, from: 1400 }); at(f, 1000); lg = logOf(f); assert.ok(!lg.type.some((t) => t.text === "New species"), "not yet"); assert.ok(lg.regions.some((r) => r.id === "origin"), "the origin is shown until then");
  at(f, 1400); lg = logOf(f); assert.ok(lg.type.some((t) => t.text === "New species")); assert.ok(!lg.regions.some((r) => r.id === "origin"));
  send(f, { kind: "ribbon", target: pod, ms: 7400, from: 1400 }); at(f, 100); lg = logOf(f); assert.ok(!lg.type.some((t) => t.text === "New species"), "starting over"); void text;
});
test("Read fills the pips ceil(p * n) over the event, then the end state", { skip }, async () => {
  const c = find("overview", /a read wipe in progress/), f = await start(c), chap = c.events[0].target, tabs = c.props.regions.rail.tabs, ti = tabs.findIndex((t) => t.id === chap), n = tabs[ti].pips;
  assert.ok(n >= 2 && tabs[ti].filled === n && tabs[ti].state === "read");
  const seen = new Set(); send(f, { kind: "wipe", target: chap, ms: 2000, hold: 2000 });
  for (let ms = 0; ms <= 2000; ms += 100) { at(f, ms); seen.add(f.hash()); }
  assert.equal(seen.size, n + 1, `${n} pips fill in ${n} steps (and the empty tab before)`); assert.equal(msgs(f, "done").length, 1);
});
test("the plate shows while its event plays (4 s) and goes", { skip }, async () => {
  const c = find("overview", /a message over the pod/), f = await start(c); const quiet = f.hash();
  send(f, { kind: "plate", target: "msg", ms: 4000 }); at(f, 1000); const shown = f.hash(); assert.notEqual(shown, quiet); at(f, 3999); assert.equal(f.hash(), shown);
  at(f, 4000); assert.equal(f.hash(), quiet, "gone when the event ends"); assert.equal(msgs(f, "done").length, 1);
});
test("counters tick toward their value one unit every 70 ms, the first at once, with a 240 ms tick behind the figure that changed", { skip }, async () => {
  const c = find("overview", /unidentified pod, the pod focused/), props = JSON.parse(JSON.stringify(c.props)); props.frame.top.materials.e = 9; props.frame.top.flash = {};
  const f = await start({ ...c, props }); const e = () => { const lg = logOf(f); return lg.type.find((t) => t.region === "materials" && /^\d+$/.test(t.text)); };
  send(f, { kind: "tick", target: "e", from: 5, to: 9, ms: 3 * 70 + 240 }); const seen = [];
  for (const ms of [0, 69, 70, 139, 140, 210, 400, 520]) { at(f, ms); const lg = logOf(f); seen.push(lg?.type.filter((t) => t.region === "materials").map((t) => t.text).join(",")); }
  assert.deepEqual(seen.map((s) => s?.split(",")[0]), ["6", "6", "7", "7", "8", "9", "9", "9"], "5 to 9: +1 at 0, 70, 140, 210");
  at(f, 600); assert.equal(msgs(f, "done").length, 1); void e;
});
test("the turn's flash blinks 160 ms on and 160 off for a second", { skip }, async () => {
  const c = find("overview", /unidentified pod, the pod focused/), f = await start(c), base = f.hash(); send(f, { kind: "flash", target: "turn", ms: 1000 }); const hs = [];
  for (const ms of [0, 100, 160, 300, 320, 480, 960, 999]) { at(f, ms); hs.push(f.hash()); }
  assert.deepEqual(hs.map((h) => h === base), [false, false, true, true, false, true, false, false], "on for 160 ms, off for 160, on again");
  at(f, 1000); assert.equal(f.hash(), base);
});
test("events are checked: an unknown kind, a target that is not a string and a full table are refused", { skip }, async () => {
  const f = await start(cases[0]);
  assert.equal(f.send({ t: "event", kind: "spin" }), -1); assert.equal(f.send({ t: "event", kind: "seal", target: 5 }), -1); assert.equal(f.send({ t: "event", kind: "seal", target: "p", from: "x" }), -1); f.errors();
  for (let i = 0; i < 24; i++) assert.equal(f.send({ t: "event", kind: "seal", target: "p" + i, ms: 5000 }), 0);
  assert.equal(f.send({ t: "event", kind: "seal", target: "one more", ms: 5000 }), -1); assert.match(f.errors().join(), /24 events/);
});

test("a screen change: a Bayer dither of void over the stage clears in 16 levels over 180 ms, whole pixels from the palette, the bars untouched", { skip }, async () => {
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], c = find("collection", /four identified pods/), f = await start(c);
  const snap = () => new Uint32Array(f.M.HEAPU8.slice(f.M._face_fb(), f.M._face_fb() + 1024 * 600 * 4).buffer), base = snap(), offBase = f.offPalette();
  const voidRgb = (() => { const h = palette.find(([n]) => n === "void")[1]; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); })(), VOID = ((0xff << 24) | (voidRgb[0] << 16) | (voidRgb[1] << 8) | voidRgb[2]) >>> 0;
  send(f, { kind: "dither", target: "stage", ms: 180 });
  for (const ms of [0, 11, 12, 45, 90, 135, 179]) {
    at(f, ms); const L = 16 - Math.floor((16 * ms) / 180), cur = snap(); let bad = 0, covered = 0;
    for (let y = 0; y < 600; y++) for (let x = 0; x < 1024; x++) { const stage = y >= 40 && y < 562, want = stage && BAYER[(y & 3) * 4 + (x & 3)] < L ? VOID : base[y * 1024 + x]; if (cur[y * 1024 + x] !== want) bad++; if (stage && want === VOID) covered++; }
    assert.equal(bad, 0, `at ${ms} ms, level ${L}: ${bad} pixels differ`); assert.ok(L < 16 || covered === 1024 * 522, "level 16 covers the stage whole"); assert.equal(f.offPalette() <= offBase, true, "the dither adds no colour the palette lacks (only the type layer blends)");
  }
  at(f, 180); assert.deepEqual(snap().every((v, i) => v === base[i]), true, "clear when the event ends"); assert.equal(msgs(f, "done").length, 1);
});

// ---- the hold in whole ms, the cut, and room keys during a hold (lvgl-switch.md §2.1) ----
test("hold is whole ms: a boolean, a negative, a fraction and a number over 30000 are refused; `cut` is true or false", { skip }, async () => {
  const c = find("overview", /unidentified pod, the pod focused/), f = await start(c), ev = { t: "event", kind: "plate", target: "msg", ms: 400 };
  for (const bad of [true, false, -1, 1.5, 30001, "100"]) { assert.equal(f.send({ ...ev, hold: bad }), -1, String(bad)); assert.match(f.errors()[0], /hold is a whole number of ms \(0 = none\)/); }
  assert.equal(f.send({ ...ev, hold: 0 }), 0); assert.equal(f.send({ ...ev }), 0); assert.equal(f.send({ ...ev, hold: 30000 }), 0);
  for (const bad of [1, "true", null]) { assert.equal(f.send({ ...ev, cut: bad }), -1, String(bad)); assert.match(f.errors()[0], /cut is true or false/); }
  assert.equal(f.send({ ...ev, cut: true }), 0); assert.equal(f.send({ ...ev, cut: false }), 0);
});
test("the hold is independent of ms: a hold shorter than the event frees input while it plays; a hold longer holds past its end", { skip }, async () => {
  const c = find("overview", /unidentified pod, the pod focused/), f = await start(c), pod = c.props.regions.specimen.pod.id, keyed = () => { f.send({ t: "key", k: "right" }); return msgs(f).filter((m) => m.t === "focus").length; };
  send(f, { kind: "seal", target: pod, ms: 2000, hold: 500 }); at(f, 300); assert.equal(keyed(), 0, "held at 300"); at(f, 600); assert.equal(keyed(), 1, "free at 600 while the seal still plays"); assert.equal(msgs(f, "done").length, 0);
  const f2 = await start(c); send(f2, { kind: "plate", target: "msg", ms: 400, hold: 1000 }); at(f2, 600); assert.equal(msgs(f2, "done").length, 1, "the event is over");
  f2.send({ t: "key", k: "right" }); assert.equal(msgs(f2).filter((m) => m.t === "focus").length, 0, "the hold goes on at 600"); at(f2, 1100); f2.send({ t: "key", k: "right" }); assert.equal(msgs(f2).filter((m) => m.t === "focus").length, 1, "free at 1100");
});
test("a cut event ends at the next key the face acts on (done on that frame) and the key acts; an event with no cut does not", { skip }, async () => {
  const c = find("overview", /unidentified pod, the pod focused/), f = await start(c), pod = c.props.regions.specimen.pod.id;
  send(f, { kind: "plate", target: "msg", ms: 4000, cut: true }); at(f, 100); assert.deepEqual(msgs(f, "done"), []);
  f.send({ t: "key", k: "right" }); const out = msgs(f); assert.deepEqual(out.filter((m) => m.t === "done"), [{ t: "done", kind: "plate", target: "msg" }], "ended by the key"); assert.equal(out.filter((m) => m.t === "focus").length, 1, "and the key acted");
  send(f, { kind: "wipe", target: pod, ms: 4000 }); at(f, 100); f.send({ t: "key", k: "left" }); assert.deepEqual(msgs(f, "done"), [], "no cut: it plays on");
  const f2 = await start(c); send(f2, { kind: "plate", target: "msg", ms: 4000, cut: true, hold: 1000 }); at(f2, 100); f2.send({ t: "key", k: "right" }); assert.deepEqual(msgs(f2, "done"), [], "a hold comes first: the key does not cut");
});
test("during a hold the pad, ✓ and ← do nothing and a room key says room:<x> on the focus; when it ends the keys act again", { skip }, async () => {
  const c = find("overview", /unidentified pod, the pod focused/), f = await start(c);
  send(f, { kind: "seal", target: c.props.regions.specimen.pod.id, ms: 2000, hold: 2000 }); at(f, 100);
  for (const k of ["right", "left", "up", "down", "confirm", "back"]) f.send({ t: "key", k }); assert.deepEqual(msgs(f).filter((m) => m.t === "focus" || m.t === "intent"), []);
  f.send({ t: "key", k: "research" }); const [m] = msgs(f).filter((x) => x.t === "intent"); assert.deepEqual([m.verb, m.screen, m.target], ["room:research", "pods", "pod"]);
  at(f, 2000); f.send({ t: "key", k: "right" }); assert.equal(msgs(f).filter((x) => x.t === "focus").length, 1, "free at the end of the hold");
});
