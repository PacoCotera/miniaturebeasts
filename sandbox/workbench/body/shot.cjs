// node shot.cjs in.html out.png [width] [height]   (the page is shot whole; a small height makes the picture exactly as tall as the page, a large one pads a short page to at least that)
const { chromium } = require('/home/mb/pw156/node_modules/playwright');
(async () => {
  const [inp, out, w, h] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +(w || 1600), height: +(h || 900) }, deviceScaleFactor: 1 });
  await p.goto('file://' + inp); await p.waitForTimeout(400);
  await p.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 30000 }).catch(() => {});
  await p.screenshot({ path: out, fullPage: true }); await b.close();
})();
