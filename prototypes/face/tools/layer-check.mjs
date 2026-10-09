#!/usr/bin/env node
// The art director's layer table on the real pictures, twice: the page's own drawing (today its adapter tags painted pictures by their asset policy) and the C words (pods-props into a second face, wordsCheck).
// At each of Pods' states the pixels outside the palette on pass 1 (chrome) and pass 2 (chrome and art) must read 0; painted pictures show only on pass 3. Prints one line per state; exits 1 on any other reading.
//   PW_DIR=/path/with/node_modules/playwright node prototypes/face/tools/layer-check.mjs   (after build.sh)
import { podsStates } from "./pods-states.mjs";

const { fails } = await podsStates(async (name, page, fail) => {
  const r = await page.evaluate(() => { const f = window.__st.face; const out = {}; for (const n of [1, 2]) { f.pass(n); out["pass" + n] = f.offPalette(); } f.pass(3); return out; });
  console.log(name.padEnd(34) + " chrome " + String(r.pass1).padStart(8) + " · chrome+art " + String(r.pass2).padStart(8));
  const w = await page.evaluate(() => window.__st.wordsCheck());   // the same state drawn by the C words from pods-props, on the page's own pictures
  console.log("  the C words".padEnd(34) + " chrome " + String(w.pass1).padStart(8) + " · chrome+art " + String(w.pass2).padStart(8) + (w.errors.length ? " · errors: " + w.errors.join("; ") : "") + (w.refused ? " · refused nodes: " + w.refused : ""));
  if (w.errors.length || w.refused) fail(name + " (words): " + w.errors.join("; ") + " refused " + w.refused);
  if (w.pass1 !== 0) fail(name + " (words): chrome reads " + w.pass1 + " off-palette pixels"); if (w.pass2 !== 0) fail(name + " (words): art reads " + w.pass2 + " off-palette pixels" + (w.offenders ? ", from " + w.offenders.slice(0, 8).map(([id, n]) => id + " " + n).join(", ") : ""));
  if (r.pass1 !== 0) fail(name + ": chrome reads " + r.pass1 + " off-palette pixels"); if (r.pass2 !== 0) fail(name + ": art reads " + r.pass2 + " off-palette pixels");
});
console.log(fails.length ? fails.length + " failure(s)" : "layer check ok"); process.exit(fails.length ? 1 : 0);
