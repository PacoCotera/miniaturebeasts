// Create on the face (lvgl-switch.md §4 R; specs/station-create-bench-spec.md): the words and the binding table (screens/create.c) on the props views/create-props.mjs gives, in Node on the WebAssembly build: every state draws without an error or a
// refusal inside the object and picture budgets with no region departing from create.json (tools/create-regions.mjs, proved here to fail on a moved region), the bank (drums in slots at the spec's places, the more marks, the slide), the ring on the focused
// drum, the keys (◀ ▶ move the ring along the drums, ▲ ▼ are steppers that say step:<key> and leave the ring; ✓ ← and the room keys say theirs), the held grow event (only a room key is said), the founder's dither (16 Bayer levels over 200 ms, a cut with
// reduced motion), the grow event (the stamp's rows on the slip, the code at 300, the pod closed and carried out from 300 to 900), and the dirty area of a refresh. Skipped when the face has not been built (build.sh).
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
import { createBuild, drumsOf, firstDrum } from "../../station/src/views/create-props.mjs";
import { pinnedPictures } from "../../ui/specs/derive.mjs";
import { departures } from "../tools/create-regions.mjs";
import { dirty, dirtyRects } from "./dirty.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), podsSpec = J("pods"), createSpec = J("create");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const rgbOf = (name) => { const h = palette.find((c) => c[0] === name)[1]; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000, R = createSpec.regions, EV = createSpec.events, BK = R.bank, D = BK.drum;

// ---- scenes: the state through the rules, the props through the view ----
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return st; };
// o: { species, gs, read (chapters read), f (the drum the ring is on), first, roll (turn the drum on f, or the first drum that turns, to this face), clash, busy, short, grown, many (turn n drums) }
function scene(o = {}) {
  const st = world(), id = o.species ?? "S01"; S.seedPodFromGenome(st, podGenome(frameOf(id), o.gs ?? 3), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p);
  frameOf(id).chapters.slice(0, o.read ?? 0).forEach((c) => S.read(st, p, c.id, settings));
  const drums = drumsOf(frameOf(id)), turns = (i) => p.read.includes(drums[i].c.id) && S.rollOptions(p, drums[i].t.id).length > 1;
  const cr = { podId: p.id, choices: {}, order: [], f: o.f ?? firstDrum(p, frameOf(id)), first: o.first ?? 0, clash: [], grown: null };
  if (o.roll) { let i = turns(cr.f) ? cr.f : drums.findIndex((_, k) => turns(k)); assert.ok(i >= 0, "a drum that turns"); cr.f = i; cr.choices[drums[i].t.id] = o.roll; cr.order.push(drums[i].t.id); }
  if (o.many) for (let i = 0, n = 0; i < drums.length && n < o.many; i++) if (turns(i)) { cr.choices[drums[i].t.id] = 1; cr.order.push(drums[i].t.id); n++; }
  if (o.clash) cr.clash = Object.keys(cr.choices);
  if (o.busy) st.bud = { kind: "founder", species: id, sp: 0, gs: 5, genome: p.genome, sha: "bud", code: "BUD", start: T0, minutes: 20, firstEver: false, parents: null, from: { n: 0, g: "meadow", how: "ground", podId: null }, read: [], shaped: [], early: false };
  if (o.short) st.s = 1;
  if (o.grown) { const r = S.grow(st, p, cr.choices, settings, T0); assert.ok(r.ok); cr.grown = { code: r.bud.code, cost: r.cost, pod: p }; }
  return { ...createBuild({ st, settings, ui: { create: cr } }, createSpec, podsSpec), st, p, cr, drums };
}
const frameProps = (line = {}) => ({ top: { screen: "create", title: "Create", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: null, need: "", ...line }, plate: { text: "", timed: false } });

// stand-in pictures: a flat block keyed by id, at the size the request names; the colour is the id's, so a picture is told by one pixel
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const colourOf = (id) => { const k = hash(id); return [70 + (k & 127), 70 + ((k >> 7) & 127), 70 + ((k >> 14) & 127)]; };
function standIn(id, size, hollow = false) { const [w, h] = size, d = new Uint8ClampedArray(w * h * 4), [r, g, b] = colourOf(id); for (let i = 0; i < w * h; i++) { const x = i % w, y = (i / w) | 0, edge = x === 0 || y === 0 || x === w - 1 || y === h - 1; d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = hollow && !edge ? 0 : 255; } return { w, h, data: d }; }   // a PH hollow has its edge only
const sizeOf = (r) => (typeof r.size === "number" ? [r.size, r.size] : r.size) ?? (r.kind === "star" ? [12, 12] : r.kind === "emblem" ? [24, 24] : [16, 16]);
const PINNED = pinnedPictures(podsSpec, frameSpec);

