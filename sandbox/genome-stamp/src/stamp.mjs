// Genome -> stamp marks (in cell units) -> SVG or an RGBA raster. The SVG and
// the raster draw the same list; same genome, same bytes.
import { frameFor } from "./frames.mjs";
import { encodeCells, ringCells, borderPattern } from "./codec.mjs";

export const PALETTE = {
  plate: "#fbf8f0", ink: "#2b2a27", hair: "#b9b2a2",
  copies: ["#1f5a85", "#a3392c", "#4f7a2a", "#6f4a94"],
  pale: ["#d6e2ec", "#efd7d2", "#dfe8d2", "#e4dcef"],
  tint: ["#f3e9da", "#e7efe0", "#e6eaf2", "#f1e4e8", "#e9e5f1", "#e0eeeb", "#f1ecd8", "#f6e3d6"],
};
export const QUIET = 1; // white margin, in cells, on each side
const FILL = 0.84; // a set cell fills 84% of its square

export function stampGeometry(genome, { mono = false } = {}) {
  const frame = frameFor(genome.species, genome.version);
  if (!frame) throw new Error(`no frame for species ${genome.species} v${genome.version}`);
  const { L, cells, crc, mask } = encodeCells(frame, genome);
  const N = L.N, P = PALETTE, ink = mono ? "#000000" : P.ink;
  const marks = [];
  const rect = (x0, y0, x1, y1, fill) => marks.push({ k: "rect", x0, y0, x1, y1, fill });
  const cell = (r, c, fill, f = FILL) => rect(c + (1 - f) / 2, r + (1 - f) / 2, c + (1 + f) / 2, r + (1 + f) / 2, fill);
  // chapter blocks: a tint behind read blocks, an outline for unread ones (screen only)
  for (const blk of L.blocks) {
    const { r0, c0, r1, c1 } = blk.rect, read = Math.floor(mask / 2 ** blk.chapter) & 1;
    if (mono) continue;
    if (read) rect(c0 + 0.04, r0 + 0.04, c1 - 0.04, r1 - 0.04, P.tint[blk.chapter % P.tint.length]);
    else {
      const t = 0.06, i = 0.12;
      rect(c0 + i, r0 + i, c1 - i, r0 + i + t, P.hair); rect(c0 + i, r1 - i - t, c1 - i, r1 - i, P.hair);
      rect(c0 + i, r0 + i, c0 + i + t, r1 - i, P.hair); rect(c1 - i - t, r0 + i, c1 - i, r1 - i, P.hair);
    }
  }
  // ring 0: perforation dots on even cells
  for (const [r, c] of ringCells(N, 0)) if ((r + c) % 2 === 0) marks.push({ k: "circle", cx: c + 0.5, cy: r + 0.5, r: 0.3, fill: ink });
  // ring 1: the solid frame
  rect(1, 1, N - 1, 2, ink); rect(1, N - 2, N - 1, N - 1, ink); rect(1, 2, 2, N - 2, ink); rect(N - 2, 2, N - 1, N - 2, ink);
  // ring 2: the species border
  const bp = borderPattern(frame, N);
  bp.cells.forEach(([r, c], i) => { if (bp.bits[i]) cell(r, c, ink); });
  // the glyph
  frame.glyph.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "#") cell(L.glyph.r0 + y, L.glyph.c0 + x, ink, 0.92); }));
  // data, mask, header, CRC, parity
  for (const [key, v] of cells) {
    const r = Math.floor(key / N), c = key % N;
    if (v.kind === "data") {
      if (v.v) cell(r, c, mono ? ink : P.copies[v.copy % 4]);
      else if (!mono) cell(r, c, P.pale[v.copy % 4]);
    } else if (v.v && v.kind !== "unread") cell(r, c, ink);
  }
  return { frame, N, L, marks, plate: mono ? "#ffffff" : P.plate, crc, mask };
}

const f2 = (v) => (Math.round(v * 1000) / 1000).toString();
// side = the stamp's width in px (perforation edge to edge); the image adds the quiet zone
export const imageSize = (side, N) => Math.ceil(side * (1 + (2 * QUIET) / N));

export function toSVG(geom, side = 300, { title } = {}) {
  const W = imageSize(side, geom.N), u = side / geom.N, o = (W - side) / 2;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}" shape-rendering="crispEdges">`];
  if (title) out.push(`<title>${title.replace(/[<&]/g, "")}</title>`);
  out.push(`<rect width="${W}" height="${W}" fill="${geom.plate}"/>`);
  for (const m of geom.marks) {
    if (m.k === "rect") out.push(`<rect x="${f2(o + m.x0 * u)}" y="${f2(o + m.y0 * u)}" width="${f2((m.x1 - m.x0) * u)}" height="${f2((m.y1 - m.y0) * u)}" fill="${m.fill}"/>`);
    else out.push(`<circle cx="${f2(o + m.cx * u)}" cy="${f2(o + m.cy * u)}" r="${f2(m.r * u)}" fill="${m.fill}" shape-rendering="geometricPrecision"/>`);
  }
  out.push("</svg>");
  return out.join("\n") + "\n";
}

const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// Rasterize at `side` px (may be fractional, e.g. 20 mm at 203 dpi).
export function rasterize(geom, side, { ss = 4, bilevel = false, size } = {}) {
  const N = geom.N, W = size ?? imageSize(side, N), u = side / N, o = (W - side) / 2;
  const idx = Array.from({ length: N * N }, () => []);
  geom.marks.forEach((m, i) => {
    const [x0, y0, x1, y1] = m.k === "rect" ? [m.x0, m.y0, m.x1, m.y1] : [m.cx - m.r, m.cy - m.r, m.cx + m.r, m.cy + m.r];
    for (let r = Math.max(0, Math.floor(y0)); r < Math.min(N, Math.ceil(y1)); r++)
      for (let c = Math.max(0, Math.floor(x0)); c < Math.min(N, Math.ceil(x1)); c++) idx[r * N + c].push(i);
  });
  const cols = geom.marks.map((m) => hexRGB(m.fill)), plate = hexRGB(geom.plate);
  const data = new Uint8ClampedArray(W * W * 4), n2 = ss * ss;
  for (let py = 0; py < W; py++)
    for (let px = 0; px < W; px++) {
      let R = 0, G = 0, Bc = 0;
      for (let sy = 0; sy < ss; sy++)
        for (let sx = 0; sx < ss; sx++) {
          const x = (px + (sx + 0.5) / ss - o) / u, y = (py + (sy + 0.5) / ss - o) / u;
          let col = plate;
          if (x >= 0 && y >= 0 && x < N && y < N) {
            for (const i of idx[Math.floor(y) * N + Math.floor(x)]) {
              const m = geom.marks[i];
              const hit = m.k === "rect" ? x >= m.x0 && x < m.x1 && y >= m.y0 && y < m.y1 : (x - m.cx) ** 2 + (y - m.cy) ** 2 <= m.r * m.r;
              if (hit) col = cols[i];
            }
          }
          R += col[0]; G += col[1]; Bc += col[2];
        }
      const q = (py * W + px) * 4;
      if (bilevel) { const v = (0.299 * R + 0.587 * G + 0.114 * Bc) / n2 < 128 ? 0 : 255; data[q] = data[q + 1] = data[q + 2] = v; }
      else { data[q] = R / n2; data[q + 1] = G / n2; data[q + 2] = Bc / n2; }
      data[q + 3] = 255;
    }
  return { width: W, height: W, data };
}
