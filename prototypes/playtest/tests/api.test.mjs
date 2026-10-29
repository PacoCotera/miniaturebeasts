// The harness's API (prototypes/playtest): boot, the device's keys, press and step, hash, render, observeAssisted, changed, wait; the stuck detector and the run log; a run with
// its checkpoints; and the scripted demo. One session for the file (a process holds one session); the demo runs in a process of its own. Skipped when the face is not built.
//   node --test prototypes/playtest/tests/api.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG } from "../../ui/png.mjs";
import { createStuck } from "../stuck.mjs";
import { createLog } from "../log.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../../face/dist");
const face = existsSync(path.join(dist, "face_pipe")) ? "native" : "wasm", built = existsSync(path.join(dist, face === "native" ? "face_pipe" : "face.wasm"));
const skip = !built && "the face is not built (face/build.sh)";
const tmp = mkdtempSync(path.join(tmpdir(), "mb-playtest-test-"));
let S = null;
const session = async () => (S ??= await (await import("../engine.mjs")).boot({ seed: 3, save: "fixture", names: "en-short-1", face }));
test.after(() => { S?.close(); rmSync(tmp, { recursive: true, force: true }); });

test("boot gives a session on Home, settled, with no face error; keys() lists the device's keys only", { skip }, async () => {
  const s = await session();
  assert.match(s.hash(), /^[0-9a-f]{8}$/); assert.deepEqual(s.errors(), []);
  assert.deepEqual(s.keys(), ["up", "down", "left", "right", "confirm", "back", "home", "habitat", "research", "library", "dock"]);
  assert.equal(s.observeAssisted().screen, "home");
  assert.throws(() => s.press("menu"), /not a key of the device/);
});

test("a press is the page's key: the hash and the observation follow it, A and B are ✓ and ←, and changed() says what visibly changed", { skip }, async () => {
  const s = await session(), h0 = s.hash();
  const r = s.press("down");
  assert.ok(r.settled); assert.notEqual(r.hash, h0); assert.equal(s.hash(), r.hash);
  assert.ok(s.changed().some((c) => /^the focus moved from .* to Pods/.test(c)), s.changed().join("; "));
  const same = s.press("down"); assert.equal(same.hash, r.hash); assert.deepEqual(s.changed(), ["nothing changed"]);
  const into = s.press("A"); assert.equal(into.key, "confirm"); assert.equal(s.observeAssisted().screen, "pods");
  assert.ok(s.changed()[0].startsWith("the screen changed from home"), s.changed()[0]);
  const back = s.step("B"); assert.equal(back.key, "back"); assert.equal(s.observeAssisted().screen, "home");
  assert.ok(s.events.includes("Pods opened"), s.events.join("; "));
});

test("observeAssisted() is the screen as drawn: its words by region, the focus, the numbers written, the residents; no rules' state", { skip }, async () => {
  const s = await session(), o = s.observeAssisted();
  assert.deepEqual(Object.keys(o).sort(), ["events", "focus", "mibis", "numbers", "overlay", "screen", "state", "title", "words"]);
  assert.ok(o.words.some((w) => w.region === "bar" && w.text === "12:00"));
  assert.ok(o.words.some((w) => w.region === "pods" && /in the case/.test(w.text)));
  assert.ok(o.numbers.some((n) => n.in === "12:00"));
  assert.equal(typeof o.focus.id, "string");
  for (const w of o.words) assert.ok(s.log().type.some((t) => t.text === w.text && t.region === w.region), "every word was drawn: " + w.text);
  const keys = new Set(), walk = (v) => { if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { keys.add(k); walk(x); } }; walk(o);
  for (const k of ["genome", "sha", "e", "d", "s", "outbox", "born", "read", "paint"]) assert.ok(!keys.has(k), "no rules' state in the observation: " + k);
});

