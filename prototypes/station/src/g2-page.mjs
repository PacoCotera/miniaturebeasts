// G2, the grey pairing test page (opened by /play/station/?g2=1): grey boxes and plain text on the real engine (g2.mjs). Phone size; touch and keys both work.
// Keys: arrows move the focus between the Loikas and the pair button; Enter or Space is ✓ (picks a Loika, or pairs the two); Esc or Backspace is ← (pick again).
import { PROTOTYPES } from "../../ui/site-base.mjs";
import { setFrames } from "./genome.mjs";
import * as G from "./g2.mjs";
import { G2_WORDS as W, fill } from "./views/words.mjs";

const app = document.getElementById("app");
let g = null, focus = 0;
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

async function boot() {
  const frame = await (await fetch(new URL("species/frames/species-S01.json", PROTOTYPES))).json();
  setFrames([frame]);
  const seed = new URLSearchParams(location.search).get("seed") || "g2";
  g = G.newGame(frame, seed);
  window.__g2 = { get g() { return g; }, G };   // the test harness reads and drives it
  draw();
}

const stepsBar = (n, green, marks) => `<div class="steps">${Array.from({ length: n }, (_, i) => `<div class="step${i >= green[0] && i <= green[1] ? " green" : ""}">${marks[i] ?? ""}</div>`).join("")}</div>`;

function pairHtml(a, b) {
  const v = G.pairView(g, a, b);
  if (v.refusal) return `<div class="note refuse">${esc(v.refusal)}</div>`;
  const young = G.fourYoung(g, a, b);
  const rows = v.traits.map((t) => {
    if (t.shape === "set") return `<div class="t"><b>${esc(t.name)}</b><div class="chips">${t.looks.map((l) => `<span class="chip${l.green ? " green" : ""}">${l.a ? `<span class="p">${esc(a.id)}</span> ` : ""}${l.b ? `<span class="p">${esc(b.id)}</span> ` : ""}${esc(l.look)}${l.fraction ? `<i>${Math.round(l.fraction * 100)}%</i>` : ""}</span>`).join("")}</div></div>`;
    const marks = {}; for (const s of t.a) marks[s] = (marks[s] ?? "") + a.id; for (const s of t.b) marks[s] = (marks[s] ?? "") + b.id;
    return `<div class="t"><b>${esc(t.name)}</b>${stepsBar(t.steps, t.green, marks)}<div class="ends"><span>${esc(t.ends[0])}</span><span>${esc(t.ends[1])}</span></div></div>`;
  }).join("");
  const head = `<tr><th></th>${young.map((y) => `<th${y.aim ? ' style="background:#8fd18f"' : ""}>${y.aim ? "✓" : "&nbsp;"}</th>`).join("")}</tr>`;
  const table = v.traits.map((t, i) => `<tr><th>${esc(t.name)}</th>${young.map((y) => { const r = y.traits[i]; return r.shape === "set" ? `<td>${esc(r.shows)}</td>` : `<td><div class="mini">${Array.from({ length: r.steps }, (_, k) => `<span class="${k === r.step ? "on" : ""}"></span>`).join("")}</div></td>`; }).join("")}</tr>`).join("");
  return `<h2>${W.young}</h2><table>${head}${table}</table><h2>${W.green}</h2>${rows}<div class="note">${fill(W.vigour, { word: W.vigourWords[G.vigourBand(v.vigour)] })}</div>`;
}

function hatchHtml() {
  const l = g.last;
  if (!l) return "";
  if (l.refused) return `<div class="note refuse">${esc(l.refused)}</div>`;
  const y = g.group.find((m) => m.id === l.young);
  const bits = l.read.traits.map((t) => (t.shape === "set" ? `${esc(t.name)}: ${esc(t.shows)}` : `${esc(t.name)}: ${t.step + 1}/${t.steps}`)).join(" · ");
  return `<h2>${W.hatched}</h2><div class="box"><b>${esc(y.name)}</b> ${W.joins}${l.aim ? ` · <b>${W.met}</b>` : ""}<div class="note">${bits}</div><div>${fill(W.vigour, { word: W.vigourWords[G.vigourBand(l.vigour)] })}</div></div>`;
}

function draw() {
  const picked = G.pickedMembers(g), two = picked.length === 2, aim = G.aimWords(g.frame, g.aim);
  const items = g.group.length + 1;
  focus = Math.min(focus, items - 1);
  const grp = g.group.map((m, i) => `<button class="m${g.picked.includes(m.id) ? " pick" : ""}${G.aimMet(g.frame, g.aim, m) ? " hit" : ""}" data-i="${i}" data-id="${m.id}"><b>${esc(m.name)}</b><small>gen ${m.gen}</small></button>`).join("");
  app.innerHTML = `<div class="top box"><div class="aim"><h2 style="margin-top:0">${W.aim}</h2>${aim.map((w) => `<div>${esc(w)}</div>`).join("")}</div><div class="count">${fill(W.generation, { n: g.generation })}<br>${fill(W.hatches, { n: g.hatches })}</div></div>
<h2>${W.group}${two ? "" : " · " + W.pick}</h2><div class="group">${grp}</div>
${two ? pairHtml(picked[0], picked[1]) : hatchHtml()}
<button class="go" data-i="${g.group.length}" ${two && !G.refusal(g, picked[0], picked[1]) ? "" : "disabled"}>${W.pair}</button>${two ? `<button class="again" id="again">${W.pairAgain}</button>` : ""}`;
  for (const el of app.querySelectorAll("[data-i]")) el.tabIndex = Number(el.dataset.i) === focus ? 0 : -1;
  app.querySelector(`[data-i="${focus}"]`)?.focus({ preventScroll: true });
  const box = app.querySelector(".group"); if (box && g.last?.young) box.scrollTop = box.scrollHeight;   // the newest young is in view after a hatch
}

function press(i) {
  if (i < g.group.length) { g = G.pick({ ...g, last: null }, g.group[i].id); }
  else if (g.picked.length === 2) { g = G.hatch(g); focus = Math.max(0, g.group.length - 1); }
  draw();
}
function clearPick() { g = { ...g, picked: [], last: null }; draw(); }

app.addEventListener("click", (e) => {
  if (e.target.closest("#again")) return clearPick();
  const el = e.target.closest("[data-i]"); if (!el || el.disabled) return;
  focus = Number(el.dataset.i); press(focus);
});
document.addEventListener("keydown", (e) => {
  if (!g) return;
  const n = g.group.length + 1, cols = 3;
  const move = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
  if (move) { e.preventDefault(); focus = Math.max(0, Math.min(n - 1, focus + move)); app.querySelector(`[data-i="${focus}"]`)?.focus({ preventScroll: false }); for (const el of app.querySelectorAll("[data-i]")) el.tabIndex = Number(el.dataset.i) === focus ? 0 : -1; }
  else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!app.querySelector(`[data-i="${focus}"]`)?.disabled) press(focus); }
  else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); clearPick(); }
});

document.addEventListener("keyup", (e) => { if (e.key === " ") e.preventDefault(); });   // a button's click on Space's release would press twice

boot();
