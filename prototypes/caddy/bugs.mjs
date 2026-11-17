// The bugs page (/admin/bugs). A read-only list drawn from bugs.json beside the notes on this service's card; the file is
// written by the team's bug filer (every 15 minutes) from the GitHub issues made out of the play notes. Nothing is posted
// here and nothing is read from the public prefix: like /admin/notes it answers only with the studio login's X-Studio-User.
// Open bugs by severity then desk; then the ones fixed and live in the last 7 days. Phone first, plain.
import { readFileSync } from "node:fs";
import path from "node:path";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const SEV = ["blocks-play", "wrong", "looks-off"];
const SEV_TEXT = { "blocks-play": "Blocks play", wrong: "Wrong", "looks-off": "Looks off", none: "Not rated" };
// The desks' names in plain words: the same ones the team page shows (coord.py NAMES). An unknown key shows as it is.
const DESKS = { lead: "Lead", art: "Art director", design: "Game designer", ui: "Screens and phone UI", pixel: "Pixel art", editorial: "Book editor", hardware: "Hardware", mobile: "Phone app", watchdog: "Watchdog", owner: "You", all: "Everyone", jobs: "Jobs", job: "Jobs" };
const deskName = (k) => (Object.hasOwn(DESKS, k) && DESKS[k]) || k;
const WEEK =7 * 24 * 3600 * 1000;
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
    const row = (r, when) => `<li class="bug${r.severity === "blocks-play" ? " blocks" : ""}"><p class="words">${esc(r.words || r.title)}</p><p class="meta"><b>${esc(deskName(r.desk))}</b> · ${esc(age(when, t))}${r.fix_merged ? " · fix merged, not live yet" : ""}${safeUrl(r.url) ? ` · <a href="${esc(safeUrl(r.url))}">#${esc(r.n)}</a>` : ` · #${esc(r.n)}`}</p></li>`;
    const sections = [...SEV, "none"].map((s) => {
      const rs = open.filter((r) => (r.severity || "none") === s);
      return rs.length ? `<h2>${SEV_TEXT[s]} (${rs.length})</h2><ul class="cards">${rs.map((r) => row(r, r.created)).join("")}</ul>` : "";
    }).join("");
    // No inline style: the colours are the /admin index's own tokens (team.css, same origin, same login) and the layout is bugs.css.
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark light"><meta name="robots" content="noindex"><title>Bugs</title>`
      + `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'">`
      + `<link rel="stylesheet" href="/admin/team/team.css"><link rel="stylesheet" href="/admin/bugs/bugs.css"></head><body class="admin"><div id="app">`
      + `<a class="back" href="/admin/">← Admin</a>`
      + `<div class="head"><h1>Bugs</h1><p class="lede">${open.length} open · ${generated ? `Updated ${esc(age(generated, t))} ago` : "Nothing filed yet"} · <a href="/admin/notes">Play notes</a> · <a href="https://github.com/PacoCotera/miniaturebeasts-internal/issues" target="_blank" rel="noopener">Bugs on GitHub</a></p></div>`
      + (sections || `<p class="empty">No open bugs.</p>`)
      + `<h2>Fixed and live, last 7 days (${fixed.length})</h2>` + (fixed.length ? `<ul class="cards">${fixed.map((r) => row(r, r.closed)).join("")}</ul>` : `<p class="empty">None.</p>`) + `</div></body></html>`;
  }
  const css = () => readFileSync(new URL("./bugs.css", import.meta.url), "utf8");
  return { page, groups, css };
}
