// Writers for the baked formats, on the generated builders (gen/place.mjs). Plain objects in, bytes out; deterministic: the same object
// always gives the same bytes. Field names are the schema's, in camelCase. Enums are given by name.
import * as G from './gen/place.mjs';

export const FORMAT_VERSION = 2;   // a place (.mbplace): format 2 holds the bake's hold outputs, rim steps, seed and cell (baked-package-8). The one place the version is set.
export const TILESET_VERSION = 1;  // a tile set (.mbtiles) is unchanged
export const TILESET_ID = 'MBTS';
export const PLACE_ID = 'MBPL';

const num = (enumObj, name, what) => {
  const v = enumObj[name];
  if (typeof v !== 'number') throw new Error(`${what}: "${name}" is not one of ${Object.keys(enumObj).filter((k) => Number.isNaN(+k)).join(', ')}`);
  return v;
};
const strVec = (b, arr, create) => create(b, (arr || []).map((s) => b.createString(s)));
const tableVec = (b, arr, make, create) => create(b, (arr || []).map((x) => make(b, x)));

export function writeTileSet(ts) {
  const b = new G.Builder(1 << 20);
  const palette = G.TileSet.createPaletteVector(b, ts.palette);
  const lights = tableVec(b, ts.lightTables, (bb, r) => G.Remap.createRemap(bb, num(G.RemapName, r.name, 'light table'), G.Remap.createMapVector(bb, r.map)), (bb, v) => G.TileSet.createLightTablesVector(bb, v));
  const atlas48 = G.TileSet.createAtlas48Vector(b, ts.atlas48);
  const atlas24 = G.TileSet.createAtlas24Vector(b, ts.atlas24);
  const tiles = tableVec(b, ts.tiles, (bb, t) => G.Tile.createTile(bb, G.Tile.createFramesVector(bb, t.frames), t.frameMs || 0), (bb, v) => G.TileSet.createTilesVector(bb, v));
  const pairs = tableVec(b, ts.pairs, (bb, p) => G.Pair.createPair(bb, p.lower, p.upper, num(G.PairMode, p.mode, 'pair mode'),
    G.Pair.createTilesVector(bb, p.tiles), G.Pair.createFullVariantsVector(bb, p.fullVariants || []), G.Pair.createEmptyVariantsVector(bb, p.emptyVariants || [])), (bb, v) => G.TileSet.createPairsVector(bb, v));
  const sprites = tableVec(b, ts.sprites, (bb, s) => {
    const kind = bb.createString(s.kind);
    const fp = G.Sprite.createFootprintVector(bb, s.footprint || []);
    const f48 = G.Sprite.createFrames48Vector(bb, s.frames48);
    const f24 = G.Sprite.createFrames24Vector(bb, s.frames24);
    return G.Sprite.createSprite(bb, kind, num(G.SpriteGroup, s.group, 'sprite group'), s.w48, s.h48, s.w24, s.h24,
      s.anchor48[0], s.anchor48[1], s.anchor24[0], s.anchor24[1], fp, f48, f24, s.frameMs || 0, s.canopy ?? -1);
  }, (bb, v) => G.TileSet.createSpritesVector(bb, v));
  const sa48 = G.TileSet.createSpriteAtlas48Vector(b, ts.spriteAtlas48);
  const sa24 = G.TileSet.createSpriteAtlas24Vector(b, ts.spriteAtlas24);
  const cycles = tableVec(b, ts.cycles, (bb, c) => G.Cycle.createCycle(bb, c.first, c.count, c.stepMs), (bb, v) => G.TileSet.createCyclesVector(bb, v));
  const lic = G.Licence.createLicence(b, b.createString(ts.licence.spdx), b.createString(ts.licence.author), b.createString(ts.licence.source), b.createString(ts.licence.fetched));
  const id = b.createString(ts.id);
  G.TileSet.startTileSet(b);
  G.TileSet.addId(b, id);
  G.TileSet.addFormatVersion(b, ts.formatVersion ?? TILESET_VERSION);
  G.TileSet.addTile(b, ts.tile);
  G.TileSet.addHalf(b, ts.half);
  G.TileSet.addPalette(b, palette);
  G.TileSet.addLightTables(b, lights);
  G.TileSet.addAtlas48(b, atlas48);
  G.TileSet.addAtlas24(b, atlas24);
  G.TileSet.addTiles(b, tiles);
  G.TileSet.addPairs(b, pairs);
  G.TileSet.addSprites(b, sprites);
  G.TileSet.addSpriteAtlas48(b, sa48);
  G.TileSet.addSpriteAtlas24(b, sa24);
  G.TileSet.addCycles(b, cycles);
  G.TileSet.addLicence(b, lic);
  b.finish(G.TileSet.endTileSet(b), TILESET_ID);
  return b.asUint8Array().slice();
}

