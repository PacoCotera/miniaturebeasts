// baked-package-3: the dock records which package the Companion holds, and takes the Station's at a seat when it is newer or more whole.
//   node --test prototypes/caddy/tests/package-dock.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createDock, decideTake } from "../dock.mjs";

const sum = (o = {}) => ({ id: "pkg7:1.4:36:2,2:3", seed: 36, slot: [2, 2], v: 3, realmRev: 1, placeRev: 4, tag: "", done: 270, total: 270, whole: true, sha: "a".repeat(64), ...o });
const fresh = () => createDock({ dataDir: mkdtempSync(path.join(tmpdir(), "mb-pkg-dock-")) });
const seatUp = (d, offer) => d.seat("w1", "companion", true, undefined, offer), lift = (d) => d.seat("w1", "companion", false);

test("a seat with no package held takes the Station's, and the record is journaled with the seat", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "mb-pkg-dock-")), d = createDock({ dataDir: dir });
  const r = seatUp(d, sum());
  assert.deepEqual(r.took, { why: "first", cells: 270 });
  assert.deepEqual(r.snapshot.package.held, sum());
  assert.equal(r.snapshot.package.takes, 1);
  const file = JSON.parse(readFileSync(path.join(dir, "dock", "w1.json"), "utf8"));
  assert.deepEqual(file.package.held, sum(), "stored beside the cradles");
  assert.equal(createDock({ dataDir: dir }).snapshot("w1").package.held.sha, "a".repeat(64), "a restart keeps it");
});

test("a seat with the same package changes nothing; a stale record takes the new one (a rev change is another id, a grown package is more)", () => {
  const d = seatless(); let r;
  r = seatUp(d, sum()); assert.equal(r.took.why, "first"); lift(d);
  r = seatUp(d, sum()); assert.equal(r.took, undefined, "same package: nothing crosses"); assert.equal(r.snapshot.package.takes, 1); lift(d);
  r = seatUp(d, sum({ id: "pkg7:1.5:36:2,2:3", placeRev: 5, done: 12, whole: false, sha: "b".repeat(64) }));
  assert.deepEqual(r.took, { why: "newer", cells: 12 }, "a PLACE_REV bump is another id: the new package is taken, whole or not");
  assert.equal(r.snapshot.package.held.placeRev, 5); lift(d);
  r = seatUp(d, sum({ id: "pkg7:1.5:36:2,2:3", placeRev: 5, done: 200, whole: false, sha: "c".repeat(64) }));
  assert.deepEqual(r.took, { why: "more", cells: 188 }, "the same package grown: only the cells added cross"); lift(d);
  r = seatUp(d, sum({ id: "pkg7:1.5:36:2,2:3", placeRev: 5, done: 100, whole: false, sha: "d".repeat(64) }));
  assert.equal(r.took, undefined, "fewer cells than held is not newer");
});
function seatless() { return fresh(); }

test("no offer, a bad offer, a repeat seat and a lift take nothing; the Station's seat never takes", () => {
  const d = fresh();
  assert.equal(seatUp(d).snapshot.package, null); lift(d);
  assert.equal(seatUp(d, { id: "x" }).snapshot.package, null, "a malformed offer is ignored, the seat stands");
  lift(d); const r = seatUp(d, sum()); assert.ok(r.took);
  assert.equal(seatUp(d, sum({ id: "other", sha: "e".repeat(64) })).took, undefined, "a repeat seat is a state: no package step");
  assert.equal(d.seat("w1", "station", true, undefined, sum({ id: "other", sha: "e".repeat(64) })).took, undefined);
  assert.equal(lift(d).snapshot.package.held.id, sum().id, "a lift keeps what is held");
  assert.equal(decideTake(null, null), null);
});

test("a failed write takes nothing", () => {
  const d = createDock({ dataDir: mkdtempSync(path.join(tmpdir(), "mb-pkg-dock-")), write: () => { throw new Error("full"); } });
  const r = seatUp(d, sum()); assert.equal(r.ok, false);
  assert.equal(d.snapshot("w1").package, null);
});
