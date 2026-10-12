// Fix 1b part 3: an owned mibi is never absent. An adult or elder takes its signed adult stand, else its species' signed juvenile stand 1:1 in its own size, else the rig; no S01 to S16 species reaches the rig.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { placeMaster } from "../../ui/assets.mjs";
import { standLook, juvenileSize } from "../src/stands.mjs";
import { homeBuild } from "../src/views/home-props.mjs";
import { habitatBuild } from "../src/views/habitat-props.mjs";
import { vivariumBuild } from "../src/views/vivarium-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station"), mastersDir = path.resolve(here, "../../ui/assets/masters");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), home = J("home.json"), frameSpec = J("frame.json"), viv = J("vivarium.json"), hab = J("habitat.json");
// the placed masters, as the page's loadMasters places them (the files are not decoded: a picture here is its size)
const index = JSON.parse(readFileSync(path.join(mastersDir, "index.json"), "utf8")).masters;
for (const [id, e] of Object.entries(index)) placeMaster({ id, w: e.w, h: e.h, file: e.file, hash: e.sha256, signed: e.signed, status: e.status ?? "master" }, { w: e.w, h: e.h, rgba: () => new Uint8ClampedArray(0) });
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
  assert.equal(res(s3).stage, "adult"); assert.equal(res(s3).picture, `mibi:${s3.id}:adult:144x152`);
  const r4 = b.requests.find((r) => r.id === `mibi:${s4.id}:juvenile:96x88`); assert.ok(r4, "the sleeper asks for the juvenile at 96×88"); assert.deepEqual([r4.size, r4.stage, r4.species], [[96, 88], "juvenile", "S04"]);
  assert.equal(slp.stage, "juvenile");
  const w = world(); S.seedAdults(w, "S04", 5, 1, settings); const m = w.mibis[0];
  const b2 = homeBuild({ st: w, sv: sv0(), settings, docked: true, ui: {}, focus: null, light: "day" }, home, frameSpec), p = b2.props.regions.residents[0];
  assert.deepEqual([p.stage, p.picture], ["juvenile", `mibi:${m.id}:juvenile:104x112`]);
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
  const v = vivariumBuild({ st: w.st, sv: sv0(), settings, docked: true, light: "day", focus: null, seen: null }, viv, frameSpec, home);
  const tile = (m) => v.requests.find((r) => r.id === v.props.regions.tiles.items.find((t) => t.id === String(m.id)).picture);
  assert.deepEqual([tile(a).stage, tile(a).size], ["juvenile", [48, 48]]); assert.deepEqual([tile(pip).stage, tile(pip).size], ["adult", [48, 48]]);
});
