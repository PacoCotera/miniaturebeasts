// Browser-side export helpers with no dependencies: CRC-32, a PNG encoder that uses stored
// (uncompressed) deflate blocks so the bytes are deterministic in every browser, Adler-32, and a
// zip writer with stored entries. The Node CLI compresses its PNGs; the pixels are the same bytes.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
export function crc32(bytes, seed = 0xffffffff) {
  let c = seed;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function be32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
function le32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
function le16(n) { return [n & 255, (n >>> 8) & 255]; }
const ascii = (s) => Array.from(s, (ch) => ch.charCodeAt(0));

function storedDeflate(raw) {
  const out = [0x78, 0x01];
  for (let p = 0; p < raw.length || p === 0; p += 65535) {
    const len = Math.min(65535, raw.length - p);
    const last = p + len >= raw.length ? 1 : 0;
    out.push(last, len & 255, len >>> 8, ~len & 255, (~len >>> 8) & 255);
    for (let i = 0; i < len; i++) out.push(raw[p + i]);
    if (raw.length === 0) break;
  }
  let a = 1, b = 0;
  for (let i = 0; i < raw.length; i++) { a = (a + raw[i]) % 65521; b = (b + a) % 65521; }
  out.push(...be32(((b << 16) | a) >>> 0));
  return Uint8Array.from(out);
}
function chunk(type, data) {
  const td = new Uint8Array(4 + data.length);
  td.set(ascii(type), 0); td.set(data, 4);
  return [...be32(data.length), ...td, ...be32(crc32(td))];
}
// {width, height, data: RGBA} → PNG bytes (8-bit RGB, stored deflate).
export function encodePNG(img) {
  const { width: w, height: h, data } = img;
  const raw = new Uint8Array((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = data[i]; raw[o + 1] = data[i + 1]; raw[o + 2] = data[i + 2]; }
  }
  const ihdr = new Uint8Array([...be32(w), ...be32(h), 8, 2, 0, 0, 0]);
  return Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, ...chunk("IHDR", ihdr), ...chunk("IDAT", storedDeflate(raw)), ...chunk("IEND", new Uint8Array(0))]);
}
// entries: [{name, bytes}] → zip bytes (stored).
export function zip(entries) {
  const parts = [], central = [];
  let offset = 0;
  for (const { name, bytes } of entries) {
    const n = new TextEncoder().encode(name), crc = crc32(bytes);
    const local = [...le32(0x04034b50), ...le16(20), ...le16(0x0800), ...le16(0), ...le16(0), ...le16(0x21), ...le32(crc), ...le32(bytes.length), ...le32(bytes.length), ...le16(n.length), ...le16(0), ...n];
    parts.push(Uint8Array.from(local), bytes);
    central.push(Uint8Array.from([...le32(0x02014b50), ...le16(20), ...le16(20), ...le16(0x0800), ...le16(0), ...le16(0), ...le16(0x21), ...le32(crc), ...le32(bytes.length), ...le32(bytes.length), ...le16(n.length), ...le16(0), ...le16(0), ...le16(0), ...le16(0), ...le32(0), ...le32(offset), ...n]));
    offset += local.length + bytes.length;
  }
  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const end = Uint8Array.from([...le32(0x06054b50), ...le16(0), ...le16(0), ...le16(entries.length), ...le16(entries.length), ...le32(centralSize), ...le32(offset), ...le16(0)]);
  const total = parts.concat(central, [end]);
  const out = new Uint8Array(total.reduce((s, p) => s + p.length, 0));
  let p = 0;
  for (const part of total) { out.set(part, p); p += part.length; }
  return out;
}
export async function sha256(bytes) {
  if (globalThis.crypto?.subtle) { const d = await crypto.subtle.digest("SHA-256", bytes); return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
  return null;
}
export function download(name, bytes, type = "application/octet-stream") {
  const blob = new Blob([bytes], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
