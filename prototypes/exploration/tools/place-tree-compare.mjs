// place-walk-1: two place-tree-density.mjs outputs side by side (trees and tallwood/woods), as per 100 tiles: node place-tree-compare.mjs <a.json> <b.json> [fam]
import { readFileSync } from 'node:fs';
const [a, b, fam] = process.argv.slice(2), A = JSON.parse(readFileSync(a, 'utf8').trim().split('\n').pop()).perBiome, B = JSON.parse(readFileSync(b, 'utf8').trim().split('\n').pop()).perBiome, f = fam || 'trees';
for (const biome of Object.keys(A)) { const x = A[biome][f], y = B[biome] && B[biome][f]; if (x) console.log(biome.padEnd(9), f, 'A', String(x.per100).padStart(6), 'B', String(y ? y.per100 : '-').padStart(6), 'table', String(x.table).padStart(6)); }
