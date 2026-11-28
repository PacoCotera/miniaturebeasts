// The storm band's rules that read only what they are handed: a map cell, a band ({ x: its west edge in columns, w: its width, dir: +1 moving east or -1 west,
// v: columns an action, t: its own clock }). No game state, no clock.
import { MW, cxy } from "../world.mjs";

// The band starts three columns upwind of the start, so it arrives within a dozen actions.
export function stormFor(cell) { const col = cxy(cell).x, w = 3, fromWest = col >= MW / 2;
  return fromWest ? { x: col - 3 - w, dir: 1, w, v: .25, t: 0 } : { x: col + 4, dir: -1, w, v: .25, t: 0 }; }
// How far the storm is from a cell, for the start pick's line: { in: bool, behind: bool, actions: n }. The gap is the columns between the cell and the band's leading edge; the band moves st.v columns an action.
export function stormGap(st, cell) {
  const col = cxy(cell).x, lead = st.dir > 0 ? st.x + st.w : st.x, gap = st.dir > 0 ? col - lead : lead - (col + 1);
  if (col >= st.x && col < st.x + st.w) return { in: true, behind: false, actions: 0 };
  const behind = st.dir > 0 ? col < st.x : col >= st.x + st.w;
  return { in: false, behind, actions: Math.max(1, Math.ceil(gap / st.v)) };
}
