// New note opens at once (#139): the held canvas picture is its first item; the whole-page picture replaces it when it arrives.
// The controller is loaded with its three imports swapped for stubs (idb-keyval and clip.mjs need browser packages), so no install is needed.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const here = new URL(".", import.meta.url);
const notesUrl = new URL("../src/notes.mjs", here).href;
const dir = mkdtempSync(join(tmpdir(), "note-open-"));
let page = null;   // the test sets how pageShot behaves
globalThis.__page = (...a) => page(...a);
globalThis.URL.createObjectURL = () => "blob:x"; globalThis.URL.revokeObjectURL = () => {};
globalThis.document = {}; globalThis.window = {};

writeFileSync(join(dir, "idb.mjs"), "const m = new Map(); export const get = async (k) => m.get(k), set = async (k, v) => { m.set(k, v); }, del = async (k) => { m.delete(k); }, keys = async () => [...m.keys()];");
writeFileSync(join(dir, "clip.mjs"), "export const shot = async () => new Blob([new Uint8Array(3)], { type: 'image/png' }), pageShot = (...a) => globalThis.__page(...a), createTap = () => ({ start() {}, stop() {}, elapsed: () => 0 }), canClip = () => false, canRecordAny = () => false;");
let src = readFileSync(new URL("../options/src/controller.js", here), "utf8");
src = src.replace(/import \* as idb from "idb-keyval";/, `import * as idb from ${JSON.stringify(pathToFileURL(join(dir, "idb.mjs")).href)};`)
  .replace(/from "\.\.\/\.\.\/src\/notes\.mjs"/, `from ${JSON.stringify(notesUrl)}`)
  .replace(/from "\.\.\/\.\.\/src\/clip\.mjs"/, `from ${JSON.stringify(pathToFileURL(join(dir, "clip.mjs")).href)}`);
writeFileSync(join(dir, "controller.mjs"), src);
const { createController } = await import(pathToFileURL(join(dir, "controller.mjs")).href);

const mk = () => createController({ getCanvas: () => ({ width: 10, height: 6 }), page: true, source: () => "owner", context: async () => ({}), say() {}, flash() {} });
const pageBlob = () => new Blob([new Uint8Array(9)], { type: "image/png" });
const later = (ms) => new Promise((r) => setTimeout(r, ms));

test("New note is open before the page picture resolves; its first item becomes the page picture after", async () => {
  let done; page = () => new Promise((r) => { done = () => r({ blob: pageBlob(), w: 100, h: 60 }); });
  const c = mk(); await c.hold();
  await c.newNote();
  assert.equal(c.getState().open, true, "open at once");
  assert.equal(c.getState().items.length, 1);
  assert.equal(c.getState().items[0].w, 10, "the canvas picture first");
  done(); await later(5);
  assert.equal(c.getState().items.length, 1);
  assert.equal(c.getState().items[0].w, 100, "then the page picture");
});

test("a first item the user changed or a note that was discarded is left alone", async () => {
  let done; page = () => new Promise((r) => { done = () => r({ blob: pageBlob(), w: 100, h: 60 }); });
  const c = mk(); await c.hold(); await c.newNote();
  const first = c.getState().items[0];
  await c.addWhole();   // a second item; the first is still untouched, so it is replaced
  done(); await later(5);
  assert.equal(c.getState().items.length, 2);
  assert.equal(c.getState().items[0].w, 100);
  assert.notEqual(c.getState().items[0], first);

  const d = mk(); await d.hold(); await d.newNote();
  d.discard(); done(); await later(5);
  assert.deepEqual(d.getState().items, [], "discarded: nothing comes back");
});

test("a page picture that fails keeps the canvas picture", async () => {
  page = async () => { throw new Error("no"); };
  const c = mk(); await c.hold(); await c.newNote(); await later(5);
  assert.equal(c.getState().items[0].w, 10);
});
