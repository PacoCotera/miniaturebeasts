// The key tray's geometry (src/keyplan.mjs): one measure, every key at least 44, the D-pad : ✓ proportion, no overlaps, at the two layouts of the one-device page (upright under the screen; a column each side).
import { test } from "node:test";
import assert from "node:assert/strict";
import { sizes, pickA, plan, padDir, dockWords, portraitTrayH, sideCols, leftColH, IDS, EDGE } from "../src/keyplan.mjs";

const overlap = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
// the layouts: [name, panel W, panel H or 0, kind]: upright, the panel's width (window - 48); on its side and on a laptop, the whole panel
const CASES = [["390×844", 342, 0, "portrait"], ["360×780", 312, 0, "portrait"], ["844×390", 559, 316, "landscape"], ["844×390 Station", 796, 316, "landscape"], ["932×430", 657, 372, "landscape"], ["laptop Companion", 770, 624, "landscape"], ["laptop Station", 1040, 446, "landscape"]];

function check(dev, layout, W, H, tag) {
  const p = plan(dev, layout, W, H), ids = Object.keys(p.keys), boxW = W, boxH = p.h;
  assert.deepEqual([...ids].sort(), [...IDS[dev]].sort(), tag + ": every key placed");
  for (const id of ids) { const [x, y, w, h] = p.keys[id]; assert.ok(w >= 44 && h >= 44, `${tag}: ${id} is ${w} × ${h}`); assert.ok(x >= 0 && y >= 0 && x + w <= boxW && y + h <= boxH, `${tag}: ${id} inside the ${boxW} × ${boxH} tray (${x},${y},${w},${h})`); }
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) assert.ok(!overlap(p.keys[ids[i]], p.keys[ids[j]]), `${tag}: ${ids[i]} and ${ids[j]} overlap`);
  if (p.dock) for (const id of ids) assert.ok(!overlap(p.keys[id], p.dock) && !overlap(p.keys[id], p.epaper), `${tag}: the Dock key or its button and ${id} overlap`);
  if (p.dock) assert.ok(!overlap(p.dock, p.epaper), tag + ": the Dock key and its button are apart");
  // the D-pad : ✓ proportion, and the cross
  const pad = p.keys.left[2], ratio = (3 * pad) / p.keys.confirm[2]; assert.ok(ratio >= 1.7 && ratio <= 1.85, `${tag}: D-pad : ✓ = ${ratio}`);
  assert.ok(p.keys.up[1] + pad === p.keys.left[1] && p.keys.down[1] === p.keys.left[1] + pad && p.keys.left[0] + pad === p.keys.up[0] && p.keys.right[0] === p.keys.up[0] + pad, tag + ": a cross");
  assert.deepEqual(p.hub, [p.keys.up[0], p.keys.left[1], pad], tag + ": its hub in the middle");
  // the actions: Call above ←, ✓ to their right, right of the D-pad
  assert.ok(p.keys.call[1] + p.keys.call[3] <= p.keys.back[1] && p.keys.confirm[0] >= p.keys.back[0] + p.keys.back[2] && p.keys.call[0] === p.keys.back[0], tag + ": Call above ←, ✓ to their right");
  assert.ok(p.keys.call[0] > p.keys.right[0] + pad, tag + ": the actions stand right of the D-pad");
  // touch areas: 44 × 44 at least, inside the tray, none over another
  const zs = { ...p.zones, pad: p.padZone }, zid = Object.keys(zs);
  for (const id of zid) { const [x, y, w, h] = zs[id]; assert.ok(w >= 44 && h >= 44 && x >= 0 && y >= 0 && x + w <= boxW + 1e-9 && y + h <= boxH + 1e-9, `${tag}: ${id}'s touch area (${x},${y},${w},${h})`); }
  for (let i = 0; i < zid.length; i++) for (let j = i + 1; j < zid.length; j++) assert.ok(!overlap(zs[zid[i]], zs[zid[j]]), `${tag}: touch areas ${zid[i]} and ${zid[j]} overlap`);
  return p;
}

