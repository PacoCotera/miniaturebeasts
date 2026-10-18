// Each mibi drawn as itself (T-20261016-201): `drawnLooks(frame, mibi)` and the layered stand, in the logic process; the face is given the composed picture by id, as it is given the stamp.
//   node --test prototypes/station/tests/drawn-looks.test.mjs
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome, traitState, genomeDigest } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { drawnLooks, standLooksOf, keyToken } from "../src/looks.mjs";
import { layeredStand, layersFor, composeStand, standPictureId, standVariant, standLayersLoaded } from "../src/layered-stand.mjs";
import { loadStandLayersFs, loadStandLooksFs, unloadStands, STANDS_DIR } from "../tools/stand-layers-fs.mjs";
import { standLooks, PODS } from "../tools/make-stand-looks.mjs";
import { registerPictures } from "../src/pictures.mjs";
import { homeBuild, mibiPictureOf } from "../src/views/home-props.mjs";
import { vivariumBuild } from "../src/views/vivarium-props.mjs";
import { habitatBuild } from "../src/views/habitat-props.mjs";
import { asset as assetOf, assetEntry, dropAsset, manifest, placeholders } from "../../ui/assets.mjs";
import { policyOf } from "../../ui/asset-policy.mjs";
import { gradedOf } from "../src/light-grade.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), home = J("home.json"), frameSpec = J("frame.json"), viv = J("vivarium.json"), hab = J("habitat.json");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000;
const fr = frameOf("S01"), allRead = fr.chapters.map((c) => c.id);
const mibi = (gs, read = allRead) => ({ id: gs, genome: podGenome(fr, gs), read: [...read] });
const sha = (a) => createHash("sha256").update(a).digest("hex");
const pixels = (stand, looks) => sha(composeStand(stand, looks).rgba());

before(() => { loadStandLooksFs(); loadStandLayersFs(); });
after(() => unloadStands());

describe("drawnLooks(frame, mibi)", () => {
  test("a read chapter draws the look it shows (traitState's shows), for every look trait; doings draw nothing", () => {
    for (let gs = 0; gs < 40; gs++) {
      const m = mibi(gs), got = drawnLooks(fr, m);
      for (const ch of fr.chapters) for (const t of ch.traits) {
        if (t.nature === "doing") assert.ok(!(t.id in got), `${t.id} is a doing: it draws nothing on a stand`);
        else assert.equal(got[t.id], traitState(fr, t, m.genome).shows, `pod ${gs} ${t.id}`);
      }
    }
    assert.deepEqual(Object.keys(drawnLooks(fr, mibi(1))).sort(), ["colour", "crown", "eye-rings", "markings"], "the Loika's four look traits");
  });

  test("an unread chapter draws the species' common look, never this mibi's own", () => {
    const common = Object.fromEntries(Object.entries(standLooksOf("S01")).map(([id, t]) => [id, t.modal]));
    assert.equal(common.crown, "leaf crest"); assert.equal(common["eye-rings"], "between");
    let differs = 0;
    for (let gs = 0; gs < 40; gs++) {
      const m = mibi(gs, []), got = drawnLooks(fr, m);
      assert.deepEqual(got, common, `pod ${gs}: nothing read, every trait is the common look`);
      if (traitState(fr, fr.chapters[1].traits[0], m.genome).shows !== common.crown) differs++;
    }
    assert.ok(differs > 0, "some of these mibis really do have a bare head: the draw was not their own");
    // one chapter read: only that chapter's traits are its own
    const m = mibi(14, ["face"]), got = drawnLooks(fr, m);
    assert.equal(got.crown, traitState(fr, fr.chapters.find((c) => c.id === "face").traits[0], m.genome).shows);
    assert.equal(got.markings, common.markings); assert.equal(got.colour, common.colour);
  });

  test("a hidden copy never shows: a carrier of a hidden look draws what it shows, the same stand as a mibi that has no hidden copy", () => {
    const crown = fr.chapters.find((c) => c.id === "face").traits.find((t) => t.id === "crown");
    let carrier = null, plain = null;
    for (let gs = 0; gs < 200 && !(carrier && plain); gs++) { const m = mibi(gs), st = traitState(fr, crown, m.genome); if (st.hides && !carrier) carrier = { m, st }; if (st.kind === "only" && st.shows === (carrier?.st.shows ?? st.shows) && !plain) plain = { m, st }; }
    assert.ok(carrier, "a pod that hides a crown look exists");
    assert.notEqual(drawnLooks(fr, carrier.m).crown, carrier.st.hides, "the hidden look is never drawn");
    assert.equal(drawnLooks(fr, carrier.m).crown, carrier.st.shows);
    const stand = layeredStand("S01", "adult", [144, 152]);
    for (let gs = 0; gs < 200; gs++) {   // two mibis that show the same looks are one stand, whatever they hide
      const a = drawnLooks(fr, mibi(gs)), b = drawnLooks(fr, mibi(gs + 200));
      if (JSON.stringify(a) === JSON.stringify(b)) assert.equal(standPictureId(stand, a), standPictureId(stand, b));
    }
  });

  test("a sealed chapter and an unknown species draw nothing; a mibi without a genome draws nothing", () => {
    const f9 = frameOf("S09"), sealed = f9.chapters.find((c) => c.sealed), m = { genome: podGenome(f9, 3), read: f9.chapters.map((c) => c.id) }, got = drawnLooks(f9, m);
    for (const t of sealed.traits) assert.ok(!(t.id in got));
    assert.deepEqual(drawnLooks(null, m), {}); assert.deepEqual(drawnLooks(fr, { read: [] }), {});
  });

  test("the common looks are the looks most pods show (stand-looks.json is current for the Loika and the generator matches the frames)", () => {
    const made = standLooks(["S01", "S12"]);   // 300 pods a species; the whole file (sixteen species, a minute) is checked by `node prototypes/station/tools/make-stand-looks.mjs --check`
    assert.equal(made.pods, PODS);
    assert.deepEqual(JSON.parse(JSON.stringify(made.species.S01)), JSON.parse(readFileSync(path.join(specs, "stand-looks.json"), "utf8")).species.S01);
    const file = JSON.parse(readFileSync(path.join(specs, "stand-looks.json"), "utf8")).species;
    assert.deepEqual(JSON.parse(JSON.stringify(made.species.S12)), file.S12);
    for (const sp of Object.keys(file)) for (const [id, t] of Object.entries(file[sp].traits)) assert.equal(Object.keys(t.share)[0], t.modal, `${sp} ${id}: the modal look is the one most pods show`);
  });
});

