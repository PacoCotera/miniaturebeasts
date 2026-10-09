// The retained scene: a flat, ordered list of nodes on three layers (art, painted, type), kept between
// frames and diffed by id, so a renderer repaints only the rectangles that changed (technical-architecture.md
// §5.1, §5.2). The scene holds no pixels and knows no palette: colours are names, pictures are asset ids.
//
// A node: { id, kind, rect: [x, y, w, h], ...by kind }. The closed set of primitives, and nothing else:
//   rect       { colour }                         art: a filled rectangle in a palette colour (named, never a value)
//   sprite     { asset }                          art or painted (the asset's policy decides): placed 1:1, never scaled
//   nineSlice  { asset }                          art: a picture with edges (the manifest names its slice insets); the corners are placed
//                                                 1:1 and the edges and middle tiled, so a frame or a ring fits any rectangle without scaling
//   text       { text, px, weight, colour, align } type: a glyph run set from the Inter atlas at 16, 20 or 28 px; x is the anchor by align
//   clip       { children }                       every layer: the children drawn inside the rectangle
//   legacy     { draw }                           the adapter for screens not yet moved: a callback painting the rectangle through the
//                                                 renderer's immediate primitives (the same rect, sprite and glyph calls; T2 removes it)
// No canvas paths, gradients, shadows, filters, transforms or global alpha exist in the set; a ring is a nine-slice, a shade a sprite.
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
// A text run's ink reaches past its box (ascenders above the cap line, descenders and accents below), so its drawn rectangle is padded.
const TEXT_PAD = [2, 6, 2, 8];
const boxOf = (n) => (n.kind === "text" ? [n.rect[0] - TEXT_PAD[0], n.rect[1] - TEXT_PAD[1], n.rect[2] + TEXT_PAD[0] + TEXT_PAD[2], n.rect[3] + TEXT_PAD[1] + TEXT_PAD[3]] : n.rect);
export const drawnRect = (f) => (f.clip ? rectIntersect(f.clip, boxOf(f.node)) : boxOf(f.node).slice());

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
  regions() { return this.flat.filter((f) => f.node.region).map((f) => ({ region: f.node.region, rect: f.node.rect.slice(), id: f.node.id, kind: f.node.kind, text: f.node.text ?? null, px: f.node.px ?? null, align: f.node.align ?? null, asset: f.node.asset ?? null })); }
  // Every text node, for the type check without a renderer.
  cellNodes() { return this.flat.filter((f) => /^page[AB]?\.c\d+\./.test(f.node.id)).map((f) => ({ id: f.node.id, kind: f.node.kind, rect: f.node.rect.slice(), px: f.node.px ?? null, mark: f.node.mark ?? null })); }   // the page cells' nodes, for the seed column check
  texts() { return this.flat.filter((f) => f.node.kind === "text").map((f) => ({ id: f.node.id, text: f.node.text, px: f.node.px, weight: f.node.weight, rect: f.node.rect.slice(), align: f.node.align })); }
}
