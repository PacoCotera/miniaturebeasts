// Reading the LDtk project (place design A1.2): load, validate against the vendored schema, check the project's definitions against the
// catalogues, and turn a level into the bake's IR. Pure over parsed JSON, so tests can hand in edited levels.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import * as G from '../format/gen/place.mjs';

export const LDTK_VERSION = '1.5.3';
export const GRID = 16;
export const PLACE_W = 18, PLACE_H = 22;   // today's places; a place may also be 24 x 28 (the open style, walk content B5)
export const PLACE_SIZES = [[18, 22], [24, 28]];
export const FIND_KINDS = ['pod', 'fruit', 'dew', 'stone', 'material'];
export const LAYERS = ['Canopy', 'Marks', 'Props', 'Decals', 'Terrain'];
export const ENTITY_FIELDS = {
  Prop: ['kind'], Decal: ['kind'], Canopy: ['kind'], Heart: ['kinds', 'species', 'revealLine', 'reachBy'], Clue: ['tell', 'path'],
  Find: ['kinds', 'chance'], Landmark: ['prop', 'label'], Opening: ['side'], CreatureSpawn: ['species', 'count'], WayUp: [], ReedBank: [],
};
export const LEVEL_FIELDS = ['type', 'names', 'tileset', 'mirror', 'mood'];

// A failure of one rule on one level; `cell` is { x, y } or null.
export class BakeError extends Error {
  constructor(level, rule, text, cell = null) {
    super(`${level}: [${rule}] ${text}${cell ? ` at cell (${cell.x}, ${cell.y})` : ''}`);
    this.level = level; this.rule = rule; this.cell = cell;
  }
}

const enumNames = (e) => Object.keys(e).filter((k) => Number.isNaN(+k));

let validators = null;
function getValidators(schemaFile) {
  if (validators) return validators;
  const schema = JSON.parse(readFileSync(schemaFile, 'utf8'));
  // the file names its meta-schema with https; ajv knows the http spelling, so the schema itself is not meta-validated
  const ajv = new Ajv({ allErrors: false, strict: false, validateSchema: false });
  ajv.addSchema(schema, 'ldtk');
  validators = { project: ajv.compile({ $ref: 'ldtk#/LdtkJsonRoot' }), level: ajv.compile({ $ref: 'ldtk#/otherTypes/Level' }), version: schema.version };
  return validators;
}

const errText = (v) => `${v.errors[0].instancePath || '/'} ${v.errors[0].message}`;

// Returns { project, levels: [levelJson] } sorted by identifier; throws Error on schema or version failure.
export function loadProject(projectFile, schemaFile) {
  const v = getValidators(schemaFile);
  const project = JSON.parse(readFileSync(projectFile, 'utf8'));
  if (project.jsonVersion !== LDTK_VERSION || v.version !== LDTK_VERSION) {
    throw new Error(`${projectFile}: LDtk jsonVersion ${project.jsonVersion} (schema ${v.version}); the bake reads ${LDTK_VERSION} only. Upgrading LDtk is a deliberate chunk.`);
  }
  if (!v.project(project)) throw new Error(`${projectFile}: not a valid LDtk ${LDTK_VERSION} project: ${errText(v.project)}`);
  if (!project.externalLevels) throw new Error(`${projectFile}: externalLevels must be on (one file per place)`);
  const levels = project.levels.map((lv) => {
    if (!lv.externalRelPath) throw new Error(`${projectFile}: level ${lv.identifier} has no externalRelPath`);
    const file = path.join(path.dirname(projectFile), lv.externalRelPath);
    const level = JSON.parse(readFileSync(file, 'utf8'));
    const { __header__, ...bare } = level;
    if (!v.level(bare)) throw new Error(`${file}: not a valid LDtk level: ${errText(v.level)}`);
    if (!bare.layerInstances) throw new Error(`${file}: no layerInstances`);
    return bare;
  }).sort((a, b) => (a.identifier < b.identifier ? -1 : 1));
  return { project, levels };
}

