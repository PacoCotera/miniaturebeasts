// Generator 7: the stored realm and the Station's handover (realm-time-spec-1 T4). One format for both: the cell realm (realm7's { seed, realm, regions, rounds }) as one byte string with its revision and digest.
//   packRealm(R)               -> Uint8Array   the blob
//   blobInfo(bytes)            -> { rev, seed, digest, size }    read from the header, nothing else touched
//   unpackRealm(bytes, { digest })  -> R       refuses a blob of another REALM_REV, a damaged one, or one whose digest is not the one asked for
//   loadRealm(bytes, opts)     unpackRealm + setRealm7: the generator then has the realm as if it had built it
//   realmDigest(R) -> number   FNV-1a (32 bits) over the whole realm, canonical: keys sorted, typed arrays by their bytes, whole numbers and floats by their text. Equal for a built and a loaded realm.
// The blob (all whole numbers little-endian; typed arrays are little-endian too, as on every device the game targets):
//   bytes 0-3   'MBRL'            bytes 4-7   format (1)       bytes 8-11  REALM_REV      bytes 12-15  digest
//   bytes 16-19 header length H   bytes 20-23 seed             then H bytes of the realm as JSON (ASCII; typed arrays are { "$a": "Float64Array", "i": n, "n": length }),
//   then the arrays' bytes, each starting on an 8-byte boundary from the start of the blob, in the order of "i".
// A Set is stored as { "$s": [...] } in the order it was filled. No Map, function or bigint is allowed in a realm: packing refuses one, so a later change that adds one is caught the day it is made.
import { REALM_REV, setRealm7 } from './region.mjs';

const FORMAT = 1, MAGIC = [77, 66, 82, 76];   // 'MBRL'
const TYPED = { Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array };
const kindOf = v => { const n = v && v.constructor && v.constructor.name; return TYPED[n] ? n : null; };

// keys the places hang on the realm as caches (streams.mjs flowClasses, a closure): derived from the rest, made again on first use, never stored and never in the digest
const DERIVED = ['flowClasses'];
const clean = R => { if (!DERIVED.some(k => R.realm && k in R.realm)) return R; const realm = { ...R.realm }; for (const k of DERIVED) delete realm[k]; return { ...R, realm }; };

// ---- the digest ----
export function realmDigest(R0) {
  const R = clean(R0); let h = 2166136261;
  const text = s => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i) & 255; h = Math.imul(h, 16777619); h ^= (s.charCodeAt(i) >> 8) & 255; h = Math.imul(h, 16777619); } };
  const walk = v => {
    if (v === undefined) return text('u;');
    if (v === null) return text('n;');
    const t = typeof v;
    if (t === 'number') return text('d' + (Object.is(v, -0) ? '-0' : String(v)) + ';');
    if (t === 'boolean') return text(v ? 't;' : 'f;');
    if (t === 'string') return text('s' + v.length + ':' + v + ';');
    const k = kindOf(v);
    if (k) { text('a' + k + v.length + ':'); const b = new Uint8Array(v.buffer, v.byteOffset, v.byteLength); for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 16777619); } return; }
    if (Array.isArray(v)) { text('[' + v.length + ':'); for (let i = 0; i < v.length; i++) walk(v[i]); return text(']'); }
    if (v instanceof Set) { text('S' + v.size + ':'); for (const x of v) walk(x); return text(';'); }   // a Set in the order it was filled
    if (t === 'object') { if (v instanceof Map) throw new Error('a realm holds no Map'); const ks = Object.keys(v).sort(); text('{' + ks.length + ':'); for (const key of ks) { text(key + '='); walk(v[key]); } return text('}'); }
    throw new Error('a realm holds no ' + t);
  };
  walk(R);
  return h >>> 0;
}

// ---- pack ----
export function packRealm(R0) {
  const R = clean(R0), arrays = [];
  const json = JSON.stringify(R, function (key, v) {
    const k = kindOf(v);
    if (k) { arrays.push(v); return { $a: k, i: arrays.length - 1, n: v.length }; }
    if (v instanceof Set) return { $s: [...v] };
    if (v instanceof Map) throw new Error('a realm holds no Map');
    if (typeof v === 'function' || typeof v === 'bigint') throw new Error('a realm holds no ' + typeof v);
    if (typeof v === 'number' && !isFinite(v)) throw new Error('a realm holds no NaN or infinity at ' + key);
    return v;
  }).replace(/[\u007f-￿]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
  const hl = json.length, head = 24, aligned = n => (n + 7) & ~7;
  let at = aligned(head + hl); const starts = [];
  for (const a of arrays) { starts.push(at); at = aligned(at + a.byteLength); }
  const out = new Uint8Array(at), dv = new DataView(out.buffer);
  out.set(MAGIC, 0); dv.setUint32(4, FORMAT, true); dv.setUint32(8, REALM_REV, true); dv.setUint32(12, realmDigest(R), true); dv.setUint32(16, hl, true); dv.setUint32(20, R.seed >>> 0, true);
  for (let i = 0; i < hl; i++) out[head + i] = json.charCodeAt(i);
  arrays.forEach((a, i) => out.set(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), starts[i]));
  return out;
}

export function blobInfo(bytes) {
  if (bytes.length < 24 || MAGIC.some((m, i) => bytes[i] !== m)) throw new Error('not a realm blob');
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(4, true) !== FORMAT) throw new Error('realm blob format ' + dv.getUint32(4, true));
  return { rev: dv.getUint32(8, true), digest: dv.getUint32(12, true), seed: dv.getUint32(20, true), size: bytes.length, headLen: dv.getUint32(16, true) };
}

export function unpackRealm(bytes, { digest = null } = {}) {
  const info = blobInfo(bytes);
  if (info.rev !== REALM_REV) throw new Error('realm blob of REALM_REV ' + info.rev + ', this build makes ' + REALM_REV);
  if (digest != null && (digest >>> 0) !== info.digest) throw new Error('realm blob digest ' + info.digest + ' is not the one asked for (' + (digest >>> 0) + ')');
  let s = ''; for (let i = 0; i < info.headLen; i++) s += String.fromCharCode(bytes[24 + i]);
  const found = []; let at = (24 + info.headLen + 7) & ~7;
  const R = JSON.parse(s, (key, v) => { if (v && typeof v === 'object' && v.$a && typeof v.i === 'number') found.push(v); return v; });
  // arrays were numbered in the order JSON.stringify met them; the reviver meets them in the same order, children first, so sort by their number
  found.sort((a, b) => a.i - b.i);
  const made = new Map();
  for (const f of found) { const T = TYPED[f.$a], size = f.n * T.BYTES_PER_ELEMENT; made.set(f.i, new T(bytes.buffer.slice(bytes.byteOffset + at, bytes.byteOffset + at + size))); at = (at + size + 7) & ~7; }
  const put = v => { if (v && typeof v === 'object') { if (v.$a && typeof v.i === 'number') return made.get(v.i); if (Array.isArray(v.$s)) return new Set(v.$s.map(put)); for (const k of Object.keys(v)) v[k] = put(v[k]); } return v; };
  const out = put(R);
  if (realmDigest(out) !== info.digest) throw new Error('realm blob digest does not match its content');
  return out;
}

export function loadRealm(bytes, opts) { const R = unpackRealm(bytes, opts); setRealm7(R.seed, R); return R; }
