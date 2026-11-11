// prepare-set: a licensed source kit + a recipe -> a tile set in the contract (place design A3.3).
//   node prepare-set.mjs <recipe.json> --tilesets <dir holding the kits, e.g. research/tilesets> [--out <dir>] [--check]
// Writes set.json (the terrain layers and tone), palette.json, the desk's layer sheets (tools/desk-art.mjs), sprites.png, LICENCE.md and SOURCE.md. The output is deterministic. --check compares the pixels with what is already in the out folder.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng, decodePng, encodePng, crop, paste, newImage } from '../src/png.mjs';
import { computeTables, family, STONE_TONES, TABLE_NAMES } from '../src/lighttables.mjs';
import { deskArt, deskLayers } from './desk-art.mjs';
import { PALETTE } from './recolour.mjs';

export const SOURCE_ALLOW = ['ninja-adventure', 'puny-world', 'happyland-wang'];
export const PALETTE_MAX = 208;       // indices 48..255; 0..47 are the core palette
export const CORE_COLOURS = 48;
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');

// Source paths are relative to the kits folder and must start at an allowed kit. The Zelda-like set (ArMM1998) is never imported.
export function checkSourcePath(rel) {
  if (typeof rel !== 'string' || rel === '') throw new Error('source path is empty');
  const norm = path.posix.normalize(rel.replaceAll('\\', '/'));
  const parts = norm.split('/');
  if (norm.startsWith('/') || parts.includes('..')) throw new Error(`source path "${rel}" leaves the kits folder`);
  if (parts.some((p) => /zelda|armm/i.test(p))) throw new Error(`source path "${rel}" names the Zelda-like set, which is never imported`);
  if (!SOURCE_ALLOW.includes(parts[0])) throw new Error(`source path "${rel}" is outside the allow-list (${SOURCE_ALLOW.join(', ')})`);
  return norm;
}

const hex = (r, g, b) => [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
const unhex = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];

function keyOut(img, key) {
  if (!key) return img;
  const [kr, kg, kb] = unhex(key);
  const out = { w: img.w, h: img.h, data: new Uint8Array(img.data) };
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i] === kr && out.data[i + 1] === kg && out.data[i + 2] === kb) out.data[i + 3] = 0;
  }
  return out;
}

// The merge list: Map(from rgb int -> to rgb int) from a { merged: [{ from: '#rrggbb', to: '#rrggbb' }] } file.
export function loadMerge(file) {
  const rgb = (h) => parseInt(h.replace('#', ''), 16);
  const map = new Map();
  for (const { from, to } of JSON.parse(readFileSync(file, 'utf8')).merged) {
    if (map.has(rgb(to))) throw new Error(`palette merge: ${to} is both a target and a merged-away colour`);
    map.set(rgb(from), rgb(to));
  }
  return map;
}
// The image with every merged colour replaced, or null when it holds none (alpha is not touched).
export function mergeColours(img, map) {
  let out = null;
  for (let i = 0; i < img.data.length; i += 4) {
    if (!img.data[i + 3]) continue;
    const t = map.get((img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2]);
    if (t === undefined) continue;
    if (!out) out = { w: img.w, h: img.h, data: new Uint8Array(img.data) };
    out.data[i] = t >> 16; out.data[i + 1] = (t >> 8) & 255; out.data[i + 2] = t & 255;
  }
  return out;
}

function shelfPack(items, width) { // items: [{name, w, h}] -> positions; deterministic
  const order = [...items].sort((a, b) => b.h - a.h || a.name.localeCompare(b.name));
  let x = 0, y = 0, rowH = 0;
  const pos = {};
  for (const it of order) {
    if (it.w > width) throw new Error(`sprite ${it.name} is wider than the sheet`);
    if (x + it.w > width) { x = 0; y += rowH + 1; rowH = 0; }
    pos[it.name] = [x, y];
    x += it.w + 1; rowH = Math.max(rowH, it.h);
  }
  return { pos, height: y + rowH };
}

