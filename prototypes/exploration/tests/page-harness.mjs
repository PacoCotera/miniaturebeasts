// The one harness for the Companion page: its module script runs in a vm sandbox with the browser stubbed, and every
// `import { … } from "./src/<module>.mjs"` line of the page is bound to that module's real exports. The imports are read from the
// page itself, so a new ./src/ module the page imports needs no change here or in any test.
//   import { loadPage, makePage, PAGE, MODULE, SCRIPT } from "./page-harness.mjs";
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";

export const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");
export const MODULE = PAGE.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
export const IMPORT_RE = /^import \{([^}]*)\} from "\.\/src\/([\w-]+)\.mjs";$/gm;
// [module, exported name, name on the page] for every imported name
export const BINDINGS = [...MODULE.matchAll(IMPORT_RE)].flatMap(m => m[1].split(",").map(s => s.trim().split(/\s+as\s+/)).map(([f, t = f]) => [m[2], f, t]));
export const SCRIPT = MODULE.replace(IMPORT_RE, "");
export const MODS = {};
for (const name of new Set(BINDINGS.map(b => b[0]))) MODS[name] = await import(new URL(`../src/${name}.mjs`, import.meta.url));

// Generator 7's tile set, terrain table and pair descriptors, given to the page at once (a browser loads them at boot). No BakedView: the page then draws a baked layout from its tiles,
// as it does a generated one.
const BAKED_DIR = new URL("../../places/baked/", import.meta.url);
const { readTileSet } = await import("../../places/src/format/read.mjs");
const fileBytes = (name) => new Uint8Array(readFileSync(new URL(name, BAKED_DIR)));
export const PLACES = (() => {
  const ts = readTileSet(fileBytes("ninja-test.mbtiles")), terrains = JSON.parse(readFileSync(new URL("terrain.json", BAKED_DIR), "utf8")).terrains;
  const desc = MODS.world7.reviveLayers(JSON.parse(readFileSync(new URL("../art/gen7/layers.json", import.meta.url), "utf8")));
  return { ts, terrains, desc, ctx: { ts, terrains, desc } };
})();

// The art desk's walk art (art/walk/), decoded at once as a browser loads it at boot: { name: { width, height, data (RGBA) } }.
const { decodePNG } = await import("../../ui/png.mjs");
const WALK_DIR = new URL("../art/walk/", import.meta.url);
export const WALK_ART = Object.fromEntries(readdirSync(WALK_DIR).filter((f) => f.endsWith(".png")).map((f) => [f.slice(0, -4), decodePNG(readFileSync(new URL(f, WALK_DIR)))]));

// The look view's marks (art/look/), decoded the same way.
const LOOK_DIR = new URL("../art/look/", import.meta.url);
export const LOOK_ART = Object.fromEntries(readdirSync(LOOK_DIR).filter((f) => f.endsWith(".png")).map((f) => [f.slice(0, -4), decodePNG(readFileSync(new URL(f, LOOK_DIR)))]));

// The quartz stone family (art/stone/), decoded the same way.
const STONE_DIR = new URL("../art/stone/", import.meta.url);
export const STONE_ART = Object.fromEntries(readdirSync(STONE_DIR).filter((f) => f.endsWith(".png")).map((f) => [f.slice(0, -4), decodePNG(readFileSync(new URL(f, STONE_DIR)))]));

// The walk props (art/props/), decoded the same way.
const PROP_DIR = new URL("../art/props/", import.meta.url);
export const PROP_ART = Object.fromEntries(readdirSync(PROP_DIR).filter((f) => f.endsWith(".png")).map((f) => [f.slice(0, -4), decodePNG(readFileSync(new URL(f, PROP_DIR)))]));

// The opening screen's mist and pod (art/open/), decoded the same way.
const OPEN_DIR = new URL("../art/open/", import.meta.url);
export const OPEN_ART = Object.fromEntries(readdirSync(OPEN_DIR).filter((f) => f.endsWith(".png")).map((f) => [f.slice(0, -4), decodePNG(readFileSync(new URL(f, OPEN_DIR)))]));

// The care moments' signed stands (art/moment/), decoded the same way.
const MOMENT_DIR = new URL("../art/moment/", import.meta.url);
export const MOMENT_ART = Object.fromEntries(readdirSync(MOMENT_DIR).filter((f) => f.endsWith(".png")).map((f) => [f.slice(0, -4), decodePNG(readFileSync(new URL(f, MOMENT_DIR)))]));

