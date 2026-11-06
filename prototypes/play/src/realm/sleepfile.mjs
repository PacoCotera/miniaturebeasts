// The sleep file: a realm put to sleep, as one signed file. UTF-8, LF only, four lines, each ended by a LF:
//   MBR1
//   <header: canonical JSON, one line>
//   <sig: base64url of 64 bytes, Ed25519 by the Companion over the bytes "MBR1\n" + the header line>
//   <body: canonical JSON, one line>
// A list reads lines 1 to 3 and never parses the body. The body's hash is taken over its bytes as stored, so a check never canonicalises again.
// The file is signed, not encrypted. The ledger (see wakeCheck) is what keeps a signed copy of someone else's body from waking.
// Pure and async (WebCrypto): the Station, the Companion, the Caddy and the tests run this one module.
import { b64uDecode, hexEncode, utf8, unutf8 } from "./b64.mjs";
import { canonical } from "./canonical.mjs";
import { sha256, sign, verify } from "./keys.mjs";
import { parseRecovery, recoveryPub } from "./recovery.mjs";

export const MAGIC = "MBR1";
export const KIND = "mb-realm-sleep";
export const FILE_V = 1;
export const MAX_BYTES = 8 * 1024 * 1024;   // a file over 8 MB is refused, on the way out and on the way in

const hex = async (x) => hexEncode(await sha256(typeof x === "string" ? utf8(x) : x));
const isObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const asBytes = (b) => (typeof b === "string" ? utf8(b) : b);

// The hash that names a file in the ledgers and on the card: SHA-256 of the file's bytes, in hex. Its first 8 characters are the `sha8` of a file name.
export const fileHash = (bytes) => hex(asBytes(bytes));

// ---- build ----------------------------------------------------------------------------------------------------------------------------------------------------

// What the header's summary says about the save, for a list that reads no body.
function summaryOf(save, st) {
  const mibis = Array.isArray(st.mibis) ? st.mibis : (Array.isArray(save.mibis) ? save.mibis : []);
  let pods = 0;
  for (const r of save.regions) if (r.map && Array.isArray(r.map.pods)) pods += r.map.pods.length;
  return {
    regions: save.regions.length, mibis: mibis.length, pods, crates: Array.isArray(save.bay) ? save.bay.length : 0,
    d: st.d ?? 0, e: st.e ?? 0, s: st.s ?? 0, turn: save.turn ?? 0,
    exp: save.exp && save.exp.n != null ? save.exp.n : null,
    names: mibis.slice(0, 6).map((m) => String(m && m.name != null ? m.name : "")),
  };
}

// The Station's half: the body, the header and the bytes the Companion signs. `save` is the v9 save as stored (with its `st`); `caddy` is { dock, jobs, prints };
// `companion` is { id, name, pub }; `recovery` is { kid, pub } or null; `slept` is the time in ms. Returns { header, headerLine, bodyLine, signed }.
// Throws when the save is not a v9 save with its Station part, or the file would be over 8 MB.
export async function prepareSleep({ save, caddy, companion, recovery = null, slept }) {
  if (!isObj(save) || save.v !== 9 || !Array.isArray(save.regions) || !save.regions.length) throw new Error("sleepfile: a v9 save is needed");
  if (!isObj(save.st)) throw new Error("sleepfile: the save has no Station part");
  if (typeof save.wid !== "string" || !save.wid) throw new Error("sleepfile: the save has no wid");
  if (!isObj(caddy)) throw new Error("sleepfile: the Caddy part is needed");
  if (!isObj(companion) || typeof companion.id !== "string" || typeof companion.pub !== "string") throw new Error("sleepfile: the Companion's id and pub are needed");
  if (!Number.isFinite(slept)) throw new Error("sleepfile: slept is a time");
  const { st, ...rest } = save;
  const body = { companion: rest, station: st, caddy };
  const bodyLine = canonical(body);
  const bodyBytes = utf8(bodyLine);
  const gens = [...new Set(save.regions.map((r) => r.gen))].sort((a, b) => a - b);
  const header = {
    kind: KIND, v: FILE_V, wid: save.wid, began: save.began ?? null, slept,
    companion: { id: companion.id, name: companion.name ?? "", pub: companion.pub },
    recovery: recovery ? { kid: recovery.kid, pub: recovery.pub } : null,
    save: { v: save.v, st: st.schema ?? null, gens },
    parts: { companion: await hex(canonical(rest)), station: await hex(canonical(st)), caddy: await hex(canonical(caddy)) },
    body: { sha256: await hex(bodyBytes), bytes: bodyBytes.length },
    summary: summaryOf(save, st),
  };
  const headerLine = canonical(header);
  const out = { header, headerLine, bodyLine, signed: MAGIC + "\n" + headerLine };
  if (MAGIC.length + headerLine.length + 87 + bodyBytes.length + 3 > MAX_BYTES) throw new Error("sleepfile: the file would be over 8 MB");
  return out;
}

