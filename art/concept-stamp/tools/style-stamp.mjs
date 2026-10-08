#!/usr/bin/env node
// Styled genome stamp: the encoder's cells, re-dressed within the prototype's "For the art
// director" allowances. Nothing moves; only paper, dot shape, cell ink shape, tints and hues change.
//
//   node style-stamp.mjs <genome.json> --family c01|c03|neutral --paper tome|bench --size 300 --out name
// Owner decisions (2026-10-07): perforations are round in every clan; the border cells alone carry the clan
// family; copy hues lagoon and brick; no glint or amber on the stamp, ever; flair, not ornament. Clans are
// keyed by the taxonomy's codes (C01 is the hopper frame's clan, C03 the glowtail frame's).
//   -> name.svg (and name.png when --png is given, rasterized with the prototype's own rasterizer
//      for the shapes it knows; rounded shapes go through Chromium in render-svg.cjs)
import { readFileSync, writeFileSync } from "node:fs";
import { frameFor } from "../../../prototypes/genome-stamp/src/frames.mjs";
import { encodeCells, ringCells, borderPattern, stampCode } from "../../../prototypes/genome-stamp/src/codec.mjs";
import { imageSize } from "../../../prototypes/genome-stamp/src/stamp.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const file = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!file) { console.error("usage: node style-stamp.mjs <genome.json> [--family trebola|fanalia|neutral] [--paper tome|bench] [--size 300] [--out name]"); process.exit(2); }

// One family per clan: the border cells' ink and shape, and the frame's ink. Perforations are round everywhere.
export const FAMILIES = {
  c01: { ink: "#2e3a2b", frame: "#2e3a2b", border: { shape: "leaf", rx: 0.34 }, glyph: "#243020", halo: "#eef1e4" },
  c03: { ink: "#3b2a1c", frame: "#3b2a1c", border: { shape: "lantern", cut: 0.22 }, glyph: "#2d2015", halo: "#f4ecdf" },
  neutral: { ink: "#2b2a27", frame: "#2b2a27", border: { shape: "square", rx: 0.1 }, glyph: "#1f1e1c", halo: "#efede8" },
};
export const PAPER = { tome: "#f6efe0", bench: "#eef0f2", print: "#ffffff" };
// Copy hues, pale for zero. Both grey dark (luma ~ 0.28 and 0.33).
export const COPIES = ["#1e5f7c", "#a8432c", "#4f7a2a", "#6f4a94"];
export const PALE = ["#d3e2ea", "#f0d9d2", "#dfe8d2", "#e4dcef"];
// Chapter tints by name, so Coat is the same tint on every species.
export const TINTS = { "Coat": "#f3e8d6", "Face": "#e7efdf", "Shape": "#e3e9f3", "Legs & tail": "#f1e3e8", "Movement": "#e8e4f2", "Stamina": "#dfeeea", "Character": "#f1ecd6", "Temperament": "#f1ecd6", "Nature": "#f1ecd6", "Ways": "#f1ecd6", "Glow": "#f7e5d4" };
const HAIR = "#cfc8b8", FILL = 0.84;

