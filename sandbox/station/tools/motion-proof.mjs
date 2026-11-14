#!/usr/bin/env node
// The motion proof's scene for the owner (Station M1 §3): the Station page's face run headless on a virtual clock (face/tools/station-page.mjs), the scene of station/src/motion-scene.mjs played through (the hatch, a day in the
// Vivarium with focus, the acknowledge and Greet up close, dusk to night and a dawn wake, the night on Idle with Pip alone), and for each beat: 1× PNG frames, an APNG of them, and a CSV of every refresh (ms, dirty px, areas,
// tick area, travelling, airborne, deferred), summarised in a README. It is a tool, not a suite. M1a runs it on the stand-in cells (the developer switch "Motion sets (stand-ins)"); M1b writes the owner's capture on the signed cells
// to art/station-masters/pods/motion/proof/ on masters-pods, beside the animator's flipbooks.
//   PW_DIR=/path/with/node_modules/playwright node prototypes/station/tools/motion-proof.mjs [--out dir] [--beats 1,2,3,4] [--every 80,400,1000,2000] [--at ms,ms,…]
//   --every: a frame each so many ms of each beat; --at: also the frames at these exact ms of the scene (the report's captures)
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, crc32 } from "node:zlib";
import { openStation } from "../../face/tools/station-page.mjs";
import { decodePNG } from "../../ui/png.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const out = path.resolve(arg("--out", path.join(root, "art/station-masters/pods/motion/proof"))), beats = arg("--beats", "1,2,3,4").split(",").map(Number), every = arg("--every", "80,400,1000,2000").split(",").map(Number), ats = arg("--at", "").split(",").filter(Boolean).map(Number);
const NAMES = { 1: "1-hatch", 2: "2-day", 3: "3-dusk-night-dawn", 4: "4-night-idle" };
// an APNG of RGBA frames (one IHDR, acTL, then fcTL and IDAT / fdAT a frame; filter 0, whole frames, no blend)
function apng(frames, w, h, delayMs) {
  const chunk = (type, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4, "ascii"); data.copy(b, 8); b.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])) >>> 0, 8 + data.length); return b; };
  const u32 = (...v) => { const b = Buffer.alloc(4 * v.length); v.forEach((x, i) => b.writeUInt32BE(x >>> 0, i * 4)); return b; };
  const ihdr = Buffer.concat([u32(w, h), Buffer.from([8, 6, 0, 0, 0])]), parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("acTL", u32(frames.length, 0))];
  let seq = 0;
  frames.forEach((rgba, k) => {
    const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
    const z = deflateSync(raw, { level: 6 }), fc = Buffer.concat([u32(seq++, w, h, 0, 0), Buffer.from([(delayMs >> 8) & 255, delayMs & 255, 0x03, 0xe8, 0, 0])]);
    parts.push(chunk("fcTL", fc)); parts.push(k === 0 ? chunk("IDAT", z) : chunk("fdAT", Buffer.concat([u32(seq++), z])));
  });
  parts.push(chunk("IEND", Buffer.alloc(0))); return Buffer.concat(parts);
}
const { page, fails, step, close } = await openStation({ motion: true, clock: true });
const summary = {};
try {
  await page.evaluate(() => window.__st.motionProof());
  const total = await page.evaluate(() => window.__st.scene().ms), rows = {}, frames = {}, shots = [];
  let t = 0, nextAt = {}, lastScreen = null, cutUntil = 0; for (const b of [1, 2, 3, 4]) { rows[b] = []; frames[b] = []; nextAt[b] = 0; }
  while (t < total) {
    await step(40); t += 40;
    const s = await page.evaluate(() => ({ ...window.__st.scene(), ...window.__st.redraw(), screen: window.__st.UI.screen + (window.__st.UI.idle ? "/idle" : ""), light: window.__st.props?.regions?.window?.picture ?? window.__st.props?.regions?.vivarium?.picture ?? "" })); if (s.t == null) break;
    const b = s.beat || 1; if (!beats.includes(b)) continue;
    if (s.screen + "|" + s.light !== lastScreen) { cutUntil = s.t + 400; lastScreen = s.screen + "|" + s.light; for (const r of rows[b]) if (+r.split(",")[0] >= s.t - 240) rows[b][rows[b].indexOf(r)] = r.replace(/,0$/, ",1"); }   // a screen change or a change of light (the window's picture) is a full cut: marked, and left out of the worst frame, with the 240 ms before it (Idle's enter closes its dither over the stage before Idle shows)
    rows[b].push([s.t, s.px, s.areas, s.tick, s.travelling, s.airborne, s.deferred, s.screen, s.t < cutUntil ? 1 : 0].join(","));
    const want = s.t >= nextAt[b] || ats.some((a) => a > s.t - 40 && a <= s.t);
    if (want) { const png = await page.evaluate(() => window.__st.snapshot({ capture: true }).png), buf = Buffer.from(png.split(",")[1], "base64");
      if (s.t >= nextAt[b]) { frames[b].push(decodePNG(buf).data); nextAt[b] = s.t + every[b - 1]; }
      if (ats.some((a) => a > s.t - 40 && a <= s.t)) shots.push([s.t, buf]); }
  }
  mkdirSync(out, { recursive: true });
  for (const b of beats) {
    const n = NAMES[b], px = rows[b].filter((r) => r.endsWith(",0")).map((r) => +r.split(",")[1]), tick = rows[b].map((r) => +r.split(",")[3]);
    writeFileSync(path.join(out, n + ".csv"), "ms,dirty_px,areas,tick_area,travelling,airborne,deferred,screen,screen_cut\n" + rows[b].join("\n") + "\n");
    if (frames[b].length) writeFileSync(path.join(out, n + ".apng"), apng(frames[b], 1024, 600, every[b - 1]));
    summary[n] = { frames: frames[b].length, refreshes: rows[b].length, worstPx: Math.max(0, ...px), worstTick: Math.max(0, ...tick), deferred: rows[b].length ? +rows[b].at(-1).split(",")[6] : 0 };
  }
  for (const [ms, buf] of shots) writeFileSync(path.join(out, `capture-${String(ms).padStart(6, "0")}ms.png`), buf);
  const lines = Object.entries(summary).map(([n, v]) => `| ${n} | ${v.frames} | ${v.refreshes} | ${v.worstPx} | ${v.worstTick} | ${v.deferred} |`);
  writeFileSync(path.join(out, "README.md"), `# The motion proof's scene (Station M1)\n\nWritten by prototypes/station/tools/motion-proof.mjs on the Station page's face (LVGL, WebAssembly) at 1×, on a virtual clock. Each beat: an APNG of 1× frames, a CSV of every refresh.\n\n| Beat | Frames | Refreshes | Worst frame (px, screen cuts aside) | Worst tick (px) | Deferred (total) |\n| --- | --- | --- | --- | --- | --- |\n${lines.join("\n")}\n`);
  console.log(JSON.stringify(summary, null, 1)); console.log("wrote " + out);
} finally { await close(); }
if (fails.length) { console.error(fails.join("\n")); process.exit(1); }