const placed = (bb, p) => G.Placed.createPlaced(bb, p.kind, p.x, p.y, p.sortY);

// A vector of Point structs (they are written inline, last first)
const pointVec = (b, arr, start) => { const a = arr || []; start(b, a.length); for (let i = a.length - 1; i >= 0; i--) G.Point.createPoint(b, a[i].x, a[i].y); return b.endVector(); };
const bankVec = (b, arr, create) => tableVec(b, arr, (bb, k) => G.Bank.createBank(bb, k.x, k.y, k.w, k.h), create);

// The format 2 parts of a place (everything the bake's hold makes), made before the place table starts. Plain objects in the schema's camelCase; each list may be absent.
function writeHold(b, pl) {
  const S = (s) => b.createString(s || '');
  const rimSteps = G.Place.createRimStepsVector(b, pl.rimSteps || new Uint8Array(0));
  const softWade = pointVec(b, pl.softWade, (bb, n) => G.Place.startSoftWadeVector(bb, n));
  const softScree = tableVec(b, pl.softScree, (bb, s) => G.Scree.createScree(bb, num(G.Side, s.side, 'scree side'), s.s, s.ei), (bb, v) => G.Place.createSoftScreeVector(bb, v));
  const pieces = tableVec(b, pl.pieces, (bb, p) => G.Piece.createPiece(bb, bb.createString(p.piece), p.x, p.y, p.w, bb.createString(p.spot || '')), (bb, v) => G.Place.createPiecesVector(bb, v));
  const shelter = pointVec(b, pl.shelter, (bb, n) => G.Place.startShelterVector(bb, n));
  const strikes = tableVec(b, pl.strikes, (bb, s) => G.Strike.createStrike(bb, s.x, s.y, s.age, !!s.glass, !!s.read), (bb, v) => G.Place.createStrikesVector(bb, v));
  const signs = tableVec(b, pl.signs, (bb, s) => {
    const kind = bb.createString(s.kind), finds = s.finds ? G.Sign.createFindsVector(bb, s.finds) : 0, banks = s.banks ? bankVec(bb, s.banks, (b2, v) => G.Sign.createBanksVector(b2, v)) : 0;
    const species = bb.createString(s.species || ''), path = s.path ? pointVec(bb, s.path.map(([x, y]) => ({ x, y })), (b2, n) => G.Sign.startPathVector(b2, n)) : 0, to = s.to ? G.Sign.createToVector(bb, s.to) : 0;
    return G.Sign.createSign(bb, kind, s.x ?? 0, s.y ?? 0, s.r ?? 0, finds, banks, s.pearl ?? 0, species, path, to);
  }, (bb, v) => G.Place.createSignsVector(bb, v));
  const traces = tableVec(b, pl.traces, (bb, t) => G.Trace.createTrace(bb, bb.createString(t.kind), t.x, t.y), (bb, v) => G.Place.createTracesVector(bb, v));
  const stamps = tableVec(b, pl.stamps, (bb, s) => {
    const cells = tableVec(bb, s.cells, (b2, c) => G.StampCell.createStampCell(b2, c[0], c[1], b2.createString(c[2])), (b2, v) => G.Stamp.createCellsVector(b2, v));
    const seeFrom = s.seenFrom ? G.Stamp.createSeeFromVector(bb, s.seenFrom) : 0;
    return G.Stamp.createStamp(bb, bb.createString(s.id), bb.createString(s.kind), bb.createString(s.role), s.x, s.y, s.w, s.h, s.tier ?? -1, s.entryDist, s.spineDist, seeFrom, !!s.seenFrom, cells);
  }, (bb, v) => G.Place.createStampsVector(bb, v));
  const banks = bankVec(b, pl.banks, (bb, v) => G.Place.createBanksVector(bb, v));
  const lm = pl.holdLandmark ? G.HoldLandmark.createHoldLandmark(b, S(pl.holdLandmark.kind), S(pl.holdLandmark.name), S(pl.holdLandmark.slot), pl.holdLandmark.x, pl.holdLandmark.y) : 0;
  return { rimSteps, softWade, softScree, pieces, shelter, strikes, signs, traces, stamps, banks, landmark: lm };
}

