// The portraits' sources on this device (Habitat's Portrait picture slot): a derived 40×30 picture by the digest of the source (the first 16 hex digits of the SHA-256 of the 528×392 RGBA: what changes the pixels). The source is derived at
// once; a refused derivation keeps nothing and is returned as an error for the developer. Not in the save (no pixels there): after a reload the slot is empty until a source arrives, and the paper window shows.
// The 528×392 opening itself is kept, in memory only, for the last OPENINGS_KEPT digests injected (least recently used goes first): the Sitting's portrait state shows it 1:1 and is offered only while it is kept.
import { derivePortrait } from "./derive.mjs";

export const OPENINGS_KEPT = 2;
const SOURCES = new Map(), OPENINGS = new Map();
export const portraitSource = (digest) => SOURCES.get(digest) ?? null;
// portraitOpening(digest): the kept 528×392 opening, { w, h, rgba() } (opaque RGBA), or null when it is not kept. Reading it makes it the most recently used.
export function portraitOpening(digest) {
  const o = OPENINGS.get(digest); if (!o) return null;
  OPENINGS.delete(digest); OPENINGS.set(digest, o); return o;
}
export function injectPortraitSource(digest, rgba, w = 528, h = 392) {
  const d = derivePortrait(rgba, w, h); if (d.error) return d;
  SOURCES.set(digest, d);
  const px = new Uint8ClampedArray(rgba); OPENINGS.delete(digest); OPENINGS.set(digest, { w, h, rgba: () => px });
  while (OPENINGS.size > OPENINGS_KEPT) OPENINGS.delete(OPENINGS.keys().next().value);
  return { ok: true, digest };
}
export const dropPortraitSources = () => { SOURCES.clear(); OPENINGS.clear(); };
export async function digestOf(rgba) { const h = new Uint8Array(await crypto.subtle.digest("SHA-256", rgba)); return [...h.slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
