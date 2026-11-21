// The lab bench page (lab-greybox-1): the four moments of the v4 pictures as a playable grey screen on the real genetics engine, Loikas only. Rules are in rules.mjs, the engine layer in engine.mjs, the words in words.mjs (all draft).
// It is the Station's frame on the play page when the Options row "Lab bench (Loikas only)" is on: the page's keys arrive as keydown events here, as they do for the Station.
import { PROTOTYPES } from "../../ui/site-base.mjs";
import { readOptions } from "../../play/src/options.mjs";
import { WORDS as W } from "./words.mjs";
import { labScale } from "./scale.mjs";
import { newGame, expedition, questionsFor, askWord, startSample, tickBench, previewCross, chanceWord, startCross, openBud, partnersFor, crossCandidates, squareOf, allKnown, goal, TRAIT_ORDER, COST, LANDS, wildLand, valueWord } from "./rules.mjs";

const SAVE_KEY = "mb-save-v8-lab";   // starts with "mb-save-v8": the play page's Start fresh erases it with the rest
const OPT = readOptions();
const WAIT = OPT.playtest ? { sample: 6000, first: 2000, bud: 8000 } : { sample: 30 * 60e3, first: 2 * 60e3, bud: 20 * 60e3 };   // 30 min, the first ever 2 min, a bud 20 min; Playtest waits: seconds
const NS_TRAIT = { M: "markings", C: "crown", E: "eyes", D: "drive", F: "efficiency" };
const GLYPH = {   // wireframe schematics, not art: the five trait pictures are an empty slot for the art desk
  markings: '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="M6 15 L12 6 M10 19 L18 8"/>',
  crown: '<path d="M12 21 C9 16 9 9 12 3 C15 9 15 16 12 21 Z"/><path d="M12 21 C7 19 3.5 14 3.5 9 C7.5 11 10.5 15 12 21 Z"/><path d="M12 21 C17 19 20.5 14 20.5 9 C16.5 11 13.5 15 12 21 Z"/>',
  eyes: '<path d="M2 12 C6 5.5 18 5.5 22 12 C18 18.5 6 18.5 2 12 Z"/><circle cx="12" cy="12" r="3.5"/>',
  drive: '<path d="M4 6 L10 12 L4 18 M12 6 L18 12 L12 18"/>',
  efficiency: '<rect x="2.5" y="7.5" width="17" height="10" rx="2"/><path d="M20.5 10.5 V14.5"/><rect x="5" y="10" width="8" height="5" rx="0.5" fill="currentColor" stroke="none"/>',
};
const glyph = (t) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${GLYPH[NS_TRAIT[t] ?? t]}</svg>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

let frame = null, st = null;
const ui = { screen: "bench", row: 0, col: 0, sIdx: 0, qIdx: 0, A: null, B: null, cf: "A", land: 0, rep: null, msg: null, pending: null };
const $ = (id) => document.getElementById(id);
const root = $("screen");
document.documentElement.style.setProperty("--s", String(labScale(window.devicePixelRatio)));

// ---------------------------------------------------------------- save
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch { /* no storage: this page only */ } };
function loadOrNew() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s && s.v === 1) return s; } catch { /* a bad save: a new game */ }
  const seed = Math.floor(Math.random() * 1e9).toString(36);
  return newGame(frame, seed);
}

