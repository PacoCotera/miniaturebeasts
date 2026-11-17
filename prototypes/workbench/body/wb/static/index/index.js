// The /admin index. The page is complete without any of this: the script moves the quick links
// (beside the title when the phone is on its side) and adds the live figures when they can be read.

// ---- the quick links sit beside the title on its side, at the end upright
const quickTop = document.getElementById("quick-top");
const quickBottom = document.getElementById("quick-bottom");
const sideways = matchMedia("(orientation: landscape) and (max-height: 500px)");
function placeQuickLinks() {
  const [from, to] = sideways.matches ? [quickBottom, quickTop] : [quickTop, quickBottom];
  while (from.firstChild) to.appendChild(from.firstChild);
}
sideways.addEventListener("change", placeQuickLinks);
placeQuickLinks();

// ---- live figures: a figure that cannot be read leaves its line out
async function getJson(url) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    return r.ok ? await r.json() : null;
  } catch (e) {
    return null;
  }
}

function stat(parent, kind, n, rest) {
  const s = document.createElement("span");
  const dot = document.createElement("span");
  dot.className = "dot " + kind;
  const b = document.createElement("b");
  b.textContent = String(n);
  s.append(dot, b, " " + rest);
  parent.appendChild(s);
}

async function teamFigures() {
  const [team, coord] = await Promise.all([getJson("team.json"), getJson("team-coord.json")]);
  const box = document.getElementById("team-stats");
  const p = team && team.pulse;
  if (p && Number.isInteger(p.working) && Number.isInteger(p.total)) stat(box, "busy", p.working, "of " + p.total + " desks working");
  const open = coord && coord.violations && coord.violations.open;
  if (Number.isInteger(open)) stat(box, open ? "bad" : "ok", open, open === 1 ? "rule breach" : "rule breaches");
}

async function gameFigure() {
  const build = await getJson("/build.json");
  const m = build && typeof build.version === "string" && /-preview\.(\d+)$/.exec(build.version);
  if (m) document.getElementById("game-live").textContent = "Preview " + m[1] + " is live";
}

// The Bugs card: bugs/summary.json (the Caddy service, behind the same login) counts the same bugs.json the Bugs page draws.
async function bugFigures() {
  const s = await getJson("bugs/summary.json");
  const box = document.getElementById("bug-stats");
  if (!s) return;
  if (Number.isInteger(s.open)) stat(box, "busy", s.open, "open");
  const bp = s.blocks_play;
  if (Number.isInteger(bp)) {
    if (bp) stat(box, "bad", bp, bp === 1 ? "blocks play" : "block play");
    else stat(box, "ok", "None", "blocks play");
  }
}

// The Book card: book/summary.json (the Caddy service) reads editorial's book/status files: the open comments and the proof's number and time.
const MX = "America/Mexico_City";
function whenMX(iso) {
  const t = new Date(iso);
  if (isNaN(t)) return "";
  const day = (d) => d.toLocaleDateString("en-CA", { timeZone: MX });
  const hm = t.toLocaleTimeString("en-GB", { timeZone: MX, hour: "2-digit", minute: "2-digit" });
  if (day(t) === day(new Date())) return "today " + hm;
  return t.toLocaleDateString("en-GB", { timeZone: MX, day: "numeric", month: "short" }) + " " + hm;
}
async function bookFigures() {
  const s = await getJson("book/summary.json");
  const box = document.getElementById("book-stats");
  if (!s) return;
  if (Number.isInteger(s.open)) stat(box, s.open ? "warn" : "ok", s.open, s.open === 1 ? "comment open" : "comments open");
  if (Number.isInteger(s.proof)) {
    const w = s.published ? whenMX(s.published) : "";
    stat(box, "busy", "Proof " + s.proof, w ? "· " + w : "");
  }
}

teamFigures();
gameFigure();
bugFigures();
bookFigures();
