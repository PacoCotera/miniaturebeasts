// Words of the expedition's end and the world's turn: the dark Probe's lines, what a crate seals, and the ids and places a world event names.
import { numWord } from './text.mjs';

export const DARK_TEXT = { goes: 'The Probe goes dark. Your pods fall here. Walk back to the flag.', refuse: 'The Probe is dark · walk back to the flag', line: 'Probe dark' };   // [copy]

// What a hold seals, in words, from its contents: "two pods" + `join` + "supplies", or `alone` ("supplies") when no pod is in it. Every crate carries the walk's Data, so the pods-only form is never shown.
export function sealedWords(h, join, alone) { const n = h.pods ? h.pods.length : 0; return n ? numWord(n) + ' pod' + (n === 1 ? '' : 's') + join + 'supplies' : alone; }

// The land kinds a world event names (specs/world-events.md): the lands' order as ids; `shallows` and `cliff` only in outpost lines and near-the-cliff or by-the-river places.
export const PLACE_KIND = ['meadow', 'pond', 'rock', 'wood', 'shallows', 'cliff'];
export const PLACE_PHRASE = { cliff: 'near the cliff', shallows: 'by the river', meadow: 'in the meadows', pond: 'by the ponds', rock: 'in the rock fields', wood: 'in the woods' };
// A herd's drift as the crate's direction code (specs/world-events.md): 1 to 8 for N, NE, E, SE, S, SW, W, NW; 0 when it only spread out.
export const DIR_CODE = { 'north': 1, 'north-east': 2, 'east': 3, 'south-east': 4, 'south': 5, 'south-west': 6, 'west': 7, 'north-west': 8 };
