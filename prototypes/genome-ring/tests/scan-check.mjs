// Optional: drives tests/scan.html in headless Chromium with a fake camera
// that films a simulated phone photo of print-sheet ring #n, and reports what
// the page shows. Needs Playwright (not a dependency of the module).
//
//   node tests/scan-check.mjs [ring-number=4]
import { writeFileSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { ringGeometry } from "../src/geometry.mjs";
import { rasterize } from "../src/render.mjs";
import { blank, cameraH, warp, gaussianBlur, lighting, noise, jpeg } from "./distort.mjs";
import { rng } from "../src/codec.mjs";

const require = createRequire(process.env.PW_DIR ? process.env.PW_DIR + "/" : import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }

const n = Number(process.argv[2] ?? 4);
const manifest = JSON.parse(readFileSync(new URL("./print-manifest.json", import.meta.url)));
const entry = manifest.find((e) => e.n === n);
// the printed ring, photographed at 9 px/mm in a 1280x720 frame
const W = 1280, H = 720, pxPerMm = 9, rand = rng(42);
const dots = entry.kind === "caddy" ? (entry.mm / 25.4) * 203 : (entry.mm / 25.4) * 600;
const print = rasterize(ringGeometry(entry.genome, { mono: entry.kind === "caddy" }), dots, { bilevel: entry.kind === "caddy", ss: 2, size: Math.round(dots * 1.5) });
const Hm = cameraH({ srcC: print.width / 2, srcR: dots / 2, outR: (entry.mm / 2) * pxPerMm, cx: W / 2 + 40, cy: H / 2 - 20, tilt: 12, axis: 70, rot: 133 });
let img = warp(print, Hm, W, H, { ss: 2, bg: [232, 230, 224] });
img = jpeg(noise(lighting(gaussianBlur(img, 0.9), { low: 0.55, angle: 20 }), 0.02, rand), 80);
// YUV4MPEG2 4:2:0, a few identical frames
const Y = Buffer.alloc(W * H), U = Buffer.alloc((W * H) / 4), V = Buffer.alloc((W * H) / 4);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
    Y[y * W + x] = 0.299 * r + 0.587 * g + 0.114 * b;
    if (!(x & 1) && !(y & 1)) {
      const j = (y / 2) * (W / 2) + x / 2;
      U[j] = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      V[j] = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    }
  }
const frame = Buffer.concat([Buffer.from("FRAME\n"), Y, U, V]);
const y4m = new URL(`./.scan-check-${n}.y4m`, import.meta.url).pathname;
writeFileSync(y4m, Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`), ...Array(5).fill(frame)]));

const browser = await chromium.launch({
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${y4m}`],
});
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(new URL("./scan.html", import.meta.url).href);
await page.click("#start");
await page.waitForSelector(".verdict", { timeout: 15000 }).catch(() => {});
const verdict = await page.textContent(".verdict").catch(() => null);
const status = await page.textContent("#status");
await page.screenshot({ path: new URL(`../img/scan-page.png`, import.meta.url).pathname, fullPage: false });
await browser.close();
console.log(`ring #${n}: ${verdict ?? "no decode"} | ${status}${errors.length ? " | errors: " + errors.join("; ") : ""}`);
process.exit(verdict && /Matches/.test(verdict) && !errors.length ? 0 : 1);
