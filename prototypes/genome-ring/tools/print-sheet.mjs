// The A4 print test: rings at several sizes with their expected codes under
// them, as a vector PDF (print at 100%), plus a 300-dpi PNG of the same page
// (via pdftoppm when present). Also writes tests/print-manifest.json, which
// the scan page embeds to compare what it decodes with what was printed.
//
//   node tools/print-sheet.mjs
import { writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { deflateSync } from "node:zlib";
import { HOPPER, PIP } from "../src/frames.mjs";
import { randomGenome, rng, ringCode } from "../src/codec.mjs";
import { ringGeometry } from "../src/geometry.mjs";
import { rasterize } from "../src/render.mjs";

const here = (p) => new URL(`../${p}`, import.meta.url);
const PT = 72 / 25.4;
const PAGE = [595.28, 841.89];

const PIP_GENOME = {
  species: 1, version: 1,
  copies: { "appearance.markings": ["P", "p"], "form.crown": ["C", "c"], "appearance.rings": ["R", "r"], "movement.drive": ["M", "m"], "movement.efficiency": ["E", "e"] },
};

// rows: [label, [[mm, kind, frame]]]; kind "colour" = vector, "caddy" = 203-dpi bilevel dots
const ROWS = [
  ["Colour rings (vector, print at 100%)", [[40, "colour"], [30, "colour"], [25, "colour"], [20, "colour"]]],
  ["Colour rings, small", [[18, "colour"], [16, "colour"], [14, "colour"], [12, "colour"]]],
  ["Caddy simulation: monochrome dots at 203 dpi (58 mm thermal printer, assumed 8 dots/mm)", [[30, "caddy"], [25, "caddy"], [20, "caddy"], [16, "caddy"]]],
  ["Caddy simulation, small; and the Pip proof genome (5 heritable parts)", [[14, "caddy"], [12, "caddy"], [20, "colour", "pip"], [20, "caddy", "pip"]]],
];

const rings = [];
let n = 0;
for (const [, row] of ROWS)
  for (const [mm, kind, which] of row) {
    n++;
    const frame = which === "pip" ? PIP : HOPPER;
    const genome = which === "pip" ? PIP_GENOME : randomGenome(HOPPER, rng(9000 + n), { readProb: n === 1 ? 1 : 0.75 });
    rings.push({ n, mm, kind, genome, code: ringCode(frame, genome) });
  }

// ---------- PDF ----------
const ops = [];
const images = [];
const num = (v) => (Math.round(v * 1000) / 1000).toString();
const esc = (s) => s.replace(/[\\()]/g, (c) => "\\" + c).replace(/[^\x20-\x7e]/g, (c) => ({ "·": "\\267", "–": "-", "—": "-", "→": "->" })[c] ?? "?");
const text = (x, y, size, s, bold = false) => ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf 0 g ${num(x)} ${num(y)} Td (${esc(s)}) Tj ET`);
const rgb = (h) => [1, 3, 5].map((i) => num(parseInt(h.slice(i, i + 2), 16) / 255)).join(" ");

function arcPath(cx, cy, r, a0, a1, first) {
  // our angles are clockwise from 12 o'clock: x = sin a, y = cos a (y up)
  const out = [];
  const segs = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 2)));
  const P = (a) => [cx + r * Math.sin(a), cy + r * Math.cos(a)];
  if (first) out.push(`${P(a0).map(num).join(" ")} ${first}`);
  for (let i = 0; i < segs; i++) {
    const s0 = a0 + ((a1 - a0) * i) / segs, s1 = a0 + ((a1 - a0) * (i + 1)) / segs;
    const k = (4 / 3) * Math.tan((s1 - s0) / 4);
    const [x0, y0] = P(s0), [x3, y3] = P(s1);
    // derivative of (sin a, cos a) is (cos a, -sin a)
    const c1 = [x0 + k * r * Math.cos(s0), y0 - k * r * Math.sin(s0)];
    const c2 = [x3 - k * r * Math.cos(s1), y3 + k * r * Math.sin(s1)];
    out.push(`${[...c1, ...c2, x3, y3].map(num).join(" ")} c`);
  }
  return out.join("\n");
}

function vectorRing(geom, cx, cy, R) {
  ops.push(`${rgb(geom.plate)} rg ${num(cx - R * 1.08)} ${num(cy - R * 1.08)} ${num(R * 2.16)} ${num(R * 2.16)} re f`);
  for (const m of geom.marks) {
    ops.push(`${rgb(m.fill)} rg`);
    if (m.k === "ann") ops.push(`${arcPath(cx, cy, m.r1 * R, 0, 2 * Math.PI, "m")} h ${arcPath(cx, cy, m.r0 * R, 0, 2 * Math.PI, "m")} h f*`);
    else if (m.k === "arc")
      ops.push(`${num(cx + m.r0 * R * Math.sin(m.a0))} ${num(cy + m.r0 * R * Math.cos(m.a0))} m ${arcPath(cx, cy, m.r1 * R, m.a0, m.a1, "l")} ${arcPath(cx, cy, m.r0 * R, m.a1, m.a0, "l")} h f`);
    else ops.push(`${num(cx + m.x0 * R)} ${num(cy - m.y1 * R)} ${num((m.x1 - m.x0) * R)} ${num((m.y1 - m.y0) * R)} re f`);
  }
}

function caddyRing(genome, cx, cy, mm, dpi = 203) {
  const D = (mm / 25.4) * dpi;
  const img = rasterize(ringGeometry(genome, { mono: true }), D, { bilevel: true, ss: 4 });
  const gray = Buffer.alloc(img.width * img.height);
  for (let i = 0; i < gray.length; i++) gray[i] = img.data[i * 4];
  const id = `Im${images.length + 1}`;
  images.push({ id, w: img.width, h: img.height, data: deflateSync(gray) });
  const wpt = (img.width / dpi) * 72;
  ops.push(`q ${num(wpt)} 0 0 ${num(wpt)} ${num(cx - wpt / 2)} ${num(cy - wpt / 2)} cm /${id} Do Q`);
}

const M = 15 * PT;
let y = PAGE[1] - M;
text(M, y - 14, 15, "Genome ring print test", true);
text(M, y - 30, 8.5, "Miniature Beasts · prototypes/genome-ring · print on A4 at 100% (actual size, no fit-to-page), on white paper.");
text(M, y - 41, 8.5, "Scan: open tests/scan.html on a phone, hold it 10-15 cm above one ring, and compare the decoded genome with the code under the ring.");
text(M, y - 52, 8.5, "Code = species v version - read mask - check - payload tag. A ring shows a genome; scanning never grants anything.");
y -= 66;
let k = 0;
for (const [label, row] of ROWS) {
  const big = Math.max(...row.map((r) => r[0]));
  text(M, y - 9, 8, label, true);
  const cyRow = y - 16 - (big / 2) * PT * 1.1;
  row.forEach(([mm, kind], j) => {
    const r = rings[k++];
    const cx = M + (22.5 + 45 * j) * PT;
    const geom = ringGeometry(r.genome);
    if (kind === "colour") vectorRing(geom, cx, cyRow, (mm / 2) * PT);
    else caddyRing(r.genome, cx, cyRow, mm);
    const ty = cyRow - (big / 2) * PT * 1.1 - 9;
    text(cx - 60, ty, 7.5, `#${r.n}  ${mm} mm  ${kind === "colour" ? "colour" : "Caddy 203 dpi"}`, true);
    text(cx - 60, ty - 9, 7.5, r.code);
  });
  y = cyRow - (big / 2) * PT * 1.1 - 34;
}
text(M, M - 4 + 10, 7, "Expected genomes for every ring are embedded in tests/scan.html (tests/print-manifest.json). The 203-dpi rows reproduce the Caddy's dot grid on an office printer.");

