// assertLineCase(body): the case of the lines a props builder sets (sentence case, the copywriter's rule): the frame's line (line.ok, line.subject, line.need, at any depth; a screen's own line,
// Home's bar line or Idle's, every string it holds) and every caption
// and notice string the props carry start with a capital, a digit or a glyph, which is to say capLine (views/words.mjs) leaves each as it is. In report mode: the misses are counted and printed
// once per label (the `where` a builder is wrapped with), when the test file's process ends, and nothing fails. lineCased(build, name) wraps a builder so every body it returns is checked.
import { capLine } from "../../src/views/words.mjs";

const REPORT = true;   // report mode: each screen is switched to fail mode with its own type change
const seen = new Map();   // the counts by label: { checked, misses }
const LINE = new Set(["ok", "subject", "need"]), WORDS = /^(caption|captions|notice|notices)$/i;
function strings(v, out) { if (typeof v === "string") out.push(v); else if (Array.isArray(v)) v.forEach((x) => strings(x, out)); else if (v && typeof v === "object") for (const x of Object.values(v)) strings(x, out); return out; }
function walk(v, at, out) {
  if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${at}.${i}`, out)); return; }
  if (!v || typeof v !== "object") return;
  for (const [k, x] of Object.entries(v)) {
    const p = at ? `${at}.${k}` : k;
    if (k === "line" && typeof x === "string") out.push([p, x]);   // a line given whole (Idle's)
    else if (k === "line" && x && typeof x === "object" && !Array.isArray(x)) for (const [lk, lv] of Object.entries(x)) if (LINE.has(lk) && typeof lv === "string") out.push([`${p}.${lk}`, lv]); else if (!LINE.has(lk) && !("ok" in x || "subject" in x)) for (const s of strings(lv, [])) out.push([`${p}.${lk}`, s]);   // a line of a screen's own (Home's bar line: its needs, goal, note or verb)
    if (WORDS.test(k)) for (const s of strings(x, [])) out.push([p, s]);
    walk(x, p, out);
  }
}
export function assertLineCase(body, where = "") {
  const out = []; walk(body, "", out);
  const mine = seen.get(where) ?? seen.set(where, { checked: 0, misses: [] }).get(where);
  for (const [p, s] of out) { if (!s.trim()) continue; mine.checked++; if (capLine(s) !== s) { mine.misses.push(`${p}: "${s}"`); if (!REPORT) throw new Error(`a line that starts in lowercase: ${where} ${p} "${s}"`); } }
}
export const lineCased = (build, where) => (...a) => { const r = build(...a); if (r && typeof r.then === "function") return r.then((v) => (assertLineCase(v, where), v)); assertLineCase(r, where); return r; };
process.on("exit", () => {
  const file = String(process.argv[1] ?? "").split("/").pop();   // the file whose process this is: a test file that imports another's tests runs them under its own name
  for (const [where, c] of seen) {
    if (!c.checked) continue;
    const distinct = [...new Set(c.misses)];
    console.log(`line case (report mode): ${where || "unlabelled"} (in ${file}): ${c.checked} lines checked, ${c.misses.length} start in lowercase (${distinct.length} distinct)${distinct.length ? ": " + distinct.slice(0, 6).join("; ") + (distinct.length > 6 ? "; …" : "") : ""}`);
  }
});
