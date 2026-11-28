// Readers: bytes -> plain objects (the writers' inputs), for the tests, the bake and tools. The page and the device read the blob in place
// through the generated accessors (gen/place.mjs); the vectors here are views into the bytes, not copies, where the type allows.
import * as G from './gen/place.mjs';
import { TILESET_ID, PLACE_ID, FORMAT_VERSION, TILESET_VERSION } from './write.mjs';

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
  if (ts.formatVersion() !== TILESET_VERSION) throw new Error(`tile set format version ${ts.formatVersion()}, this reader reads ${TILESET_VERSION}`);
  const lic = ts.licence();
  return {
    id: ts.id(), formatVersion: ts.formatVersion(), tile: ts.tile(), half: ts.half(),
    palette: Array.from(ts.paletteArray() || []),
    lightTables: list(ts.lightTablesLength(), (i) => { const r = ts.lightTables(i); return { name: name(G.RemapName, r.name()), map: r.mapArray() }; }),
    atlas48: u8(ts.atlas48Array()), atlas24: u8(ts.atlas24Array()),
    tiles: list(ts.tilesLength(), (i) => { const t = ts.tiles(i); return { frames: Array.from(t.framesArray()), frameMs: t.frameMs() }; }),
    pairs: list(ts.pairsLength(), (i) => {
      const p = ts.pairs(i);
      return { lower: p.lower(), upper: p.upper(), mode: name(G.PairMode, p.mode()), tiles: Array.from(p.tilesArray() || []), fullVariants: Array.from(p.fullVariantsArray() || []), emptyVariants: Array.from(p.emptyVariantsArray() || []) };
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
  const fv = pl.formatVersion();
  if (fv !== 1 && fv !== FORMAT_VERSION) throw new Error(`place format version ${fv}, this reader reads 1 and ${FORMAT_VERSION}`);   // a hand-set place stays format 1 (no hold outputs)
  const placed = (n, get) => list(n, (i) => { const p = get(i); return { kind: p.kind(), x: p.x(), y: p.y(), sortY: p.sortY() }; });
  const h = pl.heart();
  return {
    id: pl.id(), formatVersion: pl.formatVersion(), set: pl.set(), w: pl.w(), h: pl.h(), type: name(G.PlaceType, pl.type()),
    names: list(pl.namesLength(), (i) => pl.names(i)), mirrorOf: pl.mirrorOf(),
    terrain: u8(pl.terrainArray()),
    ground: list(pl.groundLength(), (i) => { const l = pl.ground(i); return { tiles: l.tilesArray() }; }),
    decals: placed(pl.decalsLength(), (i) => pl.decals(i)), props: placed(pl.propsLength(), (i) => pl.props(i)), canopy: placed(pl.canopyLength(), (i) => pl.canopy(i)),
    heart: {
      x: h.x(), y: h.y(), kinds: list(h.kindsLength(), (i) => name(G.HeartKind, h.kinds(i))), species: list(h.speciesLength(), (i) => h.species(i)),
      revealLine: h.revealLine(), reachBy: name(G.ReachBy, h.reachBy()),
    },
    clues: list(pl.cluesLength(), (i) => { const c = pl.clues(i); return { tell: name(G.TellKind, c.tell()), points: list(c.pointsLength(), (k) => ({ x: c.points(k).x(), y: c.points(k).y() })) }; }),
    finds: list(pl.findsLength(), (i) => {
      const f = pl.finds(i), o = { x: f.x(), y: f.y(), kinds: Array.from(f.kindsArray() || []), chance: f.chance() };
      if (f.what()) o.what = f.what(); if (f.herd() >= 0) o.herd = f.herd(); if (f.hollow() >= 0) o.hollow = f.hollow(); if (f.forced()) o.forced = true; if (f.spot()) o.spot = f.spot();   // a find of format 1 has none: only what is set is given back
      return o;
    }),
    landmarks: list(pl.landmarksLength(), (i) => { const l = pl.landmarks(i); return { prop: l.prop(), x: l.x(), y: l.y(), label: l.label() }; }),
    openings: list(pl.openingsLength(), (i) => { const o = pl.openings(i); return { side: name(G.Side, o.side()), from: o.from(), to: o.to() }; }),
    spawns: list(pl.spawnsLength(), (i) => { const s = pl.spawns(i); return { x: s.x(), y: s.y(), w: s.w(), h: s.h(), species: list(s.speciesLength(), (k) => s.species(k)), count: s.count() }; }),
    blockMask: u8(pl.blockMaskArray()),
    top: u8(pl.topArray()),
    ...(fv >= 2 ? readHold(pl) : {}),
  };
}

const points = (n, get) => list(n, (i) => ({ x: get(i).x(), y: get(i).y() }));
const banksOf = (n, get) => list(n, (i) => { const k = get(i); return { x: k.x(), y: k.y(), w: k.w(), h: k.h() }; });
// The format 2 parts: given back as the writer takes them (an empty list is an empty list).
function readHold(pl) {
  const lm = pl.holdLandmark();
  return {
    seed: pl.seed(), cell: pl.cell(), rimSteps: u8(pl.rimStepsArray()), groundAt: pl.hasGroundAt() ? { x: pl.groundAt().x(), y: pl.groundAt().y() } : null,
    softWade: points(pl.softWadeLength(), (i) => pl.softWade(i)),
    softScree: list(pl.softScreeLength(), (i) => { const s = pl.softScree(i); return { side: name(G.Side, s.side()), s: s.s(), ei: s.ei() }; }),
    pieces: list(pl.piecesLength(), (i) => { const p = pl.pieces(i); return { piece: p.piece(), x: p.x(), y: p.y(), w: p.w(), spot: p.spot() }; }),
    shelter: points(pl.shelterLength(), (i) => pl.shelter(i)),
    strikes: list(pl.strikesLength(), (i) => { const s = pl.strikes(i); return { x: s.x(), y: s.y(), age: s.age(), glass: s.glass(), read: s.read() }; }),
    signs: list(pl.signsLength(), (i) => {
      const s = pl.signs(i), kind = s.kind();   // a sign's keys are the kind's (hold.mjs)
      if (kind === 'moss-hollow') return { kind, x: s.x(), y: s.y(), r: s.r(), finds: Array.from(s.findsArray() || []) };
      if (kind === 'reedline') return { kind, banks: banksOf(s.banksLength(), (k) => s.banks(k)), pearl: s.pearl() };
      return { kind, species: s.species(), path: list(s.pathLength(), (k) => [s.path(k).x(), s.path(k).y()]), to: Array.from(s.toArray() || []) };
    }),
    traces: list(pl.tracesLength(), (i) => { const t = pl.traces(i); return { kind: t.kind(), x: t.x(), y: t.y() }; }),
    stamps: list(pl.stampsLength(), (i) => {
      const s = pl.stamps(i), o = { id: s.id(), kind: s.kind(), role: s.role(), x: s.x(), y: s.y(), w: s.w(), h: s.h(), entryDist: s.entryDist(), spineDist: s.spineDist(), seenFrom: s.hasSeeFrom() ? Array.from(s.seeFromArray() || []) : null, cells: list(s.cellsLength(), (k) => { const c = s.cells(k); return [c.x(), c.y(), c.k()]; }) };
      if (s.tier() >= 0) o.tier = s.tier();
      return o;
    }),
    banks: banksOf(pl.banksLength(), (i) => pl.banks(i)),
    holdLandmark: lm ? { kind: lm.kind(), name: lm.name(), slot: lm.slot(), x: lm.x(), y: lm.y() } : null,
  };
}
