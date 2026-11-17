// The walk on the map: open the play page with a pinned seed, set out on expedition 1, take the map steps, go in to the place, take the place steps; the Companion's screen canvas at 1x.
// Usage: node shoot-walk.mjs <outdir> <seed> <mapSteps "right,down,..."> <placeSteps "up,right,..."> [name]
// Every place step is saved as <name>-<n> (+ sidecar); the one to ship is chosen by eye and the same command replays it.
import { open, write, drawn } from "./capture-lib.mjs";
const [out, seedArg, mapArg, inArg, name = "expedition"] = process.argv.slice(2);
const seed = +seedArg;
const { br, page, images, build } = await open({ seed });
await page.waitForTimeout(9000);
const ex = page.frames().find((f) => f.url().includes("exploration"));
const tap = async (k, hold = 160) => { await ex.evaluate((key) => window.__mb.press(key), k); await page.waitForTimeout(hold); await ex.evaluate((key) => window.__mb.release && window.__mb.release(key), k); await page.waitForTimeout(700); };
const state = () => ex.evaluate(() => ({ phase: window.__mb.S.phase, pos: window.__mb.S.exp && window.__mb.S.exp.pos, seed: window.__mb.S.seed, turn: window.__mb.S.turn }));
const first = await state();
console.log("start", JSON.stringify(first));
if (first.seed !== seed) { console.log("SEED NOT PINNED", first.seed); await br.close(); process.exit(2); }
for (const k of ["ok", "confirm", "a"]) { if ((await state()).phase !== "setup") break; await tap(k, 120); }
await page.waitForTimeout(3000);
await tap("confirm", 120);
for (let t = 0; t < 30 && (await state()).phase === "place"; t++) await page.waitForTimeout(1000);
await page.waitForTimeout(8000);
console.log("set out", JSON.stringify(await state()));
for (const s of mapArg.split(",").filter(Boolean)) await tap(s);
await page.waitForTimeout(1500);
await tap("confirm", 120);
await page.waitForTimeout(6000);
let j = 0;
const shoot = async () => { const dataUrl = await ex.evaluate(() => window.__mb.capture()); const st = await state(); write({ out, name: `${name}-${j}`, dataUrl, build, seed, cell: String(st.pos), view: "place (Companion screen canvas, 1x)", size: "450x600", script: new URL(import.meta.url).pathname, args: process.argv.slice(2), images: await drawn(page, images, "exploration") }); };
await shoot();
for (const s of inArg.split(",").filter(Boolean)) { await tap(s); j++; await shoot(); }
await br.close();
