// The stamp's codec and cell layout.
//
// Grid: N x N square cells, N in a size series (17, 21, 25 ...). From the outside in:
//   ring 0  perforation: a dot on every even cell, the timing marks
//   ring 1  the frame: solid, the finder edge (one closed square, not QR's three)
//   ring 2  the species border: Manchester pairs from the species' locked frame,
//           identical for every member; it names the species and the orientation
//   inside  the 5x5 species glyph in the top-left corner (a gutter from 21 up);
//           from the foot up: Reed–Solomon parity, the header (+ postmark when
//           flagged), the read mask; from the top down: the chapter blocks
//           (column-filled rectangles of cell pairs: copy 1 above copy 2, or
//           as many copies as the frame says).
//
// One Reed–Solomon codeword (GF(256), ~30% parity) covers header, CRC, mask and
// every data cell; the CRC-16 runs end to end over header, mask and the shown
// payload, so an RS miscorrection cannot pass. Unread chapters stay blank.
//
// Format 2 (2026-10-09, blends on a fixed fine step): a continuous locus (one whose frame carries its
// alleles' values) packs each copy in STEP_BITS bits: codes below the allele count are the named
// alleles, and code (allele count + k) is step k of BLEND_STEPS over the locus's catalogue range
// (stepValue: the same values as the workbench's catalogue.mjs), so a blended copy round-trips
// exactly. Every other locus packs as in format 1. Format 1 (a blended copy as its bin, the nearest
// named allele) still decodes, so a print made before keeps reading.
import { frameFor } from "./frames.mjs";
import { rsEncode } from "./rs.mjs";

