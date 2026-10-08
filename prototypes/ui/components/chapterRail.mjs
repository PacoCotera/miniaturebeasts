// The chapter rail (station-layouts.md, "The chapter rail"): y 48, 56 tall, 832 wide; tabs placed by layout.railTabs
// (112 on a 120 pitch up to seven chapters, 96 on 104 for eight, compact 56 for nine to twelve). Inside a tab: the
// chapter emblem 24×24 centred at the top, the chapter's one word in 16 px centred on the line from y 76, and a row
// of 6×6 trait pips on a 10 px pitch centred at y 96. Unread: a 1 px hairline outline, a cool frost fill, hollow
// pips. Read: a solid deep-teal fill, a 1 px lit rim, filled pips. Glint: the four-point star 12×12 at the tab's top
// right. Sealed: the tab drawn shut (slats), an 8×4 notch in its bottom edge, no pips. Focused: the cream ring and
// the tab lifts 4 px. No status words or prices on a tab.
// props: { tabs: [{ id, word, emblem (asset id), pips: n, filled: n, state: "unread" | "read" | "sealed", glint, pipMarks?: [{ amber, clash, ring }] }], focused: index, colours, slats (the id prefix of the slat pictures: `<prefix><w>x<h>`), star (asset id) }
import { railTabs } from "../layout.mjs";
import { focusRing } from "./focusRing.mjs";
import { cutOutline } from "./panel.mjs";

export function chapterRail(ctx, id, region, props) {
  const nodes = [], Cc = props.colours, placed = railTabs(region, props.tabs.length, props.focused);
  if (props.fillGround) nodes.push({ id, kind: "rect", rect: region.rect.slice(), colour: props.ground, region: props.region ?? null });   // the rail's ground, when the stage has none of its own to show through
  placed.tabs.forEach((r, i) => {
    const t = props.tabs[i], focused = i === props.focused, lift = focused ? ctx.spec.focus.lift.chrome * 2 : 0;   // the spec's 4 px lift
    const [x, y0, w, h] = r, y = y0 - lift, tid = `${id}.${i}`, read = t.state === "read", sealed = t.state === "sealed";
    nodes.push({ id: tid, kind: "rect", rect: [x, y, w, h], colour: read ? Cc.readFill : Cc.unreadFill, region: props.tabRegion ?? null });
    if (sealed) nodes.push({ id: tid + ".slats", kind: "sprite", rect: [x, y, w, h], asset: `${props.slats}${w}x${h}` });
    const rim = read ? Cc.readRim : Cc.unreadEdge;
    nodes.push({ id: tid + ".et", kind: "rect", rect: [x, y, w, 1], colour: rim }, { id: tid + ".eb", kind: "rect", rect: [x, y + h - 1, w, 1], colour: rim }, { id: tid + ".el", kind: "rect", rect: [x, y, 1, h], colour: rim }, { id: tid + ".er", kind: "rect", rect: [x + w - 1, y, 1, h], colour: rim });
    if (sealed) nodes.push({ id: tid + ".notch", kind: "rect", rect: [x + Math.round(w / 2) - 4, y + h - 4, 8, 4], colour: props.ground });
    const compact = placed.mode === "compact" && !focused;
    nodes.push({ id: tid + ".emblem", kind: "sprite", rect: [x + Math.round(w / 2) - 12, y + 4, 24, 24], asset: t.emblem });
    if (!compact) { const ww = Math.round(ctx.measure(t.word, 16, 400)); nodes.push({ id: tid + ".word", kind: "text", rect: [x + Math.round(w / 2) - Math.round(ww / 2), y + 28, ww, 20], text: t.word, px: 16, weight: 400, colour: read ? Cc.readWord : Cc.unreadWord, align: "left" }); }
    if (!sealed && t.pips > 0) {
      const pitch = 10, total = (t.pips - 1) * pitch + 6, px0 = x + Math.round(w / 2) - Math.round(total / 2), py = y + 48;
      for (let k = 0; k < t.pips; k++) {
        const m = t.pipMarks?.[k], px = px0 + k * pitch;
        if (m?.clash) nodes.push({ id: `${tid}.pip.${k}`, kind: "sprite", rect: [px - 1, py - 1, 8, 8], asset: props.clashMark });
        else if (k < t.filled) { nodes.push({ id: `${tid}.pip.${k}`, kind: "rect", rect: [px, py, 6, 6], colour: Cc.pip }); if (m?.amber) nodes.push({ id: `${tid}.pipdot.${k}`, kind: "rect", rect: [px + 2, py + 2, 2, 2], colour: Cc.changed }); }
        else nodes.push(...cutOutline(`${tid}.pip.${k}`, [px, py, 6, 6], Cc.pipHollow));
        if (m?.ring) nodes.push(...cutOutline(`${tid}.pipring.${k}`, [px - 2, py - 2, 10, 10], Cc.ring));
      }
    }
    if (t.glint) nodes.push({ id: tid + ".glint", kind: "sprite", rect: [x + w - 20, y + 4, 12, 12], asset: props.star });
    if (focused) nodes.push(...focusRing(tid + ".focus", [x, y, w, h], ctx.spec, { colour: Cc.ring }));
  });
  return { nodes, tabs: placed.tabs, overflow: placed.overflow, mode: placed.mode };
}
