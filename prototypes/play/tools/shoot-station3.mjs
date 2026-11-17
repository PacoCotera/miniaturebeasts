// The Station with pods on the play page, reached as the repo's play journey does: crates seeded with __st.seedCrate (fixed kinds and seeds), then the real Dock key,
// then the key presses; the Station's screen canvas at 1x, saved after each press as <name>-<n> (+ sidecar). The world seed is pinned through the address.
// Usage: node shoot-station3.mjs <outdir> <seed> [crates] [presses "confirm,confirm,confirm"] [name]
import { open, write } from "./capture-lib.mjs";
const [out, seedArg, nArg = "4", pressArg = "confirm,confirm,confirm", name = "station"] = process.argv.slice(2);
const seed = +seedArg;
const { br, page, images, build } = await open({ seed });
await page.waitForTimeout(9000);
const st = () => page.frames().find((f) => f.url().includes("station"));
console.log("ready", await st().evaluate(async () => { try { await window.__st.ready; return "ok"; } catch (e) { return e.message; } }));
await page.waitForTimeout(1000);
const ids = await st().evaluate(() => window.__st.frameIds());
const KINDS = ids.slice(0, 6), n = +nArg;
console.log("kinds", JSON.stringify(KINDS));
for (let i = 0; i < n; i++) { await st().evaluate(([k, s]) => window.__st.seedCrate(k, 2, s), [KINDS[i % KINDS.length], 4101 + i * 17]); await page.waitForTimeout(500); }
await page.click("#dockKey");
await page.waitForFunction(() => window.__play.owner === "station", null, { timeout: 8000 }).catch(() => console.log("no switch to station"));
await page.waitForTimeout(8000);
const press = async (k) => { await st().evaluate((key) => { window.__st.press(key); }, k); await page.waitForTimeout(150); await st().evaluate((key) => window.__st.release(key), k); await page.waitForTimeout(1800); };
let j = 0;
for (const k of pressArg.split(",").filter(Boolean)) {
  await press(k); j++;
  const dataUrl = await st().evaluate(() => window.__st.capture());
  const screen = await st().evaluate(() => window.__st.UI && window.__st.UI.screen);
  write({ out, name: `${name}-${j}`, dataUrl, build, seed, cell: "station:" + screen, view: "Station screen (Station screen canvas, 1x), crates " + n, size: "1024x600", script: new URL(import.meta.url).pathname, args: process.argv.slice(2), images });
}
await br.close();