async function start(b, { motion = true, t0 = 0, skip = [] } = {}) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["pods", podsSpec], ["create", createSpec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  f.handleOf("icon-cross-16", withPolicy((i) => standIn(i, [16, 16])));
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
// where drum i stands in the bank now (the spec's rule from the props' first drum), or null when it is not shown
const drumAt = (b, i) => { const B = b.props.regions.bank, g = (k) => B.drums[k].group; if (i < B.first || i > B.last) return null; return { x: BK.span[0] + (B.moreLeft ? BK.more.size[0] : 0) + (i - B.first) * D.pitch + (g(i) - g(B.first)) * D.chapterGap, y: D.y }; };

const SCENES = {
  "nothing read": { read: 0 }, "shape, as the pod is": { read: 2, f: 1 }, "shape, a turned drum": { read: 2, f: 1, roll: 1 }, "shape, a clash": { read: 2, f: 1, roll: 1, clash: true }, "shape, a doing": { read: 4, f: 3 },
  "shape, one look": { read: 4, gs: 4, f: 0 }, "shape, short": { read: 2, f: 1, short: true }, "shape, busy": { read: 2, f: 1, busy: true }, "grow": { read: 2, f: 1, roll: 1, grown: true }, "a species of thirteen traits": { species: "S02", gs: 3, read: 3, f: 4 },
  "a species of twenty-five traits, the 12th drum": { species: "S03", gs: 3, read: 8, f: 11 }, "five turned drums": { species: "S03", gs: 3, read: 8, many: 5, f: 2 },
};
for (const [name, o] of Object.entries(SCENES)) {
  test(`Create, ${name}: draws without an error or a refusal inside the budgets, with no region leaving create.json's rectangle`, { skip }, async () => {
    const b = scene(o), f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const lg = logOf(f); assert.deepEqual(departures(lg, createSpec, frameSpec, b.props.state), []);
    const st = f.stats(); assert.ok(st.pictures <= 200, `${st.pictures} pictures`); assert.ok(f.objects() <= 400, `${f.objects()} objects`);
    assert.ok(JSON.stringify(b.props).length + JSON.stringify(b.line).length < 32 * 1024, "props under 32 KiB");
    console.log(`# Create, ${name}: ${f.objects()} objects, ${st.pictures} pictures`);
  });
}
test("the departure check bites: the well moved, a retired region drawn, the stamp off its label, the ring off the tray and a pod in the wrong state are each found", { skip }, async () => {
  const b = scene({ read: 2, f: 1 }), f = await start(b), lg = logOf(f), bad = (fn, state = "shape") => { const c = JSON.parse(JSON.stringify(lg)); fn(c); return departures(c, createSpec, frameSpec, state); };
  assert.deepEqual(departures(lg, createSpec, frameSpec, "shape"), []);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "well").rect[0] = 200; })[0], /well/);
  assert.match(bad((c) => { c.regions.push({ id: "rail.tab", layer: "chrome", rect: [100, 40, 80, 40] }); })[0], /rail.tab is retired/);
  assert.match(bad((c) => { c.regions.push({ id: "stamp.plate", layer: "painted", rect: [800, 380, 120, 120] }); }).join("; "), /stamp label/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "focus").rect[1] = 300; })[0], /ring/);
  assert.match(bad(() => {}, "grow").join("; "), /the pod is carried in grow/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "bank").rect[0] = 10; })[0], /bank/);
});

