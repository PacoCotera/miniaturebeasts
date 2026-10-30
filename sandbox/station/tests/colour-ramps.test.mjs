// The version 4 Loika on its stands (T-20261016-203): the painted colour ramps (charcoal, russet, ash and the two-tone mixes) and the pattern layers, chosen through drawnLooks on T-201's layered stand.
//   node --test prototypes/station/tests/colour-ramps.test.mjs
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import { drawnLooks, standLooksOf } from "../src/looks.mjs";
import { layeredStand, layersFor, composeStand, standPictureId } from "../src/layered-stand.mjs";
import { loadStandLayersFs, loadStandLooksFs, unloadStands } from "../tools/stand-layers-fs.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const fr = frameOf("S01"), allRead = fr.chapters.map((c) => c.id), sha = (a) => createHash("sha256").update(a).digest("hex");
before(() => { loadStandLooksFs(); loadStandLayersFs(); });
after(() => unloadStands());

const COATS = ["charcoal", "russet", "ash", "charcoal and russet", "charcoal and ash", "russet and ash"], MARKS = ["stripes", "patches", "stripes and patches"];
const stand = (stage = "adult", place = [144, 152], view = "home") => layeredStand("S01", stage, place, view);

describe("the version 4 Loika's colour and pattern through drawnLooks", () => {
  test("the third pigment resolves to ash, not cobalt: the frame's colour alleles and its six looks", () => {
    const row = fr.loci.find((l) => l.id === "appearance.body-palette");
    assert.deepEqual(row.alleles, ["charcoal", "russet", "ash"]); assert.ok(!JSON.stringify(fr).includes("cobalt"), "no cobalt in the frame");
    assert.deepEqual(row.looks, ["charcoal", "charcoal and russet", "charcoal and ash", "russet", "russet and ash", "ash"]);
  });

  test("each of the six coats and each of the three patterns resolves to the right base and layers, and the eighteen pictures are all different", () => {
    for (const stage of ["adult", "juvenile"]) {
      const st = stand(stage, stage === "adult" ? [144, 152] : [104, 112]), seen = new Set();
      for (const colour of COATS) for (const marks of MARKS) {
        const looks = { colour, markings: marks, crown: "leaf crest", "eye-rings": "between" };
        assert.equal(layersFor(st, looks).map((l) => l.order).join(), marks === "stripes" ? "11,30" : marks === "patches" ? "10,30" : "10,11,30", `${colour} ${marks}`);
        assert.equal(Object.keys(st.bases).includes(colour), colour !== "charcoal", "every coat but charcoal has its painted base");
        const h = sha(composeStand(st, looks).rgba()); assert.ok(!seen.has(h), `${stage} ${colour} ${marks}`); seen.add(h);
      }
      assert.equal(seen.size, 18);
    }
  });

  test("a coat is painted, never tinted: the ramp keeps the form (the fur's lightness spread stays), and the belly, eyes and crest keep their own colour", () => {
    const st = stand("adult", [304, 312], "default"), at = (looks) => composeStand(st, looks).rgba();
    const charcoal = at({ crown: "bare head" }), russet = at({ colour: "russet", crown: "bare head" }), ash = at({ colour: "ash", crown: "bare head" });
    const lum = (a, i) => (a[i] + a[i + 1] + a[i + 2]) / 3, spread = (a) => { const v = []; for (let i = 0; i < a.length; i += 4) if (a[i + 3] === 255 && lum(a, i) < 140) v.push(lum(a, i)); v.sort((x, y) => x - y); return v[Math.floor(v.length * 0.95)] - v[Math.floor(v.length * 0.05)]; };
    assert.ok(spread(russet) > 25 && spread(ash) > 25, "shadow to highlight survives: not a flat tint");
    let same = 0, belly = 0; for (let i = 0; i < charcoal.length; i += 4) if (charcoal[i + 3] === 255 && lum(charcoal, i) > 170) { belly++; if (Math.abs(charcoal[i] - russet[i]) + Math.abs(charcoal[i + 1] - russet[i + 1]) + Math.abs(charcoal[i + 2] - russet[i + 2]) < 12) same++; }
    assert.ok(belly > 3000 && same / belly > 0.9, `the cream belly and the eyes keep their own colour (${same}/${belly})`);
    const mean = (a) => { let s = 0, n = 0; for (let i = 0; i < a.length; i += 4) if (a[i + 3] === 255 && lum(a, i) < 140) { s += lum(a, i); n++; } return s / n; };
    assert.ok(mean(charcoal) < mean(russet) && mean(russet) < mean(ash), "four-grey order: charcoal dark, russet middle, ash light");
    const crestOn = at({ colour: "russet", crown: "leaf crest" }), crestCh = at({ crown: "leaf crest" }); let leaf = 0, leafSame = 0;
    for (let y = 20; y < 70; y++) for (let x = 0; x < 304; x++) { const i = (y * 304 + x) * 4; if (crestCh[i + 3] === 255 && crestCh[i + 1] >= crestCh[i] - 6 && crestCh[i + 1] > crestCh[i + 2] + 25) { leaf++; if (crestOn[i] === crestCh[i] && crestOn[i + 1] === crestCh[i + 1]) leafSame++; } }
    assert.ok(leaf > 500 && leafSame / leaf > 0.97, `the crest keeps its own colour (${leafSame}/${leaf})`);
  });

  test("a two-tone is one painted two-tone: the first pigment over the back and head, the second over the flanks and legs", () => {
    const st = stand("adult", [304, 312], "default"), at = (colour) => composeStand(st, { colour, crown: "bare head" }).rgba();
    const band = (a, y0, y1) => { let s = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < 304; x++) { const i = (y * 304 + x) * 4; const l = (a[i] + a[i + 1] + a[i + 2]) / 3; if (a[i + 3] === 255 && l < 150) { s += l; n++; } } return s / n; };
    const ch = at("charcoal"), mix = at("charcoal and ash"), ash = at("ash");
    const backCh = band(ch, 100, 150), legsCh = band(ch, 230, 296), backMix = band(mix, 100, 150), legsMix = band(mix, 230, 296), legsAsh = band(ash, 230, 296);
    assert.ok(Math.abs(backMix - backCh) < 6, "the back and head are the first pigment (charcoal)"); assert.ok(legsMix - legsCh > 15 && Math.abs(legsMix - legsAsh) < 12, "the flanks and legs are the second (ash)");
    assert.notDeepEqual(sha(at("charcoal and ash")), sha(at("ash and charcoal")), "order is the look's: ash and charcoal is not a Loika look, it has no base");
  });

  test("the pattern layers: stripes and patches read apart on charcoal at adult size (54 px), as two looks", () => {
    const st = stand("adult", [144, 152], "home"), s = composeStand(st, { markings: "stripes", crown: "leaf crest" }).rgba(), p = composeStand(st, { markings: "patches", crown: "leaf crest" }).rgba(), b = composeStand(st, { crown: "leaf crest" }).rgba();
    const diff = (x, y) => { let n = 0; for (let i = 0; i < x.length; i += 4) if (Math.abs(x[i] - y[i]) + Math.abs(x[i + 1] - y[i + 1]) + Math.abs(x[i + 2] - y[i + 2]) > 60) n++; return n; };
    assert.ok(diff(s, b) > 40 && diff(p, b) > 40, "each mark shows at 54 px"); assert.ok(diff(s, p) > 60, "the two marks differ from each other at 54 px");
  });

  test("an unread chapter draws the common look: its coat and pattern are the species' modal ones, and its picture is theirs", () => {
    const modal = Object.fromEntries(Object.entries(standLooksOf("S01")).map(([i, t]) => [i, t.modal])), m = { genome: podGenome(fr, 3), read: [] };
    assert.deepEqual(drawnLooks(fr, m), modal);
    const st = stand(), id = (l) => standPictureId(st, l); assert.equal(id(drawnLooks(fr, m)), id(modal)); assert.notEqual(id(modal), id({}), "the common coat and marks are drawn, not the bare base");
  });

  test("a version 3 save draws exactly as before: plain markings and charcoal are the base (no layer, no ramp), the same id and pixels as T-201's stand", () => {
    const g = podGenome(fr, 7); g.loci["appearance.marking-switch"] = ["off", "off"]; g.loci["appearance.body-palette"] = ["charcoal", "charcoal"];
    const looks = drawnLooks(fr, { genome: g, read: allRead }); assert.equal(looks.markings, "plain"); assert.equal(looks.colour, "charcoal");
    const st = stand(); assert.deepEqual(layersFor(st, looks).map((l) => l.trait), looks.crown === "leaf crest" ? ["crown"] : []);
    assert.equal(standPictureId(st, looks), standPictureId(st, { crown: looks.crown, "eye-rings": looks["eye-rings"] }), "the id is T-201's for the same crest");
    assert.equal(sha(composeStand(st, looks).rgba()), sha(composeStand(st, { crown: looks.crown }).rgba()));
  });

  test("the four real pods (165, 168, 10, 116) draw as the approved window: their looks, and four different stands", () => {
    const APPROVED = { 165: ["charcoal", "patches", "leaf crest"], 168: ["russet", "stripes", "leaf crest"], 10: ["charcoal and ash", "stripes and patches", "bare head"], 116: ["ash", "patches", "leaf crest"] }, ids = new Set(), px = new Set(), st = stand();
    for (const [gs, [colour, markings, crown]] of Object.entries(APPROVED)) {
      const looks = drawnLooks(fr, { genome: podGenome(fr, +gs), read: allRead }); assert.deepEqual([looks.colour, looks.markings, looks.crown], [colour, markings, crown], "pod " + gs);
      ids.add(standPictureId(st, looks)); px.add(sha(composeStand(st, looks).rgba()));
    }
    assert.equal(ids.size, 4); assert.equal(px.size, 4);
  });
});
