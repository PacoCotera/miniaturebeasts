// land-line-merge-1: the earth banks the page's layout holds for one cell (what tests/soft-ground.test.mjs pins), and what stands round the first bank's foot:
//   node bank-lay-probe.mjs <seed> <region cell index>
import { makePage } from '../tests/page-harness.mjs';
const [seed, cell] = process.argv.slice(2).map(Number);
const mibi = { id: 1, name: 'Fig', sp: 7, born: 0, outings: 0, notches: 0, bonded: false, plays: 0, grownTurn: null };
const p = makePage({ gen: 7, console: 'silent' });
p.run(`newWorld(${seed}); TEST.calm = true; S.turn = 5; S.tier = 2; S.known = [0, 1, 2]; S.mibis = [${JSON.stringify(mibi)}]; S.carried = [1]; S.lead = 1; startExpedition('weather', G.spawns[0]); S.exp.start = ${cell}; S.exp.pos = ${cell}; S.exp.range = 4; enterPatch();`);
console.log(p.run('JSON.stringify({ banks: curLay().banks, w: curLay().w, h: curLay().h, pw: PW })'));
const rows = JSON.parse(p.run(`JSON.stringify((() => { const lay = curLay(), b = (lay.banks || [])[0]; if (!b) return null; const out = [];
  for (let y = b.y - 1; y <= b.y + b.h + 4; y++) { let r = String(y).padStart(2) + ' '; for (let x = b.x - 4; x <= b.x + b.w + 3; x++) { if (x < 0 || y < 0 || x >= lay.w || y >= lay.h) { r += ' ..'; continue; } const t = lay.tiles[y * lay.w + x]; r += ' ' + String(t).padStart(2) + (lay.reach[y * lay.w + x] ? '+' : (T_BLOCK[t] ? '#' : '-')); } out.push(r); } return out; })())`));
console.log((rows || ['no bank']).join('\n'));
console.log('T.THICKET', p.run('T.THICKET'), 'T.BANK', p.run('T.BANK'), 'reach: + reached, # blocked, - open but not reached');
