// The four candidate forms as drawable marks, all fed by the same payload: the
// genome-ring codec's bits (species, version, read mask, CRC-16 and both copies
// of every shown heritable locus, packed against the species' pinned frame).
//   (a) ringV2   ring with fixed slot classes and the tracks moved outward
//   (b) stamp    a square grid code of our own (size series, chapter blocks,
//                species border, paired cells, parity strip, finder corners)
//   (c) qr       a standard QR code (byte mode, level M) plus a sidecar
//   (d) randomart the OpenSSH "drunken bishop" over a hash: identity only
// Marks are {k:"rect"|"circle"|"arc"|"ann", ...} in unit coordinates; draw.mjs
// turns them into SVG and into printer dots.
import { createHash } from "node:crypto";
import { genomeToBits, readMask, crc16 } from "../../../prototypes/genome-ring/src/codec.mjs";

export const INK = "#2b2a27", PLATE = "#fbf8f0", COPY1 = "#1f5a85", COPY2 = "#a3392c", BAND = "#8e897d", HAIR = "#c9c3b5";
const PALE1 = "#c9d8e6", PALE2 = "#ebcdc8";
const CHAPTER_TINT = ["#f3e6d3", "#e4eddc", "#e3e8f1", "#efe0e6", "#e6e2f0", "#dcece9", "#efe9d2", "#f6dfcf"];

// Shown payload bits in reading order: per chapter, per locus, both copies.
export function payload(frame, genome) {
  const b = genomeToBits(frame, genome);
  return { ...b, shown: [...b.inner, ...b.outer].filter((x) => x !== null) };
}

// ---------------------------------------------------------------- (a) ring v2
export const RING_CLASSES = [{ name: "small", S: 48, mm: 20 }, { name: "medium", S: 96, mm: 20 }, { name: "large", S: 240, mm: 45 }];
const V2 = {
  rim: [0.95, 1.0], dash: { base: [0.875, 0.925], ext: [0.825, 0.875] },
  outer: { base: [0.675, 0.735], ext: [0.735, 0.8] }, ticks: [0.62, 0.655], ref: [0.595, 0.62],
  inner: { base: [0.48, 0.53], ext: [0.53, 0.58] }, band: { base: [0.4, 0.44], ext: [0.36, 0.4] }, glyph: 0.24,
  duty: 0.55, tickDuty: 0.4, bandDuty: 0.5, hairDuty: 0.12,
};
export function ringClass(frame) {
  const need = 3 + frame.spokesPerTrack + frame.chapters.length - 1;
  return RING_CLASSES.find((c) => c.S >= need) ?? null;
}
export function ringV2(frame, genome, { mono = false } = {}) {
  const cls = ringClass(frame);
  const S = cls.S, pitch = (2 * Math.PI) / S;
  const mask = readMask(frame, genome);
  const b = payload(frame, genome);
  // v2 header: format 2 | species 12 | frame version 8 | class 2 | CRC-16; the
  // read state of each chapter is read from the tracks (base mark or hairline).
  const head = [0, 1, ...bitsOf(frame.species, 12), ...bitsOf(frame.version, 8), ...bitsOf(RING_CLASSES.indexOf(cls), 2)];
  const header = [...head, ...bitsOf(crc16([...head, ...b.shown]), 16)];
  const ink = mono ? "#000000" : INK, c1 = mono ? "#000000" : COPY1, c2 = mono ? "#000000" : COPY2, band = mono ? "#000000" : BAND;
  const ang = (k) => (2 * Math.PI * (k - 1)) / S;
  const marks = [{ k: "ann", r0: V2.rim[0], r1: V2.rim[1], fill: ink }];
  const arc = (r0, r1, a, w, fill) => marks.push({ k: "arc", r0, r1, a0: a - w / 2, a1: a + w / 2, fill });
  marks.push({ k: "arc", r0: V2.ref[0], r1: V2.ref[1], a0: ang(2.5), a1: ang(S - 0.5), fill: ink });
  for (let k = 3; k < S; k++) {
    arc(V2.ticks[0], V2.ticks[1], ang(k), pitch * V2.tickDuty, ink);
    arc(V2.dash.base[0], V2.dash.base[1], ang(k), pitch * V2.duty, ink);
    if (header[(k - 3) % header.length]) arc(V2.dash.ext[0], V2.dash.ext[1], ang(k), pitch * V2.duty, ink);
  }
  // spokes: chapters in order, one empty slot between chapters, spare slots at the end
  let k = 3, s = 0;
  frame.chapters.forEach((ch, ci) => {
    const read = (mask >> ci) & 1;
    for (const l of ch.loci) for (let q = 0; q < l.bits; q++, s++, k++) {
      for (const [track, zone, fill] of [[b.inner, V2.inner, c1], [b.outer, V2.outer, c2]]) {
        if (!read) { arc(zone.base[0], zone.ext[1], ang(k), pitch * V2.hairDuty, mono ? "#000000" : HAIR); continue; }
        arc(zone.base[0], zone.base[1], ang(k), pitch * V2.duty, fill);
        if (track[s]) arc(zone.ext[0], zone.ext[1], ang(k), pitch * V2.duty, fill);
      }
    }
    k++;
  });
  const nb = frame.lockedMarks.length, a0 = ang(2.5), bp = (ang(S - 0.5) - a0) / nb;
  frame.lockedMarks.forEach((v, i) => {
    const a = a0 + (i + 0.5) * bp;
    arc(V2.band.base[0], V2.band.base[1], a, bp * V2.bandDuty, band);
    if (v) arc(V2.band.ext[0], V2.band.ext[1], a, bp * V2.bandDuty, band);
  });
  glyphMarks(frame.glyph, -V2.glyph, -V2.glyph, (2 * V2.glyph) / 5, ink, marks);
  return { marks, cls, shape: "disc", extent: 1, plate: mono ? "#ffffff" : PLATE };
}

