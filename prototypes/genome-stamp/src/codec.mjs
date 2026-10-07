// The stamp's codec and cell layout.
//
// Grid: N x N square cells, N in a size series. From the outside in:
//   ring 0  perforation: a dot on every even cell, the timing marks
//   ring 1  the frame: solid, the finder edge (one closed square, not QR's three)
//   ring 2  the species border: Manchester pairs from the species' locked frame,
//           identical for every member; it names the species and the orientation
//   inside  the 5x5 species glyph in the top-left corner (plus a gutter);
//           the read mask, then the chapter blocks (column-filled rectangles of
//           cell pairs: copy 1 above copy 2, or as many copies as the frame says);
//           and at the foot the strip: header, CRC-16, Reed–Solomon parity.
//
// One Reed–Solomon codeword (GF(256), ~30% parity) covers header, CRC, mask and
// every data cell; the CRC-16 runs end to end over header, mask and the shown
// payload, so an RS miscorrection cannot pass. Unread chapters stay blank.
import { frameFor } from "./frames.mjs";
import { rsEncode } from "./rs.mjs";

export const FORMAT = 1;
export const SIZES = [17, 21, 25, 29, 33, 37, 41, 45, 49];
export const RESERVED_BITS = 64; // a future signed postmark
export const HEADER_FIELDS = [["format", 4], ["species", 12], ["version", 10], ["size", 4], ["reserved", RESERVED_BITS]];
export const HEADER_BITS = HEADER_FIELDS.reduce((s, [, n]) => s + n, 0) + 16; // + CRC-16 = 110
const PARITY_SHARE = 0.15; // parity bytes = 2 * ceil(15% of the codeword): ~30%, corrects ~15% of bytes

// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), bitwise.
export function crc16(bits) {
  let c = 0xffff;
  for (const b of bits) {
    const top = ((c >> 15) & 1) ^ (b & 1);
    c = (c << 1) & 0xffff;
    if (top) c ^= 0x1021;
  }
  return c;
}
export const toBits = (v, n) => Array.from({ length: n }, (_, i) => Math.floor(v / 2 ** (n - 1 - i)) & 1);
export const fromBits = (bits) => bits.reduce((v, b) => v * 2 + b, 0);

// Ring 2 cells, clockwise from the top-left corner, and ring 0 (perforation).
export function ringCells(N, k) {
  const out = [], a = k, b = N - 1 - k;
  for (let c = a; c < b; c++) out.push([a, c]);
  for (let r = a; r < b; r++) out.push([r, b]);
  for (let c = b; c > a; c--) out.push([b, c]);
  for (let r = b; r > a; r--) out.push([r, a]);
  return out;
}
export function borderPattern(frame, N) {
  // Manchester: each signature bit is a (dark, light) or (light, dark) pair
  const cells = ringCells(N, 2), out = new Array(cells.length);
  let h = frame.borderSeed ^ Math.imul(N, 0x9e3779b1);
  for (let i = 0; i < cells.length; i += 2) {
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
    h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
    const bit = (h >>> 16) & 1;
    out[i] = bit; out[i + 1] = 1 - bit;
  }
  return { cells, bits: out };
}