// compact JSON: arrays of numbers and of number arrays on one line
export function fmtJson(v, ind = '') {
  const flat = (a) => Array.isArray(a) && a.every((e) => typeof e === 'number' || typeof e === 'string' || (Array.isArray(e) && e.every((n) => typeof n === 'number')));
  if (flat(v)) return JSON.stringify(v).replaceAll('],[', '], [').replaceAll(',', ', ').replaceAll('"', '"');
  if (Array.isArray(v)) return v.length ? '[\n' + v.map((e) => ind + '  ' + fmtJson(e, ind + '  ')).join(',\n') + '\n' + ind + ']' : '[]';
  if (v && typeof v === 'object') {
    const ks = Object.keys(v);
    return ks.length ? '{\n' + ks.map((k) => `${ind}  ${JSON.stringify(k)}: ${fmtJson(v[k], ind + '  ')}`).join(',\n') + '\n' + ind + '}' : '{}';
  }
  return JSON.stringify(v);
}

// Returns Map(fileName -> Buffer) for the set folder.
export function prepareSet(recipe, { tilesetsRoot, repoRoot: root = repoRoot }) {
  const t = recipe.sourceTile;
  if (t * recipe.scale !== 48) throw new Error(`sourceTile ${t} x scale ${recipe.scale} is not 48`);
  const files = new Map();
  const images = new Map(); // file name -> image, every RGBA PNG written
  const cache = new Map();
  const load = (key) => {
    if (!cache.has(key)) {
      const rel = checkSourcePath(recipe.sources[key]);
      cache.set(key, readPng(path.join(tilesetsRoot, rel)));
    }
    return cache.get(key);
  };

  // the art desk's terrain layers and meadow decor (`desk`), read from the pinned desk commits: the layer sheets (fills, overs, cliff faces, reed look, tone) and the small decals for the sprite sheet
  let desk = null, deskTerrain = null;
  if (recipe.desk) {
    desk = deskArt();
    deskTerrain = deskLayers();   // the terrain layers: fills, over sheets, the reed look and the tone layer
    // the art director's palette merge (recipe `paletteMerge`): every picture the desk gives, a colour of the list's `from` becomes its `to`, pixel for pixel; DESK.json records the hash of the file as placed
    if (recipe.paletteMerge) {
      const map = loadMerge(path.join(root, recipe.paletteMerge));
      const mergeFiles = (files, record) => { for (const [n, b] of files) { if (!n.endsWith('.png')) continue; const m = mergeColours(decodePng(b), map); if (!m) continue; const nb = Buffer.from(encodePng(m)); files.set(n, nb); if (record[n]) { record[n].sha256 = createHash('sha256').update(nb).digest('hex'); record[n].merged = true; } } };
      mergeFiles(desk.files, desk.desk);
      mergeFiles(deskTerrain.files, deskTerrain.desk);
      for (const [n, im] of deskTerrain.images) { const m = mergeColours(im, map); if (m) deskTerrain.images.set(n, m); }
      for (const g of [desk.props, desk.canopy, desk.decals]) for (const d of Object.values(g)) { const m = mergeColours(d.image, map); if (m) d.image = m; }
    }
    for (const [n, im] of deskTerrain.images) images.set(n, im);
  }

  // sprites
  const items = [];
  // a desk piece replaces the recipe's kit sprite of the same name (the names stay, so places and the generator are unchanged)
  const fromDesk = (o) => Object.fromEntries(Object.entries(o || {}).map(([n, d]) => [n, { ...d, rect: [0, 0, d.image.w, d.image.h] }]));
  const groups = { props: { ...(recipe.props || {}), ...fromDesk(desk && desk.props) }, decals: { ...(recipe.decals || {}), ...fromDesk(desk && desk.decals) }, canopy: { ...(recipe.canopy || {}), ...fromDesk(desk && desk.canopy) } };
  const spriteImg = {};
  for (const [g, defs] of Object.entries(groups)) {
    for (const [name, d] of Object.entries(defs)) {
      const frames = d.frames || 1;
      const [x, y, w, h] = d.rect;
      const strip = newImage(w * frames, h);
      for (let k = 0; k < frames; k++) paste(strip, d.image ? d.image : keyOut(crop(load(d.sheet), x + k * w, y, w, h), d.key), k * w, 0);
      spriteImg[`${g}/${name}`] = strip;
      items.push({ name: `${g}/${name}`, w: strip.w, h: strip.h });
    }
  }
  const packed = shelfPack(items, 256);
  const sheet = newImage(256, packed.height);
  const setSprites = { props: {}, decals: {}, canopy: {} };
  for (const [g, defs] of Object.entries(groups)) {
    for (const [name, d] of Object.entries(defs)) {
      const [px, py] = packed.pos[`${g}/${name}`];
      paste(sheet, spriteImg[`${g}/${name}`], px, py);
      const e = { rect: [px, py, d.rect[2], d.rect[3]], anchor: d.anchor };
      if (d.frames && d.frames > 1) { e.frames = d.frames; e.frameMs = d.frameMs; }
      if (g === 'props') { e.footprint = d.footprint || []; if (d.canopy) e.canopy = d.canopy; }
      setSprites[g][name] = e;
    }
  }
  images.set('sprites.png', sheet);

  // palette: exact colours of every pixel written, none with partial alpha
  const colours = new Set();
  for (const [name, img] of images) {
    for (let i = 0; i < img.data.length; i += 4) {
      const a = img.data[i + 3];
      if (a === 0) continue;
      if (a !== 255) throw new Error(`${name}: partial alpha (${a}); the contract is alpha 0 or 255`);
      colours.add(hex(img.data[i], img.data[i + 1], img.data[i + 2]));
    }
  }
  const lum = (h) => { const [r, g, b] = unhex(h); return 0.299 * r + 0.587 * g + 0.114 * b; };
  let sorted = [...colours].sort((a, b) => lum(a) - lum(b) || (a < b ? -1 : 1));
  if (recipe.palettePin) {   // indices already promised to the art desk's light tables (the range haze is keyed to the kit's 43, then the open edges' 7): they keep their slots, new colours follow
    const pin = recipe.palettePin.map((c) => c.replace('#', ''));
    sorted = [...pin, ...sorted.filter((c) => !pin.includes(c))];
  }
  if (sorted.length > PALETTE_MAX) {
    throw new Error(`the source has ${sorted.length} colours, over the ${PALETTE_MAX} the contract allows; add the pinned pngquant step to the recipe`);
  }
  const core = JSON.parse(readFileSync(path.join(root, recipe.corePalette), 'utf8')).entries.slice(0, CORE_COLOURS).map((e) => unhex(e.hex.slice(1)));
  // the night table keeps each colour in its hue family (lighttables computeTables): the sunlit tone goes to a green a touch lighter than the night grass; the grass over sheets share that colour, which is grass too
  const toneImg = images.get(deskTerrain && deskTerrain.tone ? deskTerrain.tone.sheets[0] : '');
  const toneColours = new Set();
  if (toneImg) for (let i = 0; i < toneImg.data.length; i += 4) if (toneImg.data[i + 3]) toneColours.add(hex(toneImg.data[i], toneImg.data[i + 1], toneImg.data[i + 2]));
  const tone = sorted.map((c, k) => (toneColours.has(c) ? CORE_COLOURS + k : -1)).filter((i) => i >= 0);
  const fillImg = images.get('fill-grass.png');
  const ground = [], count = new Map();   // the grass fill's commonest colour is the plain grass
  if (fillImg) for (let i = 0; i < fillImg.data.length; i += 4) { const k = sorted.indexOf(hex(fillImg.data[i], fillImg.data[i + 1], fillImg.data[i + 2])); if (fillImg.data[i + 3] && k >= 0) count.set(CORE_COLOURS + k, (count.get(CORE_COLOURS + k) || 0) + 1); }
  if (count.size) ground.push([...count].sort((a, b) => b[1] - a[1])[0][0]);
  // the leaf ramp of the tree crowns, bushes and shrubs (the map palette's leaf_hi, leaf, leaf_dk, leaf_line): at night no lighter than the grass
  const crowns = ['leaf_hi', 'leaf', 'leaf_dk', 'leaf_line'].map((n) => sorted.indexOf(PALETTE.map[n][1].slice(1))).filter((k) => k >= 0).map((k) => CORE_COLOURS + k);
  // the stone ramp (rock_hi, rock, rock_dk, rock_line and the cliff's three stone steps): at night all dark grey
  // plus every colour the rock, boulder and split-stone pictures hold (rock-a, rock-b and rock-big are the boulders), outlines and base lines included, but not the moss and leaves (green) or the sand-yellow earth highlight the terrain shares
  const stoneHex = [...['rock_hi', 'rock', 'rock_dk', 'rock_line'].map((n) => PALETTE.map[n][1]), ...['cliff_stone_hi', 'cliff_stone', 'cliff_stone_dk'].map((n) => PALETTE.extra[n][1])];
  const shared = new Set(['earth_hi'].map((n) => PALETTE.map[n][1].slice(1)));
  if (desk) for (const f of ['rock-a.png', 'rock-b.png', 'rock-big.png', 'split-stone.png']) { const im = decodePng(desk.files.get(f)); for (let i = 0; i < im.data.length; i += 4) { if (!im.data[i + 3]) continue; const h = hex(im.data[i], im.data[i + 1], im.data[i + 2]); if (!shared.has(h) && family(unhex(h)) !== 'green') stoneHex.push('#' + h); } }
  const stone = [...new Set(stoneHex.map((h) => sorted.indexOf(h.slice(1))).filter((k) => k >= 0).map((k) => CORE_COLOURS + k))];
  // the signed grey body in three steps: the two lightest greys of the boulder pictures take the highlight step, the darkest (the outlines) the line step, the rest the body step
  const deskGrey = new Set();
  if (desk) for (const f of ['rock-a.png', 'rock-b.png', 'rock-big.png']) { const im = decodePng(desk.files.get(f)); for (let i = 0; i < im.data.length; i += 4) if (im.data[i + 3]) deskGrey.add(hex(im.data[i], im.data[i + 1], im.data[i + 2])); }
  const greyIdx = (pred) => [...deskGrey].filter((h) => stone.includes(CORE_COLOURS + sorted.indexOf(h)) && pred(lum(h))).map((h) => CORE_COLOURS + sorted.indexOf(h));
  const stoneHi = greyIdx((l) => l >= 160), stoneLine = greyIdx((l) => l < 70);
  // the bank earth: the thin earth band at the water's edge (the sand and earth sheets' edge tone, #d2b06f by day). At night the nearest-colour step sent it to #664330, which reads rust red (art director 2026-11-11):
  // it takes the darkest low-saturation brown the palette has (hue 25 to 35 degrees, saturation at most 0.5, the trunk browns' family) instead. A table entry only, no sheet is repainted.
  const BANK_EARTH = 'd2b06f';
  const hue = (h) => { const [r, g, b] = unhex(h), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn || 1; const x = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return x * 60; };
  const satOf = (h) => { const c = unhex(h); return (Math.max(...c) - Math.min(...c)) / Math.max(...c, 1); };
  const trunkBrowns = sorted.filter((h) => hue(h) >= 25 && hue(h) <= 35 && satOf(h) <= 0.5).sort((a, b) => lum(a) - lum(b));
  const bank = sorted.indexOf(BANK_EARTH) >= 0 ? [CORE_COLOURS + sorted.indexOf(BANK_EARTH)] : [];
  const bankTo = trunkBrowns.length ? CORE_COLOURS + sorted.indexOf(trunkBrowns[0]) : -1;
  // the tree trunk's browns (every colour of the signed trunk piece): at night they too take the bank's low-saturation brown, not the nearest colour (a rust red, art director 2026-11-11)
  const trunk = [];
  if (desk && desk.files.get('tree-trunk.png')) { const im = decodePng(desk.files.get('tree-trunk.png')); for (let i = 0; i < im.data.length; i += 4) if (im.data[i + 3]) { const k = sorted.indexOf(hex(im.data[i], im.data[i + 1], im.data[i + 2])); if (k >= 0 && !trunk.includes(CORE_COLOURS + k)) trunk.push(CORE_COLOURS + k); } }
  // the water ripple's glints (the colours of the water fill that are not its base, darker first): at night a cool pale grey-blue of the set (blue over green over red, low saturation, mid-light), the two lightest steps of that run, never the pink or mauve the nearest-colour step gave
  const waterImg = images.get('fill-water.png'), waterCount = new Map();
  if (waterImg) for (let i = 0; i < waterImg.data.length; i += 4) if (waterImg.data[i + 3]) { const h = hex(waterImg.data[i], waterImg.data[i + 1], waterImg.data[i + 2]); waterCount.set(h, (waterCount.get(h) || 0) + 1); }
  const waterBase = [...waterCount].sort((a, b) => b[1] - a[1])[0];
  const glint = [...waterCount.keys()].filter((h) => h !== (waterBase && waterBase[0])).sort((a, b) => lum(a) - lum(b)).map((h) => CORE_COLOURS + sorted.indexOf(h));
  const isStoneTone = (h) => Object.values(STONE_TONES).some((t) => Object.values(t).some((v) => hex(v[0], v[1], v[2]) === h));
  const coolPale = sorted.filter((h) => { const [r, g, b] = unhex(h); return !isStoneTone(h) && b >= r + 12 && g >= r + 4 && g <= b && satOf(h) <= 0.27 && lum(h) >= 100 && lum(h) <= 160; }).sort((a, b) => lum(a) - lum(b));
  const glintTo = coolPale.slice(0, 2).map((h) => CORE_COLOURS + sorted.indexOf(h));
  // two low-saturation browns for the trunk at night (art director 2026-11-11, 1b): the shade side (the two darker trunk colours) takes the dull taupe-brown #584b46, the lit side (the two lighter) the bank's brown #6e5038; the litter's orange specks take #584b46 too
  const NIGHT_SHADE = '584b46', NIGHT_LIT = '6e5038';
  const palIdx = (h) => (sorted.indexOf(h) >= 0 ? CORE_COLOURS + sorted.indexOf(h) : -1);
  const trunkByLum = [...trunk].sort((a, b) => lum(sorted[a - CORE_COLOURS]) - lum(sorted[b - CORE_COLOURS]));
  const trunkShade = trunkByLum.slice(0, Math.ceil(trunkByLum.length / 2)), trunkLit = trunkByLum.slice(Math.ceil(trunkByLum.length / 2));
  const litter = [];
  const litterImg = images.get('fill-litter.png');
  if (litterImg) { const im = litterImg; for (let i = 0; i < im.data.length; i += 4) if (im.data[i + 3]) { const h = hex(im.data[i], im.data[i + 1], im.data[i + 2]), c = unhex(h), k = palIdx(h); if (k >= 0 && family(c) === 'warm' && !litter.includes(k)) litter.push(k); } }
  const tables = computeTables(core, sorted.map(unhex), { ground, tone, crowns, stone, stoneHi, stoneLine, bank, bankTo, trunkShade, trunkLit, trunkShadeTo: palIdx(NIGHT_SHADE), trunkLitTo: palIdx(NIGHT_LIT), litter, litterTo: palIdx(NIGHT_SHADE), glint, glintTo });
  const palette = { formatVersion: 1, firstIndex: CORE_COLOURS, count: sorted.length, colours: sorted.map((h) => '#' + h), tables: {} };
  for (const n of TABLE_NAMES) palette.tables[n] = tables[n];

  for (const [name, img] of images) files.set(name, Buffer.from(encodePng(img)));

  const set = {
    formatVersion: 1, id: recipe.id, name: recipe.name, ship: recipe.ship,
    licence: { spdx: recipe.licence.spdx, author: recipe.licence.author, source: recipe.licence.source, fetched: recipe.licence.fetched, archiveSha256: recipe.licence.archiveSha256 },
    sourceTile: t, scale: recipe.scale, half: recipe.half, palette: 'palette.json', spriteSheet: 'sprites.png',
    ...(deskTerrain ? { layers: deskTerrain.layers, tone: deskTerrain.tone } : {}), props: setSprites.props, decals: setSprites.decals, canopy: setSprites.canopy,
  };
  if (desk) {
    for (const [n, b] of desk.files) files.set(n, b);
    for (const [n, b] of deskTerrain.files) files.set(n, b);
    files.set('DESK.json', Buffer.from(JSON.stringify({ ...desk.desk, ...deskTerrain.desk }, null, 2) + '\n'));
  }
  files.set('set.json', Buffer.from(fmtJson(set) + '\n'));
  files.set('palette.json', Buffer.from(fmtJson(palette) + '\n'));

  const licFile = checkSourcePath(recipe.licence.file);
  files.set('LICENCE.md', readFileSync(path.join(tilesetsRoot, licFile)));
  const srcMd = [
    `# ${recipe.name}: source`, '',
    `- **Source:** ${recipe.licence.source}`,
    `- **Author:** ${recipe.licence.author}`,
    `- **Fetched:** ${recipe.licence.fetched}`,
    `- **Archive sha256:** ${recipe.licence.archiveSha256}`,
    `- **Licence:** ${recipe.licence.spdx} (the legal code is \`LICENCE.md\`, copied from \`${licFile}\`)`,
    `- **Ship:** \`${recipe.ship}\`: a CC0 stand-in for tests and the public sandbox, credited in THIRD_PARTY_NOTICES.md`,
    `- **Palette:** ${sorted.length} colours of the ${PALETTE_MAX} the contract allows (measured; no pngquant step was needed)`, '',
    'Generated by `prototypes/places/tools/prepare-set.mjs` from `recipe.json`; do not edit by hand.', '',
    '## What was cut and how', '', ...recipe.notes.map((n) => `- ${n}`), '',
    ...(deskTerrain ? ['## Terrain layers', '', ...Object.entries(deskTerrain.layers).map(([id, l]) => `- \`${id}\`: ` + (l.drawAs ? `drawn as ${l.drawAs}` : [l.fill ? 'fill' : null, ...(l.over || []).map((k) => `${k.kind} over ${k.lowers.join(', ')}`)].filter(Boolean).join('; '))), `- \`tone\`: of ${deskTerrain.tone.of}`, ''] : []),
    '## Source files read', '', ...Object.values(recipe.sources).map((s) => `- \`${s}\``), '',
  ].join('\n');
  files.set('SOURCE.md', Buffer.from(srcMd));
  return { files, colourCount: sorted.length };
}

