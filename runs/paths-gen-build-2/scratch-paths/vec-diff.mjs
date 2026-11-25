// usage: node vec-diff.mjs <old.json> <new.json> -> which top-level keys differ
import fs from 'node:fs';
const a = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), b = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) console.log(k, JSON.stringify(a[k]) === JSON.stringify(b[k]) ? 'same' : 'DIFFERENT');
