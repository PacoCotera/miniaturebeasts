// The living window (station-layouts.md, Home §5): the vivarium's thin bezel of 8 px and its glass of 640×488, the
// residents standing on the ground band with their feet inside it (nearer ones in front), the with-you bed and the rest
// knob on the bezel's bottom rail. The inside of the glass is a flat plate with its ground band until the master exists.
// props: { colours: { bezel, bezelLight, bezelShade, glass, groundBand }, residents: [{ id, rect, asset, lamp }], bed: { asset, mark }, knob: asset }
// A resident's rect is its drawn box (already lifted when it is focused); residents are drawn in the order given (the view sorts by feet).
export function livingWindow(ctx, id, spec, props) {
  const R = spec.regions, Cc = props.colours, nodes = [], [bx, by, bw, bh] = R.bezel.rect, [gx, gy, gw, gh] = R.glass.rect, gb = R.glass.ground;
  nodes.push({ id: id + ".bezel", kind: "rect", rect: [bx, by, bw, bh], colour: Cc.bezel, region: "bezel" });
  nodes.push({ id: id + ".bl", kind: "rect", rect: [bx, by, bw, 1], colour: Cc.bezelLight }, { id: id + ".bll", kind: "rect", rect: [bx, by, 1, bh], colour: Cc.bezelLight });
  nodes.push({ id: id + ".bs", kind: "rect", rect: [bx, by + bh - 1, bw, 1], colour: Cc.bezelShade }, { id: id + ".bsr", kind: "rect", rect: [bx + bw - 1, by, 1, bh], colour: Cc.bezelShade });
  nodes.push({ id: id + ".glass", kind: "rect", rect: [gx, gy, gw, gh], colour: Cc.glass, region: "glass" });
  nodes.push({ id: id + ".ground", kind: "rect", rect: gb.slice(), colour: Cc.groundBand });
  const B = R.bed;
  nodes.push({ id: id + ".bed", kind: "sprite", rect: B.rect.slice(), asset: props.bed.asset, region: "bed" });
  if (props.bed.mark) nodes.push({ id: id + ".bedmark", kind: "sprite", rect: [B.rect[0] + B.markAt[0], B.rect[1] + B.markAt[1], B.mark[0], B.mark[1]], asset: props.bed.mark });
  for (const r of props.residents) {
    nodes.push({ id: `${id}.${r.id}`, kind: "sprite", rect: r.rect.slice(), asset: r.asset, region: "resident" });
    if (r.lamp) { const [lw, lh] = R.resident.lamp; nodes.push({ id: `${id}.${r.id}.lamp`, kind: "sprite", rect: [r.rect[0] + r.rect[2] - lw, r.rect[1], lw, lh], asset: r.lamp }); }
  }
  const K = R.knob; nodes.push({ id: id + ".knob", kind: "sprite", rect: K.rect.slice(), asset: props.knob, region: "knob" });
  return nodes;
}
