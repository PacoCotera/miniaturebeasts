// The client of the Caddy service (station-build.md §2.4), which M3 builds. Until then the service is
// offline: Grow will put its genome in `outbox` and the mibi wears the placeholder; nothing here is called
// in M1 beyond the status the developer panel shows.
export const BASE = "/caddy-api/v1";
export const state = { online: false, lastStatus: null, lastAt: 0 };
export async function status() {
  try { const r = await fetch(BASE + "/status", { cache: "no-store" }); if (!r.ok) throw new Error(r.status); state.lastStatus = await r.json(); state.online = true; }
  catch { state.online = false; state.lastStatus = null; }
  state.lastAt = Date.now(); return state;
}
export const queued = (st) => st.outbox.length;
