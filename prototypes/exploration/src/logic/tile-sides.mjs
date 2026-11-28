// The side between two land cells of a generator 7 region, read off both places' tiles. No game state: two layouts in, the answer out.
import { T_BLOCK } from "./world.mjs";

// Both layouts are the generator's own (a stand-in made while the tile set loads has no levels to read).
export const sideReady = (la, lb) => !!(la.tiles && lb.tiles && la.raisedFn && lb.raisedFn);

// A change of level between two tiles across a border stops a step only where a cliff is drawn on both sides: a cliff drawn on one side only is not seen from the other, and with none drawn it is a slope and walks.
const levelBlocks = (la, ax, ay, lb, bx, by) => !!la.raisedFn(ax, ay) !== !!lb.raisedFn(bx, by) && la.cliffShown(ax, ay) && lb.cliffShown(bx, by);
const pairWalks = (la, ax, ay, lb, bx, by) => !T_BLOCK[la.tiles[ay * la.w + ax]] && !T_BLOCK[lb.tiles[by * lb.w + bx]] && !levelBlocks(la, ax, ay, lb, bx, by);

// The side between la and lb, la being the west cell (east) or the north one: open where its tiles hold a run of 2+ pairs that walk on the same level, closed otherwise.
// mask: one byte a tile along the side (north to south, or west to east), 1 where open.
export function sideOf(la, lb, east) {
  const len = east ? la.h : la.w, mask = new Uint8Array(len);
  for (let k = 0, s = 0; k <= len; k++) {
    if (k < len && (east ? pairWalks(la, la.w - 1, k, lb, 0, k) : pairWalks(la, k, la.h - 1, lb, k, 0))) continue;
    if (k - s >= 2) mask.fill(1, s, k);
    s = k + 1; }
  return { open: mask.includes(1), mask, len, east };
}

// A step toward dir from tile x, y of la into lb: the tile it lands on (the same row or column, continued), or null where the two tiles do not walk on the same level.
export function landingOf(la, lb, dir, x, y) {
  const bx = dir === 'right' ? 0 : dir === 'left' ? lb.w - 1 : x, by = dir === 'down' ? 0 : dir === 'up' ? lb.h - 1 : y;
  return pairWalks(la, x, y, lb, bx, by) ? { x: bx, y: by } : null;
}
