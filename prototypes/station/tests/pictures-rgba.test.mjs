// Pictures are {w, h, rgba()} (ui/assets.mjs): RGBA bytes with straight alpha, with no canvas. In Node there is no document, so a picture that answers rgba() here touched none.
//   node --test prototypes/station/tests/
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { PB, C, RGB } from "../src/pixels.mjs";
import { figureFromLayers } from "../src/podmasters.mjs";
import { registerAsset, asset, dropAsset } from "../../ui/assets.mjs";
import { beamArt, UNREAD_REGION, treatmentOf, builtOf, founderArt, drawnDigest, mibiArt } from "../src/art.mjs";
import { typeSpecimen, genomeDigest } from "../../workbench/framework/species.mjs";
import { fitCamera } from "../../workbench/framework/raster.mjs";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { standLook, juvenileSize } from "../src/stands.mjs";
import { treat, UNKNOWN } from "../src/unknown.mjs";
import { homeBuild, mibiPictureOf } from "../src/views/home-props.mjs";
import { habitatBuild } from "../src/views/habitat-props.mjs";
import { vivariumBuild } from "../src/views/vivarium-props.mjs";

test("a palette buffer is RGBA: its colours from the palette, opaque, a clear cell 0,0,0,0", () => {
  const pb = new PB(3, 1); pb.set(1, 0, C.amber); const d = pb.rgba();
  assert.ok(d instanceof Uint8ClampedArray); assert.equal(d.length, 12);
  assert.deepEqual([...d.slice(0, 4)], [0, 0, 0, 0]); assert.deepEqual([...d.slice(4, 8)], [...RGB[C.amber], 255]); assert.deepEqual([...d.slice(8, 12)], [0, 0, 0, 0]);
});
test("a figure whose layers are not placed is an empty RGBA picture of its size, with no canvas; the asset manifest hands pictures over by rgba()", () => {
  const f = figureFromLayers("t:mist", "t:clear", 1, [4, 3]); assert.equal(f.w, 4); assert.equal(f.rgba().length, 48); assert.ok(f.rgba().every((v) => v === 0));
  registerAsset({ id: "t:rgba", w: 2, h: 2, status: "placeholder", build: () => { const pb = new PB(2, 2); pb.set(0, 0, C.sky); return pb; } });
  const a = asset("t:rgba"); assert.deepEqual([a.w, a.h, a.rgba().length], [2, 2, 16]); assert.deepEqual([...a.rgba().slice(0, 4)], [...RGB[C.sky], 255]); dropAsset("t:rgba");
});
test("the beam moved to art.mjs: a cone of one colour on its own size", () => {
  const b = beamArt(40, 30), d = b.rgba(); assert.deepEqual([b.w, b.h], [40, 30]);
  const row = (y) => [...Array(40).keys()].filter((x) => d[(y * 40 + x) * 4 + 3]); assert.ok(row(0).length < row(29).length, "the cone widens downwards"); assert.deepEqual([...d.slice((29 * 40 + 20) * 4, (29 * 40 + 20) * 4 + 3)], RGB[C.tealD]);
});

