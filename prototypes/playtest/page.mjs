// The same walk in the browser build (the Station page, on the existing Playwright tooling: face/tools/station-page.mjs): the page opened with the goldens' fixture save, reduced
// motion and the en-short-1 names, the session clock (clock.mjs) installed before the page's scripts and its animation frame stilled, then stepped by the same driver (driver.mjs)
// on the page's own loop (station/src/core.mjs, the module main.mjs runs). Returns what tools/walk.mjs prints for a headless session.
import { openStation } from "../face/tools/station-page.mjs";
import { installClock, EPOCH } from "./clock.mjs";

export async function pageWalk({ seed = 1, keys = [], epoch = EPOCH } = {}) {
  const init = `(${installClock.toString()})(${JSON.stringify({ seed, epoch })}); window.requestAnimationFrame = () => 0;`;
  const { page, fails, close } = await openStation({ motion: false, init: [init] });
  try {
    const out = await page.evaluate(async (keys) => {
      const core = await import("/sandbox/station/src/core.mjs"), { createDriver } = await import("/sandbox/playtest/driver.mjs"), { clock } = await import("/sandbox/station/src/pixels.mjs");
      const { libraryWaiting } = await import("/sandbox/station/src/pictures.mjs"), { G, UI, FX } = await import("/sandbox/station/src/game.mjs");
      await window.__st.ready;
      const D = createDriver({ core, pixelClock: clock, libraryWaiting, time: window.__playtestClock });
      D.settle({ min: 12 });
      const hashes = [D.hash()], unsettled = [];
      for (const k of keys) { const r = D.press(k); hashes.push(r.hash); if (!r.settled) unsettled.push(hashes.length - 1); }
      return { face: "page", hashes, unsettled, errors: D.errors(), digest: JSON.stringify({ st: G.st, ui: { screen: UI.screen, idle: UI.idle }, msg: FX.msg }), frames: D.frames() };
    }, keys);
    return { ...out, pageFails: fails.slice() };
  } finally { await close(); }
}
