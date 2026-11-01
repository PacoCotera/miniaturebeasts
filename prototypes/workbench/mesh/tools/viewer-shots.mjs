// Frames of the viewer: node viewer-shots.mjs viewer.html outprefix  -> prefix-rest.png, -breathe.png, -blink.png, -walk.png (+ info json on stdout)
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ??= "/home/mb/pw156/browsers";
const require = createRequire("/home/mb/pw156/package.json");
const { chromium } = require("playwright");
const [html, prefix] = process.argv.slice(2);
const b = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const pg = await b.newPage({ viewport: { width: 480, height: 480 }, deviceScaleFactor: Number(process.env.DSF || 1) });
pg.on("console", (m) => { if (m.type() === "error") console.log("console error:", m.text()); });
await pg.goto(pathToFileURL(path.resolve(html)).href + "#shot");
await pg.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
console.log(JSON.stringify(await pg.evaluate(() => window.__info)));
for (const [name, clip, t] of [["rest", "stand", 0], ["breathe", "breathe", 1.5], ["blink", "blink", 0.104], ["walk", "walk", 0.25], ["walk2", "walk", 0.75]]) {
  await pg.evaluate(([c, t]) => window.__pose(c, t), [clip, t]);
  await pg.waitForTimeout(150);
  await pg.screenshot({ path: `${prefix}-${name}.png` });
}
// the face, rest and blink, close
await pg.evaluate(() => window.__cam([1.9, 1.9, 2.9], [0.15, 1.45, 0.55]));
for (const [name, clip, t] of [["face-rest", "stand", 0], ["face-blink", "blink", 0.104]]) {
  await pg.evaluate(([c, t]) => window.__pose(c, t), [clip, t]); await pg.waitForTimeout(150);
  await pg.screenshot({ path: `${prefix}-${name}.png` });
}
await b.close();
