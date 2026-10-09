#!/usr/bin/env node
// The public-repository guard: no cost record, host or tunnel detail, session trace, absolute path or secret value
// reaches this repository. The rules and the allowlist are data, in rules.json beside this file.
//   node .github/public-guard/guard.mjs --base <ref>       diff mode: the lines `git diff --unified=0 <ref>...HEAD` adds,
//                                                         each image added or changed, and the commit messages in <ref>..HEAD
//   node .github/public-guard/guard.mjs --tree             tree mode: every tracked file
//   node .github/public-guard/guard.mjs --self-test        one positive and one negative fixture per rule
// A hit prints `file:line rule-id match` with the match masked after four characters, and the run fails.
// Node 22, no dependencies. Excluded paths are in rules.json; frozen files are read, never written.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { inflateSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const RULES = JSON.parse(readFileSync(path.join(here, "rules.json"), "utf8"));

const rx = ([src, flags]) => new RegExp(src, "g" + (flags || ""));
const byId = Object.fromEntries(RULES.rules.map((r) => [r.id, r]));
const costKeyRe = new RegExp(
  `(?:"|\\b)(?:${RULES.costKeys.join("|")}|(?:${RULES.costKeyPrefixes.join("|")})[A-Za-z0-9]*)(?:"\\s*:|\\b(?=\\s*[,;\\n]|$))`, "g");
const compiled = Object.fromEntries(RULES.rules.map((r) => [r.id, {
  patterns: (r.patterns || []).map(rx),
  codeStringPatterns: (r.codeStringPatterns || []).map(rx),
}]));
const textRules = RULES.rules.filter((r) => r.applies === "text").map((r) => r.id);
const PL = byId["process-label"];
const plDate = PL ? rx(PL.datePattern) : null;

// process-label: design/**/*.md, README.md and ROADMAP.md, never docs-standard.md; in tree mode only under PL.tree.
export function processDoc(file, tree = false) {
  if (!PL) return false;
  const p = PL.paths, base = path.posix.basename(file);
  if (p.excludeBasenames.includes(base)) return false;
  const inScope = p.files.includes(file) || p.prefixes.some((x) => file.startsWith(x) && file.endsWith(p.suffix));
  if (!inScope) return false;
  return !tree || PL.tree.some((t) => file === t || file.startsWith(t.endsWith("/") ? t : t + "/"));
}

