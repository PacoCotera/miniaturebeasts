// The one harness for the Companion page: its module script runs in a vm sandbox with the browser stubbed, and every
// `import { … } from "./src/<module>.mjs"` line of the page is bound to that module's real exports. The imports are read from the
// page itself, so a new ./src/ module the page imports needs no change here or in any test.
//   import { loadPage, makePage, PAGE, MODULE, SCRIPT } from "./page-harness.mjs";
import { readFileSync } from "node:fs";
import vm from "node:vm";

export const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");
export const MODULE = PAGE.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
export const IMPORT_RE = /^import \{([^}]*)\} from "\.\/src\/(\w+)\.mjs";$/gm;
// [module, exported name, name on the page] for every imported name
export const BINDINGS = [...MODULE.matchAll(IMPORT_RE)].flatMap(m => m[1].split(",").map(s => s.trim().split(/\s+as\s+/)).map(([f, t = f]) => [m[2], f, t]));
export const SCRIPT = MODULE.replace(IMPORT_RE, "");
export const MODS = {};
for (const name of new Set(BINDINGS.map(b => b[0]))) MODS[name] = await import(new URL(`../src/${name}.mjs`, import.meta.url));

// Binds the imports into ctx, runs the page script (or a variant of it) there, and returns run(src), which evaluates in the page.
export function loadPage(ctx, script = SCRIPT) {
  ctx.window = ctx;
  for (const [mod, from, to] of BINDINGS) ctx[to] = MODS[mod][from];
  vm.createContext(ctx); vm.runInContext(script, ctx);
  return src => vm.runInContext(src, ctx);
}

// A value that answers every property, call and construction with itself (the browser's objects, stubbed).
export const any = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => "" : k === Symbol.iterator ? function* () {} : k === "then" ? undefined : any,
  apply: () => any, construct: () => any, set: () => true });

// A canvas that keeps palette indices (-1 transparent): fillRect, drawImage (2, 4 and 8 arguments, nearest), image data; clips are ignored.
export function fakeCanvas(look) {
  const t = { width: 0, height: 0 }; let p = null;
  const buf = () => { if (!p || p.length !== t.width * t.height) p = new Int16Array(t.width * t.height).fill(-1); return p; };
  const put = (x, y, v) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < t.width && y < t.height) buf()[y * t.width + x] = v; };
  const ctx = { fillStyle: "", imageSmoothingEnabled: false, save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, setTransform() {},
    fillRect(x, y, w, h) { const v = look.hex(this.fillStyle); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, v); },
    drawImage(src, ...a) { const sp = src.px(); let [sx, sy, sw, sh] = [0, 0, src.width, src.height], dx, dy, dw, dh;
      if (a.length === 2) [dx, dy, dw, dh] = [a[0], a[1], sw, sh]; else if (a.length === 4) [dx, dy, dw, dh] = a; else [sx, sy, sw, sh, dx, dy, dw, dh] = a;
      for (let j = 0; j < dh; j++) for (let i = 0; i < dw; i++) { const v = sp[(sy + Math.floor(j * sh / dh)) * src.width + sx + Math.floor(i * sw / dw)]; if (v >= 0) put(dx + i, dy + j, v); } },
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData(id, x, y) { for (let j = 0; j < id.height; j++) for (let i = 0; i < id.width; i++) { const o = (j * id.width + i) * 4; put(x + i, y + j, id.data[o + 3] ? look.rgb(id.data[o], id.data[o + 1], id.data[o + 2]) : -1); } },
    getImageData(x, y, w, h) { const d = new Uint8ClampedArray(w * h * 4); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const v = buf()[(y + j) * t.width + x + i];
      if (v >= 0) { const c = look.rgbOf(v), o = (j * w + i) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; } } return { width: w, height: h, data: d }; } };
  return Object.assign(t, { getContext: () => ctx, px: buf, style: {}, toDataURL: () => "" });
}

