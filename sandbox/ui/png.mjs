// PNG, 8 bits a channel, not interlaced: the one image format of the screen layer (assets, atlases, journey
// captures). Runs in Node and in the browser's module scope (zlib from node:zlib in Node only; the page decodes
// through the browser's own image decoder and never calls these).
import { deflateSync, inflateSync } from "node:zlib";

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type, "ascii"), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body)); return Buffer.concat([len, body, crc]); };

// RGBA bytes (w*h*4) to a PNG file.
export function encodePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer ?? rgba, rgba.byteOffset ?? 0, w * h * 4).copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([SIG, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// A PNG file (gray, gray+alpha, RGB or RGBA at 8 bits, or indexed at 1, 2, 4 or 8 bits with its tRNS alpha) to { width, height, data: Uint8ClampedArray RGBA }.
export function decodePNG(buf) {
  buf = Buffer.from(buf);
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error("not a PNG");
  let pos = 8, w = 0, h = 0, depth = 0, type = 0, interlace = 0, plte = null, trns = null; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), kind = buf.toString("ascii", pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len); pos += 12 + len;
    if (kind === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; type = data[9]; interlace = data[12]; }
    else if (kind === "PLTE") plte = Buffer.from(data);
    else if (kind === "tRNS") trns = Buffer.from(data);
    else if (kind === "IDAT") idat.push(data);
    else if (kind === "IEND") break;
  }
  if (interlace) throw new Error("only non-interlaced PNG");
  if (type === 3 ? ![1, 2, 4, 8].includes(depth) || !plte : depth !== 8) throw new Error(type === 3 ? "an indexed PNG needs its palette at 1, 2, 4 or 8 bits" : "only 8-bit PNG");
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type]; if (!ch) throw new Error("PNG colour type " + type);
  const raw = inflateSync(Buffer.concat(idat)), bpp = Math.max(1, (ch * depth) >> 3), stride = type === 3 ? Math.ceil((w * depth) / 8) : w * ch, px = Buffer.alloc(stride * h);
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
