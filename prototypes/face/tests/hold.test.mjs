// The hold ring (frame.json hold; anim/hold.c, common/holdRing.c): a frame whose props carry `hold` keeps ✓ down for itself. The ring is 96 px at the plate's centre; it fills clockwise from twelve o'clock over 3000 ms,
// says the intent `confirm:held` once when it is full, and empties over 300 ms when ✓ is let go, saying nothing. With reduced motion the fill steps in quarters and the emptying is a cut. A frame without `hold` treats ✓ as
// any key. Drawn here on the not-built composition (no screen has the ring yet). Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/hold.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { bootFace } from "../../station/src/face-lvgl.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), frameSpec = JSON.parse(readFileSync(path.join(specs, "frame.json"), "utf8")), H = frameSpec.hold;
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const rgbOf = (name) => { const h = palette.find(([n]) => n === name)[1]; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const FILL = rgbOf(H.fill), TRACK = rgbOf(H.track), [CX, CY] = H.centre, R0 = H.size / 2, BOX = [CX - R0, CY - R0];
const props = (o = {}) => ({ screen: "library", state: "notBuilt", motion: o.motion ?? true, frame: { ...(o.hold === false ? {} : { hold: { on: 1 } }) } });
const T0 = 1000;
async function setup(o) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  assert.equal(f.send({ t: "palette", name: "station", colours: palette }), 0); assert.equal(f.send({ t: "spec", screen: "frame", json: frameSpec }), 0);
  assert.equal(f.props(props(o)), 0, f.errors().join("; ")); f.frame(T0); f.frame(T0 + 16); f.drain(); return f;
}
const intents = (f) => { const out = []; for (let m; (m = f.poll("intent"));) out.push(m.verb); return out; };
const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
// the ring's pixels in its box: [filled, track, other]
function count(f) {
  const px = f.rgba(), W = f.size[0]; let fill = 0, track = 0;
  for (let y = 0; y < H.size; y++) for (let x = 0; x < H.size; x++) { const i = ((BOX[1] + y) * W + BOX[0] + x) * 4, c = [px[i], px[i + 1], px[i + 2]]; if (same(c, FILL)) fill++; else if (same(c, TRACK)) track++; }
  return { fill, track };
}
// whether the ring is filled at an angle (degrees clockwise from twelve o'clock), on the band's middle
function at(f, deg) {
  const r = R0 - H.width / 2, a = (deg * Math.PI) / 180, x = Math.round(CX + r * Math.sin(a) - 0.5), y = Math.round(CY - r * Math.cos(a) - 0.5), px = f.rgba(), i = (y * f.size[0] + x) * 4, c = [px[i], px[i + 1], px[i + 2]];
  return same(c, FILL) ? "fill" : same(c, TRACK) ? "track" : "other";
}
const share = (f) => { const c = count(f); return c.fill / (c.fill + c.track); };
const press = (f) => { f.key("confirm", "down"); }, lift = (f) => { f.key("confirm", "up"); };

test("the spec: 96 px, 3000 ms to fill, 300 ms to empty, quarters", () => { assert.equal(H.size, 96); assert.equal(H.ms, 3000); assert.equal(H.emptyMs, 300); assert.equal(H.quarters, 4); });

test("at rest the ring is an empty track at the plate's centre", { skip }, async () => {
  const f = await setup(); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
  const c = count(f); assert.equal(c.fill, 0); assert.ok(c.track > 1000, "the track is drawn: " + c.track);
  for (const deg of [0, 90, 180, 270]) assert.equal(at(f, deg), "track", deg + "°");
});

test("filling: 0, 1000, 2000 and 3000 ms of ✓ held", { skip }, async () => {
  const f = await setup(); press(f); f.frame(T0 + 16);   // ✓ went down in the frame at T0 + 16
  const t0 = T0 + 16;
  f.frame(t0); assert.equal(count(f).fill, 0, "0 ms: empty"); assert.deepEqual(intents(f), []);
  f.frame(t0 + 1000); assert.ok(Math.abs(share(f) - 1 / 3) < 0.02, "1000 ms: a third, " + share(f)); assert.equal(at(f, 10), "fill"); assert.equal(at(f, 110), "fill"); assert.equal(at(f, 130), "track"); assert.equal(at(f, 270), "track");
  f.frame(t0 + 2000); assert.ok(Math.abs(share(f) - 2 / 3) < 0.02, "2000 ms: two thirds, " + share(f)); assert.equal(at(f, 230), "fill"); assert.equal(at(f, 250), "track"); assert.equal(at(f, 350), "track");
  assert.deepEqual(intents(f), [], "nothing is said while the ring fills");
  f.frame(t0 + 3000); assert.equal(count(f).track, 0, "3000 ms: full"); for (const deg of [0, 90, 180, 270, 359]) assert.equal(at(f, deg), "fill", deg + "°");
  assert.deepEqual(intents(f), ["confirm:held"], "the hold says its intent when it completes");
  assert.deepEqual(f.errors(), []);
});

test("confirm:held is sent once, however long ✓ stays down", { skip }, async () => {
  const f = await setup(); press(f); const said = [];
  for (let t = T0 + 16; t <= T0 + 9000; t += 50) { f.frame(t); said.push(...intents(f)); }
  assert.deepEqual(said, ["confirm:held"]);
  press(f); f.frame(T0 + 9100); f.frame(T0 + 15000); assert.deepEqual(intents(f), [], "a key repeat does not begin another hold");
  lift(f); f.frame(T0 + 15100); f.frame(T0 + 15400); assert.deepEqual(intents(f), [], "letting go after it completed says nothing more"); assert.equal(count(f).fill, 0, "and the ring is empty");
});

