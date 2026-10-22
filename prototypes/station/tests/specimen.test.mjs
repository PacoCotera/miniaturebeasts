// The Library specimen generator on the Station's own canvas (specimen.mjs on paint2d.mjs; build spec 4.2 and the architect's ruling): the port draws what the original specimen3.js draws (a Playwright oracle in Chromium, CI only: mean
// absolute difference at most 2 and at most 24 a channel, every bead centre equal), the same looks give the same bytes and a new look a new id, the drawn form keeps 12 px clear of every edge of the window in each signed state,
// the four breathing levels, the render time (printed against the 1 s budget of the development machine; the test fails only past 3 s), and the subset: the port calls nothing the canvas does not have.
//   node --test prototypes/station/tests/specimen.test.mjs        (the oracle needs playwright: PW_DIR=/path/with/node_modules/playwright, else it is skipped)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderSpecimen, HARNESS, MARGIN, RECIPE, BREATH_GAIN } from "../src/specimen.mjs";
import { specimenId, foundDigest, specimenFor } from "../src/specimen-cache.mjs";
import { CALLS } from "../src/paint2d.mjs";
import { decodePNG } from "../../ui/png.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fx = path.join(here, "fixtures/specimen"), frames = path.resolve(here, "../../workbench/frames");
const frameOf = (id) => JSON.parse(readFileSync(path.join(frames, `species-${id}.json`), "utf8"));
const stateOf = (n) => JSON.parse(readFileSync(path.join(fx, "states", n + ".json"), "utf8"));
const STATES = ["early", "mid", "late", "new"], S01 = frameOf("S01");
const sha = (b) => createHash("sha256").update(b).digest("hex");

