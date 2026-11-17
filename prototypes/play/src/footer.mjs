// The build footer, one line the same on the website, the standalone Station and the standalone Companion:
// "© 2026 Dirty Pawz Press · {short hash} · {dd/mm HH:MM} · save v{schema} · Caddy {online|offline}".
// The hash and the time come from the site's build.json (`built` is a UTC ISO time, shown in Mexico City time, 24-hour, whatever the viewer's zone); "local" with no build.json.
// The save schema is left out where the page writes no save (the website), and so is the Caddy's state while it is not known. Pure text (no DOM), so the formatting is unit-tested (tests/footer.test.mjs).
import { mexicoParts } from "./stamp.mjs";

// The parts of the line, in order. `compact` is the phone's form: no copyright and no save version ("{hash} · {dd/mm HH:MM} · Caddy {online|offline}").
export function footerParts({ build = null, schema = null, caddy = null, compact = false } = {}) {
  const short = build && (build.short || String(build.commit || "").slice(0, 7));
  const p = short && mexicoParts(build.built);
  const parts = compact ? [] : ["© 2026 Dirty Pawz Press"];
  parts.push(short || "local");
  if (p) parts.push(`${p.day}/${p.month} ${p.hour}:${p.minute}`);
  if (schema != null && !compact) parts.push("save v" + schema);
  if (caddy === true || caddy === false) parts.push("Caddy " + (caddy ? "online" : "offline"));
  return parts;
}

export const footerText = (o) => footerParts(o).join(" · ");

// build.json beside the site's root, fetched from `url`; null when there is none.
export async function loadBuild(url) {
  try { const r = await fetch(url, { cache: "no-store" }); return r.ok ? await r.json() : null; } catch { return null; }
}

// Whether the Caddy service answers: its status call, through the proxy the Station page calls it by (/caddy-api/v1); anything but a 200 is offline.
export async function caddyAnswers(base = "/caddy-api/v1") {
  try { return (await fetch(base + "/status", { cache: "no-store" })).ok; } catch { return false; }
}

// The notice line (lock-playtest-world, owner 2026-11-10 20:18): the one line a page shows when the game cannot save ("saveFailed", until a save works again), when a save names a land this build does not
// make ("landChanged") and when the page breaks ("pageBroke", with the build number from build.json). The words are the page's own [copy] slots (`words`: { saveFailed, landChanged, pageBroke }, empty
// until the copywriter writes them; pageBroke is given the build number and may use it); an empty pageBroke slot still shows the bare build number, so a broken page is never blank. Pure text.
export const NOTICE_KINDS = ["pageBroke", "saveFailed", "landChanged"];   // the one shown when several hold: the page break first
export function noticeText(words, kind, build = null) {
  const short = (build && (build.short || String(build.commit || "").slice(0, 7))) || "local", w = words && words[kind];
  const t = typeof w === "function" ? w(short) : String(w ?? "").replaceAll("{build}", short);   // a slot is a function of the build, or a string with {build} (the Station's frame.json)
  return t || (kind === "pageBroke" ? short : "");
}
// Draws the notice into `el` (hidden while none holds); returns { set(kind, on) }. `el.dataset.slot` names the slot shown. Not gated by the embed class: a frame of the play page shows its own line.
export function mountNotice(el, words, { buildUrl }) {
  const on = new Set(); let build = null;
  const draw = () => { const kind = NOTICE_KINDS.find((k) => on.has(k)); el.hidden = !kind; el.dataset.slot = kind || ""; el.textContent = kind ? noticeText(words, kind, build) : ""; };
  if (buildUrl) loadBuild(buildUrl).then((b) => { build = b; draw(); });
  return { set(kind, yes = true) { if (yes) on.add(kind); else on.delete(kind); draw(); }, has: (kind) => on.has(kind) };
}

// Fills `el` with the footer and keeps it current: `schema` is the number or a function giving it; `caddy` (optional) is a function giving true, false or null, asked at once and every `everyMs`.
export function mountFooter(el, { buildUrl, schema = null, caddy = null, everyMs = 30000 }) {
  if (document.documentElement.classList.contains("embed")) return;   // the play page's frames hide the page chrome: no fetch, no probe
  let build = null;
  const draw = (c) => { el.textContent = footerText({ build, schema: typeof schema === "function" ? schema() : schema, caddy: c }); };
  let last = null; const ask = caddy ? async () => { last = await caddy(); draw(last); } : null;
  loadBuild(buildUrl).then((b) => { build = b; draw(last); });
  draw(null);
  if (ask) { ask(); setInterval(ask, everyMs); }
}
