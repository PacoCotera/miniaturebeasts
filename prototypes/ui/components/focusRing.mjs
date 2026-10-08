// The focus ring (station-layouts.md, "States shared by every screen"): one warm cream ring per screen, 2 px wide,
// 4 px outside its target, with a 6 px corner radius; on a creature, an ellipse on the ground under its feet
// instead, the box's width plus 16 by 24 px tall. Never a second ring, a list cursor or a side bar.
export function focusRing(id, target, spec, { shape = "round", colour = "cream" } = {}) {
  const r = spec.focus.ring, [x, y, w, h] = target;
  if (shape === "ellipse") { const f = spec.focus.feet, ew = w + f.widen, eh = f.height; return [{ id, kind: "ring", rect: [x + Math.round(w / 2) - Math.round(ew / 2), y + h - Math.round(eh / 2), ew, eh], colour, width: r.width, radius: 0, shape: "ellipse" }]; }
  return [{ id, kind: "ring", rect: [x - r.outside, y - r.outside, w + 2 * r.outside, h + 2 * r.outside], colour, width: r.width, radius: r.radius, shape: "round" }];
}
