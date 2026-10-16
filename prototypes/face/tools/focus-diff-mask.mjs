#!/usr/bin/env node
// The focus-only delta check (fix 14, the creative director's gate conditions, spec §14.1): for each golden the fix changes, the head without fix 14 (before) against the head with it (after), every differing pixel inside the band the
// ring may change, or the golden is re-gated whole. Two steps, so the two heads can be two checkouts of the same build:
//   save the states of one head:    PW_DIR=… node prototypes/face/tools/focus-diff-mask.mjs --save <dir> [pods home …]     (a PNG a state and states.json: its screen, focus target and the focus region's rect, from the test-mode region log)
//   compare two saves:              node prototypes/face/tools/focus-diff-mask.mjs --before <dir> --after <dir> [--out prototypes/station/img/fix14]
// The expected band is the new ring rasterised by the oracle (ui/rings.mjs focusRingOps) at the after head's ring rect, joined with the old ring rasterised the same way at the before head's ring rect (fix 14 also removes it, and a creature's
// old feet ring lies away from its new footprint), each dilated by 1 px. Writes <out>/diff/<state>.png (the differing pixels) and <out>/verdicts.json: `ring-only`, or `content changed` with the box of the offending pixels. Exit 1 when a state is
// `content changed` without a reason in <out>/reasons.json (state → reason; an entry needs UI/UX and the Station lead; a listed reason does not make it `ring-only`: it re-gates whole), or when the states that differ are not §10's. Prints the report
// the builder pastes into the gate note: per screen, the `ring-only` and the `re-gate whole` states.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { decodePNG, encodePNG } from "../../ui/png.mjs";
import { ringMask, tabRingMask, focusRingOps, ringRaster } from "../../ui/rings.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), station = path.resolve(here, "../../ui/specs/station");
const frame = JSON.parse(readFileSync(path.join(station, "frame.json"), "utf8")), T = frame.focus.ring, tabTop = frame.regions.rail.y;
import { tmpdir } from "node:os";
import { mkdtempSync, copyFileSync } from "node:fs";
import { FLOOR_SCENES, zoneRange, floorThresholds } from "../../ui/rings.mjs";
const slug = (n) => n.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };

// §10: the goldens fix 14 changes, 80 of 138
const home14 = ["cargo-empty", "incubator-empty", "incubator-growing", "incubator-ready", "probe-docked", "probe-away", "probe-sitting", "library-empty", "library-pages", "vivarium-focused", "knob-focused", "resident-focused", "sleeper-focused", "moving-asleep"].map((n) => "home-" + n);
const viv14 = ["docked", "away", "mibi-out", "tile", "sleeper", "twelve", "docked-dawn", "docked-day", "docked-dusk", "docked-night", "walk-8000ms", "moving-8000ms"].map((n) => "vivarium-" + n);
const create14 = ["shape", "shape-changed", "shape-clash", "shape-doing", "shape-onelook", "shape-short", "shape-busy", "shape-first", "roll-100", "grow", "grow-150", "grow-end"].map((n) => "create-" + n);
export const EXPECTED = { home: home14, vivarium: viv14, create: create14, library: ["library-spread", "library-spread-empty", "library-spread-complete"], bench: ["bench", "bench-armed", "bench-away", "bench-tier2"] };   // Habitat and Pods: all of theirs

