// Rasterize an SVG at its own pixel size with headless Chromium (Playwright, pre-installed).
//   node render-svg.cjs in.svg out.png [scale]
const { chromium } = require("playwright");
const fs = require("fs");
const [svgPath, outPath, scaleArg] = process.argv.slice(2);
const scale = Number(scaleArg || 1);
(async () => {
  const svg = fs.readFileSync(svgPath, "utf8");
  const m = svg.match(/width="(\d+)" height="(\d+)"/);
  const W = Number(m[1]), H = Number(m[2]);
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" + (fs.existsSync("/opt/pw-browsers/chromium/chrome") ? "/chrome" : "") });
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
  await p.setContent(`<html><body style="margin:0;background:#fff">${svg}</body></html>`);
  await p.screenshot({ path: outPath, clip: { x: 0, y: 0, width: W, height: H } });
  await b.close();
  console.log(`${outPath}: ${W * scale}x${H * scale}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
