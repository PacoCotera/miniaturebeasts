// Small words for the player's lines: a count as a word, and a capital first letter.
export const NUM_WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export const numWord = n => NUM_WORD[n] || String(n);
export const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
