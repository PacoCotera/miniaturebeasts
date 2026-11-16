import { html, useState, useEffect, useRef } from "./preact-htm.js";
import { ago, dur, Bar } from "./util.js";

const REFRESH_MS = 10000;

// ---- the chart library (Chart.js, vendored beside this file) loads only when this tab opens
let chartLoad = null;
const loadChart = () => chartLoad || (chartLoad = new Promise((res, rej) => {
  if (window.Chart) return res(window.Chart);
  const s = document.createElement("script");
  s.src = "team/chart.js";
  s.onload = () => res(window.Chart);
  s.onerror = () => { chartLoad = null; rej(new Error("the chart library did not load")); };
  document.head.appendChild(s);
}));
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

// Chart.js draws; this component only hands it a config and rebuilds it when the numbers change
function Chart({ build, deps, height, label }) {
  const cv = useRef(null), inst = useRef(null);
  const [fail, setFail] = useState(null);
  useEffect(() => {
    let dead = false;
    loadChart().then((C) => {
      if (dead || !cv.current) return;
      if (inst.current) inst.current.destroy();
      inst.current = new C(cv.current, build(C));
    }).catch((e) => setFail(e.message));
    return () => { dead = true; };
  }, [JSON.stringify(deps)]);
  useEffect(() => () => inst.current && inst.current.destroy(), []);
  return html`<div class="chartbox" style=${"height:" + height + "px"}>
    ${fail ? html`<div class="dim small">${fail}. The table below has the same numbers.</div>` : html`<canvas ref=${cv} role="img" aria-label=${label}></canvas>`}
  </div>`;
}

const kindColor = (i, last) => css(last ? "--kother" : "--k" + (i + 1));

function chartBase(over) {
  const text = css("--dim"), line = css("--line");
  return {
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: { legend: { position: "bottom", labels: { color: text, boxWidth: 10, boxHeight: 10, font: { size: 11 }, padding: 10 } }, tooltip: { mode: "index", intersect: false } },
    scales: {
      x: { stacked: true, ticks: { color: text, font: { size: 11 }, precision: 0 }, grid: { color: line }, border: { color: line } },
      y: { stacked: true, ticks: { color: text, font: { size: 11 }, precision: 0 }, grid: { color: line }, border: { color: line }, beginAtZero: true },
    },
    ...over,
  };
}

// one dataset per kind, in the fixed colour order; a kind with no posts in the window is left out
function stackedSets(kinds, rows) {
  const surface = css("--card");
  return kinds.map((k, i) => ({ k, i })).filter(({ k }) => rows.some((r) => r.kinds[k.key] > 0)).map(({ k, i }) => ({
    label: k.name, data: rows.map((r) => r.kinds[k.key]),
    backgroundColor: kindColor(i, k.key === "other"), borderColor: surface, borderWidth: 2, borderRadius: 3, borderSkipped: false, maxBarThickness: 64,
  }));
}

function Table({ head, rows }) {
  return html`<details class="tbl"><summary class="dim tiny">Show as a table</summary>
    <table><thead><tr>${head.map((h, i) => html`<th class=${i ? "n" : ""}>${h}</th>`)}</tr></thead>
      <tbody>${rows.map((r) => html`<tr>${r.map((c, i) => html`<td class=${i ? "n" : ""}>${c}</td>`)}</tr>`)}</tbody></table></details>`;
}

const dayWord = (s) => { const d = new Date(s + "T12:00:00Z"); return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }); };
const doc = (kind, id) => "team-doc/" + kind + (id ? "/" + id : "");
const Link = ({ to, children }) => html`<a class="lnk" href=${to} target="_blank" rel="noopener">${children}</a>`;
const RuleLink = ({ n }) => html`<${Link} to=${doc("rule", n)}>Rule ${n}</${Link}>`;
const shortWho = (w) => (w.includes("/") ? w.split("/").slice(-2).join("/") : w);

