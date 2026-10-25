// The words the props builders share: the one place a template is filled, a number is spelled and a plural is chosen. Pure; no state, no spec.

// Number words, 0 to 12; a number outside the table is its digits.
const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

// spell(n, beyond): the word for n, "no" for 0 and "twelve" for 12; for any other n, `beyond` when it is given (a caller's own word, such as "many"), otherwise String(n).
export const spell = (n, beyond) => NUMBER_WORDS[n] ?? beyond ?? String(n);

// count(n): the word a count takes before a noun: "a" for 1, otherwise spell(n) ("two", "three", ..., "no" for 0).
export const count = (n) => (n === 1 ? "a" : spell(n));

// plural(n, one, many): `one` when n is exactly 1, otherwise `many`. Both are the caller's finished words; nothing is added to either.
export const plural = (n, one, many) => (n === 1 ? one : many);

// fill(template, values): every `{name}` in the template becomes values[name], a name being anything between the braces (`{n in words}` and `{a/an}` included).
// A name is looked up as an own key of `values` (Object.hasOwn), so `{constructor}` is never filled from the prototype.
// A name the values do not hold, of the form `one|many` (exactly one `|`, both sides non-empty), becomes plural(values.n, one, many): `one` when values.n is exactly 1, otherwise `many`.
// Any other name the values do not hold stays as written, braces and all (`{a|b|c}` too). Returns a string.
const ONE_MANY = /^([^|]+)\|([^|]+)$/;
export const fill = (template, values) => template.replace(/\{([^{}]+)\}/g, (_, k) => { if (Object.hasOwn(values, k)) return values[k]; const p = k.match(ONE_MANY); return p ? plural(values.n, p[1], p[2]) : "{" + k + "}"; });

// capLine(s): the case of a drawn line (sentence case: one capital at the start of every line). The first letter after any leading run of spaces, glyphs and icons (✕ ⚡ ◆ ❀ ✓ "…" and
// the like: anything that is neither a letter nor a digit) is upper-cased; a line whose first such character is a digit is left as it is; nothing after the first letter is touched (names,
// species and chapters come in already capitalised, common nouns, stages, places, habits and looks lowercase). Applied once, to a line as the builder sets it (capLine(fill(template, values))),
// never inside a table. Not for names: S.cap (state.mjs) cases a name.
export const capLine = (s) => {
  const str = String(s ?? "");
  for (const ch of str) {
    if (/\p{N}/u.test(ch)) return str;   // a figure-led line is left as it is
    if (/\p{L}/u.test(ch)) { const i = str.indexOf(ch), up = ch.toUpperCase(); return up.length === ch.length ? str.slice(0, i) + up + str.slice(i + ch.length) : str; }
  }
  return str;
};
