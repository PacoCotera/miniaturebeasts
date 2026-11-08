// Readers: bytes -> plain objects (the writers' inputs), for the tests, the bake and tools. The page and the device read the blob in place
// through the generated accessors (gen/place.mjs); the vectors here are views into the bytes, not copies, where the type allows.
import * as G from './gen/place.mjs';
import { TILESET_ID, PLACE_ID, FORMAT_VERSION } from './write.mjs';

const name = (enumObj, v) => enumObj[v];
const list = (n, f) => Array.from({ length: n }, (_, i) => f(i));
const u8 = (a) => a || new Uint8Array(0);

function open(bytes, id, what) {
  const bb = new G.ByteBuffer(bytes);
  if (!bb.__has_identifier(id)) throw new Error(`not a ${what}: file identifier is not ${id}`);
  return bb;
}

export function readTileSet(bytes) {
  const ts = G.TileSet.getRootAsTileSet(open(bytes, TILESET_ID, 'tile set (.mbtiles)'));
  if (ts.formatVersion() !== FORMAT_VERSION) throw new Error(`tile set format version ${ts.formatVersion()}, this reader reads ${FORMAT_VERSION}`);
  const lic = ts.licence();
  return {
    id: ts.id(), formatVersion: ts.formatVersion(), tile: ts.tile(), half: ts.half(),
    palette: Array.from(ts.paletteArray() || []),
    lightTables: list(ts.lightTablesLength(), (i) => { const r = ts.lightTables(i); return { name: name(G.RemapName, r.name()), map: r.mapArray() }; }),
    atlas48: u8(ts.atlas48Array()), atlas24: u8(ts.atlas24Array()),
    tiles: list(ts.tilesLength(), (i) => { const t = ts.tiles(i); return { frames: Array.from(t.framesArray()), frameMs: t.frameMs() }; }),
    pairs: list(ts.pairsLength(), (i) => {
      const p = ts.pairs(i);
      return { lower: p.lower(), upper: p.upper(), mode: name(G.PairMode, p.mode()), tiles: Array.from(p.tilesArray()), fullVariants: Array.from(p.fullVariantsArray() || []), emptyVariants: Array.from(p.emptyVariantsArray() || []) };
    }),
    sprites: list(ts.spritesLength(), (i) => {
      const s = ts.sprites(i);
      return {
        kind: s.kind(), group: name(G.SpriteGroup, s.group()), w48: s.w48(), h48: s.h48(), w24: s.w24(), h24: s.h24(),
        anchor48: [s.anchorX48(), s.anchorY48()], anchor24: [s.anchorX24(), s.anchorY24()],
        footprint: Array.from(s.footprintArray() || []), frames48: Array.from(s.frames48Array()), frames24: Array.from(s.frames24Array()), frameMs: s.frameMs(), canopy: s.canopy(),
      };
    }),
    spriteAtlas48: u8(ts.spriteAtlas48Array()), spriteAtlas24: u8(ts.spriteAtlas24Array()),
    cycles: list(ts.cyclesLength(), (i) => { const c = ts.cycles(i); return { first: c.first(), count: c.count(), stepMs: c.stepMs() }; }),
    licence: { spdx: lic.spdx(), author: lic.author(), source: lic.source(), fetched: lic.fetched() },
  };
}

export function readPlace(bytes) {
  const pl = G.Place.getRootAsPlace(open(bytes, PLACE_ID, 'place (.mbplace)'));
  if (pl.formatVersion() !== FORMAT_VERSION) throw new Error(`place format version ${pl.formatVersion()}, this reader reads ${FORMAT_VERSION}`);
  const placed = (n, get) => list(n, (i) => { const p = get(i); return { kind: p.kind(), x: p.x(), y: p.y(), sortY: p.sortY() }; });
  const h = pl.heart();
  return {
    id: pl.id(), formatVersion: pl.formatVersion(), set: pl.set(), w: pl.w(), h: pl.h(), type: name(G.PlaceType, pl.type()),
    names: list(pl.namesLength(), (i) => pl.names(i)), mirrorOf: pl.mirrorOf(),
    terrain: u8(pl.terrainArray()),
    ground: list(pl.groundLength(), (i) => { const l = pl.ground(i); return { pair: l.pair(), tiles: l.tilesArray() }; }),
    decals: placed(pl.decalsLength(), (i) => pl.decals(i)), props: placed(pl.propsLength(), (i) => pl.props(i)), canopy: placed(pl.canopyLength(), (i) => pl.canopy(i)),
    heart: {
      x: h.x(), y: h.y(), kinds: list(h.kindsLength(), (i) => name(G.HeartKind, h.kinds(i))), species: list(h.speciesLength(), (i) => h.species(i)),
      revealLine: h.revealLine(), reachBy: name(G.ReachBy, h.reachBy()),
    },
    clues: list(pl.cluesLength(), (i) => { const c = pl.clues(i); return { tell: name(G.TellKind, c.tell()), points: list(c.pointsLength(), (k) => ({ x: c.points(k).x(), y: c.points(k).y() })) }; }),
    finds: list(pl.findsLength(), (i) => { const f = pl.finds(i); return { x: f.x(), y: f.y(), kinds: Array.from(f.kindsArray() || []), chance: f.chance() }; }),
    landmarks: list(pl.landmarksLength(), (i) => { const l = pl.landmarks(i); return { prop: l.prop(), x: l.x(), y: l.y(), label: l.label() }; }),
    openings: list(pl.openingsLength(), (i) => { const o = pl.openings(i); return { side: name(G.Side, o.side()), from: o.from(), to: o.to() }; }),
    spawns: list(pl.spawnsLength(), (i) => { const s = pl.spawns(i); return { x: s.x(), y: s.y(), w: s.w(), h: s.h(), species: list(s.speciesLength(), (k) => s.species(k)), count: s.count() }; }),
    blockMask: u8(pl.blockMaskArray()),
  };
}
