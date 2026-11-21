// `bytes` on every masters index entry: the size of its file on disk, so the page knows how much a screen's pictures weigh before they arrive (the boot progress, the budget).
// Every writer of index.json calls stampBytes just before it writes; `place-masters.mjs --check` refuses an entry without the right number.
import { statSync, existsSync } from "node:fs";
import path from "node:path";

export function stampBytes(root, index) {
  for (const e of Object.values(index.masters)) { const f = path.join(root, e.file); if (existsSync(f)) e.bytes = statSync(f).size; }
  return index;
}
export const bytesProblems = (root, index) => Object.entries(index.masters).flatMap(([id, e]) => {
  const f = path.join(root, e.file); if (!existsSync(f)) return [];
  return e.bytes === statSync(f).size ? [] : [`${id}: bytes is ${e.bytes ?? "missing"}, the file is ${statSync(f).size} (run place-masters.mjs --bytes)`];
});
