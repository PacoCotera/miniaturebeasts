// The placed-master pipeline: a signed master replaces its stand-in by id and size; a wrong size, a tampered file or an unsigned slice is not placed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { encodePNG } from "../png.mjs";
import { place, check, signedIds, placeRooms, checkRooms } from "../tools/place-masters.mjs";
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
  assert.deepEqual(counted, ["t:held", "t:new", "t:ph"], "the register counts every entry that is not final, and no master"); assert.deepEqual(NOT_FINAL, ["placeholder", "stand-in", "held", "new"]);
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

test("a slot the Station emptied (status empty) keeps that status when it is placed again, by --status or --ids, until the studio's record says signed", () => {
  const from = folder(), root = mkdtempSync(path.join(tmpdir(), "placed-"));
  writeFileSync(path.join(from, "slices/status.json"), JSON.stringify({ "page-pane-8x4": { status: "signed" }, "pod-small-sealed": { status: "held" }, "room-shelf": { status: "new" } }));
  place({ from, group: "pods", root, byStatus: true, by: "masters-pods abc1234" });
  const idx = path.join(root, "index.json"), ix = JSON.parse(readFileSync(idx, "utf8"));
  for (const id of ["pod-small-sealed", "room-shelf"]) ix.masters[id].status = "empty";   // the Station's placement: these slots show nothing
  writeFileSync(idx, JSON.stringify(ix, null, 1) + "\n");
  place({ from, group: "pods", root, byStatus: true, by: "masters-pods def5678" });
  let after = JSON.parse(readFileSync(idx, "utf8")).masters;
  assert.equal(after["pod-small-sealed"].status, "empty", "held in the record: stays empty"); assert.equal(after["room-shelf"].status, "empty", "new in the record: stays empty");
  assert.match(after["room-shelf"].signed, /def5678/, "the studio's words are carried (provenance)");
  place({ from, ids: ["room-shelf"], group: "pods", root });
  assert.equal(JSON.parse(readFileSync(idx, "utf8")).masters["room-shelf"].status, "empty", "named with --ids: no record says signed, stays empty");
  writeFileSync(path.join(from, "slices/status.json"), JSON.stringify({ "page-pane-8x4": { status: "signed" }, "pod-small-sealed": { status: "signed" }, "room-shelf": { status: "new" } }));
  place({ from, group: "pods", root, byStatus: true, by: "masters-pods 0a1b2c3" });
  after = JSON.parse(readFileSync(idx, "utf8")).masters;
  assert.equal(after["pod-small-sealed"].status, undefined, "the record says signed: the slot is a master again"); assert.equal(after["room-shelf"].status, "empty");
  assert.deepEqual(check(root), []);
});

// fix 14: every placed mibi-(juvenile|adult)-SXX-* master (a creature still or cell, a contact shadow) has a footprint: ink in its lowest rows, at alpha 128 (stills and cells) or at frame.json's shadowAlpha (the shadows).
// They are the placement guard: the face never receives these ids, the host measures the pictures built from them (station/src/moving.mjs footOf).
test("every placed mibi-(juvenile|adult)-SXX-* master has a non-null footprint (fix 14, FR4)", async () => {
  const { decodePNG } = await import("../png.mjs"), { footprintOf } = await import("../specs/derive.mjs"), root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../assets/masters");
  const idx = JSON.parse(readFileSync(path.join(root, "index.json"), "utf8")).masters, T = JSON.parse(readFileSync(path.join(root, "../../specs/station/frame.json"), "utf8")).focus.ring.shapes.footprint; let n = 0;
  for (const [id, m] of Object.entries(idx)) {
    if (!/^mibi-(juvenile|adult)-S\d{2}-/.test(id)) continue;
    const png = decodePNG(readFileSync(path.join(root, m.file))), foot = footprintOf({ w: png.width, h: png.height, rgba: () => png.data }, 0, png.width, { band: T.band, alpha: /-shadow-/.test(id) ? T.shadowAlpha : T.alpha });
    n++; assert.ok(foot && foot[2] >= 1 && foot[1] <= png.height && foot[0] + foot[2] <= png.width, `${id} has a footprint: ${foot}`);
  }
  assert.ok(n >= 40, "the creature masters were measured: " + n);
});

