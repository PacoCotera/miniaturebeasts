// The bots' report (the plan, layer 1): the game records bot-game.mjs prints, turned into one JSON object (a row a game, a summary a policy) and a short markdown table. Only what the
// game already has is measured; what the specs build and the game does not yet is listed under NOT_MEASURABLE. The trips are the stand-in Companion's (companion-stub.mjs): what comes in
// is an assumption of the stub and the report says so; what the policies do with it, and what the Station does, is measured.
import { STUB } from "./companion-stub.mjs";
import { BUILT } from "../station/src/nav.mjs";

// the old Station's hold, as a line to count against (the design review's bot run 7: what would have been lost to the old 20)
export const OLD_CEILING = 20;
export const NOT_MEASURABLE = [
  { what: "Crosses beyond the first: crosses a trip, refusals by reason, the forecast against the draw, the line over time, samples", why: "breeding (the breeding design) is not built; the game has one cross from a pod (bot runs 3, 4, 5)" },
  { what: "The house and the manager: free places by turn, bonded share, tuck-away and bring-out", why: "the manager is not built (bot run 6)" },
  { what: "Pods in by source and out by exit (grown, let go, dried), turns held, Freshen", why: "the new Pods screens are not built; only grown and let go through today's screens are counted (bot run 2)" },
  { what: "Data per trip by source and the Watch share, trips that hit the ceiling", why: "the Companion is a stub, so the acts that pay Data are not played (bot run 1)" },
  { what: "Holdings with no cap: the time each pile is held and what the Companion's hold of 20 would have lost", why: "the Station already holds more than 20 (the report counts the share of turns over 20); how long each pile stays and what the Companion's own hold of 20 costs are not measured (bot run 7)" },
];