// ---- the band the ring may change: the old ring (the forms of the head before) and the new one (focusRingOps), each grown by one pixel ----
function oldRing(screen, cur, r) {
  const [x, y, w, h] = r, m = new Map(), put = (mask, mw, mh, ox, oy) => { for (let j = 0; j < mh; j++) for (let i = 0; i < mw; i++) if (mask[j * mw + i]) m.set((oy + j) * 1024 + ox + i, 1); };
  if (/^resident\./.test(cur) || cur === "resident") put(ringMask(w, h, 2, 0, "ellipse"), w, h, x, y);   // the feet ellipse
  else if (/^(place|kin)\./.test(cur)) put(ringMask(w, h, 2, 0, "ellipse"), w, h, x, y);              // a circle
  else if (/^rail\./.test(cur)) { const body = w - 24, t = tabRingMask(body, { tab: { slant: 16, outside: 4, top: 42, slantTo: 80, bottom: 84, radiusBottom: 6 }, width: 2, tabTop }); put(t.mask, t.w, t.h, x, y); }
  else put(ringMask(w, h, 2, 6), w, h, x, y);                                                         // the round rectangle, radius 6, width 2
  return m;
}
const grow1 = (set) => { const out = new Set(); for (const k of set.keys ? set.keys() : set) { const x = k % 1024, y = (k - x) / 1024; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.add((y + dy) * 1024 + x + dx); } return out; };
// a rect ring of radius r in a box: the band, found from the box (radius 6 for plates and wells, 0 for squares: the union of both is a superset, so the check stays honest)
function newBand(screen, cur, r) {
  const [x, y, w, h] = r, set = new Set();
  const add = (roles, ox, oy, rw, rh) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) if (roles[j * rw + i]) set.add((oy + j) * 1024 + ox + i); };
  if (/^rail\./.test(cur)) { const ring = focusRingOps("tab", [x + 5, 40, w - 26, 40], T, { tabTop }); add(ringRaster(ring), ring.x, ring.y, ring.w, ring.h); return set; }
  if (/^(place|kin)\./.test(cur) || cur === "pod" || /^resident/.test(cur)) { const ring = focusRingOps("oval", [x + 5, y + 5, w - 10, h - 10], T); add(ringRaster(ring), ring.x, ring.y, ring.w, ring.h); return set; }
  for (const rad of [0, 6]) { let ring; try { ring = focusRingOps({ rect: rad }, [x + 5, y + 5, w - 10, h - 10], T, { ground: screen === "library" ? "paper" : "default" }); } catch { continue; } add(ringRaster(ring), ring.x, ring.y, ring.w, ring.h); }   // a radius the box is too small for is not drawn
  return set;
}

// ---- save: the states of this head ----
async function save(dir, only, withCaptureStates = false) {
  const { podsStates } = await import("./pods-states.mjs"), { homeStates } = await import("./home-states.mjs"), { cargoStates } = await import("./cargo-states.mjs"), { idleStates } = await import("./idle-states.mjs"), { createStates } = await import("./create-states.mjs");
  const { incubatorStates } = await import("./incubator-states.mjs"), { vivariumStates } = await import("./vivarium-states.mjs"), { habitatStates } = await import("./habitat-states.mjs"), { libraryStates } = await import("./library-states.mjs"), { benchStates } = await import("./bench-states.mjs");
  const SCREENS = { pods: podsStates, home: homeStates, cargo: cargoStates, create: createStates, incubator: incubatorStates, habitat: habitatStates, vivarium: vivariumStates, library: libraryStates, bench: benchStates, idle: idleStates };
  mkdirSync(dir, { recursive: true }); const info = {}; let failed = 0;
  for (const [screen, states] of Object.entries(SCREENS)) {
    if (only.length && !only.includes(screen)) continue;
    const { fails } = await states(async (name, page, fail, opts) => {
      if (opts?.captureOnly && !withCaptureStates) return;
      const a = await page.evaluate(() => window.__st.snapshot({ capture: true })), c = await page.evaluate(() => { const p = window.__st.props, r = window.__st.check().log.regions.find((q) => q.id === "focus" && q.layer === "chrome"); return { cur: (p?.overlay ? p.overlay.focus?.cur : p?.focus?.cur) ?? null, screen: p?.screen ?? null, rect: r?.rect ?? null }; });
      if (a.errors.length || a.refused) fail(name + ": errors " + a.errors.join("; "));
      writeFileSync(path.join(dir, slug(name) + ".png"), Buffer.from(a.png.split(",")[1], "base64")); info[name] = { screen, cur: c.cur, rect: c.rect, hash: a.hash };
    });
    failed += fails.length;
  }
  writeFileSync(path.join(dir, "states.json"), JSON.stringify(info, null, 1) + "\n"); console.log(`saved ${Object.keys(info).length} states to ${dir}`); return failed;
}

