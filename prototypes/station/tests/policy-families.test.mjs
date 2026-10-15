// Every picture Pods asks for, in every state of every species, is in a layer family (ui/asset-policy.mjs): the host sends each picture with its policy, and a picture in no family is a page error, never a guess.
// The ids are the ones the view requests and the ones its props and the frame's spec name that the asset manifest holds, as the host collects them (host.mjs).
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { podsProps } from "../src/views/pods-props.mjs";
import { registerPictures, iconRequests } from "../src/pictures.mjs";
import { SPECS } from "../src/game.mjs";
import { assetEntry, placeMaster, dropAsset } from "../../ui/assets.mjs";
import { policyOf } from "../../ui/asset-policy.mjs";
import { homeBuild } from "../src/views/home-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("pods.json"), frameSpec = J("frame.json"), schema = J("pods.props.json");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const SPECIES = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => f.slice(8, 11));

function stock(ids, gs = 3) { const st = S.freshSt("w1", 1, 1000); S.normalize(st); for (const id of ids) S.seedPodFromGenome(st, podGenome(frameOf(id), gs), settings, 1000); return st; }
const model = (st, over = {}) => ({ st, settings, docked: true, crates: 0, present: {}, focus: "pod", ...over, ui: { view: "overview", cur: st.tray[0]?.id ?? null, ci: 0, cmp: null, wildArm: 0, ...(over.ui || {}) } });
const rich = (ids) => { const st = stock(ids); for (const p of st.tray) S.skipIdentify(st, p); st.d = 999; st.e = 99; st.s = 99; return st; };
const readSome = (st, i, n) => { const p = st.tray[i], fr = frameOf(S.speciesOf(p)); fr.chapters.slice(0, n ?? fr.chapters.length).forEach((c) => S.read(st, p, c.id, settings)); return st; };
function scenes() {
  const out = [["an empty rack", model(S.freshSt("w1", 1, 1000), { focus: null, ui: { view: "collection" } })]];
  for (const id of SPECIES) {
    out.push([`${id}: unidentified`, model(stock([id]))]);
    const st = readSome(rich([id, id]), 0, 2);
    out.push([`${id}: the collection`, model(st, { focus: "place.0", ui: { view: "collection" } })]);
    out.push([`${id}: the overview`, model(st, { focus: "rail.1" })]);
    out.push([`${id}: a chapter page`, model(st, { focus: "rail.1", ui: { view: "chapter", ci: 1 } })]);
    const whole = readSome(rich([id, id]), 0); readSome(whole, 1);
    out.push([`${id}: Compare`, model(whole, { focus: null, ui: { view: "overview", cmp: { a: whole.tray[0].id, b: whole.tray[1].id, ci: 0 } } })]);
  }
  return out;
}
const SCENES = scenes();
SPECS.pods = spec; SPECS.frame = frameSpec;
// the signed masters take their ids as the page places them (loadMasters), with no pixels: only their ids, sizes and status matter here
{ const base = path.resolve(here, "../../ui/assets/masters"), index = JSON.parse(readFileSync(path.join(base, "index.json"), "utf8"));
  for (const [id, e] of Object.entries(index.masters)) placeMaster({ id, w: e.w, h: e.h, file: e.file, hash: e.sha256, signed: e.signed, slice: e.slice ?? null, tile: e.tile ?? null, status: e.status ?? "master" }, { w: e.w, h: e.h, rgba: () => new Uint8ClampedArray(e.w * e.h * 4) }); }
const walk = (o, into) => { if (typeof o === "string") { if (assetEntry(o)) into.add(o); } else if (o && typeof o === "object") for (const v of Object.values(o)) walk(v, into); };

test("every picture Pods asks for, in every state of every species, is in a layer family", () => {
  const seen = new Set(), unknown = [];
  for (const [name, m] of SCENES) {
    const v = podsProps(m, spec, frameSpec), reqs = [...v.requests, ...iconRequests()];
    registerPictures(reqs, { podById: (id) => S.podById(m.st, id), frameOf });
    const ids = new Set(reqs.map((r) => r.id)); walk(v.props, ids); walk(frameSpec.regions, ids);
    for (const id of ids) { if (!assetEntry(id) || seen.has(id)) continue; seen.add(id); try { policyOf(id, assetEntry(id).status === "master" ? "master" : "placeholder"); } catch (e) { unknown.push(id + " (" + name + ")"); } }
  }
  assert.deepEqual(unknown, []); assert.ok(seen.size > 40, "the walk found the pictures: " + seen.size);
});

test("the bed of a light is a painted picture; the one bed of old is in no family", () => {
  for (const l of ["dawn", "day", "dusk", "night"]) assert.equal(policyOf(`home-bed-${l}-192x56`, "master"), "painted");
  assert.throws(() => policyOf("home-bed-192x56"), /no layer family/);
});

