// Writers for the baked formats, on the generated builders (gen/place.mjs). Plain objects in, bytes out; deterministic: the same object
// always gives the same bytes. Field names are the schema's, in camelCase. Enums are given by name.
import * as G from './gen/place.mjs';

export const FORMAT_VERSION = 1;
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
  G.TileSet.addFormatVersion(b, ts.formatVersion ?? FORMAT_VERSION);
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

export function writePlace(pl) {
  const b = new G.Builder(1 << 14);
  const names = strVec(b, pl.names, (bb, v) => G.Place.createNamesVector(bb, v));
  const mirrorOf = b.createString(pl.mirrorOf || '');
  const terrain = G.Place.createTerrainVector(b, pl.terrain);
  const ground = tableVec(b, pl.ground, (bb, l) => G.Layer.createLayer(bb, l.pair, G.Layer.createTilesVector(bb, l.tiles)), (bb, v) => G.Place.createGroundVector(bb, v));
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
  const finds = tableVec(b, pl.finds, (bb, f) => G.Find.createFind(bb, f.x, f.y, G.Find.createKindsVector(bb, f.kinds), f.chance), (bb, v) => G.Place.createFindsVector(bb, v));
  const landmarks = tableVec(b, pl.landmarks, (bb, l) => G.Landmark.createLandmark(bb, l.prop, l.x, l.y, bb.createString(l.label || '')), (bb, v) => G.Place.createLandmarksVector(bb, v));
  const openings = tableVec(b, pl.openings, (bb, o) => G.Opening.createOpening(bb, num(G.Side, o.side, 'side'), o.from, o.to), (bb, v) => G.Place.createOpeningsVector(bb, v));
  const spawns = tableVec(b, pl.spawns, (bb, s) => G.Spawn.createSpawn(bb, s.x, s.y, s.w, s.h, strVec(bb, s.species, (b2, v) => G.Spawn.createSpeciesVector(b2, v)), s.count), (bb, v) => G.Place.createSpawnsVector(bb, v));
  const block = G.Place.createBlockMaskVector(b, pl.blockMask);
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
  b.finish(G.Place.endPlace(b), PLACE_ID);
  return b.asUint8Array().slice();
}
