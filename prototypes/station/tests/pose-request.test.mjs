// The pose in the picture request: the stands index's cut poses, poseFor (a habit -> its pose, or the anchor owed), the pose in the stand's variant and in the request. Golden-neutral: the anchor's ids are unchanged.
//   node --test prototypes/station/tests/pose-request.test.mjs
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { layeredStand, standFigure, standPictureId, standVariant, composeStand, poseFor } from "../src/layered-stand.mjs";
import { loadStandLayersFs, loadStandLooksFs, unloadStands, STANDS_DIR, SIZES_FILE } from "../tools/stand-layers-fs.mjs";
import { mibiPictureOf, mibiReq, figureOf } from "../src/views/home-props.mjs";
import { registerPictures } from "../src/pictures.mjs";
import { PLACEHOLDERS } from "../src/art.mjs";
import { asset as assetOf, assetEntry, dropAsset, manifest } from "../../ui/assets.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000;
const sha = (a) => createHash("sha256").update(a).digest("hex");
const CREST = { crown: "leaf crest" };   // the figures are measured with the crest, the tallest look
const wh = (f) => [f[2], f[3]];
const world = (species = "S01") => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.firstMibi = false; S.seedAdults(st, species, 5, 1, settings); return st; };
const wipe = () => { for (const e of manifest()) if (e.id.startsWith("mibi:")) dropAsset(e.id); };

before(() => { loadStandLooksFs(); loadStandLayersFs(); });
after(() => { wipe(); unloadStands(); });

describe("the stands index: the poses cut as the anchor", () => {
  const index = JSON.parse(readFileSync(path.join(STANDS_DIR, "index.json"), "utf8")), S01 = index.stands.S01;
  test("each stage holds poses.anchor, curl, shake and calm, each with its own figure and the 304x312 art; the anchor pose is the stage's own entry", () => {
    for (const stage of ["adult", "juvenile"]) {
      const set = S01[stage]; assert.deepEqual(Object.keys(set.poses), ["anchor", "curl", "shake", "calm"]);
      assert.equal(set.pose, "anchor"); assert.deepEqual(set.poses.anchor.figure, set.figure); assert.deepEqual(set.poses.anchor.sizes, set.sizes);
      for (const pose of ["curl", "shake", "calm"]) {
        const art = set.poses[pose]; assert.deepEqual(Object.keys(art.sizes), ["304x312"]); assert.notDeepEqual(art.figure, set.figure, `the ${pose}'s ink box is its own`);
        const sz = art.sizes["304x312"]; assert.equal(Object.keys(sz.bases).length, 5, "the five recoloured bases");
        assert.deepEqual(sz.layers.map((l) => [l.trait, l.order, l.op]), [["markings", 10, "over"], ["markings", 11, "over"], ["crown", 30, "over"]], "patches, stripes, crest; the curl's shadow stays in `curl`");
        for (const f of [sz.base, ...Object.values(sz.bases), ...sz.layers.map((l) => l.file)]) { assert.ok(index.files[f], f); assert.match(f, new RegExp(`^S01-${stage}-${pose}-304x312-`)); }
      }
      assert.ok(set.curl.shadow, "today's curl shadow object is kept");
    }
  });
  test("every file the index names is on disk as recorded (size and sha256)", () => {
    for (const [name, e] of Object.entries(index.files)) { const buf = readFileSync(path.join(STANDS_DIR, name)); assert.equal(e.file, name); assert.equal(sha(buf), e.sha256, name); assert.deepEqual([buf.readUInt32BE(16), buf.readUInt32BE(20)], [e.w, e.h], name); }
  });
  test("habits map a habit to its pose", () => assert.deepEqual(S01.habits, { "sleep-curled": "curl", "shake-dry": "shake", "calm": "calm" }));
  test("places: 96x96 composes the whole art fitted (no view gives the default a figure height)", () => {
    const sizes = JSON.parse(readFileSync(SIZES_FILE, "utf8")); assert.ok(sizes.places.includes("96x96")); assert.equal(sizes.views.default, undefined);
  });
});

describe("poseFor(species, stage, habit)", () => {
  test("a habit with its key cut maps to that pose, nothing owed", () => {
    assert.deepEqual(poseFor("S01", "adult", "sleep-curled"), { pose: "curl", owed: null });
    assert.deepEqual(poseFor("S01", "juvenile", "sleep-curled"), { pose: "curl", owed: null });
    assert.deepEqual(poseFor("S01", "elder", "sleep-curled"), { pose: "curl", owed: null }, "an elder takes the adult's stand");
  });
  test("shake-dry and calm map to their signed keys, nothing owed, in both stages", () => {
    for (const stage of ["adult", "juvenile", "elder"]) {
      assert.deepEqual(poseFor("S01", stage, "shake-dry"), { pose: "shake", owed: null }, stage);
      assert.deepEqual(poseFor("S01", stage, "calm"), { pose: "calm", owed: null }, stage);
    }
  });
  test("a habit with no signed key is the anchor, owed", () => assert.deepEqual(poseFor("S01", "adult", "watch"), { pose: "anchor", owed: "habit key watch" }));
  test("a species with no layered stand is owed", () => {
    assert.deepEqual(poseFor("S02", "adult", "sleep-curled"), { pose: "anchor", owed: "habit key sleep-curled" });
    assert.deepEqual(poseFor("S03", "juvenile", "calm"), { pose: "anchor", owed: "habit key calm" });
    for (const species of ["S02", "S03"]) for (const stage of ["adult", "juvenile"]) for (const habit of ["shake-dry", "calm"])
      assert.deepEqual(poseFor(species, stage, habit), { pose: "anchor", owed: `habit key ${habit}` }, `${species} ${stage} ${habit}`);
  });
});