// ---------------------------------------------------------------- (b) stamp
// Square cells, N x N with N in a size series (like QR versions). From the
// outside in: a border whose cells spell the species and frame version in
// Manchester pairs (always one dark, one light: it is also the timing track and
// reads as perforation); three solid corner finders and one hollow corner (the
// orientation); the species glyph at the top; chapters as blocks of dominoes,
// one domino per heritable bit, copy 1 above copy 2 (a 1 is a full square, a 0
// a small dot, so every decided cell carries its own ink reference); unread
// chapters as empty outlines; and a strip at the foot holding the header, the
// CRC-16 and Reed-Solomon parity.
export const STAMP_SIZES = [13, 17, 21, 25, 29, 33, 37, 41];
const HEADER_BITS = 2 + 12 + 10 + 3 + 12 + 1; // format, species, frame version, size, read mask (12 chapters), spare
const parityBits = (dataBits) => 8 * Math.max(4, Math.ceil((0.25 * (dataBits + HEADER_BITS + 16)) / 8)); // RS(255) symbols, ~25%

export function stampPlan(N, frame) {
  const role = Array.from({ length: N }, () => new Array(N).fill("free"));
  const set = (r, c, v) => { if (r >= 0 && c >= 0 && r < N && c < N) role[r][c] = v; };
  for (let i = 0; i < N; i++) { set(0, i, "border"); set(N - 1, i, "border"); set(i, 0, "border"); set(i, N - 1, "border"); }
  for (const [r0, c0] of [[0, 0], [0, N - 3], [N - 3, 0], [N - 3, N - 3]]) {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) set(r0 + r, c0 + c, r0 && c0 ? (r === 1 && c === 1 ? "hollow" : "finder") : "finder");
    // gutter on the inner sides
    const gr = r0 ? r0 - 1 : 3, gc = c0 ? c0 - 1 : 3;
    for (let i = 0; i < 4; i++) { set(gr, c0 ? c0 - 1 + i : i, "gutter"); set(r0 ? r0 - 1 + i : i, gc, "gutter"); }
  }
  const g0 = (N - 5) >> 1;
  for (let r = 1; r <= 5; r++) for (let c = g0; c < g0 + 5; c++) set(r, c, "glyph");
  for (let c = g0 - 1; c <= g0 + 5; c++) set(6, c, "gutter");
  for (let r = 1; r <= 6; r++) { set(r, g0 - 1, "gutter"); set(r, g0 + 5, "gutter"); }
  // the foot strip: header + CRC + parity, filled from the bottom row up
  const dataBits = 2 * frame.spokesPerTrack;
  const stripNeed = HEADER_BITS + 16 + parityBits(dataBits);
  let stripCells = [];
  for (let r = N - 2; r > 6 && stripCells.length < stripNeed; r--) {
    const row = [];
    for (let c = 1; c < N - 1; c++) if (role[r][c] === "free") row.push([r, c]);
    row.forEach(([rr, cc]) => (role[rr][cc] = "strip"));
    stripCells.push(...row);
    if (stripCells.length >= stripNeed) { for (let c = 1; c < N - 1; c++) if (role[r - 1][c] === "free") role[r - 1][c] = "gutter"; }
  }
  // dominoes: row pairs from the top, left to right, where both cells are free
  const dominoes = [];
  for (let r = 1; r + 1 < N - 1; r += 2)
    for (let c = 1; c < N - 1; c++) if (role[r][c] === "free" && role[r + 1][c] === "free") dominoes.push([r, c]);
  return { N, role, dominoes, stripCells, stripNeed, fits: stripCells.length >= stripNeed && dominoes.length >= frame.spokesPerTrack + frame.chapters.length - 1 };
}
export const stampSize = (frame) => STAMP_SIZES.map((N) => stampPlan(N, frame)).find((p) => p.fits) ?? null;

