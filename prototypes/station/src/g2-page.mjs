// G2, the grey pairing test page (opened by /play/station/?g2=1): grey boxes and plain text on the real engine (g2.mjs). Phone size; touch and keys both work.
// The screen reads as the accepted pairing picture: the two parents side by side (one held, the other changed with left/right), the kin word between them, four example young,
// and for every trait where their young can land (green) with each parent's own marker and the aim.
// Keys: arrows move the focus in the group; Enter or Space is ✓ (holds a Loika; then pairs); Left/Right change the partner; Esc or Backspace is ← (back to the group).
import { PROTOTYPES } from "../../ui/site-base.mjs";
import { setFrames } from "./genome.mjs";
import * as G from "./g2.mjs";
import { G2_WORDS as W, fill } from "./views/words.mjs";

const app = document.getElementById("app");
let g = null, focus = 0;
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const MARK = ["●", "■"];   // the held parent, the partner: the same marks on every scale and set

async function boot() {
  const frame = await (await fetch(new URL("species/frames/species-S01.json", PROTOTYPES))).json();
  setFrames([frame]);
  const seed = new URLSearchParams(location.search).get("seed") || "g2";
  g = G.newGame(frame, seed);
  window.__g2 = { get g() { return g; }, G };   // the test harness reads and drives it
  draw();
}

const tag = (cls, text) => `<span class="tag ${cls}">${esc(text)}</span>`;

const stepsBar = (t) => `<div class="steps">${Array.from({ length: t.steps }, (_, i) => {
  const marks = (t.a === i ? MARK[0] : "") + (t.b === i ? MARK[1] : "");
  return `<div class="step${i >= t.green[0] && i <= t.green[1] ? " green" : ""}${t.aimStep === i ? " aimstep" : ""}"><span class="mk">${marks}</span>${t.aimStep === i ? `<small>${W.aimTag}</small>` : ""}</div>`;
}).join("")}</div>`;

function parentHtml(i, m, extra = "") {
  return `<div class="parent"><div class="pn"><span class="mk">${MARK[i]}</span> <b>${esc(m.name)}</b></div>${extra}<div class="lk">${G.looksOf(g, m).map(esc).join("<br>")}</div></div>`;
}

