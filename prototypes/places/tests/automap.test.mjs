// The rule interpreter (src/automap.mjs): eight fixtures, each a set of rule maps, a working map and the output the map editor's own automapping gave for it (tests/automap-fixtures; every layer, every cell must be the same),
// and what the editor cannot show: the same spot gets the same pick in every place, so a place cut from a bigger map is the bigger map's piece (picks are keyed by the world tile).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Tiles, bindMap, workFrom, workMap, loadRuleList, parseRules, applyRules, automap } from '../src/automap.mjs';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'automap-fixtures');
const io = { text: (p) => readFileSync(p, 'utf8'), json: (p) => JSON.parse(readFileSync(p, 'utf8')), resolve: (from, rel) => path.resolve(path.dirname(from), rel) };
const bind = (file, tiles) => bindMap(io.json(path.join(dir, file)), tiles, { json: (s) => io.json(path.join(dir, s)) });

for (const name of ['lip', 'alt', 'special', 'chance', 'modxy', 'edges', 'order', 'erase']) {
  test(`fixture ${name}: our rules give the editor's own output, layer by layer, cell by cell`, () => {
    const tiles = new Tiles(), work = workFrom(bind(`${name}.work.tmj`, tiles)), want = bind(`${name}.expected.tmj`, tiles);
    automap(loadRuleList(path.join(dir, `${name}.rules.txt`), io, tiles), work, { seed: 'fixture' });
    assert.deepEqual([...work.layers.keys()].sort(), want.layers.map((l) => l.name).sort(), 'the same layers');
    for (const l of want.layers) assert.deepEqual(Array.from(work.layers.get(l.name)), Array.from(l.data), `${name}: layer ${l.name}`);
  });
}

// a rule map made in code over the fixtures' tileset: `rules` = [[input rows], [output rows]] of tile classes ('' empty), one input layer `land`, one output layer per output index
const T0 = () => { const t = new Tiles(); t.addSet(io.json(path.join(dir, 'tiles.tsj'))); return t; };
const ruleMap = (tiles, w, h, layers, props) => parseRules(bindMap({
  type: 'map', width: w, height: h, tilewidth: 32, tileheight: 32, tilesets: [{ firstgid: 1, source: 'tiles.tsj' }], properties: Object.entries(props || {}).map(([name, value]) => ({ name, value })),
  layers: layers.map(([name, rows]) => ({ type: 'tilelayer', name, width: w, height: h, data: rows.flat() })),
}, tiles, { json: () => io.json(path.join(dir, 'tiles.tsj')) }), tiles);
const gid = (c) => 'abcdefghi'.indexOf(c) + 1;

test('a pick is keyed by the world tile: a window cut from a bigger map gives the bigger map\'s pieces, in any origin', () => {
  const tiles = T0(), rules = ruleMap(tiles, 1, 1, [['input_land', [[gid('a')]]], ['output1_out', [[gid('b')]]], ['output2_out', [[gid('c')]]], ['output3_out', [[gid('d')]]]]);
  const big = workMap(40, 30, { x: 100, y: 200 }), a = tiles.named('tiles', 'a'); big.layers.set('land', new Uint32Array(40 * 30).fill(a));
  applyRules(rules, big, { seed: 'S' });
  const kinds = new Set(big.layers.get('out')); assert.ok(kinds.has(tiles.named('tiles', 'b')) && kinds.has(tiles.named('tiles', 'c')) && kinds.has(tiles.named('tiles', 'd')), 'all three picks occur');
  const small = workMap(10, 8, { x: 115, y: 210 }); small.layers.set('land', new Uint32Array(80).fill(a));
  applyRules(rules, small, { seed: 'S' });
  for (let y = 0; y < 8; y++) for (let x = 0; x < 10; x++) assert.equal(small.layers.get('out')[y * 10 + x], big.layers.get('out')[(y + 10) * 40 + x + 15], `world tile ${115 + x},${210 + y}`);
  const again = workMap(10, 8, { x: 115, y: 210 }); again.layers.set('land', new Uint32Array(80).fill(a)); applyRules(rules, again, { seed: 'S' });
  assert.deepEqual(again.layers.get('out'), small.layers.get('out'), 'the same twice');
  const other = workMap(10, 8, { x: 115, y: 210 }); other.layers.set('land', new Uint32Array(80).fill(a)); applyRules(rules, other, { seed: 'T' });
  assert.notDeepEqual(other.layers.get('out'), small.layers.get('out'), 'another seed picks differently');
});

test('ModX and ModY count world tiles: the same world columns are chosen whatever the place\'s own origin', () => {
  const tiles = T0(), rules = ruleMap(tiles, 3, 1, [['input_land', [[gid('a'), 0, 0]]], ['output_out', [[gid('b'), 0, 0]]]], { ModX: 3 });
  const a = tiles.named('tiles', 'a'), cols = (ox) => { const w = workMap(12, 1, { x: ox, y: 0 }); w.layers.set('land', new Uint32Array(12).fill(a)); applyRules(rules, w); return Array.from(w.layers.get('out'), (v, x) => (v ? ox + x : null)).filter((x) => x !== null); };
  assert.deepEqual(cols(0), [0, 3, 6, 9]); assert.deepEqual(cols(7), [9, 12, 15, 18]); assert.deepEqual(cols(-5), [-3, 0, 3, 6]);
});

test('the rules list: comments, nested lists and [filter] lines by the working map\'s name; the old regions layers and AutoEmpty are refused', () => {
  const files = { 'rules.txt': '# first\n// second\none.tmj\n[town*]\ntwo.tmj\n[*]\nsub.txt\n', 'sub.txt': 'three.tmj\n' };
  const fake = { text: (p) => files[p.split('/').pop()], resolve: (_, r) => 'x/' + r };
  const seen = []; const tiles = new Tiles(); const ioFake = { ...fake, json: (p) => { seen.push(p.split('/').pop()); return { type: 'map', width: 1, height: 1, tilewidth: 1, tileheight: 1, tilesets: [], layers: [] }; } };
  loadRuleList('x/rules.txt', ioFake, tiles, 'forest-3'); assert.deepEqual(seen, ['one.tmj', 'three.tmj']);
  seen.length = 0; loadRuleList('x/rules.txt', ioFake, tiles, 'town-1'); assert.deepEqual(seen, ['one.tmj', 'two.tmj', 'three.tmj']);
  const t2 = T0();
  assert.throws(() => ruleMap(t2, 1, 1, [['regions', [[1]]], ['input_land', [[1]]]]), /regions/);
});