describe("the layered stand", () => {
  test("a base and layers per look, derived at each standing size; the layer table is data (every layer is in the index with its hash)", () => {
    const index = loadStandLayersFs(); assert.ok(standLayersLoaded());
    for (const size of [[304, 312], [144, 152], [48, 48]]) { const s = layeredStand("S01", "adult", size); assert.ok(s, size.join("x")); assert.deepEqual(s.traits, ["markings", "crown", "eye-rings"]); assert.equal(s.layers.length, 5); }
    assert.equal(layeredStand("S01", "elder", [144, 152]).stage, "adult", "an elder takes the adult's stand");
    assert.equal(layeredStand("S01", "juvenile", [104, 112]), null, "no layers for a juvenile: its signed stand");
    assert.equal(layeredStand("S01", "adult", [96, 88]), null, "the sleeper's curl is not a stand pose: its signed picture");
    assert.equal(layeredStand("S03", "adult", [144, 152]), null, "a species with no layers is drawn as before");
    for (const [name, e] of Object.entries(index.files)) assert.equal(sha(readFileSync(path.join(STANDS_DIR, e.file))), e.sha256, name);
    assert.equal(index.status, "placeholder", "proof cut-outs, listed in the placeholder register");
  });

  test("a layer shows its look and no other: the base, patches, a bare head and each ring give different pictures", () => {
    const st = layeredStand("S01", "adult", [144, 152]), base = pixels(st, {});
    const variants = [{ markings: "patches" }, { crown: "bare head" }, { "eye-rings": "thin rings" }, { "eye-rings": "wide pale rings" }, { markings: "patches", crown: "bare head", "eye-rings": "wide pale rings" }];
    const seen = new Set([base]);
    for (const v of variants) { const h = pixels(st, v); assert.ok(!seen.has(h), JSON.stringify(v)); seen.add(h); }
    assert.equal(pixels(st, { markings: "stripes", "eye-rings": "between", crown: "leaf crest", colour: "ash" }), base, "a look with no layer, and the base's own looks, are the base: nothing is invented");
    assert.deepEqual(layersFor(st, { crown: "bare head" }).map((l) => l.op), ["erase", "over"], "a bare head is the crest taken off and the head closed, in that order");
  });

  test("a bare head takes the crest off: the crown's rows lose their leaves and nothing else of the body moves", () => {
    const st = layeredStand("S01", "adult", [304, 312]), a = composeStand(st, {}).rgba(), b = composeStand(st, { crown: "bare head" }).rgba();
    let top = 0, topOpaque = 0, below = 0, last = 0;
    for (let y = 0; y < 312; y++) for (let x = 0; x < 304; x++) { const i = (y * 304 + x) * 4, same = a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2] && a[i + 3] === b[i + 3]; if (!same) { last = Math.max(last, y); if (y < 160) top++; else below++; } if (y < 40 && b[i + 3] > 128) topOpaque++; }
    assert.ok(top > 2000, "the crest is gone from the top"); assert.equal(topOpaque, 0, "no leaf is left above the head"); assert.ok(last < 175, `the body is the base's below the head: the last changed row is ${last}`);
  });

  test("the variant is the picture: the same looks are one id, different looks are different ids, an unread look is the base's", () => {
    const st = layeredStand("S01", "adult", [144, 152]), id = (l, light) => standPictureId(st, l, light);
    assert.match(id({}), /^mibi:S01~[0-9a-f]{8}:adult:144x152$/); assert.match(id({}, "night"), /:night$/);
    assert.equal(id({ colour: "ash", markings: "stripes" }), id({}), "colour and stripes have no layer yet: the base");
    assert.notEqual(id({ crown: "bare head" }), id({})); assert.equal(standVariant(st, { crown: "bare head", markings: "patches" }).key, "S01~crown=bare head,markings=patches");
    assert.equal(keyToken("S01~"), keyToken("S01~")); assert.notEqual(keyToken("S01~"), keyToken("S01~crown=bare head"));
    assert.equal(policyOf(id({ crown: "bare head" }), "placeholder"), "painted"); assert.equal(policyOf(id({}, "dusk"), "placeholder"), "painted");
    assert.equal(policyOf("mibi:S01-9b58efeb:adult:144x152", "placeholder"), "art", "a rig stand-in named by a genome digest is still art"); assert.equal(policyOf("mibi:S01-9b58efeb:adult:144x152", "master"), "painted");
  });
});

