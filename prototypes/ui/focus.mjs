// Focus: the pad moves one ring between targets by the spec's focus graph, falling back to the nearest target in
// that direction; a press is armed, then confirmed (technical-architecture.md §5.1). No rule calls here: the screen
// turns the focused target and the key into an intent.
//
// Targets: [{ id, rect: [x, y, w, h], group, index }]; ids are "<group>.<index>" or a bare group name for a group
// of one. The graph, from the spec file: { <group>: { axis?: "vertical" | "horizontal", up?, down?, left?, right? },
// fallback: "spatial" }. An axis steps through the group's items in index order and stops at the ends; an edge names
// a group ("pod") or a selector ("list.current", "rail.last") the screen resolves to an id, or "none" when the
// spec says the key does nothing there.
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const groupOf = (id) => String(id).split(".")[0];

// The nearest target in a direction: the one with the least distance along it, crosswise distance weighed double.
export function nearest(targets, cur, dir) {
  const [dx, dy] = DIRS[dir], cx = cur.rect[0] + cur.rect[2] / 2, cy = cur.rect[1] + cur.rect[3] / 2;
  let best = null, bd = Infinity;
  for (const t of targets) {
    if (t.id === cur.id) continue;
    const vx = t.rect[0] + t.rect[2] / 2 - cx, vy = t.rect[1] + t.rect[3] / 2 - cy, along = vx * dx + vy * dy;
    if (along <= 4) continue;
    const d = along + Math.abs(vx * dy + vy * dx) * 2.2;
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}
// The next focused id. `resolve(selector)` turns "list.current" or "rail.last" into an id (null when there is none).
export function nextFocus(graph, targets, curId, dir, resolve = () => null) {
  const cur = targets.find((t) => t.id === curId);
  if (!cur) return targets.length ? targets[0].id : curId;
  const g = graph[cur.group ?? groupOf(curId)] || {};
  const edge = g[dir];
  if (edge === "none") return curId;   // the spec says this key does nothing here
  if (edge) {
    const to = edge.includes(".") ? resolve(edge) : edge;
    if (to && targets.some((t) => t.id === to)) return to;
    const first = targets.find((t) => (t.group ?? groupOf(t.id)) === groupOf(edge));
    if (first) return first.id;
  }
  if (g.axis) {
    const step = g.axis === "vertical" ? (dir === "down" ? 1 : dir === "up" ? -1 : 0) : dir === "right" ? 1 : dir === "left" ? -1 : 0;
    if (step) {
      const items = targets.filter((t) => (t.group ?? groupOf(t.id)) === (cur.group ?? groupOf(curId))).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      const i = items.findIndex((t) => t.id === curId), to = items[i + step];
      return to ? to.id : curId;   // the ends stop: never a wrap
    }
  }
  if ((graph.fallback ?? "spatial") === "spatial") { const n = nearest(targets, cur, dir); if (n) return n.id; }
  return curId;
}
// The focus state of one screen: the ring's target and the armed press.
export function createFocus(graph, initial = null) {
  const F = { graph, cur: initial, armed: null };
  F.move = (targets, dir, resolve) => { F.armed = null; F.cur = nextFocus(graph, targets, F.cur, dir, resolve); return F.cur; };
  F.set = (id) => { if (id !== F.cur) F.armed = null; F.cur = id; return F; };
  // Keep the focus on an existing target; otherwise the fallback (or the first target).
  F.ensure = (targets, fallback) => { if (!targets.some((t) => t.id === F.cur)) { F.armed = null; F.cur = fallback && targets.some((t) => t.id === fallback) ? fallback : targets[0]?.id ?? null; } return F.cur; };
  // Arm-then-confirm: the first ✓ arms the target, the second confirms; any other key disarms.
  F.arm = (id) => { F.armed = id; return F; };
  F.isArmed = (id) => F.armed === id;
  F.disarm = () => { F.armed = null; return F; };
  return F;
}
