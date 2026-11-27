// The play page's layout (src/layout.mjs): one device in view, the panel inside the window with its margins, no two blocks overlapping, the keys line at one height for both devices, every key at least 44, nothing scrolls.
import { test } from "node:test";
import assert from "node:assert/strict";
import { plan, barPlan, dockSheet, zCap, form, panFor, focusStep, BAR, LAPTOP_MAX_W, ZOOM } from "../src/layout.mjs";

const WINDOWS = [["390×844@3", 390, 844, 3, true], ["360×780@3", 360, 780, 3, true], ["393×659@3", 393, 659, 3, true], ["375×553@3", 375, 553, 3, true], ["375×667@3", 375, 667, 3, true], ["659×393@3", 659, 393, 3, true],["844×390@3", 844, 390, 3, true], ["932×430@3", 932, 430, 3, true], ["1440×900@1", 1440, 900, 1, false], ["1280×720@1", 1280, 720, 1, false], ["1280×720@1.5", 1280, 720, 1.5, false]];
const STATES = [["companion", false], ["station", false], ["station", true]];
const arr = (b) => (Array.isArray(b) ? b : [b.x, b.y, b.w, b.h]);
const overlap = (a, b) => { a = arr(a); b = arr(b); return a[0] < b[0] + b[2] - 1e-9 && b[0] < a[0] + a[2] - 1e-9 && a[1] < b[1] + b[3] - 1e-9 && b[1] < a[1] + a[3] - 1e-9; };
const inside = (b, W, H) => { b = arr(b); return b[0] >= -1e-9 && b[1] >= -1e-9 && b[0] + b[2] <= W + 1e-9 && b[1] + b[3] <= H + 1e-9; };
const each = (fn) => { for (const [tag, W, H, dpr, coarse] of WINDOWS) for (const [dev, asleep] of STATES) fn(plan({ W, H, dpr, coarse, dev, asleep }), `${tag} ${dev}${asleep ? " asleep" : ""}`, { W, H, dpr, coarse }); };

test("the panel is inside the window with side margins: 24 on a phone, 48 on a laptop; the panel is at most 1040 wide", () => {
  each((p, tag, w) => {
    assert.ok(inside(p.panel, w.W, w.H), tag + ": the panel is inside the window");
    assert.ok(p.panel.x >= (w.coarse ? 24 : 48) - 1e-9 && w.W - (p.panel.x + p.panel.w) >= (w.coarse ? 24 : 48) - 1e-9, tag + ": side margins");
    assert.ok(p.panel.y >= BAR, tag + ": the panel is under the bar");
    if (!w.coarse) assert.ok(p.panel.w <= LAPTOP_MAX_W, tag + ": the laptop panel is at most 1040 wide");
    assert.ok(inside(p.screen, w.W, w.H) && p.screen.x >= p.panel.x && p.screen.x + p.screen.w <= p.panel.x + p.panel.w && p.screen.y >= p.panel.y && p.screen.y + p.screen.h <= p.panel.y + p.panel.h, tag + ": the screen is in the panel");
  });
});

test("no two of bar, panel, note, hint, dock row and build line overlap; nothing scrolls", () => {
  each((p, tag, w) => {
    const items = { bar: p.bar, panel: p.panel }; if (p.note) items.note = p.note; if (p.hint) items.hint = p.hint; if (p.form === "up") { items.dock = p.dock; items.epaper = p.epaper; items.stamp = p.stamp.box; }
    const ids = Object.keys(items);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) assert.ok(!overlap(items[ids[i]], items[ids[j]]), `${tag}: ${ids[i]} and ${ids[j]} overlap`);
    for (const id of ids) assert.ok(inside(items[id], w.W, w.H), `${tag}: ${id} is inside the window`);
    if (p.form !== "up") { assert.ok(inside(p.dock, w.W, w.H) && inside(p.epaper, w.W, w.H), tag + ": the dock key and its screen's button are inside"); assert.ok(!overlap(p.dock, p.epaper), tag + ": the dock key and the button are apart"); }
  });
});

