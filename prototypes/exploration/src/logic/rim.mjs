// The rim line of a ring cell: the cell is walked, the step across its drawn line is not. lay.rimSteps holds, per tile, the steps out of it
// that the line refuses (adapt7.mjs).
export const RIM_BIT = { up: 1, down: 2, left: 4, right: 8 };

// The one rim check: the orthogonal step from (fx, fy) to (tx, ty) crosses a drawn rim line, as the explorer's own step does.
// Whoever already stands on the far side keeps its level: only the step across is refused.
export function rimRefuses(lay, fx, fy, tx, ty) {
  if (!lay.rimSteps || fx < 0 || fy < 0 || fx >= lay.w || fy >= lay.h) return false;
  const dx = tx - fx, dy = ty - fy; if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
  return !!(lay.rimSteps[fy * lay.w + fx] & RIM_BIT[dy < 0 ? 'up' : dy > 0 ? 'down' : dx < 0 ? 'left' : 'right']);
}
