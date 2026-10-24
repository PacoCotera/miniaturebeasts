// The roadmap page's data file against its data contract (design/proposals/roadmap-page.md §6), and every path it links
// to present in the repository, so no "Read on GitHub" link on /roadmap/ lands on a missing file; then the Sandbox build's scope step (docs-only.sh).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const at = (p) => new URL(p, root);
const data = JSON.parse(readFileSync(at("website/roadmap.json"), "utf8"));
const STATUS = ["live", "building", "next", "later"];
const text = (v) => typeof v === "string" && v.trim() === v && v.length > 0;

test("roadmap.json follows the data contract: updated, modules with id, name, oneLine, optional image, items", () => {
  assert.deepEqual(Object.keys(data).sort(), ["modules", "updated"]);
  assert.match(data.updated, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(data.updated + "T00:00:00Z").toISOString().slice(0, 10), data.updated, "updated is a real date");
  assert.ok(Array.isArray(data.modules) && data.modules.length > 0);
  const ids = new Set();
  for (const m of data.modules) {
    for (const k of Object.keys(m)) assert.ok(["id", "name", "oneLine", "image", "items"].includes(k), `${m.id}: unknown field ${k}`);
    assert.match(m.id, /^[a-z][a-z0-9-]*$/, "the id is a fragment (#id) the glance links to");
    assert.ok(!ids.has(m.id), `${m.id}: ids are unique`); ids.add(m.id);
    assert.ok(text(m.name) && text(m.oneLine), `${m.id}: name and oneLine`);
    if ("image" in m) {
      assert.ok(text(m.image) && !m.image.startsWith("/"), `${m.id}: image is a path under website/`);
      assert.ok(existsSync(at("website/" + m.image)), `${m.id}: website/${m.image} exists`);
    }
    assert.ok(Array.isArray(m.items) && m.items.length > 0, `${m.id}: items`);
    for (const it of m.items) {
      assert.deepEqual(Object.keys(it).sort(), ["link", "status", "text", "title"], `${m.id}: ${it.title}`);
      assert.ok(text(it.title) && text(it.text) && text(it.link), `${m.id}: ${it.title}`);
      assert.ok(STATUS.includes(it.status), `${m.id}: ${it.title} has a known status (${it.status})`);
    }
  }
});

test("every link in roadmap.json is a path that exists in the repository (a trailing / is a folder)", () => {
  const links = [...new Set(data.modules.flatMap((m) => m.items.map((it) => it.link)))];
  const missing = links.filter((l) => {
    if (l.startsWith("/") || /^[a-z]+:/i.test(l) || l.split("/").includes("..")) return true;
    const p = at(l);
    if (!existsSync(p)) return true;
    return l.endsWith("/") ? !statSync(p).isDirectory() : !statSync(p).isFile();
  });
  assert.deepEqual(missing, []);
});

test("the page renders from ../roadmap.json and the homepage's roadmap links point to it", () => {
  const page = readFileSync(at("website/roadmap/index.html"), "utf8"), home = readFileSync(at("website/index.html"), "utf8");
  assert.match(page, /fetch\('\.\.\/roadmap\.json'\)/);
  assert.ok(!/ROADMAP\.md">[Rr]oadmap</.test(home), "no homepage roadmap link left on ROADMAP.md");
  assert.equal([...home.matchAll(/href="roadmap\/">[Rr]oadmap</g)].length, 2, "the FAQ and the footer");
});

// ---- The Sandbox build's scope step: a pull request that changes only documents skips the build (.github/docs-only.sh) ----

const rootDir = fileURLToPath(root), script = fileURLToPath(at(".github/docs-only.sh"));
const scope = (input) => execFileSync("sh", [script], { input, encoding: "utf8" }).trim();   // the script the workflow step runs, on a --name-status list
const diff = (...lines) => lines.map((l) => l.replace(" ", "\t")).join("\n") + "\n";

const OWN = /^(prototypes|website|\.github|ops|v1\/native\/vendor)(\/|$)/, SKIP = new Set(["node_modules", ".git", "dist", "golden", "img"]);
const buildReads = () => readFileSync(at(".github/build-reads.txt"), "utf8").split("\n").filter((l) => l && !l.startsWith("#"));
const covers = (list, p) => list.some((e) => (e.endsWith("/") ? (p + "/").startsWith(e) : e === p));

function scripts(dir, ext, out = []) {
  for (const f of readdirSync(dir)) {
    if (SKIP.has(f)) continue;
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) scripts(p, ext, out); else if (ext.test(f)) out.push(p);
  }
  return out;
}

