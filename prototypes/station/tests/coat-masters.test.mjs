// The coats (release 21g, art desk ruling R21-COAT-V8): Loika's pictures baked in a Tint x Shade grid and placed beside the painted master (between-dark); the Markings pick the adult's awake picture, in the mibi's coat.
//   node --test prototypes/station/tests/coat-masters.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { coatOf, coatMaster, COAT_TRAITS, MARKED_PICTURE } from "../src/stands.mjs";
import { placeMaster } from "../../ui/assets.mjs";
import { planCoats, coatGrid, PAIRS, DESK, MARKED } from "../../ui/tools/coat-masters.mjs";
import { SIZES, figureBox } from "../../ui/tools/game-masters.mjs";
import { decodePNG } from "../../ui/png.mjs";
import { readIndex } from "../../ui/tools/index-io.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/assets/masters"), index = readIndex(root), M = index.masters;
const put = (id) => placeMaster({ id, w: M[id].w, h: M[id].h, file: M[id].file, hash: M[id].sha256, signed: "test", status: "master" }, { w: M[id].w, h: M[id].h, rgba: () => new Uint8ClampedArray(0) });
const looks = (tint, shade, marking) => ({ "body-hue": tint, "body-value": shade, markings: marking });
// S01 Loika's placed grid (the game's coats): redder / between / yellower by dark / between / light; between-dark is the painted master
const COATS = ["redder", "between", "yellower"].flatMap((t) => ["dark", "between", "light"].map((s) => `${t}-${s}`)), PAINTED = "between-dark";

