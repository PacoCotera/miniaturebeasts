// Fills every [data-w] from words.json, builds the cards from their data-t specs, draws family lines and the ink chain,
// and on a phone page draws /play's frame round #screen as grey boxes. Sets body[data-ready] when done (shoot.mjs waits for it).
const TRAITS = ["markings", "crown", "eyes", "drive", "efficiency"];
const NS = "http://www.w3.org/2000/svg";

function el(tag, cls, parent, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; }
function w(key, W) { if (!(key in W)) { console.error("missing word " + key); return "MISSING " + key; } return W[key]; }

function buildCards(W) {
  for (const c of document.querySelectorAll(".card[data-t]")) {
    const nm = el("div", "nm", c); el("b", "", nm, c.dataset.name); if (c.dataset.tag) el("span", "", nm, w(c.dataset.tag, W));
    el("div", "slot", c, "Loika");
    const specs = c.dataset.t.split(",").map((s) => s.trim());
    specs.forEach((s, i) => {
      const [state, key, flag] = s.split(/[: ]+/);
      const tr = el("div", "tr", c); el("div", "tl", tr, w("trait." + TRAITS[i], W));
      const tv = el("div", "tv " + state + (flag ? " " + flag : ""), tr, w(key, W)); tv.id = c.id + "-" + TRAITS[i];
    });
  }
}

function box(e, root) { const r = e.getBoundingClientRect(), o = root.getBoundingClientRect(); return { l: r.left - o.left, t: r.top - o.top, r: r.right - o.left, b: r.bottom - o.top, cx: (r.left + r.right) / 2 - o.left, cy: (r.top + r.bottom) / 2 - o.top }; }
function path(svg, d, stroke, width, marker) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); p.setAttribute("fill", "none"); p.setAttribute("stroke", stroke); p.setAttribute("stroke-width", width); if (marker) p.setAttribute("marker-end", "url(#" + marker + ")"); svg.appendChild(p); return p; }

function drawLinks(board) {
  const svg = document.createElementNS(NS, "svg"); svg.setAttribute("class", "links"); board.prepend(svg);
  const defs = document.createElementNS(NS, "defs"); svg.appendChild(defs);
  defs.innerHTML = '<marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#1f4fbf"/></marker>';
  // family lines: parents' bottoms join on a bar; the bar drops to each child
  const groups = {};
  for (const c of board.querySelectorAll(".card[data-parents]")) (groups[c.dataset.parents] ??= []).push(c);
  for (const [ps, kids] of Object.entries(groups)) {
    const par = ps.split(" ").map((id) => document.getElementById(id)).filter(Boolean);
    const pb = par.map((p) => box(p, board)), kb = kids.map((k) => box(k, board));
    const y = Math.max(...pb.map((b) => b.b)) + Math.max(5, (Math.min(...kb.map((b) => b.t)) - Math.max(...pb.map((b) => b.b))) / 2);
    for (const b of pb) path(svg, `M${b.cx},${b.b} V${y}`, "#9b9b97", 1.5);
    const xs = [...pb.map((b) => b.cx), ...kb.map((b) => b.cx)];
    path(svg, `M${Math.min(...xs)},${y} H${Math.max(...xs)}`, "#9b9b97", 1.5);
    for (const b of kb) path(svg, `M${b.cx},${y} V${b.t}`, "#9b9b97", 1.5);
  }
  // the ink chain: "from>to@x": a straight arrow at x (board px) from the card the ink comes from up (or down) to the card it inks
  for (const spec of (board.dataset.chain || "").split(",").filter(Boolean)) {
    const [pair, xs] = spec.split("@"), [from, to] = pair.split(">").map((id) => box(document.getElementById(id.trim()), board)), x = +xs;
    const up = to.cy < from.cy, y0 = up ? from.t - 1 : from.b + 1, y1 = up ? to.b + 2 : to.t - 2;
    path(svg, `M${x},${y0} V${y1}`, "#1f4fbf", 2.5, "ah");
  }
}

function phoneFrame(W) {
  const b = document.body, scr = document.getElementById("screen");
  const add = (cls, css, text) => { const e = el("div", cls, null, text); Object.assign(e.style, css); b.insertBefore(e, scr); return e; };
  add("pf-bar", {});
  const tab = b.dataset.tab || "station"; // which tab is lit; "none" for a page that shows both
  add("pf-tab" + (tab === "companion" ? " on" : ""), { left: "16px", width: "128px" }, w("frame.companion", W));
  add("pf-tab" + (tab === "station" ? " on" : ""), { left: "146px", width: "128px" }, w("frame.station", W));
  add("pf-tab", { left: "282px", width: "92px" }, w("frame.options", W));
  add("pf-shell", {});
  const k = (x, y, ww, hh, text, round) => add("pf-key" + (round ? " round" : ""), { left: x + "px", top: y + "px", width: ww + "px", height: hh + "px" }, text);
  ["frame.key.home", "frame.key.pods", "frame.key.vivarium", "frame.key.library"].forEach((key, i) => k(36 + i * 81, 470, 75, 46, w(key, W)));
  k(98, 528, 50, 50, "▲"); k(48, 578, 50, 50, "◀"); k(98, 578, 50, 50, ""); k(148, 578, 50, 50, "▶"); k(98, 628, 50, 50, "▼");
  k(222, 548, 52, 52, w("frame.key.call", W), true); k(222, 612, 52, 52, w("frame.key.back", W), true); k(286, 572, 62, 62, w("frame.key.ok", W), true);
  add("pf-dock", {}, w("frame.dock", W));
  add("pf-draft", {}, w("draft", W));
  if (b.dataset.note) add("pf-note", {}, b.dataset.note);
}

const W = await (await fetch("words.json", { cache: "no-store" })).json();
for (const e of document.querySelectorAll("[data-w]")) e.textContent = w(e.dataset.w, W);
buildCards(W);
if (document.body.classList.contains("phone")) phoneFrame(W);
await document.fonts.ready;
for (const board of document.querySelectorAll("#board")) drawLinks(board);
document.body.dataset.ready = "1";
