// The Rupar's earth banks are made a region at a time (gen7/levels.mjs regionBanks); a place's window reads the lists of the regions it touches.
import { MW, MH, cxy } from "./world.mjs";
import { ATLAS } from "./regions.mjs";

const BANK_WINDOW = 2;   // cells: a place's window reads this far round the cell (levels.mjs rule.window)

// The regions ([ra, rb] atlas slots) the windows of these cells touch, seen from the region at `slot`, the nearest first.
export function bankRegions(slot, cells) {
  const seen = new Map();
  for (const c of cells) { const q = cxy(c);
    for (const dy of [-BANK_WINDOW, 0, BANK_WINDOW]) for (const dx of [-BANK_WINDOW, 0, BANK_WINDOW]) {
      const ra = Math.floor((slot[0] * MW + q.x + dx) / MW), rb = Math.floor((slot[1] * MH + q.y + dy) / MH);
      if (ra >= 0 && rb >= 0 && ra < ATLAS && rb < ATLAS) seen.set(ra * 100 + rb, [ra, rb]); } }
  return [...seen.values()].sort((a, b) => Math.max(Math.abs(a[0] - slot[0]), Math.abs(a[1] - slot[1])) - Math.max(Math.abs(b[0] - slot[0]), Math.abs(b[1] - slot[1])));
}