// R3 (the rooms design): the rooms. A fixture copy of two rooms of masters-pods `rooms/`, small pictures (the sizes come from the files).
const LIGHTS = ["dawn", "day", "dusk", "night"], PW = 64, PH = 36;
function roomsFolder() {
  const dir = mkdtempSync(path.join(tmpdir(), "rooms-")), rooms = path.join(dir, "masters", "rooms"), write = (rel, w, h, a = 255, v = 90) => { const f = path.join(rooms, rel); mkdirSync(path.dirname(f), { recursive: true }); const px = new Uint8Array(w * h * 4).fill(v); for (let i = 3; i < px.length; i += 4) px[i] = a; writeFileSync(f, encodePNG(w, h, px)); return f; };
  const mf = { note: "fixture" };
  for (const room of ["roots", "reeds"]) {
    const bed = room === "roots", lights = {};
    for (const l of LIGHTS) {
      write(`seated-idle-${room}-${l}.png`, PW, PH, 255, 40 + LIGHTS.indexOf(l)); write(`signed-near-${room}-${l}.png`, 34, 26);
      for (const id of ["sorrel", "mister", "mist-2", ...(bed ? ["bed"] : [])]) write(`pieces/${room}/${room}-${id}-${l}.png`, id === "sorrel" ? 8 : id === "mister" ? 6 : id === "bed" ? 16 : 8, id === "sorrel" ? 6 : id === "bed" ? 6 : id === "mister" ? 4 : 2, id === "sorrel" ? 255 : 200);
      if (l !== "day") lights[l] = { idle: `rooms/signed-idle-${room}-${l}.png`, near: `rooms/signed-near-${room}-${l}.png`, signed: `art director, ${room} ${l} verdict` };
      else lights[l] = { idle: `rooms/signed-idle-${room}-day.png`, near: `rooms/signed-near-${room}-day.png` };
    }
    const dayFile = write(`signed-idle-${room}-day.png`, PW, PH);
    const pieces = [
      { id: `${room}-sorrel`, kind: "occluder", level: "main", rect_painting: [10, 26, 8, 6], foot_painting: 31, file: `rooms/pieces/${room}/${room}-sorrel-{light}.png`, keepOut_painting: [11, 30, 6, 3], edge: "hard" },
      { id: `${room}-mister`, kind: "fitting", level: null, rect_painting: [50, 10, 6, 4], foot_painting: 14, file: `rooms/pieces/${room}/${room}-mister-{light}.png` },
      { id: `${room}-mist-2`, kind: "mist", wisp: "rooms/mist/mist-wisp-2.png", rect_painting: [40, 10, 8, 2], alpha: 0.6 },
      { id: `${room}-mist-3`, kind: "mist", wisp: "rooms/mist/mist-wisp-3.png", rect_painting: [40, 14, 8, 2], alpha: 0.5 },   // no file
      ...(bed ? [{ id: "roots-bed", kind: "bed", level: "main", rect_painting: [40, 28, 16, 6], foot_painting: 34, file: "rooms/pieces/roots/roots-bed-{light}.png", keepOut_painting: [38, 20, 24, 14] }] : []),
      { id: `${room}-drop`, kind: "drop", size: [2, 3], what: "a drop" }];
    mf[room] = { day: `rooms/signed-idle-${room}-day.png`, sha256: sha256(readFileSync(dayFile)), signed: `art director, ${room} day composition`, near_day: { file: `rooms/signed-near-${room}-day.png`, signed: `art director, ${room} near day` }, lights,
      levels: [{ id: "main", profile: { x: [2, 40, 62], top_painting: [20, 18] }, bottom_painting: 34 }, { id: "terrace", profile: { x: [2, 20], top_painting: [8] }, bottom_painting: 14, joins: [{ to: "main", kind: "ramp", rect_painting: [14, 10, 20, 12] }] }],
      occluders: room === "reeds" ? [{ id: "reeds-sedge-1", level: "main", rect_painting: [0, 20, 12, 8], foot_painting: 28, keepOut_painting: [2, 26, 8, 2], edge: "hard" }] : [], pieces };
  }
  writeFileSync(path.join(rooms, "rooms-manifest.json"), JSON.stringify(mf));
  return { rooms, manifest: path.join(rooms, "rooms-manifest.json"), mf };
}
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const placeFixture = (f, extra = {}) => { const root = mkdtempSync(path.join(tmpdir(), "placed-")), roomsFile = path.join(root, "rooms.json"); const r = placeRooms({ manifest: f.manifest, root, roomsFile, commit: "abc1234", only: ["roots", "reeds"], ...extra }); return { root, roomsFile, ...r }; };

