// The key tray's geometry (src/keyplan.mjs): one measure, every key at least 44, the D-pad : ✓ proportion, no overlaps, at the layouts the owner's devices use.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sizes, pickA, plan, padDir, dockWords, laptopRowH, portraitTrayH, sideCols, IDS } from "../src/keyplan.mjs";

const overlap = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
// the layouts: [name, kind, W, H] (laptop: the tray's width is the shell's, 1040 for the Station, 466 for the Companion; phones: the area under the bar, a pad round it)
const PHONES = [["390×844", 390 - 12, 844 - 52 - 12, "portrait"], ["844×390", 844 - 12, 390 - 52 - 6, "landscape"], ["360×780", 360 - 12, 780 - 52 - 12, "portrait"], ["932×430", 932 - 12, 430 - 52 - 6, "landscape"]];
const LAPTOPS = [["1280×720", 1040, 466], ["1440×900", 1040, 466], ["1920×1080", 1040, 466]];

function check(dev, layout, W, H, tag) {
  const p = plan(dev, layout, W, H), ids = Object.keys(p.keys), boxW = W, boxH = p.h;
  assert.deepEqual([...ids].sort(), [...IDS[dev]].sort(), tag + ": every key placed");
  for (const id of ids) { const [x, y, w, h] = p.keys[id]; assert.ok(w >= 44 && h >= 44, `${tag}: ${id} is ${w} × ${h}`); assert.ok(x >= 0 && y >= 0 && x + w <= boxW && y + h <= boxH, `${tag}: ${id} inside the ${boxW} × ${boxH} tray (${x},${y},${w},${h})`); }
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) assert.ok(!overlap(p.keys[ids[i]], p.keys[ids[j]]), `${tag}: ${ids[i]} and ${ids[j]} overlap`);
  if (p.dock) for (const id of ids) assert.ok(!overlap(p.keys[id], p.dock), `${tag}: the Dock key and ${id} overlap`);
  // the D-pad : ✓ proportion, and the cross
  const pad = p.keys.left[2], ratio = (3 * pad) / p.keys.confirm[2]; assert.ok(ratio >= 1.7 && ratio <= 1.85, `${tag}: D-pad : ✓ = ${ratio}`);
  assert.ok(p.keys.up[1] + pad === p.keys.left[1] && p.keys.down[1] === p.keys.left[1] + pad && p.keys.left[0] + pad === p.keys.up[0] && p.keys.right[0] === p.keys.up[0] + pad, tag + ": a cross");
  assert.deepEqual(p.hub, [p.keys.up[0], p.keys.left[1], pad], tag + ": its hub in the middle");
  // the actions: Call above ←, ✓ to their right
  assert.ok(p.keys.call[1] + p.keys.call[3] <= p.keys.back[1] && p.keys.confirm[0] >= p.keys.back[0] + p.keys.back[2] && p.keys.call[0] === p.keys.back[0], tag + ": Call above ←, ✓ to their right");
  assert.ok(p.rows === 2 && dev === "companion" ? p.keys.call[1] > p.keys.down[1] : p.keys.call[0] > p.keys.right[0] + pad, tag + ": the actions stand right of the D-pad (under it on a short two-row tray)");
  // touch areas: 44 × 44 at least, inside the tray, none over another
  const zs = { ...p.zones, pad: p.padZone }, zid = Object.keys(zs);
  for (const id of zid) { const [x, y, w, h] = zs[id]; assert.ok(w >= 44 && h >= 44 && x >= 0 && y >= 0 && x + w <= boxW + 1e-9 && y + h <= boxH + 1e-9, `${tag}: ${id}'s touch area (${x},${y},${w},${h})`); }
  for (let i = 0; i < zid.length; i++) for (let j = i + 1; j < zid.length; j++) assert.ok(!overlap(zs[zid[i]], zs[zid[j]]), `${tag}: touch areas ${zid[i]} and ${zid[j]} overlap`);
  return p;
}

