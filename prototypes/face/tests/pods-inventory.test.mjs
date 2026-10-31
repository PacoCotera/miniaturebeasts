// The pod inventory and the reading room on the face (the pod inventory's design, the read's design; pods.json), in Node on the WebAssembly test build: the scenes' props (the state through the rules, then
// views/pods-props.mjs) are drawn without an error or a refused node inside the object budget; no text under 13 px; the ring drawn round the whole card and never on a card off the screen; a card that
// peeks shows only its niche's rim; the keys (a direction walks pods.json's graph over the host's selectors and says `focus` on the frame of the key, ✓ and ← say `intent` on the focused target);
// ← is one press from every target of the reading room; the read's two beats on the face's clock (the shown copies from 0 to 300 ms, the hidden ones from 300 to 600, a cut with motion off).
// Skipped when the test build has not been built (build.sh).
//   node --test prototypes/face/tests/pods-inventory.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames, frameOf, podGenome } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { podsProps } from "../../station/src/views/pods-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist/node"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), spec = J("pods");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
setFrames(readdirSync(path.resolve(here, "../../workbench/frames")).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.resolve(here, "../../workbench/frames", f), "utf8"))));
S.useNameList("en-short-1");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };

// ---- scenes ----
const home = (pods) => { const st = S.freshSt("w1", 1, 1000); S.normalize(st); st.e = 20; st.d = 40; st.s = 20; for (const [sp, gs, idd, n] of pods) { const p = S.seedPodFromGenome(st, podGenome(frameOf(sp), gs), settings, 1000).pod; if (idd) S.identify(st, p, settings); frameOf(sp).chapters.filter((c) => !c.sealed).slice(0, n).forEach((c) => S.read(st, p, c.id, settings)); } return st; };
const TWELVE = [["S01", 11, 1, 2], ["S01", 12, 1, 0], ["S02", 13, 1, 1], ["S01", 14, 0, 0], ["S03", 15, 1, 8], ["S02", 16, 1, 0], ["S04", 17, 1, 0], ["S01", 18, 1, 4], ["S02", 19, 0, 0], ["S03", 20, 1, 0], ["S04", 21, 1, 2], ["S01", 22, 1, 1]];
const ui = (over = {}) => ({ view: "inventory", sort: "use", chips: [], word: null, first: 0, ...over });
const build = (st, over = {}, focus = null) => podsProps({ st, settings, docked: true, crates: 0, now: 5000, ui: ui(over), focus }, spec, frameSpec);
function scenes() {
  const out = {};
  out["no pods"] = build(home([]), {}, "sort");
  { const st = home(TWELVE); out["twelve"] = build(st, {}, "card.0"); out["the panel"] = build(st, {}, "act.0"); out["by species"] = build(st, { sort: "species" }, "card.4"); out["the tray"] = build(st, { view: "filter", chips: ["S02"] }, "tchip.2.1"); out["find"] = build(st, { view: "find", find: { letter: "L" } }, "word.0"); }
  { const st = home(Array.from({ length: 40 }, (_, i) => [["S01", "S02", "S03", "S04"][i % 4], 100 + i, i % 5 ? 1 : 0, i % 3])); out["forty, scrolled"] = build(st, { first: 5 }, "card.19"); }
  { const st = home([["S01", 51, 0, 0], ["S01", 52, 1, 0]]); S.putOnBench(st, st.tray[0]); out["a sealed pod"] = build(st, { view: "room" }, "key"); }
  { const st = home([["S01", 61, 1, 1], ["S01", 62, 1, 0]]); S.putOnBench(st, st.tray[0]); out["the rail"] = build(st, { view: "room", lane: 1 }, "rail"); out["an unread chapter open"] = build(st, { view: "room", lane: 1, at: "right" }, "key");
    out["a read chapter open"] = build(st, { view: "room", lane: 0, at: "right" }, "plate.0"); out["the read"] = build(st, { view: "room", lane: 0, at: "right", reading: { pod: st.tray[0].id, chapter: "coat", read: [], reward: 0, cost: 2 } }, "hold");
    out["the detail"] = build(st, { view: "room", lane: 0, at: "detail", trait: 0 }, "trait"); st.stampTaught = true; out["the stamp view"] = build(st, { view: "room", lane: 0, at: "stamp" }, "stamp"); }
  { const st = home([["S02", 71, 1, 3], ["S02", 72, 1, 0]]); S.putOnBench(st, st.tray[0]); out["a sealed chapter"] = build(st, { view: "room", lane: 3 }, "rail"); }
  return out;
}
const SCENES = built ? scenes() : {};
const frameProps = (line = {}) => ({ top: { screen: "pods", title: "Pods", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: "Home", need: "", ...line }, plate: { text: "" } });
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function standIn(id, [w, h]) { const dd = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { dd[i * 4] = 70 + (k & 127); dd[i * 4 + 1] = 70 + ((k >> 7) & 127); dd[i * 4 + 2] = 70 + ((k >> 14) & 127); dd[i * 4 + 3] = 255; } return { w, h, data: dd }; }
const SIZE = { "cabinet-strip-672x228": [672, 228], "pod-niche-88x88": [88, 88], "pod-niche-shadow-88x88": [88, 88], "pod-niche-husk-88x88": [88, 88], "pods-lantern-96x160": [96, 160], "pods-fern-120x200": [120, 200], "reading-bench-1024x520": [1024, 520] };
const sizeOf = (r) => SIZE[r.id] ?? (r.kind === "readchamber" ? [548, 356] : r.kind === "readrail" ? (r.small ? [272, 40] : [526, 71]) : r.kind === "readdisc" ? [r.d + 8, r.d + 8] : r.kind === "emblem" ? [24, 24] : r.kind === "star" ? [12, 12] : Array.isArray(r.size) ? r.size : r.size ? [r.size, r.size] : [16, 16]);   // a crop is its size
async function start(b, { motion = true } = {}) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["pods", spec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0, f.errors().join("; "));
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  for (const id of ["frame-companion-outline-16x24", "frame-companion-solid-16x24", "home-lamp-hairline-12x12", "home-lamp-sprout-12x12"]) f.handleOf(id, withPolicy((i) => standIn(i, id.includes("companion") ? [16, 24] : [12, 12])));
  f.t = 1000; f.motion = motion; show(f, b); return f;
}
const show = (f, b) => { for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r)))); assert.equal(f.props({ screen: "pods", ...b.props, motion: f.motion, frame: frameProps(b.line) }), 0, f.errors().join("; ")); frames(f); };
const frames = (f, n = 2, dt = 16) => { for (let i = 0; i < n; i++) f.frame((f.t += dt)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg ?? f.lastLog ?? null; };
const said = (f) => { const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };

test("every scene draws without an error or a refused node, inside the object budget, and no text under 13 px", { skip }, async () => {
  for (const [name, b] of Object.entries(SCENES)) {
    const f = await start(b), lg = logOf(f);
    if (process.env.DBG) console.log(name, JSON.stringify({ errors: f.errors(), refused: lg?.refused, fr: f.refused(), objects: lg?.objects }));
    assert.deepEqual(f.errors(), [], name); assert.ok(lg, name + ": a log");
    assert.equal(f.refused(), 0, name + ": refused nodes"); assert.ok((lg.objects ?? lg.nodes?.length ?? 0) < 1024, name + ": the object budget");
    for (const t of lg.type ?? []) assert.ok((t.px % 1000) >= 13, `${name}: ${t.text} at ${t.px} px`);
  }
});
test("the ring goes round the whole card, never its niche; a card off the screen wears no ring until it scrolls in", { skip }, async () => {
  const b = SCENES["twelve"], f = await start(b), lg = logOf(f), ring = (lg.nodes ?? []).filter((n) => n[3] === "focus").map((n) => ({ rect: n.slice(4, 8) }));
  assert.ok(ring.length, "a ring"); const box = ring.reduce((a, n) => [Math.min(a[0], n.rect[0]), Math.min(a[1], n.rect[1]), Math.max(a[2], n.rect[0] + n.rect[2]), Math.max(a[3], n.rect[1] + n.rect[3])], [9999, 9999, 0, 0]);
  assert.ok(box[0] <= 16 && box[1] <= 92 && box[2] >= 16 + 216 && box[3] >= 92 + 196, "outside the card's 216 x 196: " + box);
  const far = build(home(TWELVE), {}, "card.9"); far.props.focus.cur = "card.9"; far.props.regions.inv.cabinet.cards = far.props.regions.inv.cabinet.cards.map((c) => c.k === 9 ? { ...c, row: 3 } : c);
  const g = await start(far); if (process.env.DBG) console.log(JSON.stringify((logOf(g).nodes ?? []).filter((n) => n[3] === "focus")), far.props.focus.cur, JSON.stringify(far.props.regions.inv.cabinet.cards.map((c) => [c.k, c.row, c.col])));
  assert.equal((logOf(g).nodes ?? []).filter((n) => n[3] === "focus").length, 0, "no ring on a card below the screen");
});
test("the keys: ▶ from the right-hand column goes to the panel's first button, ◀ back to its card, ▲ from the top row to the tool above; ✓ and ← are intents on the focused target", { skip }, async () => {
  const st = home(TWELVE), first = build(st, {}, "card.2"), f = await start(first), on = { panelPod: first.panelPod };
  f.key("right"); let m = said(f); assert.deepEqual(m.map((x) => [x.t, x.target]), [["focus", "act.0"]]);
  show(f, build(st, on, "act.0")); f.key("down"); m = said(f); assert.deepEqual(m.map((x) => x.target), ["act.1"]);
  show(f, build(st, on, "act.1")); f.key("left"); m = said(f); assert.deepEqual(m.map((x) => x.target), ["card.2"], "the card the panel shows");
  show(f, build(st, {}, "card.1")); f.key("up"); m = said(f); assert.deepEqual(m.map((x) => x.target), ["filter"]);
  show(f, build(st, {}, "card.0")); f.key("left"); assert.deepEqual(said(f), [], "the left edge: the ring stays, nothing said");
  f.key("confirm"); m = said(f); assert.deepEqual(m.map((x) => [x.t, x.target, x.verb]), [["intent", "card.0", "confirm"]]);
  f.key("back"); m = said(f); assert.deepEqual(m.map((x) => [x.t, x.verb]), [["intent", "back"]]);
});
test("← is one press from every target of the reading screen: each says back on its target, and nothing else", { skip }, async () => {
  for (const name of ["the rail", "a read chapter open", "the detail", "the stamp view"]) { const b = SCENES[name], f = await start(b);
    for (const t of b.props.focus.targets) { const c = JSON.parse(JSON.stringify(b)); c.props.focus.cur = t.id; show(f, c); said(f); f.key("back"); const m = said(f); assert.deepEqual(m.map((x) => [x.t, x.target, x.verb]), [["intent", t.id, "back"]], name + ": " + t.id); } }
});
test("the read on the face's clock (ux-reading-v2.md §2.6, 4): the chamber after the read in a clip that rides the sweep, the lane's tags filling in their clip, the lamp lit; at 800 the screen whole; with motion off a cut", { skip }, async () => {
  const b = SCENES["the read"], f = await start(b), box = (id) => f.nodeBox(id)?.box ?? null;
  f.send({ t: "event", kind: "read", target: "read", ms: 800, hold: 0, cut: true }); f.frame((f.t += 1));
  f.frame((f.t += 299)); const c1 = box("read.chamber.clip"); assert.ok(c1 && c1[2] > 200 && c1[2] < 300, "the sweep about half across at 300 ms: " + c1); assert.ok(box("read.sweep"), "the warm bar drawn"); assert.ok(box("read.lamp")?.[2] > 0, "the lamp lit"); assert.ok(box("read.fill.0"), "the shown copies fill");
  f.frame((f.t += 600)); assert.equal(box("read.chamber.clip"), null, "at its end the chamber whole, the clip gone"); assert.equal(box("read.lamp"), null, "the lamp out");
  const g = await start(b, { motion: false }); g.send({ t: "event", kind: "read", target: "read", ms: 800, hold: 0, cut: true }); g.frame((g.t += 1)); assert.equal(g.nodeBox("read.chamber.clip")?.box ?? null, null, "a cut with motion off");
  assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
});
test("the 200 ms scroll: the cabinet's wipe from the old first row to the new draws the rows a pitch back at its start, easing to their place in whole pixels, the ring riding with its card; a cut with motion off", { skip }, async () => {
  const b = SCENES["forty, scrolled"], k = b.props.regions.inv.cabinet.cards.find((c) => c.row === 0 && c.col === 0 && !c.husk).k, id = `card.${k}.pod`, pitch = spec.regions.inventory.cabinet.card.pitch[1];
  const f = await start(b), y = () => { const n = f.nodeBox(id)?.box, c = f.nodeBox("cab.clip")?.box; return n ? n[1] + (c && c[3] > 0 ? c[1] : 0) : null; }, y0 = y(); assert.ok(y0 != null, "the card's pod is drawn");   // while the scroll plays the rows are held in the cabinet's clip, placed from its corner
  f.send({ t: "event", kind: "wipe", target: "cabinet", ms: 200, hold: 0, from: 4, to: 5 }); f.frame((f.t += 1));
  assert.ok(Math.abs(y() - (y0 + pitch)) <= 2, `at the start the row stands a pitch lower: ${y()} for ${y0 + pitch}`);
  f.frame((f.t += 100)); assert.ok(y() > y0 && y() < y0 + pitch, "halfway it is between"); f.frame((f.t += 150)); frames(f); assert.equal(y(), y0, "at the end in its place");
  assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
  const g = await start(b, { motion: false }); g.send({ t: "event", kind: "wipe", target: "cabinet", ms: 200, hold: 0, from: 4, to: 5 }); g.frame((g.t += 1)); assert.equal(g.nodeBox(id)?.box?.[1], y0, "a cut with motion off");
});
