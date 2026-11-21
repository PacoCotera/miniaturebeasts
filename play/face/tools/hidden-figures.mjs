// L4b2: how much of each mibi is hidden by the mibis drawn in front of it, in the vivarium's room-view scenes (the goldens' own scenes, on the Station page).
//   node prototypes/face/tools/hidden-figures.mjs      prints the worst figure of each scene; exit 1 when any is over the limit
// Used by tests/hidden-figures.test.mjs. A figure's box is its drawn picture's ink box (the face log's resident and bed.sleepers nodes, in drawing order, back to front).
import { vivariumStates } from "./vivarium-states.mjs";

export const LIMIT = 0.25;
const FIGURE_REGIONS = new Set(["resident", "bed.sleepers"]);

// boxes [x, y, w, h], back to front: for each, the share of its area covered by the union of the boxes after it
export function hiddenShares(boxes) {
  return boxes.map((b, i) => {
    const front = boxes.slice(i + 1).filter((o) => o[0] < b[0] + b[2] && o[0] + o[2] > b[0] && o[1] < b[1] + b[3] && o[1] + o[3] > b[1]);
    if (!front.length || b[2] * b[3] <= 0) return 0;
    const cuts = front.flatMap((o) => [o[0], o[0] + o[2]]).filter((x) => x > b[0] && x < b[0] + b[2]);
    const xs = [...new Set([b[0], b[0] + b[2], ...cuts])].sort((p, q) => p - q);
    let covered = 0;
    for (let k = 0; k + 1 < xs.length; k++) {
      const mid = (xs[k] + xs[k + 1]) / 2, spans = front.filter((o) => o[0] <= mid && mid < o[0] + o[2]).map((o) => [Math.max(o[1], b[1]), Math.min(o[1] + o[3], b[1] + b[3])]).sort((p, q) => p[0] - q[0]);
      let y = b[1], len = 0;
      for (const [a, z] of spans) { const lo = Math.max(a, y); if (z > lo) { len += z - lo; y = z; } }
      covered += len * (xs[k + 1] - xs[k]);
    }
    return covered / (b[2] * b[3]);
  });
}

// every room-view scene of the goldens: { name, boxes, shares }
export async function measure() {
  const out = [];
  await vivariumStates(async (name, page) => {
    const boxes = await page.evaluate((regs) => (window.__st.face.log()?.nodes ?? []).filter((n) => regs.includes(n[3]) && n[1] === 3).map((n) => [n[9], n[10], n[11], n[12]]), [...FIGURE_REGIONS]);
    if (boxes.length > 1) out.push({ name, boxes, shares: hiddenShares(boxes) });
  });
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = await measure(); let bad = 0;
  for (const r of rows) { const worst = Math.max(...r.shares); if (worst > LIMIT) bad++; console.log(r.name.padEnd(30), String(r.boxes.length).padStart(3), "figures, worst hidden", (worst * 100).toFixed(0) + "%", worst > LIMIT ? "  OVER" : ""); if (worst > LIMIT && process.argv.includes("--detail")) r.boxes.forEach((b, i) => console.log("    ", i, b.join(","), (r.shares[i] * 100).toFixed(0) + "%")); }
  process.exit(bad ? 1 : 0);
}