// every string literal in the build's scripts that names a document or a folder under design/, art/, hardware/ or the root (outside the build's own folders), as a path from the root.
// The raw text is scanned, comments included: a quoted path in a comment is listed or reworded. A literal counts when it ends in .md, ends in /, or its last segment has no dot (a folder);
// any other file never passes condition 1 of the scope rule. A bare literal naming a root .md other than README.md counts as a root read (a bare README.md names a folder's own).
export function readsOf(files) {
  const tops = readdirSync(rootDir).filter((n) => !OWN.test(n) && n !== ".git" && n !== "node_modules");
  const found = new Map();
  for (const { file, text } of files) {   // file: the path from the root
    for (const m of text.matchAll(/["'`](?:(\.{1,2}\/[^"'`\s$\\]*|\/?[A-Za-z0-9_.-]+\/[^"'`\s$\\]*)|([A-Za-z0-9_.-]+\.md)(?=["'`]))/g)) {
      const lit = (m[1] ?? m[2]).replace(/[?#].*$/, "");
      const r = /^\.\.?\//.test(lit) ? path.posix.normalize(path.posix.join(path.posix.dirname(file), lit)) : lit.replace(/^\//, "");
      if (m[2] && (r === "README.md" || !tops.includes(r))) continue;
      if (r.startsWith("../") || OWN.test(r) || !tops.includes(r.split("/")[0]) || !(r.includes("/") || tops.includes(r))) continue;
      if (!(r.endsWith(".md") || r.endsWith("/") || !path.posix.basename(r).includes("."))) continue;
      if (!found.has(r)) found.set(r, file);
    }
  }
  return found;
}
const buildScripts = () => [...scripts(fileURLToPath(at("prototypes")), /\.(mjs|js|html|json|py|sh)$/), ...readdirSync(fileURLToPath(at(".github"))).filter((f) => f.endsWith(".mjs")).map((f) => path.join(rootDir, ".github", f))]
  .map((f) => ({ file: path.relative(rootDir, f).split(path.sep).join("/"), text: readFileSync(f, "utf8") }));
const uncovered = (files, list) => [...readsOf(files)].filter(([r]) => !covers(list, r) && !covers(list, r + "/")).map(([r, f]) => `${r} (read in ${f})`);

test("honesty: every document or folder outside the build's own folders that the build's scripts name is listed in .github/build-reads.txt", () => {
  assert.deepEqual(uncovered(buildScripts(), buildReads()), []);
});

test("honesty: a read that is not listed fails the scan (a planted read of a document, in a test and in a page)", () => {
  const at3 = (...seg) => seg.join("/"), note = at3("design", "proposals", "unlisted-note.md"), folder = at3("art", "unlisted") + "/", too = at3("design", "unlisted-too.md");   // built, so this file's own scan does not read them
  const planted = [
    { file: "prototypes/ui/tests/planted.test.mjs", text: `const md = readFileSync(new URL("${at3("..", "..", "..", note)}", import.meta.url), "utf8");` },
    { file: "prototypes/exploration/planted.html", text: `<script>fetch('${at3("..", "..", folder)}notes.md')</script>` },
    { file: ".github/planted.mjs", text: `readFileSync(\`${too}\`)` },
  ];
  assert.deepEqual(uncovered(planted, buildReads()), [
    `${note} (read in prototypes/ui/tests/planted.test.mjs)`,
    `${folder}notes.md (read in prototypes/exploration/planted.html)`,
    `${too} (read in .github/planted.mjs)`,
  ]);
  assert.deepEqual(uncovered(planted, [...buildReads(), note, folder, too]), []);
  const slash = at3("station-layouts", "*.svg"), inComment = at3("design", "proposals", "in-comment.md"), rootMd = "ROADMAP" + ".md", bare = "README" + ".md";
  assert.deepEqual(uncovered([{ file: "prototypes/ui/tests/planted.test.mjs", text: `// see ${slash}\nreadFileSync("${at3("..", "..", "..", note)}");` }], buildReads()),
    [`${note} (read in prototypes/ui/tests/planted.test.mjs)`], "a // comment holding /* does not hide the next line");
  assert.deepEqual(uncovered([{ file: "prototypes/ui/tests/planted.test.mjs", text: `/* "${at3("..", "..", "..", inComment)}" */ const a = "plain";` }], buildReads()),
    [`${inComment} (read in prototypes/ui/tests/planted.test.mjs)`], "a quoted path in a comment is reported");
  assert.deepEqual(uncovered([{ file: "prototypes/ui/tests/planted.test.mjs", text: `readFileSync("${rootMd}"); readFileSync("${bare}");` }], buildReads()),
    [`${rootMd} (read in prototypes/ui/tests/planted.test.mjs)`], "a bare literal naming a root .md other than README.md is a root read; a bare README.md is not");
});