test("render(path) writes the framebuffer as a 1024×600 PNG; wait(minutes) fast-forwards to Idle", { skip }, async () => {
  const s = await session(), f = path.join(tmp, "frame.png"), png = s.render(f);
  assert.ok(existsSync(f)); const d = decodePNG(readFileSync(f)); assert.equal(d.width, 1024); assert.equal(d.height, 600);
  assert.deepEqual(png, readFileSync(f));
  const w = s.wait(2); assert.ok(w.settled); assert.equal(s.observeAssisted().screen, "idle");
  s.press("confirm"); assert.equal(s.observeAssisted().screen, "home", "a key wakes Idle");
});

test("play(): a run logs every press as JSONL, renders a new hash once, and ends stuck on the same screen six presses running", { skip }, async () => {
  const s = await session(), { play } = await import("../run.mjs"), log = path.join(tmp, "run.jsonl"), frames = path.join(tmp, "frames"), h0 = s.hash();
  const r = await play(s, { player: ({ step }) => ({ key: step === 0 ? "habitat" : "up", reason: "test" }), presses: 40, log, checkpoints: frames });
  assert.equal(r.end.reason, "stuck"); assert.equal(r.end.kind, "same-hash");
  const lines = readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(lines[0].t, "run"); assert.equal(lines.at(-1).t, "end"); assert.equal(lines.at(-1).reason, "stuck");
  const steps = lines.filter((l) => l.t === "step"); assert.equal(steps.length, r.presses);
  for (const l of steps) { assert.ok(l.observation && l.key && l.reason === "test" && /^[0-9a-f]{8}$/.test(l.hash) && !Number.isNaN(Date.parse(l.at))); }
  const met = new Set([h0, ...steps.map((l) => l.hash)]);
  assert.deepEqual(readdirSync(frames).sort(), [...met].map((h) => h + ".png").sort(), "one PNG for each hash the run met, once");
  const again = await play(s, { player: () => ({ key: "up" }), presses: 3, log: path.join(tmp, "again.jsonl"), checkpoints: frames });
  assert.equal(again.rendered.length, 0, "a hash already rendered is never rendered again");
});

test("the stuck detector: six presses on one hash, or thirty with no new screen or event", () => {
  const a = createStuck(); a.start("h0"); let r = null; for (let i = 0; i < 5; i++) assert.equal(a.note("h1"), null); r = a.note("h1"); assert.equal(r.kind, "same-hash");
  const b = createStuck(); b.start("h0"); b.note("h1"); for (let i = 0; i < 29; i++) assert.equal(b.note(i % 2 ? "h1" : "h0"), null, "press " + i); assert.equal(b.note("h0").kind, "no-new");
  const c = createStuck(); c.start("h0"); b.note("h1"); for (let i = 0; i < 40; i++) assert.equal(c.note(i % 2 ? "h1" : "h0", ["an event"]), null, "an event each press keeps the run alive");
});

test("the run log: a header, one line a press with its slots, an end record", () => {
  const f = path.join(tmp, "log.jsonl"), L = createLog(f, { player: "t" });
  L.step({ observation: { screen: "home" }, key: "up", reason: "why", hash: "00000000" }); L.end({ reason: "done" });
  const lines = readFileSync(f, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(lines.map((l) => l.t), ["run", "step", "end"]); assert.equal(lines[0].player, "t");
  assert.deepEqual(Object.keys(lines[1]).sort(), ["at", "hash", "key", "n", "observation", "reason", "t"]); assert.equal(lines[2].steps, 1);
});

test("the scripted demo: 50 keys of a fixed walk, the log written, three PNGs for new hashes", { skip }, () => {
  const out = path.join(tmp, "demo"), r = JSON.parse(execFileSync(process.execPath, [path.resolve(here, "../tools/demo.mjs"), "--out", out, "--face", face], { encoding: "utf8" }).trim().split("\n").pop());
  assert.equal(r.presses, 50); assert.equal(r.end, "done"); assert.equal(r.rendered.length, 3);
  const lines = readFileSync(path.join(out, "run.jsonl"), "utf8").trim().split("\n"); assert.equal(lines.length, 52);
  const pngs = readdirSync(path.join(out, "frames")); assert.equal(pngs.length, 3); for (const p of pngs) assert.match(p, /^[0-9a-f]{8}\.png$/);
});
