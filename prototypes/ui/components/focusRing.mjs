// The focus ring (station-layouts.md, "States shared by every screen"): one warm ring in the focus role (warm cream, #ffe6ad) per screen, 2 px wide,
// 4 px outside its target, with a 6 px corner radius; on a creature, an ellipse on the ground under its feet
// instead, the box's width plus 16 by 24 px tall. Never a second ring, a list cursor or a side bar.
// The round ring is a nine-slice picture (corners 1:1, the straight edges tiled); the ellipse is a sprite at its size. Both are pictures from ringMask, on every renderer.
import { registerAsset } from "../assets.mjs";
import { ringMask, tabRingMask } from "../rings.mjs";

export function ringAsset(shape, w, h, colour, width, radius) {
  const id = shape === "ellipse" ? `ring:ellipse:${w}x${h}:${colour}:${width}` : `ring:round:${colour}:${width}:${radius}`;
  if (shape === "ellipse") registerAsset({ id, w, h, status: "master", until: null, build: (e, env) => env.mask(w, h, ringMask(w, h, width, 0, "ellipse"), colour) });
  else { const c = radius + width; registerAsset({ id, w: 2 * c + 4, h: 2 * c + 4, status: "master", slice: [c, c, c, c], build: (e, env) => env.mask(e.w, e.h, ringMask(e.w, e.h, width, radius), colour) }); }
  return id;
}
// The ring on a slanted rail tab: its two slants 4 px outside the tab, a top run at y 42, rounded bottom corners, a sprite at the box (x - 4, 42, w + 24, 42).
export function tabRingAsset(w, colour, spec) {
  const r = spec.focus.ring, t = r.tab, W = w + 2 * t.outside + t.slant, H = t.bottom - t.top, id = `ring:tab:${w}:${colour}:${r.width}`;   // the box's size from the spec; the mask is built once, when the picture is first drawn
  registerAsset({ id, w: W, h: H, status: "master", until: null, build: (e, env) => env.mask(e.w, e.h, tabRingMask(w, { tab: t, width: r.width, tabTop: spec.regions.rail.y }).mask, colour) });
  return { id, w: W, h: H };
}
export function focusRing(id, target, spec, { shape = "round", colour = "focus" } = {}) {
  const r = spec.focus.ring, [x, y, w, h] = target;
  if (shape === "tab") { const a = tabRingAsset(w, colour, spec); return [{ id, kind: "sprite", rect: [x - r.tab.outside, r.tab.top, a.w, a.h], asset: a.id, shape: "tab" }]; }
  if (shape === "ellipse") {
    const f = spec.focus.feet, ew = w + f.widen, eh = f.height, asset = ringAsset("ellipse", ew, eh, colour, r.width, 0);
    return [{ id, kind: "sprite", rect: [x + Math.round(w / 2) - Math.round(ew / 2), y + h - Math.round(eh / 2), ew, eh], asset, shape: "ellipse" }];
  }
  return [{ id, kind: "nineSlice", rect: [x - r.outside, y - r.outside, w + 2 * r.outside, h + 2 * r.outside], asset: ringAsset("round", 0, 0, colour, r.width, r.radius), shape: "round" }];
}
