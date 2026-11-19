// Browser stand-ins for the node modules the place bake chain imports (bakeset: node:crypto; setload, png: node:fs, node:path, node:url, node:module; setload: ajv), so the page loads from the source tree in a browser.
// Used by bank-stills.mjs only: the server rewrites `from 'node:x'` / `from 'ajv'` in served .mjs files to /__shim/<name>.mjs. Not part of the game.
// fs reads go to the same server by a synchronous request; paths are the tree's own, so the tree root is the server root.
export const SHIM_NAMES = ["crypto", "fs", "path", "url", "module", "ajv"];
export const shimSource = (name, root) => ({
  crypto: `export const createHash = () => { let a = 0x811c9dc5, b = 0x1b873593, n = 0; const o = { update(d) { for (let i = 0; i < d.length; i++) { a = Math.imul(a ^ d[i], 16777619) >>> 0; b = Math.imul(b + d[i] + i, 2246822519) >>> 0; } n += d.length; return o; }, digest() { return [a, b, n >>> 0].map((v) => v.toString(16).padStart(8, '0')).join(''); } }; return o; };`,
  fs: `const ROOT = ${JSON.stringify(root)};
export const readFileSync = (p, enc) => { const s = String(p), rel = s.startsWith(ROOT) ? s.slice(ROOT.length) : s, x = new XMLHttpRequest(); x.open('GET', rel, false); x.overrideMimeType('text/plain; charset=x-user-defined'); x.send();
  if (x.status !== 200) throw new Error('ENOENT ' + s); const t = x.responseText; if (enc) return new TextDecoder().decode(Uint8Array.from(t, (c) => c.charCodeAt(0) & 255)); return Uint8Array.from(t, (c) => c.charCodeAt(0) & 255); };
export const writeFileSync = () => { throw new Error('no writes in the browser'); };
export const existsSync = (p) => { try { readFileSync(p); return true; } catch { return false; } };`,
  path: `const norm = (p) => { const out = []; for (const s of p.split('/')) { if (s === '' || s === '.') continue; if (s === '..') out.pop(); else out.push(s); } return (p.startsWith('/') ? '/' : '') + out.join('/'); };
export const join = (...a) => norm(a.join('/')); export const resolve = (...a) => norm(a.join('/')); export const dirname = (p) => p.replace(/\\/[^/]*$/, '') || '/'; export const basename = (p) => p.split('/').pop(); export const extname = (p) => (p.match(/\\.[^./]*$/) || [''])[0];
export default { join, resolve, dirname, basename, extname };`,
  url: `export const fileURLToPath = (u) => ${JSON.stringify(root)} + new URL(u).pathname; export const pathToFileURL = (p) => new URL('file://' + p);`,
  module: `export const createRequire = () => (n) => { if (n === 'pngjs') return { PNG: {} }; throw new Error('require ' + n + ' is not in the browser'); };`,   // png.mjs reads pngjs at load; the page only uses its crop
  ajv: `export default class Ajv { compile() { return () => true; } }`,
})[name];
export const rewrite = (src) => src.replace(/(from\s+|import\s*\(\s*)(['"])(?:node:(crypto|fs|path|url|module)|(ajv))\2/g, (m, pre, q, n, aj) => `${pre}${q}/__shim/${n || aj}.mjs${q}`);
