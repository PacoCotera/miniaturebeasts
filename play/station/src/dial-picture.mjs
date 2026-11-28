// The reading dial's picture (the pod picker's mark): a 14 x 14 ring (r 6.5, 1 px, mist) with a pie (r 5, fog) filled clockwise from twelve o'clock to n / m, drawn anti-aliased;
// while a sealed chapter is shut, the 8 x 10 lock (1-bit, fog) 3 px after it, vertically centred, as one picture 25 x 14. Build-drawn from this geometry: no art-desk asset.
export const DIAL = { size: 14, ring: 6.5, pie: 5, lockGap: 3, lock: [8, 10], mist: [0x8d, 0x8a, 0xa6], fog: [0xc6, 0xc4, 0xd8] };
export const LOCK = ["..####..", ".#....#.", ".#....#.", ".#....#.", "########", "########", "###..###", "###..###", "########", "########"];
export const dialSize = (sealed) => [DIAL.size + (sealed ? DIAL.lockGap + DIAL.lock[0] : 0), DIAL.size];
const SS = 4;
export function dialPixels(n, m, sealed) {
  const [w, h] = dialSize(sealed), rgba = new Uint8ClampedArray(w * h * 4), c = DIAL.size / 2, frac = m > 0 ? Math.min(1, Math.max(0, n / m)) : 0;
  const put = (x, y, col, a) => { if (a <= 0) return; const i = (y * w + x) * 4, a0 = rgba[i + 3] / 255, ao = a + a0 * (1 - a); for (let k = 0; k < 3; k++) rgba[i + k] = Math.round((col[k] * a + rgba[i + k] * a0 * (1 - a)) / ao); rgba[i + 3] = Math.round(ao * 255); };
  for (let y = 0; y < DIAL.size; y++) for (let x = 0; x < DIAL.size; x++) {
    let ring = 0, pie = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const px = x + (sx + 0.5) / SS - c, py = y + (sy + 0.5) / SS - c, d = Math.hypot(px, py);
      if (d <= DIAL.ring + 0.5 && d >= DIAL.ring - 0.5) ring++;
      if (frac > 0 && d <= DIAL.pie) { const a = (Math.atan2(px, -py) + 2 * Math.PI) % (2 * Math.PI); if (frac >= 1 || a < frac * 2 * Math.PI) pie++; }
    }
    put(x, y, DIAL.mist, ring / (SS * SS)); put(x, y, DIAL.fog, pie / (SS * SS));
  }
  if (sealed) { const x0 = DIAL.size + DIAL.lockGap, y0 = (DIAL.size - DIAL.lock[1]) / 2; LOCK.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "#") put(x0 + x, y0 + y, DIAL.fog, 1); })); }
  return rgba;
}
