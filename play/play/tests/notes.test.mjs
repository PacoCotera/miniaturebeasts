// Play notes, the logic (src/notes.mjs): the 10 s ring starts at a key frame, the note's caps and the multipart body, the source, and an offline queue that survives a reload.
import test from "node:test";
import assert from "node:assert/strict";
import { ClipRing, LIMITS, canAdd, counts, toFormData, sourceOf, createQueue, fmt, mss, isEmpty, sentWithLine } from "../src/notes.mjs";

const blob = (n, type = "image/png") => new Blob([new Uint8Array(n)], { type });

test("the ring keeps the last 10 s, always from a key frame", () => {
  const r = new ClipRing(10000);
  for (let i = 0; i < 25 * 30; i++) r.push({ key: i % 30 === 0, ts: i * (1000 / 30), data: new Uint8Array(1) });   // 25 s at 30 fps, a key frame a second
  const s = r.snapshot();
  assert.ok(s[0].key, "starts on a key frame");
  assert.ok(r.spanMs() >= 10000 - 1, "holds at least 10 s: " + r.spanMs());
  assert.ok(r.spanMs() < 11100, "and no more than the 10 s plus one key interval: " + r.spanMs());
  assert.equal(s.filter((c) => c.key).length > 9, true);
});

test("the ring with no key frame yet holds what it has", () => {
  const r = new ClipRing(10000); r.push({ key: true, ts: 0, data: new Uint8Array(1) }); r.push({ key: false, ts: 33, data: new Uint8Array(1) });
  assert.equal(r.snapshot().length, 2); r.clear(); assert.equal(r.snapshot().length, 0);
});

test("caps: 8 pictures, 2 clips, 20 MB; the answer is the copy key", () => {
  const items = Array.from({ length: 8 }, (_, i) => ({ id: i, kind: "whole", blob: blob(10) }));
  assert.equal(canAdd(items, "whole"), "note.full.pictures");
  assert.equal(canAdd(items, "last"), null, "pictures and clips are counted apart");
  const two = [{ id: 1, kind: "last", blob: blob(10, "video/mp4") }, { id: 2, kind: "clip", blob: blob(10, "video/mp4") }];
  assert.equal(canAdd(two, "clip"), "note.full.clips");
  assert.equal(canAdd([{ id: 1, kind: "whole", blob: blob(LIMITS.bytes - 5) }], "last", 10), "note.full.size");
  assert.deepEqual(counts(two), { shots: 0, clips: 2, bytes: 20 });
});

test("the body: text, source, context, shot and clip parts", async () => {
  const note = { text: "the reeds flicker", items: [{ kind: "whole", blob: blob(4) }, { kind: "section", blob: blob(3) }, { kind: "last", blob: blob(5, "video/mp4") }] };
  const fd = toFormData(note, "owner", { build: "abc1234" });
  assert.equal(fd.get("text"), "the reeds flicker"); assert.equal(fd.get("source"), "owner"); assert.deepEqual(JSON.parse(fd.get("context")), { build: "abc1234" });
  assert.equal(fd.getAll("shot").length, 2); assert.equal(fd.getAll("clip").length, 1);
  assert.equal(fd.getAll("clip")[0].type, "video/mp4");
});

test("the source: owner unless a plain stored name; no address, no agent string", () => {
  assert.equal(sourceOf({}), "owner"); assert.equal(sourceOf({ noteFrom: "Sol" }), "Sol"); assert.equal(sourceOf({ noteFrom: "bot 2" }), "bot 2");
  assert.equal(sourceOf({ noteFrom: "<script>" }), "owner"); assert.equal(sourceOf({ noteFrom: "" }), "owner"); assert.equal(sourceOf({ noteFrom: 3 }), "owner");
  assert.equal(sourceOf({ noteFrom: "x".repeat(40) }), "owner");
});

test("an empty note is empty; a line or a picture is not", () => {
  assert.equal(isEmpty({ items: [], text: "  " }), true); assert.equal(isEmpty({ items: [], text: "a" }), false); assert.equal(isEmpty({ items: [{}], text: "" }), false);
});

test("the queue keeps a note offline, survives a reload (a new queue on the same store), and sends it when the route answers", async () => {
  const m = new Map(), store = { get: async (k) => m.get(k), set: async (k, v) => void m.set(k, v), del: async (k) => void m.delete(k), keys: async () => [...m.keys()] };
  let up = false, sent = [];
  const fetchFn = async (url, init) => { if (!up) throw new TypeError("offline"); sent.push({ url, fd: init.body }); return { status: 201, ok: true }; };
  const q1 = createQueue(store, { fetchFn });
  await q1.add({ text: "kept", items: [{ kind: "whole", blob: blob(4) }] }, "owner", { build: "x" });
  assert.equal((await q1.flush()).left, 1, "offline: kept");
  const q2 = createQueue(store, { fetchFn });   // the reload: a new queue over what IndexedDB holds
  assert.equal((await q2.pending()).length, 1);
  up = true; const r = await q2.flush();
  assert.deepEqual(r, { sent: 1, left: 0 }); assert.equal(sent[0].url, "/caddy-api/v1/notes"); assert.equal(sent[0].fd.get("text"), "kept");
  assert.equal(m.size, 0, "gone once the route has it");
});

test("the queue keeps a note while the route is missing or busy, and drops one the route refuses for good", async () => {
  const m = new Map(), store = { get: async (k) => m.get(k), set: async (k, v) => void m.set(k, v), del: async (k) => void m.delete(k), keys: async () => [...m.keys()] };
  let status = 404; const q = createQueue(store, { fetchFn: async () => ({ status, ok: status < 300 }) });
  await q.add({ text: "a", items: [] }, "owner", {});
  assert.equal((await q.flush()).left, 1, "no route yet (404): waits"); status = 503; assert.equal((await q.flush()).left, 1, "busy: waits"); status = 429; assert.equal((await q.flush()).left, 1, "day's limit: waits");
  status = 413; assert.equal((await q.flush()).left, 0, "over-size for good: dropped, never blocks the rest");
});

test("the words: {name} and {m:ss}; the time of a recording", () => {
  assert.equal(fmt("Note · {n}", { n: 3 }), "Note · 3"); assert.equal(fmt("Recording {m:ss}", { m: 4200 }), "Recording 0:04"); assert.equal(mss(75000), "1:15");
  assert.equal(sentWithLine({ build: "abc", slot: "A", companion: { seed: 7, place: "setup", turn: 2 }, layout: { phone: false, w: 1280, h: 800 } }), "build abc · Companion A · world 7 · setup · world turn 2 · laptop 1280 × 800");
});
