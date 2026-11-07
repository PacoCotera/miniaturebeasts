// Temporary bake folders (/tmp/bake-a-*, bake-b-*, bake-c-*, ~200 MB each): made here so each is removed when its owner finishes, on an error, on exit and on Ctrl-C / SIGTERM / SIGHUP.
// MB_KEEP_BAKE=1 keeps them for debugging (the paths are printed to stderr).
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const live = new Set();
const keep = () => process.env.MB_KEEP_BAKE === "1";
export function removeBakeDir(dir) {
  if (!live.has(dir)) return;
  live.delete(dir);
  if (keep()) { process.stderr.write(`kept ${dir}\n`); return; }
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
}
const removeAll = () => { for (const d of [...live]) removeBakeDir(d); };
let armed = false;
function arm() {
  if (armed) return; armed = true;
  process.on("exit", removeAll);
  for (const [sig, code] of [["SIGINT", 130], ["SIGTERM", 143], ["SIGHUP", 129]]) process.on(sig, () => { removeAll(); process.exit(code); });
}
export function makeBakeDir(prefix) {
  arm();
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  live.add(dir);
  return dir;
}
// run fn(dir...) with fresh folders and remove them afterwards, also when fn throws
export function withBakeDirs(prefixes, fn) {
  const dirs = [];
  try { for (const p of prefixes) dirs.push(makeBakeDir(p)); return fn(...dirs); }
  finally { for (const d of dirs) removeBakeDir(d); }
}