// Binds the imports into ctx, runs the page script (or a variant of it) there, and returns run(src), which evaluates in the page.
export function loadPage(ctx, script = SCRIPT) {
  ctx.window = ctx; if (ctx.__places === undefined) ctx.__places = PLACES; if (ctx.__walkArt === undefined) ctx.__walkArt = WALK_ART; if (ctx.__lookArt === undefined) ctx.__lookArt = LOOK_ART; if (ctx.__propArt === undefined) ctx.__propArt = PROP_ART; if (ctx.__openArt === undefined) ctx.__openArt = OPEN_ART; if (ctx.__momentArt === undefined) ctx.__momentArt = MOMENT_ART;
  for (const [mod, from, to] of BINDINGS) ctx[to] = MODS[mod][from];
  // The page plays generator 7 only (GENS = [7]). The suites written for generator 5's generated places run on generator 5, which stays frozen in world.mjs: a page opened with
  // `gen: 7` (makePage) or `__gen7: true` (a ctx given to loadPage) is the page as played; any other is that page with generator 5 played too and new worlds of generator 5.
  if (!ctx.__gen7) { ctx.NEW_GEN = 5; ctx.GENS = [...new Set([...MODS.world.GENS, 5])]; }
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

// The colour book a fake canvas reads (P() gives the page's core palette: hex, rgb, of). The art desk's painted pieces carry colours off that palette; a fake canvas drops them
// (index -2) unless `paint` is set, when each new colour gets its own index from 4096 up, clear of anything the page adds to its own palette, so a picture of the screen shows
// the painted props too. rgbTable() lists every index's colour (the core ones and the painted ones) for writing a still.
export function paletteLook(P, paint) {
  const ext = [], extOf = new Map(), EXT = 4096;
  const look = { hex: h => P().hex.get(h) ?? -2, rgbOf: v => v >= EXT ? ext[v - EXT] : P().rgb[v],
    rgb: (r, g, b) => { const k = r << 16 | g << 8 | b, v = P().of.get(k); if (v !== undefined || !paint) return v ?? -2;
      let e = extOf.get(k); if (e === undefined) { e = EXT + ext.length; ext.push([r, g, b]); extOf.set(k, e); } return e; } };
  return { look, rgbTable: () => { const t = P().rgb.slice(); ext.forEach((c, i) => { t[EXT + i] = c; }); return t; } };
}

// The standard page. opts:
//   store    the localStorage object (default {})
//   console  "real" (default), "silent", or "collect" (errors go to p.errors, the rest is silent)
//   els      true: document.getElementById answers one stub element for each id (p.els)
//   raf      what requestAnimationFrame returns: 0 (default), 1, or "count" (1, 2, 3 … ; p.raf.n counts the calls)
//   canvas   true: document.createElement("canvas") gives a fakeCanvas, so a drawing can be read back (p.run("scr").px())
//   paint    true (with canvas): the painted props' off-palette colours are kept on the fake canvas (see paletteLook; p.rgbTable() for a still)
//   date     a number: the page's Date stands still at that many ms (new Date() and Date.now()); default is the real clock
// Returns { run, ctx, store, clock, els, writes, errors, raf, KEY, S, pass(ms), key(k, n), sv(), writeSt(st) }.
// Timers wait on the clock: pass(ms) runs the ones that fall due, in order.
export function makePage(opts = {}) {
  const store = opts.store || {};
  const els = {}, elStub = () => new Proxy({}, { get: (t, k) => k in t ? t[k] : any, set: (t, k, v) => { t[k] = v; return true; } });
  let run = null, pal = null;
  const P = () => pal || (pal = { hex: new Map(run("HEX").map((h, i) => [h, i])), rgb: run("RGB"), of: new Map(run("RGB").map((c, i) => [c[0] << 16 | c[1] << 8 | c[2], i])) });
  const { look, rgbTable } = paletteLook(P, opts.paint);
  const document = opts.els || opts.canvas ? new Proxy(any, { get: (t, k) => k === "getElementById" && opts.els ? id => els[id] || (els[id] = elStub()) : k === "createElement" && opts.canvas ? tag => tag === "canvas" ? fakeCanvas(look) : any : any }) : any;
  const clock = { t: 1000, timers: [] }, writes = [], errors = [], raf = { n: 0 };
  const silent = { log() {}, warn() {}, error() {} };
  const cons = opts.console === "silent" ? silent : opts.console === "collect" ? { ...silent, error: e => errors.push(e) } : console;
  const D = opts.date == null ? Date : class extends Date { constructor(...a) { super(...(a.length ? a : [opts.date])); } static now() { return opts.date; } };
  const ctx = { __gen7: opts.gen === 7, console: cons, URLSearchParams, Date: D, fetch: () => new Promise(() => {}), document, location: any, navigator: any,
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }), addEventListener: () => {}, innerWidth: 450, innerHeight: 600,
    requestAnimationFrame: () => opts.raf === "count" ? ++raf.n : (++raf.n, opts.raf || 0),
    performance: { now: () => clock.t }, setTimeout: (f, ms) => { clock.timers.push({ f, at: clock.t + (ms || 0) }); return clock.timers.length; }, clearTimeout: () => {},
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { writes.push(k); store[k] = String(v); }, removeItem: k => { writes.push(k); delete store[k]; } } };
  run = loadPage(ctx);
  let KEY; try { KEY = run("SAVE_KEY"); } catch { KEY = undefined; }
  const p = { run, ctx, store, clock, els, writes, errors, raf, KEY,
    get S() { return run("S"); },
    rgbTable,
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
