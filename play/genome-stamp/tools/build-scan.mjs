// Builds tests/scan.html: one dependency-free page with the same decoder
// (bundled from src/) and the print sheet's expected genomes.
//
//   node tools/build-scan.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { bundle } from "./bundle.mjs";

const here = (p) => new URL(`../${p}`, import.meta.url);
const code = bundle([here("src/decode.mjs"), here("src/stamp.mjs")]);
const manifest = JSON.parse(readFileSync(here("tests/print-manifest.json"), "utf8"));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Genome stamp scan</title>
<style>
:root { --bg: #f7f4ec; --card: #fffdf7; --ink: #2b2a27; --muted: #6f6a5e; --line: #d8d1bf; --ok: #2f7d4f; --bad: #b0352a; --accent: #1f5a85; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #1d1c1a; --card: #262522; --ink: #ece7db; --muted: #a39d8f; --line: #3d3a34; --ok: #6cc08e; --bad: #f08b7e; --accent: #8cbbe0; } }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 980px; margin: 0 auto; padding: 16px; }
h1 { font-size: 20px; margin: 4px 0 2px; }
p.lede { margin: 0 0 12px; color: var(--muted); }
.bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
button, label.btn { font: inherit; padding: 9px 14px; border-radius: 8px; border: 1px solid var(--line); background: var(--card); color: var(--ink); cursor: pointer; }
button.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
label.btn input { display: none; }
.stage { position: relative; background: #000; border-radius: 10px; overflow: hidden; display: none; }
.stage.on { display: block; }
.stage video, .stage canvas.view { display: block; width: 100%; height: auto; }
.stage canvas.overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.guide { margin: 0 0 10px; font-size: 14px; }
.status { margin: 8px 0 14px; color: var(--muted); font-size: 14px; min-height: 1.4em; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 14px; margin-bottom: 14px; }
.verdict { font-weight: 600; font-size: 16px; margin-bottom: 8px; }
.verdict.ok { color: var(--ok); } .verdict.bad { color: var(--bad); }
.codes { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 13px; margin-bottom: 10px; overflow-wrap: anywhere; }
.stamps { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px; }
.stamps figure { margin: 0; text-align: center; }
.stamps svg { width: 100%; max-width: 220px; height: auto; }
.stamps figcaption { font-size: 13px; color: var(--muted); }
table { border-collapse: collapse; width: 100%; font-size: 13px; }
th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { color: var(--muted); font-weight: 600; }
td.diff { color: var(--bad); font-weight: 600; }
tr.chapter td { font-weight: 600; padding-top: 10px; }
.tablewrap { overflow-x: auto; }
small.note { color: var(--muted); display: block; margin-top: 16px; }
</style>
</head>
<body>
<main>
<h1>Genome stamp scan</h1>
<p class="lede">Point the camera at one stamp of <code>print-test.pdf</code>. The page decodes it with the prototype's own reader (no QR, no network) and shows the decoded genome next to the one that was printed. Scanning shows a genome and never grants anything.</p>
<div class="bar">
  <button class="primary" id="start">Start camera</button>
  <button id="stop" disabled>Stop</button>
  <label class="btn">Photo or file<input id="file" type="file" accept="image/*" capture="environment"></label>
  <button id="save" disabled>Save this frame</button>
</div>
<p class="guide"><strong>Hold the phone flat above the stamp and fill about half the frame.</strong> This page reads the sheet titled "stamp, 4-digit check" (codes like <code>${manifest[0].code}</code>).</p>
<div class="stage" id="stage"><video id="video" playsinline muted></video><canvas class="view" id="still" hidden></canvas><canvas class="overlay" id="overlay"></canvas></div>
<div class="status" id="status">No read yet. Camera needs https or localhost; the photo button works from any address, including a file on the phone.</div>
<div id="results"></div>
<small class="note">Stamps are decoded on this device, offline; nothing is uploaded. The species registry and the expected genomes for the ${manifest.length} stamps on the print sheet are built into the page.</small>
</main>
<script>
${code}
const { decode } = __m_decode_mjs;
const { stampCode, readMask } = __m_codec_mjs;
const { frameFor } = __m_frames_mjs;
const { stampGeometry, toSVG } = __m_stamp_mjs;
const MANIFEST = ${JSON.stringify(manifest)};

const $ = (id) => document.getElementById(id);
const video = $("video"), overlay = $("overlay"), still = $("still"), statusEl = $("status"), results = $("results");
const work = document.createElement("canvas");
let stream = null, timer = null, frames = 0, hits = 0, lastKey = "";

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }

function closest(genome) {
  const frame = frameFor(genome.species, genome.version);
  let best = null;
  for (const e of MANIFEST) {
    if (e.genome.species !== genome.species || e.genome.version !== genome.version) continue;
    let same = 0, total = 0;
    for (const l of frame.heritable) {
      const a = e.genome.copies[l.id], b = genome.copies[l.id];
      total++;
      if (a && b && a[0] === b[0] && a[1] === b[1]) same++;
    }
    const code = stampCode(frame, e.genome);
    if (!best || same > best.same) best = { e, same, total, code };
  }
  return best;
}

function render(stamp) {
  const ring = stamp, g = ring.genome, frame = frameFor(g.species, g.version);
  const code = stampCode(frame, g);
  const m = closest(g);
  const exact = m && m.code === code;
  const verdict = exact
    ? '<div class="verdict ok">Matches stamp #' + m.e.n + ' (' + m.e.mm + ' mm, ' + m.e.kind + '): every shown part is right, check passed</div>'
    : m ? '<div class="verdict bad">Check passed, but this is not stamp #' + m.e.n + ' exactly (closest of the sheet)</div>'
        : '<div class="verdict">Decoded a stamp that is not on the print sheet</div>';
  const exp = exact || m ? m.e.genome : null;
  const expRead = exp ? frame.chapters.filter((c, i) => Math.floor(readMask(frame, exp) / 2 ** i) & 1).map((c) => c.name) : [];
  let rows = "";
  for (const ch of frame.chapters) {
    const readHere = g.read.includes(ch.name), readThere = exp ? expRead.includes(ch.name) : null;
    rows += '<tr class="chapter"><td colspan="3">' + esc(ch.name) + (readHere ? "" : " · unread (hairlines)") + (exp && readThere !== readHere ? " · expected " + (readThere ? "read" : "unread") : "") + "</td></tr>";
    if (!readHere && !(exp && readThere)) continue;
    for (const l of ch.loci) {
      const d = g.copies[l.id], e = exp && readThere ? exp.copies[l.id] : null;
      const ds = d ? d.join(" · ") : "–", es = e ? e.join(" · ") : exp ? "–" : "";
      const diff = exp && ds !== es;
      rows += "<tr><td>" + esc(l.trait) + ": " + esc(l.id) + '</td><td class="' + (diff ? "diff" : "") + '">' + esc(ds) + "</td><td>" + esc(es) + "</td></tr>";
    }
  }
  const svg = (gen) => toSVG(stampGeometry(gen), 200);
  results.innerHTML = '<div class="card">' + verdict +
    '<div class="codes">decoded ' + esc(code) + (m ? "<br>printed " + esc(m.code) : "") + "<br>species " + g.species + " v" + g.version + " · " + esc(frame.name) + " · read: " + esc(g.read.join(", ") || "none") + " · " + ring.N + "×" + ring.N + " cells, " + Math.round(ring.size) + " px · " + (ring.mirror ? "mirrored · " : "") + ring.corrected + " of " + ring.codewordBytes + " bytes corrected" + (ring.postmark !== "none" ? " · postmark " + ring.postmark : "") + "</div>" +
    '<div class="stamps"><figure>' + svg(g) + "<figcaption>decoded, redrawn</figcaption></figure>" + (exp ? "<figure>" + svg(exp) + "<figcaption>printed #" + m.e.n + "</figcaption></figure>" : "") + "</div>" +
    '<div class="tablewrap"><table><thead><tr><th>Trait: locus</th><th>Decoded (copy 1 · copy 2)</th><th>Printed</th></tr></thead><tbody>' + rows + "</tbody></table></div></div>";
}

function drawOverlay(res, w, h) {
  overlay.width = w; overlay.height = h;
  const ctx = overlay.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.lineWidth = Math.max(2, w / 300);
  // the fitted frame (a quadrilateral under tilt)
  const quad = (q, colour) => { ctx.strokeStyle = colour; ctx.beginPath(); q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke(); };
  for (const r of res.stamps) quad(r.quad, "#3fd07a");
  for (const r of res.tried) if (r.quad) quad(r.quad, "rgba(240,170,60,.9)");
}

function run(source, w, h) {
  const scale = Math.min(1, 1920 / Math.max(w, h));
  work.width = Math.round(w * scale); work.height = Math.round(h * scale);
  const ctx = work.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, work.width, work.height);
  const img = ctx.getImageData(0, 0, work.width, work.height);
  const res = decode(img, { all: true });
  $("save").disabled = false;
  drawOverlay(res, work.width, work.height);
  return res;
}