test("sizes: one measure a, every key a fixed multiple of it", () => {
  for (const [a, cross, mid, big] of [[44, 132, 52, 76], [48, 144, 56, 80], [56, 168, 68, 96]]) { const s = sizes(a); assert.deepEqual([s.cross, s.mid, s.big], [cross, mid, big], "a = " + a); assert.ok(s.cross / s.big >= 1.7 && s.cross / s.big <= 1.85); }
  assert.equal(laptopRowH(44), 156, "the laptop tray: 72 to 156");
});

test("a: 44 on a laptop, 48 on the phones, the largest step that fits", () => {
  assert.equal(pickA("laptop", 1040, 0), 44);
  for (const [tag, W, H, kind] of PHONES) assert.equal(pickA(kind, W, H), tag === "932×430" ? 56 : 48, tag);   // 932 × 430 has the height for 56
  assert.equal(pickA("portrait", 600, 800), 56); assert.equal(pickA("portrait", 300, 600), 44);
});

test("laptops: every key at least 44, D-pad : ✓ between 1.7 and 1.85, nothing overlaps (both devices)", () => {
  for (const [tag, sw, cw] of LAPTOPS) { check("station", "laptop", sw, 0, "station " + tag); check("companion", "laptop", cw, 0, "companion " + tag); }
});

test("laptops: the Station's rooms stand between the D-pad and the actions on one row; a narrow tray takes a second row", () => {
  const s = check("station", "laptop", 1040, 0, "station"); assert.equal(s.rows, 1); assert.equal(s.h, 156);
  assert.ok(s.keys.home[0] > s.keys.right[0] + 44 && s.keys.library[0] + s.keys.library[2] < s.keys.call[0], "the rooms between");
  const n = check("station", "laptop", 560, 0, "station narrow"); assert.equal(n.rows, 2); assert.ok(n.keys.home[1] >= n.keys.down[1] + n.keys.down[3] || n.keys.home[1] >= 156, "the rooms on the second row");
  const c = check("companion", "laptop", 266, 0, "companion short"); assert.equal(c.rows, 2);
});

test("phones: every key at least 44, no two key boxes or the Dock box overlap, inside the area", () => {
  for (const [tag, W, H, kind] of PHONES) { for (const dev of ["station", "companion"]) { const p = check(dev, kind, W, H, `${dev} ${tag}`); assert.equal(p.a, tag === "932×430" ? 56 : 48); if (kind === "portrait") assert.equal(p.h, portraitTrayH(dev, 48), "the tray's height"); } }
  const p = plan("station", "landscape", 832, 332), c = sideCols(48);
  assert.ok(p.keys.right[0] + p.keys.right[2] <= c.LW && p.dock[0] >= 832 - c.RW && p.dock[2] === sizes(48).clusterW && p.dock[1] >= p.keys.back[1] + p.keys.back[3], "the D-pad in the left column, the Dock key under the actions");
  assert.ok(p.keys.home[0] + 2 * 56 + 12 <= c.LW && p.keys.home[1] >= p.keys.down[1] + 144 / 3 && p.keys.vivarium[1] > p.keys.home[1], "the rooms 2 × 2 under the D-pad");
  const pp = plan("station", "portrait", 378, 0); assert.equal(pp.h, 240, "the portrait Station's tray"); assert.equal(plan("companion", "portrait", 378, 0).h, 168, "the portrait Companion's tray");
});

test("the D-pad is one zone in four wedges; the dead centre presses nothing", () => {
  const z = [0, 0, 150, 150], a = 48;
  assert.equal(padDir(75, 75, z, a), null); assert.equal(padDir(75 + 10, 75 - 10, z, a), null);
  assert.equal(padDir(75, 5, z, a), "up"); assert.equal(padDir(75, 145, z, a), "down"); assert.equal(padDir(5, 75, z, a), "left"); assert.equal(padDir(145, 75, z, a), "right");
  assert.equal(padDir(140, 20, z, a), "right", "a corner goes to the wedge of its longer axis"); assert.equal(padDir(20, 140, z, a), "down");
  const p = plan("companion", "laptop", 466, 0); assert.ok(p.padZone[2] >= 132 && p.padZone[2] <= 132 + 12);
});

test("the Dock key's words follow its width", () => { assert.deepEqual([300, 196, 195, 96, 95, 44].map(dockWords), ["full", "full", "short", "short", "mark", "mark"]); });