describe("layeredStand with a pose", () => {
  test("the anchor is the default: the same stand, the same id, the same pixels", () => {
    for (const [stage, place, view] of [["adult", [304, 312], "habitat"], ["adult", [144, 152], "home"], ["juvenile", [104, 112], "home"], ["adult", [48, 48], "default"]]) {
      const a = layeredStand("S01", stage, place, view), b = layeredStand("S01", stage, place, view, "anchor");
      assert.deepEqual(a, b); assert.equal(standVariant(a, CREST).key.includes("#"), false, "the anchor appends nothing to the key");
    }
  });
  test("a curl is never the same id as a stand", () => {
    for (const [stage, place, view] of [["adult", [304, 312], "habitat"], ["juvenile", [304, 312], "habitat"], ["adult", [96, 96], "default"], ["juvenile", [96, 96], "default"], ["adult", [48, 48], "default"], ["juvenile", [48, 48], "default"]]) {
      const a = layeredStand("S01", stage, place, view), c = layeredStand("S01", stage, place, view, "curl");
      assert.equal(c.pose, "curl"); assert.ok(standVariant(c, CREST).key.endsWith("#curl"));
      for (const looks of [{}, CREST]) assert.notEqual(standPictureId(c, looks), standPictureId(a, looks), `${stage} ${place}`);
      assert.notEqual(sha(composeStand(c, CREST).rgba()), sha(composeStand(a, CREST).rgba()), "the composed cache keeps the two apart");
    }
  });
  test("shake and calm are never the id of the stand or of the curl, nor of each other", () => {
    for (const [stage, place, view] of [["adult", [304, 312], "habitat"], ["juvenile", [304, 312], "habitat"], ["adult", [96, 96], "default"], ["juvenile", [96, 96], "default"], ["adult", [48, 48], "default"], ["juvenile", [48, 48], "default"]]) {
      const by = Object.fromEntries(["anchor", "curl", "shake", "calm"].map((p) => [p, layeredStand("S01", stage, place, view, p)]));
      for (const pose of ["shake", "calm"]) { assert.equal(by[pose].pose, pose); assert.ok(standVariant(by[pose], CREST).key.endsWith("#" + pose)); }
      for (const looks of [{}, CREST]) { const ids = Object.values(by).map((s) => standPictureId(s, looks)); assert.equal(new Set(ids).size, 4, `${stage} ${place}: ${ids}`); }
      const px = Object.values(by).map((s) => sha(composeStand(s, CREST).rgba())); assert.equal(new Set(px).size, 4, "the composed cache keeps the four apart");
    }
  });
  test("shake and calm are drawn at the stage's anchor factor: their figure W×H", () => {
    const fig = (stage, place, view, pose) => wh(standFigure(layeredStand("S01", stage, place, view, pose), CREST));
    assert.deepEqual(fig("adult", [304, 312], "habitat", "shake"), [147, 141]); assert.deepEqual(fig("adult", [304, 312], "habitat", "calm"), [135, 137]);
    assert.deepEqual(fig("juvenile", [304, 312], "habitat", "shake"), [100, 118]); assert.deepEqual(fig("juvenile", [304, 312], "habitat", "calm"), [109, 106]);
    assert.deepEqual(fig("adult", [96, 96], "default", "shake"), [87, 83], "the card"); assert.deepEqual(fig("adult", [96, 96], "default", "calm"), [81, 81], "the card");
    assert.deepEqual(fig("juvenile", [96, 96], "default", "shake"), [53, 63], "the card"); assert.deepEqual(fig("juvenile", [96, 96], "default", "calm"), [58, 56], "the card");
    assert.deepEqual(fig("adult", [48, 48], "default", "shake"), [43, 41], "the thumb"); assert.deepEqual(fig("adult", [48, 48], "default", "calm"), [40, 40], "the thumb");
    assert.deepEqual(fig("juvenile", [48, 48], "default", "shake"), [27, 31], "the thumb"); assert.deepEqual(fig("juvenile", [48, 48], "default", "calm"), [29, 28], "the thumb");
  });
  test("the curl is drawn at the stage's anchor factor: its figure W×H", () => {
    const fig = (stage, place, view, pose) => wh(standFigure(layeredStand("S01", stage, place, view, pose), CREST));
    assert.deepEqual(fig("adult", [304, 312], "habitat", "curl"), [129, 95]);   // the re-signed curl key (its painted contact shadow out)
    assert.deepEqual(fig("juvenile", [304, 312], "habitat", "curl"), [103, 79]);
    assert.deepEqual(fig("adult", [96, 96], "default", "curl"), [76, 56], "the card");
    assert.deepEqual(fig("juvenile", [96, 96], "default", "curl"), [54, 41], "the card");
    assert.deepEqual(fig("adult", [48, 48], "default", "curl"), [39, 28], "the thumb");
    assert.deepEqual(fig("adult", [96, 96], "default", "anchor"), [81, 88], "the anchor at 96");
  });
  test("a pose the stage has not cut is no stand", () => assert.equal(layeredStand("S01", "adult", [304, 312], "habitat", "shake-dry"), null));
});

