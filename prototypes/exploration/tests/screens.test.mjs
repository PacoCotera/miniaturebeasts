// The Companion's screens that agree (the start-pick header, the strike stone, the bottom line after a Call, the fresh
// "Your world" box, the focus brackets) and the shell's keys: the page in a sandbox with a palette-index canvas, as in
// world.test.mjs, its drawing calls recorded where a check needs them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";
import * as W from "../src/world.mjs";
import * as A from "../src/atlas.mjs";
import * as V from "../src/view.mjs";

// The page in a sandbox, as in freeze.test.mjs: the module script with its import bound to the real module's exports.
const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const MODULE = PAGE.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
// every `import { … } from "./src/<module>.mjs"` line of the page, bound to that module's exports
const MODS = { world: W, view: V, atlas: A };
const IMPORT_RE = /^import \{([^}]*)\} from "\.\/src\/(\w+)\.mjs";$/gm;
const BINDINGS = [...MODULE.matchAll(IMPORT_RE)].flatMap(m => m[1].split(",").map(s => s.trim().split(/\s+as\s+/)).map(([f, t = f]) => [m[2], f, t]));
const SCRIPT = MODULE.replace(IMPORT_RE, "");
// A canvas that keeps palette indices (-1 transparent): fillRect, drawImage (2, 4 and 8 arguments, nearest), image data; clips are ignored.
function fakeCanvas(look) {
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
// `search` is the page's query string; the page's elements record their listeners (els[id].on.click). opts.canvas: canvases are
// fakeCanvas, so a drawing can be read back (p.run("scr").px()).
function page(store = {}, search, opts = {}) {
  const any = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => "" : k === Symbol.iterator ? function* () {} : k === "then" ? undefined : any,
    apply: () => any, construct: () => any, set: () => true });
  const els = {}, elStub = () => { const on = {}; return new Proxy(function () {}, { get: (t, k) => k === "addEventListener" ? (e, f) => { on[e] = f; } : k === "on" ? on : any[k], apply: () => any, set: () => true }); };
  let run = null, pal = null; const P = () => pal || (pal = { hex: new Map(run("HEX").map((h, i) => [h, i])), rgb: run("RGB"), of: new Map(run("RGB").map((c, i) => [c[0] << 16 | c[1] << 8 | c[2], i])) });
  const look = { hex: h => P().hex.get(h) ?? -2, rgbOf: v => P().rgb[v], rgb: (r, g, b) => P().of.get(r << 16 | g << 8 | b) ?? -2 };
  const document = new Proxy(any, { get: (t, k) => k === "getElementById" ? id => els[id] || (els[id] = elStub()) : k === "createElement" && opts.canvas ? tag => tag === "canvas" ? fakeCanvas(look) : any : any[k] });
  const clock = { t: 1000, timers: [] };
  const ctx = { console, URLSearchParams, Date, fetch: () => new Promise(() => {}), document, location: search ? { search, reload() {} } : any, navigator: any,
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }), requestAnimationFrame: () => 0, addEventListener: () => {}, innerWidth: 450, innerHeight: 600,
    performance: { now: () => clock.t }, setTimeout: (f, ms) => { clock.timers.push({ f, at: clock.t + (ms || 0) }); return clock.timers.length; }, clearTimeout: () => {},
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
  ctx.window = ctx; for (const [mod, from, to] of BINDINGS) ctx[to] = MODS[mod][from]; vm.createContext(ctx);
  run = src => vm.runInContext(src, ctx); run(SCRIPT);
  return { run, store, els, KEY: run("SAVE_KEY") };
}

