// The type specimens of chunk 1 (Loika S01, the snail S14): a frame (kinds and t, checked against the house at load: it holds no geometry), the
// species' look (colours, until chunk 4 makes them pigments) and the pose seed. specimens.json is the data.
import { readFileSync } from "node:fs";
import path from "node:path";
import { HERE } from "./paths.mjs";
import { checkFrame } from "../form/house/house.mjs";

export function loadSpecimens(house, file = path.join(HERE, "specimens.json")) {
  const raw = JSON.parse(readFileSync(file, "utf8")), out = {};
  for (const [id, s] of Object.entries(raw)) {
    const problems = checkFrame(s.frame, house);
    if (problems.length) throw new Error(`specimen ${id}: ${problems.join("; ")}`);
    out[id] = { id, plan: s.frame.plan, name: s.frame.name, kinds: s.frame.kinds, t: s.frame.t, pool: s.frame.pool, frame: s.frame, look: s.look, rig: s.rig ?? {}, seed: s.pose.seed, side: s.pose.side, pick: s.pose.pick };
  }
  return out;
}
