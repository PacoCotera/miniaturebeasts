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
import { assetEntry, placeMaster } from "../../ui/assets.mjs";
import { policyOf } from "../../ui/asset-policy.mjs";

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
