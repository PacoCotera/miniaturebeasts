// The client of the Caddy service (station-build.md §2.4): at Grow the genome joins the outbox and goes to
// the service when it answers; the page polls its world's jobs every thirty seconds while any mibi waits
// and on waking; a finished set is fetched and swapped in at the next fresh draw of that mibi (a screen
// change or waking), never while it is on screen. Unreachable, Grow still works: the genome waits in the
// outbox and the lamp says "waiting for the cloud".
import { G, UI, save, onScreenChange } from "./game.mjs";
import * as S from "./state.mjs";

export const BASE = "/caddy-api/v1";
export const POLL_MS = 30000;
export const state = { online: null, lastAt: 0, lastStatus: null, pending: new Map(), landed: new Map(), error: null };
const wid = () => G.st.wid || "no-world";
const waiting = (m) => !m.released && (!m.paint || ["queued", "painting", "capped", "sent"].includes(m.paint.state));
export const anyWaiting = () => G.st.outbox.length > 0 || G.st.mibis.some(waiting) || (G.st.bud && (!G.st.bud.paint || G.st.bud.paint.state !== "done"));
// The lamp's word for a mibi: null (its painting landed or failed for good), "waiting for the cloud" (offline or painter off), or "its painting is on its way".
export function lampText(m) {
  if (!m.paint && !G.st.outbox.some((o) => o.sha === m.sha)) return m.paint?.state === "failed" ? null : "its painting is on its way";
  if (m.paint?.state === "landed" || m.paint?.state === "failed") return null;
  if (state.online === false || G.settings.painter === "off") return "waiting for the cloud";
  if (m.paint?.state === "capped") return "its painting waits for tomorrow";
  return "its painting is on its way";
}
async function api(path, init) {
  const r = await fetch(BASE + path, { cache: "no-store", ...init });
  if (r.status >= 500) { state.online = false; state.error = "the service answered " + r.status; throw new Error(state.error); }   // the proxy is up, the service is not
  const body = await r.json().catch(() => ({}));
  state.online = true; state.lastAt = Date.now(); state.error = null;
  return { status: r.status, body };
}
export async function status() {
  try { const r = await api("/status"); state.lastStatus = r.body; state.error = null; } catch (e) { state.online = false; state.lastStatus = null; state.error = e.message; }
  return state;
}
// The outbox: every genome not yet handed over goes, one call each; a refusal (a 4xx) drops the entry and marks the mibi failed.
export async function flush() {
  if (G.settings.painter === "off" || !G.st.outbox.length) return;
  for (const o of [...G.st.outbox]) {
    try {
      const r = await api("/grow", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ world: wid(), genome: o.genome, cap: G.settings.growCap, painter: G.settings.painter }) });
      if (r.status >= 500) continue;
      G.st.outbox = G.st.outbox.filter((x) => x !== o);
      const paint = r.status === 400 ? { state: "failed", sha: o.sha, at: Date.now(), error: r.body.error } : { state: r.body.state === "done" ? "done" : "sent", sha: o.sha, at: Date.now(), job: r.body.job?.id ?? null, set: r.body.set ?? null };
      for (const m of G.st.mibis) if (m.sha === o.sha) m.paint = paint;
      if (G.st.bud && G.st.bud.sha === o.sha) G.st.bud.paint = paint;
      if (paint.state === "done") queueFetch(o.species, o.sha, paint.set);
    } catch (e) { state.online = false; state.error = e.message; return; }
  }
  save();
}
export async function poll() {
  if (!anyWaiting() && !state.pending.size) return;
  await flush();
  if (G.settings.painter === "off") return;
  try {
    const r = await api("/jobs?world=" + encodeURIComponent(wid()));
    let changed = false;
    for (const j of r.body.jobs || []) {
      for (const m of G.st.mibis.concat(G.st.bud ? [G.st.bud] : [])) {
        if (m.sha !== j.sha || m.paint?.state === "landed") continue;
        if (!m.paint) { m.paint = { state: "sent", sha: m.sha, at: Date.now() }; changed = true; }   // a mibi whose hand-off the save missed
        const was = m.paint.state;
        if (j.state === "done") { if (m.paint.state !== "done") { m.paint = { ...m.paint, state: "done", set: j.set, painter: j.painter, at: Date.now() }; changed = true; } queueFetch(j.species, j.sha, j.set); }
        else if (j.state === "failed") { if (was !== "failed") { m.paint = { ...m.paint, state: "failed", error: j.error, at: Date.now() }; changed = true; } }
        else if (["queued", "painting", "capped"].includes(j.state) && was !== j.state) { m.paint = { ...m.paint, state: j.state, error: j.error }; changed = true; }
      }
    }
    if (changed) save();
  } catch (e) { state.online = false; state.error = e.message; }
}
// Fetch a finished set's images into `pending`; they land on the next fresh draw.
const fetching = new Set();
function queueFetch(species, sha, set) {
  if (state.landed.has(sha) || state.pending.has(sha) || fetching.has(sha)) return;
  fetching.add(sha);
  const base = set || `${BASE}/sets/${species}/${sha.slice(0, 16)}/`;
  Promise.all(["station-portrait-300x310.png", "companion-280x300.png", "token-48.png"].map((f) => loadImage(base + f).catch(() => null)))
    .then(([portrait, companion, token]) => { if (portrait) state.pending.set(sha, { portrait, companion, token, at: Date.now() }); })
    .finally(() => fetching.delete(sha));
}
function loadImage(url) { return new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => reject(new Error("no image " + url)); im.src = url + (url.includes("?") ? "&" : "?") + "v=" + Math.floor(Date.now() / 60000); }); }
// The landing: a pending set becomes this mibi's look (a screen change, waking, coming home), never mid-draw.
export function land() {
  if (!state.pending.size) return 0;
  let n = 0;
  for (const [sha, imgs] of [...state.pending]) {
    state.landed.set(sha, imgs); state.pending.delete(sha); n++;
    for (const m of G.st.mibis) if (m.sha === sha) m.paint = { ...(m.paint || {}), state: "landed", at: Date.now() };
    if (G.st.bud && G.st.bud.sha === sha) G.st.bud.paint = { ...(G.st.bud.paint || {}), state: "landed", at: Date.now() };
  }
  if (n) save();
  return n;
}
// A landed set's images for a mibi, or null while it wears the placeholder. A set landed in an earlier session is fetched again on sight.
export function landedSet(m) {
  if (!m || !m.sha) return null;
  const imgs = state.landed.get(m.sha); if (imgs) return imgs;
  if (m.paint?.state === "landed" && !state.pending.has(m.sha)) { queueFetch(m.species, m.sha, m.paint.set); if (state.pending.has(m.sha)) { const p = state.pending.get(m.sha); state.landed.set(m.sha, p); state.pending.delete(m.sha); return p; } }
  return null;
}
let timer = null;
export function startClient() {
  onScreenChange(() => land());
  const tick = () => { poll().catch(() => {}); };
  timer = setInterval(tick, POLL_MS);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { land(); tick(); } });
  status().then(tick);
  return timer;
}
export const wake = () => { land(); poll().catch(() => {}); };
export const queued = (st) => st.outbox.length;
