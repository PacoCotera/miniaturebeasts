// One run: a player (a function from what it can see to a key and a one-line reason) plays a session for up to `presses` keys. Every press is logged (log.mjs), the stuck detector
// (stuck.mjs) can end the run, and the first time the run meets a screen whose hash no run has rendered, its PNG is written once into the checkpoint folder (named by the hash,
// so the same frame is never rendered twice, across players and runs; `renders` caps how many a run makes).
//   const r = await play(session, { player: ({ observation, changed, keys }) => ({ key: "right", reason: "look around" }), log: "runs/a.jsonl", checkpoints: "frames/" })
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createLog } from "./log.mjs";
import { createStuck } from "./stuck.mjs";

export async function play(session, { player, presses = 150, log, checkpoints = null, renders = Infinity, header = {}, mode = "assisted", stuck: stuckOpts } = {}) {
  const L = createLog(log, { mode, presses, face: session.kind, ...header }), stuck = createStuck(stuckOpts), rendered = [];
  if (checkpoints) mkdirSync(checkpoints, { recursive: true });
  const checkpoint = (hash) => { if (!checkpoints) return null; const f = path.join(checkpoints, hash + ".png"); if (existsSync(f) || rendered.length >= renders) return null; session.render(f); rendered.push(f); return f; };
  let hash = session.hash(); stuck.start(hash); const first = checkpoint(hash);
  let observation = mode === "assisted" ? session.observeAssisted() : null, changed = ["the screen appeared"], end = null, n = 0;
  const t0 = process.hrtime.bigint();
  for (; n < presses; n++) {
    const { key, reason = null } = await player({ observation, changed, keys: session.keys(), step: n, hash, png: n === 0 ? first : null });
    const before = session.events.length, r = session.press(key);
    const events = session.events.slice(before), png = checkpoint(r.hash);
    L.step({ observation, key: r.key, reason, hash: r.hash, changed: r.changed, events, ...(png ? { png: path.basename(png) } : {}), ...(r.errors.length ? { errors: r.errors } : {}), ...(r.settled ? {} : { settled: false }) });
    hash = r.hash; changed = r.changed; observation = mode === "assisted" ? session.observeAssisted() : null;
    const s = stuck.note(r.hash, events);
    if (s) { end = { reason: "stuck", ...s }; n++; break; }
  }
  const seconds = Number(process.hrtime.bigint() - t0) / 1e9;
  L.end({ ...(end ?? { reason: "done" }), screens: stuck.seen, rendered: rendered.length, seconds: +seconds.toFixed(2) });
  return { presses: n, end: end ?? { reason: "done" }, screens: stuck.seen, rendered, log: L.file, seconds };
}
