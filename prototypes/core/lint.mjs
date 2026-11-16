// The core lint guard: nothing inside prototypes/core/ may hold a fraction, a clock, a screen, storage, the network, the device's randomness,
// an inexact maths call, or an import from outside the core. Run: node prototypes/core/lint.mjs (exit 1 and the lines when something is refused).
// It reads the source as text: comments and strings are blanked first, then each rule looks at what is left.
// whole.mjs alone may divide (the division of whole numbers lives there, for everyone else to ask).
// Still to come with the rules that need them: the small-engine rules for core/expedition, a sentence in an event.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIVIDES = new Set(["base/whole.mjs"]);

const NAMES = [
  [/\b(?:Date|performance|setTimeout|setInterval|setImmediate|requestAnimationFrame|queueMicrotask)\b/, "the clock or a timer"],
  [/\b(?:localStorage|sessionStorage|indexedDB|caches)\b/, "storage"],
  [/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|navigator)\b/, "the network or the device"],
  [/\b(?:document|window|self|screen|HTMLElement|OffscreenCanvas|ImageData|devicePixelRatio)\b/, "the screen"],
  [/\bMath\.random\b|\bcrypto\b/, "the device's randomness"],
  [/\bMath\.(?:sin|cos|tan|asin|acos|atan2?|sinh|cosh|tanh|asinh|acosh|atanh|pow|exp|expm1|log|log1p|log2|log10|hypot|cbrt|fround)\b/, "an inexact maths call"],
  [/\b(?:process|globalThis|require|eval|Function)\b/, "a global the core may not read"],
];

// Blank comments, strings, template text and regular expressions, keeping line breaks and every other character.
export function blank(src) {
  let out = "", i = 0, last = "";
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "/") { while (i < n && src[i] !== "\n") { out += " "; i++; } continue; }
    if (c === "/" && d === "*") { while (i < n && !(src[i] === "*" && src[i + 1] === "/")) { out += src[i] === "\n" ? "\n" : " "; i++; } out += "  "; i += 2; continue; }
    if (c === '"' || c === "'" || c === "`") {
      const q = c; out += q; i++;
      while (i < n && src[i] !== q) { if (src[i] === "\\") { out += " "; i++; } out += src[i] === "\n" ? "\n" : " "; i++; }
      out += q; i++; last = q; continue;
    }
    if (c === "/" && /[(,=:[!&|?{};+\-*%<>~^]|^$/.test(last)) {   // a regular expression, by what came before it
      out += "/"; i++;
      let cls = false;
      while (i < n && (src[i] !== "/" || cls) && src[i] !== "\n") { if (src[i] === "\\") { out += " "; i++; } if (src[i] === "[") cls = true; if (src[i] === "]") cls = false; out += " "; i++; }
      out += "/"; i++;
      while (i < n && /[a-z]/.test(src[i])) { out += " "; i++; }
      last = "/"; continue;
    }
    out += c; i++;
    if (!/\s/.test(c)) last = c;
  }
  return out;
}

export function check(file, src) {
  const text = blank(src), found = [], lines = text.split("\n"), here = relative(ROOT, file).split(sep).join("/");
  lines.forEach((line, k) => {
    const at = (why) => found.push(`${here}:${k + 1}: ${why}`);
    for (const [re, why] of NAMES) if (re.test(line)) at(why);
    if (/(?<![\w.])\d+\.\d+|(?<![\w.])\.\d+|\d[eE][-+]?\d/.test(line.replace(/0x[0-9a-fA-F_]+/g, " "))) at("a fraction (a decimal or exponent literal)");
    if (!DIVIDES.has(here) && /[^/*]\/(?![/*])/.test(line.replace(/\/\*|\*\//g, ""))) at("division (use div or scale from base/whole.mjs)");
  });
  // Imports and exports from: only relative files inside the core.
  const original = src.split("\n");
  original.forEach((line, k) => {
    const m = /^\s*(?:import|export)\b[^"']*?from\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']/.exec(line);
    if (!m) return;
    const spec = m[1] ?? m[2];
    const target = resolve(dirname(file), spec);
    if (!spec.startsWith(".") || relative(ROOT, target).startsWith("..")) found.push(`${here}:${k + 1}: an import from outside the core (${spec})`);
  });
  return found;
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".mjs") && p !== fileURLToPath(import.meta.url) ? [p] : [];
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const found = walk(ROOT).flatMap((f) => check(f, readFileSync(f, "utf8")));
  if (found.length) { console.error(found.join("\n")); console.error(`core lint: ${found.length} refused`); process.exit(1); }
  console.log("core lint: clean");
}
