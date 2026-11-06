// Which species' juvenile masters are drawn mirrored (the `juvenileFacing` table of ui/assets/masters/index.json), so the young faces the opposite way from its adult. The masters are never edited:
// the master loader reads the pixels of a flagged species' juvenile master with each row reversed (exact pixels), and the Home walk, which turns by its set's native side, takes them back.
let MIRRORED = new Set();
export const setJuvenileFacing = (table) => { MIRRORED = new Set(Object.entries(table?.species ?? {}).filter(([, v]) => v && v.mirror).map(([k]) => k)); };
export const juvenileMirroredSpecies = (species) => MIRRORED.has(species);
// a master id of a mirrored species' young (a stand, its sleeper, its thumbnail, its curl); a contact shadow is not a figure
export const juvenileMirrored = (id) => { const m = /^mibi-juvenile-(S\d{2})-/.exec(id); return !!m && MIRRORED.has(m[1]) && !/-shadow-/.test(id); };
export const mirrorRGBA = (rgba, w, h) => { const o = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const s = (y * w + x) * 4, d = (y * w + (w - 1 - x)) * 4; o[d] = rgba[s]; o[d + 1] = rgba[s + 1]; o[d + 2] = rgba[s + 2]; o[d + 3] = rgba[s + 3]; } return o; };
export const mirrorPic = (p) => { let px = null; return { w: p.w, h: p.h, rgba: () => px ?? (px = mirrorRGBA(p.rgba(), p.w, p.h)) }; };