// The file from a prepared sleep and the Companion's signature over `prep.signed`. Returns { text, bytes, sha, sha8, header }.
export async function assembleSleepFile(prep, sig) {
  if (!(await isSigLike(sig))) throw new Error("sleepfile: the signature is 64 bytes of base64url");
  const text = MAGIC + "\n" + prep.headerLine + "\n" + sig + "\n" + prep.bodyLine + "\n";
  const bytes = utf8(text);
  if (bytes.length > MAX_BYTES) throw new Error("sleepfile: the file is over 8 MB");
  const sha = await fileHash(bytes);
  return { text, bytes, sha, sha8: sha.slice(0, 8), header: prep.header };
}
async function isSigLike(sig) { try { return typeof sig === "string" && b64uDecode(sig).length === 64; } catch { return false; } }

// Prepare and sign in one go, for a caller that holds the Companion's private key (the Companion itself, and the tests).
export async function buildSleepFile(opts, privateKey) {
  const prep = await prepareSleep(opts);
  return assembleSleepFile(prep, await sign(privateKey, prep.signed));
}

// ---- parse ----------------------------------------------------------------------------------------------------------------------------------------------------

// Reads the lines. `{ head: true }` reads lines 1 to 3 only, and the body is not looked at (for a list; the bytes may be just a prefix of the file).
// Returns { ok: true, header, headerLine, sig, bodyLine?, bodyBytes? } or { ok: false, why } with why one of "size", "format", "magic", "header".
// The body is not parsed here.
export function parseSleepFile(input, { head = false } = {}) {
  const bytes = asBytes(input);
  if (!(bytes instanceof Uint8Array)) return { ok: false, why: "format" };
  if (bytes.length > MAX_BYTES) return { ok: false, why: "size" };
  const lf = [];
  for (let i = 0; i < bytes.length && lf.length < 4; i++) if (bytes[i] === 10) lf.push(i);
  if (lf.length < 3) return { ok: false, why: "format" };
  let l1, l2, l3;
  try { l1 = unutf8(bytes.subarray(0, lf[0])); l2 = unutf8(bytes.subarray(lf[0] + 1, lf[1])); l3 = unutf8(bytes.subarray(lf[1] + 1, lf[2])); } catch { return { ok: false, why: "format" }; }
  if (l1 !== MAGIC) return { ok: false, why: "magic" };
  if (l1.includes("\r") || l2.includes("\r") || l3.includes("\r")) return { ok: false, why: "format" };
  let header;
  try { header = JSON.parse(l2); } catch { return { ok: false, why: "header" }; }
  if (!isObj(header)) return { ok: false, why: "header" };
  const out = { ok: true, header, headerLine: l2, sig: l3 };
  if (head) return out;
  if (lf.length !== 4 || lf[3] !== bytes.length - 1) return { ok: false, why: "format" };   // exactly one body line, ended by the last byte
  out.bodyBytes = bytes.subarray(lf[2] + 1, lf[3]);
  try { out.bodyLine = unutf8(out.bodyBytes); } catch { return { ok: false, why: "format" }; }
  if (out.bodyLine.includes("\r")) return { ok: false, why: "format" };
  return out;
}

// ---- verify ---------------------------------------------------------------------------------------------------------------------------------------------------

const PARTS = ["companion", "station", "caddy"];

// One function, everywhere. Five checks, in this order: (1) the magic line, (2) the header parses and `kind` and `v` are known, (3) the signature verifies against `pub`
// if one is given (the Station passes the Companion's pub it knows) and otherwise against header.companion.pub, (4) SHA-256 and length of the body line equal the header's,
// (5) each part's hash equals the header's. Returns { ok, header, why }; `why` is "" when ok, else one of
// "size", "format", "magic", "header", "kind", "version", "signature", "body-hash", "body-length", "body", "part-companion", "part-station", "part-caddy".
// On a failure after the header has parsed, `header` is still returned (it is not trusted: ok is false).
export async function verifySleepFile(input, { pub } = {}) {
  const p = parseSleepFile(input);
  if (!p.ok) return { ok: false, header: null, why: p.why };
  const h = p.header, fail = (why) => ({ ok: false, header: h, why });
  if (h.kind !== KIND) return fail("kind");
  if (h.v !== FILE_V) return fail("version");
  if (!isObj(h.companion) || !isObj(h.parts) || !isObj(h.body)) return fail("header");
  const key = pub !== undefined ? pub : h.companion.pub;
  if (!(await verify(key, MAGIC + "\n" + p.headerLine, p.sig))) return fail("signature");
  if ((await hex(p.bodyBytes)) !== h.body.sha256) return fail("body-hash");
  if (p.bodyBytes.length !== h.body.bytes) return fail("body-length");
  let body;
  try { body = JSON.parse(p.bodyLine); } catch { return fail("body"); }
  if (!isObj(body) || Object.keys(body).sort().join() !== "caddy,companion,station") return fail("body");
  for (const k of PARTS) if ((await hex(canonical(body[k]))) !== h.parts[k]) return fail("part-" + k);
  return { ok: true, header: h, why: "" };
}