const objs = [];
const add = (s) => { objs.push(s); return objs.length; };
const content = Buffer.from(ops.join("\n"));
const contentZ = deflateSync(content);
const catalog = add(null), pages = add(null), page = add(null);
const font = add(Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"));
const fontB = add(Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"));
const imgRefs = images.map((im) =>
  [im.id, add(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Interpolate false /Filter /FlateDecode /Length ${im.data.length} >>\nstream\n`), im.data, Buffer.from("\nendstream")]))],
);
const cont = add(Buffer.concat([Buffer.from(`<< /Length ${contentZ.length} /Filter /FlateDecode >>\nstream\n`), contentZ, Buffer.from("\nendstream")]));
objs[catalog - 1] = Buffer.from(`<< /Type /Catalog /Pages ${pages} 0 R >>`);
objs[pages - 1] = Buffer.from(`<< /Type /Pages /Kids [${page} 0 R] /Count 1 >>`);
objs[page - 1] = Buffer.from(
  `<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${PAGE[0]} ${PAGE[1]}] /Contents ${cont} 0 R /Resources << /Font << /F1 ${font} 0 R /F2 ${fontB} 0 R >> /XObject << ${imgRefs.map(([id, r]) => `/${id} ${r} 0 R`).join(" ")} >> >> >>`,
);
const chunks = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
const offsets = [];
let pos = chunks[0].length;
objs.forEach((o, i) => {
  const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), o, Buffer.from("\nendobj\n")]);
  offsets.push(pos);
  pos += b.length;
  chunks.push(b);
});
const xref = [`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`, ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)].join("");
chunks.push(Buffer.from(`${xref}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${pos}\n%%EOF\n`));
writeFileSync(here("print-test.pdf"), Buffer.concat(chunks));
writeFileSync(here("tests/print-manifest.json"), JSON.stringify(rings.map(({ n, mm, kind, code, genome }) => ({ n, mm, kind, code, genome })), null, 1));
console.log(`print-test.pdf: ${rings.length} rings`);

// 300-dpi PNG of the page, and a small preview for the README
const which = spawnSync("pdftoppm", ["-v"]);
if (which.error) console.log("pdftoppm not found: print-test.png not written");
else {
  spawnSync("pdftoppm", ["-r", "300", "-png", "-singlefile", here("print-test.pdf").pathname, here("print-test").pathname]);
  spawnSync("pdftoppm", ["-r", "50", "-png", "-singlefile", here("print-test.pdf").pathname, here("img/print-test-preview").pathname]);
  console.log(`print-test.png ${existsSync(here("print-test.png")) ? "written" : "failed"}`);
}