// ---------------------------------------------------------------- pieces
const benchRows = () => [...st.adults, ...st.wildIds.filter((id) => st.K[id].shown)];
function squareHtml(id, T, ring, act) {
  const s = squareOf(st, id, T);
  return `<button class="sq ${s.st}${ring ? " ring" : ""}" ${act ? `data-act="${act}"` : ""} aria-label="${esc(st.recs[id].name)} ${esc(T)}: ${esc(s.word)}">${glyph(T)}<span class="v">${esc(s.word)}</span></button>`;
}
function mibiHtml(id, o = {}) {
  const r = st.recs[id], fam = r.parents.length ? `child of ${esc(st.recs[r.parents[0]].name)} + ${esc(st.recs[r.parents[1]].name)}` : r.kind === "wild" ? "wild" : "";
  const sqs = TRAIT_ORDER.map((T, i) => squareHtml(id, T, o.ringCol === i, o.act ? o.act + ":" + i : "")).join("");
  return `<div class="mibi${r.kind === "wild" ? " wild" : ""}" style="${o.style ?? ""}"><div class="slot${o.ringSlot ? " ring" : ""}" ${o.slotAct ? `data-act="${o.slotAct}"` : ""}>${W.slot}</div><div class="nm">${esc(r.name)}</div><div class="sqs">${sqs}</div>${o.pill && allKnown(st, id) ? `<span class="pill">${W.allKnown}</span>` : o.noFam ? "" : `<div class="fam">${fam}</div>`}</div>`;
}
function goalHtml() {
  const g = goal(frame, st);
  return `<div class="goal"><span class="gl">${g.done ? esc(W.goalDone) : W.goal}</span>${[0, 1].map((i) => `<span class="pip ${i < g.got ? "got" : "need"}">${glyph("M")}</span>`).join("")}<span class="n">${g.got}/2</span></div>`;
}
const TABS = [["bench", W.bench], ["sample", W.sample], ["cross", W.cross], ["out", W.out]];
const tabsHtml = () => `<div class="tabs">${TABS.map(([k, l]) => `<button class="tab${ui.screen === k ? " on" : ""}" data-act="tab:${k}">${l}</button>`).join("")}</div><span class="draft">${W.draft}</span>`;
function statusHtml() {
  const now = Date.now(), parts = [];
  parts.push(st.bench ? `<span class="chip">${W.benchBusy}: ${esc(st.bench.label)} ${mmss(st.bench.ready - now)}</span>` : `<span class="chip">${W.benchFree}</span>`);
  if (st.bud) parts.push(st.bud.ready <= now ? `<button class="btn" data-act="open">${W.open} ${W.budReady.toLowerCase()}</button>` : `<span class="chip">${W.budWait} ${mmss(st.bud.ready - now)}</span>`);
  return `<div class="status">${parts.join("")}</div>`;
}
const sheetHtml = (k, t) => `<div class="sheet"><span class="k">${esc(k)}</span>${esc(t)}</div>`;

// ---------------------------------------------------------------- screens
function benchHtml() {
  const rows = benchRows();
  ui.row = Math.min(ui.row, rows.length - 1);
  const list = rows.map((id, i) => mibiHtml(id, { ringCol: i === ui.row ? ui.col : -1, act: "sq:" + i })).join("");
  const id = rows[ui.row], T = TRAIT_ORDER[ui.col], w = st.why[id + ":" + T], sq = squareOf(st, id, T);
  const k = `${st.recs[id].name} · ${["Markings", "Crown", "Eyes", "Drive", "Efficiency"][ui.col]}`;
  const sheet = ui.msg ? sheetHtml(ui.msg.k, ui.msg.t) : w ? sheetHtml(w.k, w.t) : sheetHtml(k, sq.st === "known" ? `${valueWord2(sq.word)}: seen, not hidden.` : sq.st === "hunch" ? "A hunch: a sample or a cross can prove it." : st.adults.length === 1 && st.wildIds.every((x) => !st.K[x].shown) ? W.freshHint : W.tapHint);
  return `${goalHtml()}<div class="list" id="list">${list}</div>${statusHtml()}${sheet}`;
}
const valueWord2 = (w) => w[0].toUpperCase() + w.slice(1);

