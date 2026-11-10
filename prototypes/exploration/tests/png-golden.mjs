// Page stills as golden PNGs. The page's fake canvas keeps palette indices; a still is written as an 8-bit RGB PNG (so it can be
// looked at) and compared by decoded pixels. UPDATE_GOLDEN=1 writes the files instead of comparing.
//   import { goldenStill } from "./png-golden.mjs";   goldenStill(assert, p, "swap-one-pod.png")
import { deflateSync, inflateSync } from "node:zlib";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const o = Buffer.alloc(12 + data.length); o.writeUInt32BE(data.length, 0); o.write(type, 4, "latin1"); data.copy(o, 8); o.writeUInt32BE(crc(o.subarray(4, 8 + data.length)), 8 + data.length); return o; };

export function encodeRGB(rgb, w, h) {
  const raw = Buffer.alloc(h * (w * 3 + 1)); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
export function decodeRGB(buf) {   // our own files only: 8-bit RGB, filter 0
  let p = 8, w = 0, h = 0; const idat = [];
  while (p < buf.length) { const n = buf.readUInt32BE(p), type = buf.toString("latin1", p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + n);
    if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); } else if (type === "IDAT") idat.push(d); p += 12 + n; }
  const raw = inflateSync(Buffer.concat(idat)), out = Buffer.alloc(w * h * 3); for (let y = 0; y < h; y++) raw.copy(out, y * w * 3, y * (w * 3 + 1) + 1, (y + 1) * (w * 3 + 1));
  return { w, h, rgb: out };
}

// The page's screen (450×600 palette indices) as RGB.
export function stillOf(p) {
  const scr = p.run("scr"), px = scr.px(), rgb = p.rgbTable ? p.rgbTable() : p.run("RGB"), w = scr.width, h = scr.height, out = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) { const c = rgb[px[i] < 0 ? 0 : px[i]]; out[i * 3] = c[0]; out[i * 3 + 1] = c[1]; out[i * 3 + 2] = c[2]; }
  return { w, h, rgb: out };
}

export function goldenStill(assert, p, name) {
  const file = new URL("./golden/" + name, import.meta.url), img = stillOf(p);
  if (process.env.UPDATE_GOLDEN || !existsSync(file)) { mkdirSync(new URL("./golden/", import.meta.url), { recursive: true }); writeFileSync(file, encodeRGB(img.rgb, img.w, img.h)); return; }
  const g = decodeRGB(readFileSync(file)); assert.equal(g.w, img.w); assert.equal(g.h, img.h);
  let diff = 0; for (let i = 0; i < g.rgb.length; i++) if (g.rgb[i] !== img.rgb[i]) diff++;
  assert.equal(diff, 0, name + ": " + diff + " bytes differ from the golden");
}