// ---- Station M1 §1.2, §1.5, §2.6: a moving set's atlas, composed by the host ----
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setMoving, compose, cellsOf, atlasIsMaster, playable, registerMoving, movingIds } from "../src/moving.mjs";
import { placeMaster, assetEntry } from "../../ui/assets.mjs";
const MV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/specs/station/moving"), sets = {};
for (const id of JSON.parse(readFileSync(path.join(MV, "index.json"), "utf8")).sets) sets[id] = JSON.parse(readFileSync(path.join(MV, id + ".json"), "utf8"));
setMoving(sets);
// a stand whose every pixel says where it is (x, y), so a shift or a mirror is read exactly
const coded = (w, h) => { const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set([x & 255, y & 255, 77, 255], (y * w + x) * 4); return { w, h, rgba: () => d }; };
const src = { stand: (sp, st, w, h) => coded(w, h), nap: () => coded(96, 88) };
const px = (p, x, y) => Array.from(p.rgba().slice((y * p.w + x) * 4, (y * p.w + x) * 4 + 4));
test("an atlas (M1 §1.2): one row, a clear 1 px column, then the cells in the set's order at 1 + i·w; the width 1 + n·w", () => {
  const id = movingIds("S01", "juvenile").walk, a = compose(id, src), cells = cellsOf("S01", "juvenile", "walk", 104, 112);
  assert.equal(cells.length, 12); assert.deepEqual([a.w, a.h], [1 + 12 * 104, 112]);
  for (let y = 0; y < 112; y++) assert.equal(px(a, 0, y)[3], 0, "the gutter column is clear");
  assert.deepEqual(cells.slice(0, 7).map((c) => c.name), ["stand", "stand-b1", "stand-b2", "crouch", "air", "curl", "curl-b1"]); assert.ok(cells.slice(7).every((c) => c.mirror));
  assert.deepEqual(px(a, 1 + 0 * 104 + 10, 20), [10, 20, 77, 255], "cell 0, the stand as it is");
});
test("the stand-ins (M1 §1.5): b1 and b2 move rows 0..(h − 25) up 1 and 2 px with the feet fixed; the crouch moves down 2; air is the stand; the curl is the nap stand-in bottom-centred, curl·b1 its rows above the last 12 up 1", () => {
  const a = compose(movingIds("S01", "juvenile").walk, src), cell = (i) => (x, y) => px(a, 1 + i * 104 + x, y);
  assert.deepEqual(cell(1)(10, 20).slice(0, 2), [10, 21], "b1: row 20 shows row 21"); assert.deepEqual(cell(1)(10, 100).slice(0, 2), [10, 100], "b1: the feet stay");
  assert.deepEqual(cell(2)(10, 20).slice(0, 2), [10, 22], "b2: up 2"); assert.deepEqual(cell(3)(10, 20).slice(0, 2), [10, 18], "the crouch: down 2"); assert.equal(cell(3)(10, 1)[3], 0, "the crouch's top two rows are clear");
  assert.deepEqual(cell(4)(10, 20), cell(0)(10, 20), "air is the stand");
  assert.deepEqual(cell(5)(4, 24).slice(0, 2), [0, 0], "the curl: the 96 × 88 stand-in at x 4, y 24 (bottom-centred)"); assert.equal(cell(5)(3, 30)[3], 0, "clear beside it");
  assert.deepEqual(cell(6)(4 + 10, 24 + 5).slice(0, 2), [10, 6], "curl·b1: up 1 above its last 12 rows"); assert.deepEqual(cell(6)(4 + 10, 24 + 80).slice(0, 2), [10, 80], "its last 12 rows stay");
});
test("mirrors (M1 §1.2): each mirror is its cell with every row reversed, exact by pixel", () => {
  const a = compose(movingIds("S01", "adult").walk, src), w = 144, nb = 7;
  for (let k = 0; k < 5; k++) for (const [x, y] of [[0, 0], [10, 40], [143, 151], [70, 3]]) assert.deepEqual(px(a, 1 + (nb + k) * w + (w - 1 - x), y), px(a, 1 + k * w + x, y), `mirror of cell ${k} at ${x},${y}`);
});
test("the shadow (M1 §1.5, the art director's Q6): a flat ellipse of #1e1a22 at alpha 110, and shadow-75 its alpha × 3 / 4 rounded down", () => {
  const a = compose(movingIds("S01", "juvenile").shadow, src); assert.deepEqual([a.w, a.h], [1 + 2 * 104, 16]);
  assert.deepEqual(px(a, 1 + 52, 8), [0x1e, 0x1a, 0x22, 110]); assert.equal(px(a, 1 + 0, 0)[3], 0, "outside the ellipse");
  assert.deepEqual(px(a, 1 + 104 + 52, 8), [0x1e, 0x1a, 0x22, Math.floor(110 * 3 / 4)]);
});
test("status (M1 §1.5): an atlas is a placeholder while any cell is a stand-in, a master when every cell is a placed master; the play gate opens only then", () => {
  const id = movingIds("S05", "juvenile").nap; assert.equal(atlasIsMaster(id), false); assert.equal(playable("S05", "juvenile"), false);
  registerMoving(id, src); assert.equal(assetEntry(id).status, "placeholder");
  for (const c of cellsOf("S05", "juvenile", "nap", 96, 88)) placeMaster({ id: c.master, w: 96, h: 88, file: c.master + ".png", hash: "0".repeat(64), signed: "test", status: "master" }, coded(96, 88));
  assert.equal(atlasIsMaster(id), true, "every nap cell placed: the nap atlas is a master"); assert.equal(playable("S05", "juvenile"), false, "the set plays only when every atlas is");
  assert.throws(() => compose(id, src, [{ layer: "x" }]), /layers are composed in the bake slot/);
});