test("the keys line is at the same y for both devices, upright and on its side", () => {
  for (const [tag, W, H, dpr, coarse] of WINDOWS.filter((w) => w[4])) {
    const c = plan({ W, H, dpr, coarse, dev: "companion" }), s = plan({ W, H, dpr, coarse, dev: "station" }), z = plan({ W, H, dpr, coarse, dev: "station", asleep: true });
    assert.equal(c.keysLineY, s.keysLineY, tag + ": Companion and Station"); assert.equal(c.keysLineY, z.keysLineY, tag + ": and the asleep Station");
    assert.deepEqual([c.dock.y, c.dock.w], [s.dock.y, s.dock.w], tag + ": the Dock key too (its height and width; the panels' widths differ on their side)");
  }
});

test("every key at least 44; the keys are inside the panel and clear of the screen", () => {
  each((p, tag) => {
    const kp = p.tray.plan, [tx, ty] = p.tray.box;
    for (const [id, k] of Object.entries(kp.keys)) {
      assert.ok(k[2] >= 44 && k[3] >= 44, `${tag}: ${id} is ${k[2]} × ${k[3]}`);
      const abs = [tx + k[0], ty + k[1], k[2], k[3]];
      assert.ok(abs[0] >= p.panel.x - 1e-9 && abs[1] >= p.panel.y - 1e-9 && abs[0] + abs[2] <= p.panel.x + p.panel.w + 1e-9 && abs[1] + abs[3] <= p.panel.y + p.panel.h + 1e-9, `${tag}: ${id} is in the panel`);
      assert.ok(!overlap(abs, p.screen), `${tag}: ${id} is clear of the screen`);
    }
  });
});

test("the laptop Companion's scale × dpr is a whole number where 1 fits; the size control steps it", () => {
  for (const [tag, W, H, dpr, coarse] of WINDOWS.filter((w) => !w[4])) {
    const p = plan({ W, H, dpr, coarse, dev: "companion" }), z = p.scale * dpr;
    assert.ok(Math.abs(z - Math.round(z)) < 1e-9 && z >= 1, `${tag}: ${z} device px per lp`);
    const cap = zCap(W, H, dpr), q = plan({ W, H, dpr, coarse, dev: "companion", zSet: 2 }); assert.ok(Math.abs(q.scale * dpr - Math.min(2, cap)) < 1e-9, tag + ": a chosen 2, capped at the largest whole step that fits (" + cap + ")");
    const big = plan({ W, H, dpr, coarse, dev: "companion", zSet: 8 }); assert.ok(big.panel.h <= H - BAR + 1e-6 && big.panel.w <= W + 1e-6, tag + ": a chosen 8 never pushes the panel out of the window");
    assert.ok(plan({ W, H, dpr, coarse, dev: "station" }).scale <= 1, tag + ": the Station never above 1");
  }
});

test("the size cap: at 1440 × 900 a chosen ×2 stays at ×1 (a ×2 Companion is 900 × 1200 and would be cut); a window tall enough lets ×2 through", () => {
  assert.equal(zCap(1440, 900, 1), 1);
  const a = plan({ W: 1440, H: 900, dpr: 1, coarse: false, dev: "companion", zSet: 2 }); assert.equal(a.scale, 1); assert.ok(a.panel.y + a.panel.h <= 900);
  assert.equal(zCap(1600, 1300, 1), 2);
  const b = plan({ W: 1600, H: 1300, dpr: 1, coarse: false, dev: "companion", zSet: 3 }); assert.equal(b.scale, 2); assert.ok(b.panel.y + b.panel.h <= 1300);
});

test("the first-view numbers of the signed design (390 × 844, 1440 × 900)", () => {
  const c = plan({ W: 390, H: 844, dpr: 3, coarse: true, dev: "companion" });
  assert.deepEqual([c.panel.w, Math.round(c.panel.h)], [342, 618]); assert.ok(c.screen.w > 328 && c.screen.w <= 330);   // bug 135 ("screen is tiny"), one scale (code-audit step 6): the width's fit (330) floored to 1/64 device px per lp, which is what the shell draws, so the plan says what is drawn; not the whole ×2 (300, 91% of it)
  const l = plan({ W: 1440, H: 900, dpr: 1, coarse: false, dev: "companion" }); assert.deepEqual([l.panel.w, l.panel.h, l.margins.side], [770, 624, 335]);
  const s = plan({ W: 1440, H: 900, dpr: 1, coarse: false, dev: "station" }); assert.deepEqual([s.panel.w, Math.round(s.panel.h), s.margins.side], [1040, 446, 200]);
});