// Layout of size N for a frame (frame may be null: only the frame-independent
// parts, enough to read the header).
export function layout(N, frame) {
  const M = N - 6, o = 3;
  const C = M * M - 36, B = Math.floor(C / 8), p = 2 * Math.ceil(PARITY_SHARE * B), m = B - p;
  const stripRows = Math.ceil((HEADER_BITS + 8 * p) / M);
  const hB = M - 6 - stripRows;
  if (m * 8 < HEADER_BITS || hB < 0) return null;
  const at = (r, c) => [o + r, o + c];
  const strip = [];
  for (let r = M - stripRows; r < M; r++) for (let c = 0; c < M; c++) strip.push(at(r, c));
  const headerCells = strip.slice(0, HEADER_BITS), parityCells = strip.slice(HEADER_BITS, HEADER_BITS + 8 * p), stripSpare = strip.slice(HEADER_BITS + 8 * p);
  // data region: band A beside the glyph (6 tall), band B under it; column-filled
  const bands = [
    { r0: 0, c0: 6, h: 6, w: M - 6 },
    { r0: 6, c0: 0, h: hB, w: M },
  ].filter((b) => b.h > 0 && b.w > 0);
  const dataCells = [];
  for (const b of bands) for (let c = 0; c < b.w; c++) for (let r = 0; r < b.h; r++) dataCells.push(at(b.r0 + r, b.c0 + c));
  // message order: header+CRC, data region, strip spare; the first 8m are in the codeword
  const msgOrder = [...headerCells, ...dataCells, ...stripSpare];
  const msgCells = msgOrder.slice(0, 8 * m), unused = msgOrder.slice(8 * m);
  const unusedSet = new Set(unused.map(([r, c]) => r * N + c));
  const L = { N, M, p, m, B, stripRows, bands, headerCells, parityCells, msgCells, unused, glyph: { r0: o, c0: o }, fits: true };
  if (!frame) return L;
  // read mask: the first cells of band A, one per chapter
  const colsOf = (b) => Array.from({ length: b.w }, (_, c) => Array.from({ length: b.h }, (_, r) => at(b.r0 + r, b.c0 + c)).filter(([rr, cc]) => !unusedSet.has(rr * N + cc)));
  const columns = bands.map(colsOf);
  const nch = frame.chapters.length;
  const A = columns[0] ?? [];
  const maskCols = Math.ceil(nch / 6);
  if (A.length < maskCols) return { ...L, fits: false };
  const maskCells = A.slice(0, maskCols).flat().slice(0, nch);
  const next = [maskCols, 0];
  // chapters: rectangles of whole columns; bits fill each column top-down, one
  // vertical run of `copies` cells per bit (copy 1 on top)
  const blocks = [];
  const place = (bandIdx, ch) => {
    const cols = columns[bandIdx];
    let ci = next[bandIdx], row = 0;
    const cellsOf = [];
    const startCol = ci;
    for (const l of ch.loci) {
      const runs = [];
      for (let bit = 0; bit < l.bits; bit++) {
        if (ci >= cols.length) return null;
        if (row + l.copies > cols[ci].length) { ci++; row = 0; if (ci >= cols.length) return null; if (l.copies > cols[ci].length) return null; }
        runs.push(cols[ci].slice(row, row + l.copies));
        row += l.copies;
      }
      cellsOf.push(runs);
    }
    const endCol = row === 0 ? ci : ci + 1;
    return { band: bandIdx, colStart: startCol, colEnd: endCol, loci: cellsOf };
  };
  for (const [chi, ch] of frame.chapters.entries()) {
    let blk = null;
    for (let bi = 0; bi < columns.length && !blk; bi++) {
      blk = place(bi, ch);
      if (blk) next[bi] = blk.colEnd;
    }
    if (!blk) return { ...L, fits: false };
    const b = bands[blk.band];
    blk.rect = { r0: o + b.r0, c0: o + b.c0 + blk.colStart, r1: o + b.r0 + b.h, c1: o + b.c0 + blk.colEnd };
    blk.chapter = chi;
    blocks.push(blk);
  }
  return { ...L, maskCells, blocks };
}

export function sizeFor(frame) {
  for (const N of SIZES) { const L = layout(N, frame); if (L && L.fits) return L; }
  return null;
}

export function readMask(frame, genome) {
  if (typeof genome.readMask === "number") return genome.readMask;
  const read = genome.read ?? frame.chapters.filter((c) => !c.sealed).map((c) => c.name);
  return frame.chapters.reduce((m, c, i) => (read.includes(c.name) ? m + 2 ** i : m), 0);
}

// Genome -> cell values. Returns {L, cells: Map(r*N+c -> {v, kind, copy}), crc}.
export function encodeCells(frame, genome, L = sizeFor(frame)) {
  if (!L) throw new Error(`${frame.name}: no stamp size fits`);
  const N = L.N, mask = readMask(frame, genome);
  const nch = frame.chapters.length;
  const maskBits = Array.from({ length: nch }, (_, i) => Math.floor(mask / 2 ** i) & 1);
  const cells = new Map();
  const set = (rc, v, kind, extra = {}) => cells.set(rc[0] * N + rc[1], { v, kind, ...extra });
  // payload
  const shown = [];
  for (const blk of L.blocks) {
    const ch = frame.chapters[blk.chapter], read = maskBits[blk.chapter];
    ch.loci.forEach((l, li) => {
      const pair = genome.copies?.[l.id];
      for (let k = 0; k < l.copies; k++) {
        let idx = 0;
        if (read) {
          idx = l.alleles.indexOf(pair?.[k]);
          if (idx < 0) throw new Error(`${l.id} copy ${k + 1}: unknown look ${pair?.[k]}`);
        }
        const bits = toBits(idx, l.bits);
        blk.loci[li].forEach((run, bit) => {
          set(run[k], read ? bits[bit] : 0, read ? "data" : "unread", { copy: k, chapter: blk.chapter, locus: l.id });
          if (read) shown.push(bits[bit]);
        });
      }
    });
  }
  L.maskCells.forEach((rc, i) => set(rc, maskBits[i], "mask"));
  const sizeIdx = SIZES.indexOf(N);
  const head = [...toBits(FORMAT, 4), ...toBits(frame.species, 12), ...toBits(frame.version, 10), ...toBits(sizeIdx, 4), ...new Array(RESERVED_BITS).fill(0)];
  const crc = crc16([...head, ...maskBits, ...shown]);
  const header = [...head, ...toBits(crc, 16)];
  L.headerCells.forEach((rc, i) => set(rc, header[i], "header"));
  // the codeword: message cells in order (blank where nothing was set), then parity
  const msgBits = L.msgCells.map(([r, c]) => cells.get(r * N + c)?.v ?? 0);
  const bytes = [];
  for (let i = 0; i < msgBits.length; i += 8) bytes.push(fromBits(msgBits.slice(i, i + 8)));
  const parity = rsEncode(bytes, L.p).flatMap((b) => toBits(b, 8));
  L.parityCells.forEach((rc, i) => set(rc, parity[i], "parity"));
  return { L, cells, crc, mask };
}

