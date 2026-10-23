// The words the props builders share: the one place a template is filled, a number is spelled and a plural is chosen. Pure; no state, no spec.

// Number words, 0 to 12; a number outside the table is its digits.
const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

// spell(n): the word for n, "no" for 0 and "twelve" for 12; String(n) for any other n.
export const spell = (n) => NUMBER_WORDS[n] ?? String(n);

// count(n): the word a count takes before a noun: "a" for 1, otherwise spell(n) ("two", "three", ..., "no" for 0).
export const count = (n) => (n === 1 ? "a" : spell(n));

// plural(n, one, many): `one` when n is exactly 1, otherwise `many`. Both are the caller's finished words; nothing is added to either.
export const plural = (n, one, many) => (n === 1 ? one : many);

// fill(template, values): every `{name}` in the template becomes values[name], a name being anything between the braces (`{n in words}` and `{a/an}` included).
// A name the values do not hold stays as written, braces and all. Returns a string.
export const fill = (template, values) => template.replace(/\{([^{}]+)\}/g, (_, k) => (k in values ? values[k] : "{" + k + "}"));
