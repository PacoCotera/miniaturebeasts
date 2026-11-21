// Tiny bundler: turns the plain ES modules under src/ into one classic script
// (each module in its own function scope), so tests/scan.html runs the very
// same decoder from a file:// URL with no server and no dependencies.
import { readFileSync } from "node:fs";

export function bundle(entries) {
  const order = [], seen = new Set();
  const visit = (url) => {
    if (seen.has(url.href)) return;
    seen.add(url.href);
    const src = readFileSync(url, "utf8");
    for (const m of src.matchAll(/^import\s+\{[^}]*\}\s+from\s+"(\.[^"]+)";/gm)) visit(new URL(m[1], url));
    order.push({ url, src });
  };
  for (const e of entries) visit(e);
  const name = (url) => "__m_" + url.pathname.split("/").pop().replace(/\W/g, "_");
  const parts = [];
  for (const { url, src } of order) {
    const exported = [];
    let body = src.replace(/^import\s+\{([^}]*)\}\s+from\s+"(\.[^"]+)";/gm, (_, names, from) => {
      const mod = name(new URL(from, url));
      return `const {${names}} = ${mod};`;
    });
    if (/^import\s/m.test(body)) throw new Error(`unsupported import in ${url.pathname}`);
    body = body.replace(/^export\s+(async\s+function|function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kw, id) => {
      exported.push(id);
      return `${kw} ${id}`;
    });
    body = body.replace(/^export\s+\{([^}]*)\};?/gm, (_, names) => {
      exported.push(...names.split(",").map((s) => s.trim()).filter(Boolean));
      return "";
    });
    parts.push(`const ${name(url)} = (() => {\n${body}\nreturn { ${exported.join(", ")} };\n})();`);
  }
  return parts.join("\n");
}