function pixelsEqual(a, b) {
  const x = decodePng(a), y = decodePng(b);
  return x.w === y.w && x.h === y.h && Buffer.compare(Buffer.from(x.data), Buffer.from(y.data)) === 0;
}

function main(argv) {
  const args = argv.slice(2);
  const take = (flag) => { const i = args.indexOf(flag); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
  const tilesetsRoot = take('--tilesets');
  const outFlag = take('--out');
  const check = args.includes('--check');
  const recipePath = args.find((a) => !a.startsWith('--'));
  if (!recipePath || !tilesetsRoot) { console.error('usage: prepare-set.mjs <recipe.json> --tilesets <dir> [--out <dir>] [--check]'); process.exit(2); }
  const recipe = JSON.parse(readFileSync(recipePath, 'utf8'));
  const out = outFlag || path.dirname(path.resolve(recipePath));
  const { files, colourCount } = prepareSet(recipe, { tilesetsRoot: path.resolve(tilesetsRoot) });
  console.log(`${recipe.id}: ${colourCount} colours (limit ${PALETTE_MAX}), ${files.size} files`);
  let bad = 0;
  mkdirSync(out, { recursive: true });
  for (const [name, buf] of files) {
    const file = path.join(out, name);
    if (check) {
      const same = existsSync(file) && (name.endsWith('.png') ? pixelsEqual(readFileSync(file), buf) : Buffer.compare(readFileSync(file), buf) === 0);
      if (!same) { console.error('differs: ' + name); bad++; }
    } else writeFileSync(file, buf);
  }
  if (bad) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv);
