// The `roster` check stage on the Library (chunk 6): the registry's roster rules (chunk 1) and roster.read48, which asks that every pair of kinds' 48 px
// silhouettes differ (IoU below 0.85), measured on the art desk's stands until a kind is built in the studio. A kind with no stand file is listed, never skipped
// silently. The stands live in the art desk's job folder, outside the repo: pass `standsDir`, or set MB_STANDS_DIR; with neither found the row is amber.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { LANGUAGE, roster, validateRegistry } from "./language.mjs";
import { decodePNG } from "./png.mjs";

export const READ48_MAX_IOU = 0.85;
export const DEFAULT_STANDS = "/home/mb/mb/iwq/results/T-20261105-roster-concepts";

// The 48x48 silhouette of each stand: a boolean mask of the pixels whose alpha is over half.
export function standMasks(dir) {
  const masks = new Map();
  if (!dir || !existsSync(dir)) return masks;
  for (const f of readdirSync(dir)) {
    const m = /^stand-(S\d\d)-.*-48x48\.png$/.exec(f);
    if (!m) continue;
    const im = decodePNG(readFileSync(`${dir}/${f}`));
    const px = im.data ?? im.pixels, ch = px.length / (im.width * im.height), mask = new Uint8Array(im.width * im.height);
    for (let i = 0; i < mask.length; i++) mask[i] = ch === 4 ? (px[i * 4 + 3] > 127 ? 1 : 0) : 1;
    masks.set(m[1], mask);
  }
  return masks;
}
export function iou(a, b) {
  let i = 0, u = 0;
  for (let k = 0; k < a.length; k++) { i += a[k] & b[k]; u += a[k] | b[k]; }
  return u ? i / u : 0;
}

export function read48(reg = LANGUAGE, standsDir = process.env.MB_STANDS_DIR ?? DEFAULT_STANDS) {
  const masks = standMasks(standsDir), ids = roster(reg).map((k) => k.id), have = ids.filter((id) => masks.has(id)), missing = ids.filter((id) => !masks.has(id));
  const pairs = [];
  for (let i = 0; i < have.length; i++) for (let j = i + 1; j < have.length; j++) pairs.push({ a: have[i], b: have[j], iou: Math.round(iou(masks.get(have[i]), masks.get(have[j])) * 1000) / 1000 });
  pairs.sort((x, y) => y.iou - x.iou);
  const bad = pairs.filter((p) => p.iou >= READ48_MAX_IOU);
  const msgs = bad.map((p) => `${p.a} and ${p.b} read alike at 48 px (IoU ${p.iou}, limit under ${READ48_MAX_IOU})`);
  if (!masks.size) msgs.push(`no stands found in ${standsDir}: nothing measured`);
  return { id: "roster.read48", level: "red", pass: msgs.length === 0, messages: msgs, measured: have.length, missing, closest: pairs.slice(0, 3), limit: READ48_MAX_IOU };
}

// Every roster row the Library shows: the registry's rules, then read48.
export function rosterRows(opts = {}) {
  return [...validateRegistry(opts.registry ?? LANGUAGE), read48(opts.registry ?? LANGUAGE, opts.standsDir ?? process.env.MB_STANDS_DIR ?? DEFAULT_STANDS)];
}
