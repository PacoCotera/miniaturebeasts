// A bonded mibi with its heart on the Companion: the roster set as the repo's heart stills did (a bonded Dot, a juvenile Moss), the Companion's own screens
// "mibis" and "active", captured from the screen canvas at 1x as <name>-<phase> (+ sidecar). The world seed is pinned through the address.
// Usage: node shoot-heart.mjs <outdir> <seed> [sp] [name]
import { open, write } from "./capture-lib.mjs";
const [out, seedArg, spArg = "0", name = "partner"] = process.argv.slice(2);
const seed = +seedArg, sp = +spArg;
const { br, page, images, build } = await open({ seed });
await page.waitForTimeout(9000);
const ex = page.frames().find((f) => f.url().includes("exploration"));
await ex.evaluate((sp) => { const S = window.__mb.S; S.turn = 5; S.mibis = [{ id: 1, name: "Dot", sp, born: 0, outings: 1, notches: 0, bonded: true, plays: 3, tends: 3, grownTurn: 2 }, { id: 2, name: "Moss", sp: 0, born: 1, outings: 0, notches: 0, bonded: false, plays: 0, grownTurn: 3 }]; S.carried = [1, 2]; S.lead = 1; }, sp);
for (const ph of ["mibis", "active"]) {
  await ex.evaluate((p) => { const S = window.__mb.S; S.ui = S.ui || {}; S.ui.aId = 1; S.ui.aIdx = 0; S.phase = p; }, ph);
  await page.waitForTimeout(2000);
  const dataUrl = await ex.evaluate(() => window.__mb.capture());
  write({ out, name: `${name}-${ph}`, dataUrl, build, seed, cell: "companion:" + ph, view: "Companion screen " + ph + " (Companion screen canvas, 1x), species " + sp, size: "450x600", script: new URL(import.meta.url).pathname, args: process.argv.slice(2), images });
}
await br.close();
