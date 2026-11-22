// crop and enlarge a still with hard pixels: node w4r2-zoom.mjs IN OUT x0 y0 w h scale   (PW_DIR as for the stills)
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR || "/home/mb/mb/wt-cishard-tmp", "node_modules/playwright"));
const [inp, outp, x0, y0, w, h, k] = [process.argv[2], process.argv[3], ...process.argv.slice(4, 9).map(Number)];
const b = await chromium.launch(), page = await b.newPage({ viewport: { width: w * k, height: h * k } });
const src = "data:image/png;base64," + readFileSync(inp).toString("base64");
await page.setContent(`<body style="margin:0"><div style="width:${w * k}px;height:${h * k}px;overflow:hidden;position:relative"><img src="${src}" style="position:absolute;left:${-x0 * k}px;top:${-y0 * k}px;image-rendering:pixelated;width:auto;transform-origin:0 0;transform:scale(${k})"></div></body>`);
await page.waitForTimeout(300); await page.screenshot({ path: outp }); await b.close();
