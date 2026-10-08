// The report card (station-layouts.md, Home §5, decided by the UI designer): an instrument readout of 560 wide over the
// vivarium: a heading, one row per crate (its pods pictured, how far the land is explored in words), what was gathered
// (material icons with their figures: the only digits), the Probe's mend (its plates pictured) and the world's lines.
// Rows are 24 px; each has a lead in a 128 px column and its content to the right. Height = 104 + 24 × (crates + the
// Probe row) + (world lines ? 40 + 24 × lines : 0), at most the spec's. A panel with a drop shadow, not paper.
// props: { colours: spec.colours.report, strings: spec.strings.report, layout: spec.regions.report, assets: { pod, shield, shieldGone, energy, data, essence },
//          crates: [{ dev, pods, of, explored }], gathered: { e, d, s, top }, probe: { plates: [bool], paid } | null, world: [string] }
import { textRun } from "./text.mjs";
import { SIZES } from "../type.mjs";

const reachWord = (S, c) => { if (c.dev || !c.of) return ""; const f = c.explored / c.of; return f < 1 / 3 ? S.reach.underThird : f < 2 / 3 ? S.reach.underTwoThirds : f < 1 ? S.reach.underAll : S.reach.all; };
export function reportHeight(L, crates, probe, worldLines) { return 104 + L.rows.h * (crates + (probe ? 1 : 0)) + (worldLines ? 40 + L.rows.h * worldLines : 0); }
export function card(ctx, id, props) {
  const L = props.layout, S = props.strings, Cc = props.colours, [x, y] = L.rect, w = L.rect[2], crates = props.crates.slice(0, L.crates.max), world = props.world.slice(0, L.world.max);
  const h = reportHeight(L, crates.length, props.probe, world.length), nodes = [];
  const px = x + L.pad, lead = px, content = x + L.rows.content, text = (i, str, tx, ty, colour, opt = {}) => nodes.push(...textRun(ctx, `${id}.${i}`, str, tx, ty, { px: 16, colour, ...opt }).nodes);
  nodes.push({ id: id + ".shadow", kind: "rect", rect: [x + 2, y + 3, w, h], colour: Cc.shadow });
  nodes.push({ id, kind: "rect", rect: [x, y, w, h], colour: Cc.fill, region: "report" });
  nodes.push({ id: id + ".et", kind: "rect", rect: [x, y, w, 1], colour: Cc.edge }, { id: id + ".eb", kind: "rect", rect: [x, y + h - 1, w, 1], colour: Cc.edge }, { id: id + ".el", kind: "rect", rect: [x, y, 1, h], colour: Cc.edge }, { id: id + ".er", kind: "rect", rect: [x + w - 1, y, 1, h], colour: Cc.edge });
  nodes.push({ id: id + ".top", kind: "rect", rect: [x + 1, y + 1, w - 2, 1], colour: Cc.top });
  const hw = Math.round(ctx.measure(S.heading, 20, 500));
  nodes.push({ id: id + ".heading", kind: "text", rect: [px, y + L.heading.at[1], hw, 25], text: S.heading, px: 20, weight: SIZES[20], colour: Cc.heading, align: "left" });
  let ry = y + L.rows.first;
  crates.forEach((c, i) => {
    const k = `c${i}`, row = ry + i * L.rows.pitch;
    text(k + ".lead", c.dev ? S.devCrate : S.crate[i], lead, row + L.rows.lineAt, Cc.lead);
    if (!c.pods) text(k + ".none", S.noPods, content, row + L.rows.lineAt, Cc.line);
    else if (c.pods > L.crates.podMax) text(k + ".many", S.manyPods, content, row + L.rows.lineAt, Cc.line);
    else for (let j = 0; j < c.pods; j++) nodes.push({ id: `${id}.${k}.pod${j}`, kind: "sprite", rect: [content + j * L.crates.podPitch, row + L.rows.iconAt, L.rows.icon, L.rows.icon], asset: props.assets.pod });
    const rw = reachWord(S, c); if (rw) text(k + ".reach", rw, x + L.crates.reachAt, row + L.rows.lineAt, Cc.line);
  });
  ry += crates.length * L.rows.pitch + L.gathered.gapAbove;
  text("g.lead", S.gathered, lead, ry + L.rows.lineAt, Cc.lead);
  let gx = content;
  for (const [key, v] of [["energy", props.gathered.e], ["data", props.gathered.d], ["essence", props.gathered.s]]) {
    nodes.push({ id: `${id}.g.${key}`, kind: "sprite", rect: [gx, ry + L.rows.iconAt, L.gathered.icon, L.gathered.icon], asset: props.assets[key] });
    const t = "+" + v, tw = Math.round(ctx.measure(t, 16, 400)); text(`g.${key}.v`, t, gx + L.gathered.icon + L.gathered.gap, ry + L.rows.lineAt, Cc.figure); gx += L.gathered.icon + L.gathered.gap + tw + L.gathered.between;
  }
  if (props.gathered.top) text("g.top", S.topUp, gx - L.gathered.between + 8, ry + L.rows.lineAt, Cc.lead);
  ry += L.rows.pitch;
  if (props.probe) {
    text("p.lead", S.probe, lead, ry + L.rows.lineAt, Cc.lead);
    props.probe.plates.forEach((whole, j) => nodes.push({ id: `${id}.p.plate${j}`, kind: "sprite", rect: [content + j * L.probe.platePitch, ry + L.rows.iconAt, L.probe.plateIcon, L.probe.plateIcon], asset: whole ? props.assets.shield : props.assets.shieldGone }));
    text("p.mend", props.probe.paid ? S.mendedPaid.replace("{price}", "⚡ " + props.probe.paid) : S.mendedFree, content + props.probe.plates.length * L.probe.platePitch + 8, ry + L.rows.lineAt, Cc.line);
    ry += L.rows.pitch;
  }
  if (world.length) {
    ry += L.world.gapAbove; text("w.lead", S.world, lead, ry + L.rows.lineAt, Cc.lead); ry += L.rows.pitch;
    world.forEach((l, j) => { const row = ry + j * L.rows.pitch; nodes.push({ id: `${id}.w${j}.bullet`, kind: "rect", rect: [x + L.world.bullet[0], row + L.world.bullet[1], L.world.bullet[2], L.world.bullet[3]], colour: Cc.bullet }); text(`w${j}`, l, x + L.world.lineAt, row + L.rows.lineAt, Cc.line); });
  }
  return nodes;
}
