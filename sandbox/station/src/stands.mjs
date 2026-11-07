// Which picture an owned mibi takes (Fix 1b part 3; station-layouts.md, Composed states, rule 5): a mibi the player owns is never absent. An adult or elder takes, in order, (1) its species' signed adult stand mibi-adult-SNN-WxH,
// (2) its species' signed juvenile stand mibi-juvenile-SNN at the size below, drawn 1:1, never scaled, (3) the host's stand-in from its own genome at the adult's own size (the rig, shown as a stand-in).
// A view asks `standLook` and names the picture by what it returns; the hook (pictures.mjs, kind mibi) asks the same, so both agree. A juvenile has only its own stand (step 3 when none).
import { assetEntry } from "../../ui/assets.mjs";

// the adult places whose juvenile master is smaller: the living windows' 144×152 resident holds the 104×112 juvenile; every other size has a juvenile master of its own size
const JUVENILE_OF = { "144x152": [104, 112] };
export const juvenileSize = ([w, h]) => JUVENILE_OF[`${w}x${h}`] ?? [w, h];
// a placed master of any record status at exactly this size, not a built stand-in (the hook's own test)
export const placedAt = (id, w, h) => { const m = assetEntry(id); return !!m && m.status !== "empty" && !!m.file && m.w === w && m.h === h; };
// The coats (release 21g, art desk ruling R21-COAT-V8): a kind's pictures baked at build time in a Tint x Shade grid (ui/tools/coat-masters.mjs), placed as mibi-<stage>-SNN-<tint>-<shade>-... beside the painted master,
// which is the between-dark coat. COAT_TRAITS names, per kind, the look traits that make the coat (Tint and Shade) and the Markings; the Markings pick the adult's awake picture (MARKED_PICTURE), in the mibi's coat.
export const COAT_TRAITS = { S01: { tint: "body-hue", shade: "body-value", marking: "markings" } };
export const MARKED_PICTURE = { spotted: "lay-spots", saddle: "lay-saddle", shaded: "lay-gradient", bands: "lay-bands", patches: "lay-patches" };   // plain = the stand
// the coat a mibi's drawn looks (looks.mjs drawnLooks: only a chapter that is read draws) call for, "<tint>-<shade>" or "<tint>-<shade>+<lay picture>", or null (the painted coat): the kind has no coat traits or the chapter is unread
export const coatOf = (species, looks, table = COAT_TRAITS) => {
  const t = table[species], tint = looks?.[t?.tint], shade = looks?.[t?.shade]; if (!t || tint == null || shade == null) return null;
  const lay = MARKED_PICTURE[looks[t.marking]]; return `${tint}-${shade}${lay ? "+" + lay : ""}`;
};
// the master of a coat: the id with the coat after the kind (mibi-adult-S01-304x312 -> mibi-adult-S01-redder-dark-304x312), when that master is placed at the id's own size; the adult's awake stand with a marking takes the marked picture
// (mibi-adult-S01-redder-dark-lay-spots-304x312); a pose, the asleep and the young show the coat only (no marked versions yet); else the painted master's own id (between-dark is the painted master)
export function coatMaster(id, species, coat) {
  if (!coat) return id;
  const [c, lay] = coat.split("+"), m = /-(\d+)x(\d+)$/.exec(id); if (!m) return id;
  const find = (mid) => { const v = id.replace(`-${species}-`, `-${species}-${mid}-`); return v !== id && placedAt(v, +m[1], +m[2]) ? v : null; };
  return (lay && id === `mibi-adult-${species}-${m[1]}x${m[2]}` && find(`${c}-${lay}`)) || find(c) || id;
}
// { stage, size, step }: stage "juvenile" with the juvenile's size when step 2 applies, else the asked stage and size (step 1: the adult stand is placed; step 3: the genome stand-in)
export function standLook(species, stage, size) {
  const [w, h] = size;
  if (stage === "juvenile") {
    if (placedAt(`mibi-juvenile-${species}-${w}x${h}`, w, h)) return { stage, size: [w, h], step: 1 };
    const [jw, jh] = juvenileSize(size);   // release 21d: a young asked at the adult's 144 x 152 place takes its own 104 x 112 master, 1:1, as an adult with no stand of its size does
    if ((jw !== w || jh !== h) && placedAt(`mibi-juvenile-${species}-${jw}x${jh}`, jw, jh)) return { stage, size: [jw, jh], step: 2 };
    return { stage, size: [w, h], step: 3 };
  }
  if (placedAt(`mibi-adult-${species}-${w}x${h}`, w, h)) return { stage, size: [w, h], step: 1 };
  const [jw, jh] = juvenileSize(size);
  if (placedAt(`mibi-juvenile-${species}-${jw}x${jh}`, jw, jh)) return { stage: "juvenile", size: [jw, jh], step: 2 };
  return { stage, size: [w, h], step: 3 };
}
