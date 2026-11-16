// The play page's layout (src/layout.mjs): one device in view, the panel inside the window with its margins, no two blocks overlapping, the keys line at one height for both devices, every key at least 44, nothing scrolls.
import { test } from "node:test";
import assert from "node:assert/strict";
import { plan, barPlan, dockSheet, zCap, form, panFor, BAR, LAPTOP_MAX_W, ZOOM } from "../src/layout.mjs";

const WINDOWS = [["390×844@3", 390, 844, 3, true], ["360×780@3", 360, 780, 3, true], ["844×390@3", 844, 390, 3, true], ["932×430@3", 932, 430, 3, true], ["1440×900@1", 1440, 900, 1, false], ["1280×720@1", 1280, 720, 1, false], ["1280×720@1.5", 1280, 720, 1.5, false]];
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
  assert.deepEqual([c.panel.w, Math.round(c.panel.h)], [342, 604]); assert.equal(Math.round(c.screen.w), 318); assert.equal(Math.round(c.margins.top), 44);
  const l = plan({ W: 1440, H: 900, dpr: 1, coarse: false, dev: "companion" }); assert.deepEqual([l.panel.w, l.panel.h, l.margins.side], [770, 624, 335]);
  const s = plan({ W: 1440, H: 900, dpr: 1, coarse: false, dev: "station" }); assert.deepEqual([s.panel.w, Math.round(s.panel.h), s.margins.side], [1040, 446, 200]);
});

test("the Station on a phone: x0.6 in a window (view) where the whole screen would be smaller; the whole screen wherever x0.6 fits; no turn hint", () => {
  for (const [W, H] of [[390, 844], [360, 780], [844, 390], [932, 430]]) for (const asleep of [false, true]) {
    const p = plan({ W, H, dpr: 3, coarse: true, dev: "station", asleep }), tag = `${W}×${H}${asleep ? " asleep" : ""}`;
    assert.equal(p.scale, ZOOM, tag + ": x0.6"); assert.ok(p.view && p.view.w < 1024 && p.view.h <= 600, tag + ": a window on part of the screen");
    assert.ok(Math.abs(p.screen.w - p.view.w * p.scale) < 1e-6 && Math.abs(p.screen.h - p.view.h * p.scale) < 1e-6, tag + ": the window is the view at x0.6");
    assert.ok(!("hint" in p) || p.hint == null, tag + ": no turn hint");
    if (p.note) assert.ok(p.note.y >= BAR + 16 - 1e-9 && p.note.y + p.note.h + 16 <= p.panel.y + 1e-9, tag + ": the asleep note under the bar, above the panel");
  }
  assert.equal(plan({ W: 390, H: 844, dpr: 3, coarse: true, dev: "station" }).view.h, 600, "390×844 awake: the window as tall as the screen");
  for (const [W, H, dpr, coarse] of [[1440, 900, 1, false], [1280, 720, 1, false]]) assert.equal(plan({ W, H, dpr, coarse, dev: "station" }).view, null, `${W}×${H}: the whole screen on a laptop`);
  assert.equal(plan({ W: 390, H: 844, dpr: 3, coarse: true, dev: "companion" }).view, null, "the Companion is always whole");
});

test("panFor: the focused target whole with 12 lp round it, the least move, always inside the screen", () => {
  const v = { w: 530, h: 513 };
  assert.deepEqual(panFor(v, null), { x: 0, y: 0 }, "no ring at first: the top left");
  assert.deepEqual(panFor(v, null, { x: 300, y: 40 }), { x: 300, y: 40 }, "no ring: it stays");
  assert.deepEqual(panFor(v, [20, 60, 450, 300]), { x: 0, y: 0 }, "a target in view: no move");
  assert.deepEqual(panFor(v, [800, 60, 200, 300]), { x: 482, y: 0 }, "a target to the right: the window's right edge at its right + 12"); assert.deepEqual(panFor(v, [900, 60, 120, 300]), { x: 494, y: 0 }, "at the screen's edge: held inside (1024 − 530)");
  assert.deepEqual(panFor(v, [36, 500, 200, 80], { x: 300, y: 0 }), { x: 24, y: 79 }, "down and left: its left − 12, its bottom + 12");
  const big = panFor({ w: 300, h: 200 }, [100, 100, 400, 300]); assert.deepEqual(big, { x: 88, y: 88 }, "a target larger than the window: its top left in view");
  for (let i = 0; i < 200; i++) { const b = [Math.random() * 900, Math.random() * 500, 20 + Math.random() * 300, 20 + Math.random() * 200], p = panFor(v, b, { x: Math.random() * 494, y: Math.random() * 87 });
    assert.ok(p.x >= 0 && p.x <= 494 && p.y >= 0 && p.y <= 87, "inside the screen"); }
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