function sampleHtml() {
  const s = st.pouch[ui.sIdx = Math.min(ui.sIdx, Math.max(0, st.pouch.length - 1))];
  if (!s) return `<div class="abs note" style="left:16px;top:60px;width:286px">${W.noSamples}</div>${statusHtml()}${sheetHtml(W.sample, W.noSamples)}`;
  const qs = questionsFor(st, s.wild);
  ui.qIdx = Math.min(ui.qIdx, qs.length - 1);
  const T = qs[ui.qIdx];
  const asks = qs.map((q, i) => `<button class="ask${i === ui.qIdx ? " on" : ""}" style="top:${112 + i * 44}px" data-act="ask:${i}"><span class="ic">${glyph(q)}</span><span class="q">${esc(askWord(q))}</span><span class="dot"></span></button>`).join("");
  const busy = !!st.bench;
  return `${mibiHtml(s.wild, { style: "position:absolute;left:0;top:34px", ringCol: TRAIT_ORDER.indexOf(T), noFam: true })}<div class="abs label" style="left:100px;top:100px">${W.askHead}</div>
    <button class="abs item" style="left:8px;top:112px;width:78px;height:70px" data-act="sample:1">${esc(s.label)}</button>
    <div class="abs label" style="left:8px;top:190px">${ui.sIdx + 1} / ${st.pouch.length}</div><button class="abs btn ghost" style="left:42px;top:188px;width:20px;height:18px" data-act="sample:-1">&lt;</button><button class="abs btn ghost" style="left:66px;top:188px;width:20px;height:18px" data-act="sample:1">&gt;</button>
    ${asks}<button class="abs btn${busy ? " off" : " ring"}" style="left:192px;top:236px;width:118px;height:26px" data-act="test">${W.test}</button>${statusHtml()}${sheetHtml(s.label, busy ? `The bench is busy: wait for ${st.bench.label}.` : "One question per sample.")}`;
}

function outHtml() {
  if (ui.rep) return reportHtml();
  const known = (l) => st.wildIds.filter((id) => wildLand(st.recs[id].slot) === l && st.K[id].shown).length;
  return `<div class="abs note" style="left:16px;top:40px;width:286px">Where to? One expedition is one turn of the world.</div>
    ${LANDS.map((n, i) => `<button class="land${ui.land === i ? " ring" : ""}" style="left:${12 + i * 154}px;top:96px" data-act="land:${i}">${n}<small>${known(i)} of 2 met</small></button>`).join("")}
    <button class="abs btn ring" style="left:92px;top:180px;width:134px;height:34px" data-act="go">${W.goOut}</button>
    <div class="abs cost" style="left:16px;top:234px"><span><b>${st.supplies.E}</b> ${W.energy}</span><span><b>${st.supplies.Es}</b> ${W.essence}</span></div>${statusHtml()}${sheetHtml(W.out, "You come home with what you gathered, and the wild ones you met stay in view for a cross.")}`;
}
function reportHtml() {
  const R = ui.rep, m = R.met[R.i], id = m.id, ev = m.events.find((e) => e.T) ?? m.events[0], col = ev && ev.T ? TRAIT_ORDER.indexOf(ev.T) : -1;
  const sqX = 8 + 56 + (col < 0 ? 0 : col) * 50 + 23;
  const arrow = col >= 0 ? `<svg class="abs" style="left:0;top:0;pointer-events:none" width="318" height="356"><path d="M198,166 H${sqX} V${34 + 54 + 8}" fill="none" stroke="#1f4fbf" stroke-width="3"/><path d="M${sqX - 5},${34 + 62} L${sqX},${34 + 52} L${sqX + 5},${34 + 62} z" fill="#1f4fbf"/></svg>` : "";
  const lines = R.met.flatMap((x) => x.events.map((e) => e.text + (e.sample ? ` Sample: ${e.sample}.` : ""))).slice(0, 3);
  return `${mibiHtml(id, { style: "position:absolute;left:0;top:34px", ringCol: col, pill: true })}<div class="abs item" style="left:8px;top:122px;width:190px;height:88px">${W.expPicture}</div>${arrow}
    <div class="abs note" style="left:8px;top:214px;width:300px;font-size:10.5px;line-height:13px">${lines.map(esc).join("<br>")}</div>
    <div class="abs label" style="left:8px;top:104px;width:302px;font-size:10.5px">${LANDS[R.land]} · ${R.weather}${R.dusk ? " · dusk" : ""} · +${R.haul.E} ${W.energy}, +${R.haul.Es} ${W.essence}${R.met.length > 1 ? ` · ${R.i + 1} / ${R.met.length} met` : ""}</div>
    <button class="abs btn ring" style="left:238px;top:262px;width:72px;height:26px" data-act="repdone">${W.next}</button>${sheetHtml(`${st.recs[id].name}${ev && ev.T ? " · " + ["Markings", "Crown", "Eyes", "Drive", "Efficiency"][col] + " · seen on the expedition" : ""}`, ev ? ev.text : "It was just out in the open.")}`;
}