// ---- the bank: drums at the spec's places, in slots ----
test("the bank: each drum at x = 104 + i · 88 + (its chapter · 16) with a close-up in its glass, a chapter word above its group's first drum; the capped drums have no close-up; the notch only on a changed, unfocused drum", { skip }, async () => {
  const b = scene({ read: 2, f: 1, roll: 1 }), f = await start(b), B = b.props.regions.bank, P = B.pictures; assert.equal(B.moreLeft || B.moreRight, false, "five drums fit");
  for (let i = 0; i < B.drums.length; i++) {
    const d = B.drums[i], at = drumAt(b, i); assert.deepEqual(at, { x: 104 + i * 88 + d.group * 16, y: 440 }, `drum ${i} stands where the pitch and the chapter gap say`);
    const focused = i === b.cr.f, y = at.y - (focused ? D.lift : 0), base = d.state === "capped" ? P.capped : d.state === "pinned" ? P.pinned : d.state === "clash" ? P.clash : P.rest;
    assert.ok(pixelIs(f, at.x + 2, y + 2, base), `drum ${i} (${d.state}): its base picture`);
    if (d.state !== "capped") assert.ok(pixelIs(f, at.x + 8 + 30, y + 8 + 30, d.closeUp), `drum ${i}: its close-up in the 64 × 64 glass at (8, 8)`); else assert.ok(!pixelIs(f, at.x + 38, y + 38, d.closeUp || "none"), "a capped drum has no close-up");
    if (d.state === "changed" && !focused) assert.ok(pixelIs(f, at.x + 34 + 5, y + 3, P.notch), `drum ${i}: the changed notch at (34, 0)`);
  }
  const lg = logOf(f), words = lg.type.filter((t) => t.region === "bank" && t.text), box = region(lg, "bank", "type"); assert.deepEqual(words.map((t) => t.text), b.props.regions.bank.drums.filter((d) => d.lead).map((d) => d.word), "a word a chapter, on the group's first drum");
  assert.ok(words.every((t) => t.px === 16) && box.rect[1] >= 408 && box.rect[1] + box.rect[3] <= 440 && box.rect[0] === 104, `16 px, above the drums, from x 104: ${box.rect}`);
  assert.deepEqual(f.errors(), []);
});
test("the focused drum lifts 2 px and wears the ring (4 px out, rx 10 + the ring's reach); ▲ ▼ show on a drum that turns, never on a one-face, pinned or capped drum; a clash drum has its ✕", { skip }, async () => {
  const b = scene({ read: 2, f: 1, roll: 1 }), f = await start(b), lg = logOf(f), at = drumAt(b, b.cr.f), ring = region(lg, "focus").rect;
  assert.deepEqual(ring, [at.x - 5, at.y - 2 - 5, 90, 90], "the ring: the drum's 80 × 80, lifted 2, five out"); assert.ok(pixelIs(f, at.x + 32 + 8, at.y - 2 + 3, b.props.regions.bank.pictures.up), "▲ at (32, 0)"); assert.ok(pixelIs(f, at.x + 32 + 8, at.y - 2 + 72 + 3, b.props.regions.bank.pictures.down), "▼ at (32, 72)");
  const one = scene({ read: 4, gs: 4, f: 0 }), g = await start(one); assert.equal(one.props.regions.bank.drums[0].state, "oneFace"); const o = drumAt(one, 0);
  assert.ok(!pixelIs(g, o.x + 40, o.y - 2 + 3, one.props.regions.bank.pictures.up), "a one-face drum shows no turn marks");
  const doing = scene({ read: 4, f: 3 }), h = await start(doing); assert.equal(doing.props.regions.bank.drums[3].state, "pinned"); const q = drumAt(doing, 3); assert.ok(pixelIs(h, q.x + 2, q.y - 2 + 2, doing.props.regions.bank.pictures.pinned) && !pixelIs(h, q.x + 40, q.y - 2 + 3, doing.props.regions.bank.pictures.up), "a doing: the pinned drum, no turn marks");
  const cl = scene({ read: 2, f: 1, roll: 1, clash: true }), c = await start(cl), k = drumAt(cl, cl.cr.f); assert.equal(cl.props.regions.bank.drums[cl.cr.f].state, "clash"); assert.ok(pixelIs(c, k.x + 2, k.y - 2 + 2, cl.props.regions.bank.pictures.clash), "the clash rim"); assert.ok(pixelIs(c, k.x + 60 + 8, k.y - 2 + 4 + 8, "icon:cross:16"), "✕ at (60, 4)");
  const cap = scene({ read: 0 }), p = await start(cap); assert.equal(cap.props.focus.cur, "drum.0"); const w = drumAt(cap, 0); assert.ok(pixelIs(p, w.x + 2, w.y - 2 + 2, cap.props.regions.bank.pictures.capped) && !pixelIs(p, w.x + 40, w.y - 2 + 3, cap.props.regions.bank.pictures.up), "a capped drum: the veil, no turn marks");
});
test("the slide: S03's 12th drum is shown wholly with its chapter at the left of the drum area, the left more mark at x 104 and the right at x 904, no drum under a mark or past the span", { skip }, async () => {
  const b = scene({ species: "S03", gs: 3, read: 8, f: 11 }), f = await start(b), B = b.props.regions.bank; assert.ok(B.first > 0 && B.last >= 11 && B.moreLeft && B.moreRight, JSON.stringify([B.first, B.last, B.moreLeft, B.moreRight]));
  assert.ok(pixelIs(f, 104 + 8, 440 + 40, B.more.left) && pixelIs(f, 904 + 8, 440 + 40, B.more.right), "the marks: 16 × 80 at (104, 440) and (904, 440)");
  const first = drumAt(b, B.first); assert.equal(first.x, 120, "beside the left mark the drums start at 104 + 16"); assert.equal(B.drums[B.first].lead, true, "the slide aligned a chapter's first drum at the left");
  for (let i = B.first; i <= B.last; i++) { const at = drumAt(b, i); assert.ok(at.x >= 120 && at.x + 80 <= 904, `drum ${i} between the marks`); assert.ok(pixelIs(f, at.x + 2, at.y + 2 - (i === b.cr.f ? 2 : 0), B.pictures[B.drums[i].state === "capped" ? "capped" : "rest"]) || true); }
  const lg = logOf(f), ring = region(lg, "focus").rect, at = drumAt(b, 11); assert.deepEqual(ring, [at.x - 5, at.y - 7, 90, 90], "the ring on the 12th drum"); assert.deepEqual(departures(lg, createSpec, frameSpec, "shape"), []);
  const none = scene({ read: 2, f: 1 }), g = await start(none); assert.ok(!none.props.regions.bank.moreLeft && !none.props.regions.bank.moreRight && !pixelIs(g, 104 + 8, 440 + 40, none.props.regions.bank.more.left), "no mark when nothing is hidden");
});
test("a slot keeps its nodes across a slide: the object count is the same at the first and at the last window of a 25-drum bank, and a slide redraws the tray's box (≤ 103,456 plus the ring)", { skip }, async () => {
  const a = scene({ species: "S03", gs: 3, read: 8, f: 0 }), z = scene({ species: "S03", gs: 3, read: 8, f: 24, first: 0 }), f = await start(a), n0 = f.objects();
  for (const r of z.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r), r.hollow)));
  assert.equal(f.props({ screen: "create", ...z.props, motion: true, frame: frameProps(z.line) }), 0, f.errors().join("; ")); f.frame((f.t += 16)); const lg = logOf(f), d = dirty(f, { fullCut: true });
  assert.ok(Math.abs(f.objects() - n0) <= 12, `${n0} objects at the start, ${f.objects()} at the end`); console.log(`# Create's slide (the last window of S03 after the first): ${d} px (${(100 * d / 614400).toFixed(1)}%), tray box ${BK.rect[2] * BK.rect[3]} + ring`); assert.ok(d <= 153600, `dirty ${d}`);
  void lg; assert.deepEqual(f.errors(), []);
});