// ---- 1. right now
function Now({ d }) {
  const today = d.days[d.days.length - 1];
  // the count replayed from the whole log (series) when it is there: the router's day file began counting later than the log
  const dayRows = ((d.series || {}).day || {}).rows || [], replay = dayRows.length ? dayRows[dayRows.length - 1].lead_lines : null;
  const lines = replay != null ? replay : today ? today.lead_lines : 0, target = d.target;
  const split = today && today.lead_lines === lines;
  const kind = lines > target ? "bad" : lines >= target * 0.8 ? "warn" : "ok";
  const up = d.router_quiet_s != null && d.router_quiet_s < 120;
  const failing = d.checks.filter((c) => !c.pass_).length;
  return html`
    <div class="card hero">
      <h2>The lead's lines today</h2>
      <div class="name big">${lines} of ${target}</div>
      <${Bar} value=${lines / target * 100} kind=${kind} />
      <div class="small dim">${split ? today.lead_urgent + " came at once, " + today.lead_held + " were held for a batch." : lines ? "" : "No lines yet today."} ${lines > target ? "Over the target." : ""}</div>
    </div>
    <div class="card">
      <div class="row small"><span><span class=${"dot " + (up ? "idle" : "off")}></span>Message router</span><span class="dim">${up ? "running" : d.router_quiet_s == null ? "no heartbeat found" : "no heartbeat for " + dur(d.router_quiet_s)}</span></div>
      <div class="row small"><span><span class=${"dot " + (failing ? "off" : "idle")}></span>Checks run by a machine</span><span class="dim">${d.checks.length - failing} passing, ${failing} failing</span></div>
      <div class="row small"><span><span class=${"dot " + (d.violations.open ? "off" : "idle")}></span>Rules broken and not fixed</span><span class="dim">${d.violations.open}</span></div>
    </div>`;
}

// ---- the zoom of the time charts (owner 11-16: "multiple levels of aggregation pls. full days is too big"); remembered per viewer
const ZOOMS = [
  { key: "15m", word: "15 min", head: "every 15 minutes, last 6 hours", col: "15 minutes from", every: 4 },
  { key: "hour", word: "Hour", head: "every hour, last 24 hours", col: "Hour from", every: 4 },
  { key: "day", word: "Day", head: "every day, last 14 days", col: "Day", every: 3 },
  { key: "week", word: "Week", head: "every week, last 8 weeks", col: "Week from", every: 2 },
];
// a label on every n-th bar counted back from the newest, so the newest bar is always named
const tickEvery = (n, every) => ({ autoSkip: false, maxRotation: 0, callback(v, i) { return (n - 1 - i) % every === 0 ? this.getLabelForValue(v) : ""; } });
const ZKEY = "mb-team-coord-zoom";
const readZoom = () => { try { const z = localStorage.getItem(ZKEY); return ZOOMS.some((x) => x.key === z) ? z : "hour"; } catch { return "hour"; } };
const MX = "America/Mexico_City";
const stamp = (s, zoom) => {
  const d = new Date(s * 1000);
  if (zoom === "day") return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  if (zoom === "week") return "w/c " + d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: MX });
};

function ZoomSwitch({ zoom, setZoom }) {
  return html`<div class="zoom" role="radiogroup" aria-label="Group the time charts by">
    <span class="dim small">Group by</span>
    ${ZOOMS.map((z) => html`<button role="radio" aria-checked=${zoom === z.key} class=${zoom === z.key ? "on" : ""} onClick=${() => setZoom(z.key)}>${z.word}</button>`)}
  </div>`;
}

