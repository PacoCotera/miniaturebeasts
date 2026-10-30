#!/usr/bin/env node
// Renders the Caddy's face in each of its states at 1× (792 × 272) as PNGs, from face.mjs exactly as the play page draws it, and prints one line per state.
//   node prototypes/caddy/tools/render-face.mjs --out <dir>
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { encodePNG } from "../../ui/png.mjs";
import { faceOf, rasterFace, W, H } from "../face.mjs";

const out = process.argv[process.argv.indexOf("--out") + 1];
if (!out || out.startsWith("--")) { console.error("usage: render-face.mjs --out <dir>"); process.exit(2); }
mkdirSync(out, { recursive: true });
const T0 = Date.parse("2026-10-30T14:05:00Z"), S = 1000;
const station = (o = {}) => ({ at: T0 + 30 * S, partner: "Moss", along: null, opened: null, crates: 2, ledger: { e: 41, d: 18, s: 7 }, ...o });
const seat = (at) => ({ companion: { state: "seated", seats: 3, at }, station: { state: "seated" } });
export const STATES = [
  ["C0", "Idle, out: the Companion lifted, out with its partner", { now: T0 + 40 * S, cradles: { companion: { state: "lifted", seats: 2, at: T0 }, station: { state: "seated" } }, station: station({ crates: 0 }) }],
  ["C1", "Seated, taking the hold: 1 s after the seat, no hold yet", { now: T0 + 32 * S, cradles: seat(T0 + 30 * S), station: station() }],
  ["C2", "Seated: the hold landed with two crates", { now: T0 + 32 * S, cradles: seat(T0 + 30 * S), hold: { seat: 3, crates: 2, left: 2 }, station: station() }],
  ["C3", "Done: both crates opened at the Station, three new pods, Fig goes along", { now: T0 + 90 * S, cradles: seat(T0 + 30 * S), hold: { seat: 3, crates: 2, left: 0 }, station: station({ at: T0 + 89 * S, opened: { crates: 2, newPods: 3 }, crates: 0, along: "Fig", ledger: { e: 47, d: 22, s: 11 } }) }],
  ["C4a", "Problem: the Companion silent, seated 10 s with no hold", { now: T0 + 41 * S, cradles: seat(T0 + 30 * S), station: station({ at: T0 + 40 * S }) }],
  ["C4b", "Problem: the Station quiet for 15 s, over C2", { now: T0 + 50 * S, cradles: seat(T0 + 30 * S), hold: { seat: 3, crates: 2, left: 2 }, station: station({ at: T0 + 34 * S }) }],
  ["C4c", "Problem: the Caddy fault, the service refused the write", { now: T0 + 31 * S, cradles: seat(T0 + 30 * S), station: station({ at: T0 + 30 * S }), fault: true }],
];
for (const [id, what, input] of STATES) {
  const f = faceOf({ tz: 0, bootAt: T0, who: { name: "Companion A" }, ...input }), px = rasterFace(f), rgba = new Uint8Array(W * H * 4);
  for (let i = 0; i < px.length; i++) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = px[i]; rgba[i * 4 + 3] = 255; }
  const file = `caddy-${id}.png`; writeFileSync(path.join(out, file), encodePNG(W, H, rgba));
  if (f.id !== id) throw new Error(`${id} rendered as ${f.id}`);
  console.log([file, what, [f.lines.l1, f.lines.l2, f.lines.l3].filter(Boolean).join(" · "), "stamp: " + f.lines.stamp, "lamp: " + f.lamp.companion].join(" | "));
}
