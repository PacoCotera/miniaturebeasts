// The day's clock as rules: what a count of light spent since dawn means for her routine and for a place's light. The count is handed in; no game state.
import { DAY, partOfDay } from "../data/words.mjs";

const BED_LIGHT = 20;
// The part of day her routine reads: the last BED_LIGHT light of dusk is "dusk2" (a late one beds down then); every other part is the clock's.
export const routinePart = spent => { const p = partOfDay(spent); return p === 'dusk' && spent >= DAY.light - DAY.parts[DAY.parts.length - 1][1] - BED_LIGHT ? 'dusk2' : p; };
// A part of day that comes before dusk, by the DAY table's order.
export const beforeDusk = part => DAY.parts.findIndex(q => q[0] === part) < DAY.parts.findIndex(q => q[0] === 'dusk');
// The light level the clock gives a place under the sky: night draws through the night table (5, darker and cooler than dark2), dusk through the one-step table (6), and so does the first half of the dawn,
// so the night does not jump to full day; the rest of the day is 0.
export const clockLight = spent => ({ night: 5, dusk: 6, dawn: spent < DAY.parts[0][1] / 2 ? 6 : 0 })[partOfDay(spent)] || 0;