// Codeword bits read from cells -> genome (after RS). Verified only.
export function parseMessage(msgBits, N, frameLookup = frameFor) {
  const take = (() => { let i = 0; return (n) => { const v = msgBits.slice(i, i + n); i += n; return v; }; })();
  const h = {};
  for (const [k, n] of HEADER_FIELDS) h[k] = k === "reserved" ? take(n) : fromBits(take(n));
  h.crc = fromBits(take(16));
  if (h.format !== FORMAT) return { ok: false, stage: "header", detail: `format ${h.format}` };
  if (SIZES[h.size] !== N) return { ok: false, stage: "header", detail: "size field does not match the grid" };
  const frame = frameLookup(h.species, h.version);
  if (!frame) return { ok: false, stage: "species", detail: "species not in this reader's registry" };
  const L = layout(N, frame);
  if (!L?.fits) return { ok: false, stage: "header", detail: "frame does not fit this size" };
  // re-read the data cells by position (the message order is known now)
  const index = new Map(L.msgCells.map(([r, c], i) => [r * N + c, i]));
  const bitAt = ([r, c]) => msgBits[index.get(r * N + c)] ?? 0;
  const maskBits = L.maskCells.map(bitAt);
  const shown = [], copies = {};
  for (const blk of L.blocks) {
    const ch = frame.chapters[blk.chapter];
    if (!maskBits[blk.chapter]) continue;
    ch.loci.forEach((l, li) => {
      const vals = [];
      for (let k = 0; k < l.copies; k++) {
        const bits = blk.loci[li].map((run) => bitAt(run[k]));
        shown.push(...bits);
        vals.push(fromBits(bits));
      }
      copies[l.id] = vals;
    });
  }
  const head = msgBits.slice(0, HEADER_BITS - 16);
  if (crc16([...head, ...maskBits, ...shown]) !== h.crc) return { ok: false, stage: "check", detail: "CRC-16 failed" };
  const out = {};
  for (const l of frame.heritable) {
    if (!copies[l.id]) continue;
    if (copies[l.id].some((i) => i >= l.alleles.length)) return { ok: false, stage: "check", detail: "impossible look" };
    out[l.id] = copies[l.id].map((i) => l.alleles[i]);
  }
  return {
    ok: true,
    genome: {
      species: frame.species, version: frame.version,
      read: frame.chapters.filter((_, i) => maskBits[i]).map((c) => c.name),
      unread: frame.chapters.filter((_, i) => !maskBits[i]).map((c) => c.name),
      copies: out,
    },
    crc: h.crc, postmark: h.reserved.some((b) => b) ? "present, unverified" : "none", frame,
  };
}

export function stampCode(frame, genome) {
  const { crc, mask } = encodeCells(frame, genome);
  let h = 0x811c9dc5;
  for (const l of frame.heritable) {
    if (!(Math.floor(mask / 2 ** l.chapter) & 1)) continue; // only what the stamp shows
    for (const v of genome.copies?.[l.id] ?? []) for (const ch of `${l.id}=${v};`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  }
  const hex = (v, n) => v.toString(16).toUpperCase().padStart(n, "0");
  return `S${frame.species}v${frame.version}-${hex(mask, 2)}-${hex(crc, 4)}-${hex(h >>> 8, 6)}`;
}

export function sameGenome(frame, a, b) {
  if (!b || a.species !== b.species || a.version !== b.version) return false;
  const mask = readMask(frame, a);
  for (const [ci, ch] of frame.chapters.entries()) {
    const read = Math.floor(mask / 2 ** ci) & 1;
    if (read !== (b.read.includes(ch.name) ? 1 : 0)) return false;
    if (!read) continue;
    for (const l of ch.loci) if (String(a.copies[l.id]) !== String(b.copies[l.id])) return false;
  }
  return true;
}
