// A way as a compass word.

// (dx, dy) over n steps: 'north', 'south-east' and so on, or null when it leans no way. A lean more than twice the other is said alone.
export function dirWord(dx, dy, n) {
  const ax = dx / n, ay = dy / n, ns = ay < -.15 ? 'north' : ay > .15 ? 'south' : '', ew = ax > .15 ? 'east' : ax < -.15 ? 'west' : '';
  if (!ns && !ew) return null;
  if (ns && ew) { if (Math.abs(ax) > 2 * Math.abs(ay)) return ew; if (Math.abs(ay) > 2 * Math.abs(ax)) return ns; return ns + '-' + ew; }
  return ns || ew;
}
