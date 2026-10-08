// The retained scene: a flat, ordered list of nodes on three layers (art, painted, type), kept between
// frames and diffed by id, so a renderer repaints only the rectangles that changed (technical-architecture.md
// §5.1, §5.2). The scene holds no pixels and knows no palette: colours are names, pictures are asset ids.
//
// A node: { id, kind, rect: [x, y, w, h], layer?, ...by kind }
//   rect     { colour }                                  art: a filled rectangle in a palette colour
//   sprite   { asset }                                   art or painted (the asset's policy decides): placed 1:1, never scaled
//   pattern  { asset }                                   art: the asset tiled over the rectangle (the dither and shade tables)
//   text     { text, px, weight, colour, align }         type: one string of Inter at 16, 20 or 28 px; x is the anchor by align
//   ring     { colour, width, radius, shape }            art: the focus ring, a rounded rectangle or an ellipse, drawn on whole pixels
//   clip     { children }                                every layer: the children drawn inside the rectangle
//   legacy   { draw }                                    the adapter for screens not yet moved: a draw callback painting the
//                                                        rectangle with the Station's old primitives (T2 removes it)
// A node drawn later covers a node drawn earlier on every layer, as if the layers were one surface; the layers exist
// so the checks can measure them apart (the art layer on the palette, the type layer's run log).
// `region` on a node names the spec region it draws, for the regions check. `always` marks a node repainted
// every frame (an adapter, an animation the view cannot key).
export const LAYERS = ["art", "painted", "type"];

export const rectsTouch = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
const rectsNear = (a, b) => a[0] <= b[0] + b[2] && b[0] <= a[0] + a[2] && a[1] <= b[1] + b[3] && b[1] <= a[1] + a[3];   // overlapping or adjacent: joined when merging
export const rectUnion = (a, b) => { const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]); return [x0, y0, Math.max(a[0] + a[2], b[0] + b[2]) - x0, Math.max(a[1] + a[3], b[1] + b[3]) - y0]; };
export const rectIntersect = (a, b) => { const x0 = Math.max(a[0], b[0]), y0 = Math.max(a[1], b[1]), x1 = Math.min(a[0] + a[2], b[0] + b[2]), y1 = Math.min(a[1] + a[3], b[1] + b[3]); return x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : null; };
const sameRect = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];

// A node's identity for the diff: everything but functions and children (children are diffed as nodes of their own).
function keyOf(n) { return JSON.stringify(n, (k, v) => (k === "children" || typeof v === "function" ? undefined : v)); }
// The flat list of a tree in draw order, each with its clip chain.
export function flatten(nodes, clip = null, out = []) {
  for (const n of nodes) {
    if (!n || !n.rect) continue;
    out.push({ node: n, clip });
    if (n.kind === "clip" && n.children) flatten(n.children, clip ? rectIntersect(clip, n.rect) || [0, 0, 0, 0] : n.rect.slice(), out);
  }
  return out;
}
// The rectangle a node can touch, within its clip.
export const drawnRect = (f) => (f.clip ? rectIntersect(f.clip, f.node.rect) : f.node.rect.slice());

export class Scene {
  constructor(w, h) { this.w = w; this.h = h; this.flat = []; this.keys = new Map(); this.dirty = []; this.frame = 0; this.invalidate(); }
  // Everything repaints on the next paint (a first frame, a resize of nothing: the screen is fixed).
  invalidate() { this.dirty = [[0, 0, this.w, this.h]]; }
  // Replace the scene with this frame's node tree. Nodes whose id and fields are unchanged keep their pixels; the
  // rectangles of changed, added and removed nodes (and of nodes marked always) are dirty.
  set(nodes) {
    this.frame++;
    const flat = flatten(nodes), next = new Map(), dirty = this.dirty;
    for (const f of flat) {
      const r = drawnRect(f); if (!r) continue;
      const key = keyOf(f.node) + "|" + (f.clip ? f.clip.join() : ""), id = f.node.id;
      if (next.has(id)) throw new Error("two scene nodes share the id " + id);
      next.set(id, { key, rect: r });
      const prev = this.keys.get(id);
      if (f.node.always || !prev || prev.key !== key) { dirty.push(r); if (prev && !sameRect(prev.rect, r)) dirty.push(prev.rect); }
    }
    for (const [id, prev] of this.keys) if (!next.has(id)) dirty.push(prev.rect);
    this.keys = next; this.flat = flat;
    return this;
  }
  // The dirty rectangles merged: overlapping ones joined; past a dozen, one box.
  dirtyRects() {
    const out = [];
    for (const r of this.dirty) {
      let cur = r.slice(), merged = true;
      while (merged) { merged = false; for (let i = out.length - 1; i >= 0; i--) if (rectsNear(out[i], cur)) { cur = rectUnion(out.splice(i, 1)[0], cur); merged = true; } }
      out.push(cur);
    }
    if (out.length > 12) return [out.reduce(rectUnion)];
    return out.map((r) => rectIntersect(r, [0, 0, this.w, this.h])).filter(Boolean);
  }
  clearDirty() { this.dirty = []; }
  // The nodes touching a rectangle, in draw order.
  nodesIn(rect) { return this.flat.filter((f) => { const r = drawnRect(f); return r && rectsTouch(r, rect); }); }
  // Every node with a region tag: { region, rect }, for the regions check.
  regions() { return this.flat.filter((f) => f.node.region).map((f) => ({ region: f.node.region, rect: f.node.rect.slice(), id: f.node.id })); }
  // Every text node, for the type check without a renderer.
  texts() { return this.flat.filter((f) => f.node.kind === "text").map((f) => f.node); }
}
