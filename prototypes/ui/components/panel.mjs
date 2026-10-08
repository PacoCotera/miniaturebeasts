// A panel: a filled pane with a 1 px edge (the open page's deep pane, the stamp's bone plate, a card). Hairlines
// are the one exception to the 8 px grid (station-layouts.md).
export function panel(id, rect, { fill, edge = null, region = null }) {
  const [x, y, w, h] = rect, nodes = [{ id, kind: "rect", rect: [x, y, w, h], colour: fill, region }];
  if (edge) nodes.push({ id: id + ".et", kind: "rect", rect: [x, y, w, 1], colour: edge }, { id: id + ".eb", kind: "rect", rect: [x, y + h - 1, w, 1], colour: edge }, { id: id + ".el", kind: "rect", rect: [x, y, 1, h], colour: edge }, { id: id + ".er", kind: "rect", rect: [x + w - 1, y, 1, h], colour: edge });
  return nodes;
}
// A 1 px hairline, horizontal or vertical.
export const hairline = (id, x, y, len, colour, vertical = false) => ({ id, kind: "rect", rect: vertical ? [x, y, 1, len] : [x, y, len, 1], colour });
// A 1 px outline with its corners cut, drawn as four rectangles (a hollow pip, the ring round a pip).
export function cutOutline(id, rect, colour) {
  const [x, y, w, h] = rect;
  return [{ id: id + ".t", kind: "rect", rect: [x + 1, y, w - 2, 1], colour }, { id: id + ".b", kind: "rect", rect: [x + 1, y + h - 1, w - 2, 1], colour }, { id: id + ".l", kind: "rect", rect: [x, y + 1, 1, h - 2], colour }, { id: id + ".r", kind: "rect", rect: [x + w - 1, y + 1, 1, h - 2], colour }];
}
