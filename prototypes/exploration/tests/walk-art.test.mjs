// The art desk's walk art (art/walk/, signed in mibi-art ce97d1c19): every placed file is the desk's file byte for byte (against the hashes recorded when it was placed),
// every slot the page names has its file and every file a slot, every pixel is on the core palette, and the page draws the pieces as they are.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { makePage, WALK_ART } from "./page-harness.mjs";

const DIR = new URL("../art/walk/", import.meta.url);
const sha = (buf) => createHash("sha256").update(buf).digest("hex");
const files = readdirSync(DIR).filter((f) => f.endsWith(".png")).sort();
const HASHES = JSON.parse(readFileSync(new URL("SHA256.json", DIR), "utf8"));

test("every placed file equals its recorded hash (copied byte for byte from the desk's signed commit)", () => {
  assert.ok(files.length >= 60, "the files are placed: " + files.length);
  assert.deepEqual(Object.keys(HASHES).sort(), files, "the hash list names exactly the placed files");
  for (const f of files) assert.equal(sha(readFileSync(new URL(f, DIR))), HASHES[f], f + " is not what was placed");
});

test("the page's slots and the placed files are the same set, and every pixel is on the core palette with no partial alpha", () => {
  const p = makePage({ console: "silent", els: true, canvas: true, raf: 1 });
  const names = p.run("WALK_FILES"), want = files.map((f) => f.slice(0, -4)).sort();
  assert.deepEqual([...names].sort(), want, "WALK_FILES names exactly the placed files");
  assert.equal(p.run("WART.ready"), true, "the art read at boot");
  // one palette source: the page's first 48 and the game set palette (palette.json, as baked); the split stone's found marks alone still hold the three sage tones
  const rgb = p.run("RGB"), setPal = JSON.parse(readFileSync(new URL("../../../art/places/sets/ninja-test/palette.json", import.meta.url), "utf8")).colours;
  const ok = new Set([...rgb.slice(0, 48).map((c) => c.join()), ...setPal.map((h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)).join())]), sage = new Set(rgb.slice(48, 51).map((c) => c.join()));
  for (const [n, f] of Object.entries(WALK_ART)) for (let i = 0; i < f.width * f.height; i++) {
    const a = f.data[i * 4 + 3]; assert.ok(a === 0 || a === 255, n + ": partial alpha " + a);
    const k = [f.data[i * 4], f.data[i * 4 + 1], f.data[i * 4 + 2]].join();
    if (a) assert.ok(ok.has(k) || (n.startsWith("mark-splitstone-") && sage.has(k)), n + ": a pixel off the set palette at " + i);
  }
  for (const n of want) assert.ok(p.run("WART.pb.has(" + JSON.stringify(n) + ") || STONE_LOOK.has(" + JSON.stringify(n) + ")"), n + ": not read against the set palette");
});

test("a colour only the set holds reads (the olive meadow ramp), steps by the set's own tables, and a colour off the set is refused", () => {
  const p = makePage({ console: "silent", els: true, canvas: true, raf: 1 });
  const r = JSON.parse(p.run("JSON.stringify((() => { walkRead({ 'olive-probe': { width: 2, height: 1, data: new Uint8ClampedArray([0x79, 0x87, 0x5b, 255, 0x8b, 0x95, 0x61, 255]) } }); const a = WART.pb.get('olive-probe'); return [a.p[0], a.p[1], RGB[a.p[0]], DARK2[a.p[0]], RGB[DARK2[a.p[0]]], RGB[a.p[1]]]; })())"));
  assert.deepEqual(r[2], [0x79, 0x87, 0x5b]); assert.deepEqual(r[5], [0x8b, 0x95, 0x61]);
  assert.notEqual(r[3], r[0], "the night table moves it"); assert.deepEqual(r[4], [0x24, 0x45, 0x23], "to the set's night green");
  assert.throws(() => p.run("walkRead({ 'bad-probe': { width: 1, height: 1, data: new Uint8ClampedArray([1, 2, 3, 255]) } })"), /off the set palette/);
});

// a drawn buffer against the file: the same pixels
function same(p, expr, name) {
  const f = WALK_ART[name], pb = p.run(expr), rgb = p.run("RGB");
  assert.deepEqual([pb.w, pb.h], [f.width, f.height], name + " size");
  for (let i = 0; i < f.width * f.height; i++) {
    if (!f.data[i * 4 + 3]) { assert.equal(pb.p[i], -1, name + " clear at " + i); continue; }
    assert.deepEqual(Array.from(rgb[pb.p[i]]), [f.data[i * 4], f.data[i * 4 + 1], f.data[i * 4 + 2]], name + " at " + i);
  }
}

test("the page draws the desk's pieces as they are: marks and the bubble", () => {
  const p = makePage({ console: "silent", els: true, canvas: true, raf: 1 });
  for (const [land, kind] of [["L.MEADOW", "windstep"], ["L.POND", "reedpool"], ["L.ROCK", "splitstone"], ["L.WOOD", "hollowtree"]])
    for (const state of ["found", "been"]) for (const size of [26, 18, 12]) same(p, `placeMark(${land}, '${state}', ${size})`, `mark-${kind}-${state}-${size}`);
  same(p, "bubbleArt('?')", "bubble-curious-11x13");
});

