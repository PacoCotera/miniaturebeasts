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
  const rgb = p.run("RGB"), core = new Set(rgb.slice(0, 51).map((c) => c.join()));
  for (const [n, f] of Object.entries(WALK_ART)) for (let i = 0; i < f.width * f.height; i++) {
    const a = f.data[i * 4 + 3]; assert.ok(a === 0 || a === 255, n + ": partial alpha " + a);
    if (a) assert.ok(core.has([f.data[i * 4], f.data[i * 4 + 1], f.data[i * 4 + 2]].join()), n + ": a pixel off the core palette at " + i);
  }
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

test("a south-facing cliff on the full map: the desk's face piece, its column at wx mod w, hangs from the displaced border, not the straight cell line; a stair is the ramp piece on its span", () => {
  const p = makePage({ console: "silent", els: true, canvas: true, raf: 1 });
  p.run("newWorld(14); startExpedition('weather', G.gate); S.exp.fog = null; S.exp.storm = null; for (let c = 0; c < MW * MH; c++) S.revealed[c] = 1;");
  const edge = (kind, hi) => p.run(`(() => { for (let c = 0; c < MW * (MH - 1); c++) { if (edgeKind(c, 'down') === ${kind} && !(G.soft && (G.soft.scree[edgeIndex(c, 'down')] || (G.banks && G.banks[edgeIndex(c, 'down')]))) && (!${hi} || G.level[c] > G.level[c + MW])) return [c, c + MW]; } return null; })()`);
  const cl = edge("EDGE.CLIFF", true), ramp = edge("EDGE.RAMP", false);
  assert.ok(cl, "a south-facing cliff on this map"); assert.ok(ramp, "a stair on this map");
  const draw = () => { p.run("scr.px().fill(-1); drawEdgeMarks({ map: true, cs: CELL, ox: 0, oy: 0, rmOf: () => 0 })"); return p.run("scr").px(); };
  const W = p.run("SCR_W"), CELL = p.run("CELL"), face = WALK_ART["edge-cliff-face-26"], rgb = p.run("RGB");
  const px = draw(), B = Array.from(cl)[1];
  const MW = p.run("MW"), bx = (B % MW) * CELL, by = ((B / MW) | 0) * CELL;
  let hung = 0, moved = 0;
  for (let x = bx + 1; x < bx + CELL - 1; x++) {   // per column: the piece's column, wherever it starts within 6 px of the cell line
    const fc = (x % face.width), want = []; for (let r = 0; r < face.height; r++) { const o = (r * face.width + fc) * 4; want.push(face.data[o + 3] ? [face.data[o], face.data[o + 1], face.data[o + 2]].join() : null); }
    let at = -1; for (let y = by - 7; y <= by + 7 && at < 0; y++) { let ok = true; for (let r = 0; r < want.length && ok; r++) { const v = px[(y + r) * W + x]; if (want[r] && (v < 0 || Array.from(rgb[v]).join() !== want[r])) ok = false; } if (ok) at = y; }
    if (at >= 0) hung++; if (at >= 0 && at !== by) moved++;
  }
  assert.ok(hung >= CELL - 6, `the face's column hangs from the border in ${hung} of ${CELL - 2} columns`);
  assert.ok(moved > 0, "the border is the displaced one: some columns start off the straight cell line");
  // the stair: the ramp piece's rows are drawn at the span's centre, and no face column stands under it
  const rp = WALK_ART["edge-ramp-26"], [, RB] = Array.from(ramp), rx = (RB % MW) * CELL + 9, ry = ((RB / MW) | 0) * CELL;
  let found = false; for (let y = ry - 7; y <= ry + 7 && !found; y++) { let ok = true; for (let j = 0; j < rp.height && ok; j++) for (let i = 0; i < rp.width && ok; i++) { const o = (j * rp.width + i) * 4; if (!rp.data[o + 3]) continue; const v = px[(y + j) * W + rx + i]; if (v < 0 || Array.from(rgb[v]).join() !== [rp.data[o], rp.data[o + 1], rp.data[o + 2]].join()) ok = false; } found = ok; }
  assert.ok(found, "the ramp piece sits on its span, within 6 px of the cell line");
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
