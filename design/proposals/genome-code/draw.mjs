// Drawings for genome-code.md. One sheet per option, each on the same genomes:
// hopper, glowtail and a synthetic 150-open-loci species (three of its eight
// chapters unread) at 300 px and as a 20 mm Caddy print at 203 dpi (real
// printer dots with thermal dot gain, shown 2x); and a glowtail mother, child
// and father at 300 px. Plus the current ring at 20 mm as genomes grow.
//
//   node design/proposals/genome-code/draw.mjs
import { writeFileSync } from "node:fs";
import * as sp from "./species.mjs";
import * as C from "./codes.mjs";
import { ringGeometry } from "../../../prototypes/genome-ring/src/geometry.mjs";
import { toSVG, rasterize, imageSize } from "../../../prototypes/genome-ring/src/render.mjs";
import { encodePNG } from "../../../prototypes/genome-ring/src/png.mjs";
import { dotGain } from "../../../prototypes/genome-ring/tests/distort.mjs";

const out = (p, s) => writeFileSync(new URL(p, import.meta.url), s);
const DPI = 203, MM = 20, DOTS = (MM / 25.4) * DPI;
const esc = (s) => String(s).replace(/[<&>]/g, "");

// Individuals
const hop = sp.individual(sp.HOPPER, 11);
const glow = sp.individual(sp.GLOWTAIL, 13);
const fut = sp.individual(sp.FUTURE150, 22, { read: ["Coat", "Face", "Shape", "Legs & tail", "Movement"] });
const fam = sp.trio(sp.GLOWTAIL, 40);
const SAMPLES = [[sp.HOPPER, hop, "hopper · 5 open loci"], [sp.GLOWTAIL, glow, "glowtail · 38 open loci"], [sp.FUTURE150, fut, "future · 150 open loci, 5 of 8 chapters read"]];
const FAMILY = [[fam.mother, "mother"], [fam.child, "child"], [fam.father, "father"]];

// ---- generic mark rasterizer (unit box -> pixels), rects and circles
function rasterUnit(marks, w, h, { plate = "#ffffff", ss = 4, bilevel = false, ox = 0, oy = 0, sx = w, sy = h, W = w, H = h } = {}) {
  const hex = (c) => (c.length === 4 ? [1, 2, 3].map((i) => parseInt(c[i] + c[i], 16)) : [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)));
  const acc = new Float32Array(W * H * 3);
  const bg = hex(plate);
  for (let i = 0; i < W * H; i++) acc.set(bg, i * 3);
  const cols = marks.map((m) => hex(m.fill));
  const n2 = ss * ss;
  const sub = new Int32Array(W * H * n2).fill(-1);
  marks.forEach((m, mi) => {
    const bx0 = m.k === "circle" ? m.cx - m.r : m.x0, bx1 = m.k === "circle" ? m.cx + m.r : m.x1;
    const by0 = m.k === "circle" ? m.cy - m.r : m.y0, by1 = m.k === "circle" ? m.cy + m.r : m.y1;
    const X0 = Math.max(0, Math.floor((ox + bx0 * sx) * ss)), X1 = Math.min(W * ss, Math.ceil((ox + bx1 * sx) * ss));
    const Y0 = Math.max(0, Math.floor((oy + by0 * sy) * ss)), Y1 = Math.min(H * ss, Math.ceil((oy + by1 * sy) * ss));
    for (let Y = Y0; Y < Y1; Y++) for (let X = X0; X < X1; X++) {
      const u = ((X + 0.5) / ss - ox) / sx, v = ((Y + 0.5) / ss - oy) / sy;
      const hit = m.k === "circle" ? (u - m.cx) ** 2 * sx * sx + (v - m.cy) ** 2 * sy * sy <= m.r * m.r * sx * sx : u >= m.x0 && u < m.x1 && v >= m.y0 && v < m.y1;
      if (hit) sub[((Y / ss | 0) * W + (X / ss | 0)) * n2 + (Y % ss) * ss + (X % ss)] = mi;
    }
  });
  const data = new Uint8ClampedArray(W * H * 4);
  for (let p = 0; p < W * H; p++) {
    let r = 0, g = 0, b = 0;
    for (let k = 0; k < n2; k++) { const mi = sub[p * n2 + k]; const c = mi < 0 ? bg : cols[mi]; r += c[0]; g += c[1]; b += c[2]; }
    r /= n2; g /= n2; b /= n2;
    if (bilevel) { const l = 0.299 * r + 0.587 * g + 0.114 * b < 128 ? 0 : 255; r = g = b = l; }
    data.set([r, g, b, 255], p * 4);
  }
  return { width: W, height: H, data };
}
const thermal = (img) => dotGain(img, 0.35, 150);
const dataURI = (img) => `data:image/png;base64,${encodePNG(img, { gray: true }).toString("base64")}`;