describe("the request takes a pose", () => {
  test("the anchor, given or not, is today's request exactly: no pose, no owed", () => {
    const st = world(), mb = st.mibis[0];
    for (const [size, light, view] of [[[304, 312], "night", "habitat"], [[144, 152], "day", "home"], [[48, 48], "day", "default"]]) {
      const a = [], b = [], c = [], req = (out) => (r) => { out.push(r); return r.id; };
      mibiReq(req(a), st, mb, size, settings, light, view); mibiReq(req(b), st, mb, size, settings, light, view, "anchor"); mibiReq(req(c), st, mb, size, settings, light, view, poseFor("S01", "adult", "watch"));
      assert.deepEqual(b, a); assert.equal(a[0].pose, undefined); assert.equal(a[0].owed, undefined);
      assert.deepEqual(c, [{ ...a[0], owed: "habit key watch" }], "poseFor's owed anchor: the same id, marked owed");
      assert.deepEqual(mibiPictureOf(st, mb, size, settings, light, view, "anchor"), mibiPictureOf(st, mb, size, settings, light, view));
      assert.deepEqual(figureOf(st, mb, size, settings, view, "anchor"), figureOf(st, mb, size, settings, view));
    }
  });
  test("a curl request carries its pose and draws the curl; its figure is the curl's", () => {
    const st = world(), mb = st.mibis[0], got = [], req = (r) => { got.push(r); return r.id; };
    const p = poseFor("S01", "adult", "sleep-curled"), id = mibiReq(req, st, mb, [304, 312], settings, "day", "habitat", p), r = got[0];
    assert.equal(r.pose, "curl"); assert.equal(r.owed, undefined);
    assert.equal(id, mibiPictureOf(st, mb, [304, 312], settings, "day", "habitat", "curl").id);
    assert.notEqual(id, mibiPictureOf(st, mb, [304, 312], settings, "day", "habitat").id);
    const stand = layeredStand("S01", "adult", [304, 312], "habitat", "curl");
    assert.deepEqual(figureOf(st, mb, [304, 312], settings, "habitat", p), standFigure(stand, r.looks));
    registerPictures(got, { podById: () => null, frameOf, mibiGenome: (i) => S.mibiById(st, i)?.genome });
    assert.deepEqual([assetEntry(id).w, assetEntry(id).h], [304, 312]); assert.equal(sha(assetOf(id).rgba()), sha(composeStand(stand, r.looks).rgba()), "registerLayered passes the pose");
    wipe();
  });
  test("a card's three requests (card 96, thumb 48, window 304×312) share one pose and one set of looks, three ids", () => {
    const st = world(), mb = st.mibis[0], got = [], req = (r) => { got.push(r); return r.id; }, p = poseFor("S01", "adult", "sleep-curled");
    const ids = [mibiReq(req, st, mb, [96, 96], settings, "day", "default", p), mibiReq(req, st, mb, [48, 48], settings, "day", "default", p), mibiReq(req, st, mb, [304, 312], settings, "dusk", "habitat", p)];
    assert.equal(new Set(ids).size, 3); assert.deepEqual(got.map((r) => r.pose), ["curl", "curl", "curl"]); for (const r of got) assert.deepEqual(r.looks, got[0].looks);
  });
  test("S02 has no layered stand: its owed anchor is the species stand-in, marked owed", () => {
    const st = world("S02"), mb = st.mibis[0], got = [], req = (r) => { got.push(r); return r.id; };
    mibiReq(req, st, mb, [304, 312], settings, "day", "habitat", poseFor("S02", "adult", "sleep-curled"));
    assert.equal(got[0].looks, undefined); assert.equal(got[0].pose, undefined); assert.equal(got[0].owed, "habit key sleep-curled");
  });
});

test("the placeholder register lists the poses and the owed habit keys", () => {
  const sl = PLACEHOLDERS.find((p) => p.id === "stand-layers"); assert.match(sl.what, /96×96/); assert.match(sl.what, /anchor, curl, shake and calm/);
  const owed = PLACEHOLDERS.find((p) => p.id === "habit-key-owed"); assert.ok(owed && owed.until); assert.doesNotMatch(owed.what, /shake-dry/, "S01 shake-dry has its signed pose");
});
