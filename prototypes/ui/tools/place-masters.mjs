#!/usr/bin/env node
// Places signed masters in the Station: copies each slice from a masters folder into prototypes/ui/assets/masters/<group>/, after checking its
// size and SHA-256 against the folder's own manifest, and writes prototypes/ui/assets/masters/index.json (id → file, size, hash, who signed).
// A slice is placed when it sits under a README heading that ends "(signed)", or when it is named with --ids; with --only just the named ones (the art director's list). Nothing else is placed; the
// rest are listed as not signed. Re-running is idempotent. `--check` verifies the installed files against the index (size, hash) and exits 1 on a difference.
//   node prototypes/ui/tools/place-masters.mjs --from art/station-masters/pods [--ids pod-large-identified,room-shelf] [--group pods] [--dry]
//   node prototypes/ui/tools/place-masters.mjs --rooms <masters-pods>/art/station-masters/pods/rooms/rooms-manifest.json [--dry]   (the four rooms: the rooms design)
//   node prototypes/ui/tools/place-masters.mjs --check
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { decodePNG } from "../png.mjs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), dest = path.resolve(here, "../assets/masters"), indexFile = path.join(dest, "index.json"), specs = path.resolve(here, "../specs/station");
const arg = (k) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; }, flag = (k) => process.argv.includes("--" + k);
const sha = (buf) => createHash("sha256").update(buf).digest("hex");
const readIndex = () => (existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, "utf8")) : { schema: "mb-masters/1", masters: {} });
// a PNG's size from its header (indexed masters are legal: no decode needed)
const dims = (buf) => { if (buf.subarray(1, 4).toString("ascii") !== "PNG") throw new Error("not a PNG"); return [buf.readUInt32BE(16), buf.readUInt32BE(20)]; };