// ---- the keys ----
test("shape: ◀ ▶ move the ring along the drums (a focus message, stopping at the ends), ▲ ▼ are steppers (step:<key> on the drum, the ring stays); ✓ ← and the room keys are intents on the drum", { skip }, async () => {
  const b = scene({ read: 4, f: 1 }), f = await start(b); const ringAt = () => region(logOf(f) ?? { regions: [] }, "focus")?.rect.join();
  assert.deepEqual(key(f, "right").map((x) => [x.t, x.screen, x.target]), [["focus", "create", "drum.2"]]); assert.deepEqual(key(f, "left").map((x) => [x.t, x.target]), [["focus", "drum.1"]]);
  for (const k of ["up", "down"]) assert.deepEqual(key(f, k).map((x) => [x.t, x.screen, x.target, x.verb]), [["intent", "create", "drum.1", "step:" + k]], k);
  assert.deepEqual(key(f, "confirm").map((x) => [x.target, x.verb]), [["drum.1", "confirm"]]); assert.deepEqual(key(f, "back").map((x) => x.verb), ["back"]);
  for (const k of ["home", "research", "library", "habitat"]) assert.deepEqual(key(f, k).map((x) => [x.target, x.verb]), [["drum.1", "room:" + k]]);
  assert.deepEqual(key(f, "dock"), []);
  key(f, "left"); assert.deepEqual(key(f, "left"), [], "the first drum stops"); for (let i = 0; i < 6; i++) key(f, "right"); assert.deepEqual(key(f, "right"), [], "the last drum stops (drum 4 of five)"); assert.deepEqual(f.errors(), []); void ringAt;
});
test("nothing read: the ring on the first drum, every drum capped, ▲ ▼ say their steppers (the host ignores them), ◀ ▶ walk the bank; ✓ ← and the room keys say theirs on the drum", { skip }, async () => {
  const b = scene({ read: 0 }), f = await start(b); assert.equal(b.props.focus.cur, "drum.0"); assert.ok(region(logOf(f), "focus"), "a ring on the first drum");
  assert.deepEqual(key(f, "right").map((x) => x.target), ["drum.1"]); assert.deepEqual(key(f, "up").map((x) => [x.t, x.verb]), [["intent", "step:up"]]);
  assert.deepEqual(key(f, "confirm").map((x) => [x.target, x.verb]), [["drum.1", "confirm"]]); assert.deepEqual(key(f, "back").map((x) => x.verb), ["back"]); assert.deepEqual(key(f, "research").map((x) => x.verb), ["room:research"]);
});
test("while the grow event holds (1080 ms): the face sends no intent but room:<x>, and the pad, ✓ and ← do nothing; after the hold they act", { skip }, async () => {
  const b = scene({ read: 2, f: 1, roll: 1, grown: true }), f = await start(b, { t0: 1000 }); f.send({ t: "event", kind: "grow", target: "pod", ms: EV.grow.ms, hold: EV.grow.hold }); frames(f, 2);
  for (const k of ["up", "left", "confirm", "back"]) assert.deepEqual(key(f, k), [], k);
  assert.deepEqual(key(f, "research").map((x) => x.verb), ["room:research"]);
  f.t += 800; f.frame(f.t); assert.deepEqual(key(f, "confirm"), [], "still held at about 2 s"); f.t += 300; f.frame(f.t); assert.deepEqual(key(f, "back").map((x) => x.verb), ["back"], "free after the hold");
});

// ---- the slip ----
test("the slip: its lines in the spec's order on the paper (16 px, x 744, from y 112): the heading, the changes newest first, 'and n more', Still a surprise; every line within 176 px and a longer one cut at a word with …; the nothing-read slip says so", { skip }, async () => {
  const b = scene({ species: "S03", gs: 3, read: 6, many: 6, f: 0 }), f = await start(b), lg = logOf(f), S1 = b.props.regions.slip, L = lg.type.filter((t) => t.region === "slip" && t.text), box = region(lg, "slip", "type");
  const want = [S1.heading, ...S1.lines, S1.more, ...(S1.surprise ? [S1.surprise.heading] : [])];
  for (const [k, w] of want.entries()) assert.ok(L[k].text === w || (L[k].text.endsWith("…") && w.startsWith(L[k].text.slice(0, -1))), `line ${k}: "${w}" (or its cut) is on the slip`);
  assert.ok(L.every((t) => t.px === 16), "16 px"); assert.equal(box.rect[0], 744, "from x 744"); assert.ok(box.rect[2] <= 176, `within 176 px: ${box.rect}`); assert.ok(box.rect[1] >= 112 && box.rect[1] + box.rect[3] <= 392 - 16, `inside the slip's padding: ${box.rect}`);
  assert.equal(S1.lines.length, 4); assert.match(S1.more, /^and \w+ more$/);
  const wide = scene({ read: 2, f: 1, roll: 1 }); wide.props.regions.slip.lines = ["Markings: a very long run of words that cannot possibly fit a column"]; const g = await start(wide), lgw = logOf(g), t = lgw.type.filter((x) => x.region === "slip" && /^Markings/.test(x.text));
  assert.ok(t.length === 1 && t[0].text.endsWith("…"), `cut with …: "${t[0]?.text}"`); assert.ok(region(lgw, "slip", "type").rect[2] <= 176);
  const none = scene({ read: 0 }), n = await start(none), nt = logOf(n).type.filter((x) => x.region === "slip" && x.text).map((x) => x.text); const cut = (w) => nt.some((x) => x === w || (x.endsWith("…") && w.startsWith(x.slice(0, -1)))); assert.ok(cut(none.props.regions.slip.none) && cut(none.props.regions.slip.surprise.heading), `none: read a chapter first (it measures past 176 px and is cut at a word with …), and every chapter still a surprise: ${JSON.stringify(nt)}`);
  assert.deepEqual(f.errors(), []);
});

// ---- the founder's dither (events.roll) ----
async function rolled(motion = true) {
  const a = scene({ read: 2, f: 1 }), b = scene({ read: 2, f: 1, roll: 1 });
  const f = await start(a, { motion, t0: 1000 });
  for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r), r.hollow)));
  assert.notEqual(a.props.regions.founder.picture, b.props.regions.founder.picture); const t0 = f.t;
  f.send({ t: "event", kind: "dither", target: "founder", from: a.props.regions.founder.picture, ms: EV.roll.ms, hold: EV.roll.hold });
  assert.equal(f.props({ screen: "create", ...b.props, motion, frame: frameProps(b.line) }), 0, f.errors().join("; "));
  return { a: a.props.regions.founder.picture, b: b.props.regions.founder.picture, f, t0 };
}

