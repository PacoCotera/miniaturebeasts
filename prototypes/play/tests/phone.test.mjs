// The play page on a phone (src/phone.mjs): the fit, pure. The key plans are keyplan.mjs's (tests/keyplan.test.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { dockReserve, areaHeight, isPhone, isPortrait, phoneFit, phoneKeyA, biggerTurned, PHONE_PAD } from "../src/phone.mjs";
import { portraitTrayH, sideCols } from "../src/keyplan.mjs";

test("a phone is a touch device with a short side under 600", () => {
  assert.equal(isPhone(true, 412, 915), true); assert.equal(isPhone(true, 915, 412), true);
  assert.equal(isPhone(false, 412, 915), false); assert.equal(isPhone(true, 1024, 768), false); assert.equal(isPhone(false, 1920, 1080), false);
});

test("z: a whole number when one fits, a smooth step below 1, and the device is never wider or taller than the area", () => {
  for (const [W, H, dpr] of [[412, 915, 2.625], [390, 844, 3], [915, 412, 2.625], [844, 390, 3], [360, 640, 2], [320, 568, 2], [640, 360, 2], [412, 915, 1], [360, 640, 1], [568, 320, 1]]) {
    for (const dev of ["station", "companion"]) {
      const { z, portrait } = phoneFit(dev, W, H, dpr), f = z / dpr, lpW = dev === "station" ? 1040 : 466, areaW = W - 2 * PHONE_PAD, areaH = areaHeight(portrait, H, dockReserve(dev, portrait));
      const a = phoneKeyA(W, H, dpr), tray = portraitTrayH(dev, a), cols = sideCols(a);
      const tag = `${dev} ${W}×${H} @${dpr}`;
      const fills = dev === "companion" && z >= 1 && z !== Math.floor(z);   // the Companion fills the phone: a smooth step when a whole z would leave over a tenth of the room unused
      if (fills) assert.ok(Math.floor(z) < 0.9 * z * (1 + 1 / 64), tag + ": a smooth step only where the whole one wastes room"); else if (z >= 1) assert.equal(z, Math.floor(z), tag + ": whole"); else assert.ok(z > 0 && z < 1, tag + ": smooth below 1");
      if (portrait) { assert.ok(lpW * f <= areaW + 1e-6, tag + ": fits the width"); assert.ok(616 * f + tray <= areaH + 1e-6 || z <= 1 / 16, tag + ": fits the height with the keys"); }
      else { assert.ok(lpW * f + cols.LW + cols.RW + 16 <= areaW + 1e-6, tag + ": fits the width with both key columns"); assert.ok(616 * f <= areaH + 1e-6, tag + ": fits the height"); }
      // and it is the largest: one more whole step would not fit
      if (z >= 1 && z < 8 && !fills) { const f2 = (z + 1) / dpr; const fitsMore = portrait ? lpW * f2 <= areaW && 616 * f2 + tray <= areaH : lpW * f2 + cols.LW + cols.RW + 16 <= areaW && 616 * f2 <= areaH; assert.equal(fitsMore, false, tag + ": the next step does not fit"); }
    }
  }
});

test("the owner's phone: the Station is 1× portrait and 2× turned, the Companion 2×", () => {
  assert.equal(phoneFit("station", 412, 915, 3.5).z, 1); assert.equal(phoneFit("station", 915, 412, 3.5).z, 2); assert.equal(phoneFit("companion", 412, 915, 3.5).z, 3);
  assert.equal(biggerTurned(412, 915, 3.5), true); assert.equal(biggerTurned(915, 412, 3.5), false);
  assert.equal(biggerTurned(412, 915, 2.625), false);   // turned it is the same 1×: no hint
});
