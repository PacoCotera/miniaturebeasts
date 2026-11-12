// Shared by the still tools (biome-stills.mjs, views-stills.mjs): the --swap and --both flags, and the sidecar written beside each still.
//   --swap slot=file   (repeatable) the still draws `file` in that art slot instead of the shipped one; the file is read where it lies, never copied into the game tree
//   --both             day and night for the walk or map still, on one call
// The sidecar `<still>.json` lists the sha256 of every art file drawn in the still, which slot each filled, the walking zoom, the light and the time it was made.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const sha256File = (file) => sha256(readFileSync(file));

// Takes --swap and --both out of argv; returns { rest, swaps: Map(slot -> absolute file), both }. A swap file that does not exist is an error.
export function takeFlags(argv) {
  const rest = [], swaps = new Map(); let both = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--both') both = true;
    else if (argv[i] === '--swap') {
      const v = argv[++i] || '', k = v.indexOf('=');
      if (k < 1 || k === v.length - 1) throw new Error(`--swap wants slot=file, got "${v}"`);
      const file = path.resolve(v.slice(k + 1));
      if (!existsSync(file)) throw new Error(`--swap file not found: ${file}`);
      swaps.set(v.slice(0, k), file);
    } else rest.push(argv[i]);
  }
  return { rest, swaps, both };
}

// files: [{ slot, file, swapped, shipped? }] -> the sidecar's file list, hashed now. A swapped slot also keeps the sha256 of the shipped piece it stands in for.
export function fileList(files) {
  return files.map((f) => ({ slot: f.slot, sha256: sha256File(f.file), swapped: !!f.swapped, ...(f.swapped && f.shipped && existsSync(f.shipped) ? { shippedSha256: sha256File(f.shipped) } : {}) }))
    .sort((a, b) => (a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : 0));
}

// Writes `<still without .png>.json` beside the still; returns its path. info: { tool, zoom, light, files: [...], ...more }.
export function writeSidecar(stillPath, info) {
  const side = stillPath.replace(/\.png$/, '') + '.json';
  writeFileSync(side, JSON.stringify({ still: path.basename(stillPath), stillSha256: sha256File(stillPath), madeAt: new Date().toISOString(), ...info }, null, 2) + '\n');
  return side;
}
