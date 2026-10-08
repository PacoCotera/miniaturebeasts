// The A4 print test: stamps at several sizes with their expected codes under
// them, as a vector PDF (print at 100%), plus a 300-dpi PNG of the page (via
// pdftoppm when present). Writes tests/print-manifest.json for the scan page.
// The PDF writer is the genome-ring prototype's, adapted (no dependencies).
//   node tools/print-sheet.mjs
import { writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { deflateSync } from "node:zlib";
import { byName, frameFor } from "../src/frames.mjs";
import { stampCode, sizeFor } from "../src/codec.mjs";
import { stampGeometry, rasterize, QUIET } from "../src/stamp.mjs";
import { individual, trio } from "../tests/cases.mjs";

const here = (p) => new URL(`../${p}`, import.meta.url);
const PT = 72 / 25.4, PAGE = [595.28, 841.89];
const open = (f) => f.chapters.filter((c) => !c.sealed).map((c) => c.name);
const G = byName("glowtail"), F = byName("future150"), Hp = byName("hopper");
const fam = trio(G, 77);
const pm = (g, hex) => ({ ...g, postmark: hex });
const ROWS = [
  ["Growth, colour, 20 mm: Loika (5 loci), Tuikis (38), Tuikis with a postmark, 150 loci", [[20, "colour", individual(Hp, 9001, { read: open(Hp) })], [20, "colour", individual(G, 9002, { read: open(G) })], [20, "colour", pm(individual(G, 9003, { read: open(G) }), "5eed0f00d1e5a1ad")], [20, "colour", individual(F, 9004, { read: open(F) })]]],
  ["Colour, other sizes; and a Tuikis with two chapters unread", [[30, "colour", individual(G, 9011, { read: open(G) })], [16, "colour", individual(Hp, 9012, { read: open(Hp) })], [16, "colour", individual(F, 9013, { read: open(F) })], [20, "colour", individual(G, 9014, { read: open(G).filter((n) => !["Legs & tail", "Temperament"].includes(n)) })]]],
  ["Caddy simulation: monochrome dots at 203 dpi (58 mm thermal printer, assumed 8 dots/mm)", [[20, "caddy", individual(Hp, 9021, { read: open(Hp) })], [20, "caddy", individual(G, 9022, { read: open(G) })], [20, "caddy", individual(F, 9023, { read: open(F) })], [16, "caddy", individual(Hp, 9024, { read: open(Hp) })]]],
  ["A family, colour, 20 mm: mother, child, father (the child's cell pairs take one copy from each); and a 16 mm Caddy Tuikis", [[20, "colour", fam.mother, "mother"], [20, "colour", fam.child, "child"], [20, "colour", fam.father, "father"], [16, "caddy", individual(G, 9031, { read: open(G) })]]],
];
const stamps = [];
let n = 0;
for (const [, row] of ROWS) for (const [mm, kind, genome, role] of row) { n++; const fr = frameFor(genome.species, genome.version); stamps.push({ n, mm, kind, role: role ?? (genome.postmark ? "postmark" : null), cells: sizeFor(fr, { postmark: !!genome.postmark }).N, species: fr.name, genome, code: stampCode(fr, genome) }); }

const ops = [], images = [];
const num = (v) => (Math.round(v * 1000) / 1000).toString();
const esc = (s) => s.replace(/[\\()]/g, (c) => "\\" + c).replace(/[^\x20-\x7e]/g, (c) => ({ "·": "\\267", "–": "-", "—": "-", "×": "x" })[c] ?? "?");
const text = (x, y, size, s, bold = false) => ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf 0 g ${num(x)} ${num(y)} Td (${esc(s)}) Tj ET`);
const rgb = (h) => [1, 3, 5].map((i) => num(parseInt(h.slice(i, i + 2), 16) / 255)).join(" ");

function vectorStamp(geom, cx, cy, side) {
  const u = side / geom.N, x0 = cx - side / 2, yTop = cy + side / 2, q = QUIET * u;
  ops.push(`${rgb(geom.plate)} rg ${num(x0 - q)} ${num(yTop - side - q)} ${num(side + 2 * q)} ${num(side + 2 * q)} re f`);
  for (const m of geom.marks) {
    ops.push(`${rgb(m.fill)} rg`);
    if (m.k === "rect") ops.push(`${num(x0 + m.x0 * u)} ${num(yTop - m.y1 * u)} ${num((m.x1 - m.x0) * u)} ${num((m.y1 - m.y0) * u)} re f`);
    else {
      const X = x0 + m.cx * u, Y = yTop - m.cy * u, r = m.r * u, k = 0.5523 * r;
      ops.push(`${num(X + r)} ${num(Y)} m ${num(X + r)} ${num(Y + k)} ${num(X + k)} ${num(Y + r)} ${num(X)} ${num(Y + r)} c ${num(X - k)} ${num(Y + r)} ${num(X - r)} ${num(Y + k)} ${num(X - r)} ${num(Y)} c ${num(X - r)} ${num(Y - k)} ${num(X - k)} ${num(Y - r)} ${num(X)} ${num(Y - r)} c ${num(X + k)} ${num(Y - r)} ${num(X + r)} ${num(Y - k)} ${num(X + r)} ${num(Y)} c f`);
    }
  }
}
function caddyStamp(genome, cx, cy, mm, dpi = 203) {
  const D = (mm / 25.4) * dpi;
  const img = rasterize(stampGeometry(genome, { mono: true }), D, { bilevel: true, ss: 4 });
  const gray = Buffer.alloc(img.width * img.height);
  for (let i = 0; i < gray.length; i++) gray[i] = img.data[i * 4];
  const id = `Im${images.length + 1}`;
  images.push({ id, w: img.width, h: img.height, data: deflateSync(gray) });
  const wpt = (img.width / dpi) * 72;
  ops.push(`q ${num(wpt)} 0 0 ${num(wpt)} ${num(cx - wpt / 2)} ${num(cy - wpt / 2)} cm /${id} Do Q`);
}

const M = 15 * PT;
let y = PAGE[1] - M;
text(M, y - 14, 15, "Genome stamp print test - stamp, 4-digit check", true);
text(M, y - 30, 8.5, "Miniature Beasts · prototypes/genome-stamp · print on A4 at 100% (actual size, no fit-to-page), on white paper.");
text(M, y - 41, 8.5, "Scan: open tests/scan.html on a phone; hold the phone flat above one stamp so it fills about half the frame.");
text(M, y - 52, 8.5, "Code = species v frame version - read mask - CRC-16 check (4 hex digits) - payload tag. A stamp shows a genome; it never grants anything.");
y -= 66;
let k = 0;
for (const [label, row] of ROWS) {
  const big = Math.max(...row.map((r) => r[0]));
  text(M, y - 9, 8, label, true);
  const cyRow = y - 16 - (big / 2) * PT * 1.1;
  row.forEach(([mm, kind], j) => {
    const s = stamps[k++], cx = M + (22.5 + 45 * j) * PT;
    if (kind === "colour") vectorStamp(stampGeometry(s.genome), cx, cyRow, mm * PT);
    else caddyStamp(s.genome, cx, cyRow, mm);
    const ty = cyRow - (big / 2) * PT * 1.1 - 9;
    text(cx - 60, ty, 7.5, `#${s.n}  ${mm} mm  ${kind === "colour" ? "colour" : "Caddy 203 dpi"}${s.role ? "  " + s.role : ""}`, true);
    text(cx - 60, ty - 9, 7.5, s.code);
    text(cx - 60, ty - 18, 6.5, `${s.species}, ${s.cells}x${s.cells} cells, ${(mm / s.cells).toFixed(2)} mm a cell`);
  });
  y = cyRow - (big / 2) * PT * 1.1 - 40;
}
text(M, M + 6, 7, "Expected genomes for every stamp are built into tests/scan.html (tests/print-manifest.json). The 203-dpi rows reproduce the Caddy's dot grid on an office printer.");

