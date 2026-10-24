#!/usr/bin/env node
// The art director's layer table on the real pictures: the Station page's own face, in test mode (?test), drawing Pods from pods-props, Home from home-props Cargo from cargo-props and Create from create-props. At each of Pods' states and each of Home's, Cargo's and Create's capture points the
// pixels outside the palette on pass 1 (chrome) and pass 2 (chrome and art) must read 0; painted pictures show only on pass 3. For Home, Cargo, Idle and Create also check 1 of the gate: no region of the face's log departs from home.json, cargo.json, frame.json (Idle) or create.json
// (tools/home-regions.mjs, tools/cargo-regions.mjs, tools/idle-regions.mjs, tools/create-regions.mjs), and the budgets are printed (objects, pictures, props). Prints one line per state; exits 1 on any other reading.
//   PW_DIR=/path/with/node_modules/playwright node prototypes/face/tools/layer-check.mjs   (after build.sh; LAYER_ONLY=cargo takes only the screens named)
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { podsStates } from "./pods-states.mjs";
import { homeStates } from "./home-states.mjs";
import { departures } from "./home-regions.mjs";
import { idleStates } from "./idle-states.mjs";
import { departures as idleDepartures } from "./idle-regions.mjs";
import { cargoStates } from "./cargo-states.mjs";
import { departures as cargoDepartures } from "./cargo-regions.mjs";
import { createStates } from "./create-states.mjs";
import { departures as createDepartures } from "./create-regions.mjs";
import { incubatorStates } from "./incubator-states.mjs";
import { departures as incubatorDepartures } from "./incubator-regions.mjs";
import { vivariumStates } from "./vivarium-states.mjs";
import { departures as vivariumDepartures } from "./vivarium-regions.mjs";
import { habitatStates } from "./habitat-states.mjs";
import { departures as habitatDepartures } from "./habitat-regions.mjs";
import { focusRingOps, ringRaster, ringDepartures } from "../../ui/rings.mjs";
import { libraryStates } from "./library-states.mjs";
import { benchStates } from "./bench-states.mjs";
import { departures as benchDepartures } from "./bench-regions.mjs";
import { departures as libraryDepartures } from "./library-regions.mjs";