export const FORMAT = 2;            // what the encoder writes; the decoder reads FORMATS
export const FORMATS = [1, 2];
// The step: 6 bits a blended copy, the finest step those 6 bits hold beside the named alleles (at most
// 4 on any continuous locus of the catalogue): 64 codes = 4 names + 60 values, so 59 steps over the
// range, each 1/59 of it (1.7%; the cross's nudge of 10% spans 6 steps). Measured in
// tests/bins.test.mjs ("the step's cost"): every species of the registry stays within 37x37 even
// with a postmark, the largest size the robustness runs have read (README, Results).
export const BLEND_STEPS = 59;      // steps over a continuous locus's catalogue range (catalogue.mjs BLEND_STEPS)
export const STEP_BITS = 6;         // bits per copy of a continuous locus in format 2
const round6 = (v) => Math.round(v * 1e6) / 1e6;
// Step k of a continuous stamp locus (l.values: its catalogue alleles' values), and the step a number sits on (-1 when off it).
export const stepValue = (l, k) => { const lo = Math.min(...l.values), hi = Math.max(...l.values); return round6(lo + (k * (hi - lo)) / BLEND_STEPS); };
export function stepOf(l, v) {
  if (typeof v !== "number" || !l.values) return -1;
  const lo = Math.min(...l.values), hi = Math.max(...l.values), k = Math.round(((v - lo) / (hi - lo)) * BLEND_STEPS);
  return k >= 0 && k <= BLEND_STEPS && stepValue(l, k) === v ? k : -1;
}
// The bits a copy of a locus takes in a format (stepBits: for measuring other step sizes only).
export const locusBits = (l, format = FORMAT, stepBits = STEP_BITS) => (format >= 2 && l.values ? stepBits : l.bits);
export const SIZES = [17, 21, 25, 29, 33, 37, 41, 45, 49];
export const POSTMARK_BITS = 64; // a signed postmark, carried only when present
// format, species, frame version, size, postmark flag; then the postmark (when
// the flag is set) and the CRC-16
export const HEADER_FIELDS = [["format", 4], ["species", 12], ["version", 10], ["size", 4], ["postmark", 1]];
export const headerBits = (postmark) => HEADER_FIELDS.reduce((s, [, n]) => s + n, 0) + (postmark ? POSTMARK_BITS : 0) + 16; // 47, or 111
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
// parts, enough to run Reed–Solomon and read the header). postmark: whether
// the 64 postmark bits are carried.
//
// Every interior cell except the glyph corner is in the codeword. Codeword
// order runs from the foot upward (bottom row first, left to right): first the
// Reed–Solomon parity, then the header, then the read mask, then the rest. The
// chapter blocks are laid from the top down in the cells the foot leaves, so
// a stamp fills from both ends and its size grows only when they meet.
export function layout(N, frame, { postmark = false, format = FORMAT, stepBits = STEP_BITS } = {}) {
  const M = N - 6, o = 3;
  const g = N >= 21 ? 6 : 5; // the glyph corner: 5x5, plus a gutter from 21 cells up
  const inGlyph = (r, c) => r < g && c < g;
  const order = [];
  for (let r = M - 1; r >= 0; r--) for (let c = 0; c < M; c++) if (!inGlyph(r, c)) order.push([o + r, o + c]);
  const C = order.length, B = Math.floor(C / 8), p = 2 * Math.ceil(PARITY_SHARE * B), m = B - p;
  const H = headerBits(postmark);
  if (8 * m < H) return null;
  const parityCells = order.slice(0, 8 * p), rest = order.slice(8 * p);
  const msgCells = rest.slice(0, 8 * m), unused = rest.slice(8 * m);
  const headerCells = msgCells.slice(0, H);
  const L = { N, M, p, m, B, H, postmark, format, glyph: { r0: o, c0: o, g }, parityCells, msgCells, headerCells, unused, fits: true };
  if (!frame) return L;
  const nch = frame.chapters.length;
  if (H + nch > msgCells.length) return { ...L, fits: false };
  const maskCells = msgCells.slice(H, H + nch);
  const free = new Set(msgCells.slice(H + nch).map(([r, c]) => r * N + c));
  // bands: beside the glyph (g tall), then under it; columns hold the free cells top-down
  const bands = [{ r0: 0, c0: g, h: g, w: M - g }, { r0: g, c0: 0, h: M - g, w: M }].filter((b) => b.h > 0 && b.w > 0);
  const columns = bands.map((b) => Array.from({ length: b.w }, (_, c) => {
    const col = [];
    for (let r = 0; r < b.h; r++) { const rc = [o + b.r0 + r, o + b.c0 + c]; if (free.has(rc[0] * N + rc[1])) col.push(rc); else break; }
    return col;
  }));
  const next = bands.map(() => 0);
  const blocks = [];
  // chapters: whole columns; bits fill each column top-down, one vertical run
  // of `copies` cells per bit (copy 1 on top)
  const place = (bi, ch) => {
    const cols = columns[bi];
    let ci = next[bi], row = 0;
    const startCol = ci, cellsOf = [];
    for (const l of ch.loci) {
      const runs = [];
      for (let bit = 0, nb = locusBits(l, format, stepBits); bit < nb; bit++) {
        while (ci < cols.length && row + l.copies > cols[ci].length) { ci++; row = 0; }
        if (ci >= cols.length) return null;
        runs.push(cols[ci].slice(row, row + l.copies));
        row += l.copies;
      }
      cellsOf.push(runs);
    }
    return { band: bi, colStart: startCol, colEnd: row === 0 ? ci : ci + 1, loci: cellsOf };
  };
  for (const [chi, ch] of frame.chapters.entries()) {
    let blk = null;
    for (let bi = 0; bi < columns.length && !blk; bi++) { blk = place(bi, ch); if (blk) next[bi] = blk.colEnd; }
    if (!blk) return { ...L, fits: false };
    const b = bands[blk.band];
    const used = blk.loci.flat(2);
    blk.rect = { r0: o + b.r0, c0: o + b.c0 + blk.colStart, r1: Math.max(...used.map(([r]) => r)) + 1, c1: o + b.c0 + blk.colEnd };
    blk.chapter = chi;
    blocks.push(blk);
  }
  return { ...L, maskCells, blocks };
}