const objs = [];
const add = (b) => { objs.push(b); return objs.length; };
const contentZ = deflateSync(Buffer.from(ops.join("\n")));
const catalog = add(null), pages = add(null), page = add(null);
const font = add(Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"));
const fontB = add(Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"));
const imgRefs = images.map((im) => [im.id, add(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Interpolate false /Filter /FlateDecode /Length ${im.data.length} >>\nstream\n`), im.data, Buffer.from("\nendstream")]))]);
const cont = add(Buffer.concat([Buffer.from(`<< /Length ${contentZ.length} /Filter /FlateDecode >>\nstream\n`), contentZ, Buffer.from("\nendstream")]));
objs[catalog - 1] = Buffer.from(`<< /Type /Catalog /Pages ${pages} 0 R >>`);
objs[pages - 1] = Buffer.from(`<< /Type /Pages /Kids [${page} 0 R] /Count 1 >>`);
objs[page - 1] = Buffer.from(`<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${PAGE[0]} ${PAGE[1]}] /Contents ${cont} 0 R /Resources << /Font << /F1 ${font} 0 R /F2 ${fontB} 0 R >> /XObject << ${imgRefs.map(([id, r]) => `/${id} ${r} 0 R`).join(" ")} >> >> >>`);
const chunks = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
const offsets = [];
let pos = chunks[0].length;
objs.forEach((o, i) => { const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), o, Buffer.from("\nendobj\n")]); offsets.push(pos); pos += b.length; chunks.push(b); });
const xref = [`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`, ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)].join("");
chunks.push(Buffer.from(`${xref}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${pos}\n%%EOF\n`));
writeFileSync(here("print-test.pdf"), Buffer.concat(chunks));
writeFileSync(here("tests/print-manifest.json"), JSON.stringify(stamps, null, 1));
console.log(`print-test.pdf: ${stamps.length} stamps`);
if (spawnSync("pdftoppm", ["-v"]).error) console.log("pdftoppm not found: print-test.png not written");
else {
  spawnSync("pdftoppm", ["-r", "300", "-png", "-singlefile", here("print-test.pdf").pathname, here("print-test").pathname]);
  spawnSync("pdftoppm", ["-r", "50", "-png", "-singlefile", here("print-test.pdf").pathname, here("img/print-test-preview").pathname]);
  console.log(`print-test.png ${existsSync(here("print-test.png")) ? "written" : "failed"}`);
}
