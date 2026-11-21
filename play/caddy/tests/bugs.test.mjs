// The bugs page on the Caddy service: needs the login's header, read only, open bugs by severity then desk,
// fixed-and-live of the last 7 days, issue text escaped, an empty or missing bugs.json is an empty page.
//   node --test prototypes/caddy/tests/bugs.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { createApp } from "../app.mjs";

const NOW = Date.parse("2026-11-17T12:00:00Z");
const row = (n, o) => ({ n, title: "t" + n, words: "words " + n, desk: "ui", severity: null, state: "open", created: "2026-11-16T12:00:00Z", closed: null, url: `https://github.com/PacoCotera/miniaturebeasts-internal/issues/${n}`, fix_merged: false, ...o });

test("bugs page: login only, read only, ordered, a week of fixed, escaped", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "mb-bugs-")), app = createApp({ dataDir: dir, now: () => NOW });
  const server = createServer((req, res) => app.handle(req, res)); await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`, H = { "x-studio-user": "paco" };
  try {
    assert.equal((await fetch(base + "/admin/bugs")).status, 403, "no login header, no page");
    assert.equal((await fetch(base + "/admin/bugs", { method: "POST", headers: H })).status, 405);
    const empty = await (await fetch(base + "/admin/bugs", { headers: H })).text();
    assert.match(empty, /No open bugs/); assert.match(empty, /Nothing filed yet/);
    writeFileSync(path.join(dir, "bugs.json"), JSON.stringify({ generated: "2026-11-17T11:50:00Z", rows: [
      row(1, { words: "looks <b>odd</b>", severity: "looks-off", desk: "art", shots: ["https://github.com/PacoCotera/miniaturebeasts-internal/blob/bug-assets/bugs/n1/shot-1.png?raw=true"] }),
      row(8, { words: "is this on purpose", kind: "question", created: "2026-11-16T13:00:00Z" }),
      row(2, { words: "stuck on the map", severity: "blocks-play", desk: "ui" }),
      row(3, { words: "no rating", desk: "lead", fix_pr: 99 }),
      row(4, { words: "fixed yesterday", state: "closed", closed: "2026-11-16T12:00:00Z" }),
      row(5, { words: "fixed long ago", state: "closed", closed: "2026-11-01T12:00:00Z" }),
      row(6, { words: "wrong thing", severity: "wrong", desk: "design", fix_merged: true, created: "2026-11-16T14:00:00Z", url: "javascript:alert(1)" }),
    ] }));
    const html = await (await fetch(base + "/admin/bugs", { headers: H })).text();
    const at = (s) => html.indexOf(s);
    assert.ok(at("stuck on the map") < at("wrong thing") && at("wrong thing") < at("no rating") && at("no rating") < at("looks &lt;b&gt;odd"), "group order: blocks play, wrong (unrated is wrong), looks off");
    assert.match(html, /5 open: 1 block play/, "the count line");
    assert.ok(/<details class="closed"><summary>Fixed, last 7 days \(1\)<\/summary>/.test(html), "fixed bugs fold into one shut section");
    assert.ok(at('<details class="closed"') > at("looks &lt;b&gt;odd") && at('<details class="closed"') < at("fixed yesterday"), "fixed rows are inside the fold, at the bottom");
    assert.ok(!/<details[^>]*\bopen\b/.test(html), "every row and the fold are shut by default");
    assert.match(html, /Fix waiting to ship/); assert.match(html, /Fix being built/); assert.match(html, /Not started/); assert.match(html, /Fixed, live/);
    assert.ok(html.includes('href="https://github.com/PacoCotera/miniaturebeasts-internal/blob/bug-assets/bugs/n1/shot-1.png?raw=true">Screenshot</a>'), "the row opens to his screenshot");
    assert.ok(html.includes("<h2>Questions (1)</h2>") && at("<h2>Questions") > at("looks &lt;b&gt;odd"), "questions are their own group, last");
    assert.ok(!html.includes("<b>odd</b>"), "his words are escaped");
    assert.ok(html.includes("fixed yesterday") && !html.includes("fixed long ago"), "only the last 7 days of fixed");
    assert.ok(!html.includes("javascript:"), "only issue links are linked");
    // the /admin look: the index's tokens linked at their /admin URL, a same-origin stylesheet, no inline style, a way back
    assert.ok(html.includes('href="/admin/team/team.css"') && html.includes('href="/admin/bugs/bugs.css"'), "the index's tokens and the page's own sheet");
    assert.ok(!/<style|style=/.test(html), "no inline style");
    assert.ok(html.includes('<a class="back" href="/admin/">← Admin</a>'), "a way back");
    assert.ok(html.includes("· Screens and phone UI ·") && html.includes("· Game designer ·") && html.includes("· Art director ·") && !html.includes("· ui ·"), "desk names in plain words");
    const css = await fetch(base + "/admin/bugs/bugs.css", { headers: H });
    assert.equal(css.status, 200); assert.match(css.headers.get("content-type"), /text\/css/); assert.match(await css.text(), /var\(--line/);
    assert.equal((await fetch(base + "/admin/bugs/bugs.css")).status, 403, "the sheet needs the login too");
    writeFileSync(path.join(dir, "bugs.json"), JSON.stringify({ generated: "2026-11-17T11:50:00Z", rows: [row(7, { desk: "someone-new" })] }));
    assert.ok((await (await fetch(base + "/admin/bugs", { headers: H })).text()).includes("· someone-new ·"), "an unknown key shows as is");
  } finally { server.close(); }
});
