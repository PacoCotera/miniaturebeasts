#!/usr/bin/env node
// The coat variants of the painted masters (release 21f): a kind's pictures recoloured by the art desk's signed masks and palette (mibi-art art-jobs/2026-11-07-coat-recolour: tools/kind.py, tools/recolour.py), baked
// into the masters at build time, never drawn at run time (the coats are a short list the palette names, so every coat is one picture; a coat the kind has no picture for shows the painted one).
//   - the desk's outputs are read as delivered (work/out/<kind>/<picture>-<coat>-<size>.png, made by the signed runner from the signed masks; this tool never writes in the desk's folder and never runs the runner);
//   - each is placed as the painted master of the same name is placed (game-masters.mjs): the adult turned over where the kind's adult is (FLIPPED, FLIPPED_ADULT), the young rescaled to 0.8 of that adult's figure;
//   - charcoal is the painted master untouched, so it is not placed again: the check below proves the desk's charcoal output, put through the same placement, is the placed master to the byte;
//   - ids: mibi-<adult|juvenile>-<kind>-<coat>-<size> (stand, three sizes), -<coat>-curl-304x312 (asleep), -<coat>-<pose>-304x312 (a habit pose). The signature and layout pictures are recoloured by the desk but no scene draws them
//     (every Loika is plain in the scenes), so they are listed, not placed (LATER below: add a row to place one).
// A kind is picked up when the desk has a manifest for it (tools/cfg/<kind>/kind.json) and outputs: adding a mask set later is dropping its masks and outputs in the desk's folder and running this again.
//   node prototypes/ui/tools/coat-masters.mjs [--desk <desk folder>] [--dry] [--check]
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG } from "../png.mjs";
import { rescaleJuvenile, flipPic, liftShadow, FLIPPED, FLIPPED_ADULT, GROUNDED, SIZES } from "./game-masters.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dest = path.resolve(here, "../assets/masters"), indexFile = path.join(dest, "index.json");
export const DESK = "/home/mb/mb/mibi-art/art-jobs/2026-11-07-coat-recolour";
export const SIGNED = "art lead, coat recolour of 2026-11-06 (mibi-art coat-recolour work, S01 mask set signed 20:34, commit d44bfcf6)";
// the desk's picture ids -> the masters: [adult picture, young picture, master name with {coat} and {size}, sizes]. The young is the adult's picture of the same name, rescaled
export const PAIRS = [
  ["stand", "juv", "{coat}", SIZES], ["asleep", "juvasleep", "{coat}-curl", ["304x312"]],
  ["shake", "juvshake", "{coat}-shake", ["304x312"]], ["calm", "juvcalm", "{coat}-calm", ["304x312"]],
  ["puff", "juvpuff", "{coat}-puff", ["304x312"]], ["sniff", "juvsniff", "{coat}-sniff", ["304x312"]], ["dig", "juvdig", "{coat}-dig", ["304x312"]], ["glow", "juvglow", "{coat}-glow", ["304x312"]],
];
export const LATER = ["sig-lo", "sig-hi", "lay-spots", "lay-gradient", "lay-bands", "lay-saddle", "lay-patches"];   // recoloured by the desk, drawn by no scene yet
const sha = (b) => createHash("sha256").update(b).digest("hex");
const pic = (f) => { const im = decodePNG(readFileSync(f)); return { w: im.width, h: im.height, data: im.data }; };
const encode = (p) => encodePNG(p.w, p.h, p.data);
const same = (a, b) => a.w === b.w && a.h === b.h && Buffer.compare(Buffer.from(a.data), Buffer.from(b.data)) === 0;

