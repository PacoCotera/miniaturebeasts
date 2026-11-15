import { html, render, useState, useEffect } from "./preact-htm.js";

const REFRESH_MS = 10000;
const ROLE = { build: "builder", paint: "painter", art: "painter", design: "designer", research: "researcher", review: "reviewer", builder: "builder", painter: "painter" };
const DESK = { lead: "Lead", art: "Art director", design: "Game designer", ui: "Screens and phone UI", pixel: "Pixel art", editorial: "Book editor", hardware: "Hardware", mobile: "Phone app" };

const dur = (s) => {
  if (s == null) return "?";
  const m = Math.round(s / 60);
  if (m < 1) return "under 1 min";
  if (m < 60) return m + " min";
  const h = Math.floor(m / 60);
  return h + " h " + String(m % 60).padStart(2, "0") + " min";
};
const ago = (s) => (s == null ? "" : s < 90 ? "just now" : dur(s) + " ago");
const pct = (n) => (n == null ? "?" : Math.round(n) + "%");
const clamp = (n) => Math.max(0, Math.min(100, n));
const mxn = (n) => Math.round(n) + " pesos";

const Bar = ({ value, mark, kind, tall }) => html`
  <div class=${"bar" + (tall ? " tall" : "")} role="img" aria-label=${"bar at " + Math.round(value) + " percent"}>
    <i class=${kind || ""} style=${"width:" + clamp(value) + "%"}></i>
    ${mark != null && html`<u style=${"left:calc(" + clamp(mark) + "% - 1px)"}></u>`}
  </div>`;

function Top({ d, stale }) {
  const lead = d.desks.find((x) => x.key === "lead");
  const c = lead && lead.context;
  return html`
    <div class="top">
      <div class="clock">${d.now}<small>Mexico City</small></div>
      <div class="lead">
        ${lead && html`<span class=${"dot " + lead.status}></span>Lead is ${lead.status === "busy" ? "working" : lead.status === "idle" ? "waiting" : "off"}`}
        ${c && html` · ${Math.round(c.tokens / 1000)}k of ${Math.round(c.drain / 1000)}k memory used`}
      </div>
      ${stale > 0 && html`<div class="stale">No update for ${dur(stale)}; showing the last one.</div>`}
    </div>
    ${d.drain && html`<div class="banner"><b>Drain mode: no new jobs start.</b>${d.drain.reason}</div>`}`;
}

function Accounts({ d }) {
  return html`
    <h2>Accounts and allowance</h2>
    <div class="grid two">
      ${d.accounts.map((a) => {
        const kind = a.used_pct >= 85 ? "bad" : a.used_pct >= a.line_pct ? "warn" : "ok";
        return html`<div class="card">
          <div class="row"><span class="name">${a.label}</span><span class="dim">${pct(a.used_pct)} of the week used</span></div>
          <${Bar} value=${a.used_pct} mark=${a.line_pct} kind=${kind} tall=${true} />
          <div class="dim small">Today's line (the tick) is ${pct(a.line_pct)}. ${a.bar === "any job may start" ? "Any job may start." : a.bar}</div>
          <div class="dim small">${a.who}</div>
          <div class="dim small">Week resets ${a.resets}. Read ${a.reading_at}.</div>
        </div>`;
      })}
    </div>
    <div class="card" style="margin-top:10px">
      <div class="name">Picture spending today</div>
      ${d.spend.map((s) => html`
        <div class="row small" style="margin-top:8px"><span>${{ game: "Game art", book: "Book art", assist: "Quick helper calls" }[s.line] || s.line}</span><span class="dim">${mxn(s.mxn)} of ${mxn(s.limit)}</span></div>
        <${Bar} value=${s.limit ? (100 * s.mxn) / s.limit : 0} kind=${s.mxn >= s.limit ? "bad" : "ok"} />`)}
    </div>`;
}

