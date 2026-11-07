// The roster stage (chunk 6) and the families' declarations: path, armature, template and bands in the registry.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { LANGUAGE, validateRegistry, familyOf } from "../framework/language.mjs";
import { rosterRows, read48, iou, READ48_MAX_IOU } from "../framework/library-roster.mjs";
import { encodePNG } from "../framework/png.mjs";

test("every family declares a path, an armature layout, a template (or none) and bands; the paths count 12 mesh, 6 hybrid, 2 cage", () => {
  assert.equal(LANGUAGE.families.length, 20);
  for (const f of LANGUAGE.families) {
    assert.ok(["mesh", "hybrid", "cage"].includes(f.path), f.id);
    assert.ok(f.armature.layout && Array.isArray(f.armature.sockets), f.id);
    assert.deepEqual(f.bands.neck, [0, 0.2], f.id);
    assert.ok(f.bands.headShareMin === 0.3, f.id);
    assert.equal(f.bands.legShareMax, f.legs === 0 ? 0 : 1 / 3, f.id);
  }
  const n = (p) => LANGUAGE.families.filter((f) => f.path === p).length;
  assert.deepEqual([n("mesh"), n("hybrid"), n("cage")], [12, 6, 2]);
  assert.deepEqual(LANGUAGE.families.filter((f) => f.template).map((f) => f.id), ["trotter"]);
  assert.equal(familyOf(LANGUAGE, "trotter").template, "templates/trotter.json");
  assert.equal(familyOf(LANGUAGE, "four-wing").armature.sockets.length, 2);       // two wing pairs
});

test("the registry check names a family with a bad path or a neck band wider than 0.2", () => {
  const bad = structuredClone(LANGUAGE);
  bad.families[0].path = "carved"; bad.families[1].bands.neck = [0, 0.4];
  const msgs = validateRegistry(bad).find((r) => r.id === "roster.complete").messages;
  assert.ok(msgs.some((m) => m.includes("path")) && msgs.some((m) => m.includes("neck")));
});

test("roster rows: the registry's rules, then read48 on the stands' 48 px masks (a stand's alpha over half is the kind)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "stands-"));
  const png = (name, f) => { const d = new Uint8Array(48 * 48 * 4); for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) d[(y * 48 + x) * 4 + 3] = f(x, y) ? 255 : 0; writeFileSync(path.join(dir, name), encodePNG({ width: 48, height: 48, data: d })); };
  png("stand-S02-untuva-48x48.png", (x, y) => x < 40);
  png("stand-S03-tuikis-48x48.png", (x, y) => x < 40);                   // the same silhouette as S02
  png("stand-S04-hiljan-48x48.png", (x, y) => x > 24);
  const r = read48(LANGUAGE, dir);
  assert.equal(r.pass, false);
  assert.ok(r.messages[0].includes("S02 and S03"));
  assert.ok(iou(new Uint8Array([1, 1, 0, 0]), new Uint8Array([1, 0, 1, 0])) === 1 / 3);
  assert.equal(r.measured, 3);
  assert.ok(r.missing.includes("S01"));
  const rows = rosterRows({ standsDir: dir });
  assert.equal(rows.length, validateRegistry().length + 1);
  assert.equal(rows.at(-1).id, "roster.read48");
  assert.ok(rows.slice(0, -1).every((x) => x.pass), "the registry's own rules are green");
  assert.equal(READ48_MAX_IOU, 0.85);
  assert.equal(read48(LANGUAGE, path.join(dir, "nowhere")).pass, false, "no stands is reported, never silently green");
});