function crossSetup() {
  const c = crossCandidates(st);
  if (!c.includes(ui.A)) ui.A = st.adults[0] ?? null;
  const ok = ui.A != null ? partnersFor(st, ui.A) : [];
  if (!ok.includes(ui.B)) ui.B = ok[0] ?? null;
  return ok;
}
function crossHtml() {
  crossSetup();
  const a = ui.A, b = ui.B, bud = st.bud, ready = bud && bud.ready <= Date.now();
  let mid = "", cost = "";
  if (b == null) mid = `<div class="abs note" style="left:16px;top:96px;width:286px">${W.pickParent}. Go out to meet a wild one, or hatch another Loika.</div>`;
  else {
    const p = previewCross(frame, st, a, b);
    const proves = (lines) => [...new Set(lines.map((x) => x.word))].map((w) => `${lines.filter((x) => x.word === w).map((x) => esc(st.recs[x.id].name)).join(" + ")} ${esc(w)}`);
    const icon = (v, cls) => `<div class="sq ${cls}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${GLYPH.markings}</svg><span class="v">${v}</span></div>`;
    const card = (left, head, chance, lines, cls) => `<div class="kid" style="left:${left}px;top:166px;width:146px"><div class="p yes" style="width:146px;font-size:11px">${head}${chance ? " · " + chance : ""}</div>${icon(cls === "known" ? "pale" : "?", cls)}<div class="p${lines.length ? " yes" : ""}" style="width:146px">${lines.map((l) => esc(l)).join("<br>")}</div></div>`;
    if (p.bothPale) mid = `<div class="abs label" style="left:8px;top:150px">${W.kids}</div>` + card(8, W.paleEvery, "", [], "known");
    else {
      const py = proves(p.yes), pn = proves(p.no);
      const yesLines = py.map((t) => "proves " + t);
      const noLines = pn.length ? pn.map((t) => "proves " + t) : p.less.length ? p.less.map((id) => `${st.recs[id].name} ${W.lessLikely}`) : [W.nothingNew];
      mid = `<div class="abs label" style="left:8px;top:150px">${W.kids}</div>` + card(8, W.pale, chanceWord(p.pPale), yesLines, "known") + card(164, W.plain, chanceWord(p.pPlain), noLines, "unknown");
    }
  }
  const can = b != null && !bud && st.supplies.E >= COST.E && st.supplies.Es >= COST.Es;
  const label = ready ? W.open : W.crossBtn;
  cost = `<div class="abs cost" style="left:8px;top:308px"><span><b>${COST.E}</b> ${W.energy}</span><span><b>${COST.Es}</b> ${W.essence}</span></div><button class="abs btn${(ready || can) ? "" : " off"}${ui.cf === "go" ? " ring" : ""}" style="left:200px;top:300px;width:110px;height:34px" data-act="${ready ? "open" : "cross"}">${label}</button>`;
  const rowA = mibiHtml(a, { style: "position:absolute;left:0;top:32px;height:58px", ringSlot: ui.cf === "A", slotAct: "pick:A", noFam: true });
  const rowB = b != null ? mibiHtml(b, { style: "position:absolute;left:0;top:94px;height:58px", ringSlot: ui.cf === "B", slotAct: "pick:B", noFam: true }) : "";
  const msg = ui.msg ? `<div class="abs note" style="left:8px;top:332px;width:300px;font-size:10.5px">${esc(ui.msg.t)}</div>` : bud && !ready ? `<div class="abs note" style="left:8px;top:332px;width:300px;font-size:10.5px">${W.budWait} ${mmss(bud.ready - Date.now())}</div>` : "";
  return `${rowA}${rowB}${mid}${cost}${msg}`;
}

