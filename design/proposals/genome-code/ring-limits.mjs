// Where the genome ring breaks as genomes grow. Runs the genome-ring prototype's
// own encoder, decoder and distortion harness (unchanged) on the three real
// species frames and on synthetic species with 100 and 150 open loci, every
// chapter read (the worst case), at Station size and as a Caddy print.
//
//   node design/proposals/genome-code/ring-limits.mjs [--n 30]
// Writes ring-limits.json next to this script and prints a Markdown table.
import { Worker, isMainThread, parentPort } from "node:worker_threads";
import { writeFileSync } from "node:fs";

const P = "../../../prototypes/genome-ring/";

if (!isMainThread) {
  const sp = await import("./species.mjs");
  const { sameGenome, rng } = await import(P + "src/codec.mjs");
  const { ringGeometry } = await import(P + "src/geometry.mjs");
  const { rasterize } = await import(P + "src/render.mjs");
  const { decode } = await import(P + "src/decode.mjs");
  const { cameraH, warp, gaussianBlur, lighting, monochrome, noise, jpeg, dotGain } = await import(P + "tests/distort.mjs");
  const { PHOTO } = await import(P + "tests/cases.mjs");
  const frames = new Map(sp.ALL.map((f) => [f.species, f]));
  const judge = (frame, g, img) => {
    const r = decode(img);
    const got = r.ok ? r.rings[0].genome : null;
    const good = r.ok && sameGenome(frame, g, got);
    return { ok: good, fa: r.ok && !good, error: good ? null : r.error };
  };
  // Station ring at D px: the prototype's "all" condition (rotation, 15° tilt,
  // blur 1.5 px at 300 px, light, mono, noise, JPEG 60), or a clean render.
  function screen(frame, g, D, all, rand) {
    const geom = ringGeometry(g);
    const W = Math.round(D * 1.5);
    if (!all) return judge(frame, g, rasterize(geom, D, { size: W }));
    const src = rasterize(geom, 2 * D, { ss: 3, size: Math.round(2 * D * 1.25) });
    const H = cameraH({ srcC: src.width / 2, srcR: D, outR: D / 2, cx: W / 2 + (rand() - 0.5) * 0.1 * D, cy: W / 2 + (rand() - 0.5) * 0.1 * D, tilt: 15, axis: rand() * 360, rot: rand() * 360 });
    let img = warp(src, H, W, W, { ss: 3, bg: [251, 248, 240] });
    img = gaussianBlur(img, (1.5 * D) / 300);
    img = lighting(img, { low: 0.35, angle: rand() * 360, vignette: 0.25 });
    img = monochrome(img);
    img = noise(img, 0.02, rand);
    img = jpeg(img, 60);
    return judge(frame, g, img);
  }
  // Caddy print: the prototype's print pipeline (bilevel at dpi, dot gain,
  // thermal tones, phone photo at pxPerMm with tilt, blur, light, noise, JPEG 75).
  function print(frame, g, mm, pxPerMm, rand, dpi = 203) {
    const Dd = (mm / 25.4) * dpi;
    let pr = rasterize(ringGeometry(g, { mono: true }), Dd, { bilevel: true, ss: 4, size: Math.round(Dd * 1.4) });
    pr = dotGain(pr, 0.35, 150);
    for (let k = 0; k < pr.data.length; k += 4) { const v = pr.data[k] ? 236 : 40; pr.data[k] = pr.data[k + 1] = v; pr.data[k + 2] = v - 3; }
    const outR = (mm / 2) * pxPerMm, W = Math.round(outR * 3);
    const H = cameraH({ srcC: pr.width / 2, srcR: Dd / 2, outR, cx: W / 2 + (rand() - 0.5) * 0.2 * outR, cy: W / 2 + (rand() - 0.5) * 0.2 * outR, tilt: rand() * PHOTO.tilt, axis: rand() * 360, rot: rand() * 360 });
    let img = warp(pr, H, W, W, { ss: 3, bg: [236, 236, 233] });
    img = gaussianBlur(img, PHOTO.blur);
    img = lighting(img, { low: PHOTO.light, angle: rand() * 360, vignette: 0.15 });
    img = noise(img, PHOTO.noise, rand);
    img = jpeg(img, PHOTO.jpeg);
    return judge(frame, g, img);
  }
  parentPort.on("message", (t) => {
    if (t === null) return process.exit(0);
    const frame = frames.get(t.species);
    const g = sp.individual(frame, 1000 + t.i * 7 + t.species);
    const rand = rng(t.i * 131 + t.species * 17 + (t.mm ?? t.D));
    const res = t.kind === "screen" ? screen(frame, g, t.D, t.all, rand) : print(frame, g, t.mm, t.pxPerMm, rand);
    parentPort.postMessage({ t, res });
  });
  parentPort.postMessage(null);
} else {
  const sp = await import("./species.mjs");
  const { slotLayout } = await import(P + "src/codec.mjs");
  const { LAYOUT } = await import(P + "src/geometry.mjs");
  const ai = process.argv.indexOf("--n");
  const N = ai > 0 ? Number(process.argv[ai + 1]) : 30;
  const CELLS = [
    { id: "300 clean", kind: "screen", D: 300, all: false },
    { id: "300 all", kind: "screen", D: 300, all: true },
    { id: "20mm 9px", kind: "print", mm: 20, pxPerMm: 9 },
    { id: "20mm 6px", kind: "print", mm: 20, pxPerMm: 6 },
    { id: "25mm 6px", kind: "print", mm: 25, pxPerMm: 6 },
    { id: "30mm 6px", kind: "print", mm: 30, pxPerMm: 6 },
    { id: "40mm 6px", kind: "print", mm: 40, pxPerMm: 6 },
  ];
  const tasks = [];
  for (const f of sp.ALL) for (const c of CELLS) {
    if (c.mm > 20 && (f.spokesPerTrack < 100 || f.heritable.length < 100)) continue; // only the future species need bigger prints
    for (let i = 0; i < N; i++) tasks.push({ ...c, species: f.species, i });
  }
  const out = {};
  let next = 0;
  await new Promise((resolve) => {
    let alive = 4;
    for (let w = 0; w < 4; w++) {
      const wk = new Worker(new URL(import.meta.url));
      wk.on("message", (m) => {
        if (m) {
          const k = `${m.t.species}|${m.t.id}`;
          const c = (out[k] ??= { n: 0, ok: 0, fa: 0, errors: {} });
          c.n++; c.ok += m.res.ok; c.fa += m.res.fa;
          if (!m.res.ok) { const e = (m.res.error || "?").replace(/\d+/g, "#"); c.errors[e] = (c.errors[e] || 0) + 1; }
        }
        wk.postMessage(next < tasks.length ? tasks[next++] : null);
      });
      wk.on("exit", () => { if (--alive === 0) resolve(); });
    }
  });
  // Geometry: spoke width (55% of the slot pitch) on the inner track's inner
  // edge, where the ring is narrowest, and on the outer track.
  const width = (S, r, Rpx) => (2 * Math.PI * r * Rpx * LAYOUT.duty) / S;
  const rows = sp.ALL.map((f) => {
    const { S } = slotLayout(f);
    const cells = Object.fromEntries(CELLS.map((c) => [c.id, out[`${f.species}|${c.id}`] ?? null]));
    return {
      name: f.name, open: f.heritable.length, bitsPerTrack: f.spokesPerTrack, chapters: f.chapters.length, slots: S,
      spoke300: [width(S, LAYOUT.inner.base[0], 150), width(S, LAYOUT.outer.base[0], 150)],
      spoke20mmDots: [width(S, LAYOUT.inner.base[0], 80), width(S, LAYOUT.outer.base[0], 80)],
      cells,
    };
  });
  writeFileSync(new URL("./ring-limits.json", import.meta.url), JSON.stringify({ N, rows }, null, 1) + "\n");
  const pct = (c) => (c ? `${Math.round((100 * c.ok) / c.n)}%` : "–");
  console.log(`| Species | Open loci | Bits per track | Slots | Spoke at 300 px (inner/outer) | Spoke at 20 mm, dots | ${CELLS.map((c) => c.id).join(" | ")} |`);
  for (const r of rows) console.log(`| ${r.name} | ${r.open} | ${r.bitsPerTrack} | ${r.slots} | ${r.spoke300.map((v) => v.toFixed(1)).join(" / ")} px | ${r.spoke20mmDots.map((v) => v.toFixed(2)).join(" / ")} | ${CELLS.map((c) => pct(r.cells[c.id])).join(" | ")} |`);
  const fa = Object.values(out).reduce((s, c) => s + c.fa, 0);
  console.log(`\n${N} genomes per cell; false accepts: ${fa}. Errors:`, JSON.stringify(Object.fromEntries(Object.entries(out).filter(([, c]) => c.ok < c.n).map(([k, c]) => [k, c.errors]))));
}