function Slots({ d }) {
  const free = Math.max(0, d.places.total - d.slots.length);
  return html`
    <h2>Work places · ${d.slots.length} of ${d.places.total} busy</h2>
    <div class="slots">
      ${d.slots.map((s) => {
        const ratio = s.typical_s ? s.running_s / s.typical_s : null;
        const kind = ratio == null ? "" : ratio >= 2 ? "bad" : ratio > 1 ? "warn" : "";
        const scale = s.typical_s ? Math.max(s.typical_s * 1.5, s.running_s) : s.running_s || 1;
        return html`<div class="slot">
          <div class="row"><span class="name">${DESK[s.desk] || s.desk} ${ROLE[s.role] || s.role}</span><span class="dim small">${dur(s.running_s)}</span></div>
          <div class="what">${s.what}</div>
          <${Bar} value=${(100 * s.running_s) / scale} mark=${s.typical_s ? (100 * s.typical_s) / scale : null} kind=${kind} />
          <div class="dim small">${s.typical_s ? "Usually about " + dur(s.typical_s) + " (the tick)" : "No usual time yet for this kind of job"}</div>
          <div class="chips" style="margin-top:6px">
            ${s.model && html`<span class="chip a">${s.model}${s.effort ? " " + s.effort : ""}</span>`}
            <span class="chip">${s.account === "MB_A" ? "Jobs account" : "Lead account"}</span>
            <span class="chip">priority ${s.priority}</span>
          </div>
        </div>`;
      })}
      ${Array.from({ length: free }, (_, i) => html`<div class="slot free" key=${"f" + i}>free</div>`)}
    </div>`;
}

function Desks({ d }) {
  return html`
    <h2>Desks</h2>
    <div class="grid desks">
      ${d.desks.map((x) => html`<div class="card">
        <div class="row"><span class="name"><span class=${"dot " + x.status}></span>${x.name}</span>
          <span class="dim small">${x.status === "off" ? "not running" : x.status === "busy" ? "working" : "waiting"}${x.since_s != null && x.status !== "off" ? " · " + ago(x.since_s) : ""}</span></div>
        ${x.jobs.length
          ? x.jobs.map((j) => html`<div class="dim small" style="margin-top:6px">${j.what}</div>`)
          : html`<div class="dim small" style="margin-top:6px">${x.status === "busy" ? "Working in its own session." : "No job running."}</div>`}
      </div>`)}
    </div>`;
}

function Pipeline({ d }) {
  return html`
    <h2>Pipeline by workstream · last 24 hours</h2>
    <div class="grid pipes">
      ${d.pipeline.map((p) => html`<div class="card pipe">
        <div class="head"><span class="name">${p.name}</span><span class="dim small">${p.done} done · ${p.running.length} running · ${p.queued} waiting</span></div>
        <${Bar} value=${(100 * p.done) / (p.weight || 1)} kind="ok" />
        <ul>
          ${p.running.map((t) => html`<li><span class="tag run">now</span> ${t}</li>`)}
          ${p.next.map((t) => html`<li><span class="tag">next</span> ${t}</li>`)}
          ${!p.running.length && !p.next.length && html`<li class="dim">Nothing running or waiting.</li>`}
        </ul>
      </div>`)}
    </div>`;
}

function Queue({ d }) {
  return html`
    <h2>Next in line · ${d.queue.length} of ${d.queue_total}</h2>
    <div class="card">
      ${d.queue.map((q) => html`<div class="qrow">
        <div class="pri" title="priority">${q.priority}</div>
        <div>
          <div class="small">${q.what}</div>
          <div class="dim small">${DESK[q.desk] || q.desk} ${ROLE[q.role] || q.role}
            ${q.auto && html`<span class="mark">starts by itself</span>`}
            ${q.held && html`<span class="mark held">held: ${q.held}</span>`}
            ${!q.auto && !q.held && html`<span class="mark">waits for the lead</span>`}</div>
        </div>
      </div>`)}
      ${!d.queue.length && html`<div class="dim">The queue is empty.</div>`}
    </div>`;
}

function App() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [last, setLast] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const r = await fetch("team.json", { cache: "no-store" });
        const j = await r.json();
        if (!live) return;
        if (j.error) setErr(j.error);
        else { setD(j); setErr(null); setLast(Date.now()); }
      } catch (e) { if (live) setErr("Cannot reach the studio."); }
    };
    load();
    const a = setInterval(load, REFRESH_MS), b = setInterval(() => setNow(Date.now()), 1000);
    return () => { live = false; clearInterval(a); clearInterval(b); };
  }, []);
  if (!d) return html`<p class="loading">${err || "Loading the team…"}</p>`;
  const stale = now - last > 30000 ? Math.round((now - last) / 1000) : 0;
  return html`
    <${Top} d=${d} stale=${stale} />
    ${err && html`<div class="banner err"><b>Could not refresh.</b>${err}</div>`}
    <${Accounts} d=${d} />
    <${Slots} d=${d} />
    <${Desks} d=${d} />
    <${Pipeline} d=${d} />
    <${Queue} d=${d} />
    <footer>Updates every 10 seconds. Read only.</footer>`;
}

render(html`<${App} />`, document.getElementById("app"));
