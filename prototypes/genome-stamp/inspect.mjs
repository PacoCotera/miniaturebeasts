// The inspector's page script (inspect.html): a pasted stamp code or genome string read back as the genome it holds. It only shows.
import { decodeStampCode, stampCode } from "./src/codec.mjs";
import { decodeGenomeString } from "./src/string.mjs";

const out = document.getElementById("out"), code = document.getElementById("code");
const chapterLines = (f, copies, lines, only) => {
  for (const ch of f.chapters) {
    if (only && !only.includes(ch.name)) continue;
    lines.push("", ch.sealed ? `${ch.name} (sealed)` : ch.name);
    for (const l of ch.loci) lines.push(`  ${l.trait} · ${l.id}: ${copies[l.id].join(" / ")}`);
  }
};
// A genome string holds every heritable locus, sealed chapters too, and nothing else.
function showString(d) {
  const g = d.genome, f = d.frame, lines = [];
  lines.push(`${f.name}, species ${g.species}, frame version ${g.version}, genome string format G${g.stringFormat}`);
  lines.push("The whole genome: every chapter, sealed ones too. No read mask, locked copies, pin or house.");
  chapterLines(f, g.copies, lines);
  const open = f.chapters.filter((c) => !c.sealed);
  try {   // the stamp code of the same genome with every open chapter read, beside the string
    const mask = f.chapters.reduce((m, c, i) => (c.sealed ? m : m + 2 ** i), 0);
    lines.push("", `Stamp code, ${open.length ? "every open chapter read" : "nothing to read"}: ${stampCode(f, { copies: g.copies, readMask: mask })}`);
  } catch (e) { lines.push("", `No stamp code: ${e.message}`); }
  out.textContent = lines.join("\n");
}
function showStamp(d) {
  const g = d.genome, f = d.frame, lines = [];
  lines.push(`${f.name}, species ${g.species}, frame version ${g.version}, stamp format ${g.format}, ${d.N}×${d.N} cells`);
  lines.push(`Read: ${g.read.join(", ") || "nothing"}`);
  lines.push(`Not in the stamp: ${g.unread.join(", ") || "nothing"}`);
  if (g.postmark) lines.push(`Postmark: ${g.postmark} (present, unverified)`);
  chapterLines(f, g.copies, lines, g.read);
  out.textContent = lines.join("\n");
}
function show() {
  const text = code.value.trim();
  // The opener says what it is: G<n>- is a genome string, S<n>v<n>- a stamp code, nine characters a name code.
  if (/^G\d+-/i.test(text)) { const d = decodeGenomeString(text); if (d.ok) showString(d); else out.textContent = `No read: ${d.detail} (${d.stage}).`; return; }
  if (/^S\d+v\d+-/i.test(text)) { const d = decodeStampCode(text); if (d.ok) showStamp(d); else out.textContent = `No read: ${d.detail} (${d.stage}).`; return; }
  if (/^[0-9A-Z]{9}$/i.test(text)) { out.textContent = "No read: a name code names a mibi; it holds no genes (name)."; return; }
  out.textContent = "No read: this is neither a genome string (it opens G1-S…) nor a stamp code (it opens S…v…-) (code).";
}
document.getElementById("read").addEventListener("click", show);
code.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) show(); });
const q = new URLSearchParams(location.search).get("code") ?? new URLSearchParams(location.search).get("string");
if (q) { code.value = q; show(); }
