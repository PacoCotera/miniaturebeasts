// The build footer, one line the same on the website, the standalone Station and the standalone Companion:
// "© 2026 Dirty Pawz Press · {short hash} · {dd/mm HH:MM} · save v{schema} · Caddy {online|offline}".
// The hash and the time come from the site's build.json (`built` is a UTC ISO time, shown in Mexico City time, 24-hour, whatever the viewer's zone); "local" with no build.json.
// The save schema is left out where the page writes no save (the website), and so is the Caddy's state while it is not known. Pure text (no DOM), so the formatting is unit-tested (tests/footer.test.mjs).
import { mexicoParts } from "./stamp.mjs";

export function footerText({ build = null, schema = null, caddy = null } = {}) {
  const short = build && (build.short || String(build.commit || "").slice(0, 7));
  const p = short && mexicoParts(build.built);
  const parts = ["© 2026 Dirty Pawz Press", short || "local"];
  if (p) parts.push(`${p.day}/${p.month} ${p.hour}:${p.minute}`);
  if (schema != null) parts.push("save v" + schema);
  if (caddy === true || caddy === false) parts.push("Caddy " + (caddy ? "online" : "offline"));
  return parts.join(" · ");
}

// build.json beside the site's root, fetched from `url`; null when there is none.
export async function loadBuild(url) {
  try { const r = await fetch(url, { cache: "no-store" }); return r.ok ? await r.json() : null; } catch { return null; }
}

// Whether the Caddy service answers: its status call, through the proxy the Station page calls it by (/caddy-api/v1); anything but a 200 is offline.
export async function caddyAnswers(base = "/caddy-api/v1") {
  try { return (await fetch(base + "/status", { cache: "no-store" })).ok; } catch { return false; }
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
