#!/usr/bin/env node
// One bot game, in a process of its own (the Station modules keep state: one session a process). Boots the headless Station on a fresh world, then for each world turn: the stand-in
// Companion's trip (companion-stub.mjs), the Dock key, the policy's presses (at most `presses` a turn), the lift, and 20 minutes of Station time. It watches the game as it goes and prints one JSON
// line: the game's record (metrics.mjs turns records into the report).
//   node prototypes/playtest/bot-game.mjs '{"policy":"greedy","seed":1,"turns":30}'
import path from "node:path";
import { pathToFileURL } from "node:url";
import { boot } from "./engine.mjs";
import { legal, materials } from "./legal.mjs";
import { createStuck } from "./stuck.mjs";
import { createLog } from "./log.mjs";
import { POLICIES } from "./policies.mjs";
import { firstWorld, trip, mulberry32 } from "./companion-stub.mjs";

export const TURN_MINUTES = 20;   // Station time between two trips: a bud (5 or 20 minutes) made in one turn is ready by the next
class BudgetOut extends Error {}

export async function playGame({ policy: name, seed = 1, turns = 30, presses = 60, economy = "strict", logDir = null, face = "native" } = {}) {
  const policy = POLICIES[name]; if (!policy) throw new Error("no policy " + name);
  const s = await boot({ seed, face, save: firstWorld(seed), names: "en-short-1", settings: { economy } });
  const { G, UI } = s.game, S = s.S, settings = G.settings;
  const prng = mulberry32((seed * 2654435761) ^ 0x9e3779b9), tripRng = mulberry32(seed ^ 0x5bd1e995);
  const log = logDir ? createLog(path.join(logDir, `${name}-${seed}.jsonl`), { mode: "assisted", policy: name, seed, turns, face }) : null;
  const rec = { policy: name, seed, turns, economy, presses: 0, minutes: 0, firstHatch: null, firstElder: null, series: [], screens: {}, stuck: [], softLock: null, pods: { seen: {}, grown: 0, letGo: 0 }, hatched: 0, end: "done" };
  let turn = 0, turnPresses = 0, stuck = createStuck(), inRecovery = false, lastView = null, viewAt = -1, podIds = new Set(), budIds = null;
  const seenScreen = (k) => { rec.screens[k] = (rec.screens[k] ?? 0) + 1; };
  const view = () => { if (viewAt === rec.presses + rec.minutes) return lastView; const o = s.observeAssisted(); const L = legal(s); const m = materials(o); lastView = { o, L, mat: m ?? lastView?.mat ?? null }; viewAt = rec.presses + rec.minutes; return lastView; };
  const watch = (r) => {
    seenScreen(UI.screen); if (UI.screen === "pods" || UI.screen === "library" || UI.screen === "cargo") seenScreen(UI.screen + "." + (s.props()?.state ?? ""));
    const st = G.st;
    if (!rec.firstHatch && st.mibis.length) rec.firstHatch = { turn, press: rec.presses, minutes: rec.minutes };
    rec.hatched = Math.max(rec.hatched, st.mibis.length);
    const now = new Set([...st.tray, ...st.waiting].map((p) => p.id));
    for (const p of [...st.tray, ...st.waiting]) { const q = (rec.pods.seen[p.id] ??= { turn, read: 0, idd: 0 }); q.read = Math.max(q.read, p.read.length); q.idd = Math.max(q.idd, p.idd ? 1 : 0); }
    for (const id of podIds) if (!now.has(id)) { if (st.bud && st.bud.start !== budIds) rec.pods.grown++; else rec.pods.letGo++; rec.pods.seen[id].gone = true; }
    podIds = now; budIds = st.bud ? st.bud.start : budIds;
  };
  const press = (key, why = "") => {
    if (turnPresses >= presses) throw new BudgetOut();
    const before = s.events.length, obs = log ? s.observeAssisted() : null, r = s.press(key); turnPresses++; rec.presses++;
    if (log) log.step({ observation: obs, key: r.key, reason: why, hash: r.hash, changed: r.changed, turn });
    if (r.errors.length) (rec.faceErrors ??= []).push(...r.errors.map(String));
    watch(r);
    const hit = stuck.note(r.hash, s.events.slice(before));
    if (hit && !inRecovery) {
      rec.stuck.push({ turn, kind: hit.kind, screen: UI.screen, state: s.props()?.state ?? null, presses: rec.presses });
      inRecovery = true; const was = r.hash;
      for (const k of ["back", "back", "home"]) s.press(k);
      inRecovery = false; stuck = createStuck(); stuck.start(s.hash());
      if (s.hash() === was) { rec.softLock = { turn, screen: UI.screen, kind: hit.kind }; throw new Error("softlock"); }
    }
    return r;
  };
  const ctx = { press, view, wait: (m) => { s.wait(m); rec.minutes += m; return view(); }, rng: prng, state: {} };
  stuck.start(s.hash());
  try {
    for (turn = 1; turn <= turns; turn++) {
      turnPresses = 0;
      trip(s, tripRng, turn);
      if (!S.docked(G.st)) s.press("dock");
      try { policy.playTurn(ctx); } catch (e) { if (!(e instanceof BudgetOut)) throw e; }
      if (S.docked(G.st)) { s.press("dock"); if (S.docked(G.st)) rec.stuck.push({ turn, kind: "cannot-lift", screen: UI.screen, state: s.props()?.state ?? null, presses: rec.presses }); }
      s.wait(TURN_MINUTES); rec.minutes += TURN_MINUTES;
      const st = G.st, stages = st.mibis.filter((m) => !m.released).map((m) => S.mibiStage(st, m, settings));
      if (!rec.firstElder && stages.includes("elder")) rec.firstElder = { turn, press: rec.presses, minutes: rec.minutes };
      const pods = [...st.tray, ...st.waiting];
      rec.series.push({ turn, e: st.e, d: st.d, s: st.s, pods: pods.length, podsUnread: pods.filter((p) => !p.read.length).length, mibis: stages.length, elders: stages.filter((x) => x === "elder").length, bay: S.bayCrates(st, G.sv).length, rooms: st.rooms });
    }
  } catch (e) { if (e.message === "softlock") rec.end = "softlock"; else { rec.end = "error"; rec.error = String(e.stack ?? e).split("\n").slice(0, 3).join(" | "); } }
  rec.finished = rec.series.length;
  rec.pods.received = Object.keys(rec.pods.seen).length;
  rec.pods.neverRead = Object.values(rec.pods.seen).filter((p) => p.read === 0).length;
  rec.pods.heldEnd = G.st.tray.length + G.st.waiting.length;
  rec.pods.seen = undefined;
  rec.log = log?.file ?? null; log?.end({ reason: rec.end, presses: rec.presses });
  s.close();
  return rec;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rec = await playGame(JSON.parse(process.argv[2] ?? "{}"));
  process.stdout.write("\n@@game " + JSON.stringify(rec) + "\n");
  process.exit(0);
}
