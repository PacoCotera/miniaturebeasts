// Composes proof pictures: node proof.cjs JOBS.json -- [{html, png, w, h}] -> one PNG per job, from one browser start. Playwright is the one on the VM (PLAYWRIGHT_BROWSERS_PATH=/home/mb/pw156/browsers).
const { chromium } = require('/home/mb/pw156/node_modules/playwright')
const fs = require('fs')
;(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: jobs[0]?.w ?? 608, height: jobs[0]?.h ?? 624 }, deviceScaleFactor: 1 })
  for (const j of jobs) {
    await p.setViewportSize({ width: j.w, height: j.h })
    await p.goto('file://' + j.html)
    await p.evaluate(() => document.fonts.ready)
    await p.screenshot({ path: j.png })
  }
  await b.close()
})()
