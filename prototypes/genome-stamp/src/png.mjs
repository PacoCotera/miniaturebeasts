// Minimal PNG writer/reader for Node (zlib only), carried over from the genome-ring prototype. Images are
// {width, height, data: Uint8ClampedArray RGBA}.
import { deflateSync, inflateSync } from "node:zlib";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

// gray: write 8-bit greyscale (smaller; used for monochrome prints). dpi: pHYs.
export function encodePNG(img, { gray = false, dpi } = {}) {
  const { width: w, height: h, data } = img;
  const ch = gray ? 1 : 3;
  const raw = Buffer.alloc((w * ch + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * ch + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, o = y * (w * ch + 1) + 1 + x * ch;
      if (gray) raw[o] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      else { raw[o] = data[i]; raw[o + 1] = data[i + 1]; raw[o + 2] = data[i + 2]; }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = gray ? 0 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr)];
  if (dpi) {
    const p = Buffer.alloc(9);
    const ppm = Math.round(dpi / 0.0254);
    p.writeUInt32BE(ppm, 0); p.writeUInt32BE(ppm, 4); p[8] = 1;
    parts.push(chunk("pHYs", p));
  }
  parts.push(chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(parts);
}

export function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let p = 8, w, h, depth, type, palette, trns;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type4 = buf.toString("ascii", p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type4 === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; type = d[9]; if (d[12]) throw new Error("interlaced PNG not supported"); }
    else if (type4 === "PLTE") palette = d;
    else if (type4 === "tRNS") trns = d;
    else if (type4 === "IDAT") idat.push(d);
    else if (type4 === "IEND") break;
    p += 12 + len;
  }
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  const bpp = Math.max(1, (ch * depth) >> 3);
  const stride = Math.ceil((w * ch * depth) / 8);
  const raw = inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = px.subarray(y * stride, (y + 1) * stride), prev = y ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? row[x - bpp] : 0, b = prev ? prev[x] : 0, c = prev && x >= bpp ? prev[x - bpp] : 0;
      let v = src[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      row[x] = v & 0xff;
    }
  }
  const data = new Uint8ClampedArray(w * h * 4);
  const sample = (y, i) => {
    if (depth === 8) return px[y * stride + i];
    if (depth === 16) return px[y * stride + 2 * i];
    const bit = i * depth, byte = px[y * stride + (bit >> 3)];
    return (byte >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
  };
  const scale = depth < 8 && type !== 3 ? 255 / ((1 << depth) - 1) : 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (type === 3) {
        const i = sample(y, x);
        data[o] = palette[i * 3]; data[o + 1] = palette[i * 3 + 1]; data[o + 2] = palette[i * 3 + 2];
        data[o + 3] = trns && i < trns.length ? trns[i] : 255;
      } else {
        const s = (k) => sample(y, x * ch + k) * scale;
        if (ch <= 2) { data[o] = data[o + 1] = data[o + 2] = s(0); data[o + 3] = ch === 2 ? s(1) : 255; }
        else { data[o] = s(0); data[o + 1] = s(1); data[o + 2] = s(2); data[o + 3] = ch === 4 ? s(3) : 255; }
      }
    }
  return { width: w, height: h, data };
}
