// The play page's build stamp: "build <short> · YYYY-MM-DD HH:MM Mexico City" from the site's build.json, whose `built` is a UTC ISO time; the time is always Mexico City's (24-hour),
// never the viewer's own zone. "build local" with no build.json. Pure (no DOM), so the conversion is unit-tested (tests/stamp.test.mjs).
const MX = new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export function mexicoParts(iso) {
  const d = new Date(iso); if (!iso || isNaN(d)) return null;
  return Object.fromEntries(MX.formatToParts(d).map((x) => [x.type, x.value]));
}

export function mexicoCity(iso) {
  const p = mexicoParts(iso); if (!p) return "";
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} Mexico City`;
}

// The Options panel's about line: `0.32.2 "Name" · 2026-11-13 16:25 Mexico City` (the name only on a milestone release); "" with no build.json or an older one with no number.
export function aboutText(j) {
  if (!j || !j.version) return "";
  const t = mexicoCity(j.built);
  return j.version + (j.name ? ` "${j.name}"` : "") + (t ? " · " + t : "");
}

// The release's name leads when build.json has one (owner bug #38: "you show the build, but not the release name"): `Beacon · build c1e7585 · 2026-11-18 10:49 Mexico City`.
// `brief`: without the time, for a box too narrow for the whole line (shell.mjs fitStamp).
export function stampText(j, brief = false) {
  const short = j && (j.short || String(j.commit || "").slice(0, 7));
  if (!short) return "build local";
  const t = brief ? "" : mexicoCity(j.built);
  return (j.name ? j.name + " · " : "") + "build " + short + (t ? " · " + t : "");
}
