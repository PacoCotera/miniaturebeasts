// The recovery key the Caddy prints. 35 bytes: version 01, the 32-byte seed, and a check (the first 2 bytes of SHA-256 of the version and seed). That is 56 characters of
// Crockford base32, printed as "MBRK" and 14 groups of 4 joined by hyphens (7 lines of 2 groups). Reading it back ignores case, hyphens, spaces and the word MBRK, and reads
// I and L as 1 and O as 0. The seed makes an Ed25519 pair; its public key and `kid` (the first 4 base32 characters of SHA-256 of the public key) go in a sleep file's header.
import { b64uDecode, bytesEqual } from "./b64.mjs";
import { sha256, pubFromSeed } from "./keys.mjs";

const ALPHA = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const VERSION = 1;
export const CHARS = 56;

export function base32(bytes) {
  let out = "", acc = 0, bits = 0;
  for (const b of bytes) {
    acc = (acc << 8) | b; bits += 8;
    while (bits >= 5) { bits -= 5; out += ALPHA[(acc >> bits) & 31]; }
    acc &= (1 << bits) - 1;
  }
  if (bits) out += ALPHA[(acc << (5 - bits)) & 31];
  return out;
}

// Crockford reading of one character: case folds, I and L are 1, O is 0. -1 for anything not in the alphabet (U included).
export function base32Value(c) {
  c = c.toUpperCase();
  if (c === "I" || c === "L") c = "1"; else if (c === "O") c = "0";
  return ALPHA.indexOf(c);
}

function unbase32(text) {
  const out = []; let acc = 0, bits = 0;
  for (const c of text) {
    const v = base32Value(c); if (v < 0) return null;
    acc = (acc << 5) | v; bits += 5;
    if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 255); acc &= (1 << bits) - 1; }
  }
  return Uint8Array.from(out);
}

async function checkOf(seed) {
  const body = new Uint8Array(33); body[0] = VERSION; body.set(seed, 1);
  return { body, check: (await sha256(body)).slice(0, 2) };
}

async function raw35(seed) {
  if (!(seed instanceof Uint8Array) || seed.length !== 32) throw new Error("recovery: a seed is 32 bytes");
  const { body, check } = await checkOf(seed);
  const all = new Uint8Array(35); all.set(body); all.set(check, 33);
  return all;
}

// "MBRK 7Q4X-XXXX-…" for a 32-byte seed.
export async function formatRecovery(seed) {
  const s = base32(await raw35(seed));
  return "MBRK " + s.match(/.{4}/g).join("-");
}

// The same text broken for the print: 7 lines of 2 groups; the first line starts with MBRK.
export async function recoveryLines(seed) {
  const g = (await formatRecovery(seed)).slice(5).split("-"), lines = [];
  for (let i = 0; i < g.length; i += 2) lines.push(g[i] + "-" + g[i + 1]);
  lines[0] = "MBRK " + lines[0];
  return lines;
}

// Reads what a person typed. { ok: true, seed } or { ok: false, why } with why one of "chars", "length", "version", "check".
export async function parseRecovery(text) {
  let t = String(text).toUpperCase().replace(/[\s-]+/g, "");
  if (t.startsWith("MBRK") && t.length === CHARS + 4) t = t.slice(4);
  if (t.length !== CHARS) return { ok: false, why: /[^0-9A-Z]/.test(t) ? "chars" : "length" };
  const bytes = unbase32(t);
  if (!bytes) return { ok: false, why: "chars" };
  if (bytes[0] !== VERSION) return { ok: false, why: "version" };
  const seed = bytes.slice(1, 33);
  const { check } = await checkOf(seed);
  if (!bytesEqual(check, bytes.slice(33))) return { ok: false, why: "check" };
  return { ok: true, seed };
}

// The recovery public key (base64url) the seed stands for.
export const recoveryPub = (seed) => pubFromSeed(seed);

// The key id: the first 4 Crockford base32 characters of SHA-256 of the 32 public-key bytes. `pub` is base64url.
export async function kid(pub) {
  return base32(await sha256(b64uDecode(pub))).slice(0, 4);
}