const sorted = (xs) => xs.slice().sort((a, b) => a - b);
export function median(xs) { if (!xs.length) return null; const s = sorted(xs), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
const sum = (xs) => xs.reduce((a, b) => a + b, 0), mean = (xs) => +(sum(xs) / xs.length).toFixed(2);
const spread = (xs) => (xs.length ? { min: Math.min(...xs), median: median(xs), max: Math.max(...xs) } : null);
const count = (xs, key) => { const o = {}; for (const x of xs) o[key(x)] = (o[key(x)] ?? 0) + 1; return o; };

// the first time something happened: the games that reached it, and when (the world turn, the Station minutes, the presses)
function milestone(games, field) {
  const hit = games.filter((g) => g[field]);
  return { reached: hit.length, of: games.length, turn: spread(hit.map((g) => g[field].turn)), minutes: spread(hit.map((g) => g[field].minutes)), presses: spread(hit.map((g) => g[field].press)) };
}
// what is held, turn by turn over the games still running at that turn, the most any game held, and the share of game-turns over the old 20
function held(games, key) {
  const turns = Math.max(0, ...games.map((g) => g.series.length)), all = games.flatMap((g) => g.series.map((x) => x[key]));
  const byTurn = Array.from({ length: turns }, (_, i) => { const v = games.filter((g) => g.series[i]).map((g) => g.series[i][key]); return { turn: i + 1, mean: mean(v), min: Math.min(...v), max: Math.max(...v) }; });
  return { byTurn, peak: all.length ? Math.max(...all) : 0, shareOver20: all.length ? +(all.filter((v) => v > OLD_CEILING).length / all.length).toFixed(3) : 0 };
}

// one policy's games, summed up
export function summarise(policy, games) {
  const rows = games.map((g) => ({ ...g, series: g.series ?? [] }));
  const events = rows.flatMap((g) => (g.stuck ?? []).map((e) => ({ ...e, seed: g.seed }))), pods = rows.map((g) => g.pods ?? {});
  const received = sum(pods.map((p) => p.received ?? 0)), neverRead = sum(pods.map((p) => p.neverRead ?? 0)), trips = sum(rows.map((g) => g.series.length || g.turns || 0));   // one trip a world turn
  const reached = [...new Set(rows.flatMap((g) => Object.keys(g.screens ?? {})))].sort();
  return {
    policy, games: rows.length, finished: rows.filter((g) => g.end === "done").length, crashed: rows.filter((g) => g.end === "error").map((g) => ({ seed: g.seed, error: g.error })),
    presses: spread(rows.map((g) => g.presses ?? 0)), hatched: spread(rows.map((g) => g.hatched ?? 0)),
    firstHatch: milestone(rows, "firstHatch"), firstElder: milestone(rows, "firstElder"),
    energy: held(rows, "e"), data: held(rows, "d"), essence: held(rows, "s"),
    pods: {
      received, trips, perTrip: trips ? +(received / trips).toFixed(2) : null, neverRead, neverReadShare: received ? +(neverRead / received).toFixed(3) : null, grown: sum(pods.map((p) => p.grown ?? 0)), letGo: sum(pods.map((p) => p.letGo ?? 0)),
      heldAtEnd: spread(pods.map((p) => p.heldEnd ?? 0)), heldPeak: Math.max(0, ...rows.flatMap((g) => g.series.map((x) => x.pods))),
    },
    stuck: {
      games: rows.filter((g) => (g.stuck ?? []).length).length, total: events.length, byKind: count(events, (e) => e.kind), byPlace: count(events, (e) => e.screen + (e.state ? "." + e.state : "")),
      softLocks: rows.filter((g) => g.softLock).map((g) => ({ seed: g.seed, ...g.softLock })),
    },
    screens: { reached, neverReached: BUILT.filter((s) => !reached.includes(s)) },
  };
}

// the whole report: a summary a policy, a row a game (without its per-turn series: the summary has the turns), what is not measurable yet
export function report(results, meta = {}) {
  const names = meta.policies ?? [...new Set(results.map((r) => r.policy))], policies = {};
  for (const n of names) policies[n] = summarise(n, results.filter((r) => r.policy === n));
  const reached = new Set(results.flatMap((r) => Object.keys(r.screens ?? {})));
  return {
    meta: { ...meta, turnMinutes: 20, trips: "stub", stub: STUB.note },
    policies,
    screensNeverReached: BUILT.filter((s) => !reached.has(s)),
    games: results.map(({ series, log, ...g }) => g),
    notMeasurable: NOT_MEASURABLE,
  };
}

const at = (m) => (m.reached ? `${m.turn.median} (${m.turn.min}–${m.turn.max}) · ${m.reached}/${m.of}` : `never · 0/${m.of}`);
const last = (h) => (h.byTurn.length ? `${h.byTurn.at(-1).mean} (peak ${h.peak})` : "-");
export function markdown(r) {
  const P = Object.values(r.policies), m = r.meta, L = [];
  L.push("# Bot runs", "", `${m.games ?? "?"} games a policy, ${m.turns} world turns each, up to ${m.presses} keys a turn, economy ${m.economy ?? "?"}, ${m.face ?? "native"} face. ${STUB.note}.`, "",
    "STUB: the trips are the stand-in Companion's, so what comes in is an assumption; what the policies do with it, and what the Station does, is measured. The world turn is one trip; between two turns 20 minutes of Station time pass.", "",
    "| policy | first hatch: turn median (range) · games | first elder | hatched at end (median) | Energy at end, mean (peak) | Data at end | Essence at end | pods held at end (median) · peak | pods never read | dead ends: games (events) | soft locks | crashed |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const p of P) L.push(`| ${p.policy} | ${at(p.firstHatch)} | ${at(p.firstElder)} | ${p.hatched?.median ?? "-"} | ${last(p.energy)} | ${last(p.data)} | ${last(p.essence)} | ${p.pods.heldAtEnd?.median ?? "-"} · ${p.pods.heldPeak} | ${p.pods.neverReadShare == null ? "-" : Math.round(p.pods.neverReadShare * 100) + "%"} | ${p.stuck.games}/${p.games} (${p.stuck.total}) | ${p.stuck.softLocks.length} | ${p.crashed.length} |`);
  L.push("");
  L.push("Pods received a trip (mean): " + P.map((p) => `${p.policy} ${p.pods.perTrip ?? "-"}`).join(", ") + ".", "");
  const places = {}; for (const p of P) for (const [k, v] of Object.entries(p.stuck.byPlace)) places[k] = (places[k] ?? 0) + v;
  L.push("Dead ends (the stuck detector) by place: " + (Object.keys(places).length ? Object.entries(places).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ") : "none") + ".", "");
  L.push("Share of game-turns holding more than 20 (the old hold): " + P.map((p) => `${p.policy} Energy ${Math.round(p.energy.shareOver20 * 100)}%, Data ${Math.round(p.data.shareOver20 * 100)}%, Essence ${Math.round(p.essence.shareOver20 * 100)}%`).join("; ") + ".", "");
  L.push("Screens never reached by any bot: " + (r.screensNeverReached.length ? r.screensNeverReached.join(", ") : "none") + ".", "");
  L.push("Energy, Essence and Data held turn by turn (mean, min, max over the games) are in the JSON under `policies.*.energy|data|essence.byTurn`.", "", "Not measurable yet:", "", ...r.notMeasurable.map((x) => `- ${x.what}: ${x.why}`), "");
  return L.join("\n");
}