export function sizeFor(frame, { postmark = false, format = FORMAT, stepBits = STEP_BITS } = {}) {
  for (const N of SIZES) { const L = layout(N, frame, { postmark, format, stepBits }); if (L && L.fits) return L; }
  return null;
}
// a postmark is 64 bits, given as 16 hex digits
const postmarkBits = (genome) => (genome.postmark ? [...genome.postmark.padStart(16, "0")].flatMap((h) => toBits(parseInt(h, 16), 4)) : null);

// A copy's code. Format 2: a named look is its index among the locus's alleles; a blended copy (a
// number, the cross's continuous loci) is its step after the named alleles, and -1 when it is not on
// the step (never rounded: the stamp holds the exact genome or nothing). Format 1: a blended copy is
// its bin, the nearest named allele by value (scanning shows, never grants).
export function copyIndex(l, copy, format = FORMAT) {
  if (format >= 2 && l.values && typeof copy === "number") { const k = stepOf(l, copy); return k < 0 ? -1 : l.alleles.length + k; }
  if (typeof copy === "number" && l.values) {
    let best = -1, d = Infinity;
    l.values.forEach((v, i) => { const e = Math.abs(v - copy); if (e < d) { d = e; best = i; } });
    return best;
  }
  return l.alleles.indexOf(copy);
}
export const copyLook = (l, copy) => l.alleles[copyIndex(l, copy, 1)];
// A code back to its copy: a named allele, or (format 2, a continuous locus) the stepped number; undefined when impossible.
export function copyOf(l, code, format = FORMAT) {
  if (code < l.alleles.length) return l.alleles[code];
  if (format >= 2 && l.values && code - l.alleles.length <= BLEND_STEPS) return stepValue(l, code - l.alleles.length);
  return undefined;
}
// What two copies are compared by: exact in format 2 (a name, or the stepped number), the look in format 1.
const copyKey = (l, c, format) => (format >= 2 ? String(c) : copyLook(l, c));

export function readMask(frame, genome) {
  if (typeof genome.readMask === "number") return genome.readMask;
  const read = genome.read ?? frame.chapters.filter((c) => !c.sealed).map((c) => c.name);
  return frame.chapters.reduce((m, c, i) => (read.includes(c.name) ? m + 2 ** i : m), 0);
}