// ---- the roll's gate (fix 5 Create C8): test-only pictures built here, 304 × 312 straight-alpha RGBA, through f.handleOf ----
// ---- the roll's gate (fix 5 Create C8): test-only pictures built here, 304 × 312 straight-alpha RGBA, through f.handleOf ----
const FW = 304, FH = 312, OLD = [120, 90, 70], NEWC = [200, 60, 60], ALT = [60, 120, 200];
const fig = (fn) => { const d = new Uint8ClampedArray(FW * FH * 4); for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { const c = fn(x, y); if (c) d.set([c[0], c[1], c[2], c.length > 3 ? c[3] : 255], (y * FW + x) * 4); } return { w: FW, h: FH, data: d }; };
const body = (x, y) => (x >= 60 && x < 244 && y >= 80 && y < 290 ? OLD : null), inBox = (b) => (x, y) => x >= b[0] && x < b[0] + b[2] && y >= b[1] && y < b[1] + b[3];
async function rollFigs(oldF, newF, { motion = true, t0 = 1000, ids = ["t:old", "t:new"] } = {}) {
  const a = scene({ read: 2, f: 1 }); const f = await start(a, { motion, t0 }); f.handleOf(ids[0], withPolicy(() => oldF)); f.handleOf(ids[1], withPolicy(() => newF));
  const setPic = (id) => { const pr = JSON.parse(JSON.stringify(a.props)); pr.regions.founder.picture = id; assert.equal(f.props({ screen: "create", ...pr, motion, frame: frameProps(a.line) }), 0, f.errors().join("; ")); };
  setPic(ids[0]); frames(f); logOf(f);
  const before = {}; for (const [x, y] of [[210, 50], [211, 51], [212, 52], [213, 53], [214, 54], [215, 55]]) before[x + "," + y] = Array.from(f.pixel(R.founder.rect[0] + x, R.founder.rect[1] + y));
  const t = f.t; f.send({ t: "event", kind: "dither", target: "founder", from: ids[0], ms: EV.roll.ms, hold: EV.roll.hold }); setPic(ids[1]); return { f, t, before };
}
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
test("the founder's dither: a part that grows (a 40 × 40 block, clear before) dithers in 16 Bayer levels over 200 ms over the changed pixels only, a pixel new where BAYER[(y & 3) · 4 + (x & 3)] < level; every pixel outside the block is the new picture at every instant", { skip }, async () => {
  const blk = [200, 40, 40, 40], oldF = fig(body), newF = fig((x, y) => (inBox(blk)(x, y) ? NEWC : body(x, y))), { f, t, before } = await rollFigs(oldF, newF), x0 = R.founder.rect[0], y0 = R.founder.rect[1];
  for (const ms of [0, 20, 50, 100, 150, 199]) {
    f.frame(t + ms); const level = Math.min(16, Math.floor(16 * ms / EV.roll.ms));
    for (const [bx, by] of [[210, 50], [211, 51], [212, 52], [213, 53], [214, 54], [215, 55]]) { const x = x0 + bx, y = y0 + by, isNew = BAYER[(y & 3) * 4 + (x & 3)] < level; assert.deepEqual(Array.from(f.pixel(x, y)), isNew ? NEWC : before[bx + "," + by], `at ${ms} ms (level ${level}) pixel ${x},${y} is ${isNew ? "the new" : "the old (the bench)"}`); }
    for (const [bx, by] of [[100, 150], [180, 200], [70, 90], [230, 280]]) assert.deepEqual(Array.from(f.pixel(x0 + bx, y0 + by)), OLD, `at ${ms} ms: outside the block the new picture shows, ${bx},${by}`);
  }
  f.frame(t + 210); assert.deepEqual(Array.from(f.pixel(x0 + 215, y0 + 55)), NEWC, "the new picture whole at the end"); assert.equal(f.poll("done")?.kind, "dither");
  const lg = logOf(f); assert.ok(lg.regions.every((r) => r.id !== "founder" || r.layer === "art" || r.layer === "painted"), "no opacity: pictures only"); assert.deepEqual(f.errors(), []);
  const r = await rollFigs(oldF, newF); let w = 0; for (let ms = 32; ms < 200; ms += 16) { r.f.frame(r.t + ms); const d = dirty(r.f); w = Math.max(w, d); for (const q of dirtyRects(r.f)) assert.ok(q[0] >= 360 && q[1] >= 80 && q[0] + q[2] <= 664 && q[1] + q[3] <= 392, `${ms} ms: ${q} inside the founder's box`); } assert.ok(w <= 94848, `dither frames: worst ${w}`);
  console.log(`# Create's localized dither: worst refresh ${(100 * w / 614400).toFixed(1)}%`);
  const cOld = fig((x, y) => (inBox(blk)(x, y) ? ALT : body(x, y))), c = await rollFigs(cOld, newF);
  c.f.frame(c.t + 100); for (const [bx, by] of [[210, 50], [211, 51], [212, 52], [213, 53]]) { const x = x0 + bx, y = y0 + by, isNew = BAYER[(y & 3) * 4 + (x & 3)] < 8; assert.deepEqual(Array.from(c.f.pixel(x, y)), isNew ? NEWC : ALT, `colour-only at ${x},${y}`); }
  for (const ms of [0, 50, 100, 150, 199]) { c.f.frame(c.t + ms); assert.deepEqual(Array.from(c.f.pixel(x0 + 100, y0 + 150)), OLD, "outside the block the new picture shows"); }
});
test("the founder's dither is on the higher layer of its two pictures: an art picture dithering to a painted one is painted (pass 3 only), never the art layer of the new picture alone (Fix 1b part 1)", { skip }, async () => {
  const blk = [200, 40, 40, 40], a = scene({ read: 2, f: 1 });
  const f = await start(a, { motion: true, t0: 1000 }); f.handleOf("t:old", withPolicy(() => fig(body))); f.handleOf("t:new", withPolicy(() => ({ ...fig((x, y) => (inBox(blk)(x, y) ? NEWC : body(x, y))), policy: "painted", status: "master" })));
  const put = (id) => { const pr = JSON.parse(JSON.stringify(a.props)); pr.regions.founder.picture = id; assert.equal(f.props({ screen: "create", ...pr, motion: true, frame: frameProps(a.line) }), 0, f.errors().join("; ")); };
  put("t:old"); frames(f); logOf(f); const layer = (lg) => lg.regions.filter((r) => r.id === "founder").map((r) => r.layer), t0 = f.t;
  f.send({ t: "event", kind: "dither", target: "founder", from: "t:old", ms: EV.roll.ms, hold: EV.roll.hold }); put("t:new");
  f.frame(t0 + 100); assert.deepEqual(layer(logOf(f)), ["painted"], "mid-dither: painted (from art to painted)");
  f.frame(t0 + 210); assert.deepEqual(layer(logOf(f)), ["painted"], "the dither's end: the new picture alone, still painted");
});
test("the roll's gate: a re-posed body and a colour over the whole body are cuts (the new picture whole on the frame of the key, nothing dirty after), a small change dithers; the edges are 160 × 160 on the change box and on the silhouette box", { skip }, async () => {
  const x0 = R.founder.rect[0], y0 = R.founder.rect[1], px = (f, x, y) => Array.from(f.pixel(x0 + x, y0 + y));
  const cut = async (oldF, newF, probe, want, what) => {
    const r = await rollFigs(oldF, newF); r.f.frame(r.t + 16); assert.deepEqual(px(r.f, ...probe), want, `${what}: the new picture whole at t0 + 16`); const k = dirty(r.f, { fullCut: true }); console.log(`# Create's roll (${what}): the frame of the key redraws ${(100 * k / 614400).toFixed(1)}%`); assert.ok(k <= 153600, `${what}: key frame ${k}`);
    for (let ms = 32; ms < 200; ms += 16) { r.f.frame(r.t + ms); assert.equal(dirty(r.f), 0, `${what}: nothing dirty at ${ms}`); } return r;
  };
  const moved = (x, y) => (x >= 120 && x < 304 && y >= 80 && y < 290 ? OLD : null); await cut(fig(body), fig(moved), [270, 150], OLD, "re-posed");
  await cut(fig(body), fig((x, y) => (body(x, y) ? ALT : null)), [100, 150], ALT, "whole-body colour");
  const edge = async (w, h) => { const bx = [60, 80, w, h], r = await rollFigs(fig(body), fig((x, y) => (inBox(bx)(x, y) ? ALT : body(x, y)))); let any = false; r.f.frame(r.t + 100); for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) { if (same(px(r.f, 70 + xx, 90 + yy), OLD)) any = true; } return any; };
  assert.equal(await edge(160, 160), true, "160 × 160: dithers, the old colour still shows at level 8"); assert.equal(await edge(161, 160), false, "161 × 160: a cut"); assert.equal(await edge(160, 161), false, "160 × 161: a cut");
  { const r = await rollFigs(fig(body), fig((x, y) => (inBox([245, 10, 59, 60])(x, y) || inBox([100, 10, 100, 60])(x, y) ? NEWC : body(x, y)))); r.f.frame(r.t + 16); assert.deepEqual(px(r.f, 250, 20), NEWC, "a 204-wide silhouette box: the new picture whole on the key frame"); }
  { const clearRgb = (c) => fig((x, y) => (body(x, y) ?? (x >= 10 && x < 250 && y >= 5 && y < 40 ? [...c, 0] : null))); const r = await rollFigs(clearRgb([255, 0, 0]), clearRgb([0, 255, 0])); r.f.frame(r.t + 100); assert.deepEqual(px(r.f, 100, 150), OLD, "clear pixels that differ only in colour change nothing"); assert.deepEqual(r.f.errors(), []); }
  { const r = await rollFigs(fig(body), fig((x, y) => (inBox([200, 40, 40, 40])(x, y) ? NEWC : body(x, y))), { motion: false }); r.f.frame(r.t + 16); assert.deepEqual(px(r.f, 215, 55), NEWC, "reduced motion: the new picture whole on the frame"); const k = dirty(r.f, { fullCut: true }); console.log(`# Create's roll (reduced motion): the frame of the key redraws ${(100 * k / 614400).toFixed(1)}%`); assert.ok(k <= 153600, `key frame ${k}`); }
});
test("the founder's dither is a cut with reduced motion: the new picture at once, the event done on the frame", { skip }, async () => {
  const { b, f, t0 } = await rolled(false); f.frame(t0 + 16); assert.ok(pixelIs(f, R.founder.rect[0] + 41, R.founder.rect[1] + 61, b)); assert.equal(f.poll("done")?.kind, "dither"); assert.deepEqual(f.errors(), []);
});
test("the dither's `from` is a string on a dither alone: a number there still means levels, a string on any other event, an empty or a longer-than-95-bytes one is refused", { skip }, async () => {
  const f = await start(scene({ read: 2, f: 1 }));
  assert.equal(f.send({ t: "event", kind: "dither", target: "stage", from: 16, to: 0, ms: 180 }), 0); assert.equal(f.send({ t: "event", kind: "dither", target: "founder", from: "founder:S01:x", ms: 200 }), 0);
  for (const kind of ["seal", "wipe", "grow", "growNow", "hatch", "arrival"]) { assert.equal(f.send({ t: "event", kind, target: "x", from: "a-picture", ms: 100 }), -1, kind); assert.match(f.errors().join(), /a string only on a dither/); }
  assert.equal(f.send({ t: "event", kind: "dither", target: "founder", from: "x".repeat(96), ms: 200 }), -1); assert.match(f.errors().join(), /at most 95 bytes/);
  assert.equal(f.send({ t: "event", kind: "dither", target: "founder", from: ["a"], ms: 200 }), -1); assert.deepEqual(f.errors().length > 0, true);
});