// How a sprite sits on the drawn frame at (x, y): its opaque pixels counted (n) and those the frame differs on (off); `inside` limits the sprite's area.
function sprite(p, expr, x0, y0, inside = () => true) {
  const pb = p.run(expr), cv = pb.canvas(), sp = cv.px(), f = p.run("scr").px(), SW = p.run("SCR_W"); let n = 0, off = 0;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) { const v = sp[y * cv.width + x]; if (v < 0 || !inside(x, y)) continue; n++; if (f[(y0 + y) * SW + x0 + x] !== v) off++; }
  return { n, off };
}
// A new world with one grown mibi with you; `rec` wraps the named page functions so their calls are recorded.
function world(seed = 1) {
  const p = page({}, undefined, { canvas: true });
  p.run(`newWorld(${seed}); S.mibis.push({ id: 1, name: 'Dot', sp: 0, born: -9, outings: 0, notches: 0, bonded: false, care: 0, tends: 0, tendDay: null, grownTurn: null }); S.carried = [1]; save();`);
  p.run("var __rec = []; function __wrap(n) { const f = globalThis[n]; globalThis[n] = function (...a) { const r = f.apply(this, a); __rec.push({ n, a, r }); return r; }; }");
  p.rec = (...names) => { for (const n of names) p.run(`__wrap(${JSON.stringify(n)})`); };
  p.calls = n => p.run(`__rec.filter(c => c.n === ${JSON.stringify(n)})`);
  p.clear = () => p.run("__rec.length = 0");
  p.key = k => p.run(`FX.lockUntil = 0; act(${JSON.stringify(k)})`);
  return p;
}
// Into the first place of a Weather expedition at the first glint, the pawn facing nothing (✓ is Wait).
function inPlace() {
  const p = world();
  p.key("confirm"); p.key("confirm"); assert.ok(p.run("S.exp"), "the expedition started");
  p.key("confirm"); assert.equal(p.run("S.phase"), "patch", "in a place");
  for (const d of ["down", "up", "left", "right"]) { if (p.run("patchAction() === NOTHING")) break; p.run(`S.exp.patch.face = ${JSON.stringify(d)}; S.exp.face = ${JSON.stringify(d)}`); }
  assert.equal(p.run("patchAction() === NOTHING"), true, "facing nothing: ✓ is Wait");
  return p;
}

test("C6: the place's Call help is the copywriter's line, 268 px at 2×", () => {
  const p = world(), s = "Call lifts the veil, lights finds";
  assert.match(PAGE, /fxOnce\('callplace', 'Call lifts the veil, lights finds', 2\)/);
  assert.equal(p.run(`textW(${JSON.stringify(s)}, 2)`), 268);
  assert.doesNotMatch(PAGE, /The teal CALL button/);
});

test("start-pick header at T10: 'Expedition N' and the note, unclipped up to Expedition 999; Weather's bolt 4 px before the note", () => {
  const p = world();
  p.rec("text", "drawTop");
  for (const [type, revealed, note] of [["weather", false, "storm start"], ["deep", false, "pick a start"], ["deep", true, "any seen cell"]]) {
    for (const n of [1, 12, 999]) {
      p.run(`S.turn = 9; S.expN = ${n}; S.ui.type = '${type}'; S.ui.cur = G.spawns[0]; S.revealed.fill(0); ${revealed ? "S.revealed[G.spawns[0]] = 1;" : ""} S.phase = 'place'; FX.msg = '';`);
      p.clear(); p.run("render(0)");
      assert.equal(p.run("'T' + wTurn()"), "T10");
      const top = p.calls("drawTop")[0], rx = top.r, title = "Expedition " + n;
      assert.deepEqual([top.a[0], top.a[1]], [title, note], `${type} ${n}: the title drops its type word`);
      const drawn = p.calls("text").find(c => c.a[1] === rx && c.a[2] === 9);
      assert.equal(drawn && drawn.a[0], note, `${type} ${n}: the note unclipped`);
      const noteW = p.run(`textW(${JSON.stringify(note)}, 2)`), titleEnd = 10 + p.run(`textW(${JSON.stringify(title)}, 2)`);
      const bx = rx - noteW - 16, bolt = sprite(p, "ICON.bolt('mist')", bx, 8);
      if (type === "weather") { assert.ok(bolt.n > 40 && bolt.off === 0, `${n}: the mist bolt at (rx − noteW − 16, 8)`); assert.ok(bx > titleEnd + 4, `${n}: the bolt clears the title`); }
      else { assert.ok(bolt.off > 0, "Deep ground has no icon"); assert.ok(rx - noteW > titleEnd + 4, `${n}: the note clears the title`); }
    }
  }
  assert.doesNotMatch(PAGE, /dotted: storm start/);
});