// Genome -> cell values. Returns {L, cells: Map(r*N+c -> {v, kind, copy}), crc}.
export function encodeCells(frame, genome, L = sizeFor(frame, { postmark: !!genome.postmark, format: genome.format ?? FORMAT })) {
  if (!L) throw new Error(`${frame.name}: no stamp size fits`);
  const format = L.format ?? FORMAT;
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
          idx = copyIndex(l, pair?.[k], format);
          if (idx < 0) throw new Error(`${l.id} copy ${k + 1}: ${typeof pair?.[k] === "number" && l.values ? `${pair[k]} is not on the blend step` : `unknown look ${pair?.[k]}`}`);
        }
        const bits = toBits(idx, locusBits(l, format));
        blk.loci[li].forEach((run, bit) => {
          set(run[k], read ? bits[bit] : 0, read ? "data" : "unread", { copy: k, chapter: blk.chapter, locus: l.id });
          if (read) shown.push(bits[bit]);
        });
      }
    });
  }
  L.maskCells.forEach((rc, i) => set(rc, maskBits[i], "mask"));
  const sizeIdx = SIZES.indexOf(N), pm = postmarkBits(genome);
  const head = [...toBits(format, 4), ...toBits(frame.species, 12), ...toBits(frame.version, 10), ...toBits(sizeIdx, 4), pm ? 1 : 0, ...(pm ?? [])];
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
export function parseMessage(msgBits, N, { postmark = false } = {}, frameLookup = frameFor) {
  const take = (() => { let i = 0; return (n) => { const v = msgBits.slice(i, i + n); i += n; return v; }; })();
  const h = {};
  for (const [k, n] of HEADER_FIELDS) h[k] = fromBits(take(n));
  if (h.postmark !== (postmark ? 1 : 0)) return { ok: false, stage: "header", detail: "postmark flag does not match the layout" };
  const pmBits = postmark ? take(POSTMARK_BITS) : [];
  h.crc = fromBits(take(16));
  if (!FORMATS.includes(h.format)) return { ok: false, stage: "header", detail: `format ${h.format}` };
  if (SIZES[h.size] !== N) return { ok: false, stage: "header", detail: "size field does not match the grid" };
  const frame = frameLookup(h.species, h.version);
  if (!frame) return { ok: false, stage: "species", detail: "species not in this reader's registry" };
  const L = layout(N, frame, { postmark, format: h.format });
  if (!L?.fits) return { ok: false, stage: "header", detail: "frame does not fit this size" };
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
  const head = msgBits.slice(0, L.H - 16);
  if (crc16([...head, ...maskBits, ...shown]) !== h.crc) return { ok: false, stage: "check", detail: "CRC-16 failed" };
  const out = {};
  for (const l of frame.heritable) {
    if (!copies[l.id]) continue;
    const vals = copies[l.id].map((i) => copyOf(l, i, h.format));
    if (vals.some((v) => v === undefined)) return { ok: false, stage: "check", detail: "impossible look" };
    out[l.id] = vals;
  }
  const hex = postmark ? Array.from({ length: 16 }, (_, i) => fromBits(pmBits.slice(4 * i, 4 * i + 4)).toString(16)).join("") : null;
  return {
    ok: true,
    genome: {
      species: frame.species, version: frame.version, format: h.format,
      read: frame.chapters.filter((_, i) => maskBits[i]).map((c) => c.name),
      unread: frame.chapters.filter((_, i) => !maskBits[i]).map((c) => c.name),
      copies: out, ...(hex ? { postmark: hex } : {}),
    },
    crc: h.crc, postmark: hex ? "present, unverified" : "none", frame,
  };
}