test("placeRooms writes the index entries (their light's signed text) and a rooms.json that passes the guards; a piece with no file is left out and named", () => {
  const f = roomsFolder(), r = placeFixture(f), ix = JSON.parse(readFileSync(path.join(r.root, "index.json"), "utf8")), data = JSON.parse(readFileSync(r.roomsFile, "utf8"));
  assert.equal(data.schema, "mb-rooms/1"); assert.deepEqual(data.order, ["roots", "reeds"]); assert.equal(data.source.commit, "abc1234");
  const e = ix.masters["room-roots-idle-night-64x36"]; assert.equal(e.file, "rooms/room-roots-idle-night-64x36.png"); assert.deepEqual([e.w, e.h], [64, 36]); assert.equal(e.signed, "art director, roots night verdict");
  assert.equal(ix.masters["room-roots-idle-day-64x36"].signed, "art director, roots day composition", "the day's is the room's"); assert.equal(ix.masters["room-roots-near-day-34x26"].signed, "art director, roots near day");
  assert.equal(ix.masters["room-roots-bed-dusk-16x6"].signed, "art director, roots dusk verdict"); assert.ok(ix.masters["room-reeds-sorrel-day-8x6".replace("reeds-sorrel", "reeds-sorrel")] || ix.masters["room-reeds-sorrel-day-8x6"]);
  assert.equal(Object.keys(ix.masters).length, r.placed.length); assert.deepEqual(check(r.root), []);
  for (const id of r.placed) assert.equal(ix.masters[id].sha256, sha256(readFileSync(path.join(r.root, ix.masters[id].file))));
  const roots = data.rooms.roots;
  assert.equal(roots.base, "room-roots-idle-{light}-64x36"); assert.deepEqual(roots.bed, { rect: [40, 28, 16, 6], foot: 34, picture: "room-roots-bed-{light}-16x6" }); assert.equal(data.rooms.reeds.bed, undefined, "a bed only where the manifest has one");
  assert.deepEqual(roots.pieces.map((p) => [p.id, p.kind]), [["roots-sorrel", "occluder"], ["roots-mister", "back"], ["roots-mist-2", "back"]], "the bed is not a piece; the pieceless mist, the drop are not pieces");
  assert.equal(roots.pieces[2].opa, 153); assert.equal(roots.pieces[1].opa, undefined); assert.deepEqual(roots.ambient.map((a) => a.id), ["roots-drop"], "the drops are carried to ambient");
  assert.deepEqual(roots.levels[0].keepOuts, [[11, 30, 6, 3]], "an occluder's keep-out joins its level's"); assert.deepEqual(roots.joins[0], { id: "roots-ramp-1", kind: "ramp", upper: "terrace", lower: "main", rect: [14, 10, 20, 12], ends: [[14, 14], [34, 22]] });
  const reeds = data.rooms.reeds.pieces[0]; assert.deepEqual([reeds.id, reeds.picture, reeds.seam], ["reeds-sedge-1", null, true], "an in-scene occluder with no mask: picture null"); assert.deepEqual(data.rooms.reeds.levels[0].keepOuts[0], [2, 26, 8, 2]);
  assert.deepEqual(r.leftOut.filter((q) => q.kept === "left out").map((q) => q.id), ["roots-mist-3", "reeds-mist-3"], "left out and named"); assert.ok(!JSON.stringify(data).includes("mist-3"));
  const g = checkRooms(data, ix, [0, 0, PW, PH], r.root); assert.deepEqual(g.problems, []);
});

