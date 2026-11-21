// place-walk-1: tiles that sit in no 2 x 2 block of their own terrain, in named cells (the test's loneTiles): node place-walk-lone.mjs <seed> X,Y [X,Y ...]   (set PW_NO_NECK=1 to leave the neck rule off)
globalThis.PW_NO_NECK = !!process.env.PW_NO_NECK;
const { cellTerrain } = await import('../src/gen7/place.mjs');
const seed = +process.argv[2];
for (const a of process.argv.slice(3)) { const [X, Y] = a.split(',').map(Number), c = cellTerrain(seed, X, Y), w = c.w, h = c.h, t = c.terrain, lone = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const v = t[y * w + x]; let ok = false;
    for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) { const p = x + ox, q = y + oy; if (p >= 0 && q >= 0 && p + 1 < w && q + 1 < h && t[q * w + p] === v && t[q * w + p + 1] === v && t[(q + 1) * w + p] === v && t[(q + 1) * w + p + 1] === v) ok = true; }
    if (!ok) lone.push([x - 1, y - 1, v]); }
  console.log(a, JSON.stringify(lone)); }