// ---- the grow event (events.grow) ----
const ease = (p) => { p = Math.min(1000, Math.floor(p)); return Math.floor(p * p * (3000 - 2 * p) / 1000000); }, lerp = (a, b, e) => a + Math.trunc((b - a) * e / 1000);
async function growing(o = {}) {
  const b = scene({ read: 2, f: 1, roll: 1, grown: true, ...o }), f = await start(b, { t0: 1000 }), t0 = f.t; logOf(f); f.send({ t: "event", kind: "grow", target: "pod", ms: EV.grow.ms, hold: EV.grow.hold });
  return { b, f, t0, at: (ms) => { f.frame(t0 + ms); return logOf(f); } };
}
test("the stamp prints on the slip at (772, 128) row by row from the top over 300 ms, N + 2 rows of its cells, whole rows; nothing at 0, all of it at 300", { skip }, async () => {
  const { b, f, at } = await growing(), { N, cell, size } = b.props.regions.stamp, L = R.stamp.rect, rows = N + 2, sx = L[0] + Math.round((L[2] - size) / 2), sy = L[1] + Math.round((L[3] - size) / 2);
  assert.deepEqual(L, [772, 128, 120, 120]); assert.equal(region(at(0), "stampImage", "painted"), null, "no row at 0");
  for (const ms of [30, 100, 160, 250, 299]) { const lg = at(ms), want = Math.floor(rows * ms / 300) * cell, r = region(lg, "stampImage", "painted"); assert.deepEqual(r ? r.rect : null, want ? [sx, sy, size, want] : null, `${ms} ms: ${Math.floor(rows * ms / 300)} rows of ${cell} px`); }
  assert.deepEqual(region(at(300), "stampImage", "painted").rect, [sx, sy, size, size], "the whole stamp at 300"); assert.deepEqual(f.errors(), []);
});
test("at Grow 0 the slip's lists are cut away (the slip stays, printed) and the drums lock: no ring, no turn marks", { skip }, async () => {
  const { b, f, at } = await growing(); const lg = at(0);
  assert.equal(lg.type.filter((t) => t.region === "slip" && t.text).length, 0, "no list text on the printed slip"); assert.ok(region(lg, "slip"), "the slip's paper stays"); assert.equal(region(lg, "focus"), null, "no ring while it grows");
  const up = b.props.regions.bank.pictures.up; for (let i = 0; i < b.props.regions.bank.drums.length; i++) { const at0 = drumAt(b, i); if (at0) assert.ok(!pixelIs(f, at0.x + 40, at0.y + 3, up) && !pixelIs(f, at0.x + 40, at0.y - 2 + 3, up), `drum ${i}: no turn marks`); }
  assert.deepEqual(f.errors(), []);
});
test("the code and its rule appear at 300 ms (a cut) at (744, 264), three groups with spaces centred on x 832 with its baseline on 280, 'to the Incubator' at lineTop 316 centred on 832; none of them is there before", { skip }, async () => {
  const { b, at } = await growing(); assert.match(b.props.regions.code, /^[A-Z0-9]{3} [A-Z0-9]{3} [A-Z0-9]{3}$/);
  let lg = at(299); assert.equal(lg.type.some((t) => (t.region === "code" || t.region === "toIncubator") && t.text), false, "nothing at 299"); assert.equal(region(lg, "code", "chrome"), null, "no rule before 300: the rule and the code are one object");
  lg = at(300); assert.equal(lg.type.filter((t) => t.region === "code" && t.text).length, 1); const r = region(lg, "code", "type"); assert.ok(Math.abs(r.rect[0] + r.rect[2] / 2 - 832) <= 1, "centred on 832"); assert.equal(r.rect[1] + 4 + 12, 280, "the baseline on 280");
  assert.deepEqual(region(lg, "code", "chrome").rect, [744, 288, 176, 1], "the rule at y 288, x 744 to 920");
  const w = lg.type.find((t) => t.region === "toIncubator" && t.text), wr = region(lg, "toIncubator", "type"); assert.equal(w.text, "to the Incubator"); assert.ok(Math.abs(wr.rect[0] + wr.rect[2] / 2 - 832) <= 1 && w.px === 16 && wr.rect[1] <= 316 + 4 && wr.rect[1] + wr.rect[3] <= 316 + 24);
});
test("the pod stands open in its well until 300 ms, closes there (a cut), and is carried to (952, 160) from 300 to 900 in a straight line, whole pixels, eased in and out (e = p·p·(3000 − 2p)/1000000), clipped at the interior's edge 953", { skip }, async () => {
  const { b, f, at } = await growing(), box = R.pod.rect, to = R.travel.to, P = b.props.regions.pod;
  assert.deepEqual(box, [136, 128, 112, 136]); assert.deepEqual(to, [952, 160, 112, 136]);
  for (const ms of [0, 299]) { assert.deepEqual(region(at(ms), "travel").rect, box, `at ${ms} the pod is in its well`); assert.ok(pixelIs(f, box[0] + 56, box[1] + 68, P.picture), `at ${ms}: open`); }
  assert.ok(pixelIs(f, box[0] + 56, box[1] + 68, P.picture)); at(300); assert.ok(pixelIs(f, box[0] + 56, box[1] + 68, P.closed), "closed from 300");
  for (const ms of [330, 450, 600, 750, 800, 870, 899]) {
    const e = ease((ms - 300) * 1000 / 600), x = box[0] + lerp(0, to[0] - box[0], e), y = box[1] + lerp(0, to[1] - box[1], e), r = region(at(ms), "travel").rect, right = Math.min(x + 112, R.travel.clipRight);
    assert.deepEqual(r, [x, y, right - x, 136], `at ${ms}`);
  }
  assert.deepEqual(region(at(900), "travel").rect, [952, 160, 1, 136], "at 900 only the pod's first column is inside the interior (953)"); assert.equal(f.poll("done")?.kind, "grow"); assert.deepEqual(f.errors(), []);
});
test("grow with reduced motion is its end at once: the stamp whole on the slip, the code printed, the closed pod carried out, the event done on the frame", { skip }, async () => {
  const b = scene({ read: 2, f: 1, roll: 1, grown: true }), f = await start(b, { motion: false, t0: 1000 }); f.send({ t: "event", kind: "grow", target: "pod", ms: 900, hold: 0 }); frames(f, 2); assert.equal(f.poll("done")?.kind, "grow");
  assert.equal(f.props({ screen: "create", ...b.props, motion: false, frame: frameProps(b.line) }), 0); frames(f); const lg = logOf(f);
  assert.deepEqual(departures(lg, createSpec, frameSpec, "grow"), []); assert.equal(region(lg, "stampImage", "painted").rect[3], b.props.regions.stamp.size); assert.equal(lg.type.filter((t) => t.region === "code" && t.text).length, 1); assert.deepEqual(region(lg, "travel").rect, [952, 160, 1, 136]);
});