// what the desk's outputs make: { ops: [{ id, buf, from }], charcoal: [{ id, ok }], recoloured: [picture ids], waiting: [picture ids], kinds }
export function planCoats({ desk = DESK, index }) {
  const ops = [], charcoal = [], recoloured = new Set(), waiting = new Set(), kinds = [], cfgDir = path.join(desk, "tools/cfg");
  if (!existsSync(cfgDir)) return { ops, charcoal, recoloured: [], waiting: [], kinds };
  for (const k of readdirSync(cfgDir).filter((d) => /^S\d\d$/.test(d) && existsSync(path.join(cfgDir, d, "kind.json")))) {
    const man = JSON.parse(readFileSync(path.join(cfgDir, k, "kind.json"), "utf8")), have = new Set(man.pictures.map((p) => p.id)), out = (id, coat, size) => path.join(desk, "work/out", k, `${id}-${coat}-${size}.png`);
    const fl = FLIPPED.has(k) || FLIPPED_ADULT.has(k), fj = FLIPPED.has(k);
    kinds.push(k);
    for (const [aId, jId, name, sizes] of PAIRS) {
      if (!have.has(aId) || !have.has(jId)) { waiting.add(`${k} ${aId}`); continue; }
      for (const coat of man.coats) for (const size of sizes) {
        const af = out(aId, coat, size), jf = out(jId, coat, size); if (!existsSync(af) || !existsSync(jf)) { waiting.add(`${k} ${aId} ${coat} ${size}`); continue; }
        const A = fl ? flipPic(pic(af)) : pic(af), J = fj ? flipPic(pic(jf)) : pic(jf), r = rescaleJuvenile(A, J), jp = GROUNDED.has(k) ? liftShadow(r.pic) : r.pic;
        const base = name.replace("{coat}-", "").replace("{coat}", ""), mid = (stage) => `mibi-${stage}-${k}-${coat}${base ? "-" + base : ""}-${size}`, plain = (stage) => `mibi-${stage}-${k}${base ? "-" + base : ""}-${size}`;
        if (coat === "charcoal") {   // the painted master, untouched: proven against the placed one, not placed again
          for (const [stage, p] of [["adult", A], ["juvenile", jp]]) { const m = index.masters[plain(stage)]; charcoal.push({ id: plain(stage), ok: !!m && same(p, pic(path.join(dest, m.file))) }); }
          continue;
        }
        ops.push({ id: mid("adult"), buf: encode(A), from: path.relative("/home/mb/mb", af) }, { id: mid("juvenile"), buf: encode(jp), from: path.relative("/home/mb/mb", jf) });
        recoloured.add(`${k} ${aId}`); recoloured.add(`${k} ${jId}`);
      }
    }
    for (const id of LATER) if (have.has(id)) waiting.add(`${k} ${id} (recoloured by the desk, drawn by no scene)`);
    for (const id of have) if (!PAIRS.some((p) => p[0] === id || p[1] === id) && !LATER.includes(id)) waiting.add(`${k} ${id} (no placement row)`);
  }
  return { ops, charcoal, recoloured: [...recoloured], waiting: [...waiting], kinds };
}
export function placeCoats({ desk = DESK, root = dest, dryRun = false } = {}) {
  const idxFile = path.join(root, "index.json"), index = JSON.parse(readFileSync(idxFile, "utf8")), plan = planCoats({ desk, index });
  for (const o of plan.ops) {
    const file = `pods/${o.id}.png`, [w, h] = [o.buf.readUInt32BE(16), o.buf.readUInt32BE(20)];
    index.masters[o.id] = { file, w, h, sha256: sha(o.buf), signed: SIGNED, from: o.from };
    if (!dryRun) { mkdirSync(path.join(root, "pods"), { recursive: true }); writeFileSync(path.join(root, file), o.buf); }
  }
  index.masters = Object.fromEntries(Object.entries(index.masters).sort(([a], [b]) => a.localeCompare(b)));
  if (!dryRun) writeFileSync(idxFile, JSON.stringify(index, null, 1) + "\n");
  return plan;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (k) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; }, dry = process.argv.includes("--dry") || process.argv.includes("--check");
  const r = placeCoats({ desk: arg("desk") ?? DESK, dryRun: dry }), bad = r.charcoal.filter((c) => !c.ok);
  console.log(`${dry ? "would place" : "placed"} ${r.ops.length} coat masters for ${r.kinds.join(", ")}; charcoal proven against ${r.charcoal.length} placed masters, ${bad.length} differ`);
  console.log("recoloured: " + r.recoloured.sort().join(", "));
  console.log("waiting: " + r.waiting.sort().join(", "));
  for (const b of bad) console.error("FAIL charcoal differs from the placed master: " + b.id);
  process.exit(bad.length ? 1 : 0);
}