test("a short phone upright (Safari with its bars): the Companion is drawn whole at the scale the height gives; its screen ends above the keys; the Dock row is inside the window and clear of the build line", () => {
  for (const [W, H] of [[393, 659], [375, 553], [375, 667]]) for (const dev of ["companion", "station"]) {
    const p = plan({ W, H, dpr: 3, coarse: true, dev }), tag = `${W}×${H} ${dev}`, keysTop = p.tray.box[1], full = p.screen.y + 600 * p.scale;
    assert.ok(p.screen.y + p.screen.h <= keysTop + 1e-9, tag + ": the screen's bottom is above the keys' top");
    if (dev === "companion") {
      assert.ok(p.view == null && Math.abs(p.screen.h - 600 * p.scale) < 1e-6 && Math.abs(p.screen.w - 450 * p.scale) < 1e-6, tag + ": whole, at the scale it is drawn at");
      assert.ok(full <= keysTop + 1e-9, tag + ": the whole frame ends above the keys (it is drawn at full scale)");
      assert.ok(p.scale < (W - 48 - 24) / 450, tag + ": smaller than the width's fit, since the height is short");
      assert.ok(Math.abs((p.screen.x - p.panel.x) - (p.panel.w - p.screen.w) / 2) < 1e-6, tag + ": centred in the panel");
    }
    assert.ok(p.dock.y + p.dock.h <= H && p.dock.y + p.dock.h <= p.stamp.box.y, tag + ": the Dock row is whole, inside the window and above the build line");
    assert.ok(p.panel.y >= BAR + 16 - 1, tag + ": the panel keeps its gap under the bar");
  }
  // where the height is enough nothing changes: the width's fit, the screen at full height, as before
  // (play-scale-1: the width's fit rounded down to a whole number of device pixels per lp, centred in the panel)
  // bug 135: where that multiple is under 95% of the width's fit (inner width W - 60), the screen takes the fit; the height still caps it
  for (const [W, H] of [[390, 844], [393, 852]]) { const p = plan({ W, H, dpr: 3, coarse: true, dev: "companion" }), z = p.scale * 3, fit = (W - 60) / 450 * 3, whole = Math.floor(fit + 1e-6); assert.ok(Math.abs(z - (whole < 0.95 * fit ? fit : whole)) < 1 / 64 + 1e-6 && z <= (whole < 0.95 * fit ? fit : whole) + 1e-6, `${W}×${H}: the whole multiple, or the fit where the multiple is under 95% of it`); }
  { const p = plan({ W: 522, H: 935, dpr: 3, coarse: true, dev: "companion" }); assert.ok(p.screen.w > 405 && p.screen.w < 412 && p.screen.y + p.screen.h <= p.tray.box[1], "522×935: the screen takes the height's fit (410 of 462 CSS px), not 300"); }
  // bug 134: a fit just under a whole multiple (1.98 at 412 wide, dpr 2.625) takes the multiple, not one device pixel per lp
  for (const [W, H, dpr] of [[412, 915, 2.625], [411, 914, 2.625], [393, 851, 2.75]]) { const p = plan({ W, H, dpr, coarse: true, dev: "companion" }); assert.ok(Math.abs(p.scale * dpr - 2) < 1e-9 && Math.abs(p.screen.w - 450 * p.scale) < 1e-6, `${W}×${H} ×${dpr}: two device pixels per lp, the whole screen`); }
  for (const dpr of [2, 3]) for (const [W, H] of [[390, 844], [522, 935], [360, 740]]) { const p = plan({ W, H, dpr, coarse: true, dev: "companion" }); assert.ok(p.screen.w <= W - 60 + 1e-6 && p.scale * dpr >= 1, `${W}×${H} ×${dpr}: inside the panel, at least one device px per lp`); }
  // the smaller the window the smaller the Companion, never the keys
  let last = 1; for (let H = 800; H >= 480; H -= 20) { const p = plan({ W: 375, H, dpr: 3, coarse: true, dev: "companion" }); assert.ok(p.scale <= last + 1e-9 && p.a === 44, `375×${H}: the scale only shrinks, the keys stay at their signed size`); last = p.scale; }
});

