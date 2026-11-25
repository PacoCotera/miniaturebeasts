// THE PLAYED-GAME TESTS, part 2 (owner 2026-11-25 06:0x, code-audit step 1, job 2: "one per ruling in the behaviour ledger, on your saves").
// Same rules as played.mjs: the shipped page, his saves, buttons only, the verdict read off the screenshot; state is read only to assert the case is reached.
// Ledger sections: 1 the Call (s1 in played.mjs), 2 next door (s2 in played.mjs), 3 cliffs and walking, 4 night and light, 5 the Companion's size, 6 wild creatures.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, teardown, open, SIZES, wait, px, changed, colour, blobs, HERO } from "./lib/harness.mjs";

before(setup);
after(teardown);

const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
// mean luminance of a box of the screenshot (x, y, w, h as fractions of the game screen r)
function meanLum(im, r, f) {
  const x0 = r.x + Math.round(r.w * f[0]), y0 = r.y + Math.round(r.h * f[1]), x1 = r.x + Math.round(r.w * (f[0] + f[2])), y1 = r.y + Math.round(r.h * (f[1] + f[3]));
  let s = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { s += lum(px(im, x, y)); n++; }
  return s / n;
}
// the share of neighbouring pixel pairs in a box whose luminance differs by more than 12: a flat ground has few, a grid or bracket pattern has many
function marks(im, r, f) {
  const x0 = r.x + Math.round(r.w * f[0]), y0 = r.y + Math.round(r.h * f[1]), x1 = r.x + Math.round(r.w * (f[0] + f[2])), y1 = r.y + Math.round(r.h * (f[1] + f[3]));
  let n = 0, k = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1 - 1; x++) { n++; if (Math.abs(lum(px(im, x, y)) - lum(px(im, x + 1, y))) > 12) k++; }
  return k / n;
}
// press Down until the menu's selected row is `id`; the case is reached only when it is
async function toRow(g, id) {
  const rows = await g.page.evaluate(() => window.__play.frames.companion.contentWindow.__mb.menuItems().length);
  for (let i = 0; i < rows && await g.menuRow() !== id; i++) await g.press("down");
  assert.equal(await g.menuRow(), id, `the case is reached: the selected row is ${id} before confirm`);
}

// the hero's own orange blob on the play field (below the HUD strip), as a share of the game screen's width: the zoomed-out view draws him far smaller, the walking view always the same
const heroOf = (im, r) => { const f = { x: r.x, y: r.y + Math.round(r.h * 0.12), w: r.w, h: r.h - Math.round(r.h * 0.12) }, h = blobs(im, f, HERO)[0]; return h ? { n: h.n / (r.w * r.w), w: h.box.w / r.w } : { n: 0, w: 0 }; };
// where the hero's centre stands across the game screen (0 = left edge, 1 = right edge), -1 when he is not drawn
const heroX = (im, r) => { const f = { x: r.x, y: r.y + Math.round(r.h * 0.12), w: r.w, h: r.h - Math.round(r.h * 0.12) }, h = blobs(im, f, HERO)[0]; return h ? (h.box.x + h.box.w / 2 - r.x) / r.w : -1; };
// the game screen's rectangle inside a screencast frame (the frames are scaled to the screen)
const inFrame = (r, base, f) => ({ x: Math.round(r.x * f.width / base.width), y: Math.round(r.y * f.height / base.height), w: Math.round(r.w * f.width / base.width), h: Math.round(r.h * f.height / base.height) });
// the Call's two presses on a place's tiles. A short press is the Call and never a view; a long press is the zoomed-out view on every tile.
const CALL_SPOTS = [
  { save: "152", tile: [0, 8], what: "west edge tile", walk: [] },
  { save: "136", tile: [9, 0], what: "top edge tile", walk: [] },
  { save: "159", tile: [23, 10], what: "east edge tile", walk: [] },
  { save: "146", tile: [3, 7], what: "inner tile", walk: ["right", "right"] },
  { save: "159", tile: null, what: "south edge tile", walk: [], down: true },
];

