// Ring geometry -> SVG text, or -> RGB raster (analytic supersampling, no
// dependencies). Deterministic: the same genome gives the same bytes.
import { LAYOUT } from "./geometry.mjs";

const TAU = 2 * Math.PI;
const f = (v) => (Math.round(v * 100) / 100).toString();

export function imageSize(diameter) {
  return Math.ceil(diameter * (1 + 2 * LAYOUT.quiet));
}

export function toSVG(geom, diameter = 300, { title } = {}) {
  const size = imageSize(diameter);
  const c = size / 2, R = diameter / 2;
  const pt = (r, a) => `${f(c + r * R * Math.sin(a))} ${f(c - r * R * Math.cos(a))}`;
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
    title ? `<title>${title.replace(/[<&]/g, "")}</title>` : "",
    `<rect width="${size}" height="${size}" fill="${geom.plate}"/>`,
  ];
  for (const m of geom.marks) {
    if (m.k === "ann") {
      const ring = (r) => `M ${f(c - r * R)} ${f(c)} a ${f(r * R)} ${f(r * R)} 0 1 0 ${f(2 * r * R)} 0 a ${f(r * R)} ${f(r * R)} 0 1 0 ${f(-2 * r * R)} 0 Z`;
      out.push(`<path fill-rule="evenodd" fill="${m.fill}" d="${ring(m.r1)} ${ring(m.r0)}"/>`);
    } else if (m.k === "arc") {
      const large = m.a1 - m.a0 > Math.PI ? 1 : 0;
      out.push(
        `<path fill="${m.fill}" d="M ${pt(m.r0, m.a0)} L ${pt(m.r1, m.a0)} A ${f(m.r1 * R)} ${f(m.r1 * R)} 0 ${large} 1 ${pt(m.r1, m.a1)} L ${pt(m.r0, m.a1)} A ${f(m.r0 * R)} ${f(m.r0 * R)} 0 ${large} 0 ${pt(m.r0, m.a0)} Z"/>`,
      );
    } else if (m.k === "rect") {
      out.push(`<rect fill="${m.fill}" x="${f(c + m.x0 * R)}" y="${f(c + m.y0 * R)}" width="${f((m.x1 - m.x0) * R)}" height="${f((m.y1 - m.y0) * R)}"/>`);
    }
  }
  out.push("</svg>");
  return out.filter(Boolean).join("\n") + "\n";
}

const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// Rasterize. diameter may be fractional (e.g. 20 mm at 203 dpi = 159.8 dots).
// Options: ss = supersampling per axis; bilevel = threshold to pure black/white
// (thermal print). Returns {width, height, data: Uint8ClampedArray RGBA}.
export function rasterize(geom, diameter, { ss = 4, bilevel = false, size } = {}) {
  const W = size ?? imageSize(diameter);
  const c = W / 2, R = diameter / 2;
  const B = 2048, bw = TAU / B;
  const bins = Array.from({ length: B }, () => []);
  const always = [];
  geom.marks.forEach((m, i) => {
    if (m.k !== "arc") return always.push(i);
    const a0 = ((m.a0 % TAU) + TAU) % TAU;
    const span = m.a1 - m.a0;
    m._a0 = a0;
    m._span = span;
    for (let b = Math.floor(a0 / bw); b <= Math.floor((a0 + span) / bw); b++) bins[b % B].push(i);
  });
  const cols = geom.marks.map((m) => hexRGB(m.fill));
  const plate = hexRGB(geom.plate);
  const data = new Uint8ClampedArray(W * W * 4);
  const n2 = ss * ss;
  for (let py = 0; py < W; py++) {
    for (let px = 0; px < W; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = (px + (sx + 0.5) / ss - c) / R, y = (py + (sy + 0.5) / ss - c) / R;
          const rr = Math.hypot(x, y);
          let hit = -1;
          if (rr <= 1.0001) {
            for (const i of always) {
              const m = geom.marks[i];
              if (m.k === "ann" ? rr >= m.r0 && rr <= m.r1 : x >= m.x0 && x < m.x1 && y >= m.y0 && y < m.y1) hit = i;
            }
            let a = Math.atan2(x, -y);
            if (a < 0) a += TAU;
            for (const i of bins[Math.floor(a / bw) % B]) {
              const m = geom.marks[i];
              if (rr < m.r0 || rr > m.r1) continue;
              let d = a - m._a0;
              if (d < 0) d += TAU;
              if (d <= m._span && i > hit) hit = i;
            }
          }
          const col = hit >= 0 ? cols[hit] : plate;
          r += col[0]; g += col[1]; b += col[2];
        }
      }
      const o = (py * W + px) * 4;
      if (bilevel) {
        const v = (0.299 * r + 0.587 * g + 0.114 * b) / n2 < 128 ? 0 : 255;
        data[o] = data[o + 1] = data[o + 2] = v;
      } else {
        data[o] = r / n2; data[o + 1] = g / n2; data[o + 2] = b / n2;
      }
      data[o + 3] = 255;
    }
  }
  return { width: W, height: W, data };
}
