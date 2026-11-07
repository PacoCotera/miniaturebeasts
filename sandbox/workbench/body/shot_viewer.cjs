// node shot_viewer.cjs viewer.html out.png [mode] [clip] -> screenshot
const { chromium } = require('/home/mb/pw156/node_modules/playwright');
(async () => {
  const [inp, out, mode, clip] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  p.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); }); p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('file://' + inp); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  if (mode) await p.click(`#modes button[data-m="${mode}"]`);
  if (clip) { await p.click(`#clips button:has-text("${clip}")`); await p.waitForTimeout(700); }
  await p.waitForTimeout(500); await p.screenshot({ path: out }); await b.close();
})();
