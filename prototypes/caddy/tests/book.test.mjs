// The book page and the two live lines of the /admin index, on the Caddy service: login only, read only, drawn from editorial's four
// status files in the same shapes they write, no inline style or script, a part left out when its file is missing, every word escaped;
// the Bugs card's summary counted with the bugs page's own grouping; the way back on the play notes page.
//   node --test prototypes/caddy/tests/book.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { createApp } from "../app.mjs";

const NOW = Date.parse("2026-11-17T20:00:00Z");   // 14:00 in Mexico City
const put = (dir, name, o) => writeFileSync(path.join(dir, "book", name + ".json"), JSON.stringify(o));
const thread = (id, o) => ({ thread_id: id, anchor: "x", created: "2026-11-15", first_comment: "words " + id, status: "open", fixed_in: null, last_reply: null, updated: "2026-11-15", row: 10, ...o });
const spread = (pages, status, title = "T" + pages) => ({ pages, first: parseInt(pages, 10), title, part: "P", type: "vista", status, evidence: "", flaws: "" });

async function serve(dir) {
  const app = createApp({ dataDir: dir, now: () => NOW });
  const server = createServer((req, res) => app.handle(req, res)); await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => server.close(), H: { "x-studio-user": "paco" } };
}

test("book page: login only, read only, the head, comments open and fixed, spreads in four states, nothing inline", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "mb-book-")); mkdirSync(path.join(dir, "book"));
  const { base, close, H } = await serve(dir);
  try {
    for (const p of ["/admin/book", "/admin/book/book.css", "/admin/book/summary.json", "/admin/bugs/summary.json"]) assert.equal((await fetch(base + p)).status, 403, p + " needs the login");
    assert.equal((await fetch(base + "/admin/book", { method: "POST", headers: H })).status, 405);
    // no files yet: a plain page with the way back, never an error
    const none = await (await fetch(base + "/admin/book", { headers: H })).text();
    assert.match(none, /No proof published yet/); assert.match(none, /have not arrived yet/); assert.ok(none.includes('<a class="back" href="/admin/">← Admin</a>'));
    put(dir, "proof", { version: 105, published: "2026-11-17T10:36:48-06:00", url: "https://claude.ai/artifact/EA7S7Rhs2cCx16NAMvyG8U", rows: 108, last_change: "The Hills <b>opener</b> added." });
    put(dir, "pdf", { url: "https://github.com/PacoCotera/miniaturebeasts-internal/releases/tag/proof-latest", file: "https://github.com/PacoCotera/miniaturebeasts-internal/releases/download/proof-latest/miniature-beasts-proof.pdf", built: "2026-11-12T10:39:36-06:00", proof_version: 105, pages: 109, size_mb: 46.8, stale: true });
    put(dir, "comments", { total: 4, open: 2, fixed: 2, threads: [
      thread("a", { first_comment: "late <i>one</i>", row: 90, created: "2026-11-17" }),
      thread("b", { first_comment: "early one", row: 12, created: "2026-11-05" }),
      thread("c", { first_comment: "fixed old", status: "fixed", fixed_in: 88, updated: "2026-11-11" }),
      thread("d", { first_comment: "fixed new", status: "fixed", fixed_in: 101, updated: "2026-11-16", page: "40-41" }),
    ] });
    put(dir, "spreads", { summary: {}, spreads: [spread("1", "in-proof"), spread("2-3", "in-proof"), spread("4-5", "in-proof-old"), spread("6-7", "built"), spread("8-9", "with-ad"), spread("10-11", "missing", "Not yet <made>"), spread("12-13", "freed")] });
    const html = await (await fetch(base + "/admin/book", { headers: H })).text(), at = (s) => html.indexOf(s);
    assert.match(html, /Proof 105 · updated today 10:36/, "proof version and its time in Mexico City");
    assert.ok(html.includes("Last change: The Hills &lt;b&gt;opener&lt;/b&gt; added.") && !html.includes("<b>opener</b>"), "escaped");
    assert.ok(html.includes('href="https://claude.ai/artifact/EA7S7Rhs2cCx16NAMvyG8U"') && html.includes('href="/admin/index/book/miniature-beasts-proof.pdf"'), "the two buttons");
    assert.ok(!html.includes("github.com") && !html.includes("proof-light.pdf"), "the PDF from the admin's own server, never the private release; no light button without its size");
    assert.ok(html.includes("12 Nov · older than proof 105") && html.includes('what old"'), "an old PDF says so");
    assert.ok(at("early one") < at("late &lt;i&gt;one&lt;/i&gt;"), "open comments in order of place");
    assert.ok(html.includes('<div class="open"><b>2</b><span>open</span>') && html.includes('<div class="fixed"><b>2</b><span>fixed</span>'), "the tally");
    assert.ok(html.includes("<summary>Fixed (2)</summary>") && at("fixed new") < at("fixed old"), "fixed folded, newest first");
    assert.ok(html.includes("fixed in proof 101") && html.includes("pp. 40–41") && html.includes("Row 90"), "where and which proof");
    assert.ok(html.includes("<b>2</b> in the proof</span>") && html.includes("<b>1</b> in the proof, old layout") && html.includes("<b>2</b> made, not in the proof yet") && html.includes("<b>1</b> not made yet"), "four states with their counts; a freed spread is left out");
    assert.equal((html.match(/<div class="map">(.*?)<\/div>/s)[1].match(/<span /g) || []).length, 6, "one tile per spread in the plan that is not freed");
    assert.ok(html.includes("<summary>Not made yet (1)</summary>") && html.includes("Not yet &lt;made&gt;"), "the not-made list");
    assert.ok(!/<style|style=|<script|\son\w+=/.test(html), "no inline style or script");
    assert.ok(html.includes('href="/admin/team/team.css"') && html.includes('href="/admin/bugs/bugs.css"') && html.includes('href="/admin/book/book.css"'));
    assert.match(html, /Content-Security-Policy/);
    const css = await fetch(base + "/admin/book/book.css", { headers: H }); const cssText = await css.text();
    assert.equal(css.status, 200); assert.match(css.headers.get("content-type"), /text\/css/); assert.ok(cssText.includes(".w-0 ") && cssText.includes(".w-100 ") && cssText.includes("var(--card"));
    for (const w of html.match(/class="s-\w+ w-(\d+)"/g)) assert.ok(cssText.includes("." + w.match(/w-\d+/)[0] + " {"), "every bar width has a rule");
    // a link that is not ours is not shown
    put(dir, "proof", { version: 106, published: "2026-11-17T10:36:48-06:00", url: "javascript:alert(1)" });
    put(dir, "pdf", { file: "https://evil.example/x.pdf", stale: false });
    const bad = await (await fetch(base + "/admin/book", { headers: H })).text();
    put(dir, "pdf", { built: "2026-11-17T13:05:46-06:00", pages: 109, size_mb_light: 21.1, stale: false });
    const both = await (await fetch(base + "/admin/book", { headers: H })).text();
    assert.ok(both.includes('href="/admin/index/book/miniature-beasts-proof-light.pdf"') && both.includes("21 MB"), "the light button with its size");
    assert.ok(!bad.includes("javascript:") && !bad.includes("evil.example") && !bad.includes(">Proof ↗<"), "only the proof and the project's releases are linked");
  } finally { close(); }
});