// four Loikas whose drawn looks differ in what a stand can show: found by search over pods, so the test follows the frame
const FOUR = (() => {
  const picks = [], keys = new Set(), st = layeredStand("S01", "adult", [144, 152]);
  for (let s = 1; s < 400 && picks.length < 4; s++) {
    const gs = (Math.imul(s, 2654435761)) >>> 0, looks = drawnLooks(fr, mibi(gs)), v = standVariant(st, looks).key;
    const want = [{ markings: "patches" }, { crown: "bare head" }, { "eye-rings": "wide pale rings" }, { crown: "bare head", markings: "patches" }][picks.length];
    if (!keys.has(v) && Object.entries(want).every(([t, l]) => looks[t] === l) && !(picks.length < 2 && looks.crown === "bare head" && picks.length === 0)) { keys.add(v); picks.push(s); }
  }
  return picks;
})();

describe("four Loikas, four stands", () => {
  const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: true, at: T0 }; for (const s of FOUR) S.seedAdults(st, "S01", s, 1, settings); return st; };
  const sv0 = (over = {}) => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, carryReqs: [], ...over });
  const env = { podById: () => null, frameOf, mibiGenome: () => null };
  const reqs = (b) => b.requests.filter((r) => r.kind === "mibi");
  const wipe = () => { for (const e of manifest()) if (e.id.startsWith("mibi:")) dropAsset(e.id); };
  after(wipe);

  test("the search found four mibis whose looks differ", () => { assert.equal(FOUR.length, 4); });

  test("Home's glass: four pods with different read looks give four different stands (four ids, four different pictures), each named by its drawn looks", () => {
    const st = world(), b = homeBuild({ st, sv: sv0(), settings, docked: true, ui: {}, focus: null, light: "day" }, home, frameSpec), R = b.props.regions;
    assert.equal(R.residents.length, 4);
    const ids = R.residents.map((r) => r.picture); assert.equal(new Set(ids).size, 4, "four ids");
    for (const r of reqs(b)) assert.deepEqual(r.looks, drawnLooks(fr, st.mibis.find((m) => m.id === r.mibi)), "the request carries the mibi's own drawn looks");
    registerPictures(b.requests, { ...env, mibiGenome: (id) => S.mibiById(st, id)?.genome });
    const px = ids.map((id) => { assert.deepEqual([assetEntry(id).w, assetEntry(id).h], [144, 152]); return sha(assetOf(id).rgba()); });
    assert.equal(new Set(px).size, 4, "four different stands");
    for (const id of ids) assert.equal(assetEntry(id).status, "placeholder", "stand-ins until the masters land");
    wipe();
  });

  test("the same looks are the same stand, the same individual everywhere: Home, the Vivarium's tiles and one mibi up close name its looks the same way", () => {
    const st = world(); for (const m of st.mibis) m.paint = { state: "landed" };
    const one = st.mibis[0], looks = drawnLooks(fr, one);
    assert.deepEqual(mibiPictureOf(st, one, [144, 152], settings).looks, looks);
    const h = habitatBuild({ st, sv: sv0(), settings, docked: true, light: "day", focus: null, habId: one.id, meetId: null, armed: false }, hab, frameSpec, home);
    const near = h.requests.find((r) => r.id === h.props.regions.resident.picture); assert.deepEqual([near.size, near.looks], [[304, 312], looks]);
    assert.equal(mibiPictureOf(st, one, [304, 312], settings).id, h.props.regions.resident.picture, "the host's swap dither names the same picture");
    const v = vivariumBuild({ st, sv: sv0(), settings, docked: true, light: "day", focus: null, seen: null }, viv, frameSpec, home);
    const tile = v.requests.find((r) => r.id === v.props.regions.tiles.items.find((t) => t.id === String(one.id)).picture); assert.deepEqual([tile.size, tile.looks], [[48, 48], looks]);
    registerPictures([...h.requests, ...v.requests], { ...env, mibiGenome: (id) => S.mibiById(st, id)?.genome });
    assert.notEqual(assetOf(near.id).rgba(), null); wipe();
  });

  test("a child read later redraws: reading a chapter changes the picture's variant, and nothing else does", () => {
    const st = world(), m = st.mibis[0]; m.read = []; const before = mibiPictureOf(st, m, [144, 152], settings).id;
    assert.deepEqual(mibiPictureOf(st, m, [144, 152], settings).looks, Object.fromEntries(Object.entries(standLooksOf("S01")).map(([i, t]) => [i, t.modal])));
    m.read = allRead; const after = mibiPictureOf(st, m, [144, 152], settings).id;
    const looks = drawnLooks(fr, m), stand = layeredStand("S01", "adult", [144, 152]);
    assert.equal(after, standPictureId(stand, looks)); assert.equal(before, standPictureId(stand, drawnLooks(fr, { genome: m.genome, read: [] })));
    m.name = "Renamed"; m.outings = 9; assert.equal(mibiPictureOf(st, m, [144, 152], settings).id, after, "nothing but the read looks changes the picture");
  });

  test("a juvenile, a sleeper's curl and a species with no layers are drawn as before: the genome's digest names the picture", () => {
    const st = world(), m = st.mibis[0]; m.born = st.turn;   // a juvenile
    assert.equal(S.mibiStage(st, m, settings), "juvenile");
    const j = mibiPictureOf(st, m, [144, 152], settings); assert.equal(j.looks, undefined); assert.match(j.id, new RegExp(`^mibi:${genomeDigest(m.genome)}:juvenile:\\d+x\\d+$`), "the old name: the genome's digest");
    m.born = st.turn - 99; assert.equal(mibiPictureOf(st, m, [96, 88], settings).looks, undefined, "96×88 is the curl");
    const w = { st: S.freshSt("w1", 3, T0) }; S.normalize(w.st); S.seedAdults(w.st, "S03", 9, 1, settings);
    const t = mibiPictureOf(w.st, w.st.mibis[0], [144, 152], settings); assert.equal(t.looks, undefined); assert.equal(t.id, `mibi:${genomeDigest(w.st.mibis[0].genome)}:adult:144x152`);
  });

  test("a light grades the composed stand as it grades a master: dawn, dusk and night are derived from the day's picture", () => {
    const st = world(), m = st.mibis[0], day = mibiPictureOf(st, m, [144, 152], settings, "day"), night = mibiPictureOf(st, m, [144, 152], settings, "night");
    assert.equal(night.id, day.id + ":night");
    const b = homeBuild({ st, sv: sv0(), settings, docked: true, ui: {}, focus: null, light: "night" }, home, frameSpec);
    registerPictures(b.requests, { ...env, mibiGenome: (id) => S.mibiById(st, id)?.genome });
    const d = assetOf(day.id).rgba(), n = assetOf(night.id).rgba(); let darker = 0; for (let i = 0; i < d.length; i += 4) { if (d[i + 3] !== n[i + 3]) assert.fail("alpha is the picture's"); if (d[i + 3] && n[i] < d[i]) darker++; }
    assert.ok(darker > 1000, "night is the day's picture in the night's light");
    wipe();
  });

  test("with no layers loaded nothing changes: every mibi is named by its genome's digest, as before", () => {
    unloadStands();
    try { const st = world(), m = st.mibis[0], p = mibiPictureOf(st, m, [144, 152], settings); assert.equal(p.id, `mibi:${genomeDigest(m.genome)}:adult:144x152`); assert.equal(p.looks, undefined); }
    finally { loadStandLooksFs(); loadStandLayersFs(); }
  });

  test("the stand-ins are in the placeholder register", async () => {
    const { PLACEHOLDERS } = await import("../src/art.mjs"); assert.ok(PLACEHOLDERS.some((p) => p.id === "stand-layers" && /proof/.test(p.what)));
  });
});