test("a cliff on the full map runs on the sector's block contour: the desk's face piece, its column at wx mod w, hangs from the block's border row; a stair is the ramp piece at its port", () => {
  const p = makePage({ gen: 7, console: "silent", els: true, canvas: true, raf: 1 });
  p.run("newWorld(14); startExpedition('weather', G.gate); S.exp.fog = null; S.exp.storm = null; for (let c = 0; c < MW * MH; c++) S.revealed[c] = 1;");
  // a horizontal block edge inside one place (never on a place edge): the block above raised, the block below low
  const e = p.run(`(() => { const sec = sectorHere(); for (let c = 0; c < MW * MH; c++) for (let by = 0; by < 3; by++) for (let bx = 0; bx < 4; bx++) { if (sec.lv[c * 16 + by * 4 + bx] === 1 && sec.lv[c * 16 + (by + 1) * 4 + bx] === 0) return [c, bx, by]; } return null; })()`);
  assert.ok(e, "a south-facing block edge on this map");
  p.run("scr.px().fill(-1); drawEdgeMarks({ map: true, cs: CELL, ox: 0, oy: 0, rmOf: () => 0 })");
  const px = p.run("scr").px(), W = p.run("SCR_W"), CELL = p.run("CELL"), MW = p.run("MW"), rgb = p.run("RGB"), face = WALK_ART["edge-cliff-face-26"], u = CELL / 4;
  const [c, bx, by] = e, gx = (c % MW) * 4 + bx, gy = ((c / MW) | 0) * 4 + by, yb = Math.round((gy + 1) * u), x0 = Math.round(gx * u), x1 = Math.round((gx + 1) * u);
  let hung = 0; for (let x = x0; x < x1; x++) {   // per column: the piece's column starts at the block's border row, not displaced
    const fc = x % face.width; let ok = true;
    for (let r = 0; r < face.height && ok; r++) { const o = (r * face.width + fc) * 4; if (!face.data[o + 3]) continue; const v = px[(yb + r) * W + x]; if (v < 0 || Array.from(rgb[v]).join() !== [face.data[o], face.data[o + 1], face.data[o + 2]].join()) ok = false; }
    if (ok) hung++; }
  assert.ok(hung >= (x1 - x0) * 0.6, `the face's column hangs from the block's border in ${hung} of ${x1 - x0} columns`);
  // the stair: the ramp piece's rows stand at the stair's port, on the sector's level line (or the place edge) within two block rows
  const r0 = p.run(`(() => { const sec = sectorHere(); const r = sec.ramps.find(r => S.revealed[r.c] && r.c + MW < MW * MH); return r ? { c: r.c, x: r.x, y: r.y } : null; })()`);
  if (r0) { const rp = WALK_ART["edge-ramp-26"], rx = Math.round(r0.x * CELL / p.run("OCW")) - (rp.width >> 1), ey = (((r0.c / MW) | 0) + 1) * CELL;
    let found = false; for (let y = ey - 2 * u - 2; y <= ey + 2 * u + 2 && !found; y++) { let n = 0, t = 0; for (let j = 0; j < rp.height; j++) for (let i = 0; i < rp.width; i++) { const o = (j * rp.width + i) * 4; if (!rp.data[o + 3]) continue; t++; const v = px[(y + j) * W + rx + i]; if (v >= 0 && Array.from(rgb[v]).join() === [rp.data[o], rp.data[o + 1], rp.data[o + 2]].join()) n++; } if (n / t >= 0.8) found = true; }   // a trail line may cross a few of its pixels
    assert.ok(found, "the ramp piece stands at the stair's port, within two block rows of the place edge"); }
});

test("the land takes the desk's tiles at (wx mod w, wy mod h) for each cell size, and no code stand-in is left for them", () => {
  const p = makePage({ console: "silent", els: true, canvas: true, raf: 1 });
  p.run("newWorld(7)");
  const rgb = p.run("RGB");
  for (const cs of [72, 48, 26]) {
    for (const t of ["meadow", "wood", "rock", "pondrim", "beach", "foam", "water"]) {
      const f = WALK_ART[`map-tex-${t}-${cs}`], pb = p.run(`WART.pb.get('map-tex-${t}-${cs}')`);
      assert.deepEqual([pb.w, pb.h], [f.width, f.height], `${t} ${cs}`);
      for (let i = 0; i < f.width * f.height; i++) assert.deepEqual(Array.from(rgb[pb.p[i]]), [f.data[i * 4], f.data[i * 4 + 1], f.data[i * 4 + 2]], `${t} ${cs} at ${i}`);
    }
  }
  const src = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  for (const gone of ["function edgeMarkPB", "const EDGE_MARK", "i-shimmer", "'pmark:'", "col = C.sand;\n      else if (land === L.MEADOW"]) assert.ok(!src.includes(gone), "a code stand-in is still in the page: " + gone);
});
