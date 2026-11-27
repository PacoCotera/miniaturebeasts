// The bugs page (/admin/bugs). A read-only list drawn from bugs.json beside the notes on this service's card; the file is
// written by the team's bug filer (every 15 minutes) from the GitHub issues made out of the play notes. Nothing is posted
// here and nothing is read from the public prefix: like /admin/notes it answers only with the studio login's X-Studio-User.
// Open bugs in four groups (blocks play, wrong, looks off, questions), a row each that opens to the screenshot and issue; then the ones fixed and live in the last 7 days. Phone first, plain.
import { readFileSync } from "node:fs";
import path from "node:path";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const SEV = ["blocks-play", "wrong", "looks-off"];
const SEV_TEXT = { "blocks-play": "Blocks play", wrong: "Wrong", "looks-off": "Looks off" };
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
  const hm = (ms) => new Date(ms).toLocaleString("en-GB", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit" });
  const rank = (r) => { const i = SEV.indexOf(r.severity); return i < 0 ? SEV.length : i; };

  // Four groups, newest first inside each; a bug with no rating counts as Wrong, "minor" as Looks off.
  const GROUPS = [["blocks-play", "Blocks play"], ["wrong", "Wrong"], ["looks-off", "Looks off"], ["question", "Questions"]];
  const groupOf = (r) => (r.kind === "question" ? "question" : r.severity === "blocks-play" ? "blocks-play" : r.severity === "looks-off" || r.severity === "minor" ? "looks-off" : "wrong");
  const newest = (a, b) => Date.parse(b.created) - Date.parse(a.created);
  const stage = (r) => (r.state === "closed" ? "Fixed, live" : r.fix_merged ? "Fix waiting to ship" : r.fix_pr ? "Fix being built" : "Not started");
  const SHOT = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/blob\/[\w.-]+\/[\w./-]+(\?raw=true)?$/;

  function groups() {
    const t = now(), { rows, generated } = read();
    const open = rows.filter((r) => r.state === "open").sort(newest);
    const fixed = rows.filter((r) => r.state === "closed" && r.closed && t - Date.parse(r.closed) <= WEEK).sort((a, b) => Date.parse(b.closed) - Date.parse(a.closed));
    return { open, fixed, generated, t };
  }
  // The Bugs card's live line on the index: the same open list the page draws, counted by groups(). generated is null until the filer has run.
  function summary() {
    const { open, generated } = groups();
    return { open: open.length, blocks_play: open.filter((r) => groupOf(r) === "blocks-play").length, generated: generated || null };
  }
  function page() {
    const { open, fixed, generated, t } = groups();
    const row = (r, when) => {
      const g = groupOf(r), words = String(r.words || r.title), url = safeUrl(r.url);
      const shots = (Array.isArray(r.shots) ? r.shots : []).filter((u) => SHOT.test(u));
      return `<li><details class="bug ${g}"><summary><span class="n">#${esc(r.n)}</span> <span class="title">${esc(r.title)}</span>`
        + (words.trim() !== String(r.title).trim() ? `<span class="words">${esc(words)}</span>` : "")
        + `<span class="meta"><span class="sev">${esc(g === "question" ? "Question" : SEV_TEXT[g])}</span> · ${esc(deskName(r.desk))} · ${esc(age(when, t))} · <b class="stage">${esc(stage(r))}</b></span></summary>`
        + `<div class="more">${shots.length ? shots.map((u, i) => `<a href="${esc(u)}">Screenshot${shots.length > 1 ? " " + (i + 1) : ""}</a>`).join(" · ") : `<span class="none">No screenshot</span>`}${url ? ` · <a href="${esc(url)}">Issue #${esc(r.n)}</a>` : ""}</div></details></li>`;
    };
    const sections = GROUPS.map(([g, text]) => {
      const rs = open.filter((r) => groupOf(r) === g);
      return rs.length ? `<h2>${text} (${rs.length})</h2><ul class="list">${rs.map((r) => row(r, r.created)).join("")}</ul>` : "";
    }).join("");
    const blocks = open.filter((r) => groupOf(r) === "blocks-play").length;
    // No inline style: the colours are the /admin index's own tokens (team.css, same origin, same login) and the layout is bugs.css.
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark light"><meta name="robots" content="noindex"><title>Bugs</title>`
      + `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'">`
      + `<link rel="stylesheet" href="/admin/team/team.css"><link rel="stylesheet" href="/admin/bugs/bugs.css"></head><body class="admin"><div id="app">`
      + `<a class="back" href="/admin/">← Admin</a>`
      + `<div class="head"><h1>Bugs</h1><p class="lede">${open.length} open: ${blocks} block play</p></div>`
      + (sections || `<p class="empty">No open bugs.</p>`)
      + `<details class="closed"><summary>Fixed, last 7 days (${fixed.length})</summary>` + (fixed.length ? `<ul class="list">${fixed.map((r) => row(r, r.closed)).join("")}</ul>` : `<p class="empty">None.</p>`) + `</details>`
      + `<p class="foot">Updated ${esc(hm(t))} Mexico City${generated ? ` (list filed ${esc(hm(Date.parse(generated)))}, ${esc(age(generated, t))} ago)` : " (nothing filed yet)"} · <a href="/admin/notes">Play notes</a> · <a href="https://github.com/PacoCotera/miniaturebeasts-internal/issues" target="_blank" rel="noopener">Bugs on GitHub</a></p></div></body></html>`;
  }
  const css = () => readFileSync(new URL("./bugs.css", import.meta.url), "utf8");
  return { page, groups, summary, css };
}
