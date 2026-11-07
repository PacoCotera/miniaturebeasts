// Canonical JSON for everything the realm signs or hashes: one module for the Station, the Companion, the Caddy and the tests.
// First JSON.parse(JSON.stringify(x)) (so undefined, functions, toJSON and the like settle the way JSON settles them), then keys in JavaScript's default sort order,
// no whitespace, and -0 written as 0. A value that is not finite throws (JSON would have written null); so does a top level that has no JSON form.
import { utf8 } from "./b64.mjs";

function plain(x) {
  const s = JSON.stringify(x, (k, v) => {
    if ((typeof v === "number" || v instanceof Number) && !Number.isFinite(Number(v))) throw new Error("canonical: not a finite number at '" + k + "'");
    return v;
  });
  if (s === undefined) throw new Error("canonical: no JSON form");
  return JSON.parse(s);
}

function write(v) {
  if (v === null || typeof v === "boolean" || typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number") return Object.is(v, -0) ? "0" : JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(write).join(",") + "]";
  return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + write(v[k])).join(",") + "}";
}

export const canonical = (x) => write(plain(x));
export const canonicalBytes = (x) => utf8(canonical(x));
