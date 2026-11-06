// The genome string: the whole genome of one mibi as text (ticket G2 of the genome-string proposal, T-20261102-genome-string, section B).
//
// The stamp is a picture of what its keeper has read; the string is everything heritable, sealed chapters too. It holds the string's format, the species number, the
// frame version, and both copies of every heritable locus of that frame in frame order (chapters in ring order, then the loci of each chapter: the order the stamp lays
// its blocks in). It holds nothing else: no read mask, no locked copies (the frame has them), no catalogue pin, no house (a house change redraws a mibi and never changes its
// string), no name, parents or kinship (the save has them).
//
// Format G1:  G1-S<species>v<frame>-<body><check>
//   the opening is plain text for people; the body is Crockford base 32 (the stamp code's alphabet, CODE_ALPHABET) of these bits, zero-padded to a whole character:
//     format 4 bits (1), species 12 bits, frame version 10 bits, then the payload, a locus after a locus:
//       a named locus (a switch, a pair map, a pigment): two copies, each its index among the frame's alleles in `locus.bits` bits (the stamp's copy codes);
//       a continuous locus (its frame carries its alleles' values): 1 bit, "the two copies are equal", then one 6-bit code if they are, or two if not. A code below the
//       number of named alleles is that allele; code (alleles + k) is step k of the 59 (codec.mjs copyIndex and copyOf in stamp format 2). A blended child carries two equal
//       copies (the cross), so a bred mibi's string is short. The short form is the only form for equal copies: one genome, one string.
//   the check is two characters, the stamp code's CRC-10 over the body's bits, so any one changed character and any two swapped neighbours are refused.
// A reader ignores case, and spaces, dots and dashes in the body (a string may be shown in groups of five); it reads O as 0 and I and L as 1.
//
// A frame never changes (a new frame version is a new frame), so a string decodes with no catalogue, no house and no network for as long as its frame is carried.
// The reader keeps every format it ever wrote: STRING_FORMATS lists them, and a new format comes only when the bit layout changes.
//
// The encoder refuses, and never rounds or invents: a locus with no copies, a blend off the 59-step grid, a look the frame does not know. The decoder refuses, each with its
// stage: "string" (not a genome string, a character outside the alphabet, too short), "header" (a format this reader does not know, the opening disagreeing with the bits),
// "check" (the check characters fail), "species" (the frame is not carried: "This species isn't in the studio yet"), "look" (a code with no look, or not the canonical form),
// "length" (the wrong length for the frame).
import { frameFor } from "./frames.mjs";
import { CODE_ALPHABET, LOOKALIKE, STEP_BITS, crc10, charsOf, copyIndex, copyOf, toBits, fromBits } from "./codec.mjs";

export const STRING_FORMAT = 1;           // what the encoder writes
export const STRING_FORMATS = [1];        // what the decoder reads
const COPY_FORMAT = 2;                    // the stamp format whose copy codes the string uses (named alleles, then the 59 steps)
export const STRING_HEADER_FIELDS = [["format", 4], ["species", 12], ["version", 10]];
const HEADER_BITS = STRING_HEADER_FIELDS.reduce((s, [, n]) => s + n, 0); // 26

const checkOf = (body) => charsOf(toBits(crc10(body.split("").flatMap((ch) => toBits(CODE_ALPHABET.indexOf(ch), 5))), 10));

// A genome ({copies: {locus: [a, b]}}, as the stamp takes it; an mb-genome/2 record's `loci` works too) to its string for a frame.
export function genomeString(frame, genome) {
  const copiesOf = genome.copies ?? genome.loci;
  if (!copiesOf) throw new Error(`${frame.name}: no copies`);
  if (frame.species > 0xfff || frame.version > 0x3ff) throw new Error(`${frame.name}: species ${frame.species} version ${frame.version} does not fit the string's header`);
  const bits = [...toBits(STRING_FORMAT, 4), ...toBits(frame.species, 12), ...toBits(frame.version, 10)];
  for (const l of frame.heritable) {
    if (l.copies !== 2) throw new Error(`${l.id}: the genome string holds two copies of a locus, this frame has ${l.copies}`);
    const pair = copiesOf[l.id];
    if (!Array.isArray(pair) || pair.length !== 2) throw new Error(`${l.id}: two copies required, none invented`);
    const codes = pair.map((c, k) => {
      const idx = copyIndex(l, c, COPY_FORMAT);
      if (idx < 0) throw new Error(`${l.id} copy ${k + 1}: ${typeof c === "number" && l.values ? `${c} is not on the blend step` : `unknown look ${c}`}`);
      return idx;
    });
    if (l.values) {
      if (codes[0] === codes[1]) bits.push(1, ...toBits(codes[0], STEP_BITS));
      else bits.push(0, ...toBits(codes[0], STEP_BITS), ...toBits(codes[1], STEP_BITS));
    } else for (const idx of codes) bits.push(...toBits(idx, l.bits));
  }
  const body = charsOf(bits);
  return `G${STRING_FORMAT}-S${frame.species}v${frame.version}-${body}${checkOf(body)}`;
}