// ---- Fix 1b part 2: the founder's unread treatment keyed on the chapter (art.mjs) ----
{
  const frames = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../workbench/frames");
  const frameOf = (s) => JSON.parse(readFileSync(path.join(frames, `species-${s}.json`), "utf8"));
  const allBut = (fr, ...ids) => fr.chapters.map((c) => c.id).filter((id) => !ids.includes(id));
  const view = (fr) => { const b = builtOf(fr, typeSpecimen(fr)); return { scene: b.scene, camera: fitCamera(b.scene, "portrait", [300, 310], 0.06) }; };

  test("the table names every chapter of every frame, and an unknown chapter throws", () => {
    for (const s of ["S01", "S03", "S09", "S13", "S14", "S15", "S16"]) for (const c of frameOf(s).chapters) assert.ok(c.id in UNREAD_REGION, `${s} ${c.id}`);
    const fr = frameOf("S01");
    assert.throws(() => treatmentOf({ ...fr, chapters: [...fr.chapters, { id: "bogus", traits: [] }] }, ["coat"]), /bogus/);
    assert.throws(() => treatmentOf(fr, ["coat", "bogus"]), /bogus/);
  });

  test("nothing read is a ghost; everything read is clear", () => {
    const fr = frameOf("S15");
    assert.deepEqual(treatmentOf(fr, []), { mode: "ghost", boxes: [], groups: [], luma: false });
    assert.deepEqual(treatmentOf(fr, new Set(allBut(fr))), { mode: "clear", boxes: [], groups: [], luma: false });
  });

  test("Movement, Stamina, Character, Glow and Charge unread draw nothing: clear (Movement traits draw nothing)", () => {
    for (const [s, ids] of [["S15", ["movement"]], ["S13", ["movement", "stamina", "character"]], ["S16", ["glow", "charge", "character"]]]) {
      const fr = frameOf(s); assert.deepEqual(treatmentOf(fr, allBut(fr, ...ids)), { mode: "clear", boxes: [], groups: [], luma: false }, s);
    }
  });

  test("S13's wing-cases are Shape: unread Shape veils the whole body", () => {
    const fr = frameOf("S13"); assert.ok(fr.chapters.find((c) => c.id === "shape").traits.some((t) => t.id === "wing-cases"));
    assert.deepEqual(treatmentOf(fr, allBut(fr, "shape"), view(fr)).boxes.map((b) => b.whole), [true]);
    assert.equal(treatmentOf(fr, allBut(fr, "shape")).mode, "veil");
  });

  test("S15's rays are the leg group, its tail is the tail group; S14's skirt and S15's leaves are Shape, the whole body; a group with no part on the drawn body leaves the id", () => {
    const s15 = frameOf("S15"), all = treatmentOf(s15, allBut(s15, "legs-tail")), drawn = treatmentOf(s15, allBut(s15, "legs-tail"), view(s15).scene);
    assert.deepEqual(all.boxes.map((b) => b.parts), [["leg", "ray"], ["tail"]], "no body given: both groups"); assert.deepEqual(all.groups, ["leg", "tail"]);
    assert.equal(drawn.mode, "veil"); assert.deepEqual(drawn.groups, ["leg"], "S15 has rays and no tail part: the tail group leaves the id"); assert.deepEqual(drawn.boxes.map((b) => b.parts), [["leg", "ray"]]);
    assert.deepEqual(treatmentOf(s15, allBut(s15, "shape")).boxes, [{ whole: true }], "S15 leaves");
    const s14 = frameOf("S14"); assert.ok(s14.chapters.find((c) => c.id === "shape").traits.some((x) => x.id === "skirt"));
    assert.deepEqual(treatmentOf(s14, allBut(s14, "shape")).boxes, [{ whole: true }], "S14 skirt");
    const sc = view(s14).scene, skirt = sc.nodes.find((n) => n.id === "foot-skirt");
    assert.ok(skirt && !["leg", "ray"].some((q) => (skirt.part ?? skirt.id) === q || (skirt.part ?? skirt.id).startsWith(q + "-")), "the foot-skirt is not in the leg group");
    const s16 = frameOf("S16"); assert.deepEqual(treatmentOf(s16, allBut(s16, "face"), view(s16).scene).groups, ["face"], "S16 has a head and no leg or tail part");
  });
  test("the part groups are named in their declared order (face, leg, tail), not the frame's chapter order; Shape and Face give veil-body, never veil-body+face; with no group left the treatment is clear", () => {
    const fr = frameOf("S09"), shuffled = { ...fr, chapters: [...fr.chapters].reverse() };
    for (const f of [fr, shuffled]) assert.deepEqual(treatmentOf(f, allBut(f, "legs-tail", "face")).groups, ["face", "leg", "tail"]);
    assert.deepEqual(treatmentOf(fr, allBut(fr, "shape", "face")).groups, ["body"]); assert.deepEqual(treatmentOf(fr, allBut(fr, "coat", "shape", "face")).groups, ["coat"], "Coat wins any tie with Shape");
    const noParts = { scene: { nodes: [{ id: "body", part: "body" }] } }; assert.deepEqual(treatmentOf(fr, allBut(fr, "face", "legs-tail"), noParts.scene), { mode: "clear", boxes: [], groups: [], luma: false });
    const headOnly = { scene: { nodes: [{ id: "head", part: "head" }, { id: "tail-bulb", part: "tail" }] } }; assert.deepEqual(treatmentOf(fr, allBut(fr, "face", "legs-tail"), headOnly.scene).groups, ["face", "tail"], "a group with no part drops; tail-bulb is a tail part");
  });

  test("Coat or Shape unread wins over the groups; Face is one group; the groups of several unread chapters are a union", () => {
    const fr = frameOf("S09");
    assert.deepEqual(treatmentOf(fr, allBut(fr, "coat", "face")).boxes, [{ whole: true }]);
    assert.deepEqual(treatmentOf(fr, allBut(fr, "face")).boxes.map((b) => b.parts), [UNREAD_REGION.face[0]]);
    assert.deepEqual(treatmentOf(fr, allBut(fr, "face", "legs-tail")).boxes.map((b) => b.parts), [UNREAD_REGION.face[0], ["leg", "ray"], ["tail"]]);
  });

  test("Glow unread draws emission at none and Charge unread phase at solid; read, the mibi's own value; the genome is not changed", () => {
    const fr = frameOf("S16"), g = typeSpecimen(fr), digest = genomeDigest(g), own = builtOf(fr, g).resolved.values, all = fr.chapters.map((c) => c.id);
    assert.equal(builtOf(fr, g, all), builtOf(fr, g), "all read: the mibi's own build");
    const veiled = builtOf(fr, g, allBut(fr, "glow", "charge")).resolved.values;
    assert.equal(veiled["appearance.emission-brightness"], 0); assert.equal(veiled["physiology.phase"], 0.2);
    assert.ok(own["appearance.emission-brightness"] > 0 && own["physiology.phase"] !== undefined);
    assert.equal(builtOf(fr, g, allBut(fr, "glow")).resolved.values["physiology.phase"], own["physiology.phase"], "Charge read: its own phase");
    assert.equal(builtOf(fr, g, allBut(fr, "charge")).resolved.values["appearance.emission-brightness"], own["appearance.emission-brightness"], "Glow read: its own emission");
    assert.equal(genomeDigest(g), digest);
  });
}

