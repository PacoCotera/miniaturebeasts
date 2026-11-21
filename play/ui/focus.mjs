// Focus: the pad moves one ring between targets by the spec's focus graph, falling back to the nearest target in that direction; a press is armed, then confirmed
// (technical-architecture.md §5.1). No rule calls here: the screen turns the focused target and the key into an intent.
//
// One semantics, run by this module and by the face's C port (prototypes/face/src/focus/focus.c) so the JSON vectors in prototypes/face/tests/vectors/focus.json give the same id on both
// (lvgl-switch.md §2.6.1). All arithmetic is on integers: a target's centre is taken doubled, (2x + w, 2y + h), so JavaScript, WebAssembly, x86-64 and aarch64 cannot round differently.
//
// Targets: [{ id, rect: [x, y, w, h], group?, index?, enabled? }] in the order the view lists them; a target is *present* when it is in the list (enabled or not: an enabled flag changes what ✓ does,
// never where the ring may go). A target's group is its `group`, else its id up to the first ".". The graph of one state, from the spec:
//   { <group>: { axis?: "vertical" | "horizontal", order?: [ids], up?, down?, left?, right? }, fallback: "spatial" | "none", roomKey?: <id> }
// A group may carry `stepper: [keys]`: the keys that step a value on the focused target instead of moving the ring (lvgl-switch.md §2.6.1); the move answers { to: cur, verb: "step:<key>" } and the ring stays.
// An edge is a name ("pod"), a selector (a name with a ".": "kin.first", "rail.last"), "none", { nearestIn: <group>, ahead?: true }, or an ordered list of the first three and nearestIn objects with
// "none" only last. The first entry that yields a present target wins.
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const groupOf = (id) => String(id).split(".")[0];
const tgroup = (t) => t.group ?? groupOf(t.id);

// The refusals at load (§2.3, §2.6.1): an empty list, "none" before the last entry, a list inside a list, an unknown key in a nearestIn object, a group with both order and axis.
// Returns the first problem as a string, or null when the graph is sound.
export function graphProblem(graph) {
  for (const [g, def] of Object.entries(graph)) {
    if (g === "fallback" || g === "roomKey" || typeof def !== "object" || def === null || Array.isArray(def)) continue;
    if (def.order && def.axis) return `group ${g}: both order and axis`;
    if (def.stepper !== undefined) {
      const st = def.stepper;
      if (!Array.isArray(st) || !st.length) return `group ${g}: stepper is a non-empty list of keys`;
      for (const [i, k] of st.entries()) {
        if (!(k in DIRS)) return `group ${g}: stepper names an unknown key ${JSON.stringify(k)}`;
        if (st.indexOf(k) !== i) return `group ${g}: stepper lists ${k} twice`;
        if (def[k] !== undefined) return `group ${g}: ${k} is a stepper key and has an edge`;
        if (def.axis === "horizontal" && (k === "left" || k === "right")) return `group ${g}: ${k} steps and the axis is horizontal`;
        if (def.axis === "vertical" && (k === "up" || k === "down")) return `group ${g}: ${k} steps and the axis is vertical`;
        if (def.order && (k === "up" || k === "down")) return `group ${g}: ${k} steps and the group has an order`;
      }
    }
    for (const k of ["up", "down", "left", "right"]) {
      const e = def[k]; if (e === undefined) continue;
      const entries = Array.isArray(e) ? e : [e];
      if (Array.isArray(e) && !e.length) return `group ${g}.${k}: an empty list`;
      for (const [i, x] of entries.entries()) {
        if (Array.isArray(x)) return `group ${g}.${k}: a list inside a list`;
        if (x === "none" && Array.isArray(e) && i < e.length - 1) return `group ${g}.${k}: "none" before the last entry`;
        if (x && typeof x === "object") { for (const key of Object.keys(x)) if (key !== "nearestIn" && key !== "ahead") return `group ${g}.${k}: unknown key ${key} in a nearestIn object`; if (typeof x.nearestIn !== "string") return `group ${g}.${k}: nearestIn names a group`; }
        else if (typeof x !== "string") return `group ${g}.${k}: an edge is a name, a selector, none, a nearestIn object or a list`;
      }
    }
  }
  return null;
}