test("the Station on a phone: x0.6 in a window (view) where the whole screen would be smaller; the whole screen wherever x0.6 fits; no turn hint", () => {
  for (const [W, H] of [[390, 844], [360, 780], [844, 390], [932, 430]]) for (const asleep of [false, true]) {
    const p = plan({ W, H, dpr: 3, coarse: true, dev: "station", asleep }), tag = `${W}×${H}${asleep ? " asleep" : ""}`;
    assert.ok(ZOOM - p.scale >= 0 && ZOOM - p.scale < 1 / 64 / 3 + 1e-9, tag + ": x0.6, floored to 1/64 device px (one scale, code-audit step 6: the plan says what is drawn)"); assert.ok(p.view && p.view.w < 1024 && p.view.h <= 600, tag + ": a window on part of the screen");
    assert.ok(Math.abs(p.screen.w - p.view.w * p.scale) < 1e-6 && Math.abs(p.screen.h - p.view.h * p.scale) < 1e-6, tag + ": the window is the view at x0.6");
    assert.ok(!("hint" in p) || p.hint == null, tag + ": no turn hint");
    if (p.note) assert.ok(p.note.y >= BAR + 16 - 1e-9 && p.note.y + p.note.h + 16 <= p.panel.y + 1e-9, tag + ": the asleep note under the bar, above the panel");
  }
  assert.equal(plan({ W: 390, H: 844, dpr: 3, coarse: true, dev: "station" }).view.h, 600, "390×844 awake: the window as tall as the screen");
  for (const [W, H, dpr, coarse] of [[1440, 900, 1, false], [1280, 720, 1, false]]) assert.equal(plan({ W, H, dpr, coarse, dev: "station" }).view, null, `${W}×${H}: the whole screen on a laptop`);
  assert.equal(plan({ W: 390, H: 844, dpr: 3, coarse: true, dev: "companion" }).view, null, "the Companion is always whole");
});
test("Home's narrow form (the `narrow` the page tells the Station): only the Station on a phone held upright, a window of at most 530 lp, centred in the panel on a wider phone; never sideways, on a laptop, or on the Companion", () => {
  for (const [W, H] of [[390, 844], [393, 659], [360, 780], [430, 932]]) for (const asleep of [false, true]) {
    const p = plan({ W, H, dpr: 3, coarse: true, dev: "station", asleep }), tag = `${W}×${H}${asleep ? " asleep" : ""}`;
    assert.equal(p.form, "up"); assert.equal(p.narrow, true, tag + ": narrow upright"); assert.ok(p.view.w <= 530 + 1e-6, tag + ": the window is at most 530 lp wide");
    assert.ok(p.screen.x >= p.panel.x - 1e-9 && p.screen.x + p.screen.w <= p.panel.x + p.panel.w + 1e-9, tag + ": the window stays inside the panel");
  }
  { const p = plan({ W: 390, H: 844, dpr: 3, coarse: true, dev: "station" }); assert.equal(p.view.w, 530, "390×844: the window is 530 lp wide, 1:1 at x0.6"); assert.equal(p.view.h, 600); assert.ok(Math.abs(p.screen.w - 318) < 0.7, "318 CSS px (530 lp at the 1/64-floored x0.6)"); }
  { const p = plan({ W: 430, H: 932, dpr: 3, coarse: true, dev: "station" }); assert.equal(p.view.w, 530, "a wider phone: still 530 lp, not more of the screen"); assert.ok(Math.abs((p.screen.x - p.panel.x) - (p.panel.x + p.panel.w - p.screen.x - p.screen.w)) < 1e-6, "centred in the panel"); }
  for (const [W, H, dpr, coarse] of [[844, 390, 3, true], [932, 430, 3, true], [1440, 900, 1, false], [1280, 720, 1, false]]) assert.ok(!plan({ W, H, dpr, coarse, dev: "station" }).narrow, `${W}×${H}: not narrow`);
  assert.ok(!plan({ W: 390, H: 844, dpr: 3, coarse: true, dev: "companion" }).narrow, "the Companion is never narrow");
});