// ---- Fix 1b part 3: an adult without its signed stand is its species' juvenile stand (stands.mjs, views) ----
{
  const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station"), mastersDir = path.resolve(here, "../../ui/assets/masters");
  setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
  const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), home = J("home.json"), frameSpec = J("frame.json"), viv = J("vivarium.json"), hab = J("habitat.json");
  const index = JSON.parse(readFileSync(path.join(mastersDir, "index.json"), "utf8")).masters;
  const placeAll = () => { for (const [id, e] of Object.entries(index)) placeMaster({ id, w: e.w, h: e.h, file: e.file, hash: e.sha256, signed: e.signed, status: e.status ?? "master" }, { w: e.w, h: e.h, rgba: () => new Uint8ClampedArray(0) }); };
  const dropAll = () => { for (const id of Object.keys(index)) dropAsset(id); };
  describe("an owned mibi is never absent (Fix 1b part 3, stands.mjs)", () => {
    before(placeAll); after(dropAll);
    const SPECIES = Array.from({ length: 16 }, (_, i) => "S" + String(i + 1).padStart(2, "0")), PLACES = [[144, 152], [96, 88], [304, 312], [48, 48]];
    const ADULT_STANDS = SPECIES.filter((s) => PLACES.every(([w, h]) => `mibi-adult-${s}-${w}x${h}` in index)), settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 8 }, T0 = 1_000_000;

    test("no S01 to S16 species reaches the genome stand-in: every one has a signed adult stand or a signed juvenile stand at every place", () => {
      for (const sp of SPECIES) for (const size of PLACES) for (const stage of ["adult", "elder"]) {
        const look = standLook(sp, stage, size); assert.notEqual(look.step, 3, `${sp} ${stage} ${size}`);
        if (ADULT_STANDS.includes(sp)) assert.deepEqual([look.stage, look.size, look.step], [stage, size, 1], `${sp}: its own stand`);
        else { const j = juvenileSize(size); assert.deepEqual([look.stage, look.size, look.step], ["juvenile", j, 2], `${sp} ${size}: the juvenile ${j}`); assert.ok(`mibi-juvenile-${sp}-${j[0]}x${j[1]}` in index); }
      }
      assert.ok(ADULT_STANDS.includes("S01") && ADULT_STANDS.includes("S02") && ADULT_STANDS.includes("S03"), "Pip, S02 and S03 have theirs");
      assert.deepEqual(juvenileSize([144, 152]), [104, 112], "the one size that differs"); assert.equal(standLook("S99", "adult", [144, 152]).step, 3, "a species with no stand at all: the rig");
      assert.deepEqual(standLook("S04", "juvenile", [104, 112]), { stage: "juvenile", size: [104, 112], step: 1 });
    });

    const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: true, at: T0 }; return st; };
    const sv0 = (over = {}) => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, carryReqs: [], ...over });
    const pics = (b) => b.requests.filter((r) => r.kind === "mibi");

    test("Home and the Vivarium whole: an S04 adult is its juvenile 104×112 (a resident) and 96×88 (a sleeper), an S03 adult its own stand; the drawn stage follows", () => {
      const st = world(); S.seedAdults(st, "S04", 5, 1, settings); S.seedAdults(st, "S03", 9, 1, settings); const [s4, s3] = st.mibis;
      const b = homeBuild({ st, sv: sv0({ carried: [s4.id] }), settings, docked: true, ui: {}, focus: null, light: "day" }, home, frameSpec), R = b.props.regions;
      const res = (m) => R.residents.find((r) => r.id === String(m.id)), slp = R.bed.sleepers[0];
      assert.equal(res(s3).stage, "adult"); assert.equal(res(s3).picture, `mibi:${genomeDigest(s3.genome)}:adult:144x152`);
      const r4 = b.requests.find((r) => r.id === `mibi:${genomeDigest(s4.genome)}:juvenile:96x88`); assert.ok(r4, "the sleeper asks for the juvenile at 96×88"); assert.deepEqual([r4.size, r4.stage, r4.species], [[96, 88], "juvenile", "S04"]);
      assert.equal(slp.stage, "juvenile");
      const w = world(); S.seedAdults(w, "S04", 5, 1, settings); const m = w.mibis[0];
      const b2 = homeBuild({ st: w, sv: sv0(), settings, docked: true, ui: {}, focus: null, light: "day" }, home, frameSpec), p = b2.props.regions.residents[0];
      assert.deepEqual([p.stage, p.picture], ["juvenile", `mibi:${genomeDigest(m.genome)}:juvenile:104x112`]);
      assert.deepEqual(pics(b2).find((r) => r.id === p.picture).size, [104, 112]);
      assert.equal(S.mibiStage(w, m, settings), "adult", "the mibi itself is still an adult");
    });

    test("growing up is not staged: a juvenile S04 and the same mibi grown up are the same picture at the same size", () => {
      const w = world(); S.seedAdults(w, "S04", 5, 1, settings); const m = w.mibis[0], adultBorn = m.born; m.born = w.turn;
      const at = () => { const b = homeBuild({ st: w, sv: sv0(), settings, docked: true, ui: {}, focus: null, light: "day" }, home, frameSpec); return b.props.regions.residents[0]; };
      assert.equal(S.mibiStage(w, m, settings), "juvenile"); const young = at(); m.born = adultBorn; assert.equal(S.mibiStage(w, m, settings), "adult"); const grown = at();
      assert.deepEqual([grown.stage, grown.picture], [young.stage, young.picture]);
    });

    test("up close and in the rosters: the 304×312 and 48×48 juvenile in the same rects; the species with its own stand keeps it", () => {
      const w = { st: world(), settings }; S.seedAdults(w.st, "S04", 5, 2, settings); S.seedAdults(w.st, "S01", 5, 1, settings); const [a, b0, pip] = w.st.mibis; for (const m of w.st.mibis) m.paint = { state: "landed" };
      const h = habitatBuild({ st: w.st, sv: sv0(), settings, docked: true, light: "day", focus: null, habId: a.id, meetId: null, armed: false }, hab, frameSpec, home);
      const near = h.requests.find((r) => r.id === h.props.regions.resident.picture); assert.deepEqual([near.stage, near.size], ["juvenile", [304, 312]]);
      assert.equal(mibiPictureOf(w.st, a, [304, 312], settings).id, h.props.regions.resident.picture, "the host's swap dither names the same fallback picture (host.mjs habitatFocus)");
      const v = vivariumBuild({ st: w.st, sv: sv0(), settings, docked: true, light: "day", focus: null, seen: null }, viv, frameSpec, home);
      const tile = (m) => v.requests.find((r) => r.id === v.props.regions.tiles.items.find((t) => t.id === String(m.id)).picture);
      assert.deepEqual([tile(a).stage, tile(a).size], ["juvenile", [48, 48]]); assert.deepEqual([tile(pip).stage, tile(pip).size], ["adult", [48, 48]]);
    });
  });
}

