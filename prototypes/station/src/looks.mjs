// What a mibi shows when it is drawn: one function, `drawnLooks(frame, mibi)`, used everywhere a mibi is drawn (Home, the Vivarium, the Habitat up close, Cross, the Library).
// It lives in the logic (the headless Node process), never on the face: the face is given a picture by id (technical-architecture.md §3, lvgl-switch.md §2.9), as it is given the stamp.
//   - a look trait whose chapter is READ on this mibi (mibi.read) draws the look it SHOWS: traitState(...).shows. A hidden copy never shows; a switch that is off draws as off; a blend draws its bin.
//   - a look trait whose chapter is UNREAD draws nothing: never a guess at this mibi's own (the stand-looks table of the earlier kinds is retired with the layered stands).
//   - doings (Movement, Stamina, Character, Glow, Charge) draw nothing on a stand; a sealed chapter draws nothing.
// Returns { <trait id>: <look> }. Pure, with no clock and no picture; the stand takes the traits it has layers for and ignores the rest (layered-stand.mjs), so a new locus plugs in as data.
import { traitState } from "./genome.mjs";

export function drawnLooks(frame, mibi) {
  const out = {}; if (!frame || !mibi?.genome) return out;
  const read = mibi.read ?? [];
  for (const ch of frame.chapters) {
    if (ch.sealed) continue;
    for (const t of ch.traits) {
      if (t.nature !== "look") continue;
      if (read.includes(ch.id)) out[t.id] = traitState(frame, t, mibi.genome).shows;
    }
  }
  return out;
}

// The variant key of a stand: its species and the sorted `trait=look` pairs of the traits the stand carries. Two mibis with these looks are the same picture, whoever they are.
export const standKey = (species, traits, looks) => species + "~" + traits.filter((t) => looks[t] != null).sort().map((t) => `${t}=${looks[t]}`).join(",");
// A short, stable name for a key, for picture ids (FNV-1a 32, hex): the id never carries spaces or the looks' words
export const keyToken = (key) => { let h = 0x811c9dc5; for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0"); };