test("a juvenile mibi takes the art director's juvenile stand-in at its size when one is placed, else the rig; an adult takes Pip's stand at its size when placed (the adult hook, Station M1 §2.6), else the rig; the stand-ins are painted masters", () => {
  const MASTER = "mibi-juvenile-S01-304x312", env = { podById: () => null, frameOf, mibiGenome: () => podGenome(frameOf("S01"), 3) };
  const ask = (id, stage, [w, h] = [304, 312]) => ({ kind: "mibi", id: `mibi:${id}:${stage}:${w}x${h}`, mibi: id, stage, species: "S01", size: [w, h] });
  const ids = ["juvenile", "adult"].flatMap((st) => [1, 2].flatMap((n) => [`mibi:${n}:${st}:304x312`, `mibi:${n}:${st}:144x152`]));   // 144×152: a size with no juvenile master in the real index
  const clear = () => { for (const id of ids) dropAsset(id); dropAsset(MASTER); };
  clear(); registerPictures([ask(1, "juvenile", [144, 152]), ask(1, "adult", [144, 152])], env);
  assert.equal(assetEntry("mibi:1:juvenile:144x152").file, null, "no stand-in placed at this size: the juvenile builds the rig"); assert.match(assetEntry("mibi:1:juvenile:144x152").until, /juvenile stand-in/);
  placeMaster({ id: MASTER, w: 304, h: 312, file: "mibi-juvenile-S01-304x312.png", hash: "0".repeat(64), signed: "2026-10-11", status: "master" }, { w: 304, h: 312, rgba: () => new Uint8ClampedArray(304 * 312 * 4) });
  registerPictures([ask(2, "juvenile"), ask(2, "adult")], env);
  const j = assetEntry("mibi:2:juvenile:304x312"), a = assetEntry("mibi:2:adult:304x312");
  assert.equal(j.file, "mibi-juvenile-S01-304x312.png"); assert.equal(j.hash, "0".repeat(64)); assert.equal(a.file, null, "an adult never takes the juvenile's stand-in: with no adult stand placed it is the rig");
  assert.equal(policyOf("mibi:2:juvenile:304x312", "master"), "painted"); assert.equal(policyOf(MASTER, "master"), "painted");
  const ADULT = "mibi-adult-S01-304x312"; dropAsset("mibi:3:adult:304x312"); dropAsset("mibi:3:elder:304x312");
  placeMaster({ id: ADULT, w: 304, h: 312, file: "mibi-adult-S01-304x312.png", hash: "1".repeat(64), signed: "2026-10-11", status: "master" }, { w: 304, h: 312, rgba: () => new Uint8ClampedArray(304 * 312 * 4) });
  registerPictures([ask(3, "adult"), ask(3, "elder")], env);
  assert.equal(assetEntry("mibi:3:adult:304x312").file, "mibi-adult-S01-304x312.png", "the adult hook: Pip's placed stand"); assert.equal(assetEntry("mibi:3:elder:304x312").file, "mibi-adult-S01-304x312.png", "an elder takes the adult's stand");
  assert.equal(policyOf(ADULT, "master"), "painted");
  dropAsset(ADULT); dropAsset("mibi:3:adult:304x312"); dropAsset("mibi:3:elder:304x312");
  clear();
});

test("fix 7: a resident master's grade is painted at either status; <master>:day, a bed at a light are in no family; a night atlas is art while a stand-in and painted once master; the residents Home asks for at every light are in a family", () => {
  const masters = ["mibi-juvenile-S01-304x312", "mibi-juvenile-S02-104x112", "mibi-juvenile-S03-96x88", "mibi-juvenile-S01-48x48", "mibi-adult-S01-144x152", "mibi-adult-S02-304x312", "mibi-adult-S03-96x88", "mibi-adult-S01-48x48", "mibi-juvenile-S01-stand-b1-104x112", "mibi-adult-S02-curl-b2-144x152", "mibi-adult-S01-wingdown-144x152", "mibi-juvenile-S01-shadow-80x16"];
  for (const m of masters) for (const l of ["dawn", "dusk", "night"]) for (const status of ["master", "new", "held", "placeholder"]) assert.equal(policyOf(`${m}:${l}`, status), "painted", `${m}:${l} ${status}`);
  for (const bad of ["mibi-juvenile-S01-104x112:day", "home-bed-night-192x56:night"]) assert.throws(() => policyOf(bad, "master"), /no layer family/, bad);
  for (const part of ["walk:104x112", "close:304x312", "nap:96x88"]) { const id = `moving:juvenile:S01:${part}:species:night`; assert.equal(policyOf(id, "placeholder"), "art"); assert.equal(policyOf(id, "master"), "painted"); assert.throws(() => policyOf(`moving:juvenile:S01:${part}:species:day`, "master"), /no layer family/, "a :day atlas never exists"); }
  assert.equal(policyOf("moving:juvenile:S01:shadow:80x16", "placeholder"), "art");
  const w = S.freshSt("w1", 3, 1000); S.normalize(w); S.seedAdults(w, "S01", 5, 3, settings); for (const m of w.mibis) m.paint = { state: "landed" }; w.dock = { docked: true, at: 1000 };
  const sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [w.mibis[0].id], tier: 1, shield: 3 }, homeSpec = J("home.json");
  for (const light of ["dawn", "day", "dusk", "night"]) {
    const b = homeBuild({ st: w, sv, settings, docked: true, ui: {}, focus: null, light, motionSets: true }, homeSpec, frameSpec), mibi = b.requests.filter((r) => r.kind === "mibi" || r.kind === "moving");
    registerPictures(b.requests, { podById: () => null, frameOf, mibiGenome: (id) => w.mibis.find((m) => m.id === id)?.genome }); assert.ok(mibi.length >= 2, String(mibi.length));
    for (const r of mibi) { const e = assetEntry(r.id); assert.ok(e, r.id); assert.ok(["art", "painted"].includes(policyOf(r.id, e.status === "master" ? "master" : "placeholder")), r.id); }
  }
});