export function writePlace(pl) {
  const b = new G.Builder(1 << 14);
  const names = strVec(b, pl.names, (bb, v) => G.Place.createNamesVector(bb, v));
  const mirrorOf = b.createString(pl.mirrorOf || '');
  const terrain = G.Place.createTerrainVector(b, pl.terrain);
  const ground = tableVec(b, pl.ground, (bb, l) => G.Layer.createLayer(bb, G.Layer.createTilesVector(bb, l.tiles)), (bb, v) => G.Place.createGroundVector(bb, v));
  const decals = tableVec(b, pl.decals, placed, (bb, v) => G.Place.createDecalsVector(bb, v));
  const props = tableVec(b, pl.props, placed, (bb, v) => G.Place.createPropsVector(bb, v));
  const canopy = tableVec(b, pl.canopy, placed, (bb, v) => G.Place.createCanopyVector(bb, v));
  const h = pl.heart;
  const heart = G.Heart.createHeart(b, h.x, h.y,
    G.Heart.createKindsVector(b, h.kinds.map((k) => num(G.HeartKind, k, 'heart kind'))),
    strVec(b, h.species, (bb, v) => G.Heart.createSpeciesVector(bb, v)), b.createString(h.revealLine || ''), num(G.ReachBy, h.reachBy || 'none', 'reachBy'));
  const clues = tableVec(b, pl.clues, (bb, c) => {
    G.Clue.startPointsVector(bb, c.points.length);
    for (let i = c.points.length - 1; i >= 0; i--) G.Point.createPoint(bb, c.points[i].x, c.points[i].y);
    const pts = bb.endVector();
    return G.Clue.createClue(bb, num(G.TellKind, c.tell, 'tell'), pts);
  }, (bb, v) => G.Place.createCluesVector(bb, v));
  const finds = tableVec(b, pl.finds, (bb, f) => G.Find.createFind(bb, f.x, f.y, G.Find.createKindsVector(bb, f.kinds), f.chance, bb.createString(f.what || ''), f.herd ?? -1, f.hollow ?? -1, !!f.forced, bb.createString(f.spot || '')), (bb, v) => G.Place.createFindsVector(bb, v));
  const landmarks = tableVec(b, pl.landmarks, (bb, l) => G.Landmark.createLandmark(bb, l.prop, l.x, l.y, bb.createString(l.label || '')), (bb, v) => G.Place.createLandmarksVector(bb, v));
  const openings = tableVec(b, pl.openings, (bb, o) => G.Opening.createOpening(bb, num(G.Side, o.side, 'side'), o.from, o.to), (bb, v) => G.Place.createOpeningsVector(bb, v));
  const spawns = tableVec(b, pl.spawns, (bb, s) => G.Spawn.createSpawn(bb, s.x, s.y, s.w, s.h, strVec(bb, s.species, (b2, v) => G.Spawn.createSpeciesVector(b2, v)), s.count), (bb, v) => G.Place.createSpawnsVector(bb, v));
  const block = G.Place.createBlockMaskVector(b, pl.blockMask);
  const top = pl.top && pl.top.length ? G.Place.createTopVector(b, pl.top) : 0;
  const hold = (pl.formatVersion ?? FORMAT_VERSION) >= 2 ? writeHold(b, pl) : null;
  const id = b.createString(pl.id);
  const set = b.createString(pl.set);
  G.Place.startPlace(b);
  G.Place.addId(b, id);
  G.Place.addFormatVersion(b, pl.formatVersion ?? FORMAT_VERSION);
  G.Place.addSet(b, set);
  G.Place.addW(b, pl.w);
  G.Place.addH(b, pl.h);
  G.Place.addType(b, num(G.PlaceType, pl.type, 'place type'));
  G.Place.addNames(b, names);
  G.Place.addMirrorOf(b, mirrorOf);
  G.Place.addTerrain(b, terrain);
  G.Place.addGround(b, ground);
  G.Place.addDecals(b, decals);
  G.Place.addProps(b, props);
  G.Place.addCanopy(b, canopy);
  G.Place.addHeart(b, heart);
  G.Place.addClues(b, clues);
  G.Place.addFinds(b, finds);
  G.Place.addLandmarks(b, landmarks);
  G.Place.addOpenings(b, openings);
  G.Place.addSpawns(b, spawns);
  G.Place.addBlockMask(b, block);
  if (top) G.Place.addTop(b, top);
  if (hold) {
    G.Place.addSeed(b, pl.seed ?? 0);
    G.Place.addCell(b, pl.cell ?? 0);
    G.Place.addRimSteps(b, hold.rimSteps);
    if (pl.groundAt) { G.Place.addGroundAt(b, G.Point.createPoint(b, pl.groundAt.x, pl.groundAt.y)); G.Place.addHasGroundAt(b, true); }
    G.Place.addSoftWade(b, hold.softWade);
    G.Place.addSoftScree(b, hold.softScree);
    G.Place.addPieces(b, hold.pieces);
    G.Place.addShelter(b, hold.shelter);
    G.Place.addStrikes(b, hold.strikes);
    G.Place.addSigns(b, hold.signs);
    G.Place.addTraces(b, hold.traces);
    G.Place.addStamps(b, hold.stamps);
    G.Place.addBanks(b, hold.banks);
    if (hold.landmark) G.Place.addHoldLandmark(b, hold.landmark);
  }
  b.finish(G.Place.endPlace(b), PLACE_ID);
  return b.asUint8Array().slice();
}
