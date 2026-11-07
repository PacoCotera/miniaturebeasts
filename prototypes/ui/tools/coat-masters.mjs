#!/usr/bin/env node
// The coat masters (release 21g): a kind's pictures in the art desk's baked coat grid (art desk ruling R21-COAT-V8, 2026-11-06 21:55; mibi-art art-jobs/2026-11-07-coat-recolour), placed into the masters at build time, never drawn at run time.
//   - a COAT is Tint x Shade, 3 x 3 (redder / between / yellower by dark / between / light); between-dark is the painted master. The desk's outputs are read as delivered
//     (work/out/<kind>/<picture>-<tint>-<shade>-<size>.png, made by the signed runner from the signed masks; this tool never writes in the desk's folder and never runs the runner);
//   - each is placed as the painted master of the same name is placed (game-masters.mjs): the adult turned over where the kind's adult is (FLIPPED, FLIPPED_ADULT), the young rescaled to 0.8 of that adult's figure;
//   - between-dark is the painted master untouched, so it is not placed again for the pictures the painted set has: the check proves the desk's between-dark output, put through the same placement, is the placed master to the byte;
//   - ids: mibi-<adult|juvenile>-<kind>-<coat>-<size> (stand, three sizes), -<coat>-curl-304x312 (asleep), -<coat>-<pose>-304x312 (a habit pose), and for the adult's awake MARKINGS
//     mibi-adult-<kind>-<coat>-<lay-spots|lay-gradient|lay-bands|lay-saddle|lay-patches>-<size> (the painted set has no marked picture, so all nine coats are placed, between-dark too);
//   - the check: every coat x picture x size the manifest names exists in the desk's folder (none missing, or this exits 1), and the painted proof holds.
// A kind is picked up when the desk has a v8 manifest for it (tools/cfg/<kind>/kind-v8.json) and outputs.
// A kind the game has not placed yet (no coat masters in the index) is skipped, and said so; --kind S03 reads (and places) a named kind whole.
//   node prototypes/ui/tools/coat-masters.mjs [--desk <desk folder>] [--kind S03] [--dry] [--check]
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG } from "../png.mjs";
import { rescaleJuvenile, flipPic, liftShadow, FLIPPED, FLIPPED_ADULT, GROUNDED, SIZES } from "./game-masters.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dest = path.resolve(here, "../assets/masters");
export const DESK = "/home/mb/mb/mibi-art/art-jobs/2026-11-07-coat-recolour";
export const SIGNED = "art lead, coat recolour R21-COAT-V8 of 2026-11-06 21:55 (mibi-art commit a4d0d39e; Tint x Shade, baked 3 x 3)";
export const SHADES = ["dark", "between", "light"];
// a kind's coat grid, read from the desk's palette-<kind>-v8.json as delivered: the Tint looks are the kind's own frame's (in the palette's order, "between" in the middle), the Shade is dark / between / light for every kind,
// and the painted master is the one cell whose coat_main is marked "painted": true
export function coatGrid(desk, k) {
  const pal = JSON.parse(readFileSync(path.join(desk, "tools", `palette-${k}-v8.json`), "utf8")), cells = Object.keys(pal.coats), tints = [];
  for (const c of cells) { const t = c.slice(0, c.lastIndexOf("-")); if (!tints.includes(t)) tints.push(t); }
  if (tints.length !== 3 || tints[1] !== "between") throw new Error(`${k}: the palette's Tints are not three looks with "between" in the middle: ${tints}`);
  const coats = tints.flatMap((t) => SHADES.map((s) => `${t}-${s}`));
  if (JSON.stringify([...cells].sort()) !== JSON.stringify([...coats].sort())) throw new Error(`${k}: the palette's coats are not Tint x Shade, 3 x 3: ${cells}`);
  const painted = cells.filter((c) => pal.coats[c].coat_main && pal.coats[c].coat_main.painted === true);
  if (painted.length !== 1) throw new Error(`${k}: the palette marks ${painted.length} painted cells, not one`);
  return { tints, coats, painted: painted[0] };
}
// the desk's picture ids -> the masters: [adult picture, young picture, master name with {coat}, sizes]. The young is the adult's picture of the same name, rescaled
export const PAIRS = [
  ["stand", "juv", "{coat}", SIZES], ["asleep", "juvasleep", "{coat}-curl", ["304x312"]],
  ["shake", "juvshake", "{coat}-shake", ["304x312"]], ["calm", "juvcalm", "{coat}-calm", ["304x312"]],
  ["puff", "juvpuff", "{coat}-puff", ["304x312"]], ["sniff", "juvsniff", "{coat}-sniff", ["304x312"]], ["dig", "juvdig", "{coat}-dig", ["304x312"]], ["glow", "juvglow", "{coat}-glow", ["304x312"]],
];
// the adult's awake marked pictures (the Markings look -> the desk's picture): adult only, three sizes, in every coat
export const MARKED = { spotted: "lay-spots", saddle: "lay-saddle", shaded: "lay-gradient", bands: "lay-bands", patches: "lay-patches" };
export const LATER = ["sig-lo", "sig-hi"];   // recoloured by the desk, drawn by no scene yet
const sha = (b) => createHash("sha256").update(b).digest("hex");
const pic = (f) => { const im = decodePNG(readFileSync(f)); return { w: im.width, h: im.height, data: im.data }; };
const encode = (p) => encodePNG(p.w, p.h, p.data);
const same = (a, b) => a.w === b.w && a.h === b.h && Buffer.compare(Buffer.from(a.data), Buffer.from(b.data)) === 0;

