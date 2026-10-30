// What a mibi shows when it is drawn: one function, `drawnLooks(frame, mibi)`, used everywhere a mibi is drawn (Home, the Vivarium, the Habitat up close, Cross, the Library).
// It lives in the logic (the headless Node process), never on the face: the face is given a picture by id (technical-architecture.md §3, lvgl-switch.md §2.9), as it is given the stamp.
//   - a look trait whose chapter is READ on this mibi (mibi.read) draws the look it SHOWS: traitState(...).shows. A hidden copy never shows; a switch that is off draws as off; a blend draws its bin.
//   - a look trait whose chapter is UNREAD draws the species' most common look on pods (stand-looks.json `modal`), never a guess at this mibi's own.
//   - doings (Movement, Stamina, Character, Glow, Charge) draw nothing on a stand; a sealed chapter draws nothing.
// Returns { <trait id>: <look> }. Pure, with no clock and no picture; the stand takes the traits it has layers for and ignores the rest (layered-stand.mjs), so a new locus plugs in as data.
import { traitState } from "./genome.mjs";

let STAND_LOOKS = {};
// stand-looks.json (ui/specs/station/): { species: { <SXX>: { traits: { <trait id>: { chapter, looks, modal, share } } } } }; made by tools/make-stand-looks.mjs, checked against the frames by tests/looks.test.mjs
export const setStandLooks = (json) => { STAND_LOOKS = json?.species ?? {}; };
export const standLooksOf = (species) => STAND_LOOKS[species]?.traits ?? {};

export function drawnLooks(frame, mibi) {
  const out = {}; if (!frame || !mibi?.genome) return out;
  const modal = standLooksOf(frame.species.id), read = mibi.read ?? [];
  for (const ch of frame.chapters) {
    if (ch.sealed) continue;
    for (const t of ch.traits) {
      if (t.nature !== "look") continue;
      const look = read.includes(ch.id) ? traitState(frame, t, mibi.genome).shows : modal[t.id]?.modal;
      if (look != null) out[t.id] = look;
    }
  }
  return out;
}

// The variant key of a stand: its species and the sorted `trait=look` pairs of the traits the stand carries. Two mibis with these looks are the same picture, whoever they are.
export const standKey = (species, traits, looks) => species + "~" + traits.filter((t) => looks[t] != null).sort().map((t) => `${t}=${looks[t]}`).join(",");
// A short, stable name for a key, for picture ids (FNV-1a 32, hex): the id never carries spaces or the looks' words
export const keyToken = (key) => { let h = 0x811c9dc5; for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0"); };