test("sizes: one measure a, every key a fixed multiple of it", () => {
  for (const [a, cross, mid, big] of [[44, 132, 52, 76], [48, 144, 56, 80], [56, 168, 68, 96]]) { const s = sizes(a); assert.deepEqual([s.cross, s.mid, s.big], [cross, mid, big], "a = " + a); assert.ok(s.cross / s.big >= 1.7 && s.cross / s.big <= 1.85); }
});

test("a: the largest step that fits", () => {
  assert.equal(pickA("laptop", 1040, 0), 44);
  assert.equal(pickA("portrait", 342, 0), 48); assert.equal(pickA("portrait", 312, 0), 44); assert.equal(pickA("portrait", 600, 800), 56);
  assert.equal(pickA("landscape", 0, 390 - 52), 48); assert.equal(pickA("landscape", 0, 430 - 52), 56);
});

test("every key at least 44, D-pad : ✓ between 1.7 and 1.85, nothing overlaps, both devices, every layout", () => {
  for (const [tag, W, H, kind] of CASES) for (const dev of ["station", "companion"]) check(dev, kind, W, H, `${dev} ${tag}`);
});

test("upright: the D-pad row is the tray's last row for both devices, the Station's rooms in one row above it", () => {
  const a = 48, s = plan("station", "portrait", 342, 0, a), c = plan("companion", "portrait", 342, 0, a);
  assert.equal(s.h - s.keys.down[1], c.h - c.keys.down[1], "the D-pad at the same distance from the tray's foot");
  assert.equal(s.h, portraitTrayH("station", a)); assert.equal(c.h, portraitTrayH("companion", a)); assert.equal(c.h, 168); assert.equal(s.h, 240);
  const rooms = ["home", "research", "vivarium", "library"].map((id) => s.keys[id]);
  assert.ok(rooms.every((r) => r[1] === rooms[0][1] && r[1] + r[3] <= s.keys.up[1]), "one row, above the D-pad");
  assert.ok(rooms.every((r, i) => i === 0 || r[0] > rooms[i - 1][0]), "in order, left to right");
});

test("sideways: the left column is placed from the Station's height for both devices; the Dock key and the dock's-screen button stand under the actions", () => {
  const st = plan("station", "landscape", 796, 316, 48), co = plan("companion", "landscape", 559, 316, 48), c = sideCols(48);
  assert.deepEqual(st.keys.up, co.keys.up, "the D-pad never moves between devices"); assert.deepEqual(st.dock.slice(1), co.dock.slice(1));
  assert.ok(st.keys.right[0] + st.keys.right[2] <= c.LW && st.dock[0] >= 796 - c.RW && st.dock[2] === sizes(48).clusterW && st.dock[1] >= st.keys.back[1] + st.keys.back[3] && st.epaper[1] >= st.dock[1] + st.dock[3], "the D-pad in the left column, the Dock key and its button under the actions");
  assert.ok(st.keys.home[0] + 2 * 56 + 12 <= c.LW && st.keys.home[1] >= st.keys.down[1] + 144 / 3 && st.keys.vivarium[1] > st.keys.home[1], "the rooms 2 × 2 under the D-pad");
  assert.equal(leftColH(48), 144 + 24 + 124); assert.equal(c.LW, EDGE + 144 + EDGE);
});

test("the D-pad is one zone in four wedges; the dead centre presses nothing", () => {
  const z = [0, 0, 150, 150], a = 48;
  assert.equal(padDir(75, 75, z, a), null); assert.equal(padDir(75 + 10, 75 - 10, z, a), null);
  assert.equal(padDir(75, 5, z, a), "up"); assert.equal(padDir(75, 145, z, a), "down"); assert.equal(padDir(5, 75, z, a), "left"); assert.equal(padDir(145, 75, z, a), "right");
  assert.equal(padDir(140, 20, z, a), "right", "a corner goes to the wedge of its longer axis"); assert.equal(padDir(20, 140, z, a), "down");
  const p = plan("companion", "landscape", 770, 624, 44); assert.ok(p.padZone[2] >= 132 && p.padZone[2] <= 132 + 12);
});

test("the Dock key's words follow its width", () => { assert.deepEqual([300, 196, 195, 96, 95, 44].map(dockWords), ["full", "full", "short", "short", "mark", "mark"]); });