// The set ids on disk, in name order.
export function listSetIds(setsDir) {
  return readdirSync(setsDir, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(path.join(setsDir, d.name, 'set.json'))).map((d) => d.name).sort();
}

// Project definitions against terrain.json, the format's enums and the sets. Returns a list of messages (empty = in step).
export function checkDefs(project, terrains, sets) {
  const out = [];
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const defs = project.defs;
  const layers = Object.fromEntries(defs.layers.map((l) => [l.identifier, l]));
  for (const name of LAYERS) if (!layers[name]) out.push(`layer ${name} is missing from the project`);
  if (layers.Terrain) {
    if (layers.Terrain.type !== 'IntGrid') out.push('layer Terrain is not an IntGrid layer');
    if (layers.Terrain.gridSize !== GRID) out.push(`layer Terrain grid is ${layers.Terrain.gridSize}, not ${GRID}`);
    const got = layers.Terrain.intGridValues.map((v) => `${v.value}:${v.identifier}:${String(v.color).toUpperCase()}`);
    const want = terrains.map((t) => `${t.value}:${t.id}:${t.editorColour.toUpperCase()}`);
    if (!same(got, want)) out.push(`the Terrain IntGrid values [${got.join(' ')}] differ from art/places/terrain.json [${want.join(' ')}]`);
  }
  const enums = Object.fromEntries(defs.enums.map((e) => [e.identifier, e.values.map((v) => v.id)]));
  const union = (key) => [...new Set(sets.flatMap((s) => Object.keys(s.set[key])))].sort();
  const expect = {
    PlaceType: enumNames(G.PlaceType), HeartKind: enumNames(G.HeartKind), TellKind: enumNames(G.TellKind), Side: enumNames(G.Side), ReachBy: enumNames(G.ReachBy),
    FindKind: FIND_KINDS, TileSet: sets.map((s) => s.set.id).sort(), PropKind: union('props'), DecalKind: union('decals'), CanopyKind: union('canopy'),
  };
  for (const [name, want] of Object.entries(expect)) {
    const got = enums[name];
    if (!got) { out.push(`enum ${name} is missing from the project`); continue; }
    const cmp = ['TileSet', 'PropKind', 'DecalKind', 'CanopyKind'].includes(name) ? [...got].sort() : got;
    if (!same(cmp, want)) out.push(`enum ${name} [${got.join(', ')}] differs from [${want.join(', ')}]`);
  }
  const ents = Object.fromEntries(defs.entities.map((e) => [e.identifier, e.fieldDefs.map((f) => f.identifier)]));
  for (const [name, fields] of Object.entries(ENTITY_FIELDS)) {
    if (!ents[name]) out.push(`entity ${name} is missing from the project`);
    else if (!same(ents[name], fields)) out.push(`entity ${name} has fields [${ents[name].join(', ')}], expected [${fields.join(', ')}]`);
  }
  if (!same(defs.levelFields.map((f) => f.identifier), LEVEL_FIELDS)) out.push(`level fields [${defs.levelFields.map((f) => f.identifier).join(', ')}] differ from [${LEVEL_FIELDS.join(', ')}]`);
  return out;
}

const fieldsOf = (inst) => Object.fromEntries(inst.fieldInstances.map((f) => [f.__identifier, f.__value]));