// ---- 2. flow: who posts, to whom, how much, of what kind
function Flow({ d }) {
  const days = d.days;
  const kinds = d.kinds;
  const [zoom, setZoomState] = useState(readZoom);
  const setZoom = (z) => { setZoomState(z); try { localStorage.setItem(ZKEY, z); } catch { /* private window: the choice lasts this visit */ } };
  const Z = ZOOMS.find((x) => x.key === zoom);
  const ser = (d.series || {})[zoom] || { rows: [], target: null };
  const rows = ser.rows, target = ser.target;
  const labels = rows.map((x) => stamp(x.start, zoom));
  const leadKnown = rows.every((x) => x.lead_lines != null);
  const total = days.reduce((a, x) => a + x.posts, 0);
  const rowsH = (rows) => 38 + rows.length * 26 + 44;
  return html`
    <h2 class="sec">Messages</h2>
    <${ZoomSwitch} zoom=${zoom} setZoom=${setZoom} />
    <div class="flowgrid">
    <div class="card">
      <div class="name">Messages ${Z.head}, by kind</div>
      <${Chart} height=${230} deps=${[zoom, rows]} label=${"Messages " + Z.head + ", split by kind"}
        build=${() => { const o = chartBase({}); Object.assign(o.scales.x.ticks, tickEvery(rows.length, Z.every)); return { type: "bar", data: { labels, datasets: stackedSets(kinds, rows) }, options: o }; }} />
      <${Table} head=${[Z.col, "Messages", ...kinds.map((k) => k.name)]} rows=${rows.map((x, i) => [labels[i], x.posts, ...kinds.map((k) => x.kinds[k.key])])} />
      ${(zoom === "15m" || zoom === "hour") && html`<div class="dim tiny note">Times are Mexico City.</div>`}
      ${(zoom === "day" || zoom === "week") && days.length < 7 && html`<div class="dim tiny note">The message bus started on 16 Nov; earlier bars are empty.</div>`}
    </div>
    <div class="card">
      <div class="name">The lead's lines ${Z.head}${target ? ", against the target" : ""}</div>
      ${leadKnown ? html`<${Chart} height=${190} deps=${[zoom, rows, target]} label=${"Lines the lead received " + Z.head + (target ? " against the target" : "")}
        build=${() => {
          const text = css("--dim"), line = css("--line"), bad = css("--bad"), busy = css("--busy"), tcol = css("--text");
          const mark = { id: "target", afterDatasetsDraw(c) {
            if (!target) return;
            const { ctx, chartArea: a, scales: { y } } = c, py = y.getPixelForValue(target);
            ctx.save(); ctx.strokeStyle = tcol; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
            ctx.beginPath(); ctx.moveTo(a.left, py); ctx.lineTo(a.right, py); ctx.stroke();
            ctx.setLineDash([]); ctx.fillStyle = tcol; ctx.font = "11px system-ui"; ctx.textBaseline = "bottom"; ctx.fillText("target " + target, a.left + 4, py - 3); ctx.restore();
          } };
          return { type: "bar", plugins: [mark], data: { labels, datasets: [{ label: "Lines to the lead", data: rows.map((x) => x.lead_lines), backgroundColor: rows.map((x) => (target && x.lead_lines > target ? bad : busy)), borderRadius: 3, borderSkipped: false, maxBarThickness: 48 }] },
            options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } },
              scales: { x: { ticks: { color: text, font: { size: 11 }, ...tickEvery(rows.length, Z.every) }, grid: { display: false }, border: { color: line } }, y: { beginAtZero: true, suggestedMax: target ? target + 3 : 4, ticks: { color: text, font: { size: 11 }, precision: 0 }, grid: { color: line }, border: { color: line } } } } };
        }} />` : html`<div class="dim small">The router's code could not be read, so the lead's lines can't be split finer than a day.</div>`}
      <${Table} head=${[Z.col, "Lines to the lead", ...(target ? ["Target"] : [])]} rows=${rows.map((x, i) => [labels[i], x.lead_lines ?? "-", ...(target ? [target] : [])])} />
      ${!target && html`<div class="dim tiny note">The target is ${d.target} a day; switch to Day or Week to see it.</div>`}
    </div>
    </div>
    <div class="flowgrid">
    <div class="card">
      <div class="name">Who sends</div>
      <${Chart} height=${rowsH(d.sources)} deps=${d.sources} label="Messages sent by each source, split by kind"
        build=${() => ({ type: "bar", data: { labels: d.sources.map((r) => r.name), datasets: stackedSets(kinds, d.sources) }, options: chartBase({ indexAxis: "y" }) })} />
      <${Table} head=${["Source", "Messages", ...kinds.map((k) => k.name)]} rows=${d.sources.map((r) => [r.name, r.total, ...kinds.map((k) => r.kinds[k.key])])} />
    </div>
    <div class="card">
      <div class="name">Who it is addressed to</div>
      <${Chart} height=${rowsH(d.addressed)} deps=${d.addressed} label="Messages addressed to each destination, split by kind"
        build=${() => ({ type: "bar", data: { labels: d.addressed.map((r) => r.name), datasets: stackedSets(kinds, d.addressed) }, options: chartBase({ indexAxis: "y" }) })} />
      <${Table} head=${["To", "Messages", ...kinds.map((k) => k.name)]} rows=${d.addressed.map((r) => [r.name, r.total, ...kinds.map((k) => r.kinds[k.key])])} />
    </div>
    </div>
    <div class="card">
      <div class="name">Busiest routes</div>
      <div class="routes">
        ${d.pairs.map((p) => html`<div class="route"><span class="small">${p.src_name} <span class="dim">→</span> ${p.dst_name}</span><span class="rbar"><${Bar} value=${p.n / d.pairs[0].n * 100} /></span><span class="small n">${p.n}</span></div>`)}
        ${!d.pairs.length && html`<div class="dim small">No messages yet.</div>`}
      </div>
      <div class="name sub">Where the router put them</div>
      <div class="chips">${d.routed.map((r) => html`<span class="chip">${r.name} · ${r.n}</span>`)}</div>
      <div class="dim tiny note">${total} messages counted. Only who sent, who it went to, the kind and the time are read; never the text.</div>
    </div>`;
}

// ---- 3. checks
function State({ ok }) {
  return html`<span class=${"state " + (ok ? "ok" : "bad")}>${ok ? "✓ Passing" : "✕ Failing"}</span>`;
}
function Checks({ d }) {
  return html`
    <h2 class="sec">Checks on the rules</h2>
    <div class="card">
      ${d.checks.map((c) => html`<div class="crow">
        <div class="row"><span class="small"><${RuleLink} n=${c.rule} /> <span class="dim">· ${c.title}</span></span><${State} ok=${c.pass_} /></div>
        <div class="dim tiny">${c.check} · ran ${c.ago == null ? "never" : ago(c.ago)}${c.pass_ ? "" : " · " + c.count + " found"}</div>
        ${!c.pass_ && html`<div class="small why">${c.detail}</div>`}
      </div>`)}
      ${!d.checks.length && html`<div class="dim small">No check results yet.</div>`}
    </div>
    ${d.bus_rules.length > 0 && html`<div class="card">
      <h2>New rules sent to the desks</h2>
      ${d.bus_rules.map((r) => html`<div class="row small crow"><span><${RuleLink} n=${r.n} /></span><span class=${r.waiting.length ? "dim" : ""}>${r.acked} of ${r.of} confirmed${r.waiting.length ? ", waiting on " + r.waiting.join(", ") : ""}</span></div>`)}
    </div>`}
    <details class="fold">
      <summary>Refused at the moment it happens <span class="dim">· ${d.guards.length}</span></summary>
      <div class="card">${d.guards.map((c) => html`<div class="crow small"><${RuleLink} n=${c.rule} /> <span class="dim">· ${c.title} · ${c.check}</span></div>`)}</div>
    </details>
    <details class="fold">
      <summary>Kept by review only, no machine check <span class="dim">· ${d.review.length}</span></summary>
      <div class="card">${d.review.map((c) => html`<div class="crow small"><${RuleLink} n=${c.rule} /> <span class="dim">· ${c.title}</span></div>`)}</div>
    </details>`;
}

// ---- 4. violations
function Violations({ d }) {
  const v = d.violations;
  return html`
    <h2 class="sec">Rules broken <span class="dim">· ${v.open} not fixed, ${v.fixed} fixed</span></h2>
    <div class="card">
      ${v.items.map((x) => html`<div class="crow">
        <div class="row"><span class="small"><${RuleLink} n=${x.rule} /> <span class="dim">· ${x.title}</span></span>
          <span class=${"state " + (x.fixed ? "ok" : "bad")}>${x.fixed ? "✓ Fixed" : "✕ Not fixed"}</span></div>
        <div class="dim tiny">${shortWho(x.who)} · found ${ago(x.ago) || "just now"}${x.fixed ? " · fixed " + (ago(x.fixed_ago) || "just now") : ""}</div>
        <div class="small why">${x.detail}</div>
      </div>`)}
      ${!v.items.length && html`<div class="dim small">No rule has been broken.</div>`}
    </div>`;
}

// ---- 5. links
function Links({ d }) {
  return html`
    <h2 class="sec">Read the source</h2>
    <div class="card links">
      <${Link} to=${doc("rules")}>The rules page <span class="dim">· ${d.rule_count} rules, each with its check</span></${Link}>
      <${Link} to=${doc("memory")}>The lead's memory index</${Link}>
      <div class="dim tiny">Each rule above opens its line with the owner's words. Desk cards, one line per agreement:</div>
      <div class="chips">${d.cards.map((c) => html`<${Link} to=${doc("card", c.key)}><span class="chip">${c.name}</span></${Link}>`)}</div>
    </div>`;
}

export function Coordination() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const j = await (await fetch("team-coord.json", { cache: "no-store" })).json();
        if (!live) return;
        if (j.error) setErr(j.error); else { setD(j); setErr(null); }
      } catch (e) { if (live) setErr("Cannot reach the studio."); }
    };
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => { live = false; clearInterval(t); };
  }, []);
  if (!d) return html`<p class="loading">${err || "Loading how the team talks…"}</p>`;
  return html`
    ${err && html`<div class="banner err"><b>Could not refresh.</b>${err}</div>`}
    <${Now} d=${d} />
    <${Flow} d=${d} />
    <${Checks} d=${d} />
    <${Violations} d=${d} />
    <${Links} d=${d} />
    <footer>Updates every 10 seconds. Read only. A day runs from 18:00 to 18:00 Mexico City.</footer>`;
}
