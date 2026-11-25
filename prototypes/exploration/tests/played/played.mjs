// THE PLAYED-GAME TESTS (owner 2026-11-25, code-audit step 1): these play the shipped page, not a sandbox. See README.md.
// The harness (bundle, server, open(), judging helpers) is lib/harness.mjs; played2.mjs holds the rest of the ledger.
//   node --test "prototypes/exploration/tests/played/*.mjs"        (PW_DIR=/dir/with/node_modules/playwright when playwright is not local)
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, teardown, open, SIZES, wait, changed, colour, blobs, HERO, RING } from "./lib/harness.mjs";

before(setup);
after(teardown);

describe("the played game", { concurrency: 3 }, () => {   // each test has its own browser context; the machine has the cores, and the land next door takes a while to draw
for (const size of SIZES) {
  const tag = `${size.w}x${size.h}`;

  // OWNER #143 (11-24): "short call is ALWAYS a call, long call is ALWAYS a zoom out. hero position has nothing to do with the behavior of a call."
  it(`s1 the Call (#143/#152, his save, patch 13,9 tile 0,8): a short Call is the ring with no zoom, a held Call is the zoomed-out view [${tag}]`, async () => {
    const g = await open(size, "152");
    try {
      const at = await g.where();
      assert.deepEqual([at.phase, at.x, at.y], ["patch", 0, 8], "the case is reached: he stands at the spot of his note");
      const r = await g.region(), base = await g.shot();
      const frames = await g.record(() => g.press("call", 100, 0), 1500);   // a short Call, with every frame the browser paints from before it to 1.5 s after
      const fr = (f) => ({ x: Math.round(r.x * f.width / base.width), y: Math.round(r.y * f.height / base.height), w: Math.round(r.w * f.width / base.width), h: Math.round(r.h * f.height / base.height) });
      const ring = Math.max(0, ...frames.map((f) => colour(f, fr(f), RING).n));   // the ring is the Call's own light blue; the walking view has none
      assert.ok(frames.length >= 2 && ring >= 20, `a short Call shows the Call's ring on the screen (${ring} ring pixels in the best of ${frames.length} frames)`);
      const dark = (f, reg) => colour(f, reg, ([R, G, B]) => R + G + B < 130).n / (reg.w * reg.h);   // the zoomed-out view is mostly the dark ground; the walking view has none
      const d0 = dark(base, r);
      for (const [i, f] of frames.entries()) assert.ok(dark(f, fr(f)) < d0 + 0.15, `a short Call stays in the walking view (frame ${i}: ${dark(f, fr(f)).toFixed(2)} dark, the walking view ${d0.toFixed(2)})`);
      await wait(1000);
      const walk = await g.shot();
      assert.ok(changed(base, walk, r).frac < 0.2, "and it is still the walking view a second later");
      assert.ok(changed(base, walk, r, [0, 0.88, 1, 0.12]).n >= 500, `and the Call's line stands at the bottom of the screen (${changed(base, walk, r, [0, 0.88, 1, 0.12]).n} pixels of it)`);
      await g.hold("call"); await wait(1500);              // a held Call
      const held = await g.shot();
      assert.ok(changed(walk, held, r).frac > 0.5, `a held Call is the zoomed-out view (${changed(walk, held, r).frac.toFixed(2)} of the screen moved)`);
      await g.release(); await wait(900);
      assert.ok(changed(walk, await g.shot(), r).frac < 0.05, "and releasing it returns the walking view");
    } finally { await g.ctx.close(); }
  });

  // OWNER #136 (11-24): "cross-place call broke again, i'm calling at this edge and is not revealing in the place above."
  it(`s2 the Call next door (#136, his save, patch 9,5 tile 9,0): a Call at the edge turns the strip of the place above from veiled to seen [${tag}]`, async () => {
    const g = await open(size, "136");
    try {
      const at = await g.where();
      assert.deepEqual([at.phase, at.x, at.y], ["patch", 9, 0], "the case is reached: he stands at the edge of his note");
      const r = await g.region();
      await g.press("call", 100, 1200);                     // the Call at the edge
      // the strip above the hero's place: the top quarter of the screen. Veiled it is dark dither; seen it is the land (grass, sand, water), which is bright and not the dark ground.
      const seen = (im) => colour(im, { x: r.x, y: r.y, w: r.w, h: Math.round(r.h * 0.25) }, ([R, G, B]) => G > 140 && G > B + 30).n;
      const top = [0, 0, 1, 0.25];
      await g.hold("call"); await wait(1500);               // the held view again; the land next door is asked for ("The Probe is reading the land") and drawn when it comes
      const before = await g.shot(`s2-${tag}-before`);      // the held view as it first draws: the land next door is owed, the strip is dark
      let after = before, waited = 1.5, t0 = Date.now();
      for (let i = 0; i < 40 && seen(after) < seen(before) + 3000; i++) { await wait(1000); after = await g.shot(); waited = (Date.now() - t0) / 1000 + 1.5; }
      console.log(`# s2 ${tag}: the strip was seen after ${waited.toFixed(1)} s held`);
      after = await g.shot(`s2-${tag}-after`);
      await g.release();
      assert.ok(seen(after) >= seen(before) + 3000, `the Call turned the strip of the place above from veiled to seen (after ${waited.toFixed(1)} s held; land pixels in the strip: ${seen(before)} before, ${seen(after)} after; ${changed(before, after, r, top).n} pixels changed)`);
    } finally { await g.ctx.close(); }
  });

  // QA verify-live-152 (fixed by PR 621): the hero stays drawn under the menu and while waiting when he stands near a place edge. His #166 save, patch 10,11 tile 21,0.
  it(`s3 the hero under the menu (#166, his save, tile 21,0): his pixels are on screen after ← opens the menu and after one Wait [${tag}]`, async () => {
    const g = await open(size, "166");
    try {
      const at = await g.where();
      assert.deepEqual([at.phase, at.x, at.y], ["patch", 21, 0], "the case is reached: he stands at the top edge");
      const r = await g.region(), base = await g.shot();
      // the hero is the biggest orange blob of the play field (below the HUD strip); the menu's orange selection bar and the HUD icons are other blobs and are never counted
      const field = { x: r.x, y: r.y + Math.round(r.h * 0.12), w: r.w, h: r.h - Math.round(r.h * 0.12) };
      const hero = blobs(base, field, HERO)[0];
      assert.ok(hero && hero.n > 300, `the reference shows the hero (${hero ? hero.n : 0} pixels)`);
      const pad = 6, hb = { x: hero.box.x - pad, y: hero.box.y - pad, w: hero.box.w + 2 * pad, h: hero.box.h + 2 * pad };
      await g.press("back");                                // ← opens the menu
      const menuBlobs = blobs(await g.shot(`s3-${tag}-menu`), hb, HERO), menu = menuBlobs[0] || { n: 0, box: null };
      console.log(`# s3 ${tag}: hero ${hero.n} px, menu ${menu.n} (${menuBlobs.length} blob(s) at his place)`);
      assert.ok(menu.n >= hero.n * 0.6, `the hero is on screen with the menu open (${menu.n} of ${hero.n} pixels)`);
      assert.ok(menu.n <= hero.n * 1.2, `the orange counted with the menu open is the hero's, not the menu's selection bar (${menu.n} of ${hero.n} pixels)`);
      assert.ok(menu.box && Math.abs(menu.box.x - hero.box.x) <= 4 && Math.abs(menu.box.y - hero.box.y) <= 4 && Math.abs(menu.box.w - hero.box.w) <= 6 && Math.abs(menu.box.h - hero.box.h) <= 6, `the orange blob with the menu open sits where the hero stands (${JSON.stringify(menu.box)} vs ${JSON.stringify(hero.box)})`);
      const rows = await g.page.evaluate(() => window.__play.frames.companion.contentWindow.__mb.menuItems().length);
      for (let i = 0; i < rows && await g.menuRow() !== "wait"; i++) await g.press("down");   // the rows differ by save ('Her page' only when a Loika is named): press Down until the row is Wait
      assert.equal(await g.menuRow(), "wait", "the case is reached: the selected row is Wait before confirm");
      const spent0 = await g.spent();
      await g.press("confirm", 100, 2500);                  // Wait, once
      assert.ok(await g.spent() > spent0, "the case is reached: Wait spent light (S.day.spent grew)");
      const wshot = await g.shot(`s3-${tag}-wait`), waited = blobs(wshot, hb, HERO)[0] || { n: 0 };
      console.log(`# s3 ${tag}: after Wait ${waited.n}`);
      assert.ok(waited.n >= hero.n * 0.75, `the hero is on screen after one Wait (${waited.n} of ${hero.n} pixels)`);
    } finally { await g.ctx.close(); }
  });
}
});