test("the scope script, the eight cases (the step runs this script, so the table and the step cannot drift)", () => {
  assert.equal(scope(diff("M README.md")), "docs=true", "1. README.md alone: documents only");
  // 2. an unlisted .md that a test reads: the honesty tests above
  assert.equal(scope(diff("M design/proposals/ui-kit.md")), "docs=false", "3. read by a test: full build");
  assert.equal(scope(diff("M design/style-guide/station-layouts/notes.md")), "docs=false", "4. under a folder the build reads: full build");
  assert.equal(scope(diff("M website/index.html")), "docs=false", "5. a page");
  assert.equal(scope(diff("M prototypes/station/README.md")), "docs=false", "5. a .md under prototypes/");
  assert.equal(scope(diff("M prototypes/station/src/state.mjs")), "docs=false", "5. a prototypes file");
  assert.equal(scope(diff("M design/style-guide/station-layouts/00-frame.svg")), "docs=false", "6. an SVG in design/");
  assert.equal(scope(diff("D design/proposals/lvgl-switch.md")), "docs=false", "7. a document roadmap.json links to, deleted");
  assert.equal(scope(diff("D design/proposals/lvgl-switch.md", "A design/proposals/lvgl-engine.md")), "docs=false", "7. and renamed (a delete and an add)");
  assert.equal(scope(diff("M design/devices.md")), "docs=true", "8. an edit of a document roadmap.json links to");
});

test("the scope script: the three conditions on mixed lists, an empty list, and the roadmap's links", () => {
  assert.equal(scope(diff("M README.md", "M design/architecture.md", "A design/proposals/new-note.md")), "docs=true");
  assert.equal(scope(diff("M README.md", "M website/roadmap.json")), "docs=false", "one failing path decides");
  assert.equal(scope(diff("M README.md", "M .github/docs-only.sh")), "docs=false", "the script and the list are under .github/");
  assert.equal(scope(diff("M ops/ledger/README.md")), "docs=false");
  assert.equal(scope(diff("M v1/native/vendor/lvgl/README.md")), "docs=false");
  assert.equal(scope(diff("M v1/native/README.md")), "docs=true", "v1 outside its vendor folder");
  assert.equal(scope(diff("M design/notes.txt")), "docs=false", "not a .md");
  assert.equal(scope(diff("D design/old-unlinked-note.md")), "docs=true", "a delete roadmap.json does not link to");
  assert.equal(scope(diff("D ROADMAP.md")), "docs=false", "a linked root document");
  assert.equal(scope(diff("D hardware/README.md", "A hardware/README2.md")), "docs=false");
  assert.equal(scope(diff("D design/style-guide/station-layouts.md")), "docs=false", "listed and linked");
  assert.equal(scope(""), "docs=false", "an empty list");
  assert.equal(scope("\n"), "docs=false", "a blank list");
  assert.equal(scope("garbled line without a tab\n"), "docs=false", "an unreadable line fails closed");
  for (const l of buildReads()) if (l.endsWith("/") ? false : l.endsWith(".md")) assert.equal(scope(diff("M " + l)), "docs=false", `${l} is read by the build`);
});

test("the scope script on the data the step gives it: this repository's last commits (git diff --name-status --no-renames)", () => {
  const log = execFileSync("git", ["-C", rootDir, "log", "--format=%H", "-n", "40"], { encoding: "utf8" }).split("\n").filter(Boolean);
  let checked = 0;
  for (const c of log) {
    let list; try { list = execFileSync("git", ["-C", rootDir, "diff", "--name-status", "--no-renames", c + "^1", c], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { continue; }
    const paths = list.split("\n").filter(Boolean).map((l) => l.split("\t")[1]), only = paths.length > 0 && paths.every((p) => p.endsWith(".md") && !OWN.test(p) && !covers(buildReads(), p));
    // a commit of documents only may still hold a delete roadmap.json links to: the script is the judge there, and must never say docs=true for what is not .md
    if (!only) assert.equal(scope(list), "docs=false", c); else assert.ok(["docs=true", "docs=false"].includes(scope(list)), c);
    checked++;
  }
  assert.ok(checked > 0 || log.length === 0);
});