// ---- compare ----
function compare(beforeDir, afterDir, out) {
  const B = JSON.parse(readFileSync(path.join(beforeDir, "states.json"), "utf8")), A = JSON.parse(readFileSync(path.join(afterDir, "states.json"), "utf8"));
  const reasonsFile = path.join(out, "reasons.json"), reasons = existsSync(reasonsFile) ? JSON.parse(readFileSync(reasonsFile, "utf8")) : {};
  mkdirSync(path.join(out, "diff"), { recursive: true });
  const verdicts = {}, report = {}; let bad = 0;
  const wanted = new Set([...Object.values(EXPECTED).flat(), ...Object.keys(A).filter((n) => A[n].screen === "habitat" || A[n].screen === "pods")]);   // Habitat's and Pods' goldens all change
  for (const name of Object.keys(A)) {
    if (!B[name]) { console.error(`${name}: not in the before save`); bad++; continue; }
    const pa = decodePNG(readFileSync(path.join(afterDir, slug(name) + ".png"))), pb = decodePNG(readFileSync(path.join(beforeDir, slug(name) + ".png"))), w = pa.width, h = pa.height;
    const diff = []; for (let i = 0; i < w * h; i++) { const o = 4 * i; if (pa.data[o] !== pb.data[o] || pa.data[o + 1] !== pb.data[o + 1] || pa.data[o + 2] !== pb.data[o + 2]) diff.push(i); }
    const screen = A[name].screen, cur = A[name].cur ?? "";
    if (!diff.length) { if (wanted.has(name)) console.error(`${name}: expected to change (§10) and did not`); continue; }
    if (!wanted.has(name)) { console.error(`${name}: changed, and §10 does not list it: a departure`); bad++; }
    const band = new Set();
    if (A[name].rect) for (const k of newBand(screen, cur, A[name].rect)) band.add(k);
    if (B[name].rect) for (const k of oldRing(screen, B[name].cur ?? cur, B[name].rect).keys()) band.add(k);
    const wide = grow1(band), off = diff.filter((i) => !wide.has(i)), m = new Uint8Array(w * h * 4);
    for (const i of diff) { const o = 4 * i; m[o] = 255; m[o + 3] = 255; } for (const i of off) { const o = 4 * i; m[o] = 255; m[o + 1] = 255; m[o + 2] = 0; m[o + 3] = 255; }
    writeFileSync(path.join(out, "diff", slug(name) + ".png"), encodePNG(w, h, m));
    if (!off.length) verdicts[name] = { verdict: "ring-only", differing: diff.length };
    else { let x0 = w, y0 = h, x1 = 0, y1 = 0; for (const i of off) { const x = i % w, y = (i - x) / w; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } verdicts[name] = { verdict: "content changed", box: [x0, y0, x1 - x0 + 1, y1 - y0 + 1], offending: off.length, differing: diff.length, ...(reasons[name] ? { reason: reasons[name] } : {}) }; if (!reasons[name]) bad++; }
    (report[screen] ??= { "ring-only": [], "re-gate whole": [] })[verdicts[name].verdict === "ring-only" ? "ring-only" : "re-gate whole"].push(name);
  }
  writeFileSync(path.join(out, "verdicts.json"), JSON.stringify(verdicts, null, 1) + "\n");
  for (const [s, r] of Object.entries(report)) console.log(`${s}: ${r["ring-only"].length} ring-only, ${r["re-gate whole"].length} re-gate whole${r["re-gate whole"].length ? " (" + r["re-gate whole"].join(", ") + ")" : ""}`);
  console.log(`${Object.keys(verdicts).length} changed states; ${bad ? bad + " unlisted failure(s)" : "every one ring-only or listed with a reason"}`);
  return bad ? 1 : 0;
}

// ---- the capture list (spec §14.2): whole 1x frames at the after head, the focus on the main target of each screen and on every painted creature; the README lists each frame, its state and its target ----
const LIGHTS = ["dawn", "day", "dusk", "night"];
const CAPTURES = [
  ["home-cargo-empty", "Home", "cargo", "{ rect: 6 }, (683, 41, 330, 98)"], ["home-resident-focused", "Home, painted creature", "resident.<id>", "footprint"], ["home-sleeper-focused", "Home, painted creature", "the sleeper on the bed", "footprint (the nap's curl)"],
  ...LIGHTS.map((l) => ["vivarium-resident-focused-" + l, "Vivarium, painted creature", "a juvenile resident", l === "night" ? "footprint, default weight (night is pinned): the CD's frame" : "footprint"]),
  ["habitat-door", "Habitat", "door", "{ rect: 6 }"], ...LIGHTS.map((l) => ["habitat-resident-focused-" + l, "Habitat up close, painted creature", "resident (the close picture)", l === "night" ? "footprint, default weight (night is pinned)" : "footprint"]),
  ["habitat-namer", "Habitat, namer", "act.done (the namer's focus)", "{ rect: 0 }"], ["create-shape", "Create", "roll", "{ rect: 0 }"],
  ["overview-identified-pod-focused", "Pods", "pod", "oval"], ["collection", "Pods", "place.<i>", "circle r 93"], ["chapter-page", "Pods", "rail.<i>", "tab"], ["bench", "Probe", "plates", "{ rect: 0 }, the drawn union"], ["library-spread", "Library", "frame.<i>", "{ rect: 0 }, paper (rust, no keys)"],
  ["cargo-bay", "Cargo", "the room", "none: room-only focus; captured to show no ring was added"], ["incubator-growing", "Incubator, painted creature (juvenile)", "the room", "none: room-only focus, no creature target; captured to show no ring was added"], ["idle-docked", "Idle, painted creature", "the room", "none: room-only focus, no creature target; captured to show no ring was added"]];
