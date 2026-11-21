// src/fetchretry.mjs: a non-ok answer or a dropped request is tried again twice; the last failure names the file and the status.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchOk, loadImg } from "../src/fetchretry.mjs";

const pause = async () => {};

test("a non-ok answer, then an ok one: succeeds on the second try", async () => {
  const answers = [{ ok: false, status: 503 }, { ok: true, status: 200 }]; let n = 0;
  const res = await fetchOk("https://x.test/a/terrain.json?v=1", { fetch: async () => answers[n++], pause });
  assert.equal(res.status, 200); assert.equal(n, 2);
});

test("a dropped request, then an ok one: succeeds", async () => {
  let n = 0;
  const res = await fetchOk("https://x.test/a/b.json", { fetch: async () => { if (n++ === 0) throw new TypeError("Failed to fetch"); return { ok: true, status: 200 }; }, pause });
  assert.equal(res.ok, true); assert.equal(n, 2);
});

test("three failures: throws naming the status and the file, after exactly three tries", async () => {
  let n = 0;
  await assert.rejects(fetchOk("https://x.test/a/terrain.json?v=9", { fetch: async () => { n++; return { ok: false, status: 404 }; }, pause }),
    e => e.message === "404 terrain.json" && e.file === "terrain.json");
  assert.equal(n, 3);
});

test("an image that fails once loads on the next try; one that always fails names its file", async () => {
  let made = 0;
  class Flaky { set src(v) { const k = ++made; setTimeout(() => (k === 1 ? this.onerror() : this.onload()), 0); } }
  const im = await loadImg("https://x.test/art/p.png", { Image: Flaky, pause }); assert.ok(im instanceof Flaky); assert.equal(made, 2);
  class Dead { set src(v) { setTimeout(() => this.onerror(), 0); } }
  await assert.rejects(loadImg("https://x.test/art/q.png?v=2", { Image: Dead, pause }), e => e.message === "missing q.png");
});