test("placeRooms refuses a tampered signed scene, an unsigned light and a room the manifest lacks, and writes nothing", () => {
  const f = roomsFolder(); writeFileSync(path.join(f.rooms, "signed-idle-reeds-day.png"), encodePNG(PW, PH, new Uint8Array(PW * PH * 4).fill(3)));
  const root = mkdtempSync(path.join(tmpdir(), "placed-")), roomsFile = path.join(root, "rooms.json"), go = (m = f.manifest, only = ["roots", "reeds"]) => placeRooms({ manifest: m, root, roomsFile, commit: "abc1234", only });
  assert.throws(() => go(), /reeds: .*signed-idle-reeds-day.png does not match the manifest's sha256/); assert.ok(!existsSync(path.join(root, "index.json")) && !existsSync(roomsFile) && !existsSync(path.join(root, "rooms")), "nothing written");
  const g = roomsFolder(); const mf = JSON.parse(readFileSync(g.manifest, "utf8")); delete mf.roots.lights.night.signed; writeFileSync(g.manifest, JSON.stringify(mf));
  assert.throws(() => go(g.manifest), /roots: the night light is not signed/);
  const h = roomsFolder(); const m2 = JSON.parse(readFileSync(h.manifest, "utf8")); delete m2.reeds.signed; writeFileSync(h.manifest, JSON.stringify(m2)); assert.throws(() => go(h.manifest), /reeds: the day light is not signed/);
  assert.throws(() => go(roomsFolder().manifest, ["roots", "ferns"]), /ferns: the manifest has no such room/);
  const k = roomsFolder(), rr = placeRooms({ manifest: k.manifest, root, roomsFile, commit: "abc1234", only: ["roots", "reeds"], dryRun: true }); assert.ok(rr.placed.length > 0 && !existsSync(path.join(root, "index.json")), "a dry run writes nothing");
});

test("placeRooms leaves out a piece whose file is not its rect's size; a placed file changed afterwards fails --check", () => {
  const f = roomsFolder(), mf = JSON.parse(readFileSync(f.manifest, "utf8")); mf.roots.pieces[1].rect_painting = [50, 10, 7, 4]; writeFileSync(f.manifest, JSON.stringify(mf));
  const r = placeFixture(f); assert.match(r.leftOut.find((q) => q.id === "roots-mister").why, /6×4, the manifest's rect is 7×4/); assert.ok(!r.rooms.rooms.roots.pieces.some((p) => p.id === "roots-mister"));
  writeFileSync(path.join(r.root, "rooms/room-roots-bed-day-16x6.png"), encodePNG(16, 6, new Uint8Array(16 * 6 * 4).fill(1))); assert.match(check(r.root).join(), /room-roots-bed-day-16x6.*does not match its hash/);
});

test("placeRooms writes each index entry's source (from: <pods path>@<commit>) and honours the manifest's hashes map: a listed file with another hash is refused, a matching one passes", () => {
  const f = roomsFolder(), r = placeFixture(f), ix = JSON.parse(readFileSync(path.join(r.root, "index.json"), "utf8")), pods = path.dirname(f.rooms);
  assert.equal(ix.masters["room-roots-idle-night-64x36"].from, "rooms/seated-idle-roots-night.png@abc1234"); assert.equal(ix.masters["room-roots-near-day-34x26"].from, "rooms/signed-near-roots-day.png@abc1234");
  assert.equal(ix.masters["room-roots-sorrel-day-8x6"].from, "rooms/pieces/roots/roots-sorrel-day.png@abc1234");
  for (const id of r.placed) { const [rel] = ix.masters[id].from.split("@"); assert.equal(ix.masters[id].sha256, sha256(readFileSync(path.join(pods, rel))), id + ": the source file is the placed one"); }
  const mf = JSON.parse(readFileSync(f.manifest, "utf8")), rel = "rooms/pieces/roots/roots-sorrel-day.png", go = (root = mkdtempSync(path.join(tmpdir(), "placed-"))) => placeRooms({ manifest: f.manifest, root, roomsFile: path.join(root, "rooms.json"), commit: "abc1234", only: ["roots", "reeds"] });
  writeFileSync(f.manifest, JSON.stringify({ ...mf, hashes: { [rel]: sha256(readFileSync(path.join(pods, rel))) } })); assert.deepEqual(go().leftOut.map((q) => q.id).includes("roots-sorrel"), false, "a matching hash passes");
  writeFileSync(f.manifest, JSON.stringify({ ...mf, hashes: { [rel]: "0".repeat(64) } })); const bad = mkdtempSync(path.join(tmpdir(), "placed-")); assert.throws(() => go(bad), /roots: rooms\/pieces\/roots\/roots-sorrel-day.png does not match the manifest's hashes entry/);
  assert.ok(!existsSync(path.join(bad, "rooms.json")), "nothing written");
});

test("the data guards 1 to 7 refuse; the art director's rules are notes only", () => {
  const f = roomsFolder(), r = placeFixture(f), ix = JSON.parse(readFileSync(path.join(r.root, "index.json"), "utf8")), good = JSON.parse(readFileSync(r.roomsFile, "utf8")), win = [0, 0, PW, PH];
  const run = (mutate) => { const d = structuredClone(good); mutate(d.rooms.roots, d); return checkRooms(d, ix, win, r.root); };
  assert.deepEqual(run(() => {}).problems, []);
  const cases = [[1, (r) => { r.levels[0].x = [2, 62, 40]; }], [1, (r) => { r.levels[0].top = [20]; }], [1, (r) => { r.levels[1].top = [15]; }],
    [2, (r) => { r.levels[1].bottom = 21; }], [3, (r) => { r.joins[0].ends[1] = [34, 12]; }], [3, (r) => { r.joins[0].ends[0] = [30, 14]; }],
    [4, (r) => { r.pieces[0].picture = "room-roots-nothing-{light}-8x6"; }], [4, (r) => { r.pieces[0].rect = [10, 26, 9, 6]; }],
    [6, (r) => { for (let i = 0; i < 7; i++) r.pieces.push({ ...r.pieces[0], id: "x" + i }); }], [6, (r) => { r.pieces[0].rect = [0, 0, 64, 36]; r.pieces[0].picture = null; }],
    [7, (r) => { r.pieces[1].rect = [60, 10, 6, 4]; }], [7, (r) => { r.levels[0].keepOuts.push([0, 30, 10, 20]); }]];
  for (const [n, mutate] of cases) assert.match(run(mutate).problems.join("\n"), new RegExp(`guard ${n}:`), "guard " + n);
  const notes = run((r) => { r.levels[1].top = [12]; r.levels[1].x = [2, 20]; r.joins[0].ends = [[14, 14], [34, 30]]; });
  assert.deepEqual(notes.problems, []); assert.match(notes.notes.join("\n"), /level terrace is 2 px deep \(the art director's rule: at least 48\)/); assert.match(notes.notes.join("\n"), /level terrace is 18 px wide \(the art director's rule: at least 160\)/); assert.match(notes.notes.join("\n"), /roots-ramp-1 rises 16 over 20 \(0.80/);
  const r2 = placeFixture(roomsFolder()); writeFileSync(path.join(r2.root, "rooms/room-roots-sorrel-day-8x6.png"), encodePNG(8, 6, new Uint8Array(8 * 6 * 4).fill(100))); assert.match(checkRooms(good, JSON.parse(readFileSync(path.join(r2.root, "index.json"), "utf8")), win, r2.root).problems.join("\n"), /guard 5: .*room-roots-sorrel-day-8x6.*alpha/);
});
