import { chromium } from "/home/mb/pw156/node_modules/playwright/index.mjs";
const url = "http://127.0.0.1:8765/prototypes/exploration/index.html?embed";
const out = "/home/mb/mb/wt-embed-text-wrap-1/tools/credit-runner/runs/embed-text-wrap-1/stills/";
const b = await chromium.launch();
for (const [w, h] of [[390, 844], [844, 390]]) {
  for (const when of ["before", "after"]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.goto(url);
    await p.waitForTimeout(2500);
    if (when === "before") await p.evaluate(() => document.documentElement.style.setProperty("--embed-s", "1"));
    await p.waitForTimeout(300);
    await p.screenshot({ path: out + w + "x" + h + "-" + when + ".png" });
    await ctx.close();
  }
}
await b.close();