export function stamp(frame, genome, { mono = false, plan, cells = "binary" } = {}) {
  plan ??= stampSize(frame);
  const { N, role, dominoes, stripCells } = plan;
  const mask = readMask(frame, genome);
  const b = payload(frame, genome);
  const ink = mono ? "#000000" : INK;
  const u = 1 / N, marks = [];
  const cell = (r, c, fill, f = 1) => marks.push({ k: "rect", x0: (c + (1 - f) / 2) * u, y0: (r + (1 - f) / 2) * u, x1: (c + (1 + f) / 2) * u, y1: (r + (1 + f) / 2) * u, fill });
  // "binary": a 1 is a full cell, a 0 is blank on paper (a pale tint on screen).
  // "dot": a 1 is a full cell, a 0 a small dot (tested: needs finer detail, worse).
  const bitCell = (r, c, v, fill, pale) => {
    if (v) return cell(r, c, mono ? "#000000" : fill, 0.86);
    if (cells === "dot") return cell(r, c, mono ? "#000000" : fill, 0.4);
    if (!mono && pale) cell(r, c, pale, 0.86);
  };
  const outline = (r, c, fill) => { const t = 0.12; cell(r, c, fill, 0.62); cell(r, c, mono ? "#ffffff" : PLATE, 0.62 - 2 * t * 0.62); };
  // border: species identity (species, frame version) as Manchester pairs
  const id = [...bitsOf(frame.species, 12), ...bitsOf(frame.version, 10)];
  const ring = [];
  for (let c = 3; c < N - 3; c++) ring.push([0, c]);
  for (let r = 3; r < N - 3; r++) ring.push([r, N - 1]);
  for (let c = N - 4; c >= 3; c--) ring.push([N - 1, c]);
  for (let r = N - 4; r >= 3; r--) ring.push([r, 0]);
  ring.forEach(([r, c], i) => { const bit = id[(i >> 1) % id.length]; if ((i & 1) === bit) cell(r, c, ink); });
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (role[r][c] === "finder") cell(r, c, ink);
  glyphMarks(frame.glyph, ((N - 5) >> 1) * u, u, u, ink, marks);
  // chapters as blocks of dominoes
  let d = 0, s = 0;
  frame.chapters.forEach((ch, ci) => {
    const read = (mask >> ci) & 1;
    for (const l of ch.loci) for (let q = 0; q < l.bits; q++, s++, d++) {
      const [r, c] = dominoes[d];
      if (!mono) { cell(r, c, CHAPTER_TINT[ci % 8]); cell(r + 1, c, CHAPTER_TINT[ci % 8]); }
      if (!read) { outline(r, c, mono ? "#000000" : HAIR); outline(r + 1, c, mono ? "#000000" : HAIR); continue; }
      bitCell(r, c, b.inner[s], COPY1, PALE1);
      bitCell(r + 1, c, b.outer[s], COPY2, PALE2);
    }
    d++; // one empty domino between chapters
  });
  // foot strip: header, CRC-16, parity (parity drawn from a hash here: it is
  // Reed-Solomon in the real thing, and it never touches the genome cells)
  const head = [0, 1, ...bitsOf(frame.species, 12), ...bitsOf(frame.version, 10), ...bitsOf(STAMP_SIZES.indexOf(N), 3), ...bitsOf(mask, 12), 0];
  const crc = bitsOf(crc16([...head, ...b.shown]), 16);
  const par = hashBits([...head, ...b.shown], plan.stripNeed - head.length - 16);
  const strip = [...head, ...crc, ...par];
  stripCells.forEach(([r, c], i) => { if (i < strip.length) bitCell(r, c, strip[i], ink, null); });
  return { marks, N, shape: "square", plate: mono ? "#ffffff" : PLATE };
}