// ---- unit marks -> SVG group
function svgUnit(marks, x, y, w, h) {
  const f = (v) => Math.round(v * 100) / 100;
  return marks.map((m) => m.k === "circle"
    ? `<circle cx="${f(x + m.cx * w)}" cy="${f(y + m.cy * h)}" r="${f(m.r * w)}" fill="${m.fill}"/>`
    : `<rect x="${f(x + m.x0 * w)}" y="${f(y + m.y0 * h)}" width="${f((m.x1 - m.x0) * w)}" height="${f((m.y1 - m.y0) * h)}" fill="${m.fill}"/>`).join("");
}
const nested = (svg, x, y, w) => svg.replace(/^<svg [^>]*viewBox="([^"]+)"[^>]*>/, (_, vb) => `<svg x="${x}" y="${y}" width="${w}" height="${w}" viewBox="${vb}">`).replace(/<title>.*?<\/title>/, "");

// ---- each option: view at 300 px (SVG) and print at 20 mm (dots)
const OPTIONS = {
  a: {
    title: "(a) Ring v2: fixed slot classes (48 · 96 · 240 slots), tracks moved outward",
    view: (f, g, x, y) => nested(toSVG(C.ringV2(f, g), 264), x + 150 - imageSize(264) / 2, y + 150 - imageSize(264) / 2, imageSize(264)),
    print: (f, g) => thermal(rasterize(C.ringV2(f, g, { mono: true }), DOTS, { bilevel: true, size: Math.ceil(DOTS) + 4 })),
    note: (f) => { const c = C.ringClass(f); return `${c.name} ring, ${c.S} slots${c.mm > 20 ? `; class prints at ${c.mm} mm` : ""}`; },
  },
  b: {
    title: "(b) Stamp: square cells in a size series, chapters as blocks, species border",
    view: (f, g, x, y) => { const s = C.stamp(f, g); return `<rect x="${x}" y="${y}" width="300" height="300" fill="${C.PLATE}"/>${svgUnit(s.marks, x + 18, y + 18, 264, 264)}`; },
    print: (f, g) => { const s = C.stamp(f, g, { mono: true }); const m = 2; return thermal(rasterUnit(s.marks, 0, 0, { ox: m, oy: m, sx: DOTS, sy: DOTS, W: Math.round(DOTS) + 2 * m, H: Math.round(DOTS) + 2 * m, bilevel: true })); },
    note: (f) => { const p = C.stampSize(f); return `${p.N} × ${p.N} cells, ${(MM / p.N).toFixed(2)} mm (${(DOTS / p.N).toFixed(1)} dots) a cell at 20 mm`; },
  },
  c: {
    title: "(c) Standard QR (byte mode, level M) with a sidecar: glyph, species band, pair strip",
    view: (f, g, x, y) => { const q = C.qr(f, g), sc = C.sidecar(f, g); return `<rect x="${x}" y="${y}" width="300" height="300" fill="${C.PLATE}"/>${svgUnit(q.marks, x + 50, y + 12, 200, 200)}${svgUnit(sc.marks, x + 10, y + 222, 280, 280)}`; },
    print: (f, g) => {
      const q = C.qr(f, g, { mono: true }), sc = C.sidecar(f, g, { mono: true });
      // the quiet zone (4 modules) is the white of the sheet around the image
      const qz = 2, W = Math.round(DOTS + 2 * qz), H = Math.round(DOTS + 2 * qz + 0.32 * DOTS);
      const a = rasterUnit(q.marks, 0, 0, { ox: qz, oy: qz, sx: DOTS, sy: DOTS, W, H, bilevel: true });
      const b = rasterUnit(sc.marks, 0, 0, { ox: qz, oy: DOTS + qz * 1.3, sx: DOTS, sy: DOTS, W, H, bilevel: true });
      for (let i = 0; i < a.data.length; i++) a.data[i] = Math.min(a.data[i], b.data[i]);
      return thermal(a);
    },
    note: (f, g) => { const q = C.qr(f, g).qr; return `QR version ${q.version}, ${q.size} modules, ${(MM / q.size).toFixed(2)} mm a module at 20 mm`; },
  },
  d: {
    title: "(d) Randomart of a hash: identity only; the payload goes by NFC or a typed code",
    view: (f, g, x, y) => {
      const art = C.randomart(f, g), m = C.randomartMarks(art);
      const code = art.code.match(/.{1,24}/g).slice(0, 4);
      return `<rect x="${x}" y="${y}" width="300" height="300" fill="${C.PLATE}"/><rect x="${x + 14}" y="${y + 22}" width="272" height="148" fill="none" stroke="${C.INK}" stroke-width="2"/>`
        + `<text x="${x + 150}" y="${y + 26}" text-anchor="middle" font-family="monospace" font-size="12" fill="${C.INK}" style="paint-order:stroke" stroke="${C.PLATE}" stroke-width="6">[${esc(f.name.split(",")[0].toUpperCase())}]</text>`
        + svgUnit(m.marks, x + 22, y + 30, 256, 256)
        + code.map((l, i) => `<text x="${x + 150}" y="${y + 200 + i * 16}" text-anchor="middle" font-family="monospace" font-size="12" fill="${C.INK}">${l}</text>`).join("")
        + (art.code.length > 96 ? `<text x="${x + 150}" y="${y + 268}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${C.BAND}">… ${art.code.length} characters in all</text>` : "");
    },
    print: (f, g) => { const m = C.randomartMarks(C.randomart(f, g), { mono: true }); const p = 2; return thermal(rasterUnit(m.marks, 0, 0, { ox: p, oy: p, sx: DOTS, sy: DOTS, W: Math.round(DOTS) + 2 * p, H: Math.round((DOTS * 9) / 17) + 2 * p, bilevel: true })); },
    note: (f, g) => `payload as text: ${C.randomart(f, g).code.length} characters`,
  },
};

