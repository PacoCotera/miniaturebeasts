// Screenshot an HTML sheet with Playwright (the one in /home/mb/pw156): node shot.mjs sheet.html out.png [width]
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ??= "/home/mb/pw156/browsers";
const require = createRequire("/home/mb/pw156/package.json");
const { chromium } = require("playwright");
const [html, out, w = "1500"] = process.argv.slice(2);
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: Number(w), height: 800 }, deviceScaleFactor: 1 });
await pg.goto(pathToFileURL(path.resolve(html)).href);
await pg.waitForTimeout(300);
await pg.screenshot({ path: out, fullPage: true });
await b.close();
