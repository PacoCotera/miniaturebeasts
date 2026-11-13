// The play page on a phone (src/phone.mjs): the fit and the key plans, pure.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dockReserve, areaHeight, isPhone, isPortrait, phoneFit, biggerTurned, planPortrait, planLandscape, trayMin, trayMax, sides, PHONE_BAR, PHONE_PAD } from "../src/phone.mjs";

const overlap = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

test("a phone is a touch device with a short side under 600", () => {
  assert.equal(isPhone(true, 412, 915), true); assert.equal(isPhone(true, 915, 412), true);
  assert.equal(isPhone(false, 412, 915), false); assert.equal(isPhone(true, 1024, 768), false); assert.equal(isPhone(false, 1920, 1080), false);
});

test("z: a whole number when one fits, a smooth step below 1, and the device is never wider or taller than the area", () => {
  for (const [W, H, dpr] of [[412, 915, 2.625], [390, 844, 3], [915, 412, 2.625], [844, 390, 3], [360, 640, 2], [320, 568, 2], [640, 360, 2], [412, 915, 1], [360, 640, 1], [568, 320, 1]]) {
    for (const dev of ["station", "companion"]) {
      const { z, portrait } = phoneFit(dev, W, H, dpr), f = z / dpr, lpW = dev === "station" ? 1040 : 466, areaW = W - 2 * PHONE_PAD, areaH = areaHeight(portrait, H, dockReserve(dev, portrait));
      const tag = `${dev} ${W}×${H} @${dpr}`;
      const fills = dev === "companion" && z >= 1 && z !== Math.floor(z);   // the Companion fills the phone: a smooth step when a whole z would leave over a tenth of the room unused
      if (fills) assert.ok(Math.floor(z) < 0.9 * z * (1 + 1 / 64), tag + ": a smooth step only where the whole one wastes room"); else if (z >= 1) assert.equal(z, Math.floor(z), tag + ": whole"); else assert.ok(z > 0 && z < 1, tag + ": smooth below 1");
      if (portrait) { assert.ok(lpW * f <= areaW + 1e-6, tag + ": fits the width"); assert.ok(616 * f + trayMin(dev) <= areaH + 1e-6 || z <= 1 / 16, tag + ": fits the height with the keys"); }
      else { const s = sides(dev, areaH); assert.ok(lpW * f + s.LW + s.RW + 16 <= areaW + 1e-6, tag + ": fits the width with both key columns"); assert.ok(616 * f <= areaH + 1e-6, tag + ": fits the height"); }
      // and it is the largest: one more whole step would not fit
      if (z >= 1 && z < 8 && !fills) { const f2 = (z + 1) / dpr; const fitsMore = portrait ? lpW * f2 <= areaW && 616 * f2 + trayMin(dev) <= areaH : lpW * f2 + sides(dev, areaH).LW + sides(dev, areaH).RW + 16 <= areaW && 616 * f2 <= areaH; assert.equal(fitsMore, false, tag + ": the next step does not fit"); }
    }
  }
});

test("the owner's phone: the Station is 1× portrait and 2× turned, the Companion 2×", () => {
  assert.equal(phoneFit("station", 412, 915, 3.5).z, 1); assert.equal(phoneFit("station", 915, 412, 3.5).z, 2); assert.equal(phoneFit("companion", 412, 915, 3.5).z, 3);
  assert.equal(biggerTurned(412, 915, 3.5), true); assert.equal(biggerTurned(915, 412, 3.5), false);
  assert.equal(biggerTurned(412, 915, 2.625), false);   // turned it is the same 1×: no hint
});

test("portrait keys: every touch target is 44 and over, nothing overlaps, everything is inside the tray", () => {
  for (const dev of ["station", "companion"]) for (const W of [328, 340, 378, 400, 480]) for (const T of [trayMin(dev), Math.max(trayMin(dev), 180), Math.max(trayMin(dev), 230), trayMax(dev)]) {
    const { pos, hub, arm } = planPortrait(dev, W, T), ids = Object.keys(pos), tag = `${dev} W${W} T${T}`;
    assert.equal(ids.length, dev === "station" ? 11 : 7, tag + ": every key placed");
    for (const id of ids) { const [x, y, w, h] = pos[id]; assert.ok(w >= 44 && h >= 44, `${tag}: ${id} is ${w} × ${h}`); assert.ok(x >= 0 && y >= 0 && x + w <= W && y + h <= T, `${tag}: ${id} inside the ${W} × ${T} tray (${x},${y},${w},${h})`); }
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) assert.ok(!overlap(pos[ids[i]], pos[ids[j]]), `${tag}: ${ids[i]} and ${ids[j]} overlap`);
    // the cross: up above, down below, left and right at the sides, the hub between
    assert.ok(pos.up[1] + arm === pos.left[1] && pos.down[1] === pos.left[1] + arm && pos.left[0] + arm === pos.up[0] && pos.right[0] === pos.up[0] + arm, tag + ": a cross");
    assert.deepEqual(hub, [pos.up[0], pos.left[1], arm], tag + ": its hub in the middle");
    assert.ok(pos.call[0] > pos.right[0] + arm - 1, tag + ": Call, Back, Confirm stand right of the D-pad");
  }
});

test("portrait Station: the D-pad at the left of the coloured room keys' row above them; the Companion's D-pad left and the actions right on one line", () => {
  const s = planPortrait("station", 400, 300).pos; assert.ok(s.home[1] > s.down[1] + s.down[3] - 1, "the rooms under the D-pad");
  const c = planPortrait("companion", 400, 208).pos; assert.ok(c.call[0] > c.right[0] + c.right[2] && c.call[1] + c.call[3] / 2 - (c.left[1] + c.left[3] / 2) < 1 && c.confirm[0] > c.back[0] && c.back[0] > c.call[0], "Call, ←, ✓ in order to the right, level with the cross's middle");
});

test("landscape keys: 44 and over, no overlap, inside the area, the screen's room between the columns", () => {
  for (const dev of ["station", "companion"]) for (const [W, H] of [[903, 352], [832, 326], [556, 248], [880, 260]]) {
    const { pos, arm } = planLandscape(dev, W, H), ids = Object.keys(pos), tag = `${dev} ${W}×${H}`, s = sides(dev, H);
    assert.equal(ids.length, dev === "station" ? 11 : 7);
    for (const id of ids) { const [x, y, w, h] = pos[id]; assert.ok(w >= 44 && h >= 44 && x >= 0 && y >= 0 && x + w <= W && y + h <= H, `${tag}: ${id} (${x},${y},${w},${h})`); }
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) assert.ok(!overlap(pos[ids[i]], pos[ids[j]]), `${tag}: ${ids[i]} and ${ids[j]} overlap`);
    assert.ok(Math.max(pos.right[0] + arm) <= s.LW, tag + ": the D-pad is in the left column");
    const rest = ids.filter((i) => !["up", "down", "left", "right"].includes(i)), inL = dev === "station" ? ["call", "back", "confirm"] : []; assert.ok(rest.every((i) => (inL.includes(i) ? pos[i][0] + pos[i][2] <= s.LW : pos[i][0] >= W - s.RW)), tag + ": the Station's actions sit under its D-pad, every other key is in the right column");
  }
});