// ---- Fix 1b part 1: the calm unknown (unknown.mjs), against the numbers of unknown-proof.py (masters-pods 71968ccc) on a synthetic 14×12 picture ----
{
  const W = 14, H = 12, inBody = (x, y) => ((x - 7) / 5.5) ** 2 + ((y - 6) / 4.5) ** 2 <= 1, rgba = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; for (let c = 0; c < 3; c++) rgba[i + c] = (x * 37 + y * 91 + c * 53 + x * y * 7) % 256; rgba[i + 3] = inBody(x, y) ? 255 : 0; }
  const pic = { w: W, h: H, rgba: () => rgba }, PTS = [[7, 6], [6, 4], [3, 3], [2, 5], [12, 6], [7, 2], [8, 10], [9, 8], [5, 3], [1, 1]];
  const px = (p, x, y) => [...p.rgba().slice((y * W + x) * 4, (y * W + x) * 4 + 3)], at = (p) => PTS.map(([x, y]) => px(p, x, y));
  test("ghost (nothing read): GHOST plus 0.22 of the luma contrast about the body's mean, no hue, alpha unchanged, a 2 px top-left rim at 50 %; the oracle's numbers", () => {
    const g = treat(pic, { mode: "ghost" });
    assert.deepEqual(at(g), [[93, 102, 118], [114, 123, 139], [128, 138, 153], [119, 128, 144], [79, 88, 104], [112, 122, 137], [83, 92, 108], [83, 92, 108], [115, 124, 140], [135, 188, 241]]);
    assert.deepEqual([...g.rgba()].filter((_, i) => i % 4 === 3), [...rgba].filter((_, i) => i % 4 === 3), "alpha unchanged"); assert.deepEqual([g.w, g.h], [W, H]);
    const [a, b, c] = px(g, 6, 4); assert.deepEqual([b - a, c - b], [UNKNOWN.GHOST[1] - UNKNOWN.GHOST[0], UNKNOWN.GHOST[2] - UNKNOWN.GHOST[1]], "one grey-blue tone: the same offset in every channel, no hue kept");
    let rim = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inBody(x, y) && !(x >= 2 && y >= 2 && inBody(x - 2, y - 2))) rim++; assert.equal(rim, 28, "the rim pixels: those whose (x-2, y-2) neighbour is outside the body");
    assert.deepEqual(px(g, 7, 2), [112, 122, 137], "a rim pixel is half RIM");
  });
  test("a veil on one part: an ellipse on the box grown 4 px, 6 px feather, clipped to the body, VEIL at 60 % into the picture's own colour; outside the body untouched", () => {
    const v = treat(pic, { mode: "veil", boxes: [[4, 3, 7, 6]] });
    assert.deepEqual(at(v), [[94, 120, 151], [161, 85, 116], [140, 167, 95], [99, 125, 156], [162, 61, 96], [75, 101, 132], [162, 75, 108], [75, 102, 133], [84, 111, 142], [135, 188, 241]]);
    assert.deepEqual(px(v, 7, 6), [94, 120, 151], "the centre: 0.4 × the picture + 0.6 × VEIL"); assert.deepEqual(px(v, 1, 1), px(pic, 1, 1), "outside the body: as it is");
  });
  test("where two part veils overlap the weight is the largest, never the sum", () => {
    const one = treat(pic, { mode: "veil", boxes: [[4, 3, 7, 6]] }), both = treat(pic, { mode: "veil", boxes: [[4, 3, 7, 6], [7, 5, 10, 8]] });
    assert.deepEqual(at(both), [[94, 120, 151], [161, 85, 116], [140, 167, 95], [99, 125, 156], [149, 74, 104], [75, 101, 132], [156, 80, 111], [75, 102, 133], [84, 111, 142], [135, 188, 241]]);
    assert.deepEqual(px(both, 7, 6), px(one, 7, 6), "inside both: the same as inside one, not a double veil"); assert.notDeepEqual(px(both, 12, 6), px(one, 12, 6), "the second ellipse adds its own place");
  });
  test("the whole body (Shape unread): the full alpha at weight 0.6 × alpha, the picture's colour kept; Coat unread: its own luma (grey) under the veil", () => {
    const shape = treat(pic, { mode: "veil", boxes: "body" }), coat = treat(pic, { mode: "veil", boxes: "body", luma: true });
    assert.deepEqual(at(shape), [[94, 120, 151], [161, 85, 116], [140, 167, 95], [99, 125, 156], [149, 74, 104], [75, 101, 132], [156, 80, 111], [75, 102, 133], [84, 111, 142], [135, 188, 241]]);
    assert.deepEqual(at(coat).slice(0, 9), [[112, 117, 127], [98, 103, 113], [151, 156, 166], [117, 122, 132], [87, 92, 102], [93, 98, 108], [93, 99, 108], [94, 99, 109], [102, 108, 117]]); assert.deepEqual(px(coat, 1, 1), px(pic, 1, 1));
    const [r, g, b] = px(coat, 6, 4), off = (v, c) => v - UNKNOWN.VEIL[c] * UNKNOWN.VEIL_WEIGHT; assert.ok(Math.abs(off(r, 0) - off(g, 1)) <= 1 && Math.abs(off(g, 1) - off(b, 2)) <= 1, "no hue: the same grey under the veil in every channel");
  });
  test("the whole body with part boxes is the whole body: an ellipse never weighs more than the body", () => {
    assert.deepEqual([...treat(pic, { mode: "veil", boxes: ["body", [4, 3, 7, 6], [7, 5, 10, 8]] }).rgba()], [...treat(pic, { mode: "veil", boxes: "body" }).rgba()]);
    assert.deepEqual([...treat(pic, { mode: "veil", boxes: ["body", [4, 3, 7, 6]], luma: true }).rgba()], [...treat(pic, { mode: "veil", boxes: "body", luma: true }).rgba()]);
  });
  test("a clear treatment is the picture as it is; an unknown mode throws; the same bytes twice", () => {
    assert.deepEqual([...treat(pic, { mode: "clear" }).rgba()], [...rgba]); assert.throws(() => treat(pic, { mode: "frost" }), /frost/);
    assert.deepEqual([...treat(pic, { mode: "ghost" }).rgba()], [...treat(pic, { mode: "ghost" }).rgba()]);
  });
}