// The body of a file that verifies: { companion, station, caddy }. Throws when the file does not verify.
export async function readBody(input, opts) {
  const v = await verifySleepFile(input, opts);
  if (!v.ok) throw new Error("sleepfile: " + v.why);
  return JSON.parse(parseSleepFile(input).bodyLine);
}

// ---- the household ledger and the wake check ------------------------------------------------------------------------------------------------------------------

// A ledger is a list of lines { sha, state } in the order they were written, state one of "kept", "committed", "woken", "dropped" (the Caddy's realms/ledger.jsonl,
// the Station's mb-sleep-ledger). A file's standing in one ledger: once committed it stays committed (a dropped copy of a committed sleep is still a committed sleep)
// until it is woken, and woken is final. Across ledgers the best of them wins, except that woken anywhere is woken.
export function ledgerState(ledgers, sha) {
  let seen = "unknown";
  const rank = { unknown: 0, kept: 1, dropped: 1, committed: 2 };
  for (const ledger of ledgers || []) {
    let st = "unknown";
    for (const line of ledger || []) {
      if (!line || line.sha !== sha) continue;
      if (st === "woken") break;
      if (line.state === "woken") st = "woken";
      else if (line.state === "committed") st = "committed";
      else if (st !== "committed" && (line.state === "kept" || line.state === "dropped")) st = line.state;
    }
    if (st === "woken") return "woken";
    if (rank[st] > rank[seen]) seen = st;
  }
  return seen;
}

// Whether this file may wake, and if not why. The proof is one of:
//   companionSig + challenge: the docked Companion signed a fresh challenge with the key the header names. The file must be committed in a ledger this Station or Caddy keeps.
//   recoveryText: the printed recovery key. Its public key must be the one in the header. A file no ledger has heard of may wake this way (a new Station), but never one
//     the ledgers hold as kept-only or dropped (a sleep that was rolled back is still a live realm).
// In both: the file must verify against header.companion.pub, and a file already woken never wakes again.
// A challenge that begins with the magic line is refused, so a Companion asked to sign a challenge cannot be made to sign a header.
// Returns { ok, why }; why is "" when ok, else a verify code, or "no-proof", "challenge", "proof-signature", "recovery-<chars|length|version|check>", "recovery-pub",
// "ledger-unknown", "ledger-kept", "ledger-dropped", "ledger-woken".
export async function wakeCheck(input, { companionSig, challenge, recoveryText, ledgers = [] } = {}) {
  const v = await verifySleepFile(input);
  if (!v.ok) return { ok: false, why: v.why };
  const state = ledgerState(ledgers, await fileHash(asBytes(input)));
  if (state === "woken") return { ok: false, why: "ledger-woken" };
  const fails = [];
  if (recoveryText !== undefined) {
    const r = await parseRecovery(recoveryText);
    if (!r.ok) fails.push("recovery-" + r.why);
    else if (!v.header.recovery || (await recoveryPub(r.seed)) !== v.header.recovery.pub) fails.push("recovery-pub");
    else if (state === "kept" || state === "dropped") fails.push("ledger-" + state);
    else return { ok: true, why: "" };
  }
  if (companionSig !== undefined || challenge !== undefined) {
    const msg = typeof challenge === "string" ? utf8(challenge) : challenge;
    if (!(msg instanceof Uint8Array) || !msg.length || unutf8Safe(msg).startsWith(MAGIC)) fails.push("challenge");
    else if (!(await verify(v.header.companion.pub, msg, companionSig))) fails.push("proof-signature");
    else if (state !== "committed") fails.push("ledger-" + state);
    else return { ok: true, why: "" };
  }
  return { ok: false, why: fails[0] || "no-proof" };
}
function unutf8Safe(b) { try { return unutf8(b); } catch { return ""; } }

// Waking is not built yet: the time shift, the swap and the Companion's replacement come later. This is the hook.
export function wake() {
  throw new Error("waking is not built yet");
}
