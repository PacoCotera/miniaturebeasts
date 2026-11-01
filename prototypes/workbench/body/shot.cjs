// node shot.cjs in.html out.png [width]
const { chromium } = require('/home/mb/pw156/node_modules/playwright');
(async () => {
  const [inp, out, w] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +(w || 1600), height: 900 }, deviceScaleFactor: 1 });
  await p.goto('file://' + inp); await p.waitForTimeout(400);
  await p.screenshot({ path: out, fullPage: true }); await b.close();
})();
