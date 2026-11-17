// The book page (/admin/book). Read only, server rendered, no script: drawn from editorial's four status files (book/status/ on
// the editorial branch: proof.json, pdf.json, comments.json, spreads.json), which the team's data copy puts in <dataDir>/book/ (the
// same way the bug filer puts bugs.json beside the notes). Login only, like /admin/bugs. A missing or unreadable file leaves its
// part out; nothing here is invented. Phone first, plain.
import { readFileSync } from "node:fs";
import path from "node:path";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const MX = "America/Mexico_City";
// Only the two places the links can honestly go: the claude.ai proof and the project's own GitHub release.
const safeUrl = (u) => (/^https:\/\/(claude\.ai\/artifact\/[\w-]+|github\.com\/[\w.-]+\/[\w.-]+\/releases\/[\w./%-]+)$/.test(u) ? u : "");
const isoOk = (s) => typeof s === "string" && !Number.isNaN(Date.parse(s));
const dayOf = (t, o = {}) => new Date(t).toLocaleDateString("en-CA", { timeZone: MX, ...o });
const dayWords = (iso) => new Date(iso).toLocaleDateString("en-GB", { timeZone: MX, day: "numeric", month: "short" });
const whenMX = (iso, now) => {
  const hm = new Date(iso).toLocaleTimeString("en-GB", { timeZone: MX, hour: "2-digit", minute: "2-digit" });
  return (dayOf(iso) === dayOf(now) ? "today" : dayWords(iso)) + " " + hm;
};
const ageDays = (iso, now) => { const d = Math.max(0, Math.round((now - Date.parse(iso)) / 86400000)); return d < 1 ? "today" : d + " d"; };
const first = (p) => parseInt(String(p), 10) || 0;
const pp = (p) => (String(p).includes("-") ? "pp. " : "p. ") + String(p).replace("-", "–");

// The spread states editorial's book-status.py writes, in the words the page uses (freed spreads are struck from the plan: not shown).
const STATES = [
  ["in-proof", "done", "in the proof"],
  ["in-proof-old", "old", "in the proof, old layout"],
  ["with-ad", "made", "made, not in the proof yet"],
  ["built", "made", "made, not in the proof yet"],
  ["missing", "missing", "not made yet"],
];
const CLASS_OF = Object.fromEntries(STATES.map(([k, c]) => [k, c]));
const LEGEND = [["done", "in the proof"], ["old", "in the proof, old layout"], ["made", "made, not in the proof yet"], ["missing", "not made yet"]];

// Where the admin's own server (internal tools/admin, static/index/book/) serves the two proof PDFs, behind the /admin login.
export const PDF_URLS = { full: "/admin/index/book/miniature-beasts-proof.pdf", light: "/admin/index/book/miniature-beasts-proof-light.pdf" };

