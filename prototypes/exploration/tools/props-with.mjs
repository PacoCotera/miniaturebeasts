// placeProps for one seed under a changed land rule (a comparison aid).  node props-with.mjs <seed> k=v,k=v   (values numbers)
import { setLandRule } from '../src/gen7/levels.mjs';
import { placeProps } from './gen7-place-props.mjs';
const over = Object.fromEntries(String(process.argv[3] || '').split(',').filter(Boolean).map(p => { const [k, v] = p.split('='); return [k, Number(v)]; }));
setLandRule(over);
const s = placeProps(+process.argv[2]);
const keep = ['cells', 'loneTiles', 'unreachedCells', 'unreachedRaisedOnly', 'pathUnreached', 'pieces', 'piecesUnreached', 'walkableTiles', 'unreachedTiles', 'unreachedInMain', 'regionsWholeReach', 'zonesNotJoined', 'stairs', 'stairsWithoutWayUp', 'c1Ok', 'waterRaisedTiles', 'runMax', 'runs9', 'seamBad', 'ms'];
console.log(JSON.stringify({ over, ...Object.fromEntries(keep.map(k => [k, s[k]])) }));
