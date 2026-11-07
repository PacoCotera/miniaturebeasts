// PNG, 8 bits a channel, not interlaced: the one image format of the screen layer (assets, atlases, journey
// captures), and the one decoder of the placed masters, the stand layers and the pod sheets on both sides: the page and the headless
// harness (prototypes/playtest) decode them here, so both hand the face the same pixels. Runs in Node (zlib) and in the page's module
// scope (the browser's DecompressionStream, through decodePNGAsync); encodePNG is Node's only.
const zlib = globalThis.process?.versions?.node ? await import("node:zlib") : null;

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type, "ascii"), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body)); return Buffer.concat([len, body, crc]); };

// RGBA bytes (w*h*4) to a PNG file (zlib level 9 unless another is asked: the layout check's overlays take 6). Node only.
export function encodePNG(w, h, rgba, level = 9) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer ?? rgba, rgba.byteOffset ?? 0, w * h * 4).copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([Buffer.from(SIG), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level })), chunk("IEND", Buffer.alloc(0))]);
}

const bytesOf = (buf) => (buf instanceof Uint8Array ? buf : ArrayBuffer.isView(buf) ? new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) : new Uint8Array(buf));
const u32 = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const ascii = (b, i, n) => String.fromCharCode(...b.subarray(i, i + n));
// The chunks of a PNG file: its header, its palette and transparency, and its image data joined (still deflated).
export function parsePNG(buf) {
  const b = bytesOf(buf);
  if (b.length < 8 || SIG.some((v, i) => b[i] !== v)) throw new Error("not a PNG");
  let pos = 8, w = 0, h = 0, depth = 0, type = 0, interlace = 0, plte = null, trns = null; const idat = [];
  while (pos < b.length) {
    const len = u32(b, pos), kind = ascii(b, pos + 4, 4), data = b.subarray(pos + 8, pos + 8 + len); pos += 12 + len;
    if (kind === "IHDR") { w = u32(data, 0); h = u32(data, 4); depth = data[8]; type = data[9]; interlace = data[12]; }
    else if (kind === "PLTE") plte = data.slice();
    else if (kind === "tRNS") trns = data.slice();
    else if (kind === "IDAT") idat.push(data);
    else if (kind === "IEND") break;
  }
  if (interlace) throw new Error("only non-interlaced PNG");
  if (type === 3 ? ![1, 2, 4, 8].includes(depth) || !plte : depth !== 8) throw new Error(type === 3 ? "an indexed PNG needs its palette at 1, 2, 4 or 8 bits" : "only 8-bit PNG");
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type]; if (!ch) throw new Error("PNG colour type " + type);
  const z = new Uint8Array(idat.reduce((n, d) => n + d.length, 0)); let o = 0; for (const d of idat) { z.set(d, o); o += d.length; }
  return { width: w, height: h, depth, type, ch, plte, trns, z };
}
// The inflated scanlines of a parsed PNG to { width, height, data: Uint8ClampedArray RGBA }.
export function unfilterPNG({ width: w, height: h, depth, type, ch, plte, trns }, raw) {
  const bpp = Math.max(1, (ch * depth) >> 3), stride = type === 3 ? Math.ceil((w * depth) / 8) : w * ch, px = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i], a = i >= bpp ? px[dst + i - bpp] : 0, b = y ? px[dst - stride + i] : 0, c = y && i >= bpp ? px[dst - stride + i - bpp] : 0;
      let v;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + b; else if (f === 3) v = x + ((a + b) >> 1);
      else { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      px[dst + i] = v & 255;
    }
  }
  const data = new Uint8ClampedArray(w * h * 4);
  if (type === 3) {
    const mask = (1 << depth) - 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const bit = x * depth, idx = (px[y * stride + (bit >> 3)] >> (8 - depth - (bit & 7))) & mask, d = (y * w + x) * 4;
      data[d] = plte[idx * 3]; data[d + 1] = plte[idx * 3 + 1]; data[d + 2] = plte[idx * 3 + 2]; data[d + 3] = trns && idx < trns.length ? trns[idx] : 255;
    }
    return { width: w, height: h, data };
  }
  for (let i = 0; i < w * h; i++) {
    const s = i * ch, d = i * 4;
    if (ch === 1) { data[d] = data[d + 1] = data[d + 2] = px[s]; data[d + 3] = 255; }
    else if (ch === 2) { data[d] = data[d + 1] = data[d + 2] = px[s]; data[d + 3] = px[s + 1]; }
    else { data[d] = px[s]; data[d + 1] = px[s + 1]; data[d + 2] = px[s + 2]; data[d + 3] = ch === 4 ? px[s + 3] : 255; }
  }
  return { width: w, height: h, data };
}
// A zlib stream inflated: Node's zlib, else the browser's DecompressionStream.
export async function inflate(z) {
  if (zlib) return zlib.inflateSync(z);
  return new Uint8Array(await new Response(new Blob([z]).stream().pipeThrough(new DecompressionStream("deflate"))).arrayBuffer());
}
// A PNG file (gray, gray+alpha, RGB or RGBA at 8 bits, or indexed at 1, 2, 4 or 8 bits with its tRNS alpha) to { width, height, data: Uint8ClampedArray RGBA }. Node only (zlib).
export function decodePNG(buf) { const p = parsePNG(buf); return unfilterPNG(p, zlib.inflateSync(p.z)); }
// The same anywhere: inflated now, the pixels made when first asked ({ width, height, rgba() }).
export async function decodePNGAsync(buf) {
  const p = parsePNG(buf), raw = await inflate(p.z); let data = null;
  return { width: p.width, height: p.height, rgba: () => data || (data = unfilterPNG(p, raw).data) };
}

