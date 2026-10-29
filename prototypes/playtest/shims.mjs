// What the page's browser gives the Station and Node does not, replaced for one headless session (prototypes/playtest): the storage (a Map: the save is one JSON string under
// mb-save-v8, the developer settings another), the files beside the page (fetch on file: URLs reads the disk; any other URL throws), the session clock and dice (clock.mjs: performance.now,
// Date and Math.random), and reduced motion (matchMedia: the walks and the events jump to their end, so a settled screen has one hash).
// Installed once, before any Station module is imported: pixels.mjs reads matchMedia when it loads.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { installClock, EPOCH } from "./clock.mjs";

// the real clock, kept before install() replaces Date: the run log's timestamps are wall time, not the session's
export const RealDate = Date;
export const realIso = () => new RealDate(RealDate.now()).toISOString();

class MemoryStorage {
  constructor(init = {}) { this.m = new Map(Object.entries(init)); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
  clear() { this.m.clear(); }
  key(i) { return [...this.m.keys()][i] ?? null; }
  get length() { return this.m.size; }
}
const TYPES = { ".json": "application/json", ".png": "image/png", ".mjs": "text/javascript", ".wasm": "application/wasm" };
// fetch for the files beside the page: a Response over the file's bytes (404 when it is not there); the network is refused
function fileFetch(url) {
  const u = new URL(String(url?.url ?? url));
  if (u.protocol !== "file:") return Promise.reject(new Error(`the headless Station reads only its own files: ${u.href} refused`));
  const p = fileURLToPath(u);
  if (!existsSync(p)) return Promise.resolve(new Response(null, { status: 404 }));
  const ext = p.slice(p.lastIndexOf("."));
  return Promise.resolve(new Response(readFileSync(p), { status: 200, headers: { "content-type": TYPES[ext] ?? "application/octet-stream" } }));
}

export function install({ seed = 1, epoch = EPOCH, storage = {} } = {}) {
  const time = installClock({ seed, epoch });
  globalThis.localStorage = new MemoryStorage(storage);
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.matchMedia = (q) => ({ matches: /prefers-reduced-motion:\s*reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {} });
  globalThis.fetch = fileFetch;
  return time;
}