const specs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), home = J("home"), cargo = J("cargo"), create = J("create"), incubator = J("incubator"), vivarium = J("vivarium"), habitat = J("habitat"), namerSpec = J("namer"), library = J("library"), benchSpec = J("bench"), frame = J("frame");
// Rule F2, the 2 px floor on the rendered frame (fix 14 §14.4): for a creature's ring, the bands that reach 3:1 against the ground (the same state drawn without the ring) add up to 2 px in every cross-section of the line
const palette = JSON.parse(readFileSync(path.join(specs, "../../palettes/station.json"), "utf8")).colours, rgbOf = (n) => { const h = palette.find(([k]) => k === n)[1]; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }, lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const FLOOR_STATES = /resident-focused/;
function floorProblems(name, rect, withRing, ground) {
  const [x0, y0, W, H] = rect, ring = focusRingOps("oval", [x0 + 5, y0 + 5, W - 10, H - 10], frame.focus.ring), roles = ringRaster(ring), inner = ringRaster({ ...ring, ops: [ring.ops[ring.ops.length - 1]] });
  const col = { 1: rgbOf("void"), 2: rgbOf("focus") }, at = (arr, x, y) => [arr[3 * (y * W + x)], arr[3 * (y * W + x) + 1], arr[3 * (y * W + x) + 2]], same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  const visible = (x, y) => roles[y * W + x] > 0 && same(at(withRing, x, y), col[roles[y * W + x]]);
  let bad = 0, total = 0, none = 0, px3 = 0, first = null; const under = new Set();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inner[y * W + x] || !visible(x, y)) continue;   // pixels under the body are skipped
    const dx = (x + 0.5 - W / 2) / (W / 2) ** 2, dy = (y + 0.5 - H / 2) / (H / 2) ** 2, horiz = Math.abs(dx) > Math.abs(dy), step = horiz ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dy) || 1];
    let n = 0; const run = [[x, y]];   // the cross-section: the ring pixels along the axis through this one
    for (const dir of [1, -1]) for (let k = 1; k <= 5; k++) { const px = x + dir * k * step[0], py = y + dir * k * step[1]; if (px >= 0 && py >= 0 && px < W && py < H && roles[py * W + px]) run.push([px, py]); }   // the ring's pixels within its 5 px reach along the axis (a staircase notch does not cut a band off)
    if (run.some(([px, py]) => !visible(px, py))) continue;   // a cross-section the body covers in part is under the body, not the line's
    total++;
    for (const [px, py] of run) { const L1 = lum(col[roles[py * W + px]]), L2 = lum(at(ground, px, py)), r = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); if (r >= 3) n++; }
    if (n < 1) none++;
    px3 += n;
    if (n < 2) { under.add(y * W + x); }
    if (n < 2) { bad++; if (!first) { first = [x0 + x, y0 + y]; if (process.env.FLOORDEBUG) console.error(name, "first failing run:", run.map(([px, py]) => { const L1 = lum(col[roles[py * W + px]]), g = at(ground, px, py), L2 = lum(g); return `${roles[py * W + px] === 2 ? "core" : "key"}@${x0 + px},${y0 + py} ground ${g} ${((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2)}`; }).join(" | ")); } }
  }
  // the longest run of neighbouring cross-sections under 2 px (8-connected inner-band pixels)
  let longest = 0; const seen = new Set(); for (const k of under) { if (seen.has(k)) continue; let n = 0; const stack = [k]; seen.add(k); while (stack.length) { const q = stack.pop(); n++; const qx = q % W, qy = (q - qx) / W; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nk = (qy + dy) * W + qx + dx; if (under.has(nk) && !seen.has(nk)) { seen.add(nk); stack.push(nk); } } } if (n > longest) longest = n; }
  // the rule (UI/UX, 18:52): (a) the ring pixels at 3:1 are at least 2 x the visible cross-sections and (b) every cross-section has at least 1 px at 3:1
  const sum = `${bad} of ${total} under 2 px, longest run ${longest}`;
  return { text: `${name}: ${sum}`, fail: px3 < 2 * total || none > 0 ? `${name}: ${sum}; ${px3 < 2 * total ? `ring pixels at 3:1 ${px3} < 2 x ${total}` : ""}${none ? ` ${none} cross-sections with none at 3:1 (first under 2 px at ${first})` : ""}` : null, first };
}
let failed = 0;
const reading = (screen) => async (name, page, fail) => {
  const panel = await page.evaluate(() => window.__st.props?.overlay?.id === "panel"), keep = (d) => (panel ? d.filter((m) => !/\bring\b|focus draws nothing|namer's plate/.test(m)) : d);   // a decision panel is open: its ring and plate are the panel's (tests/panel.test.mjs); the screen beneath draws none
  const r = await page.evaluate(() => window.__st.snapshot());
  // fix 14, on every screen and state: (rule 1) a ring is the one focus word's, or a named holder's; (rule 2) on pass 1, in the stage, every pixel of `focus` lies inside the focus region, none when there is no ring;
  // (rule 4, runtime) no composed node of dashes or dots makes a closed box. The focus region's rect is the log's, taken in the same capture.
  let ringTxt = "";
  { const g = await page.evaluate(({ focus }) => {
      const F = window.__st.face, log = window.__st.check().log, fr = log.regions.filter((r) => r.id === "focus" && r.layer === "chrome"), rect = fr[0]?.rect ?? null;
      F.pass(1); let outside = 0, inside = 0, at = null;
      for (let y = 40; y < 562; y++) for (let x = 0; x < 1024; x++) { const p = F.pixel(x, y), hit = (p[0] === focus[0] && p[1] === focus[1] && p[2] === focus[2]);
        if (hit && rect && x >= rect[0] && y >= rect[1] && x < rect[0] + rect[2] && y < rect[1] + rect[3]) inside++;
        if (hit && (!rect || x < rect[0] || y < rect[1] || x >= rect[0] + rect[2] || y >= rect[1] + rect[3])) { outside++; if (!at) at = [x, y]; } }
      F.pass(3); return { log, hold: window.__st.holding() && window.__st.props?.screen !== "bench" && !/^resident/.test(window.__st.props?.overlay?.focus?.cur ?? window.__st.props?.focus?.cur ?? ""), faces: (window.__st.props?.regions?.cross?.faces ?? []).length, focusTarget: !!(window.__st.props?.overlay?.focus?.cur || (window.__st.props?.focus?.cur && window.__st.props.focus.cur !== "room")), boxes: log.regions.filter((q) => q.box).map((q) => q.id + "/" + q.layer), outside, inside, at };
    }, { focus: [0xff, 0xe6, 0xad] });
    for (const d of ringDepartures(g.log, g)) fail(`${name}: ${d}`);
    for (const b of g.boxes) fail(`${name}: ${b} makes a closed box of dashes or dots`);
    if (g.outside) fail(`${name}: focus colour outside the ring, ${g.outside} px at ${g.at}`);
    ringTxt = g.inside ? ` · ring ${g.inside} px` : "";
    if (FLOOR_STATES.test(name)) {
      const fr = await page.evaluate(() => { const F = window.__st.face, r = window.__st.check().log.regions.find((q) => q.id === "focus" && q.layer === "chrome")?.rect; if (!r) return null; const grab = () => { const o = []; for (let y = r[1]; y < r[1] + r[3]; y++) for (let x = r[0]; x < r[0] + r[2]; x++) o.push(...F.pixel(x, y)); return o; };
        const withRing = grab(); F.hide("focus"); const ground = grab(); F.hide(""); return { r, withRing, ground }; });
      if (!fr) fail(`${name}: no ring to measure for the 2 px floor`); else { const res = floorProblems(name, fr.r, fr.withRing, fr.ground);
        ringTxt += " · floor " + res.text.slice(name.length + 2); if (res.fail) fail(res.fail); }
    } }
  let extra = "";
  if (screen === "home") {
    const c = await page.evaluate(() => ({ log: window.__st.check().log, cur: window.__st.props?.focus?.cur ?? "room", size: JSON.stringify(window.__st.props ?? {}).length, objects: window.__st.face.objects(), pictures: window.__st.face.stats.pictures }));
    const d = departures(c.log, home, frame, c.cur); extra = ` · departures ${d.length} · objects ${c.objects} · pictures ${c.pictures} · props ${c.size} B`;
    for (const m of d.slice(0, 3)) fail(`${name}: ${m}`); if (c.objects > 400) fail(`${name}: ${c.objects} objects (budget 400)`); if (c.pictures > 200) fail(`${name}: ${c.pictures} pictures (budget 200)`); if (c.size > 32 * 1024) fail(`${name}: props ${c.size} B (budget 32 KiB)`);
  }
  // incubator-hatch-skip is left out of the Incubator region checks: the frame after ✓ Skip is the first frame of the 180 ms hand-off dither into the Habitat meet (T-90; incubator-states asserts screen habitat)
  if (screen === "incubator" && name !== "incubator-hatch-skip") {
    const c = await page.evaluate(() => ({ log: window.__st.check().log, state: window.__st.props?.state, size: JSON.stringify(window.__st.props ?? {}).length, objects: window.__st.face.objects(), pictures: window.__st.face.stats.pictures }));
    const d = keep(incubatorDepartures(c.log, incubator, frame, c.state)); extra = ` · departures ${d.length} · objects ${c.objects} · pictures ${c.pictures} · props ${c.size} B`;
    for (const m of d.slice(0, 3)) fail(`${name}: ${m}`); if (c.objects > 400) fail(`${name}: ${c.objects} objects (budget 400)`); if (c.pictures > 200) fail(`${name}: ${c.pictures} pictures (budget 200)`); if (c.size > 32 * 1024) fail(`${name}: props ${c.size} B (budget 32 KiB)`);
  }
  if (screen === "vivarium") {
    const c = await page.evaluate(() => ({ log: window.__st.check().log, state: window.__st.props?.state, cur: window.__st.props?.focus?.cur ?? "room", n: window.__st.props?.regions?.tiles?.items?.length ?? 0, figs: (window.__st.props?.regions?.residents ?? []).map((r) => ({ stage: r.stage, figure: r.figure ?? null })), size: JSON.stringify(window.__st.props ?? {}).length, objects: window.__st.face.objects(), pictures: window.__st.face.stats.pictures }));
    const d = keep(vivariumDepartures(c.log, vivarium, c.state, c.cur, c.n, c.figs)); extra = ` · departures ${d.length} · objects ${c.objects} · pictures ${c.pictures} · props ${c.size} B`;
    for (const m of d.slice(0, 3)) fail(`${name}: ${m}`); if (c.objects > 400) fail(`${name}: ${c.objects} objects (budget 400)`); if (c.pictures > 200) fail(`${name}: ${c.pictures} pictures (budget 200)`); if (c.size > 32 * 1024) fail(`${name}: props ${c.size} B (budget 32 KiB)`);
  }
  if (screen === "habitat") {
    const c = await page.evaluate(() => ({ log: window.__st.check().log, state: window.__st.props?.state, cur: window.__st.props?.focus?.cur ?? "resident", n: window.__st.props?.regions?.tiles?.items?.length ?? 0, open: window.__st.props?.overlay?.id === "namer", foot: window.__st.props?.regions?.resident?.moving ? null : (window.__st.manifest().find((e) => e.id === window.__st.props?.regions?.resident?.picture)?.foot) ?? null, size: JSON.stringify(window.__st.props ?? {}).length, objects: window.__st.face.objects(), pictures: window.__st.face.stats.pictures }));
    const d = keep(habitatDepartures(c.log, habitat, namerSpec, c.state, c.cur, c.n, c.open, c.foot)); extra = ` · departures ${d.length} · objects ${c.objects} · pictures ${c.pictures} · props ${c.size} B`;
    for (const m of d.slice(0, 3)) fail(`${name}: ${m}`); if (c.objects > 400) fail(`${name}: ${c.objects} objects (budget 400)`); if (c.pictures > 200) fail(`${name}: ${c.pictures} pictures (budget 200)`); if (c.size > 32 * 1024) fail(`${name}: props ${c.size} B (budget 32 KB)`);
  }
  if (screen === "library") {
    const c = await page.evaluate(() => ({ log: window.__st.check().log, props: window.__st.props, size: JSON.stringify(window.__st.props ?? {}).length, objects: window.__st.face.objects(), pictures: window.__st.face.stats.pictures }));
    const d = keep(c.props?.state === "spread" ? libraryDepartures(c.log, library, c.props, c.props?.focus?.cur) : []); extra = ` · departures ${d.length} · objects ${c.objects} · pictures ${c.pictures} · props ${c.size} B`;
    for (const m of d.slice(0, 3)) fail(`${name}: ${m}`); if (c.objects > 400) fail(`${name}: ${c.objects} objects (budget 400)`); if (c.pictures > 200) fail(`${name}: ${c.pictures} pictures (budget 200)`); if (c.size > 32 * 1024) fail(`${name}: props ${c.size} B (budget 32 KiB)`);
  }
  if (screen === "bench") {
    const c = await page.evaluate(() => ({ log: window.__st.check().log, props: window.__st.props, size: JSON.stringify(window.__st.props ?? {}).length, objects: window.__st.face.objects(), pictures: window.__st.face.stats.pictures }));
    const d = keep(benchDepartures(c.log, benchSpec, c.props, c.props?.focus?.cur)); extra = ` · departures ${d.length} · objects ${c.objects} · pictures ${c.pictures} · props ${c.size} B`;
    for (const m of d.slice(0, 3)) fail(`${name}: ${m}`); if (c.objects > 400) fail(`${name}: ${c.objects} objects (budget 400)`); if (c.pictures > 200) fail(`${name}: ${c.pictures} pictures (budget 200)`); if (c.size > 32 * 1024) fail(`${name}: props ${c.size} B (budget 32 KiB)`);
  }
  if (screen === "idle") {
    const c = await page.evaluate(() => ({ log: window.__st.check().log, size: JSON.stringify(window.__st.props ?? {}).length, objects: window.__st.face.objects(), pictures: window.__st.face.stats.pictures }));
    const d = keep(idleDepartures(c.log, frame)); extra = ` · departures ${d.length} · objects ${c.objects} · pictures ${c.pictures} · props ${c.size} B`;
    for (const m of d.slice(0, 3)) fail(`${name}: ${m}`); if (c.objects > 400) fail(`${name}: ${c.objects} objects (budget 400)`); if (c.pictures > 200) fail(`${name}: ${c.pictures} pictures (budget 200)`); if (c.size > 32 * 1024) fail(`${name}: props ${c.size} B (budget 32 KiB)`);
  }
  if (screen === "cargo") {
    const c = await page.evaluate(() => ({ log: window.__st.check().log, state: window.__st.props?.state, size: JSON.stringify(window.__st.props ?? {}).length, objects: window.__st.face.objects(), pictures: window.__st.face.stats.pictures }));
    const d = keep(cargoDepartures(c.log, cargo, frame, c.state)); extra = ` · departures ${d.length} · objects ${c.objects} · pictures ${c.pictures} · props ${c.size} B`;
    for (const m of d.slice(0, 3)) fail(`${name}: ${m}`); if (c.objects > 400) fail(`${name}: ${c.objects} objects (budget 400)`); if (c.pictures > 200) fail(`${name}: ${c.pictures} pictures (budget 200)`); if (c.size > 32 * 1024) fail(`${name}: props ${c.size} B (budget 32 KiB)`);
  }
  if (screen === "create") {
    const c = await page.evaluate(() => ({ log: window.__st.check().log, state: window.__st.props?.state, rolled: !!window.__st.props?.regions?.roll, size: JSON.stringify(window.__st.props ?? {}).length, objects: window.__st.face.objects(), pictures: window.__st.face.stats.pictures }));
    const d = keep(createDepartures(c.log, create, frame, c.state, null, c.rolled)); extra = ` · departures ${d.length} · objects ${c.objects} · pictures ${c.pictures} · props ${c.size} B`;
    for (const m of d.slice(0, 3)) fail(`${name}: ${m}`); if (c.objects > 400) fail(`${name}: ${c.objects} objects (budget 400)`); if (c.pictures > 200) fail(`${name}: ${c.pictures} pictures (budget 200)`); if (c.size > 32 * 1024) fail(`${name}: props ${c.size} B (budget 32 KiB)`);
  }
  console.log(name.padEnd(34) + " chrome " + String(r.pass1).padStart(8) + " · chrome+art " + String(r.pass2).padStart(8) + ringTxt + extra + (r.errors.length ? " · errors: " + r.errors.join("; ") : "") + (r.refused ? " · refused nodes: " + r.refused : ""));
  if (r.errors.length || r.refused) fail(name + ": " + r.errors.join("; ") + " refused " + r.refused);
  if (r.owed?.length) fail(name + ": shows an owed habit key (" + r.owed.join(", ") + ")");
  if (r.pass1 !== 0) fail(name + ": chrome reads " + r.pass1 + " off-palette pixels"); if (r.pass2 !== 0) fail(name + ": art reads " + r.pass2 + " off-palette pixels");
};
for (const [screen, states] of [["pods", podsStates], ["home", homeStates], ["cargo", cargoStates], ["create", createStates], ["incubator", incubatorStates], ["vivarium", vivariumStates], ["habitat", habitatStates], ["library", libraryStates], ["bench", benchStates], ["idle", idleStates]].filter(([screen]) => !process.env.LAYER_ONLY || process.env.LAYER_ONLY.split(",").includes(screen))) { const { fails } = await states(reading(screen)); failed += fails.length; }   // LAYER_ONLY=cargo,home: only those screens
console.log(failed ? failed + " failure(s)" : "layer check ok"); process.exit(failed ? 1 : 0);