// --- the stamp code: the stamp's own bytes as text (decided 2026-10-09) ----------------------------
// The code is the stamp's message bytes (header, CRC-16, read mask and the chapter blocks: exactly
// what the cells carry before Reed–Solomon parity, so everything its keeper has read, hidden and
// sleeping copies included, and nothing of an unread or sealed chapter), its trailing zero bytes
// dropped, written five bits a character in an alphabet free of look-alikes (Crockford's base 32: no
// I, L, O or U), then two check characters (CRC-10 over those characters' bits: any one changed
// character, and any two swapped neighbours, is refused). It opens with the species, frame version
// and read mask in plain text (S1v3-03-), which must agree with the bytes. It decodes to what a scan
// of the stamp gives; a code only shows a mibi, it never creates or moves one.
export const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const LOOKALIKE = { O: "0", I: "1", L: "1" };
// CRC-10 (poly 0x233, the ATM HEC-10 polynomial), bitwise, init 0: it catches every burst of up to 10 bits.
export function crc10(bits) {
  let c = 0;
  for (const b of bits) { const top = ((c >> 9) & 1) ^ (b & 1); c = (c << 1) & 0x3ff; if (top) c ^= 0x233; }
  return c;
}
const charsOf = (bits) => { const out = []; for (let i = 0; i < bits.length; i += 5) out.push(CODE_ALPHABET[fromBits([...bits.slice(i, i + 5), 0, 0, 0, 0, 0].slice(0, 5))]); return out.join(""); };
// The message bytes of a stamp (the codeword before its parity), as encodeCells lays them.
export function stampBytes(frame, genome) {
  const { L, cells, mask } = encodeCells(frame, genome);
  const bits = L.msgCells.map(([r, c]) => cells.get(r * L.N + c)?.v ?? 0), bytes = [];
  for (let i = 0; i < bits.length; i += 8) bytes.push(fromBits(bits.slice(i, i + 8)));
  return { bytes, L, mask };
}
export function stampCode(frame, genome) {
  const { bytes, mask } = stampBytes(frame, genome);
  let n = bytes.length; while (n > 0 && bytes[n - 1] === 0) n--;
  const body = charsOf(bytes.slice(0, n).flatMap((b) => toBits(b, 8)));
  const check = charsOf(toBits(crc10(body.split("").flatMap((ch) => toBits(CODE_ALPHABET.indexOf(ch), 5))), 10));
  return `S${frame.species}v${frame.version}-${mask.toString(16).toUpperCase().padStart(2, "0")}-${body}${check}`;
}
// A pasted code back to the stamp's genome: the same result as parseMessage on a scan (ok, genome,
// frame), or a refusal naming its stage. Spaces, dots and dashes in the body are ignored, and O, I
// and L read as 0, 1 and 1; any other character outside the alphabet, a failed check, or a prefix
// that disagrees with the bytes is refused.
export function decodeStampCode(text, frameLookup = frameFor) {
  const m = /^\s*S(\d+)V(\d+)-([0-9A-F]+)-(.*)$/s.exec(String(text ?? "").toUpperCase());
  if (!m) return { ok: false, stage: "code", detail: "not a stamp code (it opens S<species>v<version>-<mask>-)" };
  const chars = [];
  for (const ch of m[4].replace(/[\s.\-·]/g, "")) { const c = LOOKALIKE[ch] ?? ch, v = CODE_ALPHABET.indexOf(c); if (v < 0) return { ok: false, stage: "code", detail: `"${ch}" is not a code character` }; chars.push(v); }
  if (chars.length < 3) return { ok: false, stage: "code", detail: "too short" };
  const body = chars.slice(0, -2), bits = body.flatMap((v) => toBits(v, 5));
  if (crc10(bits) !== fromBits(chars.slice(-2).flatMap((v) => toBits(v, 5)))) return { ok: false, stage: "check", detail: "the check characters do not match: a character is wrong" };
  const nBytes = Math.floor(bits.length / 8);
  if (bits.slice(nBytes * 8).some(Boolean) || bits.length - nBytes * 8 >= 5) return { ok: false, stage: "code", detail: "the code's length is not a whole stamp" };
  let i = 0; const field = (n) => fromBits(bits.slice(i, (i += n)));
  const head = Object.fromEntries(HEADER_FIELDS.map(([k, n]) => [k, field(n)]));
  const N = SIZES[head.size], postmark = head.postmark === 1, L = N && layout(N, null, { postmark });
  if (!L || nBytes > L.m) return { ok: false, stage: "header", detail: "no stamp of this size" };
  const msgBits = [...bits.slice(0, nBytes * 8), ...new Array((L.m - nBytes) * 8).fill(0)];
  const res = parseMessage(msgBits, N, { postmark }, frameLookup);
  if (!res.ok) return res;
  const mask = res.frame.chapters.reduce((s, c, ci) => (res.genome.read.includes(c.name) ? s + 2 ** ci : s), 0);
  if (Number(m[1]) !== res.genome.species || Number(m[2]) !== res.genome.version || parseInt(m[3], 16) !== mask) return { ok: false, stage: "check", detail: "the code's opening disagrees with its bytes" };
  return { ...res, N };
}

export function sameGenome(frame, a, b) {
  if (!b || a.species !== b.species || a.version !== b.version) return false;
  const mask = readMask(frame, a), format = b.format ?? FORMAT;
  for (const [ci, ch] of frame.chapters.entries()) {
    const read = Math.floor(mask / 2 ** ci) & 1;
    if (read !== (b.read.includes(ch.name) ? 1 : 0)) return false;
    if (!read) continue;
    for (const l of ch.loci) if (a.copies[l.id].map((c) => copyKey(l, c, format)).join() !== b.copies[l.id].map((c) => copyKey(l, c, format)).join()) return false;
  }
  return true;
}