describe("the played game, part 2", { concurrency: 4 }, () => {
for (const size of SIZES) {
  const tag = `${size.w}x${size.h}`;

  // OWNER #27 (11-13): "resize the companion to fill the mobile screen, its tiny and there's space". #134 (11-24, his Android, about 412 px wide): "ridiculously small, can't see shit". #135 (522x935): "screen is tiny".
  it(`s8 the Companion's size (#27/#134/#135, his save 135): the game screen is drawn ${size.w === 412 ? "343" : "410"} px wide, as the ledger says [${tag}]`, async () => {
    const g = await open(size, "135");
    try {
      const r = await g.region(), im = await g.shot(`s8-${tag}`);
      // the drawn width, read off the screenshot: the land of the game screen (lit ground) runs from its left edge to its right edge; the dark Companion body and page lie round it
      let x0 = 1e9, x1 = -1;
      for (const fy of [0.3, 0.4, 0.5, 0.6, 0.7]) { const y = r.y + Math.round(r.h * fy); for (let x = 0; x < im.width; x++) { const p = px(im, x, y); if (p[0] + p[1] + p[2] > 300) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } } }
      const drawn = (x1 - x0 + 1) / size.dpr, want = size.w === 412 ? 343 : 410;   // ledger s5 (PR 565): 412 -> 343, 522 -> 410
      assert.ok(Math.abs(drawn - want) <= 3, `the Companion's game screen is drawn ${drawn.toFixed(1)} css px wide on a ${size.w} px phone (the ledger: ${want}; his words: fill the phone's width, not tiny)`);
      assert.ok(drawn >= size.w * 0.78, `and it fills the phone's width: ${(100 * drawn / size.w).toFixed(0)}% of ${size.w} px`);
    } finally { await g.ctx.close(); }
  });

  // OWNER #146 (11-24): "Another regression, the hero can cross cliff walls." His save: seed 64, the place at patch cell 108, the west edge beside a ring cell's cliff: tiles 0,7 and 0,8 stop at the wall, 0,3 and 0,10 are open ground.
  it(`s5 walking beside cliffs (#146, his save, tile 1,7): the hero walks up to the cliff wall and stops at it, on tiles 0,7 and 0,8 [${tag}]`, async () => {
    const g = await open(size, "146");
    try {
      const at = await g.where();
      assert.deepEqual([at.phase, at.x, at.y], ["patch", 1, 7], "the case is reached: he stands at the spot of his note");
      const r = await g.region();
      await g.press("left", 100, 900);
      let w = await g.where();
      assert.deepEqual([w.x, w.y], [0, 7], "the case is reached: one step left puts him on the edge tile 0,7");
      const before = await g.shot(`s5-${tag}-edge`);
      await g.press("left", 100, 1500);                    // the step across the wall
      const after = await g.shot(`s5-${tag}-after`);
      assert.ok(changed(before, after, r).frac < 0.05, `the hero stands at the cliff wall: the screen does not move (${changed(before, after, r).frac.toFixed(3)} of it changed)`);
      assert.deepEqual([(await g.where()).x, (await g.where()).y], [0, 7], "the case is reached: he is still on tile 0,7");
      await g.press("down", 100, 900);                     // and the next tile down the edge, 0,8
      w = await g.where();
      assert.deepEqual([w.x, w.y], [0, 8], "the case is reached: he walked down the edge to tile 0,8");
      const before8 = await g.shot(`s5-${tag}-edge8`);
      await g.press("left", 100, 1500);
      assert.ok(changed(before8, await g.shot(`s5-${tag}-after8`), r).frac < 0.05, "and he stands at the wall on 0,8 too: the screen does not move");
      assert.deepEqual([(await g.where()).x, (await g.where()).y], [0, 8], "the case is reached: he is still on tile 0,8");
    } finally { await g.ctx.close(); }
  });

  // OWNER #159 (11-24 22:51): "can't move to the right, nothing is blocking me" (seed 64, cell 283, tile 23,10: open grass drawn to the east edge, refused with 'Loose scree · needs a rambler')
  it(`s6 an invisible wall (#159, his save, tile 23,10): grass drawn to the east edge walks out of the place [${tag}]`, async () => {
    const g = await open(size, "159");
    try {
      const at = await g.where();
      assert.deepEqual([at.phase, at.x, at.y], ["patch", 23, 10], "the case is reached: he stands at the spot of his note");
      const r = await g.region();
      const before = await g.shot(`s6-${tag}-before`);
      await g.press("call", 100, 2500);                     // the cell to the east is veiled ("Veiled · Call to see"): a Call lifts it
      const hx = (im) => heroX(im, r);
      let after = before;
      await g.press("right", 100, 1500);                    // the step to the right, grass drawn to the east edge; the crossing waits for the next place to be baked (up to 20 s or more on a loaded machine)
      for (let i = 0; i < 40 && !(hx(after) >= 0 && hx(after) < 0.3); i++) { await wait(1000); after = await g.shot(); }
      after = await g.shot(`s6-${tag}-after`);
      assert.ok(hx(before) > 0.5 && hx(after) >= 0 && hx(after) < 0.3, `he walks right off the place's east edge and comes in at the next place's west side (hero at ${hx(before).toFixed(2)} of the screen's width, then ${hx(after).toFixed(2)})`);
      const w1 = await g.where();
      assert.ok(w1.key !== at.key, `the case is reached: he is in another place now (${w1.key} from ${at.key})`);
    } finally { await g.ctx.close(); }
  });

  // OWNER #143 (11-24): "short call is ALWAYS a call, long call is ALWAYS a zoom out. hero position has nothing to do with the behavior of a call." (572 put a 1.5 s view on an edge tile's short Call; 578 took it out)
  for (const spot of CALL_SPOTS) it(`s4 the Call on a ${spot.what} (#143, his save ${spot.save}, tile ${spot.tile ?? "bottom row"}): a short press never zooms out, a long press always does [${tag}]`, async () => {
    const g = await open(size, spot.save);
    try {
      for (const k of spot.walk) await g.press(k, 100, 900);
      const at = await g.where();
      if (spot.down) { let y = at.y; for (let i = 0; i < 40; i++) { await g.press("down", 100, 450); const ny = (await g.where()).y; if (ny === y) break; y = ny; } assert.ok(y >= 20, `the case is reached: he walked down to the place's south edge (tile row ${y})`); }
      else assert.deepEqual([at.phase, at.x, at.y], ["patch", ...spot.tile], "the case is reached: he stands on the tile");
      const r = await g.region(); let base = await g.shot(), h0 = heroOf(base, r);
      for (let i = 0; i < 15 && h0.n <= 0.0002; i++) { await wait(1000); base = await g.shot(); h0 = heroOf(base, r); }   // a loaded machine may still be drawing the place
      assert.ok(h0.n > 0.0002, `the walking view shows the hero (${h0.n.toFixed(4)})`);
      const frames = await g.record(() => g.press("call", 100, 0), 2200);   // a short Call, and every frame the browser paints from before it to 2.2 s after (572's view lasted 1.5 s)
      assert.ok(frames.length >= 3, `the screen was recorded (${frames.length} frames)`);
      for (const [i, f] of frames.entries()) {
        const h = heroOf(f, inFrame(r, base, f));
        assert.ok(h.n > h0.n * 0.6 && h.n < h0.n * 1.5, `a short Call stays in the walking view: the hero is as large as before (frame ${i}: ${h.n.toFixed(4)}, walking ${h0.n.toFixed(4)})`);
      }
      await wait(600);
      const walk = await g.shot();
      await g.hold("call"); await wait(1500);              // a long press
      const held = await g.shot(`s4-${spot.save}-${tag}-held`);
      assert.ok(changed(walk, held, r).frac > 0.5, `a long press is the zoomed-out view (${changed(walk, held, r).frac.toFixed(2)} of the screen moved)`);
      await g.release(); await wait(900);
      assert.ok(changed(walk, await g.shot(), r).frac < 0.05, "and releasing it returns the walking view");
    } finally { await g.ctx.close(); }
  });

  // OWNER #113 (11-22): "night looks exactly the same as every other time of the day". His #142 save stands at the start flag, where Wait rests to the next part of day: a day still and a night still, the same spot.
  it(`s7 night and light (#113, his save, tile 0,2): the same spot at night is much darker than by day [${tag}]`, async () => {
    const g = await open(size, "142");
    try {
      const at = await g.where();
      assert.deepEqual([at.phase, at.x, at.y], ["patch", 0, 2], "the case is reached: he stands at the spot of his note");
      const r = await g.region(), day = await g.shot(`s7-${tag}-day`), spent0 = await g.spent();
      await g.press("back");                                // ← opens the menu
      await toRow(g, "wait");
      for (let i = 0; i < 200 && await g.spent() < 552; i++) {
        const before = await g.spent();
        await g.press("confirm", 100, 0);                   // one Wait is one light; the menu folds to a strip and Confirm again waits again
        for (let k = 0; k < 40 && await g.spent() <= before; k++) await wait(50);
        if (await g.spent() <= before) await g.press("confirm", 100, 800);   // a part's notice ("Dusk. The wild ones are going to their beds.") takes the press that dismisses it
      }
      assert.ok(await g.spent() > spent0 + 100, "the case is reached: Waits spent the day's light");
      console.log(`# s7 ${tag}: spent ${spent0} -> ${await g.spent()}`);
      assert.ok(await g.spent() >= 550, "the case is reached: it is night (the day's last 50 light)");
      await g.press("back", 100, 800);                      // close the menu
      const back = await g.where();
      assert.deepEqual([back.x, back.y], [0, 2], "the case is reached: the same spot of the same place");
      const night = await g.shot(`s7-${tag}-night`);
      // named regions of the game screen, clear of the menu's panel (right, top 70%): the sand at the left, the grass at the bottom right
      const named = { sand: [0.02, 0.1, 0.3, 0.4], grass: [0.45, 0.78, 0.5, 0.1] };
      for (const [name, f] of Object.entries(named)) {
        const d = meanLum(day, r, f), n = meanLum(night, r, f);
        assert.ok(n < d * 0.5, `night is not like day: the ${name} is ${n.toFixed(0)} bright at night, ${d.toFixed(0)} by day`);
      }
      // OWNER #127 (11-23): "these grass tiles are incorrect for the night." The night ground is a flat tone: no grid or bracket marks on the open sand
      const m = marks(night, r, named.sand);
      assert.ok(m < 0.08, `the night ground carries no grid or bracket marks (${m.toFixed(3)} of the sand's pixel pairs change)`);
    } finally { await g.ctx.close(); }
  });
}
});
