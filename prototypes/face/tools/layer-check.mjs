#!/usr/bin/env node
// The art director's layer table on the real pictures: the Station page's own face, in test mode (?test), drawing Pods from pods-props. At each of Pods' states the pixels outside the palette on pass 1 (chrome)
// and pass 2 (chrome and art) must read 0; painted pictures show only on pass 3. Prints one line per state; exits 1 on any other reading.
//   PW_DIR=/path/with/node_modules/playwright node prototypes/face/tools/layer-check.mjs   (after build.sh)
import { podsStates } from "./pods-states.mjs";

const { fails } = await podsStates(async (name, page, fail) => {
  const r = await page.evaluate(() => window.__st.snapshot());
  console.log(name.padEnd(34) + " chrome " + String(r.pass1).padStart(8) + " · chrome+art " + String(r.pass2).padStart(8) + (r.errors.length ? " · errors: " + r.errors.join("; ") : "") + (r.refused ? " · refused nodes: " + r.refused : ""));
  if (r.errors.length || r.refused) fail(name + ": " + r.errors.join("; ") + " refused " + r.refused);
  if (r.pass1 !== 0) fail(name + ": chrome reads " + r.pass1 + " off-palette pixels"); if (r.pass2 !== 0) fail(name + ": art reads " + r.pass2 + " off-palette pixels");
});
console.log(fails.length ? fails.length + " failure(s)" : "layer check ok"); process.exit(fails.length ? 1 : 0);
