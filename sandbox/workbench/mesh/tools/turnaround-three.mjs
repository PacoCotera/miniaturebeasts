// The turnaround in three.js: node turnaround-three.mjs viewer.html outprefix -> prefix-az000.png ... prefix-top.png, prefix-bottom.png (380 x 340, the creature at rest, the camera at the sprite's elevation, perspective 28 degrees), and prefix-wire-<view>.png: parts in colours with the wireframe over them, four views of the legs.
// azimuth 0 is the creature's front, 90 its left side (the glb's frame: +z front, +x left, +y up)
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ??= "/home/mb/pw156/browsers";
const require = createRequire("/home/mb/pw156/package.json");
const { chromium } = require("playwright");
const [html, prefix] = process.argv.slice(2);
const b = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const pg = await b.newPage({ viewport: { width: 380, height: 340 }, deviceScaleFactor: 1 });
await pg.goto(pathToFileURL(path.resolve(html)).href + "#shot");
await pg.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const T = [-0.2, 0.9, -0.3], D = 7.8, pit = (8 * Math.PI) / 180;
const pos = (az, el) => { const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180; return [T[0] + D * Math.sin(a) * Math.cos(e), T[1] + D * Math.sin(e), T[2] + D * Math.cos(a) * Math.cos(e)]; };
const shoot = async (name, p, t = T) => { await pg.evaluate(([p, t]) => window.__cam(p, t), [p, t]); await pg.evaluate(() => window.__pose("stand", 0)); await pg.waitForTimeout(150); await pg.screenshot({ path: `${prefix}-${name}.png` }); };
for (let az = 0; az < 360; az += 45) await shoot(`az${String(az).padStart(3, "0")}`, pos(az, 8));
// above and below: the head toward the top of the picture
await pg.evaluate(() => { window.__camUp = null; });
await shoot("top", [T[0] + 0.001, T[1] + D, T[2] - 0.001]);
await shoot("bottom", [T[0] + 0.001, T[1] - D, T[2] + 0.001]);
await pg.setViewportSize({ width: 560, height: 420 });
await pg.evaluate(() => window.__mode("wire"));
const wv = { "left": [pos(90, 6).map((x, i) => (i === 0 ? T[0] + (x - T[0]) * 0.55 : i === 2 ? T[2] + (x - T[2]) * 0.55 : x)), [T[0], 0.55, T[2]]] };
await shoot("wire-left", [T[0] + 3.3, 1.2, T[2] - 0.2], [T[0], 0.55, T[2] - 0.2]);
await shoot("wire-right", [T[0] - 3.3, 1.2, T[2] - 0.2], [T[0], 0.55, T[2] - 0.2]);
await shoot("wire-front-low", [T[0] + 0.1, 0.5, T[2] + 3.4], [T[0], 0.7, T[2]]);
await shoot("wire-below", [T[0] + 0.3, -3.6, T[2] + 0.7], [T[0], 0.4, T[2] - 0.1]);
await b.close();