test("book summary: open comments, proof number and time; a missing or broken file is null, never a guess", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "mb-book-sum-")); mkdirSync(path.join(dir, "book"));
  const { base, close, H } = await serve(dir);
  try {
    const empty = await (await fetch(base + "/admin/book/summary.json", { headers: H })).json();
    assert.deepEqual([empty.open, empty.proof, empty.published], [null, null, null]);
    put(dir, "proof", { version: 105, published: "2026-11-17T10:36:48-06:00" });
    put(dir, "comments", { threads: [thread("a"), thread("b"), thread("c", { status: "fixed" })] });
    const s = await (await fetch(base + "/admin/book/summary.json", { headers: H })).json();
    assert.deepEqual([s.open, s.proof, s.published], [2, 105, "2026-11-17T10:36:48-06:00"]);
    writeFileSync(path.join(dir, "book", "comments.json"), "{ not json");
    assert.equal((await (await fetch(base + "/admin/book/summary.json", { headers: H })).json()).open, null);
    assert.equal((await fetch(base + "/admin/book/nothing", { headers: H })).status, 404);
  } finally { close(); }
});

test("bugs summary: counted with the page's own grouping; the notes page has its way back", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "mb-bugs-sum-")); mkdirSync(path.join(dir, "book"));
  const { base, close, H } = await serve(dir);
  try {
    const none = await (await fetch(base + "/admin/bugs/summary.json", { headers: H })).json();
    assert.deepEqual([none.open, none.blocks_play, none.generated], [0, 0, null]);
    const row = (n, o) => ({ n, title: "t" + n, words: "w" + n, desk: "ui", severity: null, state: "open", created: "2026-11-16T12:00:00Z", closed: null, url: "", fix_merged: false, ...o });
    writeFileSync(path.join(dir, "bugs.json"), JSON.stringify({ generated: "2026-11-17T11:50:00Z", rows: [row(1, { severity: "blocks-play" }), row(2, { severity: "wrong" }), row(3), row(4, { state: "closed", closed: "2026-11-16T12:00:00Z" }), row(5, { severity: "blocks-play", state: "closed", closed: "2026-11-16T12:00:00Z" })] }));
    const s = await (await fetch(base + "/admin/bugs/summary.json", { headers: H })).json();
    assert.deepEqual([s.open, s.blocks_play, s.generated], [3, 1, "2026-11-17T11:50:00Z"]);
    const notes = await (await fetch(base + "/admin/notes", { headers: H })).text();
    assert.ok(notes.includes('<a class="back" href="/admin/">← Admin</a>'), "the play notes page has a way back");
  } finally { close(); }
});