function render() {
  if (!st) return;
  const body = ui.screen === "bench" ? benchHtml() : ui.screen === "sample" ? sampleHtml() : ui.screen === "cross" ? crossHtml() : outHtml();
  root.innerHTML = tabsHtml() + body;
  const f = root.querySelector(".sq.ring"); if (f && ui.screen === "bench") f.closest(".mibi").scrollIntoView({ block: "nearest" });
  postState();
}

// ---------------------------------------------------------------- actions
const go = (s) => { ui.screen = s; ui.msg = null; if (s !== "out") ui.rep = null; render(); };
function doTest() {
  const s = st.pouch[ui.sIdx]; if (!s) return;
  const T = questionsFor(st, s.wild)[ui.qIdx];
  const r = startSample(st, s.id, T, Date.now(), st.firstDone ? WAIT.sample : WAIT.first);
  if (!r.ok) { ui.msg = { k: W.sample, t: r.why }; render(); return; }
  save(); ui.msg = null; ui.screen = "bench"; ui.row = benchRows().indexOf(s.wild); ui.col = TRAIT_ORDER.indexOf(T);
  ui.msg = { k: `${s.label} · on the bench`, t: `Testing: ${askWord(T)} The answer inks the square when the bench is done.` }; render();
}
function doGoOut() {
  const r = expedition(frame, st, ui.land);
  const m = r.met.slice().sort((x, y) => (y.events.some((e) => e.T) ? 1 : 0) - (x.events.some((e) => e.T) ? 1 : 0));
  ui.rep = { met: m, i: 0, land: r.land, weather: r.weather, dusk: r.dusk, haul: r.haul };
  save(); render();
}
function doCross() {
  const r = startCross(frame, st, ui.A, ui.B, Date.now(), WAIT.bud);
  ui.msg = r.ok ? { k: W.cross, t: `A bud is in the incubator. Open it when it is ready.` } : { k: W.cross, t: r.why };
  if (r.ok) { save(); ui.screen = "bench"; ui.row = 0; ui.col = 0; }
  render();
}
function doOpen() {
  const r = openBud(frame, st, Date.now());
  if (!r.ok) { ui.msg = { k: W.cross, t: r.why }; render(); return; }
  save();
  ui.screen = "bench"; ui.msg = null;
  const rows = benchRows(), L = st.last;
  const at = L ? rows.indexOf(L.id) : rows.indexOf(r.child);
  ui.row = Math.max(0, at); ui.col = L ? TRAIT_ORDER.indexOf(L.T) : 0;
  if (r.released) ui.msg = { k: W.bench, t: `The vivarium was full: ${r.released} went back to the wild.` };
  render();
}
function focusLast() {   // after a bench result, the ring goes to the square that was inked
  const L = st.last; if (!L) return;
  const at = benchRows().indexOf(L.id); if (at >= 0) { ui.row = at; ui.col = TRAIT_ORDER.indexOf(L.T); }
}
function act(a) {
  const [k, x, y] = a.split(":");
  if (k === "tab") return go(x);
  if (k === "sq") { ui.row = +x; ui.col = +y; ui.msg = null; return render(); }
  if (k === "ask") { ui.qIdx = +x; return render(); }
  if (k === "sample") { const n = st.pouch.length; if (n) { ui.sIdx = (ui.sIdx + +x + n) % n; ui.qIdx = 0; } return render(); }
  if (k === "test") return doTest();
  if (k === "land") { ui.land = +x; return render(); }
  if (k === "go") return doGoOut();
  if (k === "repdone") { ui.rep = null; return go("bench"); }
  if (k === "cross") return doCross();
  if (k === "open") return doOpen();
  if (k === "pick") { ui.cf = x; return cyclePick(x, 1); }
}
function cyclePick(slot, d) {
  if (slot === "A") { const c = crossCandidates(st), i = c.indexOf(ui.A); ui.A = c[(i + d + c.length) % c.length]; ui.msg = null; }
  else { const ok = partnersFor(st, ui.A), i = ok.indexOf(ui.B); if (ok.length) ui.B = ok[(i + d + ok.length) % ok.length]; ui.msg = null; }
  render();
}
const MOVES = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
function key(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const c = e.code;
  const tab = { KeyH: "bench", KeyR: "sample", KeyB: "cross", KeyL: "out", Digit1: "bench", Digit2: "sample", Digit3: "cross", Digit4: "out" }[c];
  if (tab) { e.preventDefault(); return go(tab); }
  if (c === "Escape" || c === "Backspace") { e.preventDefault(); if (ui.rep) { ui.rep = null; return render(); } return go("bench"); }
  const confirm = c === "Enter" || c === "NumpadEnter" || c === "Space";
  const mv = MOVES[c]; if (!mv && !confirm) return;
  e.preventDefault();
  const [dx, dy] = mv ?? [0, 0];
  if (ui.screen === "bench") {
    ui.msg = null;
    if (confirm) { if (st.bud && st.bud.ready <= Date.now()) return doOpen(); return act("sq:" + ui.row + ":" + ui.col); }   // the same as tapping the square under the ring
    const n = benchRows().length; ui.row = Math.max(0, Math.min(n - 1, ui.row + dy)); ui.col = Math.max(0, Math.min(4, ui.col + dx)); return render();
  }
  if (ui.screen === "sample") {
    if (confirm) return doTest();
    const s = st.pouch[ui.sIdx]; if (!s) return;
    if (dy) { const n = questionsFor(st, s.wild).length; ui.qIdx = Math.max(0, Math.min(n - 1, ui.qIdx + dy)); }
    if (dx) act("sample:" + dx);
    return render();
  }
  if (ui.screen === "cross") {
    if (confirm) return act(ui.cf === "go" ? (st.bud && st.bud.ready <= Date.now() ? "open" : "cross") : "pick:" + ui.cf);   // the same as tapping the control the cursor is on
    if (dy) { const o = ["A", "B", "go"], i = Math.max(0, Math.min(2, o.indexOf(ui.cf) + dy)); ui.cf = o[i]; return render(); }
    if (dx && ui.cf !== "go") return cyclePick(ui.cf, dx);
    return;
  }
  if (ui.screen === "out") {
    if (ui.rep) { if (confirm) { ui.rep = null; return go("bench"); } if (dx) { ui.rep.i = (ui.rep.i + dx + ui.rep.met.length) % ui.rep.met.length; return render(); } return; }
    if (confirm) return doGoOut();
    if (dx) { ui.land = Math.max(0, Math.min(1, ui.land + dx)); return render(); }
  }
}
window.addEventListener("keydown", (e) => { if (e.repeat) return; key(e); });
root.addEventListener("click", (e) => { const t = e.target.closest("[data-act]"); if (t) act(t.dataset.act); });
root.addEventListener("contextmenu", (e) => e.preventDefault());

