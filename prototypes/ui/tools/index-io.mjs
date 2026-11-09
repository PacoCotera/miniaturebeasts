// The placed masters' two index files (prototypes/ui/assets/masters/):
//   index.json       what the page fetches: id -> { group, w, h, bytes, sha, [file], [slice], [tile], [status] } (+ juvenileFacing's table). `sha` is the first 12 hex of the file's SHA-256 (also the `?v=` of its URL);
//                    `file` is written only when it is not `<group>/<id>.png`. At most 80 KB gzipped (ui/tests/masters.test.mjs).
//   provenance.json  what the page never fetches: id -> { sha256 (whole), signed, from }, and the juvenileFacing note.
// Every tool and test reads the two together with readIndex(root) (the old whole shape: file, sha256, signed, from on every entry) and writes with writeIndex(root, index), which stamps `bytes` and splits.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { stampBytes } from "./index-bytes.mjs";

export const SHORT = 12;   // hex characters of the SHA-256 the page keeps and checks (48 bits: a corrupt or swapped file, not an attack)
const empty = () => ({ schema: "mb-masters/1", masters: {} });
export const groupOf = (file) => file.split("/")[0];
const defaultFile = (id, group) => `${group}/${id}.png`;

// slim (+ provenance) -> the whole entries; a fixture or an old index that still carries file/sha256/signed keeps them
export function expandIndex(slim, prov = null) {
  const out = { ...slim, masters: {} };
  if (prov?.juvenileFacingNote !== undefined && out.juvenileFacing) out.juvenileFacing = { note: prov.juvenileFacingNote, ...out.juvenileFacing };
  for (const [id, s] of Object.entries(slim.masters ?? {})) {
    const p = prov?.masters?.[id] ?? {}, e = { ...s };
    if (e.file === undefined && e.group !== undefined) e.file = defaultFile(id, e.group);
    if (e.sha256 === undefined && p.sha256 !== undefined) e.sha256 = p.sha256;
    if (e.signed === undefined && p.signed !== undefined) e.signed = p.signed;
    if (e.from === undefined && p.from !== undefined) e.from = p.from;
    if (e.squeezed === undefined && p.squeezed !== undefined) e.squeezed = p.squeezed;
    out.masters[id] = e;
  }
  return out;
}
export function readIndex(root) {
  const f = path.join(root, "index.json"), pf = path.join(root, "provenance.json");
  if (!existsSync(f)) return empty();
  return expandIndex(JSON.parse(readFileSync(f, "utf8")), existsSync(pf) ? JSON.parse(readFileSync(pf, "utf8")) : null);
}
// the whole index -> { slim, prov }
export function splitIndex(index) {
  const slim = { schema: index.schema ?? "mb-masters/1" }, prov = { schema: "mb-masters-provenance/1", masters: {} };
  if (index.juvenileFacing) { const { note, ...table } = index.juvenileFacing; slim.juvenileFacing = table; if (note !== undefined) prov.juvenileFacingNote = note; }
  slim.masters = {};
  for (const [id, e] of Object.entries(index.masters)) {
    const group = e.group ?? groupOf(e.file), { file, sha256, sha: _s, signed, from, squeezed, group: _g, w, h, bytes, ...rest } = e;
    slim.masters[id] = { group, w, h, ...(bytes !== undefined ? { bytes } : {}), sha: sha256.slice(0, SHORT), ...(file === defaultFile(id, group) ? {} : { file }), ...rest };
    prov.masters[id] = { sha256, ...(signed !== undefined ? { signed } : {}), ...(from !== undefined ? { from } : {}), ...(squeezed !== undefined ? { squeezed } : {}) };
  }
  return { slim, prov };
}
// one entry to a line: a diff shows one master, the file gzips well
const lines = (head, masters) => "{\n" + head + ' "masters": {\n' + Object.entries(masters).map(([id, e]) => "  " + JSON.stringify(id) + ": " + JSON.stringify(e)).join(",\n") + "\n }\n}\n";
export function writeIndex(root, index) {
  stampBytes(root, index);
  const { slim, prov } = splitIndex(index);
  mkdirSync(root, { recursive: true });
  const head = (o) => Object.entries(o).filter(([k]) => k !== "masters").map(([k, v]) => " " + JSON.stringify(k) + ": " + JSON.stringify(v, null, 1).replace(/\n/g, "\n ") + ",\n").join("");
  writeFileSync(path.join(root, "index.json"), lines(head(slim), slim.masters));
  writeFileSync(path.join(root, "provenance.json"), lines(head(prov), prov.masters));
  return { slim, prov };
}
// the slim index agrees with the provenance (the 12 hex are the first 12 of the whole hash) and carries nothing the page does not need
export function indexProblems(root) {
  const f = path.join(root, "index.json"), pf = path.join(root, "provenance.json"); if (!existsSync(f)) return [];
  if (!existsSync(pf)) return ["provenance.json is missing (place-masters.mjs writes it beside index.json)"];
  const slim = JSON.parse(readFileSync(f, "utf8")), prov = JSON.parse(readFileSync(pf, "utf8")), out = [];
  for (const [id, s] of Object.entries(slim.masters)) {
    const p = prov.masters[id]; if (!p) { out.push(`${id}: no provenance entry`); continue; }
    if (s.sha !== p.sha256.slice(0, SHORT)) out.push(`${id}: the index's sha ${s.sha} is not the start of the provenance hash`);
    for (const k of ["signed", "from", "sha256", "squeezed"]) if (k in s) out.push(`${id}: index.json carries ${k}; it belongs in provenance.json`);
  }
  for (const id of Object.keys(prov.masters)) if (!slim.masters[id]) out.push(`${id}: in provenance.json, not in index.json`);
  return out;
}
