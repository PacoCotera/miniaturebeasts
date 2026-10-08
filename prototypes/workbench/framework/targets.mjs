// Reference silhouettes by kind. For each roster species a small hand-drawn target under
// frames/targets/: the animal the taxonomy says it resembles, drawn in side view facing right from a
// few primitives on a 100×100 canvas (y down), the way a thumbnail is blocked in, each primitive
// tagged with the part it draws. The census fits each target into the 48 px box exactly as it fits
// a body's silhouette (silhouetteMask: bounds into the box with a 4 % margin) and scores every
// species two ways:
//   - the coarse gate: IoU of the whole-body silhouette against its own target and the best wrong one;
//   - the parts score: the clan's defining parts (roster.mjs CLANS[].parts), measured on the rendered
//     silhouette (raster.mjs partMasks) and on the target's tagged parts, compared measure by measure.
// A species passes when its parts score beats the score against every wrong kind's target by
// PART_MARGIN. The README says why that margin.
//
// Shapes: {"ellipse": [cx, cy, rx, ry, rotationDegrees?], "part": "head"}, {"capsule": [x1, y1, x2,
// y2, r1, r2?]} (a tapered stroke), {"polygon": [[x, y], ...]}, {"dome": [cx, cy, rx, ry]} (the
// upper half of an ellipse). Everything is a union; a pixel belongs to the smallest-part shape that
// covers it (PRIORITY). Parts: body, head, muzzle, ear, tail, leg, crest, antenna, flap, shell,
// skirt, leaf. These are targets to measure against, not art.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export const TARGET_MARGIN = 0.04; // coarse gate: own IoU must beat the best wrong target's by this much
export const PART_MARGIN = 0.05;   // parts score: own must beat every wrong kind's by this much (one pixel of one part on a 48 px head; README)
export const TAU = 0.4;            // a part measure a full TAU off scores zero; measures are ratios of head or body size
export const SCHEMA = "mb-target-mask/1";
export const PARTS = ["body", "head", "muzzle", "ear", "tail", "leg", "crest", "antenna", "flap", "shell", "skirt", "leaf", "feeler"];
const PRIORITY = ["ear", "muzzle", "crest", "antenna", "tail", "leg", "leaf", "flap", "skirt", "feeler", "shell", "head", "body"];

function insideShape(s, x, y) {
  if (s.ellipse) {
    const [cx, cy, rx, ry, rot = 0] = s.ellipse, a = (-rot * Math.PI) / 180;
    const dx = x - cx, dy = y - cy, u = dx * Math.cos(a) - dy * Math.sin(a), w = dx * Math.sin(a) + dy * Math.cos(a);
    return (u / rx) ** 2 + (w / ry) ** 2 <= 1;
  }
  if (s.dome) { const [cx, cy, rx, ry] = s.dome; return y <= cy && ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1; }
  if (s.capsule) {
    const [x1, y1, x2, y2, r1, r2 = r1] = s.capsule;
    const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2)) : 0;
    const px = x1 + t * dx, py = y1 + t * dy, r = r1 + (r2 - r1) * t;
    return (x - px) ** 2 + (y - py) ** 2 <= r * r;
  }
  if (s.polygon) {
    const p = s.polygon;
    let hit = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i], [xj, yj] = p[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  }
  throw new Error(`unknown shape ${JSON.stringify(s)}`);
}
// The part at a point: the highest-priority part among the shapes that cover it, or null.
function partAt(shapes, x, y) {
  let best = null, bestRank = Infinity;
  for (const s of shapes) {
    const rank = PRIORITY.indexOf(s.part ?? "body");
    if (rank < bestRank && insideShape(s, x, y)) { best = s.part ?? "body"; bestRank = rank; }
  }
  return best;
}

// The target as 48 px masks, fitted like silhouetteMask: its bounds into the box with a 4 % margin.
// Returns { all, parts: { part: mask } }.
export function rasterizeTarget(target, n = 48, margin = 0.04) {
  const shapes = target.shapes;
  for (const s of shapes) if (s.part && !PARTS.includes(s.part)) throw new Error(`${target.species}: unknown part ${s.part}`);
  const fine = 400;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let j = 0; j < fine; j++) for (let i = 0; i < fine; i++) {
    const x = ((i + 0.5) * 100) / fine, y = ((j + 0.5) * 100) / fine;
    if (partAt(shapes, x, y)) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (!Number.isFinite(minX)) throw new Error(`${target.species}: empty target`);
  const w = maxX - minX, h = maxY - minY;
  const scale = Math.min((n * (1 - 2 * margin)) / w, (n * (1 - 2 * margin)) / h);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const all = new Uint8Array(n * n), parts = {};
  const ss = 4;
  for (let py = 0; py < n; py++) for (let px = 0; px < n; px++) {
    const votes = {};
    let hits = 0;
    for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
      const x = cx + (px + (sx + 0.5) / ss - n / 2) / scale, y = cy + (py + (sy + 0.5) / ss - n / 2) / scale;
      const p = partAt(shapes, x, y);
      if (p) { hits++; votes[p] = (votes[p] ?? 0) + 1; }
    }
    if (hits * 2 < ss * ss) continue;
    all[py * n + px] = 1;
    const part = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
    (parts[part] ??= new Uint8Array(n * n))[py * n + px] = 1;
  }
  return { all, parts };
}

export function loadTargets(dir) {
  const targets = {};
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const t = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
    if (t.schema !== SCHEMA) throw new Error(`${f}: schema ${t.schema}`);
    if (t.view !== "side" || t.facing !== "right") throw new Error(`${f}: targets are side views facing right`);
    const masks = rasterizeTarget(t);
    targets[t.species] = { ...t, mask: masks.all, parts: masks.parts, measures: partMeasures(masks) };
  }
  return targets;
}

