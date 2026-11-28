// Place tiers (logic): the tier of a place, the highest tier an expedition has entered, and what a strike mark pays there.
import { STRIKE_DATA, PLACE_TIER, CAVE_TIER } from "../data/tuning.mjs";

export const placeTier = lay => lay.cave ? CAVE_TIER : PLACE_TIER[lay.land] || 1;
// The expedition's highest tier entered: reported, limits nothing.
export function noteTier(ex, lay) { ex.placeTier = Math.max(ex.placeTier || 0, placeTier(lay)); }
export const walkTier = ex => ex.placeTier || 0;
export const walkYield = ex => STRIKE_DATA[walkTier(ex)] || 0;   // reporting only: what a mark pays at the highest tier entered
export const dataLadder = () => STRIKE_DATA.slice(1).join(' / ');