// ---------------------------------------------------------------- the clock: the bench and the bud finish while you watch (or while the page was closed)
function tick() {
  if (!st) return;
  const now = Date.now(), done = tickBench(frame, st, now);
  if (done) {
    save(); focusLast();
    const w = st.why[done.wild + ":" + done.T]; ui.msg = w ? { k: w.k, t: w.t } : null;
    if (ui.screen === "sample" || ui.screen === "out") ui.screen = "bench";
    render(); return;
  }
  if ((st.bench || st.bud) && !ui.rep) render();
}
setInterval(tick, 1000);

// The play page's word about the Station: a Loikas-only bench is always awake ("first pod home"), and it carries the supplies for the Caddy's ledger.
function postState() {
  if (parent === window) return;
  try { parent.postMessage({ t: "mb-caddy", podHome: true, goal: null, canDock: false, docked: false, crates: 0, pending: false, opened: null, partner: null, world: null, companion: null, ledger: { e: st.supplies.E | 0, d: 0, s: st.supplies.Es | 0 }, along: null }, location.origin); } catch { /* no parent */ }
}
setInterval(postState, 5000);

// ---------------------------------------------------------------- boot
const info = (async () => {
  frame = await (await fetch(new URL("species/frames/species-S01.json", PROTOTYPES))).json();
  st = loadOrNew(); save();
  const done = tickBench(frame, st, Date.now()); if (done) { save(); focusLast(); }
  render();
  return st;
})();
window.__lab = { ready: info, get st() { return st; }, get ui() { return ui; }, act, key, render, tick, go, WAIT };
