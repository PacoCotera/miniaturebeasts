// Bytes and text for the realm's keys and files: base64url (no padding), hex, UTF-8. Pure; the browser and Node both run it as it stands.
const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const IDX = new Map([...A].map((c, i) => [c, i]));

export const utf8 = (s) => new TextEncoder().encode(s);
export const unutf8 = (b) => new TextDecoder("utf-8", { fatal: true }).decode(b);

export function b64uEncode(bytes) {
  let out = "", i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += A[n >> 18] + A[(n >> 12) & 63] + A[(n >> 6) & 63] + A[n & 63];
  }
  if (bytes.length - i === 1) { const n = bytes[i] << 16; out += A[n >> 18] + A[(n >> 12) & 63]; }
  else if (bytes.length - i === 2) { const n = (bytes[i] << 16) | (bytes[i + 1] << 8); out += A[n >> 18] + A[(n >> 12) & 63] + A[(n >> 6) & 63]; }
  return out;
}

// Strict: the URL alphabet only, no padding, and the unused trailing bits are zero, so each byte string has exactly one spelling. Throws on anything else.
export function b64uDecode(s) {
  if (typeof s !== "string") throw new Error("base64url: not a string");
  if (s.length % 4 === 1) throw new Error("base64url: bad length");
  const out = new Uint8Array(Math.floor(s.length * 3 / 4));
  let acc = 0, bits = 0, o = 0;
  for (const c of s) {
    const v = IDX.get(c);
    if (v === undefined) throw new Error("base64url: bad character");
    acc = (acc << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (acc >> bits) & 255; acc &= (1 << bits) - 1; }
  }
  if (acc !== 0) throw new Error("base64url: stray bits");
  return out;
}

export function hexEncode(bytes) {
  let s = ""; for (const b of bytes) s += (b < 16 ? "0" : "") + b.toString(16); return s;
}

export function hexDecode(s) {
  if (typeof s !== "string" || s.length % 2 || /[^0-9a-f]/.test(s)) throw new Error("hex: bad text");
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(2 * i, 2 * i + 2), 16);
  return out;
}

export function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}
