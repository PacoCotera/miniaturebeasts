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
      row(1, { words: "looks <b>odd</b>", severity: "looks-off", desk: "art" }),
      row(2, { words: "stuck on the map", severity: "blocks-play", desk: "ui" }),
      row(3, { words: "no rating", desk: "lead" }),
      row(4, { words: "fixed yesterday", state: "closed", closed: "2026-11-16T12:00:00Z" }),
      row(5, { words: "fixed long ago", state: "closed", closed: "2026-11-01T12:00:00Z" }),
      row(6, { words: "wrong thing", severity: "wrong", desk: "design", fix_merged: true, url: "javascript:alert(1)" }),
    ] }));
    const html = await (await fetch(base + "/admin/bugs", { headers: H })).text();
    const at = (s) => html.indexOf(s);
    assert.ok(at("stuck on the map") < at("wrong thing") && at("wrong thing") < at("looks &lt;b&gt;odd") && at("looks &lt;b&gt;odd") < at("no rating"), "severity order");
    assert.ok(!html.includes("<b>odd</b>"), "his words are escaped");
    assert.ok(html.includes("fixed yesterday") && !html.includes("fixed long ago"), "only the last 7 days of fixed");
    assert.match(html, /3 open|4 open/); assert.match(html, /fix merged, not live yet/);
    assert.ok(!html.includes("javascript:"), "only issue links are linked");
    // the /admin look: the index's tokens linked at their /admin URL, a same-origin stylesheet, no inline style, a way back
    assert.ok(html.includes('href="/admin/team/team.css"') && html.includes('href="/admin/bugs/bugs.css"'), "the index's tokens and the page's own sheet");
    assert.ok(!/<style|style=/.test(html), "no inline style");
    assert.ok(html.includes('<a class="back" href="/admin/">← Admin</a>'), "a way back");
    assert.ok(html.includes("<b>Screens and phone UI</b>") && html.includes("<b>Game designer</b>") && html.includes("<b>Art director</b>") && !html.includes("<b>ui</b>"), "desk names in plain words");
    const css = await fetch(base + "/admin/bugs/bugs.css", { headers: H });
    assert.equal(css.status, 200); assert.match(css.headers.get("content-type"), /text\/css/); assert.match(await css.text(), /var\(--card/);
    assert.equal((await fetch(base + "/admin/bugs/bugs.css")).status, 403, "the sheet needs the login too");
    writeFileSync(path.join(dir, "bugs.json"), JSON.stringify({ generated: "2026-11-17T11:50:00Z", rows: [row(7, { desk: "someone-new" })] }));
    assert.ok((await (await fetch(base + "/admin/bugs", { headers: H })).text()).includes("<b>someone-new</b>"), "an unknown key shows as is");
  } finally { server.close(); }
});
