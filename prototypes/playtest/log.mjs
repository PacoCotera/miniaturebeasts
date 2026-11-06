// The run's log (the playtest plan): one JSON line per press, appended as it happens, so a run cut short keeps what it did. Each line holds the observation the player had, the key
// it pressed, its reason (the model player's one line; a bot's policy name), the hash after the press and the time. The first line is the run's header, the last its end (or "stuck").
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { realIso } from "./shims.mjs";

export function createLog(file, header = {}) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, "");
  let n = 0;
  const line = (o) => { appendFileSync(file, JSON.stringify(o) + "\n"); };
  line({ t: "run", at: realIso(), ...header });
  return {
    file,
    // one press: { observation, key, reason, hash, ...more }
    step({ observation, key, reason = null, hash, ...more }) { line({ t: "step", n: ++n, at: realIso(), observation, key, reason, hash, ...more }); return n; },
    end(record = {}) { line({ t: "end", at: realIso(), steps: n, ...record }); },
    get steps() { return n; },
  };
}