test("Probe legend: the four stone tiles on grass; the strike tile draws the plain stone under its outline", () => {
  const p = world();
  p.run("S.phase = 'probe'"); p.rec("panel"); p.clear(); p.run("scr.px().fill(-1); render(0)");
  const rec = p.run("__rec"), grass = p.run("C.grass"), sand = p.run("C.sand");
  const tiles = rec.filter(c => c.n === "panel" && c.a[1] === 442 && c.a[2] === 34 && c.a[3] === 34);
  assert.deepEqual([...tiles.map(c => c.a[0])], [50, 154, 258, 362]);
  assert.ok(tiles.every(c => c.a[4] === grass && c.a[4] !== sand), "grass, not sand");
  // the strike tile (362, 442): inside the 2 px outline, the plain stone's pixels; the outline itself in yellow, drawn over it
  const st = sprite(p, "stoneArt(0, false, 0)", 363, 443, (x, y) => x >= 2 && y >= 2 && x < 30 && y < 30);
  assert.ok(st.n > 100 && st.off === 0, `the plain stone at (x + 1, y + 1) under the outline (${st.off} of ${st.n} differ)`);
  const f = p.run("scr").px(), SW = p.run("SCR_W"), yel = p.run("C.yellow");
  for (const [x, y] of [[363, 443], [394, 443], [363, 474], [394, 474], [378, 443], [363, 458]]) assert.equal(f[y * SW + x], yel, `outline at ${x},${y}`);
  const pl = sprite(p, "stoneArt(0, false, 0)", 51, 443); assert.equal(pl.off, 0, "the plain tile as built");
});

test("bottom line in a place: the candidates keep the place name before the take kinds go; after a Call the name stays with Wait · Leave", () => {
  const p = inPlace();
  p.run("leftTotal = () => 2; takeKinds = () => ['charge', 'warm stone']; S.exp.patch && (curLay().land = curLay().land);");
  const land = p.run("LAND_NAME[curLay().land]"), L = p.run("lineFor()");
  assert.equal(L.ok, "Wait"); assert.equal(L.back, "Leave");
  const sv = p.run("placeState(curLay().cell)"), svN = p.run("placeState(curLay().cell, false, true)"), short = p.run("placeState(curLay().cell, true)");
  assert.match(sv, /2 to take: charge · warm stone$/); assert.match(svN, /2 to take$/);
  assert.deepEqual(JSON.parse(JSON.stringify(L.ctx)).map(c => c.replace("\x01", "")).map(c => c.replace(/ · (lull|overcast)$/, "")), [land + " · " + sv, land + " · " + svN, svN, short]);
  // after a Call, drawn: the name and the count stay (the kinds drop first)
  p.key("call"); p.run("S.phase = 'patch'; FX.msg = ''; leftTotal = () => 2; takeKinds = () => ['charge', 'warm stone'];");
  const L2 = p.run("lineFor()"); assert.equal(L2.ok, "Wait");
  // drawn, in a meadow (the ruling's case, "meadow · not surveyed · 2 to take" at 276 px against 291): the name and the count stay, the kinds drop
  p.run("curLay().land = 0"); p.rec("text"); p.clear(); p.run("drawLine(lineFor())");
  const said = p.calls("text").map(c => c.a[0]).join("|");
  assert.match(said, /\|meadow · \|not surveyed · 2 to take$/, "the place name stays: " + said);
  // and whatever the land, a candidate with the name is drawn whenever it fits
  for (let k = 0; k < 4; k++) { p.run(`curLay().land = ${k}`); const c = p.run("lineFor().ctx[1]").replace("\x01", ""), fits = p.run(`textWT(${JSON.stringify(c)}, 2)`) <= 291;
    p.clear(); p.run("drawLine(lineFor())"); const d = p.calls("text").map(c => c.a[0]).join("");
    assert.equal(d.includes(p.run(`LAND_NAME[${k}]`)), fits, `${p.run(`LAND_NAME[${k}]`)}: the name drawn iff "${c}" fits`); }
});

test("focus brackets: none on the empty tile when ✓ is Wait; shown on a thing Confirm acts on", () => {
  const p = inPlace();
  p.rec("brackets"); p.clear(); p.run("FX.msg = ''; render(0)");
  const amber = p.run("C.amber"), f = p.run("frontOf(S.exp.patch)");
  const onFront = () => p.calls("brackets").filter(c => c.a[4] === amber && c.a[2] === c.a[3]);
  assert.equal(onFront().length, 0, "no brackets when ✓ is Wait");
  p.run("const __pa = patchAction; patchAction = () => ({ label: 'Take the pod', run: () => {} });"); p.clear(); p.run("render(0)");
  assert.equal(onFront().length, 1, "brackets on a thing Confirm acts on");
  assert.ok(f);
});

