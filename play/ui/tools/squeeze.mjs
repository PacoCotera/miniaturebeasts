// Lossless squeeze of the placed masters with oxipng (the station-load plan, P7a): the same pixels in fewer bytes, so every master's `sha256` (provenance.json) and `?v=` change and its `bytes` fall.
// oxipng is the project's PNG optimizer (https://github.com/oxipng/oxipng), run as a program: put it on PATH, or name it in $OXIPNG. Settings are fixed here so every run gives the same files:
// `-o 4 --strip safe` (no `--alpha`, which would change the colour under clear pixels). Each file's decoded pixels are compared with the original's after the run; a file that differs is put back and reported.
// A master squeezed is marked in provenance.json (`squeezed`), so placing it again from its source (which is not squeezed) squeezes it again and nothing else is touched.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { decodePNG } from "../png.mjs";
import { createHash } from "node:crypto";

export const SQUEEZE_MARK = "oxipng 10.2.1 -o 4 --strip safe";
const pixels = (buf) => { try { return decodePNG(buf); } catch { return null; } };   // null: a PNG the page cannot read (only 8-bit, indexed 1 to 8 bits with tRNS, no colour-key tRNS)
const same = (a, b) => !!a && !!b && a.width === b.width && a.height === b.height && Buffer.compare(Buffer.from(a.data), Buffer.from(b.data)) === 0;
export const version = (bin = process.env.OXIPNG || "oxipng") => execFileSync(bin, ["--version"], { encoding: "utf8" }).trim();

// root + index (whole entries, from readIndex): squeeze every entry that is not marked, in batches; returns { done, before, after, refused: [ids] }
export function squeezeIndex(root, index, { bin = process.env.OXIPNG || "oxipng", batch = 200, log = () => {} } = {}) {
  if (version(bin) !== "oxipng 10.2.1") throw new Error(`oxipng 10.2.1 is needed (found ${version(bin)}): the mark in provenance.json names it`);
  const todo = Object.entries(index.masters).filter(([, e]) => e.squeezed !== SQUEEZE_MARK && e.status !== "empty"), out = { done: 0, before: 0, after: 0, refused: [] };
  for (let i = 0; i < todo.length; i += batch) {
    const part = todo.slice(i, i + batch).map(([id, e]) => ({ id, e, file: path.join(root, e.file) }));
    for (const p of part) p.old = readFileSync(p.file);
    execFileSync(bin, ["-o", "4", "--strip", "safe", "-q", ...part.map((p) => p.file)], { stdio: ["ignore", "inherit", "inherit"] });
    for (const p of part) {
      const now = readFileSync(p.file);
      if (now.length > p.old.length || !same(pixels(p.old), pixels(now))) { writeFileSync(p.file, p.old); out.refused.push(p.id); p.e.squeezed = SQUEEZE_MARK; out.before += p.old.length; out.after += p.old.length; continue; }
      p.e.sha256 = createHash("sha256").update(now).digest("hex"); p.e.squeezed = SQUEEZE_MARK; out.done++; out.before += p.old.length; out.after += now.length;
    }
    log(`${Math.min(i + batch, todo.length)}/${todo.length}`);
  }
  return out;
}
