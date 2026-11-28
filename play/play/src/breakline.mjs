// The detail line under a load failure or a broken page: "<part> · <what failed> · build <sha>", wrapped at word boundaries into at most `maxLines` lines that fit `maxW`
// (measured by `measure`, the page's own text width), the error text shortened from its middle (start and end kept, "…" between), and "build <sha>" always whole at the end.
// Pure (no DOM), so it is unit-tested (tests/breakline.test.mjs).
const NB = " ";   // keeps "build <sha>" in one piece while the line wraps

export const buildTag = (build) => "build " + ((build && (build.short || String(build.commit || "").slice(0, 7))) || "local");

// `s` cut to at most `max` characters, the middle replaced by "…" (the start gets the extra character).
export function middleCut(s, max) {
  s = String(s ?? "");
  if (s.length <= max) return s;
  if (max <= 1) return "…".slice(0, Math.max(0, max));
  const keep = max - 1, head = Math.ceil(keep / 2), tail = keep - head;
  return s.slice(0, head) + "…" + (tail ? s.slice(s.length - tail) : "");
}

// Greedy word wrap; a single word wider than the line still takes its own line (the caller then cuts the text shorter).
export function wrapWords(words, measure, maxW) {
  const lines = []; let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (cur && measure(t) > maxW) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

// { lines } for `lead` (the part and the error text, e.g. "places") + `why`, then the build tag. Shortens `why` from its middle, a character at a time, until the wrapped result
// is within `maxLines` and no line is wider than `maxW`. The build tag is never cut: when even an empty `why` does not fit, the lines are returned as they are.
export function breakLines({ lead = "", why = "", build = null, measure, maxW, maxLines = 2 }) {
  const tag = buildTag(build).replace(" ", NB);
  const make = (w) => wrapWords([lead, w, tag].filter(Boolean).join(" · ").split(" "), (t) => measure(t.replaceAll(NB, " ")), maxW).map((l) => l.replaceAll(NB, " "));
  const fits = (ls) => ls.length <= maxLines && ls.every((l) => measure(l) <= maxW);
  const text = String(why ?? "").replace(/\s+/g, " ").trim();
  let lines = make(text);
  for (let n = text.length - 1; !fits(lines) && n >= 0; n--) lines = make(middleCut(text, n));
  return { lines };
}
