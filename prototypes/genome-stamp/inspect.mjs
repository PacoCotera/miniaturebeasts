// The inspector's page script (inspect.html): a pasted stamp code read back as the stamp's genome. It only shows.
import { decodeStampCode } from "./src/codec.mjs";

const out = document.getElementById("out"), code = document.getElementById("code");
function show() {
  const d = decodeStampCode(code.value);
  if (!d.ok) { out.textContent = `No read: ${d.detail} (${d.stage}).`; return; }
  const g = d.genome, f = d.frame, lines = [];
  lines.push(`${f.name}, species ${g.species}, frame version ${g.version}, stamp format ${g.format}, ${d.N}×${d.N} cells`);
  lines.push(`Read: ${g.read.join(", ") || "nothing"}`);
  lines.push(`Not in the stamp: ${g.unread.join(", ") || "nothing"}`);
  if (g.postmark) lines.push(`Postmark: ${g.postmark} (present, unverified)`);
  for (const ch of f.chapters) {
    if (!g.read.includes(ch.name)) continue;
    lines.push("", ch.name);
    for (const l of ch.loci) lines.push(`  ${l.trait} · ${l.id}: ${g.copies[l.id].join(" / ")}`);
  }
  out.textContent = lines.join("\n");
}
document.getElementById("read").addEventListener("click", show);
code.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) show(); });
const q = new URLSearchParams(location.search).get("code");
if (q) { code.value = q; show(); }
