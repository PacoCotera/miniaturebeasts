// The specimen (the pod under the beam on its cradle; station-layouts.md, Pods §5): the cool beam from above left, the
// glass cradle, the pod bottom-centred on (axis, feet) at its size class, its name in 20 px on its plate and its origin in 16 px
// (at most two lines) or, for a while, a ribbon in the origin's place. Identify clears the seal from the top down: the
// identified picture is shown above the cut, the sealed one below, a hairline of white on the cut itself.
// props: { colours, beam, cradle, pod: { sealed, identified?, size: [w, h] } | null, cut: 0..1 | null, name, origin: [lines], ribbon: text | null, ribbonColours }
import { panel } from "./panel.mjs";
import { isFilled } from "../assets.mjs";
import { SIZES } from "../type.mjs";

// One line of text centred on x: its box measured from the atlas, so the node's rectangle is the run's own.
const centred = (ctx, id, text, cx, y, px, colour, region = null) => { const w = ctx.measure(text, px); return { id, kind: "text", rect: [cx - Math.round(w / 2), y, w, Math.round(px * 1.25)], text, px, weight: SIZES[px], colour, align: "left", ...(region ? { region } : {}) }; };
const capTop = (ctx, px, y, pitch) => y + Math.floor((pitch - ctx.cap(px)) / 2);
// A layer of the room: the sprite at its rectangle when its picture is there (a placed master at that exact size), nothing when its slot is still empty.
export const layer = (id, rect, asset, region = null) => (asset && isFilled(asset) ? [{ id, kind: "sprite", rect: rect.slice(), asset, ...(region ? { region } : {}) }] : []);
export function specimen(ctx, id, spec, props) {
  const R = spec.regions, Cc = props.colours, room = props.room || {}, nodes = [];
  if (!(room.bench && isFilled(room.bench))) nodes.push({ id: id + ".beam", kind: "sprite", rect: R.beam.rect.slice(), asset: props.beam });   // the cone of light, until the room master paints its own
  nodes.push(...layer(id + ".shelf", R.shelf.rect, room.shelf), ...layer(id + ".cradle", R.cradle.rect, room.cradle));
  if (props.pod) {
    const [w, h] = props.pod.size, lift = props.pod.lift || 0, rect = [R.pod.axis - Math.round(w / 2), R.pod.feet - h - lift, w, h];   // a focused creature lifts (4 px)
    const sw = w + R.pod.shadow.widen; nodes.push(...layer(id + ".shadow", [R.pod.axis - Math.round(sw / 2), R.pod.feet - Math.round(R.pod.shadow.h / 2), sw, R.pod.shadow.h], room.shadow));
    nodes.push({ id: id + ".pod", kind: "sprite", rect, asset: props.pod.sealed, region: "pod" });
    if (props.cut != null && props.pod.identified) {
      const cut = Math.round(h * props.cut);
      nodes.push({ id: id + ".id", kind: "clip", rect: [rect[0], rect[1], w, cut], children: [{ id: id + ".idpic", kind: "sprite", rect, asset: props.pod.identified }] });
      if (cut > 0 && cut < h) nodes.push({ id: id + ".cut", kind: "rect", rect: [rect[0] + 4, rect[1] + cut, w - 8, 1], colour: Cc.cut });
    } else if (props.pod.identified) nodes.push({ id: id + ".idpic", kind: "sprite", rect, asset: props.pod.identified });
  }
  nodes.push(...layer(id + ".cradleFront", R.cradleFront.rect, room.cradleFront));   // the dish's near lip, over the pod's foot
  const N = R.name, O = R.origin;
  if (props.name) {
    const pw = room.plate ? Number(room.plate.match(/:(\d+)x/)[1]) : 0;
    if (pw) nodes.push(...layer(id + ".plate", [N.centre - Math.round(pw / 2), N.rect[1], pw, N.plate.h], room.plate));
    nodes.push(centred(ctx, id + ".name", props.name, N.centre, capTop(ctx, N.px, N.rect[1], N.rect[3]), N.px, Cc.name, "name"));
  }
  if (props.ribbon) nodes.push(...ribbon(ctx, id + ".ribbon", spec, props.ribbon, props.ribbonColours));
  else (props.origin || []).forEach((l, i) => nodes.push(centred(ctx, `${id}.origin.${i}`, l, O.centre, capTop(ctx, O.px, O.rect[1] + O.pitch * i, O.pitch), O.px, Cc.origin, i === 0 ? "origin" : null)));
  return nodes;
}
// A ribbon: a plate with a one-pixel edge, one line of 20 px, shown for a moment in a rectangle the layout names.
export function ribbon(ctx, id, spec, text, Cc) {
  const r = spec.regions.ribbon, [x, y, w, h] = r.rect;
  return [...panel(id, r.rect, { fill: Cc.fill, edge: Cc.edge, region: "ribbon" }), centred(ctx, id + ".text", text, x + Math.round(w / 2), y + Math.floor((h - ctx.cap(r.px)) / 2), r.px, Cc.text)];
}