test("letting go empties the ring over 300 ms and says nothing: release +0, +150 and +300 ms", { skip }, async () => {
  const f = await setup(); press(f); const t0 = T0 + 16; f.frame(t0);
  f.frame(t0 + 1500); const before = share(f); assert.ok(Math.abs(before - 0.5) < 0.02, "half full: " + before);
  lift(f); f.frame(t0 + 1500); assert.ok(Math.abs(share(f) - 0.5) < 0.02, "+0 ms: as it was");
  f.frame(t0 + 1650); assert.ok(Math.abs(share(f) - 0.25) < 0.02, "+150 ms: half of what was, " + share(f)); assert.equal(at(f, 80), "fill"); assert.equal(at(f, 100), "track");
  f.frame(t0 + 1800); assert.equal(count(f).fill, 0, "+300 ms: empty");
  f.frame(t0 + 6000); assert.deepEqual(intents(f), [], "no intent when let go"); assert.equal(count(f).fill, 0);
});

test("let go just before the end: no intent, ever", { skip }, async () => {
  const f = await setup(); press(f); const t0 = T0 + 16; f.frame(t0); f.frame(t0 + 2900); lift(f); f.frame(t0 + 2900);
  for (let t = t0 + 2950; t < t0 + 8000; t += 50) f.frame(t);
  assert.deepEqual(intents(f), []); assert.equal(count(f).fill, 0);
});

test("a new hold after letting go begins from empty, on its own clock", { skip }, async () => {
  const f = await setup(); press(f); const t0 = T0 + 16; f.frame(t0); f.frame(t0 + 1000); lift(f); f.frame(t0 + 1400); assert.equal(count(f).fill, 0);
  press(f); f.frame(t0 + 1400); f.frame(t0 + 2400); assert.ok(Math.abs(share(f) - 1 / 3) < 0.02, "a third after a second: " + share(f)); f.frame(t0 + 4300); assert.deepEqual(intents(f), []); f.frame(t0 + 4400); assert.deepEqual(intents(f), ["confirm:held"]);
});

test("reduced motion: the fill steps in quarters, the emptying is a cut, the 3 s stay", { skip }, async () => {
  const f = await setup({ motion: false }); press(f); const t0 = T0 + 16; f.frame(t0);
  const seen = []; for (const dt of [0, 700, 749, 750, 1400, 1500, 2200, 2250, 2900]) { f.frame(t0 + dt); seen.push([dt, Math.round(share(f) * 4) / 4]); }
  assert.deepEqual(seen, [[0, 0], [700, 0], [749, 0], [750, 0.25], [1400, 0.25], [1500, 0.5], [2200, 0.5], [2250, 0.75], [2900, 0.75]]);
  for (const dt of [0, 700, 750, 1500, 2250]) { f.frame(t0 + dt); void 0; }
  f.frame(t0 + 2950); assert.deepEqual(intents(f), [], "not before 3000 ms");
  f.frame(t0 + 3000); assert.equal(count(f).track, 0, "full at 3000 ms"); assert.deepEqual(intents(f), ["confirm:held"]);
  const g = await setup({ motion: false }); press(g); g.frame(T0 + 16); g.frame(T0 + 1516); assert.ok(Math.abs(share(g) - 0.5) < 0.02); lift(g); g.frame(T0 + 1532); assert.equal(count(g).fill, 0, "let go: cut to empty"); g.frame(T0 + 6000); assert.deepEqual(intents(g), []);
});

test("another key ends a hold in progress and then acts as it would", { skip }, async () => {
  const f = await setup(); press(f); const t0 = T0 + 16; f.frame(t0); f.frame(t0 + 1000); assert.ok(share(f) > 0.3);
  f.key("library"); assert.deepEqual(intents(f), ["room:library"], "a room key is said"); f.frame(t0 + 1000); f.frame(t0 + 1300); assert.equal(count(f).fill, 0, "and the ring empties");
  f.frame(t0 + 6000); assert.deepEqual(intents(f), []);
});

test("a frame without `hold` draws no ring, and ✓ is an ordinary key", { skip }, async () => {
  const f = await setup({ hold: false }); press(f); f.frame(T0 + 16); f.frame(T0 + 4000); lift(f); f.frame(T0 + 4100);
  const c = count(f); assert.equal(c.fill + c.track, 0); assert.deepEqual(intents(f), []);
  f.key("confirm"); f.frame(T0 + 4200); assert.deepEqual(intents(f), [], "the not-built screen's ✓ says nothing");
});

test("props that drop the hold end it: nothing is said afterwards", { skip }, async () => {
  const f = await setup(); press(f); const t0 = T0 + 16; f.frame(t0); f.frame(t0 + 1000);
  assert.equal(f.props(props({ hold: false })), 0); f.frame(t0 + 1016); f.frame(t0 + 5000); assert.deepEqual(intents(f), []); const c = count(f); assert.equal(c.fill + c.track, 0);
  assert.equal(f.props(props()), 0); f.frame(t0 + 5016); assert.equal(count(f).fill, 0, "a ring that comes back is empty");
});

test("the wire: a key message with a phase is a press or a release alone; any other phase is refused", { skip }, async () => {
  const f = await setup(); assert.equal(f.send({ t: "key", k: "confirm", phase: "down" }), 0); f.frame(T0 + 16); f.frame(T0 + 1016); assert.ok(share(f) > 0.3);
  assert.equal(f.send({ t: "key", k: "confirm", phase: "up" }), 0); f.frame(T0 + 1016); f.frame(T0 + 1400); assert.equal(count(f).fill, 0);
  assert.equal(f.send({ t: "key", k: "confirm", phase: "sideways" }), -1); f.errors();
});