test("coatOf: Tint x Shade name the coat, Markings the awake picture; an unread coat chapter is the painted coat", () => {
  assert.equal(coatOf("S01", looks("redder", "dark", "plain")), "redder-dark");
  assert.equal(coatOf("S01", looks("yellower", "light", "spotted")), "yellower-light+lay-spots");
  assert.equal(coatOf("S01", looks("between", "between", "shaded")), "between-between+lay-gradient");
  assert.equal(coatOf("S01", {}), null, "an unread chapter draws no look, so the painted coat");
  assert.equal(coatOf("S02", looks("redder", "dark", "bands")), null, "a kind with no coat traits");
  assert.deepEqual(MARKED_PICTURE, MARKED, "the game and the tool name the same marked pictures");
  assert.deepEqual(Object.keys(COAT_TRAITS), ["S01", "S03", "S04", "S05", "S08", "S12", "S17", "S20"], "the eight first kinds (release 22b)");
});
test("coatMaster: the coat's master where it is placed, the marked picture for the adult's awake stand only, else the painted master", () => {
  const painted = "mibi-adult-S01-304x312", marked = "mibi-adult-S01-redder-dark-lay-spots-304x312";
  for (const id of [painted, marked, "mibi-adult-S01-redder-dark-304x312", "mibi-adult-S01-redder-dark-curl-304x312", "mibi-juvenile-S01-redder-dark-304x312", "mibi-adult-S01-redder-dark-shake-304x312"]) put(id);
  assert.equal(coatMaster(painted, "S01", null), painted);
  assert.equal(coatMaster(painted, "S01", "redder-dark"), "mibi-adult-S01-redder-dark-304x312");
  assert.equal(coatMaster(painted, "S01", "redder-dark+lay-spots"), marked);
  assert.equal(coatMaster("mibi-adult-S01-curl-304x312", "S01", "redder-dark+lay-spots"), "mibi-adult-S01-redder-dark-curl-304x312", "asleep: the coat only");
  assert.equal(coatMaster("mibi-adult-S01-shake-304x312", "S01", "redder-dark+lay-spots"), "mibi-adult-S01-redder-dark-shake-304x312", "a habit pose: the coat only");
  assert.equal(coatMaster("mibi-juvenile-S01-304x312", "S01", "redder-dark+lay-spots"), "mibi-juvenile-S01-redder-dark-304x312", "the young: the coat only");
  assert.equal(coatMaster(painted, "S01", "between-dark+lay-bands"), painted, "between-dark's bands picture is not registered in this test: the painted master shows");
  assert.equal(coatMaster("mibi-adult-S02-304x312", "S02", "redder-dark"), "mibi-adult-S02-304x312", "a kind with no coat masters");
});
test("the placed grid: eight coats beside the painted one, for the stand (three sizes), asleep, shake and calm, adult and young; the markings for the adult in all nine coats; each the painted master's size", () => {
  const poses = { "": SIZES, "curl-": ["304x312"], "shake-": ["304x312"], "calm-": ["304x312"] };
  for (const coat of COATS.filter((c) => c !== PAINTED)) for (const [pose, list] of Object.entries(poses)) for (const size of list) for (const stage of ["adult", "juvenile"]) {
    const id = `mibi-${stage}-S01-${coat}-${pose}${size}`, painted = `mibi-${stage}-S01-${pose}${size}`;
    assert.ok(M[id], id + " is placed"); assert.equal(M[id].w, M[painted].w); assert.equal(M[id].h, M[painted].h);
  }
  for (const coat of COATS) for (const lay of Object.values(MARKED)) for (const size of SIZES) { const id = `mibi-adult-S01-${coat}-${lay}-${size}`; assert.ok(M[id], id + " is placed"); }
  assert.equal(Object.keys(M).filter((id) => /^mibi-(adult|juvenile)-S01-(russet|ash|charcoal)/.test(id)).length, 0, "the old coat names are retired");
  const box = (id) => figureBox({ w: M[id].w, h: M[id].h, data: decodePNG(readFileSync(path.join(root, M[id].file))).data });
  for (const coat of ["redder-dark", "yellower-light"]) assert.deepEqual(box(`mibi-adult-S01-${coat}-304x312`), box("mibi-adult-S01-304x312"), coat + " keeps the painted figure's box (the recolour leaves alpha alone)");
});
// The desk commit these checks read (mibi-art, branch art/desk): the last commit that changed the coat outputs placed here (S03 Tuikis 8f424d91d and S12 Peplos e55f4dc3d dark rows, after S04/S05/S20 d1f5288c7, 4f9e0ed74, 0189af633, 4c8e2d00e and the faces f194573e7).
// The desk is read where it stands, so the checks run only while its coat tools and outputs are still exactly that commit's; a later desk commit that changes them no longer turns this red (the placed files above stand).
export const DESK_COMMIT = "bce6ae1e66edfd3f24659638b8c5378f8d424b0f";   // bce6ae1e6: Loika's chin mouth line removed on asleep, calm, shake (adult and young), the coats rebaked
const deskPinned = () => {
  if (!existsSync(DESK)) return false;
  const job = "art-jobs/2026-11-07-coat-recolour", repo = path.resolve(DESK, "../..");
  try { execFileSync("git", ["-C", repo, "diff", "--quiet", DESK_COMMIT, "--", `${job}/tools`, `${job}/work/out`, `${job}/work/out-tool`], { stdio: "ignore" }); return true; } catch { return false; }
};
test("the generator: every cell of the grid exists in the desk's folder, and the desk's between-dark, put through the placement, is the placed painted master to the byte", () => {
  if (!deskPinned()) return;   // the desk is not on this machine, or has moved on from DESK_COMMIT
  const plan = planCoats({ desk: DESK, index });
  if (!plan.kinds.length) return;   // the desk's folder is not on this machine: the placed files above stand
  assert.deepEqual(plan.missing, [], "no cell of the grid is missing");
  assert.ok(plan.painted.length >= 12 && plan.painted.every((c) => c.ok), plan.painted.filter((c) => !c.ok).map((c) => c.id).join(", "));
  const s01 = planCoats({ desk: DESK, index, only: "S01" });
  assert.ok(s01.ops.every((o) => M[o.id] && M[o.id].sha256), "every S01 op is in the index");
  assert.ok(PAIRS.every((p) => p.length === 4));
  assert.equal(s01.cells, 279);   // 243 + the living windows 18 baked pictures + the Library faces 18 (40 x 40 and 64 x 64, nine coats each)
});
test("the grid is per kind: S01 redder / between / yellower with between-dark painted; S20 yellower / between / greener with between-between painted", () => {
  if (!deskPinned()) return;
  const s01 = coatGrid(DESK, "S01"), s20 = coatGrid(DESK, "S20");
  assert.deepEqual(s01.tints, ["redder", "between", "yellower"]); assert.equal(s01.painted, "between-dark"); assert.equal(s01.coats.length, 9);
  assert.deepEqual(s20.tints, ["yellower", "between", "greener"]); assert.equal(s20.painted, "between-between"); assert.equal(s20.coats.length, 9);
  assert.deepEqual(s20.coats.filter((c) => c.startsWith("between-")), ["between-dark", "between-between", "between-light"]);
});
test("S20 (rebuilt on its three-quarter stand): all nine coats are placed by the plan, the between-between cell over the old painted master's id, and the placed files are the plan's to the byte", () => {
  if (!deskPinned()) return;
  const plan = planCoats({ desk: DESK, index, only: "S20" }), { coats, painted } = coatGrid(DESK, "S20");
  assert.deepEqual(plan.kinds, ["S20"]); assert.deepEqual(plan.missing, []);
  assert.deepEqual(plan.painted, [], "a rebuilt kind's painted cell is placed, not proven against the old master");
  for (const coat of coats) {
    const id = coat === painted ? "mibi-adult-S20-304x312" : `mibi-adult-S20-${coat}-304x312`, op = plan.ops.find((o) => o.id === id);
    assert.ok(op, `${coat}: placed as ${id}`);
    assert.equal(createHash("sha256").update(op.buf).digest("hex"), M[id].sha256, `${id} is the desk's cell as placed`);
  }
  assert.ok(plan.ops.some((o) => o.id === "mibi-adult-S20-between-dark-304x312"), "between-dark is a coat of its own for S20, placed");
  assert.ok(!plan.ops.some((o) => /S20-redder/.test(o.id)), "no S01 Tint for S20");
});
test("a kind the game has not placed is skipped (the desk may still be painting it); a named kind is read whole", () => {
  const desk = mkdtempSync(path.join(os.tmpdir(), "coat-desk-")), cfg = path.join(desk, "tools/cfg/S09");
  mkdirSync(cfg, { recursive: true }); writeFileSync(path.join(cfg, "kind-v8.json"), JSON.stringify({ pictures: [{ id: "stand" }], coats: [] }));   // no palette, no cells: unfinished
  const plan = planCoats({ desk, index });
  assert.deepEqual(plan.kinds, []); assert.deepEqual(plan.skipped, ["S09"]); assert.deepEqual(plan.missing, []); assert.deepEqual(plan.painted, []);
  assert.throws(() => planCoats({ desk, index, only: "S09" }), "a named kind is read whole, so an unfinished one is refused");
});
test("the Home window's baked 144x152 adult and 104x112 young are placed in all eight coats beside the painted master, at the painted master's size", () => {
  for (const coat of COATS.filter((c) => c !== PAINTED)) for (const [stage, size] of [["adult", "144x152"], ["juvenile", "104x112"]]) {
    const id = `mibi-${stage}-S01-${coat}-${size}`, painted = `mibi-${stage}-S01-${size}`;
    assert.ok(M[id], id + " is placed"); assert.equal(M[id].w, M[painted].w); assert.equal(M[id].h, M[painted].h);
  }
});
test("the Library's baked faces (release 21h2) are placed in all nine coats at 40 x 40 and 64 x 64", () => {
  for (const coat of COATS) for (const s of [40, 64]) { const id = `mibi-face-S01-${coat}-${s}x${s}`; assert.ok(M[id], id + " is placed"); assert.equal(M[id].w, s); assert.equal(M[id].h, s); }
});