// The standard page. opts:
//   store    the localStorage object (default {})
//   console  "real" (default), "silent", or "collect" (errors go to p.errors, the rest is silent)
//   els      true: document.getElementById answers one stub element for each id (p.els)
//   raf      what requestAnimationFrame returns: 0 (default), 1, or "count" (1, 2, 3 … ; p.raf.n counts the calls)
//   canvas   true: document.createElement("canvas") gives a fakeCanvas, so a drawing can be read back (p.run("scr").px())
//   date     a number: the page's Date stands still at that many ms (new Date() and Date.now()); default is the real clock
// Returns { run, ctx, store, clock, els, writes, errors, raf, KEY, S, pass(ms), key(k, n), sv(), writeSt(st) }.
// Timers wait on the clock: pass(ms) runs the ones that fall due, in order.
export function makePage(opts = {}) {
  const store = opts.store || {};
  const els = {}, elStub = () => new Proxy({}, { get: (t, k) => k in t ? t[k] : any, set: (t, k, v) => { t[k] = v; return true; } });
  let run = null, pal = null;
  const P = () => pal || (pal = { hex: new Map(run("HEX").map((h, i) => [h, i])), rgb: run("RGB"), of: new Map(run("RGB").map((c, i) => [c[0] << 16 | c[1] << 8 | c[2], i])) });
  const look = { hex: h => P().hex.get(h) ?? -2, rgbOf: v => P().rgb[v], rgb: (r, g, b) => P().of.get(r << 16 | g << 8 | b) ?? -2 };
  const document = opts.els || opts.canvas ? new Proxy(any, { get: (t, k) => k === "getElementById" && opts.els ? id => els[id] || (els[id] = elStub()) : k === "createElement" && opts.canvas ? tag => tag === "canvas" ? fakeCanvas(look) : any : any }) : any;
  const clock = { t: 1000, timers: [] }, writes = [], errors = [], raf = { n: 0 };
  const silent = { log() {}, warn() {}, error() {} };
  const cons = opts.console === "silent" ? silent : opts.console === "collect" ? { ...silent, error: e => errors.push(e) } : console;
  const D = opts.date == null ? Date : class extends Date { constructor(...a) { super(...(a.length ? a : [opts.date])); } static now() { return opts.date; } };
  const ctx = { console: cons, URLSearchParams, Date: D, fetch: () => new Promise(() => {}), document, location: any, navigator: any,
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }), addEventListener: () => {}, innerWidth: 450, innerHeight: 600,
    requestAnimationFrame: () => opts.raf === "count" ? ++raf.n : (++raf.n, opts.raf || 0),
    performance: { now: () => clock.t }, setTimeout: (f, ms) => { clock.timers.push({ f, at: clock.t + (ms || 0) }); return clock.timers.length; }, clearTimeout: () => {},
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { writes.push(k); store[k] = String(v); }, removeItem: k => { writes.push(k); delete store[k]; } } };
  run = loadPage(ctx);
  let KEY; try { KEY = run("SAVE_KEY"); } catch { KEY = undefined; }
  const p = { run, ctx, store, clock, els, writes, errors, raf, KEY,
    get S() { return run("S"); },
    // real time passes: the timers due run in order
    pass(ms) { const end = clock.t + ms; for (;;) { clock.timers.sort((a, b) => a.at - b.at); const n = clock.timers[0]; if (!n || n.at > end) break; clock.timers.shift(); clock.t = n.at; n.f(); } clock.t = end; },
    // one key press, after any input lock has run out
    key(k, n = 1) { for (let i = 0; i < n; i++) { p.pass(400); run("act(" + JSON.stringify(k) + ")"); } },
    sv: () => JSON.parse(store[KEY]),
    // the Station writes its part of the shared save, and the Companion reads it (the page's storage event calls save())
    writeSt(st) { const o = JSON.parse(store[KEY]); o.st = JSON.parse(JSON.stringify(st)); store[KEY] = JSON.stringify(o); run("save()"); },
  };
  return p;
}