// ---- Fix 1b part 1: the founder drawn through the treatment (art.mjs founderArt, treatmentOf's id groups) ----
{
  const frames = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../workbench/frames"), frameOf = (sp) => JSON.parse(readFileSync(path.join(frames, `species-${sp}.json`), "utf8"));
  const without = (fr, ...ids) => fr.chapters.map((c) => c.id).filter((id) => !ids.includes(id));
  test("the id's groups: Coat unread is the whole body in luma (coat), Shape alone the whole body (body), a look's parts face, leg and tail; the doings none", () => {
    const fr = frameOf("S09"), g = (...ids) => { const t = treatmentOf(fr, without(fr, ...ids)); return [t.mode, t.groups, t.luma]; };
    assert.deepEqual(g("coat"), ["veil", ["coat"], true]); assert.deepEqual(g("shape"), ["veil", ["body"], false]); assert.deepEqual(g("coat", "shape", "face"), ["veil", ["coat"], true], "the whole body wins over a part");
    assert.deepEqual(g("face"), ["veil", ["face"], false]); assert.deepEqual(g("legs-tail"), ["veil", ["leg", "tail"], false]); assert.deepEqual(g("face", "legs-tail"), ["veil", ["face", "leg", "tail"], false]);
    assert.deepEqual(g("movement", "stamina"), ["clear", [], false]);
  });
  test("founderArt: clear is the palette's own rig; ghost and veil are the treatment's pixels on the rig's alpha; unread Glow and Charge are drawn at none and solid and are in the drawn digest", () => {
    const fr = frameOf("S01"), g = typeSpecimen(fr), all = fr.chapters.map((c) => c.id), [w, h] = [304, 312], base = mibiArt(fr, g, w, h, "portrait");
    assert.deepEqual([...founderArt(fr, g, all, w, h).rgba()], [...base.rgba()], "clear: the rig as it is");
    const ghost = founderArt(fr, g, [], w, h), a = (p) => [...p.rgba()].filter((_, i) => i % 4 === 3); assert.deepEqual(a(ghost), a(base), "alpha unchanged"); assert.notDeepEqual([...ghost.rgba()], [...base.rgba()]);
    const coat = founderArt(fr, g, all.filter((c) => c !== "coat"), w, h); assert.deepEqual(a(coat), a(base)); assert.notDeepEqual([...coat.rgba()], [...base.rgba()]);
    const s16 = frameOf("S16"), g16 = typeSpecimen(s16), r16 = s16.chapters.map((c) => c.id);
    assert.equal(drawnDigest(s16, g16, r16), genomeDigest(g16)); assert.equal(drawnDigest(s16, g16, r16.filter((c) => c !== "glow" && c !== "charge")), genomeDigest(g16) + "~gc"); assert.equal(drawnDigest(fr, g, []), genomeDigest(g), "a frame with neither chapter: the genome's own");
  });
}
