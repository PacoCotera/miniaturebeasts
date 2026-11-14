// The one codec for `wb` (genome-string proposal B.7: no second decoder in Python). Reads one JSON request on stdin, writes one JSON answer on stdout.
//   {op: "encode", copies}      -> {ok, string, length, code?}   the genome string of one mibi of S20 (and its stamp code when the frame fits a stamp)
//   {op: "decode", text}        -> {ok, copies, species, version, name}  a genome string or a stamp code, for any frame the registry carries and S20's, read from the frame file the workbench writes (body/frames/species-S20.json)
//   {op: "frame"}               -> {ok, ...}  the codec's view of the frame: the ring of loci, the bits, the type's string
// S20 is not in the stamp registry yet (ticket G3 appends it). Until then this reader adds the frame `frames/species-S20.json` to its lookup, built the way tools/extract-frames.mjs reads a frame file; the registry's own
// frames are untouched. The catalogue's alleles are those a frame of catalogue frame version 7 sees (`CATALOGUE_FRAME`: the pin 11 alleles carry sinceFrame 7).
import { readFileSync, existsSync } from "node:fs";
import { LOCI } from "../../framework/catalogue.mjs";
import { frameFor } from "../../../genome-stamp/src/frames.mjs";
import { genomeString, decodeGenomeString } from "../../../genome-stamp/src/string.mjs";
import { stampCode, decodeStampCode, sizeFor } from "../../../genome-stamp/src/codec.mjs";

const FRAME_FILE = process.env.WB_FRAME_FILE ? new URL("file://" + process.env.WB_FRAME_FILE) : new URL("../frames/species-S20.json", import.meta.url);
export const CATALOGUE_FRAME = 7;
const bitsFor = (n) => (n <= 1 ? 0 : Math.ceil(Math.log2(n)));

export function codecFrame(d) {
  const chapters = d.chapters.map((ch) => ({
    name: ch.name, sealed: !!ch.sealed,
    loci: ch.traits.flatMap((t) => t.loci).map((id) => {
      const cat = LOCI.get(id), row = d.loci.find((l) => l.id === id);
      const known = cat.alleles.filter((a) => !(a.sinceFrame > CATALOGUE_FRAME));
      const numeric = cat.operator === "copy-mean" && known.every((a) => typeof a.value === "number");
      return { id, trait: row.trait, alleles: known.map((a) => a.id), ...(numeric ? { values: known.map((a) => a.value) } : {}), pool: row.alleles, copies: 2 };
    }),
  }));
  chapters.forEach((ch, ci) => ch.loci.forEach((l) => { l.chapter = ci; l.bits = Math.max(1, bitsFor(l.alleles.length)); }));
  const heritable = chapters.flatMap((c) => c.loci);
  let h = (0x811c9dc5 ^ d.species.order) >>> 0;                         // the border seed, as frames.mjs `finish` makes it (no locked rows)
  const f = { species: d.species.order, version: d.frameVersion, id: d.species.id, name: d.species.name, glyph: d.glyph, chapters, locked: [], heritable, borderSeed: h, payloadBits: heritable.reduce((s, l) => s + l.bits * l.copies, 0) };
  return f;
}

export function lookup() {
  const own = existsSync(FRAME_FILE) ? codecFrame(JSON.parse(readFileSync(FRAME_FILE, "utf8"))) : null;
  return (species, version) => (own && species === own.species && version === own.version ? own : frameFor(species, version));
}

function main(req) {
  const look = lookup();
  const own = look(20, 1);
  if (req.op === "frame") {
    if (!own) return { ok: false, detail: "frames/species-S20.json is not written yet (wb frame writes it)" };
    return { ok: true, species: own.species, version: own.version, loci: own.heritable.length, payloadBits: own.payloadBits, chapters: own.chapters.map((c) => ({ name: c.name, loci: c.loci.map((l) => l.id) })) };
  }
  if (req.op === "encode") {
    if (!own) return { ok: false, detail: "frames/species-S20.json is not written yet (wb frame writes it)" };
    let string;
    try { string = genomeString(own, { copies: req.copies }); } catch (e) { return { ok: false, detail: e.message }; }
    let code = null;
    try { code = sizeFor(own, {}) ? stampCode(own, { copies: req.copies }) : null; } catch (e) { code = null; }
    return { ok: true, string, length: string.length, code, species: own.species, version: own.version };
  }
  if (req.op === "decode") {
    const text = String(req.text ?? "");
    const isString = /^\s*G\d+-/i.test(text), isCode = /^\s*S\d+V\d+-[0-9A-F]+-/i.test(text);
    if (!isString && !isCode) {
      if (/^\s*[0-9A-Z]{9}\s*$/i.test(text)) return { ok: false, stage: "name", detail: "a name code names a mibi; it holds no genes" };
      return { ok: false, stage: "string", detail: "not a genome string (it opens G<format>-S<species>v<version>-) or a stamp code (S<species>v<version>-<mask>-)" };
    }
    const r = isString ? decodeGenomeString(text, look) : decodeStampCode(text, look);
    if (!r.ok) return { ok: false, stage: r.stage, detail: r.detail };
    const complete = isString || (r.genome.read ?? []).length === r.frame.chapters.filter((c) => !c.sealed).length;
    return { ok: true, kind: isString ? "string" : "code", species: r.genome.species, version: r.genome.version, name: r.frame.name, id: r.frame.id, copies: r.genome.copies, complete,
             unread: isString ? [] : r.frame.chapters.filter((c) => !(r.genome.read ?? []).includes(c.name)).map((c) => c.name) };
  }
  return { ok: false, detail: `unknown op ${req.op}` };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let raw = "";
  process.stdin.on("data", (d) => (raw += d));
  process.stdin.on("end", () => process.stdout.write(JSON.stringify(main(JSON.parse(raw))) + "\n"));
}
