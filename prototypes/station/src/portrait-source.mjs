// The portraits' sources on this device (Habitat's Portrait picture slot): a derived 40×30 picture by the digest of the source (the first 16 hex digits of the SHA-256 of the 528×392 RGBA: what changes the pixels). The source is derived at
// once and dropped; a refused derivation keeps nothing and is returned as an error for the developer. Not in the save (no pixels there): after a reload the slot is empty until a source arrives, and the paper window shows.
import { derivePortrait } from "./derive.mjs";

const SOURCES = new Map();
export const portraitSource = (digest) => SOURCES.get(digest) ?? null;
export function injectPortraitSource(digest, rgba, w = 528, h = 392) {
  const d = derivePortrait(rgba, w, h); if (d.error) return d;
  SOURCES.set(digest, d); return { ok: true, digest };
}
export const dropPortraitSources = () => SOURCES.clear();
export async function digestOf(rgba) { const h = new Uint8Array(await crypto.subtle.digest("SHA-256", rgba)); return [...h.slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
// The source has landed for a mibi's delivered portrait: its digest names it, it is derived, and the digest is kept on the mibi (additive in the save, no schema bump). Returns { ok, digest } or { error }.
export async function landPortrait(m, rgba, w = 528, h = 392) {
  if (!m || !m.portrait) return { error: "the mibi has no portrait to land" };
  const digest = await digestOf(rgba), r = injectPortraitSource(digest, rgba, w, h); if (r.error) return r;
  m.portrait.digest = digest; return r;
}