export function styledGeometry(genome, { family = "neutral", paper = "tome" } = {}) {
  const frame = frameFor(genome.species, genome.version);
  if (!frame) throw new Error(`no frame for species ${genome.species} v${genome.version}`);
  const F = FAMILIES[family] ?? FAMILIES.neutral;
  const { L, cells, crc, mask } = encodeCells(frame, genome);
  const N = L.N, marks = [];
  const rect = (x0, y0, x1, y1, fill, rx = 0) => marks.push({ k: "rect", x0, y0, x1, y1, fill, rx });
  const sq = (r, c, fill, f = FILL, rx = 0.22) => rect(c + (1 - f) / 2, r + (1 - f) / 2, c + (1 + f) / 2, r + (1 + f) / 2, fill, rx);
  const poly = (pts, fill) => marks.push({ k: "poly", pts, fill });
  const lantern = (r, c, fill, f = FILL, cut = 0.22) => { // an octagon: a cut-corner square
    const x0 = c + (1 - f) / 2, y0 = r + (1 - f) / 2, x1 = c + (1 + f) / 2, y1 = r + (1 + f) / 2, k = cut * f;
    poly([[x0 + k, y0], [x1 - k, y0], [x1, y0 + k], [x1, y1 - k], [x1 - k, y1], [x0 + k, y1], [x0, y1 - k], [x0, y0 + k]], fill);
  };
  const leaf = (r, c, fill, f = FILL) => { // a rounded square with one pointed corner, like a leaf tip
    const x0 = c + (1 - f) / 2, y0 = r + (1 - f) / 2, x1 = c + (1 + f) / 2, y1 = r + (1 + f) / 2;
    marks.push({ k: "leaf", x0, y0, x1, y1, fill });
  };
  // chapter tints behind read blocks; hairline outline for unread blocks (light only)
  for (const blk of L.blocks) {
    const { r0, c0, r1, c1 } = blk.rect, read = Math.floor(mask / 2 ** blk.chapter) & 1;
    const name = frame.chapters[blk.chapter].name ?? String(blk.chapter);
    if (read) rect(c0 + 0.04, r0 + 0.04, c1 - 0.04, r1 - 0.04, TINTS[name] ?? "#efece4", 0.3);
    else {
      const t = 0.06, i = 0.12;
      rect(c0 + i, r0 + i, c1 - i, r0 + i + t, HAIR); rect(c0 + i, r1 - i - t, c1 - i, r1 - i, HAIR);
      rect(c0 + i, r0 + i, c0 + i + t, r1 - i, HAIR); rect(c1 - i - t, r0 + i, c1 - i, r1 - i, HAIR);
    }
  }
  // a light halo behind the glyph corner (light only, never dark)
  // at 17x17 the glyph touches the data, so the halo is clipped to the 5x5; from 21 up it may use the gutter
  if (L.glyph.g > 5) marks.push({ k: "circle", cx: L.glyph.c0 + 2.5, cy: L.glyph.r0 + 2.5, r: 3.0, fill: F.halo });
  else rect(L.glyph.c0, L.glyph.r0, L.glyph.c0 + 5, L.glyph.r0 + 5, F.halo, 0.6);
  // ring 0: perforation, a round solid dot about 0.6 cell across on every other cell, in every clan
  for (const [r, c] of ringCells(N, 0)) if ((r + c) % 2 === 0) marks.push({ k: "circle", cx: c + 0.5, cy: r + 0.5, r: 0.3, fill: F.ink });
  // ring 1: the one solid frame line, unchanged
  rect(1, 1, N - 1, 2, F.frame); rect(1, N - 2, N - 1, N - 1, F.frame); rect(1, 2, 2, N - 2, F.frame); rect(N - 2, 2, N - 1, N - 2, F.frame);
  // ring 2: the species border, one engraved family per clan
  const bp = borderPattern(frame, N);
  bp.cells.forEach(([r, c], i) => {
    if (!bp.bits[i]) return;
    if (F.border.shape === "leaf") leaf(r, c, F.ink);
    else if (F.border.shape === "lantern") lantern(r, c, F.ink, FILL, F.border.cut);
    else sq(r, c, F.ink, FILL, F.border.rx);
  });
  // the glyph: slightly heavier
  frame.glyph.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "#") sq(L.glyph.r0 + y, L.glyph.c0 + x, F.glyph, 0.92, 0.12); }));
  // data (copy hues, pale for zero), mask, header, CRC, parity in ink; unread cells stay empty
  for (const [key, v] of cells) {
    const r = Math.floor(key / N), c = key % N;
    if (v.kind === "data") { if (v.v) sq(r, c, COPIES[v.copy % 4]); else sq(r, c, PALE[v.copy % 4]); }
    else if (v.v && v.kind !== "unread") sq(r, c, F.ink, FILL, 0.18);
  }
  return { frame, N, L, marks, plate: PAPER[paper] ?? PAPER.tome, crc, mask, code: stampCode(frame, genome) };
}

const f3 = (v) => (Math.round(v * 1000) / 1000).toString();
export function toStyledSVG(geom, side = 300) {
  const W = imageSize(side, geom.N), u = side / geom.N, o = (W - side) / 2;
  const X = (v) => f3(o + v * u), S = (v) => f3(v * u);
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}">`, `<title>genome stamp ${geom.code} (styled)</title>`, `<rect width="${W}" height="${W}" fill="${geom.plate}"/>`];
  for (const m of geom.marks) {
    if (m.k === "rect") out.push(`<rect x="${X(m.x0)}" y="${X(m.y0)}" width="${S(m.x1 - m.x0)}" height="${S(m.y1 - m.y0)}" rx="${S(m.rx || 0)}" fill="${m.fill}"/>`);
    else if (m.k === "circle") out.push(`<circle cx="${X(m.cx)}" cy="${X(m.cy)}" r="${S(m.r)}" fill="${m.fill}"/>`);
    else if (m.k === "poly") out.push(`<polygon points="${m.pts.map(([x, y]) => `${X(x)},${X(y)}`).join(" ")}" fill="${m.fill}"/>`);
    else if (m.k === "leaf") {
      const w = m.x1 - m.x0, h = m.y1 - m.y0, rx = 0.34 * w;
      // rounded on three corners, pointed at the top-right like a leaf tip
      out.push(`<path d="M ${X(m.x0 + rx)} ${X(m.y0)} L ${X(m.x1)} ${X(m.y0)} L ${X(m.x1)} ${X(m.y1 - rx)} Q ${X(m.x1)} ${X(m.y1)} ${X(m.x1 - rx)} ${X(m.y1)} L ${X(m.x0 + rx)} ${X(m.y1)} Q ${X(m.x0)} ${X(m.y1)} ${X(m.x0)} ${X(m.y1 - rx)} L ${X(m.x0)} ${X(m.y0 + rx)} Q ${X(m.x0)} ${X(m.y0)} ${X(m.x0 + rx)} ${X(m.y0)} Z" fill="${m.fill}"/>`);
    }
  }
  out.push("</svg>");
  return out.join("\n") + "\n";
}

const genome = JSON.parse(readFileSync(file, "utf8"));
const geom = styledGeometry(genome, { family: opt("family", "neutral"), paper: opt("paper", "tome") });
const side = Number(opt("size", 300)), out = opt("out", "styled");
writeFileSync(`${out}.svg`, toStyledSVG(geom, side));
console.log(`${out}.svg: ${imageSize(side, geom.N)} px image, ${geom.N}x${geom.N} cells, code ${geom.code}`);
