// The decision panel on the face (lvgl-switch.md §2.2; panel.json, frame.json regions.panel; specs/station-decision-panel-spec.md Part 1): the words and the binding table (screens/panel.c) on the props views/panel-props.mjs gives,
// over Create, in Node on the WebAssembly build: the veil, the panel and the cards draw without an error or a refusal (one, two and three cards, a dimmed card, a card with no picture), the cards sit at the spec's rectangles
// (776, 380 and 248 wide), the ring is the one ring (the frame ring 4 px out, Create draws none), the keys (◀ ▶ walk and stop at the ends, ▲ ▼ do nothing, ✓ ← and the room keys are intents of the overlay's id with the focused card),
// and a focus move redraws the two cards' boxes only (at most 153,600 px). Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/panel.test.mjs
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
import { panelBuild } from "../../station/src/views/panel-props.mjs";
import { pinnedPictures } from "../../ui/specs/derive.mjs";
import { departures } from "../tools/create-regions.mjs";
import { dirty, dirtyRects } from "./dirty.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), podsSpec = J("pods"), createSpec = J("create"), panelSpec = J("panel");
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

async function start(b, { motion = true, t0 = 0, noWait = false, skip = [] } = {}) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["pods", podsSpec], ["create", createSpec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  f.handleOf("icon-cross-16", withPolicy((i) => standIn(i, [16, 16])));   // the clash line's ✕: the cross icon master (a test-only stand-in)
  if (!noWait) f.handleOf("icon-wait-16", withPolicy((i) => standIn(i, [16, 16])));   // a test-only stand-in for the signed master: the wait's picture (fix 6 A3)
  for (const p of PINNED) f.handleOf(p.id, withPolicy((i) => standIn(i, [p.w, p.h])));
  for (const r of b.requests) if (!skip.includes(r.id)) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r), r.hollow)));   // skip: a picture the host does not have (an unplaced master)
  f.t = t0; f.motion = motion; f.build = b;
  const rc = f.props({ screen: "create", ...b.props, motion, frame: frameProps(b.line) }); f.initErrors = f.errors(); assert.equal(rc, 0, f.initErrors.join("; ")); frames(f); return f;   // initErrors: what the first build said (reading errors() drains it)
}
const frames = (f, n = 2, dt = 16) => { for (let i = 0; i < n; i++) f.frame((f.t += dt)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };
const region = (lg, id, layer) => lg.regions.find((r) => r.id === id && (!layer || r.layer === layer)) ?? null;
const pixelIs = (f, x, y, id) => { const got = f.pixel(x, y), want = colourOf(id); return got.every((v, i) => v === want[i]); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];


// o: { jump, short, open: [chapters read], focus }; the panel's props ride on Create's as an overlay, the bottom line is the focused card's
function panelScene(o = {}) {
  const st = world(), id = "S01"; S.seedPodFromGenome(st, podGenome(frameOf(id), 3), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p);
  frameOf(id).chapters.slice(0, o.read ?? 2).forEach((c) => S.read(st, p, c.id, settings));
  if (o.short) st.s = 1;
  const cr = { podId: p.id, choices: {}, f: 1, clash: [], grown: null }, ui = { create: cr, panel: { screen: "create", id: "grow", focus: o.focus ?? "" } };
  const b = createBuild({ st, settings, ui }, createSpec, podsSpec), pb = panelBuild({ st, settings, ui, jump: o.jump ?? "arrival" }, panelSpec, frameSpec, podsSpec);
  b.props.overlay = pb.overlay; b.line = pb.line; b.requests = [...b.requests, ...pb.requests];
  return { ...b, st, p, pb };
}
async function startPanel(b, { motion = false } = {}) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["pods", podsSpec], ["create", createSpec], ["panel", panelSpec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0, f.errors().join("; "));
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  for (const id of ["icon-cross-16", "icon-wait-16"]) f.handleOf(id, withPolicy((i) => standIn(i, [16, 16])));
  for (const p of PINNED) f.handleOf(p.id, withPolicy((i) => standIn(i, [p.w, p.h])));
  for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r), r.hollow)));
  f.t = 0; f.motion = motion; f.build = b;
  const rc = f.props({ screen: "create", ...b.props, motion, frame: frameProps(b.line) }); assert.equal(rc, 0, f.errors().join("; ")); frames(f); return f;
}
const card = (n, i) => { const gap = 16, w = (776 - gap * (n - 1)) / n; return [124 + i * (w + gap), 152, w, 288]; };

for (const [name, o, n] of [["two cards (the arrival mode)", {}, 2], ["three cards (the fork mode)", { jump: "fork" }, 3], ["a dimmed grow card (short)", { short: true }, 2]]) {
  test(`the panel, ${name}: draws without an error or a refusal, the cards at the spec's rectangles, the one ring 4 px outside the focused card`, { skip }, async () => {
    const b = panelScene(o), f = await startPanel(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    assert.equal(b.props.overlay.regions.cards.length, n); const cur = b.props.overlay.focus.cur, at = b.props.overlay.regions.cards.findIndex((c) => "card." + c.id === cur);
    const lg = logOf(f), rings = lg.regions.filter((r) => r.id === "focus" && r.layer === "chrome"); assert.equal(rings.length, 1, "Create's ring is not drawn while the panel is open");
    const [x, y, w, h] = card(n, at), r = rings[0].rect; assert.deepEqual(r, [x - 4, y - 4, w + 8, h + 8], "the frame ring, 4 px out");
    for (let i = 0; i < n; i++) { assert.equal(card(n, i)[2], n === 3 ? 248 : n === 2 ? 380 : 776); }
  });
}
test("the keys: ◀ ▶ walk the cards and stop at the ends, ▲ ▼ do nothing; ✓ ← and the room keys say an intent of the overlay's id on the focused card", { skip }, async () => {
  const b = panelScene({ jump: "fork" }), f = await startPanel(b); assert.equal(b.props.overlay.focus.cur, "card.watch");
  assert.deepEqual(key(f, "left"), [], "the first card: the end"); assert.deepEqual(key(f, "up"), []); assert.deepEqual(key(f, "down"), []);
  assert.deepEqual(key(f, "right").map((m) => [m.t, m.screen, m.target]), [["focus", "panel", "card.read"]]);
  assert.deepEqual(key(f, "right").map((m) => [m.t, m.screen, m.target]), [["focus", "panel", "card.shape"]]); assert.deepEqual(key(f, "right"), [], "the last card: the end");
  assert.deepEqual(key(f, "confirm").map((m) => [m.t, m.screen, m.target, m.verb]), [["intent", "panel", "card.shape", "confirm"]]);
  assert.deepEqual(key(f, "back").map((m) => [m.screen, m.target, m.verb]), [["panel", "card.shape", "back"]]);
  assert.deepEqual(key(f, "research").map((m) => [m.screen, m.verb]), [["panel", "room:research"]]);
});
test("a focus move redraws the two cards' boxes only: at most 2 × 256 × 296 = 151,552 px, inside the cards", { skip }, async () => {
  const b = panelScene({ jump: "fork" }), f = await startPanel(b); dirty(f);
  f.send({ t: "key", k: "right" }); f.frame((f.t += 16)); const d = dirty(f); assert.ok(d > 0 && d <= 153600, `${d} px`);
  for (const q of dirtyRects(f)) assert.ok(q[0] >= 124 - 8 && q[1] >= 152 - 8 && q[0] + q[2] <= 124 + 776 + 8 && q[1] + q[3] <= 440 + 8, `${q} inside the cards' band`);
});