test("panFor: the focused target whole with 12 lp round it, the least move, always inside the screen", () => {
  const v = { w: 530, h: 513 };
  assert.deepEqual(panFor(v, null), { x: 0, y: 0 }, "no ring at first: the top left");
  assert.deepEqual(panFor(v, null, { x: 300, y: 40 }), { x: 300, y: 40 }, "no ring: it stays");
  assert.deepEqual(panFor(v, [20, 60, 450, 300]), { x: 0, y: 0 }, "a target in view: no move");
  assert.deepEqual(panFor(v, [800, 60, 200, 300]), { x: 482, y: 0 }, "a target to the right: the window's right edge at its right + 12"); assert.deepEqual(panFor(v, [900, 60, 120, 300]), { x: 494, y: 0 }, "at the screen's edge: held inside (1024 − 530)");
  assert.deepEqual(panFor(v, [36, 500, 200, 80], { x: 300, y: 0 }), { x: 0, y: 79 }, "down and left: a target that fits from the screen's left edge rests the window there (ui-text-cut-1: none of the left side cut), its bottom + 12");
  assert.deepEqual(panFor(v, [600, 60, 200, 300], { x: 300, y: 0 }), { x: 300, y: 0 }, "a target in view part way across: no move");
  assert.deepEqual(panFor(v, [400, 60, 200, 300], { x: 494, y: 0 }), { x: 388, y: 0 }, "a target not at the edge: its left − 12");
  const big = panFor({ w: 300, h: 200 }, [100, 100, 400, 300]); assert.deepEqual(big, { x: 88, y: 88 }, "a target larger than the window: its top left in view");
  for (let i = 0; i < 200; i++) { const b = [Math.random() * 900, Math.random() * 500, 20 + Math.random() * 300, 20 + Math.random() * 200], p = panFor(v, b, { x: Math.random() * 494, y: Math.random() * 87 });
    assert.ok(p.x >= 0 && p.x <= 494 && p.y >= 0 && p.y <= 87, "inside the screen"); }
});

test("focusStep: Look from the Vivarium (the first message of her page still holds the Vivarium's ring) puts the window at the page's top left (station-match-11)", () => {
  const v = { w: 530, h: 513 }; let st = { screen: null, settling: false }, pan = { x: 0, y: 0 };
  const hear = (screen, box) => { const r = focusStep(st, screen, box); st = r.st; pan = r.top ? { x: 0, y: 0 } : panFor(v, box, pan); return pan; };
  hear("vivarium", [201, 88, 88, 120]);
  assert.deepEqual(hear("vivarium", [718, 244, 278, 34]), { x: 478, y: 0 }, "the pick's ring is at the right: the window follows");
  hear("pods", [718, 244, 278, 34]);   // her page: the stale ring first ...
  assert.deepEqual(hear("pods", null), { x: 0, y: 0 }, "... then none: the top left (before the fix it stayed at 478)");
  assert.deepEqual(hear("pods", null), { x: 0, y: 0 });
  hear("pods", [718, 244, 278, 34]); assert.deepEqual(pan, { x: 478, y: 0 }, "a ring later on the same screen still pans");
  assert.deepEqual(hear("pods", null), { x: 478, y: 0 }, "no ring for a moment on the same screen: it stays");
  assert.deepEqual(focusStep({ screen: "a", settling: false }, "a", null).top, false, "same screen, no ring, settled: no jump");
  assert.deepEqual(focusStep({ screen: "a", settling: false }, "b", null).top, true, "a new screen with no ring");
});