// The lines of a Markdown text inside fenced code blocks (``` or ~~~), by 1-based number.
export function fencedLines(text) {
  const out = new Set(); let fence = null;
  text.split("\n").forEach((l, i) => {
    const m = /^\s{0,3}(`{3,}|~{3,})/.exec(l);
    if (fence) { out.add(i + 1); if (m && m[1][0] === fence[0] && m[1].length >= fence.length && !l.trim().slice(m[1].length).length) fence = null; }
    else if (m) { fence = m[1]; out.add(i + 1); }
  });
  return out;
}

// A line with its inline code and link targets blanked (same length, so positions hold).
const blank = (s) => " ".repeat(s.length);
function prosePart(line) {
  return line.replace(/(`+)[^`]*?\1/g, blank).replace(/\]\([^)]*\)/g, (m) => "]" + blank(m.slice(1)));
}

export function checkProcess(file, line) {
  const text = prosePart(line), hits = [];
  for (const re of compiled["process-label"].patterns) for (const h of matches(re, text)) hits.push({ rule: "process-label", text: h.text });
  for (const h of matches(plDate, text)) {
    // skip a date that is part of an image or file name (a token with an extension or a path)
    const start = text.lastIndexOf(" ", h.index) + 1, endSp = text.indexOf(" ", h.index), token = text.slice(start, endSp < 0 ? text.length : endSp);
    if (/[\w-]\.[A-Za-z0-9]{1,5}\b/.test(token.slice(token.indexOf(h.text))) || token.includes("/")) continue;
    hits.push({ rule: "process-label", text: h.text });
  }
  return hits;
}

export function kindOf(file) {
  const ext = path.extname(file).toLowerCase();
  if (RULES.dataTypes.includes(ext)) return "data";
  if (RULES.proseTypes.includes(ext)) return "prose";
  if (RULES.codeTypes.includes(ext)) return "code";
  if (RULES.imageTypes.includes(ext)) return "image";
  if ((RULES.binaryTypes || []).includes(ext)) return "binary";
  return "other";
}

export const excluded = (file) => RULES.exclude.some((p) => file.startsWith(p));

// The comment part of a code line: from the first comment marker that is outside a string.
function commentOf(file, line) {
  const ext = path.extname(file).toLowerCase();
  const t = line.trimStart();
  if ([".mjs", ".js", ".cjs", ".jsx", ".ts", ".c", ".h", ".cpp"].includes(ext) && (t.startsWith("*") || t.startsWith("/*"))) return line;
  const markers = [".py", ".sh", ".yml", ".yaml", ".toml"].includes(ext) ? ["#"] : ext === ".lua" ? ["--"] : ["//", "/*"];
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === "\\") i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    for (const m of markers) if (line.startsWith(m, i)) return line.slice(i);
  }
  return "";
}

function matches(re, text) {
  const out = [];
  re.lastIndex = 0;
  for (let m; (m = re.exec(text)); ) { out.push({ index: m.index, text: m[0] }); if (m[0] === "") re.lastIndex++; }
  return out;
}

function allowed(file, rule, line, hit) {
  return RULES.allowlist.some((a) => {
    if (a.path !== file || a.rule !== rule) return false;
    for (let i = line.indexOf(a.value); i >= 0; i = line.indexOf(a.value, i + 1))
      if (hit.index < i + a.value.length && i < hit.index + hit.text.length) return true;
    return false;
  });
}

// Every hit on one line of a text file: [{rule, text}].
export function checkLine(file, line) {
  if (excluded(file)) return [];
  const kind = kindOf(file), hits = [];
  if (kind === "binary") return hits;
  const add = (rule, text, list, offset = 0) => {
    for (const h of list) { const hit = { index: h.index + offset, text: h.text }; if (!allowed(file, rule, line, hit)) hits.push({ rule, text: h.text }); }
  };
  if (kind === "data") add("cost-key", line, matches(costKeyRe, line));
  if (kind === "prose") for (const re of compiled["cost-prose"].patterns) add("cost-prose", line, matches(re, line));
  if (kind === "code") {
    const comment = commentOf(file, line), off = line.length - comment.length;
    const seen = new Set();
    for (const re of compiled["cost-prose"].patterns) for (const h of matches(re, comment)) { seen.add(h.index + off); add("cost-prose", line, [h], off); }
    for (const re of compiled["cost-prose"].codeStringPatterns) add("cost-prose", line, matches(re, line).filter((h) => !seen.has(h.index)));
  }
  for (const id of textRules) for (const re of compiled[id].patterns) add(id, line, matches(re, line));
  // one report per rule and position
  const uniq = new Map();
  for (const h of hits) uniq.set(h.rule + "\0" + h.text, h);
  return [...uniq.values()];
}

// The text an image carries outside its vendor-signed provenance: PNG tEXt/iTXt/zTXt chunks, JPEG APP1 (EXIF, XMP)
// and COM segments, WebP EXIF and XMP chunks, a GIF whole. C2PA/JUMBF (PNG caBX, JPEG APP11) is skipped.
export function imageText(buf, file) {
  const ext = path.extname(file).toLowerCase(), out = [];
  if (ext === ".png" && buf.length > 8 && buf.readUInt32BE(0) === 0x89504e47) {
    for (let p = 8; p + 8 <= buf.length; ) {
      const len = buf.readUInt32BE(p), type = buf.toString("latin1", p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
      if (type === "tEXt") out.push(data.toString("latin1"));
      else if (type === "zTXt" || type === "iTXt") {
        const nul = data.indexOf(0);
        if (type === "zTXt") { try { out.push(data.toString("latin1", 0, nul) + " " + inflateSync(data.subarray(nul + 2)).toString("latin1")); } catch { out.push(data.toString("latin1")); } }
        else {
          const compressed = data[nul + 1] === 1;
          let q = nul + 3; q = data.indexOf(0, q) + 1; q = data.indexOf(0, q) + 1;
          const body = data.subarray(q);
          try { out.push(data.toString("latin1", 0, nul) + " " + (compressed ? inflateSync(body) : body).toString("utf8")); } catch { out.push(data.toString("latin1")); }
        }
      }
      if (type === "IEND") break;
      p += 12 + len;
    }
  } else if ((ext === ".jpg" || ext === ".jpeg") && buf[0] === 0xff && buf[1] === 0xd8) {
    for (let p = 2; p + 4 <= buf.length && buf[p] === 0xff; ) {
      const marker = buf[p + 1];
      if (marker === 0xda || marker === 0xd9) break;
      const len = buf.readUInt16BE(p + 2);
      if (marker === 0xe1 || marker === 0xfe) out.push(buf.toString("latin1", p + 4, p + 2 + len));
      p += 2 + len;
    }
  } else if (ext === ".webp" && buf.toString("latin1", 0, 4) === "RIFF") {
    for (let p = 12; p + 8 <= buf.length; ) {
      const type = buf.toString("latin1", p, p + 4), len = buf.readUInt32LE(p + 4);
      if (type === "EXIF" || type === "XMP ") out.push(buf.toString("latin1", p + 8, p + 8 + len));
      p += 8 + len + (len & 1);
    }
  } else if (ext === ".gif") out.push(buf.toString("latin1"));
  return out.join("\n");
}

export function checkImage(file, buf) {
  if (excluded(file)) return [];
  const text = imageText(buf, file), hits = [];
  const rule = byId["image-text"];
  const res = [...rule.uses.flatMap((id) => compiled[id].patterns), ...compiled["image-text"].patterns];
  for (const re of res) for (const h of matches(re, text)) hits.push({ rule: "image-text", text: h.text });
  return hits;
}

export function checkMessage(msg) {
  return RULES.commitTrailers.filter((t) => msg.toLowerCase().includes(t.toLowerCase()));
}

const mask = (s) => (s.length <= 4 ? s : s.slice(0, 4) + "*".repeat(Math.min(s.length - 4, 12)));
const git = (...args) => execFileSync("git", args, { encoding: "buffer", maxBuffer: 1 << 30 });

function report(hits) {
  for (const h of hits) console.log(`${h.file}:${h.line} ${h.rule} ${mask(h.text)}`);
}

function printAllowlist() {
  console.log(`allowlist (${RULES.allowlist.length} entries):`);
  for (const a of RULES.allowlist) console.log(`  ${a.path}  ${a.rule}  "${a.value}"  (${a.reason})`);
}

function diffMode(base) {
  const hits = [], fences = new Map();
  const fenced = (f, n) => { if (!fences.has(f)) { let t = ""; try { t = readFileSync(f, "utf8"); } catch {} fences.set(f, fencedLines(t)); } return fences.get(f).has(n); };
  const diff = git("diff", "--unified=0", "--no-color", "--no-ext-diff", "--no-renames", `${base}...HEAD`).toString("utf8").split("\n");
  let file = null, ln = 0;
  for (const l of diff) {
    if (l.startsWith("+++ ")) { file = l === "+++ /dev/null" ? null : l.slice(6); continue; }
    if (l.startsWith("--- ") || l.startsWith("diff --git") || l.startsWith("index ")) continue;
    const h = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(l);
    if (h) { ln = +h[1]; continue; }
    if (file && l.startsWith("+")) {
      for (const x of checkLine(file, l.slice(1))) hits.push({ file, line: ln, ...x });
      if (!excluded(file) && processDoc(file) && !fenced(file, ln)) for (const x of checkProcess(file, l.slice(1))) hits.push({ file, line: ln, ...x });
      ln++;
    }
  }
  const names = git("diff", "--name-only", "--diff-filter=AM", "--no-renames", "-z", `${base}...HEAD`).toString("utf8").split("\0").filter(Boolean);
  for (const f of names) if (kindOf(f) === "image" && !excluded(f)) for (const x of checkImage(f, readFileSync(f))) hits.push({ file: f, line: 0, ...x });
  const log = git("log", "--format=%H%x00%B%x01", `${base}..HEAD`).toString("utf8").split("\x01");
  for (const entry of log) {
    const [sha, msg] = entry.trim().split("\0");
    if (!sha || msg === undefined) continue;
    for (const t of checkMessage(msg)) hits.push({ file: `commit ${sha.slice(0, 8)}`, line: 0, rule: "commit-trailer", text: t });
  }
  return hits;
}

function treeMode() {
  const hits = [];
  for (const f of git("ls-files", "-z").toString("utf8").split("\0").filter(Boolean)) {
    if (excluded(f)) continue;
    let buf; try { buf = readFileSync(f); } catch { continue; }
    if (kindOf(f) === "binary") continue;
    if (kindOf(f) === "image") { for (const x of checkImage(f, buf)) hits.push({ file: f, line: 0, ...x }); continue; }
    if (buf.subarray(0, 8192).includes(0)) continue;
    const text = buf.toString("utf8"), pd = processDoc(f, true), fl = pd ? fencedLines(text) : null;
    text.split("\n").forEach((line, i) => {
      for (const x of checkLine(f, line)) hits.push({ file: f, line: i + 1, ...x });
      if (pd && !fl.has(i + 1)) for (const x of checkProcess(f, line)) hits.push({ file: f, line: i + 1, ...x });
    });
  }
  return hits;
}

function png(chunks) {
  const parts = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])];
  for (const [type, data] of [...chunks, ["IEND", Buffer.alloc(0)]]) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    parts.push(len, Buffer.from(type, "latin1"), data, Buffer.alloc(4));
  }
  return Buffer.concat(parts);
}

// One positive (must hit) and one negative (must pass) fixture per rule, built here.
export const FIXTURES = [
  { rule: "cost-key", file: "art/x/sidecar.json", hit: '  "costUSD": 0.18,', pass: '  "costIndex": 3,' },
  { rule: "cost-key", file: "art/x/sidecar.jsonl", hit: '{"usdPerIndividual": 1}', pass: '{"usage": {"in": 1}}' },
  { rule: "cost-prose", file: "design/x.md", hit: "about $0.35 a mibi", pass: "about 20 calls a species" },
  { rule: "cost-prose", file: "tools/x.py", hit: 'print(f"spent $1.20 today")', pass: 'subprocess.run(["sed", "s/a/$1/"])' },
  { rule: "cost-prose", file: "ROADMAP.md", hit: "a US$900 kit", pass: "under a US$750 retail" },
  { rule: "host", file: "ops/x.sh", hit: "ssh -i k paco@example.org", pass: "the sandbox server" },
  { rule: "host", file: "design/x.md", hit: "on the VM", pass: "the critter-lab repository" },
  { rule: "session", file: "art/x/budget.json", hit: '"plan": "/tmp/claude-0/x/plan.json"', pass: '"plan": "plan-pods-r1-flat.json"' },
  { rule: "abs-path", file: "prototypes/x.mjs", hit: 'const R = "/home/user/miniaturebeasts";', pass: "const R = process.env.MB_ROOT;" },
  { rule: "secret-value", file: "prototypes/x.mjs", hit: 'const apiToken = "q8Zr2mXv91";', pass: "const key = process.env.GEMINI_API_KEY;" },
  { rule: "secret-value", file: "prototypes/caddy/tests/caddy.test.mjs", hit: 'GEMINI_API_KEY: "real-looking-key"', pass: 'GEMINI_API_KEY: "test-key-never-used"' },
  { rule: "secret-value", file: "prototypes/x.mjs", hit: "const k = sk-proj-Xa7mQ2zL9pR4tW8vB1nC6dF3;", pass: "the sk-proj- prefix names a project key" },
  { rule: "secret-value", file: "ops/x.sh", hit: "EXAMPLE_API_KEY=q7Lm2Xv9Rt4Wp8Zn", pass: "EXAMPLE_API_KEY=$EXAMPLE_API_KEY" },
];

function selfTest() {
  let bad = 0;
  const ok = (cond, what) => { if (!cond) { bad++; console.log("self-test FAIL: " + what); } };
  const covered = new Set();
  for (const f of FIXTURES) {
    covered.add(f.rule);
    ok(checkLine(f.file, f.hit).some((h) => h.rule === f.rule), `${f.rule} should hit: ${f.hit}`);
    ok(!checkLine(f.file, f.pass).some((h) => h.rule === f.rule), `${f.rule} should pass: ${f.pass}`);
  }
  ok(checkLine(".github/public-guard/rules.json", '"costUSD": 1').length === 0, "excluded path");
  const tainted = png([["tEXt", Buffer.from("Comment\0made in /tmp/claude-0/x", "latin1")]]);
  const signed = png([["caBX", Buffer.from("jumb c2pa Claude /home/user/ code", "latin1")], ["tEXt", Buffer.from("Software\0gpt-image", "latin1")]]);
  ok(checkImage("art/x.png", tainted).length > 0, "image-text should hit a tEXt path");
  ok(checkImage("art/x.png", signed).length === 0, "image-text should skip C2PA and pass plain provenance");
  covered.add("image-text");
  // process-label, the owner's fixtures (2026-10-09 13:49), on a design document
  const pl = (t) => checkProcess("design/proposals/x.md", t).length > 0;
  ok(pl("**Decided:** x"), "process-label should hit: **Decided:** x");
  ok(pl("(Decided)"), "process-label should hit: (Decided)");
  ok(pl("the owner chose"), "process-label should hit: the owner chose");
  ok(pl("a hull"), "process-label should hit: a hull");
  ok(pl("Agreed on 2026-10-09."), "process-label should hit a date");
  ok(!pl("A child takes one copy from each parent."), "process-label should pass: A child takes one copy from each parent.");
  ok(!pl("![x](img/2026-10-08-a.png)"), "process-label should pass: ![x](img/2026-10-08-a.png)");
  ok(!pl("see `the owner` and [a](notes/2026-10-08.md)"), "process-label should skip inline code and link targets");
  ok(fencedLines("a\n```\nthe owner\n```\nb").has(3) && !fencedLines("a\n```\nx\n```\nb").has(5), "fenced lines");
  ok(processDoc("design/proposals/x.md") && processDoc("README.md") && processDoc("ROADMAP.md") && !processDoc("design/docs-standard.md") && !processDoc("art/x/README.md") && !processDoc("design/x.txt"), "process-label paths");
  ok(!processDoc("design/proposals/x.md", true), "process-label tree mode only under its path list");
  covered.add("process-label");
  ok(checkMessage("Fix\n\nCo-Authored-By: someone").length === 1 && checkMessage("Fix the guard").length === 0, "commit trailers");
  for (const r of RULES.rules) ok(covered.has(r.id), `no fixture for ${r.id}`);
  console.log(bad ? `self-test: ${bad} failed` : `self-test ok: ${FIXTURES.length + 2} fixture pairs, ${RULES.rules.length} rules`);
  return bad === 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes("--self-test")) process.exit(selfTest() ? 0 : 1);
  printAllowlist();
  let hits;
  if (argv.includes("--tree")) hits = treeMode();
  else {
    const i = argv.indexOf("--base");
    if (i < 0 || !argv[i + 1]) { console.error("usage: guard.mjs --base <ref> | --tree | --self-test"); process.exit(2); }
    hits = diffMode(argv[i + 1]);
  }
  report(hits);
  console.log(hits.length ? `public guard: ${hits.length} hits` : "public guard ok");
  process.exit(hits.length ? 1 : 0);
}