export function createBook({ dataDir, now = () => Date.now() }) {
  const read = (name) => { try { const o = JSON.parse(readFileSync(path.join(dataDir, "book", name + ".json"), "utf8")); return o && typeof o === "object" ? o : null; } catch { return null; } };

  function figures() {
    const proof = read("proof"), comments = read("comments");
    const threads = comments && Array.isArray(comments.threads) ? comments.threads.filter((c) => c && typeof c === "object") : null;
    return {
      open: threads ? threads.filter((c) => c.status === "open").length : null,
      proof: proof && Number.isInteger(proof.version) ? proof.version : null,
      published: proof && isoOk(proof.published) ? proof.published : null,
    };
  }
  // The Book card's live line on the index: read only, the counts and the proof's number and time (null where unreadable).
  const summary = () => ({ ...figures(), generated: new Date(now()).toISOString() });

  function page() {
    const t = now(), proof = read("proof"), pdf = read("pdf"), comments = read("comments"), spreads = read("spreads");
    const version = proof && Number.isInteger(proof.version) ? proof.version : null;
    const lede = proof && version != null ? `Proof ${version}${isoOk(proof.published) ? ` · updated ${esc(whenMX(proof.published, t))}` : ""}` : "No proof published yet";
    // The PDFs are served by the admin's own server behind the same login (PDF_URLS): the release they come from is private, so a link to it is a "Not Found" page (owner 11-17)
    const proofUrl = proof && safeUrl(proof.url), pdfUrl = pdf ? PDF_URLS.full : "", pdfLightUrl = pdf && Number.isFinite(pdf.size_mb_light) ? PDF_URLS.light : "";
    const pdfOld = !!(pdf && pdf.stale);
    const pdfWhat = pdf ? [isoOk(pdf.built) ? dayWords(pdf.built) : "", pdfOld && version != null ? `older than proof ${version}` : "", !pdfOld && Number.isFinite(pdf.pages) ? `${pdf.pages} pages` : ""].filter(Boolean).join(" · ") : "";
    const link = (url, name, what, cls = "") => url ? `<a class="qlink" href="${esc(url)}" target="_blank" rel="noopener"><div class="name">${name} ↗</div><div class="what${cls}">${esc(what)}</div></a>` : "";
    const links = link(proofUrl, "Proof", version != null ? `Proof ${version} · claude.ai` : "claude.ai") + link(pdfUrl, "PDF", pdfWhat, pdfOld ? " old" : "")
      + link(pdfLightUrl, "PDF, light", pdfLightUrl ? `${Math.round(pdf.size_mb_light)} MB` : "", pdfOld ? " old" : "");

    // ---- your comments: the open ones by page (or by row where editorial gives no page), the fixed ones folded, newest fix first
    let cSection = "";
    const threads = comments && Array.isArray(comments.threads) ? comments.threads.filter((c) => c && typeof c === "object") : null;
    if (threads) {
      const where = (c) => (c.page != null && c.page !== "" ? pp(c.page) : Number.isInteger(c.row) ? `Row ${c.row}` : "");
      const place = (c) => (c.page != null && c.page !== "" ? first(c.page) : Number.isInteger(c.row) ? c.row : 1e9);
      const open = threads.filter((c) => c.status === "open").sort((a, b) => place(a) - place(b));
      const fixed = threads.filter((c) => c.status === "fixed").sort((a, b) => Date.parse(b.updated || 0) - Date.parse(a.updated || 0));
      const meta = (c, bits) => `<p class="meta">${[where(c) ? `<span class="page">${esc(where(c))}</span>` : "", ...bits].filter(Boolean).join(" · ")}</p>`;
      const openRow = (c) => `<li class="bug"><p class="words">${esc(c.first_comment || "(no words)")}</p>${meta(c, [isoOk(c.created) ? esc(ageDays(c.created, t)) : ""])}</li>`;
      const fixedRow = (c) => `<li class="bug"><p class="words">${esc(c.first_comment || "(no words)")}</p>${meta(c, [Number.isInteger(c.fixed_in) ? `<span class="fixed-in">fixed in proof ${c.fixed_in}</span>` : `<span class="fixed-in">fixed</span>`, isoOk(c.updated) ? esc(dayWords(c.updated)) : ""])}</li>`;
      cSection = `<section><h2>Your comments</h2><div class="tally"><div class="open"><b>${open.length}</b><span>open</span></div><div class="fixed"><b>${fixed.length}</b><span>fixed</span></div></div>`
        + (open.length ? `<ul class="cards">${open.map(openRow).join("")}</ul>` : `<p class="empty">None open.</p>`)
        + (fixed.length ? `<details class="more"><summary>Fixed (${fixed.length})</summary><ul class="cards">${fixed.map(fixedRow).join("")}</ul></details>` : "") + `</section>`;
    }

    // ---- spreads: one bar and a legend, a map of every spread in book order, the ones not made folded
    let sSection = "";
    const all = spreads && Array.isArray(spreads.spreads) ? spreads.spreads.filter((r) => r && typeof r === "object" && Object.hasOwn(CLASS_OF, r.status)) : null;
    if (all && all.length) {
      const cls = (r) => CLASS_OF[r.status], n = (c) => all.filter((r) => cls(r) === c).length;
      const shown = LEGEND.filter(([c]) => n(c));
      const missing = all.filter((r) => r.status === "missing");
      sSection = `<section><h2>Spreads</h2><div class="bar">${shown.map(([c]) => `<span class="s-${c} w-${Math.round(100 * n(c) / all.length)}"></span>`).join("")}</div>`
        + `<div class="legend">${shown.map(([c, w]) => `<span><i class="s-${c}"></i><b>${n(c)}</b> ${w}</span>`).join("")}</div>`
        + `<div class="map">${all.map((r) => `<span class="s-${cls(r)}" title="${esc(pp(r.pages))} ${esc(r.title)}">${first(r.pages)}</span>`).join("")}</div>`
        + (missing.length ? `<details class="more"><summary>Not made yet (${missing.length})</summary><ul class="plain">${missing.map((r) => `<li><b>${esc(pp(r.pages))}</b>${esc(r.title)}</li>`).join("")}</ul></details>` : "") + `</section>`;
    }
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark light"><meta name="robots" content="noindex"><title>Book</title>`
      + `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'">`
      + `<link rel="stylesheet" href="/admin/team/team.css"><link rel="stylesheet" href="/admin/bugs/bugs.css"><link rel="stylesheet" href="/admin/book/book.css"></head><body class="admin"><div id="app">`
      + `<a class="back" href="/admin/">← Admin</a>`
      + `<div class="head"><div><h1>Book</h1><p class="lede">${lede}</p>${proof && proof.last_change ? `<p class="lede sub">Last change: ${esc(proof.last_change)}</p>` : ""}</div>${links ? `<div class="links">${links}</div>` : ""}</div>`
      + ((cSection || sSection) ? `<div class="cols">${cSection}${sSection}</div>` : `<p class="empty">The book's status files have not arrived yet.</p>`) + `</div></body></html>`;
  }
  // The bar's widths are classes (w-0 .. w-100), since the page allows no inline style.
  const widths = Array.from({ length: 101 }, (_, i) => `body.admin .bar .w-${i} { width: ${i}%; }`).join("\n");
  const css = () => readFileSync(new URL("./book.css", import.meta.url), "utf8") + "\n" + widths + "\n";
  return { page, summary, css };
}