async function writeCaptures(out, tmp) {
  mkdirSync(out, { recursive: true }); const info = JSON.parse(readFileSync(path.join(tmp, "states.json"), "utf8")), bySlug = Object.fromEntries(Object.keys(info).map((n) => [slug(n), n])), rows = [];
  const masters = JSON.parse(readFileSync(path.resolve(here, "../../ui/assets/masters/index.json"), "utf8")).masters, weight = T.shapes.footprint.weight;
  for (const [key, screen, target, ring] of CAPTURES) {
    const name = Object.keys(info).find((n) => slug(n) === key || slug(n) === "pods-" + key || slug(n) === slug(key)) ?? bySlug[key]; if (!name) { console.error("no state for " + key); continue; }
    const file = slug(name) + ".png"; copyFileSync(path.join(tmp, file), path.join(out, file));
    const light = LIGHTS.find((l) => key.endsWith("-" + l)); let f1 = "";
    if (light) { const sc = FLOOR_SCENES[/^vivarium/.test(key) ? 0 : 1], m = masters[sc.file(light)], r = zoneRange(readFileSync(path.resolve(here, "../../ui/assets/masters", m.file)), sc); f1 = `${light}, weight ${weight[light]}, ground ${r.darkest.toFixed(3)} to ${r.brightest.toFixed(3)} in the ring zone`; }
    rows.push(`| ${file} | ${name} | ${screen} | ${target} | ${ring} | ${f1} |`);
  }
  const { keyFrom, coreTo } = floorThresholds(JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")));
  writeFileSync(path.join(out, "README.md"), [
    "# Fix 14, the focus-only delta check: the capture list (spec §14.2)", "",
    "Whole 1× frames (1024×600) at the after head, taken by `node prototypes/face/tools/focus-diff-mask.mjs --captures prototypes/station/img/fix14` (the states are the goldens' own, and the eight light states beside them, which are captures and layer-check states, not goldens).",
    "One frame per screen with the focus on its main target, and every painted creature with focus. `verdicts.json` and `diff/` are the diff mask's (`--before`, `--after`); `reasons.json` lists the states that re-gate whole and why.", "",
    "| Frame | State | Screen | Focus target | Ring | Light, weight, ground (the 2 px floor) |", "| --- | --- | --- | --- | --- | --- |", ...rows, "",
    `The ground range is the darkest and brightest luminance in the footprint ring's zone in that light, the stand-in shadow composited as the worst case. A key band reaches 3:1 on ground from ${keyFrom.toFixed(4)} up, the core on ground up to ${coreTo.toFixed(4)} (frame.json focus.ring.shapes.footprint.floor). A frame is judged on the whole 1× screen by the creative director; UI/UX signs every painted-creature frame first.`, ""].join("\n"));
  console.log(`${rows.length} frames in ${out}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rest = process.argv.slice(2).filter((a) => !a.startsWith("--") && ![arg("--save"), arg("--captures")].includes(a));
  if (arg("--save")) process.exit((await save(arg("--save"), rest)) ? 1 : 0);
  else if (arg("--captures")) { const tmp = mkdtempSync(path.join(tmpdir(), "fix14-")), failed = await save(tmp, rest, true); await writeCaptures(arg("--captures"), tmp); process.exit(failed ? 1 : 0); }
  else if (arg("--before") && arg("--after")) process.exit(compare(arg("--before"), arg("--after"), arg("--out") ?? path.resolve(here, "../../station/img/fix14")));
  else { console.error("usage: focus-diff-mask.mjs --save <dir> [screens…] | --captures <dir> | --before <dir> --after <dir> [--out <dir>]"); process.exit(2); }
}
export { compare, newBand, oldRing, grow1 };
