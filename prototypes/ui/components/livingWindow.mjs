// The living window (station-layouts.md, Home §4, §5): the vivarium's bezel of 8 px in brushed metal (lit top and left
// edge, shaded bottom and right, a 1 px outer hairline) and its glass of 640×488 with a 1 px frost edge at the top and
// left; the residents standing on the ground band with their feet inside it (nearer ones in front); the with-you bed and
// the rest knob. Until the master exists the glass holds one flat placeholder plate: the back, the ground band with its
// lit top row, and the strip under the band.
// props: { colours: spec.colours (bezel, glass), residents: [{ id, rect, asset, lamp }], bed: { asset, mark: { asset, size } | null }, knob: asset }
// A resident's rect is its drawn box (already lifted when it is focused); residents are drawn in the order given (the view sorts by feet).
export function livingWindow(ctx, id, spec, props) {
  const R = spec.regions, Bz = props.colours.bezel, Gl = props.colours.glass, nodes = [], [bx, by, bw, bh] = R.bezel.rect, [gx, gy, gw, gh] = R.glass.rect, gb = R.glass.ground;
  const rect = (i, r, colour, extra = {}) => nodes.push({ id: `${id}.${i}`, kind: "rect", rect: r, colour, ...extra });
  rect("bezel", [bx, by, bw, bh], Bz.fill, { region: "bezel" });
  rect("lit.t", [bx + 1, by + 1, bw - 2, 1], Bz.light); rect("lit.l", [bx + 1, by + 1, 1, bh - 2], Bz.light);
  rect("shade.b", [bx + 1, by + bh - 2, bw - 2, 1], Bz.shade); rect("shade.r", [bx + bw - 2, by + 1, 1, bh - 2], Bz.shade);
  rect("edge.t", [bx, by, bw, 1], Bz.edge); rect("edge.b", [bx, by + bh - 1, bw, 1], Bz.edge); rect("edge.l", [bx, by, 1, bh], Bz.edge); rect("edge.r", [bx + bw - 1, by, 1, bh], Bz.edge);
  rect("glass", [gx, gy, gw, gh], Gl.back, { region: "glass" });
  rect("ground", gb.slice(), Gl.ground); rect("groundTop", [gb[0], gb[1], gb[2], 1], Gl.groundTop);
  rect("foot", [gx, gb[1] + gb[3], gw, gy + gh - (gb[1] + gb[3])], Gl.foot);
  rect("glass.t", [gx, gy, gw, 1], Gl.edge); rect("glass.l", [gx, gy, 1, gh], Gl.edge);
  const B = R.bed;
  nodes.push({ id: id + ".bed", kind: "sprite", rect: B.rect.slice(), asset: props.bed.asset, region: "bed" });
  if (props.bed.mark) nodes.push({ id: id + ".bedmark", kind: "sprite", rect: [B.rect[0] + B.markAt[0], B.rect[1] + B.markAt[1], props.bed.mark.size[0], props.bed.mark.size[1]], asset: props.bed.mark.asset });
  for (const r of props.residents) {
    nodes.push({ id: `${id}.${r.id}`, kind: "sprite", rect: r.rect.slice(), asset: r.asset, region: "resident" });
    if (r.lamp) { const [lw, lh] = R.resident.lamp; nodes.push({ id: `${id}.${r.id}.lamp`, kind: "sprite", rect: [r.rect[0] + r.rect[2] - lw, r.rect[1], lw, lh], asset: r.lamp }); }
  }
  const K = R.knob; nodes.push({ id: id + ".knob", kind: "sprite", rect: K.rect.slice(), asset: props.knob, region: "knob" });
  return nodes;
}
