import { html, render, useState, useEffect } from "./preact-htm.js";

const REFRESH_MS = 10000;
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

const Bar = ({ value, mark, kind }) => html`
  <div class="bar" role="img" aria-label=${"bar at " + Math.round(value) + " percent"}>
    <i class=${kind || ""} style=${"width:" + clamp(value) + "%"}></i>
    ${mark != null && html`<u style=${"left:calc(" + clamp(mark) + "% - 1px)"}></u>`}
  </div>`;

// ---- top screen: is it moving, what comes to the owner next, is anything stuck
function Top({ d, stale }) {
  const p = d.pulse || { working: 0, total: 0, stuck: 0 };
  const r = d.release || {};
  const wait = d.waiting || [];
  return html`
    <div class="top">
      <div class="clock">${d.now}<small>Mexico City</small></div>
      <div class=${"pulse" + (p.stuck ? " bad" : "")}><span class=${"dot " + (p.stuck ? "off" : "busy")}></span>${p.working} of ${p.total} working, ${p.stuck} stuck</div>
    </div>
    ${stale > 0 && html`<div class="stale">No update for ${dur(stale)}; showing the last one.</div>`}
    ${d.drain && html`<div class="banner"><b>Drain: no new jobs start.</b>${d.drain.reason}</div>`}
    ${r.version && html`<div class="card hero">
      <h2>Next release</h2>
      <div class="name">${r.version}</div>
      <div class="small">${r.line}</div>
      ${r.state && html`<div class="dim small">${r.state}</div>`}
    </div>`}
    <div class="card">
      <h2>Waiting on</h2>
      ${wait.length
        ? wait.map((w) => html`<div class="wait"><span class=${"who " + w.who}>${w.who === "owner" ? "You" : "Desk"}</span><span class="small">${w.text}</span></div>`)
        : html`<div class="dim small">Nothing is waiting on you or on a desk.</div>`}
    </div>
    <${Accounts} d=${d} />`;
}

function Accounts({ d }) {
  const spend = d.spend.filter((s) => s.mxn > 0 || s.line === "game");
  return html`
    <div class="card">
      ${d.accounts.map((a) => {
        const kind = a.used_pct >= 85 ? "bad" : a.used_pct >= a.line_pct ? "warn" : "ok";
        return html`<div class="acct">
          <div class="row small"><span class="name">${a.label}</span><span class="dim">${pct(a.used_pct)} of the week · line ${pct(a.line_pct)}</span></div>
          <${Bar} value=${a.used_pct} mark=${a.line_pct} kind=${kind} />
          <div class="dim tiny">Resets ${a.resets}</div>
        </div>`;
      })}
      <div class="dim small spend">Picture spending today: ${d.spend.map((s) => ({ game: "game", book: "book", assist: "helpers" }[s.line] || s.line) + " " + Math.round(s.mxn) + " of " + Math.round(s.limit)).join(" · ")} pesos</div>
    </div>`;
}

// ---- middle: one card per workstream
function Streams({ d }) {
  return html`
    <h2 class="sec">Where the work stands</h2>
    <div class="grid pipes">
      ${d.streams.map((p) => html`<div class="card pipe">
        <div class="name">${p.name}</div>
        <div class="mile">${p.milestone || html`<span class="dim">No milestone written yet.</span>`}</div>
        <div class="strip">
          ${p.running.length ? html`<span class="lbl run">Running now</span>` : ""}
          ${p.running.map((t) => html`<span class=${"pill run" + (t.stuck ? " stuck" : "")}><span class="dot"></span>${t.stuck ? "stuck · " : ""}${t.title}${t.running_s != null ? html` <span class="dim">· ${dur(t.running_s)}</span>` : ""}</span>`)}
          ${p.next.length ? html`<span class="lbl">Up next</span>` : ""}
          ${p.next.map((t) => html`<span class="pill">${t.title}</span>`)}
          ${!p.running.length && !p.next.length && html`<span class="dim tiny">Nothing running or waiting.</span>`}
        </div>
      </div>`)}
    </div>`;
}

// ---- bottom: collapsed
function Slots({ d }) {
  return html`
    <details class="fold">
      <summary>Work places <span class="dim">· ${d.slots.length} busy, ${d.places.free} free</span></summary>
      <div class="slots">
        ${d.slots.map((s) => html`<details class="slot">
          <summary>
            <span class="row"><span class="what">${s.title}</span><span class="dim small">${dur(s.running_s)}</span></span>
            <span class="chips">
              ${s.stuck ? html`<span class="chip bad">stuck · no change for ${dur(s.quiet_s)}</span>` : s.quiet_s != null && html`<span class="chip">last change ${ago(s.quiet_s)}</span>`}
              ${s.model && html`<span class="chip">${s.model}${s.effort ? " " + s.effort : ""}</span>`}
              <span class="chip">${s.account === "MB_A" ? "Jobs account" : "Lead account"}</span>
            </span>
          </summary>
          <pre class="brief">${s.brief || s.what}</pre>
        </details>`)}
        ${!d.slots.length && html`<div class="dim small">No job is running.</div>`}
      </div>
    </details>`;
}

function Desks({ d }) {
  return html`
    <details class="fold">
      <summary>Desks <span class="dim">· ${d.desks.filter((x) => x.status === "busy").length} of ${d.desks.length} working</span></summary>
      <div class="grid desks">
        ${d.desks.map((x) => html`<div class="card">
          <div class="row"><span class="name"><span class=${"dot " + x.status}></span>${x.name}</span>
            <span class="dim small">${x.status === "off" ? "not running" : x.status === "busy" ? "working" : "waiting"}${x.since_s != null && x.status !== "off" ? " · " + ago(x.since_s) : ""}</span></div>
          ${x.context && html`<div class="dim small">${Math.round(x.context.tokens / 1000)}k of ${Math.round(x.context.drain / 1000)}k memory used</div>`}
          ${x.jobs.map((j) => html`<div class="dim small">${j.title}</div>`)}
        </div>`)}
      </div>
    </details>`;
}

function Queue({ d }) {
  return html`
    <details class="fold">
      <summary>Queue <span class="dim">· next ${d.queue.length} of ${d.queue_total}</span></summary>
      <div class="card">
        ${d.queue.map((q) => html`<details class="qrow">
          <summary>
            <span class="what">${q.title}</span>
            <span class="dim tiny">${q.held ? "held: " + q.held : q.auto ? "starts by itself" : "waits for the lead"}</span>
          </summary>
          <pre class="brief">${q.brief}</pre>
        </details>`)}
        ${!d.queue.length && html`<div class="dim">The queue is empty.</div>`}
      </div>
    </details>`;
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
    <${Streams} d=${d} />
    <h2 class="sec">Details</h2>
    <${Slots} d=${d} />
    <${Queue} d=${d} />
    <${Desks} d=${d} />
    <footer>Updates every 10 seconds. Read only.</footer>`;
}

render(html`<${App} />`, document.getElementById("app"));