const COLW = 340, X0 = 20;
for (const [key, o] of Object.entries(OPTIONS)) {
  const parts = [];
  let y = 0;
  parts.push(`<text x="${X0}" y="${(y += 30)}" font-family="sans-serif" font-size="17" font-weight="600" fill="${C.INK}">${esc(o.title)}</text>`);
  const row = (label) => parts.push(`<text x="${X0}" y="${(y += 30)}" font-family="sans-serif" font-size="13" fill="${C.BAND}">${esc(label)}</text>`);
  row("Station size: a 300 px plate, the code 264 px across (the QR 200 px plus its sidecar)");
  y += 8;
  SAMPLES.forEach(([f, g, name], i) => {
    const x = X0 + i * COLW;
    parts.push(o.view(f, g, x, y));
    parts.push(`<text x="${x}" y="${y + 318}" font-family="sans-serif" font-size="12" fill="${C.INK}">${esc(name)}</text>`);
    parts.push(`<text x="${x}" y="${y + 334}" font-family="sans-serif" font-size="11" fill="${C.BAND}">${esc(o.note(f, g))}</text>`);
  });
  y += 340;
  row(`Caddy print: ${MM} mm at ${DPI} dpi with thermal dot gain, every printer dot shown 2 × 2`);
  y += 8;
  let hmax = 0;
  SAMPLES.forEach(([f, g], i) => {
    const img = o.print(f, g);
    parts.push(`<image x="${X0 + i * COLW}" y="${y}" width="${img.width * 2}" height="${img.height * 2}" style="image-rendering:pixelated" href="${dataURI(img)}"/>`);
    hmax = Math.max(hmax, img.height * 2);
  });
  y += hmax + 6;
  row("Relatedness, glowtail at 300 px: the child holds one of the mother's copies (top or inner) and one of the father's (bottom or outer) at every locus");
  y += 8;
  FAMILY.forEach(([g, name], i) => {
    const x = X0 + i * COLW;
    parts.push(o.view(sp.GLOWTAIL, g, x, y));
    parts.push(`<text x="${x}" y="${y + 318}" font-family="sans-serif" font-size="12" fill="${C.INK}">${name}</text>`);
  });
  y += 330;
  const W = X0 * 2 + 3 * COLW - 20;
  out(`option-${key}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${y}" width="${W}" height="${y}"><rect width="${W}" height="${y}" fill="#ffffff"/>${parts.join("\n")}</svg>\n`);
}

// ---- the current ring at 20 mm as genomes grow (section 2)
{
  const parts = [], rows = [[sp.GLOWTAIL, "glowtail, 38 open loci · 57 slots"], [sp.FUTURE80, "80 open loci · 115 slots"], [sp.FUTURE150, "150 open loci · 200 slots"]];
  rows.forEach(([f, label], i) => {
    const g = sp.individual(f, 7);
    const img = thermal(rasterize(ringGeometry(g, { mono: true }), DOTS, { bilevel: true, size: Math.ceil(DOTS) + 4 }));
    parts.push(`<image x="${20 + i * 340}" y="36" width="${img.width * 2}" height="${img.height * 2}" style="image-rendering:pixelated" href="${dataURI(img)}"/>`);
    parts.push(`<text x="${20 + i * 340}" y="${44 + img.height * 2 + 14}" font-family="sans-serif" font-size="12" fill="${C.INK}">${label}</text>`);
  });
  parts.unshift(`<text x="20" y="24" font-family="sans-serif" font-size="14" fill="${C.INK}">Today's ring as a 20 mm Caddy print (203 dpi, dot gain, each dot 2 × 2): the inner spokes merge as loci are added</text>`);
  out("ring-v1-20mm.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1040 420" width="1040" height="420"><rect width="1040" height="420" fill="#ffffff"/>${parts.join("\n")}</svg>\n`);
}
console.log("wrote option-a..d.svg and ring-v1-20mm.svg");
