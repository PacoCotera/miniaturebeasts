#!/usr/bin/env node
// The Library's render times on the Station page (the Library 2 gate's F5, the Library 3 gate's P3 and P5), printed: Level 1's cold open with all sixteen species found and no cell made (the time to its first frame, then each cell
// swapped in as it is made and the total), Level 2's cold open of a found species whose sheet is not made (the first frame on the quiet stand-in, then the sheet's swap-in), the lit request (✓ Show: the lit variant's and the page's
// swap-ins) and the one-time paper (made at the boot idle). The pictures are made by the page's own warm ticks, as in play. The first frames are held to 300 ms here (about a Pi 4's 1 s at its 3-4 times); the Pi 4 run is a
// separate measurement this tool also serves. The Level 2 open takes a species other than the one Level 1's ring rests on, whose sheet is made ahead (P2).   node prototypes/station/tools/library-times.mjs
import { openStation } from "../../face/tools/station-page.mjs";
import { WORLD } from "../../face/tools/home-states.mjs";

const FIRST_MS = 300;
const { page, fails, fail, close } = await openStation({ motion: false });
const logs = []; let lastWork = Date.now(); page.on("console", (m) => { const t = m.text(); if (/^# /.test(t)) lastWork = Date.now(); if (/^# library|^# face/.test(t)) logs.push(t); });
const quiet = async (ms = 1500) => { for (let i = 0; i < 60 && Date.now() - lastWork < ms; i++) await page.waitForTimeout(250); };   // no picture made for `ms`: the warm ticks are idle
let bad = 0;
try {
  await page.evaluate((src) => { window.__world = eval(src)(); }, `(${WORLD.toString()})`);
  await page.waitForFunction(() => !window.__st.libraryWaiting().length, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(500); await quiet();   // the boot idle: the paper is made once the first frames are out
  // one frame after a change: the time from the change to the end of the next animation frame (the props built, the pictures they name sent, the face's frame drawn)
  // and what that frame's props showed: the sheet, the page and the verb (read in the same task, before a warm tick can make a picture)
  const frameAfter = (fn) => page.evaluate(async (src) => { const t0 = performance.now(); eval(`(${src})`)(); await new Promise((r) => requestAnimationFrame(r)); const p = window.__st.props; return { ms: performance.now() - t0, sheet: p?.regions?.sheet?.picture ?? "", page: p?.regions?.page?.picture ?? "", ok: p?.frame?.line?.ok ?? null }; }, fn.toString());   // the page's frame callback runs first in the frame
  const until = (test, ms = 60000) => page.evaluate(async ([src, ms]) => { const t0 = performance.now(), f = eval(`(${src})`); while (!f()) { if (performance.now() - t0 > ms) return -1; await new Promise((r) => setTimeout(r, 10)); } return performance.now() - t0; }, [test.toString(), ms]);
  await page.evaluate(() => { const w = window.__world, S = window.__st; w.reset(); const st = S.ST; st.knownIds = S.frameIds(); st.metIds = []; st.guide = {}; st.readOnce = {}; st.wish = {}; st.face = {}; for (const id of S.frameIds()) S.fillGuide(id, 0.5); st.libSeen = JSON.parse(JSON.stringify(st.guide)); S.UI.idle = false; S.UI.lib.l1 = "S09"; S.settings.light = "day"; });
  await page.waitForTimeout(500); await quiet();   // the world set changed every species' sheet and Home's specimen: what is made ahead of the open (P2) is made first, so the open is measured on a quiet page
  const l1 = (await frameAfter(() => { window.__st.UI.lastInput = performance.now(); window.__st.goto("library"); })).ms;   // the input clock set as a key press sets it (main.mjs act): no render ahead runs into the measured frame
  const cells = await until(() => { const p = window.__st.props; return p?.screen === "library" && p.regions.cells.every((c) => c.picture); });
  console.log(`# Level 1 cold open, 16 found, no cell made: first frame in ${l1.toFixed(0)} ms (held to ${FIRST_MS} ms here); every cell swapped in ${cells.toFixed(0)} ms after it`);
  if (!(l1 <= FIRST_MS)) { bad++; fail(`Level 1's first frame took ${l1.toFixed(0)} ms`); } if (cells < 0) { bad++; fail("Level 1's cells never all landed"); }
  await page.evaluate(() => window.__st.libraryWarm()); await quiet();
  const f2 = await frameAfter(() => { window.__st.UI.lastInput = performance.now(); window.__st.intent({ screen: "library", target: "cell.S03", verb: "confirm" }); }), l2 = f2.ms, first = f2.sheet;   // not the species Level 1's ring rests on (S09), whose sheet is made ahead
  const sheet = await until(() => /^library-sheet-S03-[0-9a-f]{8}$/.test(window.__st.props?.regions?.sheet?.picture ?? ""));
  console.log(`# Level 2 cold open (the Tuikis, its sheet not made): first frame in ${l2.toFixed(0)} ms on ${first} (held to ${FIRST_MS} ms here)`);
  if (!(l2 <= FIRST_MS) || !/^library-quiet-S03-/.test(first)) { bad++; fail(`Level 2's first frame took ${l2.toFixed(0)} ms on ${first}`); } if (sheet < 0) { bad++; fail("the sheet never landed"); }
  const f3 = await frameAfter(() => window.__st.intent({ screen: "library.species", target: "chapter.coat", verb: "confirm" })), lit = f3.ms, named = f3.ok;
  console.log(`# the lit request's first frame: the sheet ${f3.sheet}, the page "${f3.page}"`);
  const variant = await until(() => /-lit-coat$/.test(window.__st.props?.regions?.sheet?.picture ?? "")), pageIn = await until(() => !!window.__st.props?.regions?.page?.picture);
  console.log(`# the lit request (✓ Show Coat): "${named}" named in ${lit.toFixed(0)} ms on its first frame (over 3 s on a Pi 4, the lit swap-in's next step is the bloom at 1x: the art director's)`);
  if (variant < 0 || pageIn < 0) { bad++; fail("the lit variant or the page never landed"); } if (!(lit <= FIRST_MS) || !/^Clear /.test(named ?? "")) { bad++; fail(`the lit request's verb: ${named} in ${lit.toFixed(0)} ms`); }
  const asked = (re) => { const l = logs.find((x) => /^# library swap-in /.test(x) && re.test(x)), m = l && l.match(/made in (\d+) ms, (\d+) ms after it was asked/); return m ? `made in ${m[1]} ms, swapped in ${m[2]} ms after it was asked` : "not found"; };
  console.log(`# the swap-ins, from the page's own warm ticks: the Tuikis sheet ${asked(/library-sheet-S03-[0-9a-f]{8}:/)}; its Coat's lit variant ${asked(/-lit-coat:/)}; its page ${asked(/library-page-S03-coat-/)}`);
  for (const t of logs) console.log(t);
  const errs = await page.evaluate(() => [...window.__st.renderErrors, ...window.__st.faceErrors]); if (errs.length) { bad++; fail("errors: " + errs.slice(0, 3).join(" | ")); }
} finally { await close(); }
console.log(bad || fails.length ? "library times: " + (bad + fails.length) + " failure(s)" : "library times ok");
process.exit(bad || fails.length ? 1 : 0);