const centre = (t) => [2 * t.rect[0] + t.rect[2], 2 * t.rect[1] + t.rect[3]];
// The best target by score among candidates: the least score wins, the earlier target on a tie. `score(along, across)` → a number or null (not a candidate).
function best(targets, origin, dir, cand, score) {
  const [dx, dy] = DIRS[dir]; let pick = null, ps = Infinity;
  for (const t of targets) {
    if (!cand(t)) continue;
    const c = centre(t), vx = c[0] - origin[0], vy = c[1] - origin[1], along = vx * dx + vy * dy, across = Math.abs(vx * dy + vy * dx), s = score(along, across);
    if (s !== null && s < ps) { ps = s; pick = t; }
  }
  return pick;
}
// The nearest target in a direction (the spatial fallback): along more than 8 (4 px), 5·along + 11·across. `cur` may be a target or an origin [x2, y2] already doubled.
export function nearest(targets, cur, dir, origin = null) {
  const o = origin ?? centre(cur);
  return best(targets, o, dir, (t) => !cur.id || t.id !== cur.id, (along, across) => (along > 8 ? 5 * along + 11 * across : null));
}
// What one edge entry yields: a present target, or null.
function yields(entry, targets, dir, origin, cur, resolve) {
  if (typeof entry === "object") {
    const group = entry.nearestIn, ahead = !!entry.ahead;
    return ahead ? best(targets, origin, dir, (t) => t.id !== cur && tgroup(t) === group, (along, across) => (along > 12 ? 5 * along + 11 * across : null))
      : best(targets, origin, dir, (t) => t.id !== cur && tgroup(t) === group, (along, across) => 400 * across + Math.abs(along));
  }
  if (entry === "none") return null;
  if (entry.includes(".")) { const to = resolve(entry); const hit = to && targets.find((t) => t.id === to); return hit || targets.find((t) => tgroup(t) === groupOf(entry)) || null; }
  return targets.find((t) => t.id === entry) || targets.find((t) => tgroup(t) === entry) || null;
}
// The move for a key: { to } (the next focused id) or, for a stepper key, { to: cur, verb: "step:<key>" }. `resolve(selector)` turns "list.current" or "rail.last" into an id (null when there is none). `opts.roomAt`: the rectangle [x, y, w, h] the ring starts from when the focus is the graph's roomKey (a ring on nothing); its doubled centre is the origin.
export function moveFocus(graph, targets, curId, dir, resolve = () => null, opts = {}) {
  const isRoom = graph.roomKey !== undefined && curId === graph.roomKey;
  const cur = targets.find((t) => t.id === curId);
  if (!cur && !isRoom) return { to: targets.length ? targets[0].id : curId };
  const origin = isRoom ? [2 * opts.roomAt[0] + opts.roomAt[2], 2 * opts.roomAt[1] + opts.roomAt[3]] : centre(cur), g = (isRoom ? graph[graph.roomKey] : graph[tgroup(cur)]) || {}, edge = g[dir];
  // (0) a stepper key steps: the ring stays
  if (g.stepper && g.stepper.includes(dir)) return { to: curId, verb: `step:${dir}` };
  // (1) the group's edge: "none" stops; a yielded target is the answer
  if (edge === "none") return { to: curId };
  if (edge !== undefined) {
    const list = Array.isArray(edge) ? edge : [edge];
    for (const [i, entry] of list.entries()) {
      if (entry === "none") return { to: curId };   // only ever last (graphProblem): the ring stays
      const to = yields(entry, targets, dir, origin, curId, resolve); if (to) return { to: to.id };
      void i;
    }
  }
  // (2) the group's order for ▲ ▼, or its axis
  if (cur && g.order && (dir === "up" || dir === "down")) {
    const present = g.order.filter((id) => targets.some((t) => t.id === id)), i = present.indexOf(curId);
    if (i >= 0) { const to = present[i + (dir === "down" ? 1 : -1)]; return { to: to ?? curId }; }   // the ends stop: never a wrap
  } else if (cur && g.axis) {
    const step = g.axis === "vertical" ? (dir === "down" ? 1 : dir === "up" ? -1 : 0) : dir === "right" ? 1 : dir === "left" ? -1 : 0;
    if (step) {
      const items = targets.filter((t) => tgroup(t) === tgroup(cur)).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      const i = items.findIndex((t) => t.id === curId), to = items[i + step];
      return { to: to ? to.id : curId };   // the ends stop: never a wrap
    }
  }
  // (3) the state's fallback
  if ((graph.fallback ?? "spatial") === "spatial") { const n = best(targets, origin, dir, (t) => t.id !== curId, (along, across) => (along > 8 ? 5 * along + 11 * across : null)); if (n) return { to: n.id }; }
  return { to: curId };
}
// The next focused id (a step leaves the ring where it is).
export const nextFocus = (graph, targets, curId, dir, resolve, opts) => moveFocus(graph, targets, curId, dir, resolve, opts).to;
// The focus state of one screen: the ring's target and the armed press.
export function createFocus(graph, initial = null) {
  const F = { graph, cur: initial, armed: null };
  F.move = (targets, dir, resolve, opts) => { F.armed = null; F.cur = nextFocus(F.graph, targets, F.cur, dir, resolve, opts); return F.cur; };   // F.graph may be set after creation (the spec loads at boot)
  F.set = (id) => { if (id !== F.cur) F.armed = null; F.cur = id; return F; };
  // Keep the focus on an existing target; otherwise the fallback (or the first target).
  F.ensure = (targets, fallback) => { if (!targets.some((t) => t.id === F.cur)) { F.armed = null; F.cur = fallback && targets.some((t) => t.id === fallback) ? fallback : targets[0]?.id ?? null; } return F.cur; };
  // Arm-then-confirm: the first ✓ arms the target, the second confirms; any other key disarms.
  F.arm = (id) => { F.armed = id; return F; };
  F.isArmed = (id) => F.armed === id;
  F.disarm = () => { F.armed = null; return F; };
  return F;
}