// Level JSON -> { ir } or { errors }. The IR works in cells (props, decals, canopy in pixels at 48 px, the foot of the sprite).
// Entity positions: the entity's pixel position is the top-left of its 16 px box; a prop's foot is the bottom middle of that box (+ sub-tile offset).
export function levelToIR(level, terrains) {
  const id = level.identifier;
  const errors = [];
  const fail = (rule, text, cell) => errors.push(new BakeError(id, rule, text, cell));
  if (!PLACE_SIZES.some(([pw, ph]) => level.pxWid === pw * GRID && level.pxHei === ph * GRID)) {
    fail('size', `the level is ${level.pxWid / GRID} x ${level.pxHei / GRID} cells; a place is ${PLACE_SIZES.map(([a, b]) => `${a} x ${b}`).join(' or ')}`);
    return { errors };
  }
  const layer = Object.fromEntries(level.layerInstances.map((l) => [l.__identifier, l]));
  for (const name of LAYERS) if (!layer[name]) { fail('layers', `the level has no ${name} layer`); }
  if (errors.length) return { errors };
  const lf = fieldsOf(level);
  const w = level.pxWid / GRID, h = level.pxHei / GRID;
  const csv = layer.Terrain.intGridCsv;
  const known = new Set(terrains.map((t) => t.value));
  const terrain = new Uint8Array(w * h);
  for (let k = 0; k < w * h; k++) {
    const v = csv[k] ?? 0;
    if (!known.has(v)) fail('terrain-id', v === 0 ? 'the cell is not painted' : `the cell holds IntGrid value ${v}, which terrain.json does not define`, { x: k % w, y: (k / w) | 0 });
    terrain[k] = v;
  }
  const ir = {
    id, w, h, type: lf.type, names: lf.names || [], tileset: lf.tileset, mirror: lf.mirror !== false, mood: lf.mood || '', terrain,
    props: [], decals: [], canopy: [], hearts: [], clues: [], finds: [], landmarks: [], openings: [], spawns: [], wayups: [], reedbanks: [],
  };
  const inside = (cx, cy) => cx >= 0 && cy >= 0 && cx < w && cy < h;
  const placed = (e, f) => {
    const x = e.px[0] * 3 + 24, y = e.px[1] * 3 + 47; // the foot, pixels at 48 px
    return { kind: f.kind, x, y, sortY: y, cx: Math.floor(x / 48), cy: Math.floor(y / 48) };
  };
  for (const l of level.layerInstances) {
    if (l.__type !== 'Entities') continue;
    for (const e of l.entityInstances) {
      const f = fieldsOf(e);
      const cx = Math.floor(e.px[0] / GRID), cy = Math.floor(e.px[1] / GRID);
      const cw = Math.round(e.width / GRID), ch = Math.round(e.height / GRID);
      if (!inside(cx, cy)) { fail('entity-bounds', `${e.__identifier} lies outside the place`, { x: cx, y: cy }); continue; }
      switch (e.__identifier) {
        case 'Prop': ir.props.push(placed(e, f)); break;
        case 'Decal': ir.decals.push(placed(e, f)); break;
        case 'Canopy': ir.canopy.push(placed(e, f)); break;
        case 'Heart': ir.hearts.push({ x: cx, y: cy, kinds: f.kinds || [], species: f.species || [], revealLine: f.revealLine || '', reachBy: f.reachBy || 'none' }); break;
        case 'Clue': ir.clues.push({ tell: f.tell, points: (f.path || []).map((p) => ({ x: p.cx, y: p.cy })) }); break;
        case 'Find': ir.finds.push({ x: cx, y: cy, kinds: f.kinds || [], chance: f.chance ?? 1 }); break;
        case 'Landmark': ir.landmarks.push({ prop: f.prop, x: cx, y: cy, label: f.label || '' }); break;
        case 'Opening': {
          const side = f.side;
          const along = side === 'N' || side === 'S' ? [cx, cw] : [cy, ch];
          ir.openings.push({ side, x: cx, y: cy, cw, ch, from: along[0], to: along[0] + along[1] - 1 });
          break;
        }
        case 'WayUp': ir.wayups.push({ x: cx, y: cy, w: cw, h: ch }); break;
        case 'ReedBank': ir.reedbanks.push({ x: cx, y: cy, w: cw, h: ch }); break;
        case 'CreatureSpawn': ir.spawns.push({ x: cx, y: cy, w: cw, h: ch, species: f.species || [], count: f.count ?? 1 }); break;
        default: fail('entity', `unknown entity ${e.__identifier}`, { x: cx, y: cy });
      }
    }
  }
  const byPos = (a, b) => a.sortY - b.sortY || a.x - b.x || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0);
  ir.props.sort(byPos); ir.decals.sort(byPos); ir.canopy.sort(byPos);
  return errors.length ? { errors } : { ir };
}