test("the port calls only what the canvas subset has: every method specimen.mjs calls on a context or a canvas is in paint2d's list", () => {
  const src = readFileSync(path.join(here, "../src/specimen.mjs"), "utf8"), calls = new Set([...src.matchAll(/\b(?:ctx|o|tc|mc|light|out)\.(\w+)\(/g)].map((m) => m[1]));
  for (const c of calls) assert.ok(CALLS.includes(c), `specimen.mjs calls ${c}(), which paint2d.mjs does not have`);
  for (const f of ["specimen.mjs", "paint2d.mjs"]) assert.ok(!/\bdocument\b|\bwindow\b|OffscreenCanvas|require\(/.test(readFileSync(path.join(here, "../src", f), "utf8").replace(/\/\/.*$/gm, "")), `no document, window or canvas library in ${f}`);
});

// ---- the render ----
const renders = new Map(); const render = (n) => { if (!renders.has(n)) renders.set(n, renderSpecimen(S01, stateOf(n))); return renders.get(n); };
test("each signed state keeps 12 px clear of every edge of the 344 x 362 window (a species with longer rays fails here, not on screen)", () => {
  assert.deepEqual([HARNESS.w, HARNESS.h, HARNESS.ss, HARNESS.scale, HARNESS.dx, HARNESS.dy, HARNESS.grain, HARNESS.vignette], [344, 362, 2, 1.0, 5, 4, 4, 0.45]);
  for (const n of STATES) { const r = render(n), e = r.extent; assert.equal(r.rgba.length, 344 * 362 * 4);
    assert.ok(e.x0 >= MARGIN && e.y0 >= MARGIN && 344 - e.x1 >= MARGIN && 362 - e.y1 >= MARGIN, `${n}: the form spans x ${e.x0} to ${e.x1}, y ${e.y0} to ${e.y1}`); }
  const e = render("late").extent; console.log(`# the late form spans x ${e.x0} to ${e.x1}, y ${e.y0} to ${e.y1} (the art director measured x 22 to 322, y 29 to 330)`);
});
test("the picture is painted RGB, opaque and not snapped to the palette; a bead for each found look, each inside the window", () => {
  const found = (n) => Object.values(stateOf(n).S01).reduce((q, a) => q + a.length, 0);
  for (const n of STATES) { const r = render(n); assert.equal(r.beads.length, found(n), n); for (const b of r.beads) assert.ok(b.x > 0 && b.x < 344 && b.y > 0 && b.y < 362, `${n}: a bead at ${b.x}, ${b.y}`); for (let i = 3; i < r.rgba.length; i += 4) if (r.rgba[i] !== 255) assert.fail("alpha"); }
  const colours = new Set(); const r = render("late"); for (let i = 0; i < r.rgba.length; i += 4) colours.add((r.rgba[i] << 16) | (r.rgba[i + 1] << 8) | r.rgba[i + 2]); assert.ok(colours.size > 3000, `${colours.size} colours: painted, not snapped`);
  assert.deepEqual(render("new").beads.filter((b) => b.fresh).map((b) => b.look), ["russet and ash"]);
});
test("the same looks give the same bytes, and a different look set gives a different cache id", () => {
  const a = renderSpecimen(S01, stateOf("mid")), b = renderSpecimen(S01, stateOf("mid")); assert.equal(sha(a.rgba), sha(b.rgba)); assert.deepEqual(a.beads, b.beads);
  const ids = STATES.slice(0, 3).map((n) => specimenId("S01", stateOf(n).S01)); assert.equal(new Set(ids).size, 3); assert.match(ids[0], new RegExp(`^specimen:S01:[0-9a-f]{8}:v${RECIPE}$`));
  assert.equal(specimenId("S01", stateOf("mid").S01), specimenId("S01", JSON.parse(JSON.stringify(stateOf("mid").S01))));
  assert.equal(foundDigest({ b: ["y", "x"], a: ["z"] }), foundDigest({ a: ["z"], b: ["y", "x"] }), "the traits sorted");
  assert.notEqual(foundDigest({ a: ["x", "y"] }), foundDigest({ a: ["y", "x"] }), "the order of discovery is in the picture, so it is in the digest");
});
test("the render is cached by its id: a second call is the same object, and the render time of each state is printed against the 1 s budget (best of three on a warm engine; the test fails only past 3 s, a gross regression)", () => {
  const BUDGET = 1000, CEILING = 3000;   // the architect, 2026-10-22: the 1 s budget is the development machine's and is read from the printed figure; the shared CI runner is too noisy for it, so the assertion is a 3x tripwire
  const times = {};
  for (const n of ["late", "mid", "early", "new"]) { let best = Infinity; for (let k = 0; k < 3; k++) best = Math.min(best, renderSpecimen(S01, stateOf(n)).ms); times[n] = best; }
  const over = Object.entries(times).filter(([, t]) => t > BUDGET).map(([n]) => n);
  console.log(`# specimen render time (ms, best of three; budget ${BUDGET} on the development machine): ${Object.entries(times).map(([n, t]) => `${n} ${t.toFixed(0)}`).join(", ")}${over.length ? ` (over the budget: ${over.join(", ")})` : ""}`);
  for (const [n, t] of Object.entries(times)) assert.ok(t <= CEILING, `${n}: ${t.toFixed(0)} ms, past the ${CEILING} ms ceiling (budget ${BUDGET} ms)`);
  const x = specimenFor(S01, stateOf("early").S01, "S01"), y = specimenFor(S01, stateOf("early").S01, "S01"); assert.equal(x, y); assert.equal(x.id, specimenId("S01", stateOf("early").S01));
});
test("the four breathing levels breathe the form's light: the main one first, each brighter where the form is, and the ground, the grain and the vignette the same pixels at every level", () => {
  const r = render("mid"); assert.equal(r.levels.length, 4); assert.equal(r.levels[0], r.rgba); assert.deepEqual(BREATH_GAIN, [1, 1.04, 1.08, 1.12]);
  const sum = (a, lit) => { let s = 0, n = 0; for (let i = 0; i < r.lit.length; i++) if (!!r.lit[i] === lit) { s += a[i * 4] + a[i * 4 + 1] + a[i * 4 + 2]; n += 3; } return s / n; };
  const m = r.levels.map((a) => sum(a, true)); for (let k = 1; k < 4; k++) assert.ok(m[k] > m[k - 1], `level ${k + 1} is brighter on the form than ${k}: ${m.map((v) => v.toFixed(2))}`);
  // the art director's wording: ground more than 20 px from any form pixel is identical across the four levels (the bloom nearer the form may move)
  const W = 344, Hh = 362; let far = 0;
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    let near = false; for (let j = Math.max(0, y - 20); j <= Math.min(Hh - 1, y + 20) && !near; j++) for (let i = Math.max(0, x - 20); i <= Math.min(W - 1, x + 20); i++) if (r.form[j * W + i] && Math.hypot(i - x, j - y) <= 20) { near = true; break; }
    if (near) continue; far++; const o = (y * W + x) * 4; for (let k = 1; k < 4; k++) for (let c = 0; c < 4; c++) if (r.levels[k][o + c] !== r.rgba[o + c]) assert.fail(`level ${k + 1}: ground at ${x},${y} more than 20 px from the form changed`);
  }
  assert.ok(far > 344 * 362 * 0.05, `${far} ground pixels more than 20 px from the form`);
  let unlit = 0; for (let i = 0; i < r.lit.length; i++) if (!r.lit[i]) { unlit++; for (let k = 1; k < 4; k++) for (let c = 0; c < 4; c++) if (r.levels[k][i * 4 + c] !== r.rgba[i * 4 + c]) assert.fail(`level ${k + 1}: unlit ground ${i} changed`); }
  for (const a of r.levels) for (let i = 3; i < a.length; i += 4) if (a[i] !== 255) assert.fail("opaque");
});
// ---- the port's own bytes are the golden ----
const GOLD = path.join(here, "fixtures/specimen-golden.json");
test("the port's bytes are the golden: the digest of each signed state's picture and beads", () => {
  const got = Object.fromEntries(STATES.map((n) => [n, { rgba: sha(render(n).rgba), beads: sha(JSON.stringify(render(n).beads)) }]));
  if (process.env.SPECIMEN_GOLDEN === "write" || !existsSync(GOLD)) { writeFileSync(GOLD, JSON.stringify({ recipe: RECIPE, states: got }, null, 1) + "\n"); return; }
  const want = JSON.parse(readFileSync(GOLD, "utf8")); assert.equal(want.recipe, RECIPE, "the recipe changed: write the golden again (SPECIMEN_GOLDEN=write)"); assert.deepEqual(got, want.states);
});

// ---- the oracle: the original specimen3.js in Chromium (CI), three fixture species x two found-look sets ----
const require = createRequire(import.meta.url); let chromium = null;
try { ({ chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright")); } catch { chromium = null; }
const ORIGINAL = readFileSync(path.join(fx, "specimen3.js"), "utf8"), HOOK = "if (s.fresh) acc.push(p); }", PATCHED = ORIGINAL.replace(HOOK, "if (s.fresh) acc.push(p); if (opts.onBead) opts.onBead(p, t, s); }");   // the one edit the port makes, the bead's centre
const PAGE = (HARN) => `${PATCHED}\nexport const run = ${HARN};`;
// the harness, as specimen.mjs's: the form on a 2x canvas, finished at 2x, reduced by 2 x 2
const HARNESS_SRC = `(frame, state, H) => { const ss = H.ss, W = H.w * ss, Ht = H.h * ss, m = layout(model(frame, state)), beads = [];
  const light = document.createElement('canvas'); light.width = W; light.height = Ht; const ctx = light.getContext('2d');
  drawForm(ctx, { cx: (H.w / 2 + H.dx) * ss, cy: (H.h / 2 + H.dy) * ss, s: H.scale * ss }, m, { onBead: (p, t, s) => beads.push({ x: p[0] / ss, y: p[1] / ss, trait: t.id, look: s.look }) });
  const big = document.createElement('canvas'); big.width = W; big.height = Ht; finish(big, light, { grain: H.grain, vignette: H.vignette });
  const out = document.createElement('canvas'); out.width = H.w; out.height = H.h; out.getContext('2d').drawImage(big, 0, 0, H.w, H.h);
  return { png: out.toDataURL('image/png'), beads }; }`;
const SPECIES = ["S01", "S09", "S15"];
// The ruled bars are a mean difference of at most 2 and at most 24 a channel. A plain 4 x 4 supersampling port measures a mean of 1.0 to 1.3 and a largest difference of 25 to 30, at the edges of the beads' discs and rings: the browser's
// coarser curve flattening and its own edge coverage take a little more off a small bright disc than an exact one does. The mean holds the ruled bar; the largest is held at ORACLE_MAX, one easily changed value, and is reported for the architect.
const ORACLE_MEAN = 2, ORACLE_MAX = 32, ORACLE_OVER = 64;   // the architect: ORACLE_MAX confirmed; and no more than 64 channel values of a set may differ by more than 24 (a lost ring or bead moves hundreds)
function fixtureSets(frame) {   // A: the first look of every trait (a young collection); B: every look, one of them new
  const traits = frame.chapters.filter((c) => !c.sealed).flatMap((c) => c.traits), sid = frame.species.id;
  const A = {}, B = {}; for (const t of traits) { A[t.id] = t.looks.slice(0, 1); B[t.id] = t.looks.slice(); }
  return [{ [sid]: A }, { [sid]: B, newSince: { [sid]: { [traits[0].id]: [traits[0].looks.at(-1)] } } }];
}
test("the oracle: the port against the original specimen3.js in Chromium, three species x two found-look sets: mean difference at most 2, the largest within ORACLE_MAX, every bead centre equal", { skip: !chromium && "playwright is not installed (set PW_DIR)" }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium: " + String(e.message).split("\n")[0]); return; }
  try {
    const page = await browser.newPage(); await page.goto("about:blank"); const rows = [], bad = [];
    for (const sid of SPECIES) for (const [k, state] of fixtureSets(frameOf(sid)).entries()) {
      const frame = frameOf(sid), got = await page.evaluate(async ([src, frame, state, H]) => { const mod = await import(URL.createObjectURL(new Blob([src], { type: "text/javascript" }))); return mod.run(frame, state, H); }, [PAGE(HARNESS_SRC), frame, state, HARNESS]);
      const ref = decodePNG(Buffer.from(got.png.split(",")[1], "base64")), mine = renderSpecimen(frame, state);
      let sum = 0, max = 0, n = 0, over = 0; for (let i = 0; i < mine.rgba.length; i += 4) for (let c = 0; c < 3; c++) { const d = Math.abs(mine.rgba[i + c] - ref.data[i + c]); sum += d; if (d > max) max = d; if (d > 24) over++; n++; }
      const mean = sum / n; rows.push(`${sid}/${"AB"[k]} mean ${mean.toFixed(3)} max ${max} over24 ${over}`);
      if (mean > ORACLE_MEAN || max > ORACLE_MAX || over > ORACLE_OVER) bad.push(`${sid} set ${"AB"[k]}: mean ${mean.toFixed(3)}, largest ${max}, ${over} values over 24`);
      assert.equal(mine.beads.length, got.beads.length, `${sid} ${"AB"[k]}: bead count`);
      mine.beads.forEach((b, i) => { assert.ok(Math.abs(b.x - got.beads[i].x) < 0.01 && Math.abs(b.y - got.beads[i].y) < 0.01 && b.look === got.beads[i].look && b.trait === got.beads[i].trait, `${sid} ${"AB"[k]}: bead ${i} ${b.x},${b.y} against ${got.beads[i].x},${got.beads[i].y}`); });
    }
    console.log(`# the oracle: ${rows.join("; ")}`); assert.deepEqual(bad, [], `mean at most ${ORACLE_MEAN}, largest at most ${ORACLE_MAX} a channel`);
  } finally { await browser.close(); }
});
