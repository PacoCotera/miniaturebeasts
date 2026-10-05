// Local review service: LAN is opt-in; no authentication, permissions or rewards.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ShareError, publishRecord, readPublicRecord, publicLinks, qrSvg } from './share.mjs';
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ...['index', 'review'].map(name => [`/${name}.html`, [`${name}.html`, 'text/html; charset=utf-8']]),
  ...['app', 'genetics', 'store', 'art', 'review', 'share-lifecycle', 'idle-controller', 'research-view', 'ancestry-view'].map(name => [`/${name}.mjs`, [`${name}.mjs`, 'text/javascript; charset=utf-8']]),
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/lab/', ['lab/index.html', 'text/html; charset=utf-8']],
  ['/lab/style.css', ['lab/style.css', 'text/css; charset=utf-8']],
  ['/transfer/', ['transfer/browser/index.html', 'text/html; charset=utf-8']],
  ['/transfer/browser/style.css', ['transfer/browser/style.css', 'text/css; charset=utf-8']],
  ['/transfer/browser/observations.json', ['transfer/browser/observations.json', 'application/json; charset=utf-8']],
  ...['host', 'render', 'font', 'input'].map(name => [`/transfer/browser/${name}.mjs`, [`transfer/browser/${name}.mjs`, 'text/javascript; charset=utf-8']]),
  ...['presentation-controller', 'presentation-view', 'presentation-data'].map(name => [`/transfer/${name}.mjs`, [`transfer/${name}.mjs`, 'text/javascript; charset=utf-8']]),
  ...['content', 'domain', 'repository', 'controller', 'view', 'render', 'finding-assets', 'host'].map(name => [`/lab/${name}.mjs`, [`lab/${name}.mjs`, 'text/javascript; charset=utf-8']]),
  ...['renderer', 'font', 'assets'].map(name => [`/pixel/${name}.mjs`, [`pixel/${name}.mjs`, 'text/javascript; charset=utf-8']]),
]);
const defaultData = fileURLToPath(new URL('.data/', import.meta.url));
function originSetting(value) {
  if (!value) return null;
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error('CRITTER_PUBLIC_ORIGIN must be an http(s) origin only');
  return parsed.origin;
}
async function readJson(request) {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] || '')) throw new ShareError('Content-Type must be application/json', 415);
  const chunks = []; let bytes = 0;
  for await (const chunk of request) { bytes += chunk.length; if (bytes > 24576) throw new ShareError('Snapshot too large', 413); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new ShareError('Malformed JSON'); }
}
export function createPrototypeServer({ dataDirectory = defaultData, publicOrigin = null } = {}) {
  publicOrigin = originSetting(publicOrigin);
  return createServer(async (request, response) => {
    const send = (status, body, type = 'application/json; charset=utf-8') => {
      response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
      response.end(request.method === 'HEAD' ? undefined : typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
    };
    try {
      const host = request.headers.host;
      const allowed = new Set([`127.0.0.1:${request.socket.localPort}`, `localhost:${request.socket.localPort}`]);
      if (publicOrigin) allowed.add(new URL(publicOrigin).host);
      if (!allowed.has(host)) throw new ShareError('Unrecognized host', 403);
      const requestOrigin = `http://${host}`;
      const path = new URL(request.url, requestOrigin).pathname;
      const outputOrigin = publicOrigin || requestOrigin;
      if (path === '/api/specimens' && request.method === 'POST') {
        if (request.headers.origin !== requestOrigin || ['cross-site', 'same-site'].includes(request.headers['sec-fetch-site'])) throw new ShareError('Same-origin publication required', 403);
        const result = await publishRecord(dataDirectory, await readJson(request));
        send(result.created ? 201 : 200, publicLinks(result.record, outputOrigin)); return;
      }
      if (!['GET', 'HEAD'].includes(request.method)) { response.setHeader('Allow', 'GET, HEAD'); throw new ShareError('Method not allowed', 405); }
      const match = path.match(/^\/api\/specimens\/([^/]+)(\/qr\.svg)?$/);
      if (match) {
        let id; try { id = decodeURIComponent(match[1]); } catch { throw new ShareError('Malformed specimen ID'); }
        const record = await readPublicRecord(dataDirectory, id);
        const result = publicLinks(record, outputOrigin);
        if (match[2]) send(200, await qrSvg(result.url), 'image/svg+xml'); else send(200, result);
        return;
      }
      const file = files.get(path);
      if (!file) throw new ShareError('Not found', 404);
      send(200, await readFile(fileURLToPath(new URL(file[0], import.meta.url))), file[1]);
    } catch (error) {
      send(error instanceof ShareError ? error.status : 500, { error: error instanceof ShareError ? error.message : 'Local prototype storage or server error' });
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.CRITTER_PORT || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid CRITTER_PORT');
  const host = process.env.CRITTER_HOST || '127.0.0.1';
  const server = createPrototypeServer({ publicOrigin: process.env.CRITTER_PUBLIC_ORIGIN });
  server.listen(port, host, () => console.log(`Critter Lab experiment: ${process.env.CRITTER_PUBLIC_ORIGIN || `http://${host}:${port}`}`));
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
}
