// Exact PNG pixels from the file's own bytes, never through a canvas. A browser may colour-manage a PNG (gAMA / iCCP / sRGB) or farble canvas read-back
// (Brave, Firefox resistFingerprinting, Samsung Internet, DuckDuckGo); reading the bytes ourselves cannot be altered. Ancillary chunks are ignored on purpose.
// Supports non-interlaced 8-bit grey (0), RGB (2), indexed with PLTE/tRNS (3), grey+alpha (4), RGBA (6). Anything else throws a named error (err.code === 'png-unsupported').
import { fetchOk, loadImg } from './render/fetchretry.mjs';

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
const unsupported = why => { const e = new Error('png: ' + why); e.code = 'png-unsupported'; return e; };
export const canInflate = () => typeof DecompressionStream !== 'undefined';

async function inflate(bytes) {
  const ds = new DecompressionStream('deflate'), w = ds.writable.getWriter();
  w.write(bytes).catch(() => {}); w.close().catch(() => {});
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}

// bytes: Uint8Array of a .png. Returns { width, height, data: Uint8ClampedArray RGBA, straight alpha }.
export async function decodePng(bytes) {
  if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
  for (let i = 0; i < 8; i++) if (bytes[i] !== SIG[i]) throw unsupported('not a PNG');
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), idat = [];
  let w = 0, h = 0, depth = 0, ctype = -1, interlace = 0, plte = null, trns = null, o = 8, sawEnd = false;
  while (o + 8 <= bytes.length) {
    const n = dv.getUint32(o), t = String.fromCharCode(bytes[o + 4], bytes[o + 5], bytes[o + 6], bytes[o + 7]), body = bytes.subarray(o + 8, o + 8 + n);
    if (o + 12 + n > bytes.length) throw unsupported('truncated ' + t);
    if (t === 'IHDR') { w = dv.getUint32(o + 8); h = dv.getUint32(o + 12); depth = bytes[o + 16]; ctype = bytes[o + 17]; interlace = bytes[o + 20]; }
    else if (t === 'PLTE') plte = body; else if (t === 'tRNS') trns = body; else if (t === 'IDAT') idat.push(body);
    else if (t === 'IEND') { sawEnd = true; break; }
    o += 12 + n;
  }
  if (!sawEnd || !w || !h) throw unsupported('no image data');
  if (interlace) throw unsupported('interlaced');
  const chans = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  if (!chans) throw unsupported('colour type ' + ctype);
  if (depth !== 8) throw unsupported('bit depth ' + depth);
  if (ctype === 3 && !plte) throw unsupported('indexed without PLTE');
  let total = 0; for (const c of idat) total += c.length;
  const z = new Uint8Array(total); let p = 0; for (const c of idat) { z.set(c, p); p += c.length; }
  const raw = await inflate(z), bpp = chans, stride = w * bpp;
  if (raw.length < (stride + 1) * h) throw unsupported('short image data');
  const cur = new Uint8Array(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride, up = dst - stride;
    for (let x = 0; x < stride; x++) {
      const v = raw[src + x], a = x >= bpp ? cur[dst + x - bpp] : 0, b = y ? cur[up + x] : 0, c = x >= bpp && y ? cur[up + x - bpp] : 0;
      let r;
      if (f === 0) r = v; else if (f === 1) r = v + a; else if (f === 2) r = v + b; else if (f === 3) r = v + ((a + b) >> 1);
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      else throw unsupported('filter ' + f);
      cur[dst + x] = r & 255;
    }
  }
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0, n = w * h; i < n; i++) {
    const s = i * bpp, d = i * 4;
    if (ctype === 6) { data[d] = cur[s]; data[d + 1] = cur[s + 1]; data[d + 2] = cur[s + 2]; data[d + 3] = cur[s + 3]; }
    else if (ctype === 2) { data[d] = cur[s]; data[d + 1] = cur[s + 1]; data[d + 2] = cur[s + 2]; data[d + 3] = 255; }
    else if (ctype === 0) { data[d] = data[d + 1] = data[d + 2] = cur[s]; data[d + 3] = 255; }
    else if (ctype === 4) { data[d] = data[d + 1] = data[d + 2] = cur[s]; data[d + 3] = cur[s + 1]; }
    else { const k = cur[s]; if (k * 3 + 2 >= plte.length) throw unsupported('palette index ' + k); data[d] = plte[k * 3]; data[d + 1] = plte[k * 3 + 1]; data[d + 2] = plte[k * 3 + 2]; data[d + 3] = trns && k < trns.length ? trns[k] : 255; }
  }
  return { width: w, height: h, data };
}

// The page's one exact reader: the file's bytes decoded here; only when DecompressionStream is missing (or the PNG is a kind we do not read) the canvas path of before,
// with env.canvas(im) -> { width, height, data } supplied by the page. The error line names the cause. env: { fetch, pause, Image, inflate (tests), canvas }.
export async function readPixels(url, env = {}) {
  const can = env.inflate === undefined ? canInflate() : env.inflate;
  if (can) {
    try { const res = await fetchOk(url, env); return await decodePng(new Uint8Array(await res.arrayBuffer())); }
    catch (e) { if (e && e.code !== 'png-unsupported') throw e; if (!env.canvas) throw e; env.cause = e.message; }
  } else env.cause = 'no DecompressionStream';
  if (!env.canvas) throw unsupported('no DecompressionStream and no canvas path');
  const im = await loadImg(url, env);
  return env.canvas(im);
}
