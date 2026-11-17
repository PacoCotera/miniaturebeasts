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

teamFigures();
gameFigure();
