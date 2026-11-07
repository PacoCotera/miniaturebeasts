// The Sitting's kinds (release 21g): a habit a kind has no pose for shows the CURL, never the stand (art desk R21c-4); Loika's shake-dry and calm are its own poses; and the one scale per kind keeps every pose of the
// kind inside 0.55 of the glass's width and 0.65 of its height, on the Untuva's oversized frames as on the Loika's.
//   node --test prototypes/station/tests/sitting-kinds.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { placeMaster } from "../../ui/assets.mjs";
import { decodePNG } from "../../ui/png.mjs";
import { poseFor, inkBox } from "../src/layered-stand.mjs";
import * as S from "../src/state.mjs";
import { offer } from "../src/sitting.mjs";
import { setFrames } from "../src/genome.mjs";
import { withSeals } from "./fixtures/sealed.mjs";
import { readdirSync } from "node:fs";
const framesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../workbench/frames/language");
setFrames(withSeals(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8")))));
import "./fixtures/place-poses.mjs";
import { sittingKindScale } from "../src/views/home-props.mjs";
import { assetEntry, asset } from "../../ui/assets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/assets/masters"), M = JSON.parse(readFileSync(path.join(root, "index.json"), "utf8")).masters, GLASS = [544, 408];
for (const [id, m] of Object.entries(M)) if (/^mibi-(adult|juvenile)-S0[123]-.*304x312$/.test(id) && !assetEntry(id)) {
  const im = decodePNG(readFileSync(path.join(root, m.file)));
  placeMaster({ id, w: m.w, h: m.h, file: m.file, hash: m.sha256, signed: "test", status: "master" }, { w: m.w, h: m.h, rgba: () => im.data });
}
test("a habit with no pose of the kind shows the curl, never the stand; Loika's shake-dry and calm are its poses", () => {
  for (const stage of ["adult", "juvenile"]) {
    assert.equal(poseFor("S01", stage, "shake-dry").pose, "shake"); assert.equal(poseFor("S01", stage, "calm").pose, "calm");
    for (const habit of ["sniff", "puff", "dig", "glow", "sleep-curled", "no-such-habit"]) assert.equal(poseFor("S01", stage, habit).pose, "curl", `S01 ${stage} ${habit}`);
  }
  assert.equal(poseFor("S02", "adult", "sniff").pose, "sniff", "an Untuva's own pose");
  assert.equal(poseFor("S02", "adult", "shake-dry").pose, "curl", "an Untuva has no shake: the curl");
});
test("the Sitting's picker leaves out a habit with no picture of its own: Pesko has no 'Counting its spines' card, Rupar keeps its own poses, every kind keeps the curl", () => {
  const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", sittingWait: "hours" };
  const st = S.freshSt("w1", 3, 1000000); S.normalize(st);
  const one = (sp, habits) => { S.seedAdults(st, sp, 7, 1, settings); const m = st.mibis[st.mibis.length - 1]; m.habits = habits.slice(); return m; };
  const pesko = one("S06", ["spine-count", "slab-lift", "sleep-curled"]);
  assert.deepEqual(offer(st, pesko, null).poses, ["sleep-curled"], "Pesko has no spine-count or slab-lift picture: only the curl it truly has");
  const rupar = one("S08", ["fan-tilt", "bank-dig", "sleep-curled"]);
  assert.deepEqual(offer(st, rupar, null).poses, ["fan-tilt", "bank-dig", "sleep-curled"], "Rupar's own poses are offered");
  const loika = one("S01", ["shake-dry", "calm", "sleep-curled"]);
  assert.deepEqual(offer(st, loika, null).poses, ["shake-dry", "calm", "sleep-curled"]);
});
test("the kind scale: every placed pose and marked picture of the kind, drawn at the scale, is at most 0.55 of the glass's width and 0.65 of its height", () => {
  for (const sp of ["S01", "S02", "S03"]) {
    const k = sittingKindScale(sp, GLASS); assert.ok(k > 0 && k <= 1, `${sp} ${k}`);
    for (const [id, m] of Object.entries(M)) {
      if (!new RegExp(`^mibi-(?:(?:adult|juvenile)-${sp}(?:-(?:curl|shake|calm|puff|sniff|dig|glow))?|adult-${sp}-between-dark-lay-[a-z]+)-304x312$`).test(id)) continue;
      const a = asset(id), box = inkBox(a.rgba(), a.w, a.h); if (!box) continue;
      assert.ok(box[2] * k <= 0.55 * GLASS[0] + 1 && box[3] * k <= 0.65 * GLASS[1] + 1, `${id}: ${Math.round(box[2] * k)} x ${Math.round(box[3] * k)} in ${GLASS}`);
    }
  }
});
