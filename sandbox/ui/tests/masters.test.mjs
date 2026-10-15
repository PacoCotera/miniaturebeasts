// The placed-master pipeline: a signed master replaces its stand-in by id and size; a wrong size, a tampered file or an unsigned slice is not placed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { encodePNG } from "../png.mjs";
import { place, check, signedIds } from "../tools/place-masters.mjs";
import { registerAsset, placeMaster, assetEntry, asset, dropAsset, placeholders, NOT_FINAL } from "../assets.mjs";

function folder() {
  const dir = mkdtempSync(path.join(tmpdir(), "masters-")), slices = path.join(dir, "slices"), manifest = {};
  mkdirSync(slices);
  for (const [id, w, h] of [["page-pane-8x4", 8, 4], ["pod-small-sealed", 4, 6], ["room-shelf", 6, 2]]) {
    const png = encodePNG(w, h, new Uint8Array(w * h * 4).fill(200)); writeFileSync(path.join(slices, id + ".png"), png);
    manifest[id] = { size: [w, h], rect: [0, 0, w, h], sha256: createHash("sha256").update(png).digest("hex") };
  }
  writeFileSync(path.join(slices, "manifest.json"), JSON.stringify(manifest));
  writeFileSync(path.join(dir, "README.md"), "# Masters\n\n### Page pane (signed)\n\n| Slice id | Size |\n| --- | --- |\n| `page-pane-8x4` | 8×4 |\n\n### Pods\n\n| Slice id | Size |\n| --- | --- |\n| `pod-small-sealed` | 4×6 |\n| `room-shelf` | 6×2 |\n");
  return dir;
}

test("only the slices under a (signed) heading, or named, are placed; the files are checked against the manifest", () => {
  const from = folder(), root = mkdtempSync(path.join(tmpdir(), "placed-"));
  assert.deepEqual([...signedIds(readFileSync(path.join(from, "README.md"), "utf8")).keys()], ["page-pane-8x4"]);
  const r = place({ from, group: "pods", root }); assert.deepEqual(r.placed, ["page-pane-8x4"]); assert.equal(r.skipped.length, 2);
  assert.ok(existsSync(path.join(root, "pods/page-pane-8x4.png")) && !existsSync(path.join(root, "pods/room-shelf.png")));
  const named = place({ from, ids: ["room-shelf"], group: "pods", root }); assert.deepEqual(named.placed.sort(), ["page-pane-8x4", "room-shelf"]);
  assert.deepEqual(check(root), []);
  writeFileSync(path.join(root, "pods/room-shelf.png"), encodePNG(6, 2, new Uint8Array(48).fill(1)));
  assert.match(check(root).join(), /room-shelf.*does not match its hash/);
  assert.throws(() => place({ from, ids: ["nope"], group: "pods", root }), /not in/);
});

test("a master takes its stand-in's id and size: status master with its file and hash; another size is refused", () => {
  registerAsset({ id: "t:pane", w: 8, h: 4, status: "placeholder", until: "the master", build: () => ({ w: 8, h: 4, rgba: () => null }) });
  const pic = { w: 8, h: 4, rgba: () => "master-pixels" };
  placeMaster({ id: "t:pane", w: 8, h: 4, file: "pods/pane.png", hash: "ab", signed: "AD" }, pic);
  const e = assetEntry("t:pane"); assert.equal(e.status, "master"); assert.equal(e.file, "pods/pane.png"); assert.equal(e.until, null); assert.equal(asset("t:pane").rgba(), "master-pixels");
  registerAsset({ id: "t:wrong", w: 8, h: 4, build: () => null });
  assert.throws(() => placeMaster({ id: "t:wrong", w: 9, h: 4, file: "x.png", hash: "" }, { w: 9, h: 4, rgba: () => null }), /stand-in's size/);
  assert.throws(() => placeMaster({ id: "t:pane", w: 8, h: 4, file: "x.png", hash: "" }, { w: 7, h: 4, rgba: () => null }), /index says/);
  assert.throws(() => placeMaster({ id: "t:pane", w: 8, h: 4, file: "x.jpg", hash: "" }, pic), /PNG only/);
  for (const id of ["t:pane", "t:wrong"]) dropAsset(id);
});

test("a master placed before its stand-in is registered holds the id; a stand-in of another size then throws", () => {
  placeMaster({ id: "t:early", w: 4, h: 4, file: "pods/early.png", hash: "" }, { w: 4, h: 4, rgba: () => "m" });
  assert.equal(registerAsset({ id: "t:early", w: 4, h: 4, build: () => null }).status, "master");
  assert.throws(() => registerAsset({ id: "t:early", w: 5, h: 4, build: () => null }), /different sizes/);
  dropAsset("t:early");
});

test("the studio's record is carried through: held, placeholder and new masters are placed, flagged, counted as not final; signed ones are masters", () => {
  const pic = (w, h) => ({ w, h, rgba: () => null });
  for (const [id, status] of [["t:signed", "master"], ["t:held", "held"], ["t:ph", "placeholder"], ["t:new", "new"]]) placeMaster({ id, w: 2, h: 2, file: "pods/" + id.slice(2) + ".png", hash: "ab", status }, pic(2, 2));
  assert.equal(assetEntry("t:signed").status, "master"); assert.equal(assetEntry("t:held").status, "held");
  const counted = placeholders().map((e) => e.id).filter((i) => i.startsWith("t:")).sort();
  assert.deepEqual(counted, ["t:held", "t:new", "t:ph"], "the register counts every entry that is not final, and no master"); assert.deepEqual(NOT_FINAL, ["placeholder", "held", "new"]);
  for (const id of ["t:signed", "t:held", "t:ph", "t:new"]) dropAsset(id);
});

test("--status places signed, placeholder, held and new slices flagged in the index, and prunes what the record no longer places", () => {
  const from = folder(), root = mkdtempSync(path.join(tmpdir(), "placed-"));
  writeFileSync(path.join(from, "slices/status.json"), JSON.stringify({ "page-pane-8x4": { status: "signed" }, "pod-small-sealed": { status: "held" }, "room-shelf": { status: "new" } }));
  const r = place({ from, group: "pods", root, byStatus: true, by: "masters-pods abc1234" }); assert.deepEqual(r.placed.sort(), ["page-pane-8x4", "pod-small-sealed", "room-shelf"]);
  const ix = JSON.parse(readFileSync(path.join(root, "index.json"), "utf8")).masters;
  assert.equal(ix["page-pane-8x4"].status, undefined, "signed carries no flag"); assert.equal(ix["pod-small-sealed"].status, "held"); assert.equal(ix["room-shelf"].status, "new");
  assert.match(ix["page-pane-8x4"].signed, /^signed \(masters-pods abc1234\)$/); assert.doesNotMatch(JSON.stringify(ix), /pass \d|verdict/i, "plain provenance, no verdict language");
  writeFileSync(path.join(from, "slices/status.json"), JSON.stringify({ "page-pane-8x4": { status: "signed" }, "room-shelf": { status: "withdrawn" } }));
  const again = place({ from, group: "pods", root, byStatus: true, by: "masters-pods def5678" }); assert.deepEqual(again.placed, ["page-pane-8x4"]);
  const after = JSON.parse(readFileSync(path.join(root, "index.json"), "utf8")).masters;
  assert.deepEqual(Object.keys(after), ["page-pane-8x4"], "the held and the withdrawn leave the index"); assert.ok(!existsSync(path.join(root, "pods/room-shelf.png")), "and their files");
  assert.deepEqual(check(root), []);
});