// Only verified reads are ever shown. A failed frame says what to try, never a guessed header.
function noRead(res) {
  if (!res.candidates) return "no read yet: no stamp in view";
  const stage = res.tried.find((t) => t.stage)?.stage;
  return stage === "timing" ? "no read yet: hold flatter and steadier" : "no read yet: hold the phone flat above the stamp, fill about half the frame";
}

$("save").onclick = () => {
  if (!work.width) return;
  work.toBlob((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "genome-stamp-frame-" + new Date().toISOString().replace(/[:.]/g, "-") + ".png";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, "image/png");
};

function tick() {
  if (!stream || video.readyState < 2) return;
  const res = run(video, video.videoWidth, video.videoHeight);
  frames++;
  if (res.ok) {
    hits++;
    const key = JSON.stringify(res.stamps[0].genome);
    if (key !== lastKey) { lastKey = key; render(res.stamps[0]); if (navigator.vibrate) navigator.vibrate(30); }
  }
  statusEl.textContent = frames + " frames · " + hits + " verified · last " + res.ms + " ms · " + (res.ok ? res.stamps.length + " stamp(s) read" : noRead(res));
}

$("start").onclick = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
  } catch (e) {
    statusEl.textContent = "Camera unavailable (" + e.name + "). Use the photo button instead.";
    return;
  }
  video.srcObject = stream; still.hidden = true; video.hidden = false;
  await video.play();
  $("stage").classList.add("on");
  $("start").disabled = true; $("stop").disabled = false;
  timer = setInterval(tick, 150);
};
$("stop").onclick = () => {
  clearInterval(timer); timer = null;
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null; $("start").disabled = false; $("stop").disabled = true;
};
$("file").onchange = (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  const im = new Image();
  im.onload = () => {
    $("stop").onclick();
    still.width = im.naturalWidth; still.height = im.naturalHeight;
    still.getContext("2d").drawImage(im, 0, 0);
    video.hidden = true; still.hidden = false; $("stage").classList.add("on");
    const res = run(im, im.naturalWidth, im.naturalHeight);
    overlay.width = work.width; overlay.height = work.height;
    drawOverlay(res, work.width, work.height);
    if (res.ok) render(res.stamps[0]); else results.innerHTML = "";
    statusEl.textContent = res.ok ? res.stamps.length + " stamp(s) decoded in " + res.ms + " ms" : noRead(res) + " (" + res.ms + " ms)";
    URL.revokeObjectURL(im.src);
  };
  im.src = URL.createObjectURL(f);
};
</script>
</body>
</html>
`;
writeFileSync(here("tests/scan.html"), html);
console.log(`tests/scan.html: ${(html.length / 1024).toFixed(0)} KB`);