// The 8-bit premultiplied round trip the page's pictures went through while the browser decoded them (a canvas stores colour premultiplied by alpha, 8 bits a
// channel, and reads it back divided): kept on both sides so the masters' pixels, and so every golden, stay as they were drawn. Colour is premultiplied as
// round(c·a/255) and read back as round(p·255/a), except the exact halves listed here, which the canvas rounded down (measured over every alpha and value:
// "<alpha>:<premultiplied values>", base 36). Alpha 0 reads back as black; alpha 255 is unchanged.
const DOWN = "6:1,5 c:2,a i:3 o:4,k u:1,5,7,9,b,d,f,h,j,l,n,p,t y:3,5,7,9,b,f,j,n,v 10:6 16:7,z 1c:8,14 1e:5,f,z,19 1i:9,19 1o:2,a,e,i,m,q,u,y,12,16,1a,1e,1m 1u:b 1w:6,a,e,i,m,u,12,1a,1q 1y:l 20:c 26:d,1t 2c:e,1y 2i:3,f,r,13,2f 2o:g,28 2s:a,u,1y,2i 2u:1,5,7,9,b,d,f,h,j,l,n,p,r,t,v,x,z,11,13,15,17,19,1b,1d,1h,1l,1p,1t,1x,21,25,29,2b,2d,2f,2h,2j,2l,2n,2p,2t 30:i,2i 32:x,25 36:j,2n 3a:1n 3c:4,k,s,10,18,1g,1o,1w,24,2c,2k,2s,38 3e:1p 3i:l 3m:13,2j 3o:m 3s:c,k,s,10,18,1o,24,2k,3g 3u:n 3w:16 40:o 46:5,p,19,1t,2d 4c:q,3m 4i:r 4o:s,3w 4q:b,n,17,1b,1f,1j,1n,1r,1v,1z,23,27,2b,2f,2j,2n 4u:t,41 50:6,u,1i,26,4u 56:v 5a:1l 5c:w,4g 5i:x,4l 5k:k,1o,3w,50 5m:2t 5o:2,a,e,i,m,q,u,y,12,16,1a,1e,1i,1m,1q,1u,1y,22,26,2a,2e,2i,2m,2q,2y,36,3e,3m,3u,42,4a,4i,4m,4q,4u,4y,52,56,5a,5e,5m 5u:7,l,z,1r,25,2j,3b,43,4v,59 5y:2z 60:10,50 64:1u,4a 66:11,33,55 6c:12,5a 6e:1x,4h 6i:13,5f 6k:3a 6m:l,25,3p,4h,59 6o:8,14,1k,20,2g,2w,3c,3s,48,4o,54,5k,6g 6s:3e 6u:15 6y:23,4v 70:16";
const UNPREMUL = (() => {
  const t = [new Uint8Array(1)], down = new Map(DOWN.split(" ").map((s) => { const [a, ps] = s.split(":"); return [parseInt(a, 36), new Set(ps.split(",").map((p) => parseInt(p, 36)))]; }));
  for (let a = 1; a < 256; a++) { const r = new Uint8Array(a + 1); for (let p = 0; p <= a; p++) r[p] = Math.min(255, Math.round((p * 255) / a) - (down.get(a)?.has(p) ? 1 : 0)); t.push(r); }
  return t;
})();
export function canvasRound(data) {
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]; if (a === 255) continue;
    const u = UNPREMUL[a]; for (let k = 0; k < 3; k++) data[i + k] = u[Math.round((data[i + k] * a) / 255)];
  }
  return data;
}