// what the desk's outputs make: { ops: [{ id, buf, from }], painted: [{ id, ok }], recoloured: [picture ids], waiting: [..], missing: [file paths], cells: n, kinds }
// A kind is PLACED when the masters already hold its coats (a coat id: tint, shade, then the size or picture). The desk paints kind by kind: with no `only`, a kind the game
// has not placed is skipped, listed in `skipped` ("not placed, skipped"), so a kind the desk is still painting never breaks the check. `only` names any kind and reads it whole.
export const placedKinds = (index) => new Set(Object.keys(index.masters).map((id) => (/^mibi-(?:adult|juvenile)-(S\d\d)-[a-z]+-(?:dark|between|light)-/.exec(id) || [])[1]).filter(Boolean));
export function planCoats({ desk = DESK, index, only = null }) {
  const ops = [], painted = [], recoloured = new Set(), waiting = new Set(), missing = [], kinds = [], skipped = [], grids = {}, cfgDir = path.join(desk, "tools/cfg"), placed = placedKinds(index); let cells = 0;
  if (!existsSync(cfgDir)) return { ops, painted, recoloured: [], waiting: [], missing, cells, kinds, skipped, grids: {} };
  for (const k of readdirSync(cfgDir).filter((d) => /^S\d\d$/.test(d) && (!only || d === only) && existsSync(path.join(cfgDir, d, "kind-v8.json")))) {
    if (!only && !placed.has(k)) { skipped.push(k); continue; }
    const man = JSON.parse(readFileSync(path.join(cfgDir, k, "kind-v8.json"), "utf8")), have = new Set(man.pictures.map((p) => p.id)), out = (id, coat, size) => path.join(desk, "work/out", k, `${id}-${coat}-${size}.png`);
    const fl = FLIPPED.has(k) || FLIPPED_ADULT.has(k), fj = FLIPPED.has(k);
    const { coats: COATS, painted: PAINTED } = coatGrid(desk, k);
    if (JSON.stringify([...man.coats].sort()) !== JSON.stringify([...COATS].sort())) throw new Error(`${k}: the desk's coats are not the palette's 3 x 3 grid: ${man.coats}`);
    kinds.push(k); grids[k] = { coats: COATS, painted: PAINTED };
    for (const [aId, jId, name, sizes] of PAIRS) {
      if (!have.has(aId) || !have.has(jId)) { waiting.add(`${k} ${aId}`); continue; }
      for (const coat of COATS) for (const size of sizes) {
        const af = out(aId, coat, size), jf = out(jId, coat, size); cells += 2;
        if (!existsSync(af)) missing.push(af); if (!existsSync(jf)) missing.push(jf); if (!existsSync(af) || !existsSync(jf)) continue;
        const A = fl ? flipPic(pic(af)) : pic(af), J = fj ? flipPic(pic(jf)) : pic(jf), r = rescaleJuvenile(A, J), jp = GROUNDED.has(k) ? liftShadow(r.pic) : r.pic;
        const base = name.replace("{coat}-", "").replace("{coat}", ""), mid = (stage) => `mibi-${stage}-${k}-${coat}${base ? "-" + base : ""}-${size}`, plain = (stage) => `mibi-${stage}-${k}${base ? "-" + base : ""}-${size}`;
        if (coat === PAINTED) {   // the painted master, untouched: proven against the placed one, not placed again
          for (const [stage, p] of [["adult", A], ["juvenile", jp]]) { const m = index.masters[plain(stage)]; painted.push({ id: plain(stage), ok: !!m && same(p, pic(path.join(dest, m.file))) }); }
          continue;
        }
        ops.push({ id: mid("adult"), buf: encode(A), from: path.relative("/home/mb/mb", af) }, { id: mid("juvenile"), buf: encode(jp), from: path.relative("/home/mb/mb", jf) });
        recoloured.add(`${k} ${aId}`); recoloured.add(`${k} ${jId}`);
      }
    }
    for (const lay of Object.values(MARKED)) {
      if (!have.has(lay)) { waiting.add(`${k} ${lay}`); continue; }
      for (const coat of COATS) for (const size of SIZES) {
        const f = out(lay, coat, size); cells++; if (!existsSync(f)) { missing.push(f); continue; }
        const A = fl ? flipPic(pic(f)) : pic(f); ops.push({ id: `mibi-adult-${k}-${coat}-${lay}-${size}`, buf: encode(A), from: path.relative("/home/mb/mb", f) }); recoloured.add(`${k} ${lay}`);
      }
    }
    // the living windows' baked adult 144x152 and young 104x112 (work/out-tool/<kind>/adult-<coat>-144x152.png, juv-<coat>-104x112.png): placed as the painted tool pass is, never a scaled 304 picture
    const toolDir = path.join(desk, "work/out-tool", k);
    if (existsSync(toolDir)) for (const coat of COATS) for (const [pre, stage, size, flip] of [["adult", "adult", "144x152", fl], ["juv", "juvenile", "104x112", fj]]) {
      const f = path.join(toolDir, `${pre}-${coat}-${size}.png`); cells++; if (!existsSync(f)) { missing.push(f); continue; }
      let P = flip ? flipPic(pic(f)) : pic(f); if (stage === "juvenile" && GROUNDED.has(k)) P = liftShadow(P);
      const id = coat === PAINTED ? `mibi-${stage}-${k}-${size}` : `mibi-${stage}-${k}-${coat}-${size}`;
      if (coat === PAINTED) { const m = index.masters[id]; painted.push({ id, ok: !!m && same(P, pic(path.join(dest, m.file))) }); continue; }
      ops.push({ id, buf: encode(P), from: path.relative("/home/mb/mb", f) }); recoloured.add(`${k} ${pre}-${size}`);
    }
    // the Library's faces (release 21h2, art desk 21h ART INPUTS A): the head and crest cut from the coated stand, three-quarter view, both eyes (work/out-tool/<kind>/<kind>-faces/face-<coat>-<size>.png, 40 x 40 and 64 x 64), placed as mibi-face-<kind>-<coat>-<size>
    const faceDir = path.join(desk, "work/out-tool", `${k}-faces`);
    if (existsSync(faceDir)) for (const coat of COATS) for (const size of ["40x40", "64x64"]) {
      const f = path.join(faceDir, `face-${coat}-${size}.png`); cells++; if (!existsSync(f)) { missing.push(f); continue; }
      ops.push({ id: `mibi-face-${k}-${coat}-${size}`, buf: encode(fl ? flipPic(pic(f)) : pic(f)), from: path.relative("/home/mb/mb", f) }); recoloured.add(`${k} face-${size}`);
    }
    for (const id of LATER) if (have.has(id)) waiting.add(`${k} ${id} (recoloured by the desk, drawn by no scene)`);
    const known = (id) => PAIRS.some((p) => p[0] === id || p[1] === id) || LATER.includes(id) || Object.values(MARKED).includes(id);
    for (const id of have) if (!known(id)) waiting.add(`${k} ${id} (no placement row)`);
  }
  return { ops, painted, recoloured: [...recoloured], waiting: [...waiting], missing, cells, kinds, skipped, grids };
}
// the masters the retired names (21f: charcoal, russet, ash) put in the index and on disk are taken out when the grid is placed
const retiredCoat = (id) => /^mibi-(adult|juvenile)-S\d\d-(russet|ash)-/.test(id);
export function placeCoats({ desk = DESK, root = dest, dryRun = false, only = null } = {}) {
  const idxFile = path.join(root, "index.json"), index = JSON.parse(readFileSync(idxFile, "utf8")), plan = planCoats({ desk, index, only }), removed = Object.keys(index.masters).filter(retiredCoat);
  if (plan.missing.length) return { ...plan, removed: [] };   // the grid is whole or nothing is placed
  for (const o of plan.ops) {
    const file = `pods/${o.id}.png`, [w, h] = [o.buf.readUInt32BE(16), o.buf.readUInt32BE(20)];
    index.masters[o.id] = { file, w, h, sha256: sha(o.buf), signed: SIGNED, from: o.from };
    if (!dryRun) { mkdirSync(path.join(root, "pods"), { recursive: true }); writeFileSync(path.join(root, file), o.buf); }
  }
  if (plan.ops.length) for (const id of removed) { if (!dryRun) unlinkSync(path.join(root, index.masters[id].file)); delete index.masters[id]; }
  index.masters = Object.fromEntries(Object.entries(index.masters).sort(([a], [b]) => a.localeCompare(b)));
  if (!dryRun) writeFileSync(idxFile, JSON.stringify(index, null, 1) + "\n");
  return { ...plan, removed };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (k) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; }, dry = process.argv.includes("--dry") || process.argv.includes("--check");
  const r = placeCoats({ desk: arg("desk") ?? DESK, dryRun: dry, only: arg("kind") }), bad = r.painted.filter((c) => !c.ok);
  console.log(`${dry ? "would place" : "placed"} ${r.ops.length} coat masters for ${r.kinds.join(", ")}; ${r.cells} desk cells read, ${r.missing.length} missing; painted master proven against ${r.painted.length} placed masters, ${bad.length} differ; ${r.removed.length} retired names taken out`);
  console.log("recoloured: " + r.recoloured.sort().join(", "));
  console.log("waiting: " + r.waiting.sort().join(", "));
  for (const k of r.skipped) console.log(k + ": not placed, skipped");
  for (const m of r.missing) console.error("FAIL missing desk cell: " + m);
  for (const b of bad) console.error("FAIL painted master differs from the desk's between-dark: " + b.id);
  process.exit(bad.length || r.missing.length ? 1 : 0);
}
