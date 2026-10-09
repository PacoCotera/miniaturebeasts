// The roadmap page's data file against its data contract (design/proposals/roadmap-page.md §6), and every path it links
// to present in the repository, so no "Read on GitHub" link on /roadmap/ lands on a missing file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";

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