test("the fresh 'Your world' box draws its unseen cells from the map's fog layer, not flat night", () => {
  const p = world();
  p.run("S.revealed.fill(0); S.visited.fill(0); ensureMap(); scr.px().fill(-1); drawWorldInset(100, 100, 0, 6);");
  const f = p.run("scr").px(), fog = p.run("fogCv"), fp = fog.px(), SW = p.run("SCR_W"), MW_ = p.run("MW"), MH_ = p.run("MH"), CELL_ = p.run("CELL"), u = 6;
  let diff = 0, night = 0; const nightI = p.run("HEX.indexOf(C.night)"), N = MW_ * MH_ * u * u;
  for (let c = 0; c < MW_ * MH_; c++) for (let j = 0; j < u; j++) for (let i = 0; i < u; i++) {
    const x = 100 + (c % MW_) * u + i, y = 100 + Math.floor(c / MW_) * u + j, want = fp[(Math.floor(c / MW_) * CELL_ + Math.floor(j * CELL_ / u)) * fog.width + (c % MW_) * CELL_ + Math.floor(i * CELL_ / u)];
    const got = f[y * SW + x]; if (got !== want) diff++; if (got === nightI) night++; }
  assert.ok(diff <= N * 0.02, `the fog layer, cell for cell (${diff} of ${N} pixels differ: the pins, outposts and the last start draw over it)`);
  assert.ok(night < N * 0.5, "not a flat night square");
});

// ---- the shell ----
test("shell: no engravings, the brand line kept, the key icons in their inks, Call as built", () => {
  assert.doesNotMatch(PAGE, /class="engrave"|\.engrave\b/, "no engraving element or rule");
  assert.doesNotMatch(PAGE, />CONFIRM</);
  assert.match(PAGE, /<div class="brand">MINIATURE BEASTS<span>COMPANION<\/span><\/div>/, "the brand line on top stays");
  for (const k of ["Up", "Left", "Right", "Down", "Call", "Back", "Confirm"]) assert.match(PAGE, new RegExp(`aria-label="${k}"`), k + ": aria-label kept");
  assert.match(PAGE, /\.dpad \.key svg\{width:16px; height:16px; fill:#f4f1ec\}/, "pad ink");
  assert.match(PAGE, /\.back\{[^}]*background:#33363b;/, "Back's cap");
  assert.match(PAGE, /\.back \.cap-ico\{background:#f4f1ec; mask: url\(shell\/cap-back-10mm\.png\) center \/ 36px 36px no-repeat luminance\}/, "Back's icon and ink");
  assert.match(PAGE, /\.confirm \.cap-ico\{background:#ffffff; mask: url\(shell\/cap-confirm-10mm\.png\) center \/ 36px 36px no-repeat luminance\}/, "Confirm's icon and ink");
  assert.match(PAGE, /\.confirm\{[^}]*var\(--orange\)/, "Confirm's cap as built");
  assert.match(PAGE, /\.call\{[^}]*#26b5a4[^}]*\}/, "Call's teal cap as built");
  assert.match(PAGE, /\.call svg\{width:26px; height:26px; stroke:#eafff9;/, "Call's icon as built");
  assert.match(PAGE, /aria-label="Call"><svg viewBox="0 0 26 26">/, "Call keeps its SVG");
});
test("shell: the Back and Confirm icons are the signed masters, byte for byte", () => {
  const man = JSON.parse(readFileSync(new URL("../../../art/device-buttons/caps/manifest.json", import.meta.url), "utf8"));
  for (const id of ["cap-back-10mm", "cap-confirm-10mm"]) {
    const e = man.find(m => m.id === id); assert.equal(e.status, "signed");
    const placed = readFileSync(new URL(`../shell/${id}.png`, import.meta.url)), master = readFileSync(new URL(`../../../art/device-buttons/caps/${id}.png`, import.meta.url));
    assert.equal(createHash("sha256").update(placed).digest("hex"), e.sha256, id + ": the manifest's hash");
    assert.ok(placed.equals(master), id + ": byte-identical to the master");
  }
});
