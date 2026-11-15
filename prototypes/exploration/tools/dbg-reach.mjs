// land-b3c: what one region leaves unreached (gen7-place-props.mjs with B3C_ONLY=ax,ay B3C_DUMP=1)
//   env B3C_ONLY=1,1 B3C_DUMP=1 node dbg-reach.mjs <seed>
import { placeProps } from './gen7-place-props.mjs';
const s = placeProps(+process.argv[2]);
console.log(JSON.stringify({ regions: s.regions, walkable: s.walkableTiles, unreached: s.unreachedTiles, pathUnreached: s.pathUnreached, piecesUnreached: s.piecesUnreached, needAt: s.needAt, footShort: s.footShort, footAt: s.footAt, loneAt: s.loneAt, ms: s.ms }));
