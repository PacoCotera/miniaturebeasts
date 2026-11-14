// The colour a coat is shown in on a swatch, a far dot or a chip (art desk ruling R21-COAT-V8, 2026-11-06 21:55): Tint x Shade, as its kind's palette names it.
//   - Loika (S01), whose palette the desk has made (mibi-art tools/palette-S01-v8.json): the coat_main hex of the cell, shown beside the fixed cream (the cream is never recoloured);
//   - every other kind, whose palette is not made yet: its land band's body colour (codify, language.json lands[].body), turned in hue by the Tint word (+-12 degrees, the land's body range) and in lightness by the Shade (+-0.07).
//     This is a stand-in until the desk makes the kind's palette; it is a colour of the kind's own land, never one colour for all.
// Pure: no frame, no state.
export const CREAM = "#dfd2ae";
export const LOIKA_COAT = {   // coat_main, [dark, between, light]
  redder: ["#482a1e", "#864d2b", "#a26b4f"], between: ["#2e2a2d", "#615c5f", "#989397"], yellower: ["#3e301f", "#72583b", "#9f805a"],
};
// the other signed kinds (release 22b): coat_main of each cell as the desk's palette-SNN-v8.json gives it, [dark, between, light] per Tint look of the kind's frame
export const KIND_COAT = {
  S03: { redder: ["#623e29", "#87715f", "#ab9b8d"], between: ["#604b39", "#827362", "#aa9c8c"], yellower: ["#644a2b", "#897251", "#b09b7c"] },
  S04: { yellower: ["#6b6e58", "#94987c", "#bdc1a7"], between: ["#676f5f", "#919789", "#bbc0b2"], greener: ["#62715c", "#899b83", "#b5c3af"] },
  S05: { redder: ["#3c1a0e", "#643e2c", "#886853"], between: ["#3e200d", "#663d25", "#88694d"], yellower: ["#382409", "#5f421d", "#886a44"] },
  S08: { redder: ["#86572c", "#b48251", "#d0a070"], between: ["#7c5d32", "#a98851", "#cfaf7b"], yellower: ["#815c0a", "#ad8834", "#d2af67"] },
  S12: { redder: ["#9f5b24", "#d5953a", "#f4bd62"], between: ["#9c7225", "#bda060", "#e1c688"], yellower: ["#9e7108", "#c59e40", "#e6c571"] },
  S17: { redder: ["#ae6b2c", "#de954d", "#fbbb6e"], between: ["#a66f38", "#cc9d64", "#eac28a"], yellower: ["#aa6f18", "#d89944", "#f6be70"] },
  S20: { yellower: ["#66644f", "#8f8e76", "#b4b29c"], between: ["#616657", "#8a8f7f", "#aeb4a4"], greener: ["#586859", "#809281", "#a5b7a6"] },
};
export const LAND_BODY = {   // [hex, L, C, h] of the land's body colour
  mixed: ["#D4B060", 0.773, 0.108, 85.6], woods: ["#A0603E", 0.553, 0.096, 47.9], tallwood: ["#A8B39C", 0.752, 0.034, 128.1], thickets: ["#7C4C66", 0.48, 0.074, 346.6], fells: ["#A79B8B", 0.695, 0.027, 75.2],
  downs: ["#8F7598", 0.599, 0.06, 317.3], marsh: ["#8A8B58", 0.623, 0.071, 109.3], tarns: ["#6F87A1", 0.614, 0.048, 250.7], meres: ["#2F6E74", 0.5, 0.065, 203.8],
};
export const LAND_OF = { S01: "woods", S02: "downs", S03: "fells", S04: "tallwood", S05: "woods", S06: "thickets", S07: "fells", S08: "mixed", S09: "tallwood", S10: "meres", S11: "thickets", S12: "mixed", S13: "tarns", S14: "marsh", S15: "downs", S16: "tarns", S17: "mixed", S18: "downs", S19: "meres", S20: "tallwood" };
const TARGET_HUE = { redder: 30, yellower: 95, greener: 140, bluer: 255, pinker: 350 };   // the way each Tint word turns the land's hue
const SHADE_L = { dark: -0.07, between: 0, light: 0.07 };
const SHADE_I = { dark: 0, between: 1, light: 2 };

function oklchHex(L, C, h) {   // OKLCH -> sRGB hex (Ottosson), clamped
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return "#" + lin.map((v) => { const c = Math.min(1, Math.max(0, v)), g = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; return Math.round(g * 255).toString(16).padStart(2, "0"); }).join("");
}
// the swatch colours of a coat: [coat colour, cream] for Loika, [coat colour] for a kind with no palette yet; shade "between" when only the Tint is known; null for a kind or Tint the table does not know
export function coatColours(species, tint, shade = "between") {
  const si = SHADE_I[shade] ?? 1;
  if (species === "S01") { const row = LOIKA_COAT[tint]; return row ? [row[si], CREAM] : null; }
  if (KIND_COAT[species]) { const row = KIND_COAT[species][tint]; return row ? [row[si]] : null; }
  const land = LAND_BODY[LAND_OF[species]]; if (!land) return null;
  if (tint !== "between" && !TARGET_HUE[tint]) return null;
  const [, L, C, h] = land, d = tint === "between" ? 0 : Math.max(-12, Math.min(12, ((TARGET_HUE[tint] - h + 540) % 360) - 180));
  return [oklchHex(L + (SHADE_L[shade] ?? 0), Math.max(C, 0.055), (h + d + 360) % 360)];   // a land of low chroma (tallwood, fells) is lifted to 0.055 so the three Tints can be told apart on a swatch
}