// The ids a README lists under headings that end "(signed)": the first backticked cell of each table row below such a heading.
export function signedIds(readme) {
  const out = new Map(); let section = null;
  for (const line of readme.split("\n")) {
    const h = line.match(/^#{2,4}\s+(.*)$/); if (h) { section = /\(signed\)\s*$/i.test(h[1].trim()) ? h[1].trim() : null; continue; }
    const row = section && line.match(/^\|\s*`([^`]+)`\s*\|/); if (row) out.set(row[1], section);
  }
  return out;
}
export function check(root = dest) {
  const index = JSON.parse(readFileSync(path.join(root, "index.json"), "utf8")), problems = [];
  for (const [id, e] of Object.entries(index.masters)) {
    const f = path.join(root, e.file); if (!existsSync(f)) { problems.push(`${id}: ${e.file} is missing`); continue; }
    const buf = readFileSync(f), [w, h] = dims(buf);
    if (sha(buf) !== e.sha256) problems.push(`${id}: ${e.file} does not match its hash`);
    if (w !== e.w || h !== e.h) problems.push(`${id}: ${e.file} is ${w}×${h}, the index says ${e.w}×${e.h}`);
  }
  return problems;
}
// ---- The rooms (the rooms design): the signed room art of masters-pods `rooms/`, placed under `rooms/` in the masters, and rooms.json (generated, never edited by hand).
export const ROOMS = ["roots", "reeds", "boulders", "ferns"], LIGHTS = ["dawn", "day", "dusk", "night"];
const pictureId = (tpl, light) => tpl.replaceAll("{light}", light);
const topAt = (lv, fx) => { for (let i = lv.top.length - 1; i >= 0; i--) if (fx >= lv.x[i]) return lv.top[i]; return lv.top[0]; };   // the top of the band holding fx (fx in [x0, xn])
// JSON for rooms.json: objects indented, arrays of plain values on one line
const fmt = (v, ind = "") => Array.isArray(v) ? (v.every((e) => e === null || typeof e !== "object" || (Array.isArray(e) && e.every((n) => typeof n !== "object"))) ? "[" + v.map((e) => fmt(e)).join(", ") + "]" : "[\n" + v.map((e) => ind + " " + fmt(e, ind + " ")).join(",\n") + "\n" + ind + "]")
  : v && typeof v === "object" ? "{\n" + Object.entries(v).map(([k, e]) => ind + " " + JSON.stringify(k) + ": " + fmt(e, ind + " ")).join(",\n") + "\n" + ind + "}" : JSON.stringify(v);
// A join's ends (§2.2), the upper end first: the upper end is the rect's x edge inside the upper level's span at the upper level's bottom; the lower end is the other edge at rect.y + rect.h, moved down to that column's top when it lies above the lower level.
function joinEnds(j, upper, lower) {
  const [x, y, w, h] = j.rect_painting, edges = [x, x + w], inside = edges.filter((e) => e >= upper.x[0] && e <= upper.x[upper.x.length - 1]);
  if (inside.length !== 1) throw new Error(`the join ${JSON.stringify(j.rect_painting)}: ${inside.length} of its x edges lie in the level ${upper.id}'s span (one is needed)`);
  const up = inside[0], lo = edges.find((e) => e !== up) ?? up, lowY = Math.max(y + h, topAt(lower, lo));
  return [[up, upper.bottom], [lo, lowY]];
}
export function placeRooms({ manifest, dryRun = false, root = dest, roomsFile = path.join(specs, "rooms.json"), commit = null, only = ROOMS }) {
  const mfile = path.resolve(manifest), mf = JSON.parse(readFileSync(mfile, "utf8")), rooms = path.dirname(mfile), pods = path.dirname(rooms);
  const top = commit ? null : execFileSync("git", ["-C", rooms, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const source = { repo: "masters-pods", commit: commit ?? execFileSync("git", ["-C", rooms, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(), manifest: top ? path.relative(top, mfile).split(path.sep).join("/") : path.basename(mfile) };
  const ops = [], leftOut = [], data = { schema: "mb-rooms/1", source, order: [...only], rooms: {} };
  const read = (f) => { if (!existsSync(f)) return null; const buf = readFileSync(f), [w, h] = dims(buf); return { buf, w, h, rel: path.relative(pods, f).split(path.sep).join("/") }; };   // rel: the file's path in masters-pods
  const hashes = mf.hashes ?? {};   // optional: { "<pods-relative path>": "<sha256>" }: a copied file listed here with another hash is refused
  const add = (room, id, src, signed) => { const want = hashes[src.rel]; if (want && sha(src.buf) !== want) throw new Error(`${room}: ${src.rel} does not match the manifest's hashes entry`); ops.push({ id, room, src, signed }); };
  for (const room of only) {
    const r = mf[room]; if (!r) throw new Error(`${room}: the manifest has no such room`);
    const signed = {};   // each light's own signed text; the day's is the room's (its scene's), the day near's its own (near_day)
    for (const l of LIGHTS) {
      const text = l === "day" ? r.signed : r.lights?.[l]?.signed, near = l === "day" ? r.near_day?.signed : text;
      if (!text || !near) throw new Error(`${room}: the ${l} light is not signed (the manifest has no signed text for it); the room is refused`);
      signed[l] = { idle: text, near };
    }
    if (r.sha256) { const f = path.join(pods, r.day), got = existsSync(f) ? sha(readFileSync(f)) : null; if (got !== r.sha256) throw new Error(`${room}: ${r.day} does not match the manifest's sha256`); }   // the manifest's own hash: the signed day scene
    for (const l of LIGHTS) { const e = r.lights[l], want = e.sha256; if (want) { const f = path.join(pods, e.idle), got = existsSync(f) ? sha(readFileSync(f)) : null; if (got !== want) throw new Error(`${room}: ${e.idle} does not match the manifest's sha256`); } }
    const pic = {};
    for (const [key, name, kind] of [["base", (l) => `seated-idle-${room}-${l}.png`, "idle"], ["near", (l) => `signed-near-${room}-${l}.png`, "near"]]) {
      const files = LIGHTS.map((l) => { const f = read(path.join(rooms, name(l))); if (!f) throw new Error(`${room}: ${name(l)} is missing`); return f; }), { w, h } = files[0];
      files.forEach((f, i) => { if (f.w !== w || f.h !== h) throw new Error(`${room}: ${name(LIGHTS[i])} is ${f.w}×${f.h}, the ${LIGHTS[0]} one is ${w}×${h}`); });
      pic[key] = `room-${room}-${kind === "idle" ? "idle" : "near"}-{light}-${w}x${h}`; LIGHTS.forEach((l, i) => add(room, pictureId(pic[key], l), files[i], signed[l][kind]));
    }
    const out = { base: pic.base, near: pic.near, chip: null, preview: null };
    const lv = r.levels.map((L) => ({ id: L.id, x: L.profile.x, top: L.profile.top_painting, bottom: L.bottom_painting, keepOuts: [] }));
    if (lv[0]?.id !== "main") throw new Error(`${room}: the first level must be main`);
    const byId = (id) => lv.find((L) => L.id === id) ?? (() => { throw new Error(`${room}: no level ${id}`); })();
    const joins = []; r.levels.forEach((L, i) => { for (const j of L.joins ?? []) { const n = joins.filter((q) => q.kind === j.kind).length + 1; joins.push({ id: `${room}-${j.kind}-${n}`, kind: j.kind, upper: L.id, lower: j.to, rect: j.rect_painting, ends: joinEnds(j, lv[i], byId(j.to)) }); } });
    const pieces = [], ambient = []; let bed = null;
    const piece = (p, kind, extra = {}) => ({ id: p.id, kind, ...extra });
    const ids = (p, tpl) => { const files = LIGHTS.map((l) => ({ l, f: read(path.join(pods, pictureId(tpl, l))) })), [x, y, w, h] = p.rect_painting ?? [0, 0, 0, 0];
      if (files.some((q) => !q.f)) return { why: `its file ${pictureId(tpl, "day")} is missing` };
      const bad = files.find((q) => q.f.w !== w || q.f.h !== h); if (bad) return { why: `its file is ${bad.f.w}×${bad.f.h}, the manifest's rect is ${w}×${h}` };
      const base = `room-${room}-${p.id.startsWith(room + "-") ? p.id.slice(room.length + 1) : p.id}`; return { files, picture: `${base}-{light}-${w}x${h}`, x, y }; };
    const take = (p, tpl) => { const q = ids(p, tpl); if (q.why) return q; for (const { l, f } of q.files) add(room, pictureId(q.picture, l), f, signed[l].idle); return q; };
    const occ = (p, level, extra) => { const t = p.file ? p.file : null, q = t ? take(p, t) : { why: "no file in the manifest" };
      if (q.why) leftOut.push({ room, id: p.id, why: q.why, kept: "occluder: keep-out only, picture null" });
      pieces.push({ id: p.id, kind: "occluder", level, rect: p.rect_painting, foot: p.foot_painting, picture: q.why ? null : q.picture, ...extra }); byId(level).keepOuts.push(p.keepOut_painting); };
    for (const p of r.occluders ?? []) occ(p, p.level, { seam: true });
    for (const p of r.pieces) {
      const tpl = p.file ?? `rooms/pieces/${room}/${p.id}-{light}.png`;
      switch (p.kind) {
        case "occluder": occ(p, p.level); break;
        case "bed": { const q = take(p, tpl); if (q.why) throw new Error(`${room}: the bed: ${q.why}`); bed = { rect: p.rect_painting, foot: p.foot_painting, picture: q.picture }; break; }
        case "fitting": case "mist": { const q = take(p, tpl); if (q.why) { leftOut.push({ room, id: p.id, why: q.why, kept: "left out" }); break; } pieces.push(piece(p, "back", { rect: p.rect_painting, ...(p.kind === "mist" && !p.alpha_in_file ? { opa: Math.round(p.alpha * 255) } : {}), picture: q.picture })); break; }
        case "drop": case "anim": {
          ambient.push(p);   // carried verbatim for the movement workstream; never drawn here
          if (p.poses_deg?.fill !== undefined && p.file?.includes("{pose}")) { const id = `${p.id}-fill`, fp = { ...p, id, rect_painting: p.rect_painting }, q = take(fp, p.file.replace("{pose}", "fill")); if (q.why) leftOut.push({ room, id, why: q.why, kept: "left out" }); else pieces.push({ id, kind: "back", rect: p.rect_painting, picture: q.picture }); }   // the arm's fill pose: the spout is never armless
          break; }
        default: throw new Error(`${room}: ${p.id}: the piece kind ${p.kind} is not known`);
      }
    }
    data.rooms[room] = { ...out, ...(bed ? { bed } : {}), levels: lv, joins, pieces, ambient };
  }
  // all read and checked: now write
  const idxFile = path.join(root, "index.json"), index = existsSync(idxFile) ? JSON.parse(readFileSync(idxFile, "utf8")) : { schema: "mb-masters/1", masters: {} }, placed = [];
  for (const id of Object.keys(index.masters)) if (index.masters[id].file.startsWith("rooms/") && !dryRun && !ops.some((o) => o.id === id)) { rmSync(path.join(root, index.masters[id].file), { force: true }); delete index.masters[id]; }   // what this run no longer places leaves with its file
  for (const o of ops) {
    const file = `rooms/${o.id}.png`; placed.push(o.id);
    index.masters[o.id] = { file, w: o.src.w, h: o.src.h, sha256: sha(o.src.buf), signed: o.signed, from: `${o.src.rel}@${source.commit}` };
    if (!dryRun) { mkdirSync(path.join(root, "rooms"), { recursive: true }); writeFileSync(path.join(root, file), o.src.buf); }
  }
  index.masters = Object.fromEntries(Object.entries(index.masters).sort(([a], [b]) => a.localeCompare(b)));
  if (!dryRun) { mkdirSync(root, { recursive: true }); writeFileSync(idxFile, JSON.stringify(index, null, 1) + "\n"); mkdirSync(path.dirname(roomsFile), { recursive: true }); writeFileSync(roomsFile, fmt(data) + "\n"); }
  return { placed, leftOut, rooms: data };
}
// The data guards of the rooms design (1 to 7) on rooms.json against the index: `problems` stop; `notes` are the art director's own rules (48 deep, 160 wide, 1:2, 24 px, the main floor about 100 deep), reported and never refused.
export function checkRooms(data, index, windowRect, root = dest) {
  const problems = [], notes = [], M = index.masters, area = windowRect[2] * windowRect[3];
  for (const room of data.order) {
    const r = data.rooms[room], P = (n, m) => problems.push(`rooms.json ${room}: guard ${n}: ${m}`), N = (m) => notes.push(`${room}: ${m}`);
    if (!r) { P(1, "the room is missing"); continue; }
    const L = Object.fromEntries(r.levels.map((l) => [l.id, l])), main = r.levels[0];
    if (main?.id !== "main") P(1, "levels[0] is not main");
    for (const l of r.levels) {   // 1
      if (l.x.length !== l.top.length + 1) P(1, `level ${l.id}: x has ${l.x.length} values for ${l.top.length} tops`);
      if (!l.x.every((v, i) => i === 0 || v > l.x[i - 1])) P(1, `level ${l.id}: x does not strictly increase`);
      if (!l.top.every((v) => v < l.bottom)) P(1, `level ${l.id}: a top is not above the bottom ${l.bottom}`);
    }
    const bandsOf = (l, from, to) => l.top.map((t, i) => ({ x0: l.x[i], x1: l.x[i + 1], t })).filter((b) => b.x1 > from && b.x0 < to);
    for (const l of r.levels.slice(1)) for (const b of bandsOf(main, l.x[0], l.x[l.x.length - 1])) if (!(l.bottom < b.t)) P(2, `level ${l.id}: bottom ${l.bottom} is not above the main floor's top ${b.t} at x ${b.x0}..${b.x1}`);   // 2
    for (const j of r.joins) for (const [n, e] of j.ends.entries()) {   // 3
      const l = L[n === 0 ? j.upper : j.lower]; if (!l) { P(3, `join ${j.id}: no level for end ${n}`); continue; }
      if (e[0] < l.x[0] || e[0] > l.x[l.x.length - 1] || e[1] < topAt(l, e[0]) || e[1] > l.bottom) P(3, `join ${j.id}: end ${n} ${JSON.stringify(e)} is not on level ${l.id}`);
    }
    const size = (id) => { const m = id.match(/-(\d+)x(\d+)$/); return m ? [+m[1], +m[2]] : null; };
    const pics = [];   // [id, rect size or null]
    for (const l of LIGHTS) { pics.push([pictureId(r.base, l), null], [pictureId(r.near, l), null]); }
    if (r.bed?.picture) for (const l of LIGHTS) pics.push([pictureId(r.bed.picture, l), r.bed.rect.slice(2)]);
    for (const p of r.pieces) if (p.picture) for (const l of LIGHTS) pics.push([pictureId(p.picture, l), p.rect.slice(2)]);
    for (const [id, wh] of pics) {   // 4
      const e = M[id]; if (!e) { P(4, `${id} is not in the masters index`); continue; }
      const s = size(id); if (!s || e.w !== s[0] || e.h !== s[1]) P(4, `${id}: the index says ${e.w}×${e.h}, the id says ${s}`);
      if (wh && (e.w !== wh[0] || e.h !== wh[1])) P(4, `${id}: the index says ${e.w}×${e.h}, the piece's rect is ${wh.join("×")}`);
    }
    const occ = r.pieces.filter((p) => p.kind === "occluder");
    for (const p of occ) if (p.picture) for (const l of LIGHTS) { const e = M[pictureId(p.picture, l)]; if (!e) continue;   // 5
      const f = path.join(root, e.file); if (!existsSync(f)) continue; const img = decodePNG(readFileSync(f)); let bad = 0;
      for (let i = 3; i < img.data.length; i += 4) if (img.data[i] !== 0 && img.data[i] !== 255) bad++;
      if (bad) P(5, `${pictureId(p.picture, l)}: ${bad} pixels have an alpha that is neither 0 nor 255 (edge: hard)`); }
    if (occ.length > 6) P(6, `${occ.length} occluders (at most 6)`);   // 6
    const share = occ.reduce((a, p) => a + p.rect[2] * p.rect[3], 0); if (share > 0.15 * area) P(6, `the occluders cover ${share} px, over 15 % of the window (${area} px)`);
    const [pw, ph] = size(pictureId(r.base, "day")) ?? [0, 0], inside = (q, what) => { if (q[0] < 0 || q[1] < 0 || q[0] + q[2] > pw || q[1] + q[3] > ph) P(7, `${what} ${JSON.stringify(q)} is not inside the ${pw}×${ph} painting`); };   // 7
    for (const p of r.pieces) inside(p.rect, p.id); if (r.bed) inside(r.bed.rect, "bed"); for (const j of r.joins) inside(j.rect, j.id); for (const l of r.levels) l.keepOuts.forEach((k, i) => inside(k, `${l.id} keep-out ${i}`));
    // the art director's rules: reported
    for (const l of r.levels) {
      const w = l.x[l.x.length - 1] - l.x[0], depth = Math.min(...l.top.map((t) => l.bottom - t));
      if (l.id === "main") { if (depth < 100) N(`the main floor is ${depth} px deep at its shallowest (the art director's rule: about 100)`); } else { if (depth < 48) N(`level ${l.id} is ${depth} px deep (the art director's rule: at least 48)`); if (w < 160) N(`level ${l.id} is ${w} px wide (the art director's rule: at least 160)`); }
    }
    for (const j of r.joins) { const rise = Math.abs(j.ends[0][1] - j.ends[1][1]), run = Math.abs(j.ends[0][0] - j.ends[1][0]); if (j.kind === "ramp" && rise > run / 2) N(`${j.id} rises ${rise} over ${run} (${(rise / run).toFixed(2)}; the art director's rule: at most 1:2)`); if (j.kind === "hop" && rise > 24) N(`${j.id} hops ${rise} px (the art director's rule: at most 24)`); }
  }
  return { problems, notes };
}
export function place({ from, ids = [], group, dryRun = false, root = dest, headings = true, by = null, byStatus = false, skip = [] }) {
  const manifest = JSON.parse(readFileSync(path.join(from, "slices/manifest.json"), "utf8")), readme = readFileSync(path.join(from, "README.md"), "utf8");
  const signed = headings ? signedIds(readme) : new Map(), want = new Map([...signed].filter(([id]) => manifest[id]));
  // --status: the studio's own record (slices/status.json): `signed` slices are placed as signed; `placeholder`, `held` and `new` (cut, not yet signed) ones are placed too, flagged in the index as not final (never shown to the owner as final); `withdrawn` is not placed
  const flags = new Map(), statuses = new Map();
  if (byStatus) { const st = JSON.parse(readFileSync(path.join(from, "slices/status.json"), "utf8"));
    for (const [id, e] of Object.entries(st)) if (manifest[id] && ["signed", "placeholder", "held", "new"].includes(e.status)) { want.set(id, `signed (${by ?? "the studio's record"})`); statuses.set(id, e.status); if (e.status !== "signed") flags.set(id, `${e.status} (${by ?? "the studio's record"}), not final`); } }
  for (const id of ids) { if (!manifest[id]) throw new Error(`${id} is not in ${from}/slices/manifest.json`); want.set(id, manifest[id].signed_in || by || "named with --ids"); }   // --by names who signed these ids, verbatim
  const idxFile = path.join(root, "index.json"), index = existsSync(idxFile) ? JSON.parse(readFileSync(idxFile, "utf8")) : { schema: "mb-masters/1", masters: {} };
  const placed = [], skipped = [];
  for (const id of skip) want.delete(id);   // named by --skip: not placed (a slice the studio's own folder does not hold consistently), listed as skipped
  for (const [id, who] of want) {
    const m = manifest[id], src = path.join(from, "slices", id + ".png"), buf = readFileSync(src), [w, h] = dims(buf);
    if (w !== m.size[0] || h !== m.size[1]) throw new Error(`${id}: the file is ${w}×${h}, its manifest says ${m.size.join("×")}`);
    if (sha(buf) !== m.sha256) throw new Error(`${id}: the file does not match its manifest hash`);
    const file = `${group}/${id}.png`; placed.push(id);
    const empty = index.masters[id]?.status === "empty" && statuses.get(id) !== "signed";   // a slot the Station emptied (status "empty") stays empty until the studio's record says signed
    index.masters[id] = { file, w, h, sha256: m.sha256, signed: flags.get(id) ?? (byStatus ? who : by ?? who), ...(empty ? { status: "empty" } : statuses.has(id) && statuses.get(id) !== "signed" ? { status: statuses.get(id) } : {}), ...(m.nine ? { slice: [m.nine.insets.left, m.nine.insets.top, m.nine.insets.right, m.nine.insets.bottom], tile: m.nine.edgeTile } : {}) };   // a nine-slice master: its insets [l, t, r, b] and the edge tile
    if (!dryRun) { mkdirSync(path.join(root, group), { recursive: true }); copyFileSync(src, path.join(root, file)); }
  }
  for (const id of Object.keys(manifest)) if (!want.has(id)) skipped.push(id);
  if (byStatus) for (const id of Object.keys(index.masters)) if (index.masters[id].file.startsWith(group + "/") && !want.has(id)) { if (!dryRun) rmSync(path.join(root, index.masters[id].file), { force: true }); delete index.masters[id]; }   // what the record no longer places leaves with its file
  index.masters = Object.fromEntries(Object.entries(index.masters).sort(([a], [b]) => a.localeCompare(b)));
  if (!dryRun) { mkdirSync(root, { recursive: true }); writeFileSync(idxFile, JSON.stringify(index, null, 1) + "\n"); }
  return { placed, skipped };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (flag("check")) {
    const p = existsSync(indexFile) ? check() : [], roomsFile = path.join(specs, "rooms.json"); let notes = [];
    if (existsSync(roomsFile)) { const r = checkRooms(JSON.parse(readFileSync(roomsFile, "utf8")), readIndex(), JSON.parse(readFileSync(path.join(specs, "vivarium.json"), "utf8")).regions.window.rect); p.push(...r.problems); notes = r.notes; }   // the rooms' data guards 1 to 7 (the rooms design)
    for (const x of p) console.error("FAIL " + x); for (const x of notes) console.log("note " + x);
    console.log(`masters: ${Object.keys(readIndex().masters).length} placed, ${p.length} problems`); process.exit(p.length ? 1 : 0);
  }
  if (arg("rooms")) {
    const r = placeRooms({ manifest: path.resolve(arg("rooms")), dryRun: flag("dry") });
    console.log(`${flag("dry") ? "would place" : "placed"} ${r.placed.length} room pictures, rooms.json for ${r.rooms.order.join(", ")} (masters-pods ${r.rooms.source.commit})`);
    for (const q of r.leftOut) console.log(`${q.kept === "left out" ? "left out" : "no picture"}: ${q.room}/${q.id}: ${q.why}${q.kept === "left out" ? "" : " (" + q.kept + ")"}`);
    process.exit(0);
  }
  const from = arg("from"); if (!from) { console.error("usage: place-masters.mjs --from <masters folder> [--ids a,b [--only]] [--by <who signed>] [--group pods] [--dry] [--status] [--skip a,b] | --rooms <rooms-manifest.json> [--dry] | --check"); process.exit(2); }
  const r = place({ from: path.resolve(from), ids: (arg("ids") ?? "").split(",").filter(Boolean), group: arg("group") ?? path.basename(path.resolve(from)), dryRun: flag("dry"), headings: !flag("only") && !flag("status"), by: arg("by"), byStatus: flag("status"), skip: (arg("skip") ?? "").split(",").filter(Boolean) });
  console.log(`placed ${r.placed.length}: ${r.placed.join(", ")}\nnot signed (left as stand-ins): ${r.skipped.length}`);
}
