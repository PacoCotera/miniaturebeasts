// The art check (art guardrails, ratchet mode). One step of the release CI's small check; the push hook runs the same file.
//   node .github/art-check.mjs [--base REF] [--head REF] [--site DIR]      (defaults: HEAD^1 and HEAD, the pull request's merge commit)
//   node .github/art-check.mjs --list [--head REF]                         every shipped image at REF as "<sha256> <path>"
// It fails when
//   1. a shipped image is added or changed against the base and its sha256 is not in art/signed.json (written only by the art desk's export), or
//   2. a render module gains a canvas drawing call (fillRect, arc, ellipse, lineTo, bezierCurveTo, putImageData, createImageData) beyond what art/draws.json allows, or
//   3. with --site: an image in the assembled site is neither signed nor byte-identical to an image already in the base.
// Ratchet: what is already in the base is not looked at; the whole-set refusal switches on when the art desk's repaint list is empty.
// It reads git objects only, so it works on the CI's sparse checkout. A new folder that ships images is added to SHIPPED below.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const IMAGE = /\.(png|jpe?g|webp|gif|svg|avif|ico)$/i;
const SHIPPED = /^(website\/|prototypes\/|art\/companion-48\/terrain\/meadow\/|art\/places\/)/;
const NOT_SHIPPED = /(^|\/)(tests?|fixtures|golden|node_modules|dist)\//;   // golden/ holds the tests' reference screenshots, not shipped art
const RENDER = /^prototypes\/(?!workbench\/)[^/]+\/(index\.html|src\/.+\.(mjs|js))$/;
const PRIMITIVES = ['fillRect', 'arc', 'ellipse', 'lineTo', 'bezierCurveTo', 'putImageData', 'createImageData'];
const PRIM_RE = Object.fromEntries(PRIMITIVES.map((p) => [p, new RegExp(`\\b${p}\\s*\\(`, 'g')]));

let CWD = process.cwd();
const git = (args, opts = {}) => execFileSync('git', args, { maxBuffer: 1 << 30, cwd: CWD, ...opts });
const gitText = (args) => git(args, { encoding: 'utf8' });
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const inScope = (p) => IMAGE.test(p) && SHIPPED.test(p) && !NOT_SHIPPED.test(p);

function show(ref, p) { try { return git(['show', `${ref}:${p}`], { stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; } }

function blobIds(ref) {          // path -> git blob id for every tracked file at ref (cheap: no content is read)
  const out = gitText(['ls-tree', '-r', '-z', ref]), m = new Map();
  for (const rec of out.split('\0')) { if (!rec) continue; const tab = rec.indexOf('\t'); m.set(rec.slice(tab + 1), rec.slice(0, tab).split(' ')[2]); }
  return m;
}

export function check({ base, head, site, cwd }) {
  if (cwd) CWD = cwd;
  const problems = [];
  const signedRaw = show(head, 'art/signed.json');
  if (!signedRaw) return [`art/signed.json is missing at ${head}: the signed list is exported by the art desk (sign.py export)`];
  const signed = new Set(JSON.parse(signedRaw.toString()).signed.map((e) => e.sha256));
  const baseBlobs = blobIds(base), baseBlobSet = new Set(baseBlobs.values());
  const raw = gitText(['diff', '--raw', '--no-abbrev', '--no-renames', '-z', base, head]).split('\0');
  const changed = [];
  for (let i = 0; i + 1 < raw.length; i += 2) { if (!raw[i]) break; const f = raw[i].split(' '); changed.push({ status: f[4][0], blob: f[3], path: raw[i + 1] }); }
  // 1. images
  for (const c of changed) {
    if (c.status === 'D' || !inScope(c.path)) continue;
    if (baseBlobSet.has(c.blob)) continue;                        // byte-identical to an image already in the base (a move or a copy)
    const buf = show(head, c.path);
    if (!signed.has(sha256(buf))) problems.push(`unsigned image ${c.status === 'A' ? 'added' : 'changed'}: ${c.path} (sha256 ${sha256(buf).slice(0, 12)} is not in art/signed.json)`);
  }
  // 2. drawing calls
  const drawsRaw = show(head, 'art/draws.json'), allowed = new Map();
  if (drawsRaw) for (const s of JSON.parse(drawsRaw.toString()).sites || []) allowed.set(`${s.file}|${s.primitive}`, (allowed.get(`${s.file}|${s.primitive}`) || 0) + (s.count || 1));
  for (const c of changed) {
    if (c.status === 'D' || !RENDER.test(c.path) || NOT_SHIPPED.test(c.path)) continue;
    const now = show(head, c.path).toString('utf8'), was = (show(base, c.path) || Buffer.alloc(0)).toString('utf8');
    for (const p of PRIMITIVES) {
      const n = (now.match(PRIM_RE[p]) || []).length, b = (was.match(PRIM_RE[p]) || []).length;
      if (n > b && n > (allowed.get(`${c.path}|${p}`) || 0)) problems.push(`new drawing call in a render module: ${c.path} has ${n} ${p}() (base ${b}); a drawing call goes on art/draws.json through the art desk, or the picture is signed art`);
    }
  }
  // 3. the assembled site
  if (site) {
    const files = [], walk = (d) => { for (const e of readdirSync(d)) { if (e === 'node_modules') continue; const f = path.join(d, e); statSync(f).isDirectory() ? walk(f) : IMAGE.test(f) && !NOT_SHIPPED.test(path.relative(site, f)) && files.push(f); } };
    walk(site);
    for (const f of files) {
      const buf = readFileSync(f);
      if (signed.has(sha256(buf))) continue;
      const blob = execFileSync('git', ['hash-object', '--stdin'], { input: buf, encoding: 'utf8', cwd: CWD }).trim();
      if (!baseBlobSet.has(blob)) problems.push(`unsigned image in the built site: ${path.relative(site, f)} (sha256 ${sha256(buf).slice(0, 12)})`);
    }
  }
  return problems;
}

function listImages(ref) {
  const out = [];
  for (const [p, blob] of blobIds(ref)) if (inScope(p)) out.push(`${sha256(git(['cat-file', 'blob', blob]))} ${p}`);
  return out.sort((a, b) => a.split(' ')[1].localeCompare(b.split(' ')[1]));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2), take = (f, d) => { const i = args.indexOf(f); return i < 0 ? d : args[i + 1]; };
  const head = take('--head', 'HEAD'), base = take('--base', 'HEAD^1'), site = take('--site', null);
  // no process.exit() after output: it can cut a large write to a pipe short
  if (args.includes('--list')) process.stdout.write(listImages(head).join('\n') + '\n');
  else {
    const t = Date.now(), problems = check({ base, head, site });
    for (const p of problems) console.error('art check: ' + p);
    console.log(`art check: ${problems.length ? 'FAILED, ' + problems.length + ' problem(s)' : 'ok'} (${base.slice(0, 12)}..${head.slice(0, 12)}, ${((Date.now() - t) / 1000).toFixed(1)} s)`);
    process.exitCode = problems.length ? 1 : 0;
  }
}
