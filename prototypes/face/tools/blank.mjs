// The blanker of the face guard and of the tests that assert an absence in source: one pass over the text, so a comment marker inside a string, a regex or another comment is never read as a comment.
// States: code; '…' and "…" (end at a newline); a template with ${} depth; a regex literal with [...] classes (ends at a newline); a line comment; a block comment.
// Comments are dropped, everything else is kept as written, and every newline is kept, so a line number in the output is the line number in the source.
//   blank(src)                              JavaScript
//   blank(src, { js: false })               C: quotes and comments only (no template, no regex literal)
const REGEX_AFTER_WORD = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"]);
const REGEX_AFTER_CHAR = "(,=:[!&|?{};+-*%<>~^";

export function blank(src, { js = true } = {}) {
  let out = "", i = 0;
  const n = src.length, tpl = [];   // tpl: the open ${} depths of the templates we are inside
  let last = "", word = "";          // the last code character that was not whitespace, and the word it ends
  const emit = (s) => { out += s; };
  const regexAllowed = () => last === "" || REGEX_AFTER_CHAR.includes(last) || (/[A-Za-z_$]/.test(last) && REGEX_AFTER_WORD.has(word));
  const template = () => {   // inside a template's text, from the character after the backtick or after a closing brace of ${}; returns when the template ends or a ${ opens
    while (i < n) {
      const c = src[i];
      if (c === "\\") { emit(c); if (i + 1 < n) emit(src[i + 1]); i += 2; continue; }
      if (c === "`") { emit(c); i++; last = "`"; word = ""; return; }
      if (c === "$" && src[i + 1] === "{") { emit("${"); i += 2; tpl.push(0); last = "{"; word = ""; return; }
      emit(c); i++;
    }
  };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && d === "*") { i += 2; while (i < n && !(src[i] === "*" && src[i + 1] === "/")) { if (src[i] === "\n") emit("\n"); i++; } i += 2; continue; }
    if (c === '"' || c === "'") {
      emit(c); i++;
      while (i < n && src[i] !== "\n") { const e = src[i]; emit(e); i++; if (e === "\\" && i < n && src[i] !== "\n") { emit(src[i]); i++; } else if (e === c) break; }
      last = c; word = ""; continue;
    }
    if (js && c === "`") { emit(c); i++; template(); continue; }
    if (js && c === "/" && regexAllowed()) {
      emit(c); i++;
      let cls = false;
      while (i < n && src[i] !== "\n") { const e = src[i]; emit(e); i++; if (e === "\\" && i < n && src[i] !== "\n") { emit(src[i]); i++; } else if (e === "[") cls = true; else if (e === "]") cls = false; else if (e === "/" && !cls) break; }
      last = "/"; word = "x"; continue;   // a regex is a value: a "/" after it divides
    }
    if (js && tpl.length) {
      if (c === "{") tpl[tpl.length - 1]++;
      else if (c === "}") { if (tpl[tpl.length - 1] === 0) { tpl.pop(); emit(c); i++; template(); continue; } tpl[tpl.length - 1]--; }
    }
    emit(c); i++;
    if (/\s/.test(c)) continue;
    if (/[A-Za-z0-9_$]/.test(c)) word = /[A-Za-z0-9_$]/.test(last) ? word + c : c; else word = "";
    last = c;
  }
  return out;
}