const refuse = (stage, detail) => ({ ok: false, stage, detail });

// A pasted string back to the genome: {ok: true, genome: {species, version, stringFormat, copies}, frame}, or a refusal naming its stage.
export function decodeGenomeString(text, frameLookup = frameFor) {
  const m = /^\s*G(\d+)-S(\d+)V(\d+)-(.*)$/s.exec(String(text ?? "").toUpperCase());
  if (!m) return refuse("string", "not a genome string (it opens G<format>-S<species>v<version>-)");
  const [format, species, version] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (!STRING_FORMATS.includes(format)) return refuse("header", `format G${format} is not one this reader knows (it reads ${STRING_FORMATS.map((f) => `G${f}`).join(", ")})`);
  const chars = [];
  for (const ch of m[4].replace(/[\s.\-·]/g, "")) {
    const c = LOOKALIKE[ch] ?? ch, v = CODE_ALPHABET.indexOf(c);
    if (v < 0) return refuse("string", `"${ch}" is not a string character`);
    chars.push(v);
  }
  if (chars.length < 3) return refuse("string", "too short");
  const body = chars.slice(0, -2), bits = body.flatMap((v) => toBits(v, 5));
  if (crc10(bits) !== fromBits(chars.slice(-2).flatMap((v) => toBits(v, 5)))) return refuse("check", "the check characters do not match: a character is wrong");
  if (bits.length < HEADER_BITS) return refuse("string", "too short");
  let i = 0;
  const take = (n) => { if (i + n > bits.length) throw new RangeError("short"); const v = fromBits(bits.slice(i, i + n)); i += n; return v; };
  const head = Object.fromEntries(STRING_HEADER_FIELDS.map(([k, n]) => [k, take(n)]));
  if (head.format !== format || head.species !== species || head.version !== version) return refuse("header", "the string's opening disagrees with its bits");
  const frame = frameLookup(species, version);
  if (!frame) return refuse("species", `species ${species}, frame version ${version}: this species isn't in the studio yet`);
  const copies = {};
  try {
    for (const l of frame.heritable) {
      if (l.copies !== 2) return refuse("species", `${l.id}: this frame does not hold two copies of a locus`);
      let codes;
      if (l.values) {
        const equal = take(1);
        const a = take(STEP_BITS);
        codes = [a, equal ? a : take(STEP_BITS)];
        if (!equal && codes[0] === codes[1]) return refuse("look", `${l.id}: equal copies are written in the short form`);
      } else codes = [take(l.bits), take(l.bits)];
      const vals = codes.map((c) => copyOf(l, c, COPY_FORMAT));
      if (vals.some((v) => v === undefined)) return refuse("look", `${l.id}: a code with no look`);
      copies[l.id] = vals;
    }
  } catch (e) {
    if (e instanceof RangeError) return refuse("length", "too short for this frame");
    throw e;
  }
  if (bits.length - i >= 5) return refuse("length", "too long for this frame");
  if (bits.slice(i).some(Boolean)) return refuse("length", "the padding after the last locus is not empty");
  return { ok: true, genome: { species: frame.species, version: frame.version, stringFormat: format, copies }, frame };
}

// The string's formats, for a reader that wants to list them.
export const stringFormats = () => STRING_FORMATS.map((f) => ({ format: f, opening: `G${f}`, bits: HEADER_BITS, current: f === STRING_FORMAT }));