// ---------------------------------------------------------------- (c) QR
// QR Code Model 2, byte mode, error correction level M, versions 1-10.
const QR_M = [null, [10, [[1, 16]]], [16, [[1, 28]]], [26, [[1, 44]]], [18, [[2, 32]]], [24, [[2, 43]]], [16, [[4, 27]]],
  [18, [[4, 31]]], [22, [[2, 38], [2, 39]]], [22, [[3, 36], [2, 37]]], [26, [[4, 43], [1, 44]]]];
const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
{ let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x = (x << 1) ^ (x & 0x80 ? 0x11d : 0); } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; }
const gmul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
function rsRemainder(data, n) {
  let gen = [1];
  for (let i = 0; i < n; i++) { const g = new Array(gen.length + 1).fill(0); gen.forEach((c, j) => { g[j] ^= c; g[j + 1] ^= gmul(c, EXP[i]); }); gen = g; }
  const rem = new Array(n).fill(0);
  for (const byte of data) { const f = byte ^ rem.shift(); rem.push(0); for (let j = 0; j < n; j++) rem[j] ^= gmul(gen[j + 1], f); }
  return rem;
}
export function qrMatrix(bytes) {
  let v = 1;
  const cap = (v) => QR_M[v][1].reduce((s, [n, k]) => s + n * k, 0);
  while (v <= 10 && cap(v) < bytes.length + (v < 10 ? 2 : 3)) v++;
  if (v > 10) throw new Error("payload too large for QR v10-M");
  const size = 17 + 4 * v;
  const bits = [0, 1, 0, 0, ...bitsOf(bytes.length, v < 10 ? 8 : 16)];
  for (const x of bytes) bits.push(...bitsOf(x, 8));
  const capBits = cap(v) * 8;
  for (let i = 0; i < 4 && bits.length < capBits; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let p = 0; data.length < cap(v); p++) data.push(p % 2 ? 0x11 : 0xec);
  const [ec, groups] = QR_M[v];
  const blocks = [];
  let o = 0;
  for (const [n, k] of groups) for (let i = 0; i < n; i++) { const d = data.slice(o, o + k); o += k; blocks.push({ d, e: rsRemainder(d, ec) }); }
  const code = [];
  for (let i = 0; i < Math.max(...blocks.map((b) => b.d.length)); i++) for (const b of blocks) if (i < b.d.length) code.push(b.d[i]);
  for (let i = 0; i < ec; i++) for (const b of blocks) code.push(b.e[i]);
  const M = Array.from({ length: size }, () => new Array(size).fill(0));
  const F = Array.from({ length: size }, () => new Array(size).fill(false));
  const put = (x, y, on) => { M[y][x] = on ? 1 : 0; F[y][x] = true; };
  for (let i = 0; i < size; i++) { put(6, i, i % 2 === 0); put(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]])
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy, dist = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && y >= 0 && x < size && y < size) put(x, y, dist !== 2 && dist !== 4);
    }
  const al = ALIGN[v];
  for (let i = 0; i < al.length; i++) for (let j = 0; j < al.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) put(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  const format = (mask) => {
    const d = (0 << 3) | mask; // level M = 00
    let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const f = ((d << 10) | r) ^ 0x5412, bit = (i) => (f >>> i) & 1;
    for (let i = 0; i <= 5; i++) put(8, i, bit(i));
    put(8, 7, bit(6)); put(8, 8, bit(7)); put(7, 8, bit(8));
    for (let i = 9; i < 15; i++) put(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) put(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) put(8, size - 15 + i, bit(i));
    put(8, size - 8, 1);
  };
  format(0);
  if (v >= 7) {
    let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const vb = (v << 12) | r;
    for (let i = 0; i < 18; i++) { const bit = (vb >>> i) & 1, a = size - 11 + (i % 3), b = Math.floor(i / 3); put(a, b, bit); put(b, a, bit); }
  }
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
      if (!F[y][x] && i < code.length * 8) { M[y][x] = (code[i >>> 3] >>> (7 - (i & 7))) & 1; i++; }
    }
  }
  const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0];
  let best = null;
  for (let m = 0; m < 8; m++) {
    const T = M.map((row, y) => row.map((b, x) => (F[y][x] ? b : b ^ (MASKS[m](x, y) ? 1 : 0))));
    const saved = M.map((r) => r.slice());
    for (let y = 0; y < size; y++) M[y] = T[y];
    format(m);
    const p = penalty(M);
    if (!best || p < best.p) best = { p, m, T: M.map((r) => r.slice()) };
    for (let y = 0; y < size; y++) M[y] = saved[y];
  }
  return { version: v, size, modules: best.T, mask: best.m };
}
function penalty(M) {
  const n = M.length;
  let p = 0;
  const lines = [...M, ...M[0].map((_, x) => M.map((r) => r[x]))];
  for (const L of lines) {
    let run = 1;
    for (let i = 1; i <= n; i++) { if (i < n && L[i] === L[i - 1]) run++; else { if (run >= 5) p += run - 2; run = 1; } }
    const s = L.join("");
    for (const pat of ["10111010000", "00001011101"]) { let k = s.indexOf(pat); while (k >= 0) { p += 40; k = s.indexOf(pat, k + 1); } }
  }
  let dark = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    dark += M[y][x];
    if (y + 1 < n && x + 1 < n && M[y][x] === M[y][x + 1] && M[y][x] === M[y + 1][x] && M[y][x] === M[y + 1][x + 1]) p += 3;
  }
  return p + 10 * Math.floor(Math.abs((dark * 20) / (n * n) - 10));
}
export function qrPayload(frame, genome) {
  const b = payload(frame, genome);
  const bits = [...b.header, ...b.shown];
  while (bits.length % 8) bits.push(0);
  const out = [];
  for (let i = 0; i < bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  return out;
}
export function qr(frame, genome, { mono = false } = {}) {
  const q = qrMatrix(qrPayload(frame, genome));
  const u = 1 / q.size, marks = [], ink = mono ? "#000000" : INK;
  q.modules.forEach((row, y) => row.forEach((on, x) => on && marks.push({ k: "rect", x0: x * u, y0: y * u, x1: (x + 1) * u, y1: (y + 1) * u, fill: ink })));
  return { marks, qr: q, shape: "square", plate: mono ? "#ffffff" : PLATE };
}
// Sidecar: glyph, the species band (the locked frame as a bar code, the same
// for every member) and a pair strip (copy 1 over copy 2, long or short bars,
// unread as hairlines). Unit coordinates in a 1 x 0.3 box.
export function sidecar(frame, genome, { mono = false } = {}) {
  const marks = [], ink = mono ? "#000000" : INK, H = 0.3;
  glyphMarks(frame.glyph, 0, 0.03, 0.048, ink, marks);
  const x0 = 0.3, w = 0.7, nb = frame.lockedMarks.length;
  frame.lockedMarks.forEach((v, i) => marks.push({ k: "rect", x0: x0 + (i * w) / nb, x1: x0 + ((i + 0.5) * w) / nb, y0: v ? 0.03 : 0.06, y1: 0.09, fill: mono ? "#000000" : BAND }));
  const b = payload(frame, genome), n = b.inner.length;
  for (const [t, y, fill] of [[b.inner, 0.13, COPY1], [b.outer, 0.21, COPY2]])
    t.forEach((v, i) => {
      const xa = x0 + (i * w) / n, xb = x0 + ((i + 0.55) * w) / n;
      if (v === null) marks.push({ k: "rect", x0: xa + ((xb - xa) * 0.4), x1: xb - ((xb - xa) * 0.4), y0: y, y1: y + 0.07, fill: mono ? "#000000" : HAIR });
      else marks.push({ k: "rect", x0: xa, x1: xb, y0: v ? y : y + 0.035, y1: y + 0.07, fill: mono ? "#000000" : fill });
    });
  return { marks, w: 1, h: H };
}

// ---------------------------------------------------------------- (d) randomart
// OpenSSH's drunken bishop over SHA-256 of the payload, 17 x 9, drawn as dots
// sized by visits (S start, E end). Identity only: the payload lives elsewhere.
export function randomart(frame, genome) {
  const bytes = createHash("sha256").update(Buffer.from(qrPayload(frame, genome))).digest();
  const W = 17, H = 9, f = Array.from({ length: H }, () => new Array(W).fill(0));
  let x = 8, y = 4;
  for (const byte of bytes) for (let i = 0; i < 4; i++) {
    const s = (byte >> (2 * i)) & 3;
    x = Math.max(0, Math.min(W - 1, x + (s & 1 ? 1 : -1)));
    y = Math.max(0, Math.min(H - 1, y + (s & 2 ? 1 : -1)));
    f[y][x]++;
  }
  return { field: f, start: [8, 4], end: [x, y], code: crockford(qrPayload(frame, genome)) };
}
export function randomartMarks(art, { mono = false } = {}) {
  const ink = mono ? "#000000" : INK, marks = [], W = 17, H = 9, u = 1 / W;
  art.field.forEach((row, y) => row.forEach((n, x) => {
    if (!n) return;
    marks.push({ k: "circle", cx: (x + 0.5) * u, cy: (y + 0.5) * u, r: u * Math.min(0.5, 0.17 + 0.07 * n), fill: ink });
  }));
  for (const [[x, y], hollow] of [[art.start, true], [art.end, false]]) {
    marks.push({ k: "rect", x0: (x + 0.1) * u, y0: (y + 0.1) * u, x1: (x + 0.9) * u, y1: (y + 0.9) * u, fill: mono ? "#000000" : COPY2 });
    if (hollow) marks.push({ k: "rect", x0: (x + 0.28) * u, y0: (y + 0.28) * u, x1: (x + 0.72) * u, y1: (y + 0.72) * u, fill: mono ? "#ffffff" : PLATE });
  }
  return { marks, w: 1, h: H / W };
}

// ---------------------------------------------------------------- helpers
export function bitsOf(v, n) { return Array.from({ length: n }, (_, i) => Math.floor(v / 2 ** (n - 1 - i)) & 1); }
function hashBits(bits, n) {
  const out = [];
  for (let k = 0; out.length < n; k++) {
    const h = createHash("sha256").update(bits.join("") + k).digest();
    for (const byte of h) for (let i = 7; i >= 0 && out.length < n; i--) out.push((byte >> i) & 1);
  }
  return out;
}
function crockford(bytes) {
  const A = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let bits = bytes.map((b) => b.toString(2).padStart(8, "0")).join("");
  while (bits.length % 5) bits += "0";
  let s = "";
  for (let i = 0; i < bits.length; i += 5) s += A[parseInt(bits.slice(i, i + 5), 2)];
  return s;
}
function glyphMarks(glyph, x0, y0, c, fill, marks) {
  glyph.forEach((row, y) => [...row].forEach((ch, x) => ch === "#" && marks.push({ k: "rect", x0: x0 + x * c, y0: y0 + y * c, x1: x0 + (x + 1) * c, y1: y0 + (y + 1) * c, fill })));
}
