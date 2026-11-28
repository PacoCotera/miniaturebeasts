// The reading screen's rail, as data (the reading screen spec §2.4): the lanes' geometry and each lane's facts (its chapter, its state, what each trait's tag shows), shared by the props and the pictures. Pure.
import { traitState } from "./genome.mjs";

export const CH = { coat: "#f08a6a", face: "#7ec8f0", movement: "#9ad27a", stamina: "#c9a4f2", shape: "#f2a0c0", "legs-tail": "#6fe0d0", legs: "#6fe0d0", character: "#b8a0b0", glow: "#f2e68a", charge: "#f2e68a" };
export const CH_TOKEN = { coat: "chCoat", face: "chFace", movement: "chMove", stamina: "chStamina", shape: "chShape", "legs-tail": "chLegs", legs: "chLegs", character: "chCharacter", glow: "chGlow", charge: "chGlow" };

// The lanes' geometry: B = clamp(15, 34, round((316 − G·(L−1) − 3·(n−L)) / n)), G 36 under 16 traits else 10, centred on x 304; each lane its traits' tags 3 px apart. `small` is the panel's and Compare's rail (§4): 272 wide, B and x0 floored so every species fits (UI/UX 2026-10-30), tags of 9 px copies.
export function railLayout(counts, small = false) {
  const n = counts.reduce((a, b) => a + b, 0), L = counts.length; if (!n) return { B: 0, G: 0, lanes: [], x0: 0, x1: 0 };
  if (small) { const width = 272, G = n < 16 ? 12 : 4, B = Math.max(4, Math.min(16, Math.floor((width - G * (L - 1) - 2 * (n - L)) / n))), lanes = []; let total = 0; for (const c of counts) total += c * B + 2 * (c - 1); total += G * (L - 1); let x = Math.floor((width - total) / 2);
    for (const c of counts) { const w = c * B + 2 * (c - 1); lanes.push({ x, w, n: c }); x += w + G; } return { B, G, gap: 2, lanes, x0: lanes[0].x, x1: lanes.at(-1).x + lanes.at(-1).w }; }
  const G = n < 16 ? 36 : 10, B = Math.max(15, Math.min(34, Math.round((316 - G * (L - 1) - 3 * (n - L)) / n)));
  let total = 0; for (const c of counts) total += c * B + 3 * (c - 1); total += G * (L - 1);
  let x = Math.floor(304 - total / 2); const lanes = [];
  for (const c of counts) { const w = c * B + 3 * (c - 1); lanes.push({ x, w, n: c }); x += w + G; }
  return { B, G, gap: 3, lanes, x0: lanes[0].x, x1: lanes.at(-1).x + lanes.at(-1).w };
}
// One lane's facts for the rail: its chapter, its state and, per trait, what its tag shows
export function railLanes(st, fr, pod, settings, S) {
  const sid = fr.species.id;
  return fr.chapters.map((ch) => { const sealed = !!ch.sealed && !settings.sealedOpen && !pod.read.includes(ch.id), read = pod.read.includes(ch.id);
    return { id: ch.id, state: read ? "read" : sealed ? "sealed" : "unread", traits: ch.traits.map((t) => {
      const doing = t.nature === "doing", looks = (Array.isArray(t.looks) ? t.looks : S.guideLooks(st, sid, t.id)) ?? [], nl = Math.max(2, Math.min(4, looks.length || 3));
      if (!read) return { nature: doing ? (/pace|stride|weave|drive|turning|flap/.test(t.id) ? "gait" : "bar") : "look", looks: nl };
      const s = traitState(fr, t, pod.genome), two = [s.shows, s.hides ?? (s.halves ? s.halves[1] : s.shows)];
      if (doing) { const lv = (v) => { const idx = looks.indexOf(v); return idx < 0 ? 2 : 1 + Math.min(2, Math.round((idx / Math.max(1, looks.length - 1)) * 2)); }; return { nature: /pace|stride|weave|drive|turning|flap/.test(t.id) ? "gait" : "bar", lv: [lv(two[0]), lv(two[1])], gait: [gaitOf(looks, two[0]), gaitOf(looks, two[1])] }; }
      return { nature: "look", trait: t.id, look: [String(two[0] ?? ""), String(two[1] ?? "")], idx: [Math.max(0, looks.indexOf(two[0])), Math.max(0, looks.indexOf(two[1]))], pattern: [patternOf(two[0]), patternOf(two[1])] };
    }) }; });
}
const GAITS = ["steady", "between", "bursts"];
const gaitOf = (looks, v) => GAITS[Math.max(0, looks.indexOf(v)) % 3];
const patternOf = (look) => (/patch/.test(look ?? "") ? "patches" : /stripe/.test(look ?? "") ? "stripes" : /spot/.test(look ?? "") ? "spots" : "");