function pairHtml(a, b) {
  const v = G.pairView(g, a, b);
  const nav = `<div class="nav"><button data-act="prev" aria-label="previous partner">◀</button><button data-act="next" aria-label="next partner">▶</button></div>`;
  const kin = v.refusal ? esc(v.refusal) : v.kinship > 0 ? `${W.kin}<br>${fill(W.vigour, { word: W.vigourWords[G.vigourBand(v.vigour)] })}` : W.noKin;
  const parents = `<div class="pair">${parentHtml(0, a)}<div class="kin${v.refusal ? " refuse" : ""}">+<br>${kin}</div>${parentHtml(1, b, nav)}</div><div class="note hint">${W.change}</div>`;
  const go = `<button class="go" data-act="go" ${v.refusal ? "disabled" : ""}>${W.pair}</button><button class="again" id="again">${W.pairAgain}</button>`;
  if (v.refusal) return parents + go;
  const young = G.fourYoung(g, a, b);
  const head = `<tr><th></th>${young.map((y) => `<th class="${y.aim ? "aimy" : ""}">${y.fresh ? `<span class="tag fresh">${W.fresh}</span>` : "&nbsp;"}${y.aim ? `<span class="tag aim">${W.aimTag}</span>` : ""}</th>`).join("")}</tr>`;
  const table = v.traits.map((t, i) => `<tr><th>${esc(t.name)}</th>${young.map((y) => { const r = y.traits[i]; return r.shape === "set" ? `<td>${esc(r.shows)}</td>` : `<td><div class="mini">${Array.from({ length: r.steps }, (_, k) => `<span class="${k === r.step ? "on" : ""}"></span>`).join("")}</div></td>`; }).join("")}</tr>`).join("");
  const rows = v.traits.map((t) => {
    if (t.shape === "set") return `<div class="t"><b>${esc(t.name)}</b><div class="chips">${t.looks.map((l) => `<span class="chip${l.green ? " green" : ""}${l.aim ? " aimchip" : ""}">${l.a ? `<span class="mk">${MARK[0]}</span> ` : ""}${l.b ? `<span class="mk">${MARK[1]}</span> ` : ""}${esc(l.look)}${l.fraction ? `<i>${Math.round(l.fraction * 100)}%</i>` : ""}${l.fresh ? ` ${tag("fresh", W.fresh)}` : ""}${l.aim ? ` ${tag("aim", W.aimTag)}` : ""}</span>`).join("")}</div></div>`;
    return `<div class="t"><b>${esc(t.name)}</b>${stepsBar(t)}<div class="ends"><span>${esc(t.ends[0])}</span><span>${esc(t.ends[1])}</span></div></div>`;
  }).join("");
  return `${parents}<h2>${W.young}</h2><table>${head}${table}</table><h2>${W.green}</h2>${rows}${go}`;
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
  focus = Math.min(focus, g.group.length - 1);
  const grp = g.group.map((m, i) => `<button class="m${G.aimMet(g.frame, g.aim, m) ? " hit" : ""}" data-i="${i}" data-id="${m.id}"><b>${esc(m.name)}</b><small>gen ${m.gen}</small></button>`).join("");
  const top = `<div class="top box"><div class="aim"><h2 style="margin-top:0">${W.aim}</h2>${aim.map((w) => `<div>${esc(w)}</div>`).join("")}</div><div class="count">${fill(W.generation, { n: g.generation })}<br>${fill(W.hatches, { n: g.hatches })}</div></div>`;
  if (two) {
    app.innerHTML = top + pairHtml(picked[0], picked[1]);
    app.querySelector('[data-act="go"]')?.focus({ preventScroll: true });
  } else {
    app.innerHTML = `${top}<h2>${W.group} · ${W.pick}</h2><div class="group">${grp}</div>${hatchHtml()}`;
    for (const el of app.querySelectorAll("[data-i]")) el.tabIndex = Number(el.dataset.i) === focus ? 0 : -1;
    app.querySelector(`[data-i="${focus}"]`)?.focus({ preventScroll: true });
    const box = app.querySelector(".group"); if (box && g.last?.young) box.scrollTop = box.scrollHeight;   // the newest young is in view after a hatch
  }
}

function hatch() {
  if (g.picked.length !== 2) return;
  g = G.hatch(g); focus = Math.max(0, g.group.length - 1); draw();
}
const partner = (dir) => { g = G.nextPartner(g, dir); draw(); };
const clearPick = () => { g = { ...g, picked: [], last: null }; draw(); };

app.addEventListener("click", (e) => {
  if (e.target.closest("#again")) return clearPick();
  const act = e.target.closest("[data-act]");
  if (act) { if (act.disabled) return; if (act.dataset.act === "prev") return partner(-1); if (act.dataset.act === "next") return partner(1); return hatch(); }
  const el = e.target.closest("[data-i]"); if (!el) return;
  focus = Number(el.dataset.i); g = G.hold({ ...g, last: null }, g.group[focus].id); draw();
});
document.addEventListener("keydown", (e) => {
  if (!g) return;
  const two = g.picked.length === 2;
  if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); clearPick(); return; }
  if (two) {
    if (e.key === "ArrowLeft") { e.preventDefault(); partner(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); partner(1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const f = document.activeElement?.dataset?.act; if (f === "prev") partner(-1); else if (f === "next") partner(1); else if (!app.querySelector('[data-act="go"]')?.disabled) hatch(); }
    return;
  }
  const n = g.group.length, cols = 3;
  const move = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
  if (move) { e.preventDefault(); focus = Math.max(0, Math.min(n - 1, focus + move)); app.querySelector(`[data-i="${focus}"]`)?.focus({ preventScroll: false }); for (const el of app.querySelectorAll("[data-i]")) el.tabIndex = Number(el.dataset.i) === focus ? 0 : -1; }
  else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); g = G.hold({ ...g, last: null }, g.group[focus].id); draw(); }
});

document.addEventListener("keyup", (e) => { if (e.key === " ") e.preventDefault(); });   // a button's click on Space's release would press twice

boot();
