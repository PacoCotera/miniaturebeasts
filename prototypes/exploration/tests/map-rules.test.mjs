// The map rules file (art/places/map-rules.json): schema-valid, the numbers it holds are gone from gen7/, and a change to a value changes the map.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createDecor, TERR } from '../src/gen7/decor.mjs';
import { RULES } from '../src/gen7/rules.mjs';

const art = new URL('../../../art/places/', import.meta.url);
const gen7 = new URL('../src/gen7/', import.meta.url);
const Ajv = createRequire(new URL('../../places/package.json', import.meta.url))('ajv');   // ajv is a dependency of prototypes/places

test('map-rules.json is valid against map-rules.schema.json', () => {
  const ajv = new Ajv({ allErrors: true }), validate = ajv.compile(JSON.parse(readFileSync(new URL('map-rules.schema.json', art), 'utf8')));
  const rules = JSON.parse(readFileSync(new URL('map-rules.json', art), 'utf8'));
  assert.ok(validate(rules), JSON.stringify(validate.errors, null, 1));
  assert.deepEqual(rules, RULES, 'gen7 loads the same file');
  const shares = rules.reeds.shore.looks.reduce((s, l) => s + l.share, 0);
  assert.equal(shares, 1, 'the shore looks add up to 1');
  const bad = JSON.parse(JSON.stringify(rules)); bad.props.clear = 0;
  assert.ok(!validate(bad), 'a clear of 0 is refused');
});

test('none of the moved numbers is left in gen7/', () => {
  // each pattern is a literal that used to sit in decor.mjs, place.mjs or reeds.mjs; comments are not code
  const gone = [
    [/\bP_(CLUMP|FLOWER_SEED|TUFT|FLECK)\b/, 'a raw meadow rate'], [/\bFLECK_SIZES\b/, 'the fleck looks'], [/\bTONE_(AT|CLEAR|PATCH_MAX)\s*=\s*[0-9]/, 'a tone number'],
    [/\b0\.302\b|\b0\.083\b|\b0\.04\b/, 'a raw meadow rate'], [/\{\s*tufts:\s*0\.25/, 'the meadow target'], [/\[\[1, 1\], \[-1, 1\]/, 'the flower drift offsets'],
    [/\bused:\s*0\.\d+/, 'a biome table row'], [/\bpebbles:\s*0\.\d+/, 'a biome table row'], [/\b1 \/ 18\b|'ground-mix', 1 \/ 5\b/, 'a noise scale'], [/2\.5 \+ 0\.45/, 'the grove reach'],
    [/\[\[9, 6\]/, 'the fleck looks'], [/\b160\b/, 'the largest tone patch'], [/0\.375/, 'the shore look shares'], [/\bq\.length <= 80\b/, 'the small scrub patch size'],
    [/dy = -4; dy <= 2; dy\+\+/, 'the hollow tree clearing'], [/h\.x - 5 && x <= h\.x \+ 5/, 'the hollow tree keep-off box'], [/\* 4 \+ 2\b|bx \* 4\b|4 \* r\.bx/, 'the reed stretch size'],
    [/\b3 \+ int\(/, 'the in-water clump count'], [/r <= 2 &&/, 'the in-water reach'], [/\bint\([^)]*, 4\)/, 'the shore bed start'], [/< 0\.7 \?/, 'the flower same-kind share'], [/< 0\.75\) return null/, 'the claim border'],
  ];
  const files = ['decor.mjs', 'place.mjs', 'reeds.mjs'];   // the files that held them; the rest of gen7/ is the world's own fields and levels
  assert.deepEqual(files.filter(f => !readdirSync(gen7).includes(f)), []);
  for (const f of files) {
    const code = readFileSync(new URL(f, gen7), 'utf8').split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');
    for (const [re, what] of gone) assert.ok(!re.test(code), `${f}: ${what} is back in the code (${re})`);
  }
});

// What blocks (owner notes 6 and 7): only stone and wood as high as the explorer's shoulder (20 px and up), trees and terrain stop the walk; low things are stepped over, plants pushed through.
const SET = JSON.parse(readFileSync(new URL('sets/ninja-test/set.json', art), 'utf8'));
const PLANT = /^(sc-|shrub|bush|tuft|flower|clump|heather|tall-grass|reed|dry-tufts|young)/;
const BOULDER_PENDING_ART = ['rock-big', 'rock-big-m'];   // 18 px today: the art director grows the boulder to 20-24 px; it blocks meanwhile
test('no prop with a footprint is under 20 px tall unless it is a tree or terrain', () => {
  for (const [name, p] of Object.entries(SET.props)) {
    if (!p.footprint || !p.footprint.length || p.canopy || name.startsWith('tree-') || BOULDER_PENDING_ART.includes(name)) continue;
    assert.ok(p.rect[3] >= 20, `${name} blocks but is ${p.rect[3]} px tall`);
  }
});
test('no plant has a footprint', () => {
  for (const [name, p] of Object.entries({ ...SET.props, ...SET.decals })) if (PLANT.test(name)) assert.ok(!p.footprint || !p.footprint.length, `${name} is a plant and blocks`);
});
test('the grove rock shapes are boulders only; the small stones are decals', () => {
  assert.deepEqual(Object.keys(RULES.props.groves.rockShapes), ['rock-big']);
  for (const n of ['rock-a', 'rock-a-m', 'rock-b', 'rock-b-m', 'rock-turf', 'rock-turf-m']) assert.ok(SET.decals[n] && !SET.props[n].footprint.length, `${n} is a walk-over decal`);
});

// a land of grass with square ponds, 5 x 5 every 12 tiles: props stand a full cell off a shore; the map's end is a thicket
const POND = 12, inPond = (x, y) => x % POND >= 3 && x % POND < 8 && y % POND >= 3 && y % POND < 8;
function pondLand(biomeId) {
  const W = 120, H = 120;
  const T = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? TERR.THICKET : inPond(x, y) ? TERR.WATER : TERR.GRASS);
  return { T, biome: () => biomeId, W, H, wayups: [], slots: [] };
}
// the props that stand exactly two cells from a pond (the ring a clear of 1 allows and a clear of 2 does not), clear of the map's end
const ringTwo = ps => ps.filter(p => {
  if (p.fam === 'sweeps' || p.x < 4 || p.y < 4 || p.x > 115 || p.y > 115) return false;
  const near = r => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (inPond(p.x + dx, p.y + dy)) return true; return false; };
  return near(2) && !near(1);
});

test('props clear 1 -> 2 moves the props off the ring beside the shore', () => {
  const land = pondLand('woods');
  const one = createDecor(7, land, RULES).propsIn(0, 0, 119, 119), wide = JSON.parse(JSON.stringify(RULES)); wide.props.clear = 2;
  const two = createDecor(7, land, wide).propsIn(0, 0, 119, 119);
  const r1 = ringTwo(one), r2 = ringTwo(two);
  assert.ok(r1.length > 0, 'with a clear of 1 some props stand two cells from the shore');
  assert.equal(r2.length, 0, 'with a clear of 2 none does');
  assert.ok(two.length > 0 && two.length < one.length, 'the rest of the map still has props, fewer of them');
});