test("the bar: 52 tall, controls 44 and apart, inside the window; the laptop's switch is 320 wide and centred where it can be", () => {
  for (const [W, f, tools, size] of [[390, "up", false, false], [360, "up", false, false], [844, "side", false, false], [932, "side", false, false], [1440, "laptop", false, true], [1280, "laptop", true, true], [1100, "laptop", true, true]]) {
    const b = barPlan({ W, form: f, tools, size }), items = Object.entries({ switch: b.switch, options: b.options, keys: b.keys, tools: b.tools, stamp: b.stamp, ...(b.size ? { down: b.size[0], fit: b.size[1], up: b.size[2] } : {}) }).filter(([, v]) => v);
    for (const [id, v] of items) { assert.ok(v[3] === 44 && v[1] === 4 && v[0] >= 0 && v[0] + v[2] <= W, `${W} ${f}: ${id} is 44 tall and inside`); }
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) assert.ok(!overlap(items[i][1], items[j][1]), `${W} ${f}: ${items[i][0]} and ${items[j][0]} overlap`);
  }
  assert.equal(barPlan({ W: 1440, form: "laptop", size: true }).switch[2], 320); assert.equal(barPlan({ W: 1440, form: "laptop", size: true }).switch[0], 560);
});

test("the form: a fine pointer gets the laptop form only where it fits at ×1; otherwise the phone form for the orientation; a coarse pointer keeps its rule", () => {
  for (const [W, H, coarse, want] of [[390, 844, false, "up"], [844, 390, false, "side"], [1024, 600, false, "side"], [1440, 900, false, "laptop"], [1280, 720, false, "laptop"], [800, 900, false, "up"], [390, 844, true, "up"], [844, 390, true, "side"], [1024, 768, true, "laptop"], [1440, 900, true, "laptop"]]) assert.equal(form(W, H, coarse), want, `${W} × ${H} ${coarse ? "coarse" : "fine"}`);
  // wherever the laptop form is chosen for a fine pointer, the fit is at least ×1 (and plan asserts it)
  for (let W = 300; W <= 1800; W += 20) for (let H = 300; H <= 1300; H += 20) if (form(W, H, false) === "laptop") { const p = plan({ W, H, dpr: 1, coarse: false, dev: "companion" }); assert.ok(p.zFit >= 1 && p.scale >= 1, `${W} × ${H}: fit ×${p.zFit}`); const b = barPlan({ W, form: "laptop", size: true }); assert.ok(b.switch[0] + b.switch[2] <= Math.min(b.size[0][0], b.keys[0]), `${W}: the bar's controls are apart`); }
});

test("the dock's sheet: a bottom sheet on a phone, centred on a laptop, the e-paper across its width", () => {
  const p = dockSheet(390, 844, true); assert.equal(p.y + p.h, 844); assert.ok(Math.abs(p.epaper.w / p.epaper.h - 808 / 288) < 1e-9);
  const l = dockSheet(1440, 900, false); assert.ok(l.y > 0 && l.y + l.h < 900 && l.x > 0);
});

// bay-build-2: the Bay has Home's narrow form (530 x 600 lp), so PR 616's whole-screen flag is gone: on the upright phone the Bay is the same x0.6 window as Home, never the 1024 lp screen at the width's fit (QA verify-live-144: the Dock screen was cut off at 412 wide)
test("the Station's Bay on an upright phone is the narrow window, whole inside the panel (412, 390, 522 wide)", () => {
  for (const [W, H, dpr] of [[412, 915, 2], [390, 844, 3], [522, 935, 3]]) {
    const p = plan({ W, H, dpr, coarse: true, dev: "station" }), tag = W + "x" + H;
    assert.ok(p.view && p.narrow && p.view.w <= 530 + 1e-6, tag + ": the narrow window");
    assert.ok(p.view.w >= 530 - 1e-6 && p.view.h >= 600 - 1e-6, tag + ": the whole 530 x 600 form is in view, no pan");
    assert.ok(p.screen.x >= p.panel.x - 1e-9 && p.screen.x + p.screen.w <= p.panel.x + p.panel.w + 1e-9, tag + ": the screen right edge is inside the panel");
    assert.equal(p.whole, undefined, tag + ": no whole-screen flag");
  }
});
