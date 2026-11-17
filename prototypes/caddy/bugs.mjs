// The bugs page (/admin/bugs). A read-only list drawn from bugs.json beside the notes on this service's card; the file is
// written by the team's bug filer (every 15 minutes) from the GitHub issues made out of the play notes. Nothing is posted
// here and nothing is read from the public prefix: like /admin/notes it answers only with the studio login's X-Studio-User.
// Open bugs by severity then desk; then the ones fixed and live in the last 7 days. Phone first, plain.
import { readFileSync } from "node:fs";
import path from "node:path";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const SEV = ["blocks-play", "wrong", "looks-off"];
const SEV_TEXT = { "blocks-play": "Blocks play", wrong: "Wrong", "looks-off": "Looks off", none: "Not rated" };
const WEEK = 7 * 24 * 3600 * 1000;
const safeUrl = (u) => (/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+$/.test(u) ? u : "");

export function createBugs({ dataDir, now = () => Date.now() }) {
  const file = path.join(dataDir, "bugs.json");
  function read() {
    try { const o = JSON.parse(readFileSync(file, "utf8")); return o && Array.isArray(o.rows) ? o : { rows: [], generated: null }; } catch { return { rows: [], generated: null }; }
  }
  const age = (iso, t) => { const m = Math.max(0, Math.round((t - Date.parse(iso)) / 60000)); return m < 90 ? `${m} min` : m < 2880 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`; };
  const rank = (r) => { const i = SEV.indexOf(r.severity); return i < 0 ? SEV.length : i; };

  function groups() {
    const t = now(), { rows, generated } = read();
    const open = rows.filter((r) => r.state === "open").sort((a, b) => rank(a) - rank(b) || String(a.desk).localeCompare(String(b.desk)) || Date.parse(a.created) - Date.parse(b.created));
    const fixed = rows.filter((r) => r.state === "closed" && r.closed && t - Date.parse(r.closed) <= WEEK).sort((a, b) => Date.parse(b.closed) - Date.parse(a.closed));
    return { open, fixed, generated, t };
  }
  function page() {
    const { open, fixed, generated, t } = groups();
    const row = (r, when) => `<li><p class="w">${esc(r.words || r.title)}</p><p class="m"><b>${esc(r.desk)}</b> · ${esc(age(when, t))}${r.fix_merged ? " · fix merged, not live yet" : ""}${safeUrl(r.url) ? ` · <a href="${esc(safeUrl(r.url))}">#${esc(r.n)}</a>` : ` · #${esc(r.n)}`}</p></li>`;
    const sections = [...SEV, "none"].map((s) => {
      const rs = open.filter((r) => (r.severity || "none") === s);
      return rs.length ? `<h2>${SEV_TEXT[s]} (${rs.length})</h2><ul>${rs.map((r) => row(r, r.created)).join("")}</ul>` : "";
    }).join("");
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Bugs</title>`
      + `<style>body{font:16px/1.4 system-ui,sans-serif;margin:0;padding:16px;max-width:760px;margin:auto;background:#fafafa;color:#222}h1{font-size:1.3rem}h2{font-size:1rem;margin:20px 0 6px}ul{list-style:none;margin:0;padding:0}li{background:#fff;border:1px solid #ddd;border-radius:8px;padding:10px 14px;margin:0 0 8px}.w{white-space:pre-wrap;margin:0 0 4px}.m{color:#666;font-size:.85rem;margin:0}a{color:#0b5cad}</style></head><body>`
      + `<h1>Bugs <small>${open.length} open</small></h1><p class="m">${generated ? `Updated ${esc(age(generated, t))} ago` : "Nothing filed yet"} · <a href="/admin/notes">Play notes</a></p>`
      + (sections || "<p>No open bugs.</p>")
      + `<h2>Fixed and live, last 7 days (${fixed.length})</h2>` + (fixed.length ? `<ul>${fixed.map((r) => row(r, r.closed)).join("")}</ul>` : "<p>None.</p>") + `</body></html>`;
  }
  return { page, groups };
}