export const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] && b[k]) i++; if (a[k] || b[k]) u++; } return u ? i / u : 0; };

// --- part measures -----------------------------------------------------------------------------------
function bbox(mask, n) {
  let x0 = n, x1 = -1, y0 = n, y1 = -1, area = 0, sx = 0, sy = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (mask[y * n + x]) { area++; sx += x; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (!area) return null;
  return { x0, x1, y0, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, area, cx: sx / area, cy: sy / area };
}

// What an artist would measure on a 48 px silhouette, per part, as ratios of the head's height (face
// parts) or the body's height and area (the rest), so the same numbers come off a target and a body.
export function partMeasures(masks, n = 48) {
  const all = bbox(masks.all, n);
  if (!all) return {};
  const head = masks.parts.head ? bbox(masks.parts.head, n) : null;
  const hh = head ? head.h : 0.3 * all.h, hw = head ? head.w : 0.3 * all.w, headArea = head ? head.area : 0.09 * all.area;
  const hcx = head ? head.cx : all.cx, htop = head ? head.y0 : all.y0;
  const m = { body: { aspect: all.h / all.w, bulk: (masks.parts.body ? bbox(masks.parts.body, n)?.area ?? 0 : 0) / all.area } };
  if (head) m.head = { size: hh / all.h, bulk: headArea / all.area };
  const part = (name) => (masks.parts[name] ? bbox(masks.parts[name], n) : null);
  const mz = part("muzzle"); if (mz) m.muzzle = { length: mz.w / hh, bulk: mz.area / headArea };
  const ear = part("ear"); if (ear) m.ear = { height: (htop - ear.y0) / hh, set: (ear.cx - hcx) / hw };
  const crest = part("crest"); if (crest) m.crest = { height: (htop - crest.y0) / hh, bulk: crest.area / headArea };
  const ant = part("antenna"); if (ant) m.antenna = { height: (htop - ant.y0) / hh }; // thin things have no bulk at 48 px
  const tail = part("tail"); if (tail) m.tail = { length: Math.max(tail.w, tail.h) / all.h, bulk: tail.area / all.area, carry: (all.cy - tail.cy) / all.h };
  const leg = part("leg"); if (leg) m.leg = { length: leg.h / all.h, bulk: leg.area / all.area };
  for (const name of ["flap", "shell", "skirt", "leaf", "feeler"]) { const p = part(name); if (p) m[name] = { height: p.h / all.h, bulk: p.area / all.area }; }
  return m;
}

// The parts score of body measures against target measures over the clan's defining parts: per part
// 1 − mean |difference| / TAU (floored at zero), zero when one side lacks the part; the mean over parts.
export function partScore(body, target, parts) {
  if (!parts.length) return 0;
  let sum = 0;
  for (const name of parts) {
    const a = body[name], b = target[name];
    if (!a || !b) continue;
    const keys = Object.keys(b);
    const diff = keys.reduce((s, k) => s + Math.abs((a[k] ?? 0) - b[k]), 0) / keys.length;
    sum += Math.max(0, 1 - diff / TAU);
  }
  return sum / parts.length;
}

// Per species: the coarse gate (IoU own, best wrong), the parts score (own, best wrong kind), the
// share of individuals nearest their own target by parts, and the verdict (parts margin ≥ PART_MARGIN).
// A row: { id, parts: [...clan parts], specMasks: { side: { all, parts } }, individuals: [{ side: { all, parts } }] }.
export function targetScores(rows, targets, { margin = TARGET_MARGIN, partMargin = PART_MARGIN } = {}) {
  const ids = Object.keys(targets);
  return rows.map((row) => {
    const own = targets[row.id];
    if (!own) return { id: row.id, own: null, bestWrong: null, margin: null, parts: null, pass: false, individualsOwn: null, note: "no target" };
    const spec = row.specMasks.side;
    const iouOf = Object.fromEntries(ids.map((id) => [id, iou(spec.all, targets[id].mask)]));
    const wrong = ids.filter((id) => id !== row.id).map((id) => ({ id, iou: iouOf[id] })).sort((a, b) => b.iou - a.iou)[0];
    const measures = partMeasures(spec);
    const scoreOf = Object.fromEntries(ids.map((id) => [id, partScore(measures, targets[id].measures, row.parts)]));
    const wrongParts = ids.filter((id) => id !== row.id).map((id) => ({ id, score: scoreOf[id] })).sort((a, b) => b.score - a.score)[0];
    let nearestOwn = 0;
    for (const ind of row.individuals) {
      const im = partMeasures(ind.side);
      const s = Object.fromEntries(ids.map((id) => [id, partScore(im, targets[id].measures, row.parts)]));
      if (ids.every((id) => id === row.id || s[id] < s[row.id])) nearestOwn++;
    }
    const k = row.individuals.length || 1;
    const m = iouOf[row.id] - wrong.iou, pm = scoreOf[row.id] - wrongParts.score;
    return {
      id: row.id, own: Number(iouOf[row.id].toFixed(3)), bestWrong: { id: wrong.id, iou: Number(wrong.iou.toFixed(3)) }, margin: Number(m.toFixed(3)), coarse: m >= margin,
      parts: { list: row.parts, own: Number(scoreOf[row.id].toFixed(3)), bestWrong: { id: wrongParts.id, score: Number(wrongParts.score.toFixed(3)) }, margin: Number(pm.toFixed(3)), measures },
      pass: pm >= partMargin, individualsOwn: Number((nearestOwn / k).toFixed(3)),
    };
  });
}
