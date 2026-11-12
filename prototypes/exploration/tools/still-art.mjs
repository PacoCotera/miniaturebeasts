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

// The page draws a cell's stones, boulders, stump and plants from the baked tile set (a .mbtiles), not from the set's piece files, so the page-load list never names those pieces. This reads which sprites
// the cell's baked place uses (props, decals, canopy: kind numbers into the set's sprite list, canopy first, then props, then decals, as bakeset.mjs lays it out) and returns the set's piece file of each:
// { files: [{ slot: '<set>/<name>.png', file, swapped: false, baked: true }], noPieceFile: [names with no piece file of their own] }. A swap of that slot is honoured (the baked tile set is not rebaked: a swap there
// shows only in the list, and the sidecar says so with swapped: true and shippedSha256).
export async function bakedPieces(page, repoRoot, swaps = new Map(), setId = 'ninja-test') {
  const kinds = await page.evaluate(() => {
    const m = window.__mb; if (!m.S.exp || !m.S.exp.patch) return [];   // the map view has no walking place
    const lay = m.layout(m.S.exp.patch.key), pl = lay.baked.place, src = lay.cut || null, out = new Set();
    for (const p of (src ? src.props : pl.props)) out.add(p.kind);
    for (const p of pl.decals) out.add(p.kind);
    for (const p of (src ? src.canopy : pl.canopy)) out.add(p.kind);
    return [...out];
  });
  const dir = path.join(repoRoot, 'art/places/sets', setId), set = JSON.parse(readFileSync(path.join(dir, 'set.json'), 'utf8'));
  const order = [...Object.keys(set.canopy || {}), ...Object.keys(set.props || {}), ...Object.keys(set.decals || {})];
  const files = [], noPieceFile = [];
  for (const k of kinds.sort((a, b) => a - b)) {
    const name = order[k]; if (!name) continue;
    const shipped = path.join(dir, name + '.png'), slot = `${setId}/${name}.png`;
    if (!existsSync(shipped)) { noPieceFile.push(name); continue; }
    const swap = swaps.get(slot) || swaps.get(name + '.png');
    files.push({ slot, file: swap || shipped, shipped, swapped: !!swap, baked: true });
  }
  return { files, noPieceFile };
}

// files: [{ slot, file, swapped, shipped? }] -> the sidecar's file list, hashed now. A swapped slot also keeps the sha256 of the shipped piece it stands in for.
export function fileList(files) {
  return files.map((f) => ({ slot: f.slot, sha256: sha256File(f.file), swapped: !!f.swapped, ...(f.baked ? { baked: true } : {}), ...(f.swapped && f.shipped && existsSync(f.shipped) ? { shippedSha256: sha256File(f.shipped) } : {}) }))
    .sort((a, b) => (a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : 0));
}

// Writes `<still without .png>.json` beside the still; returns its path. info: { tool, zoom, light, files: [...], ...more }.
export function writeSidecar(stillPath, info) {
  const side = stillPath.replace(/\.png$/, '') + '.json';
  writeFileSync(side, JSON.stringify({ still: path.basename(stillPath), stillSha256: sha256File(stillPath), madeAt: new Date().toISOString(), ...info }, null, 2) + '\n');
  return side;
}