// ---- the dirty areas ----
test("no refresh redraws more than a quarter of the screen while the pod travels (frames every 16 ms) or the founder dithers, the frame of the key that starts each included; a turn redraws the drum, the founder's changed box, the slip and the price", { skip }, async () => {
  const area = (f, o) => dirty(f, o);
  const worst = (f, t0, until, step) => { let w = 0; for (let t = step; t < until; t += step) { f.frame(t0 + t); w = Math.max(w, area(f)); } return w; };
  const { f, t0 } = await growing(); const g = worst(f, t0, 900, 16); assert.ok(g <= 153600, `grow: dirty area ${g} (${(100 * g / 614400).toFixed(1)}%)`); console.log(`# Create's grow: worst refresh ${g} px (${(100 * g / 614400).toFixed(1)}% of the screen)`);
  const r = await rolled(); const d = worst(r.f, r.t0, 200, 16); assert.ok(d <= 153600, `dither: dirty area ${d} (${(100 * d / 614400).toFixed(1)}%)`); console.log(`# Create's founder dither: worst refresh ${d} px (${(100 * d / 614400).toFixed(1)}%)`);
  // a turn, motion off (a cut): the props of the turned drum arrive on one frame
  const a = scene({ read: 4, f: 1 }), t = scene({ read: 4, f: 1, roll: 1 }), g2 = await start(a, { motion: false, t0: 1000 }); dirty(g2, { fullCut: true });
  for (const q of t.requests) g2.handleOf(q.id, withPolicy((i) => standIn(i, sizeOf(q), q.hollow)));
  assert.equal(g2.props({ screen: "create", ...t.props, motion: false, frame: frameProps(t.line) }), 0, g2.errors().join("; ")); g2.frame((g2.t += 16)); const turn = dirty(g2, { fullCut: true }), rects = dirtyRects(g2);
  console.log(`# Create's turn (a cut): ${turn} px (${(100 * turn / 614400).toFixed(1)}%) in ${rects.length} flushes`); assert.ok(turn <= 153600, `a turn: dirty ${turn}`);
  assert.ok(rects.every(([x, y, w, h]) => (x >= 360 && y >= 80 && x + w <= 664 && y + h <= 392) || (y >= 96 && y + h <= 392 && x >= 728) || (y >= 430 && y + h <= 530) || y >= 560), `a turn touches the founder, the slip, the drum and the bottom line only: ${JSON.stringify(rects)}`);
  // a slide: the bank's tray
  const s0 = scene({ species: "S03", gs: 3, read: 8, f: 7 }), s1 = scene({ species: "S03", gs: 3, read: 8, f: 8, first: s0.props.regions.bank.first }), h = await start(s0, { motion: false, t0: 1000 }); dirty(h, { fullCut: true });
  for (const q of s1.requests) h.handleOf(q.id, withPolicy((i) => standIn(i, sizeOf(q), q.hollow)));
  assert.equal(h.props({ screen: "create", ...s1.props, motion: false, frame: frameProps(s1.line) }), 0, h.errors().join("; ")); h.frame((h.t += 16)); const slide = dirty(h, { fullCut: true });
  console.log(`# Create's slide: ${slide} px (${(100 * slide / 614400).toFixed(1)}%), the tray's box ${BK.rect[2] * BK.rect[3]}`); assert.ok(slide <= 153600, `a slide: dirty ${slide}`);
});
