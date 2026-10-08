// Reference silhouettes by kind. For each roster species a small hand-drawn target under
// frames/targets/: the animal the taxonomy says it resembles, drawn in side view facing right from a
// few primitives on a 100×100 canvas (y down), the way a thumbnail is blocked in. The census fits each
// target into the 48 px box exactly as it fits a body's silhouette (silhouetteMask: bounds into the
// box with a 4 % margin) and reports every species' IoU against its own target and against the best
// wrong one; a species passes when its own target is nearest by a margin.
//
// Shapes: {"ellipse": [cx, cy, rx, ry, rotationDegrees?]}, {"capsule": [x1, y1, x2, y2, r1, r2?]}
// (a tapered stroke), {"polygon": [[x, y], ...]}, {"dome": [cx, cy, rx, ry]} (the upper half of an
// ellipse). Everything is a union. These are targets to measure against, not art.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export const TARGET_MARGIN = 0.04; // own IoU must beat the best wrong target's by this much
export const SCHEMA = "mb-target-mask/1";

function inside(shapes, x, y) {
  for (const s of shapes) {
    if (s.ellipse) {
      const [cx, cy, rx, ry, rot = 0] = s.ellipse, a = (-rot * Math.PI) / 180;
      const dx = x - cx, dy = y - cy, u = dx * Math.cos(a) - dy * Math.sin(a), w = dx * Math.sin(a) + dy * Math.cos(a);
      if ((u / rx) ** 2 + (w / ry) ** 2 <= 1) return true;
    } else if (s.dome) {
      const [cx, cy, rx, ry] = s.dome;
      if (y <= cy && ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) return true;
    } else if (s.capsule) {
      const [x1, y1, x2, y2, r1, r2 = r1] = s.capsule;
      const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy;
      const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2)) : 0;
      const px = x1 + t * dx, py = y1 + t * dy, r = r1 + (r2 - r1) * t;
      if ((x - px) ** 2 + (y - py) ** 2 <= r * r) return true;
    } else if (s.polygon) {
      const p = s.polygon;
      let hit = false;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const [xi, yi] = p[i], [xj, yj] = p[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
      }
      if (hit) return true;
    } else throw new Error(`unknown shape ${JSON.stringify(s)}`);
  }
  return false;
}

// The target as a 48 px mask, fitted like silhouetteMask: its bounds into the box with a 4 % margin.
export function rasterizeTarget(target, n = 48, margin = 0.04) {
  const shapes = target.shapes;
  const fine = 400;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let j = 0; j < fine; j++) for (let i = 0; i < fine; i++) {
    const x = ((i + 0.5) * 100) / fine, y = ((j + 0.5) * 100) / fine;
    if (inside(shapes, x, y)) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (!Number.isFinite(minX)) throw new Error(`${target.species}: empty target`);
  const w = maxX - minX, h = maxY - minY;
  const scale = Math.min((n * (1 - 2 * margin)) / w, (n * (1 - 2 * margin)) / h);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const mask = new Uint8Array(n * n);
  const ss = 4;
  for (let py = 0; py < n; py++) for (let px = 0; px < n; px++) {
    let hits = 0;
    for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
      const x = cx + (px + (sx + 0.5) / ss - n / 2) / scale, y = cy + (py + (sy + 0.5) / ss - n / 2) / scale;
      if (inside(shapes, x, y)) hits++;
    }
    mask[py * n + px] = hits * 2 >= ss * ss ? 1 : 0;
  }
  return mask;
}

export function loadTargets(dir) {
  const targets = {};
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const t = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
    if (t.schema !== SCHEMA) throw new Error(`${f}: schema ${t.schema}`);
    if (t.view !== "side" || t.facing !== "right") throw new Error(`${f}: targets are side views facing right`);
    targets[t.species] = { ...t, mask: rasterizeTarget(t) };
  }
  return targets;
}

export const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] && b[k]) i++; if (a[k] || b[k]) u++; } return u ? i / u : 0; };

// Per species: IoU of its type specimen's side silhouette against its own target and the best wrong
// one, the share of its individuals whose nearest target is its own, and the verdict.
export function targetScores(rows, targets, margin = TARGET_MARGIN) {
  const ids = Object.keys(targets);
  return rows.map((row) => {
    const own = targets[row.id];
    if (!own) return { id: row.id, own: null, bestWrong: null, margin: null, pass: false, individualsOwn: null, note: "no target" };
    const score = (mask) => Object.fromEntries(ids.map((id) => [id, iou(mask, targets[id].mask)]));
    const spec = score(row.specMasks.side);
    const wrong = ids.filter((id) => id !== row.id).map((id) => ({ id, iou: spec[id] })).sort((a, b) => b.iou - a.iou)[0];
    let nearestOwn = 0;
    for (const ind of row.individuals) {
      const s = score(ind.side);
      if (ids.every((id) => id === row.id || s[id] < s[row.id])) nearestOwn++;
    }
    const k = row.individuals.length || 1;
    const m = spec[row.id] - wrong.iou;
    return { id: row.id, own: Number(spec[row.id].toFixed(3)), bestWrong: { id: wrong.id, iou: Number(wrong.iou.toFixed(3)) }, margin: Number(m.toFixed(3)), pass: m >= margin, individualsOwn: Number((nearestOwn / k).toFixed(3)) };
  });
}
