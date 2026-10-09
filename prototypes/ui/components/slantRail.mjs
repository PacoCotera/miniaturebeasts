// The slanted chapter rail (station-layouts.md, "The chapter rail"): tabs hang from the top bar's rule (y 40, 40 tall), each a
// parallelogram whose sides lean 16 px over its height, touching along their slants (a shared slant is one hairline). Built from the
// closed set: the body a rectangle, the two slanted ends sprites from masks (fill and rim), the hairlines rectangles. Full tab (136):
// the emblem 24×24, 8 px, the chapter's word, with the pips centred under the word, the block centred on the tab's middle; compact
// tab (56): the emblem over the pips, each on the slanted middle. One fill, word and pip colour per state from frame.json's rail.states (unread and read
// on `panel`, the open tab one step lighter, sealed with slats in `bar`), every tab's edges 1 px `bevel`; focused: the ring in the tab's shape, nothing else
// (no lift, no lit edge). A glint hangs 2 px under the tab's bottom edge.
// props: { tabs: [{ id, word, emblem (asset id), pips: n, filled: n, state: "unread" | "read" | "sealed", glint, pipMarks? }], focused: index | null,
//          open: index (the open chapter: its tab is lighter, and full when the rail is compact), where: "pods" | "centred", colours: { changed }, star (asset id), clashMark }
import { slantTabs, slantAt } from "../layout.mjs";
import { registerAsset } from "../assets.mjs";
import { tabEndMask } from "../rings.mjs";

import { focusRing } from "./focusRing.mjs";
import { cutOutline } from "./panel.mjs";

const endAsset = (side, part, colour, R) => {
  const id = `tab:${side}:${part}:${colour}`;
  registerAsset({ id, w: R.slant, h: R.h, status: "master", until: null, build: (e, env) => env.mask(e.w, e.h, tabEndMask(side, part, R.slant, R.h, (r) => slantAt(R, r)), colour) });
  return id;
};

export function slantRail(ctx, id, props) {
  const spec = ctx.spec, R = spec.regions.rail, St = R.states, Cc = { changed: "amber", ...props.colours }, F = R.full_layout, K = R.compact_layout, nodes = [], rings = [];   // the ring crosses 4 px onto the neighbours, so it goes after every tab
  const placed = slantTabs(R, props.tabs.length, props.open ?? 0, props.where ?? "pods");
  placed.tabs.forEach(({ rect: [x, y, w, h], full }, i) => {
    const t = props.tabs[i], tid = `${id}.${i}`, sealed = t.state === "sealed", st = sealed ? St.sealed : props.open === i ? St.open : t.state === "read" ? St.read : St.unread;
    const fill = st.fill, rim = St.edge, S = R.slant;
    nodes.push({ id: tid, kind: "rect", rect: [x + S, y + 1, w - S, h - 2], colour: fill, region: props.tabRegion ?? null });
    nodes.push({ id: tid + ".lf", kind: "sprite", rect: [x, y, S, h], asset: endAsset("left", "fill", fill, R) }, { id: tid + ".rf", kind: "sprite", rect: [x + w, y, S, h], asset: endAsset("right", "fill", fill, R) });
    if (sealed) for (let r = 4; r < h - 2; r += 4) { const s = slantAt(R, r); nodes.push({ id: tid + ".slat." + r, kind: "rect", rect: [x + s + 1, y + r, w - 1, 1], colour: st.slats }); }
    nodes.push({ id: tid + ".et", kind: "rect", rect: [x + S, y, w - S, 1], colour: rim }, { id: tid + ".eb", kind: "rect", rect: [x + S, y + h - 1, w - S, 1], colour: rim });
    nodes.push({ id: tid + ".lr", kind: "sprite", rect: [x, y, S, h], asset: endAsset("left", "rim", rim, R) }, { id: tid + ".rr", kind: "sprite", rect: [x + w, y, S, h], asset: endAsset("right", "rim", rim, R) });
    // the content: the full tab's label (emblem, 8 px, word) and its pips each centred on the tab's slanted middle at their own height; the compact tab's emblem over its pips
    const pipsW = (n) => (n - 1) * R.pip.pitch + R.pip.size, em = F.emblem;
    let pipCx, pipY;
    if (full) {
      const ww = Math.round(ctx.measure(t.word, 16, 400)), bw = em[0] + F.gap + ww, bx = x + F.labelCentre - Math.round(bw / 2), wx = bx + em[0] + F.gap;
      nodes.push({ id: tid + ".emblem", kind: "sprite", rect: [bx, F.labelY, em[0], em[1]], asset: t.emblem });
      nodes.push({ id: tid + ".word", kind: "text", rect: [wx, F.labelY + Math.round((em[1] - ctx.cap(16)) / 2), ww, 20], text: t.word, px: 16, weight: 400, colour: st.word, align: "left" });
      pipCx = x + F.pipsCentre; pipY = F.pipsY;
    } else {
      nodes.push({ id: tid + ".emblem", kind: "sprite", rect: [x + K.emblemCentre - em[0] / 2, K.emblemY, em[0], em[1]], asset: t.emblem });
      pipCx = x + K.pipsCentre; pipY = K.pipsY;
    }
    if (!sealed && t.pips > 0) {
      const px0 = pipCx - Math.round(pipsW(t.pips) / 2);
      for (let k = 0; k < t.pips; k++) {
        const m = t.pipMarks?.[k], px = px0 + k * R.pip.pitch, sz = R.pip.size;
        if (m?.clash) nodes.push({ id: `${tid}.pip.${k}`, kind: "sprite", rect: [px - 1, pipY - 1, 8, 8], asset: props.clashMark });
        else if (k < t.filled) { nodes.push({ id: `${tid}.pip.${k}`, kind: "rect", rect: [px, pipY, sz, sz], colour: st.pip }); if (m?.amber) nodes.push({ id: `${tid}.pipdot.${k}`, kind: "rect", rect: [px + 2, pipY + 2, 2, 2], colour: Cc.changed }); }
        else nodes.push(...cutOutline(`${tid}.pip.${k}`, [px, pipY, sz, sz], st.pip));
        if (m?.ring) nodes.push(...cutOutline(`${tid}.pipring.${k}`, [px - 2, pipY - 2, sz + 4, sz + 4], spec.colours.ring));
      }
    }
    if (t.glint) nodes.push({ id: tid + ".glint", kind: "sprite", rect: [x + S + Math.round(w / 2) - R.glint.size / 2, y + h + R.glint.below, R.glint.size, R.glint.size], asset: props.star });
    if (props.focused === i) rings.push(...focusRing(tid + ".focus", [x, y, w, h], spec, { shape: "tab", colour: spec.colours.ring }));
  });
  nodes.push(...rings);
  return { nodes, tabs: placed.tabs.map((t) => t.rect), run: placed.run, x0: placed.x0, overflow: placed.overflow };
}
