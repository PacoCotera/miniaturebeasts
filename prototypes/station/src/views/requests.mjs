// The picture requests the props builders make: a builder collects its requests in one array and each request is a plain object the host reads. Pure.
import { keyToken } from "../looks.mjs";

// req(requests, once = false): the collector for one builder. req(r) pushes the request r onto `requests` and returns r.id.
// With `once`, a request whose id is already in `requests` is not pushed again; the id is returned either way.
export const req = (requests, once = false) => (r) => { if (!once || !requests.some((x) => x.id === r.id)) requests.push(r); return r.id; };

// slot(req, until): the maker of signed-master requests for one builder. slot(id, size, until2) requests { kind: "slot", id, master: id, size, until } through `req` and returns the id;
// `until` (what the picture waits for) is the builder's default and until2, when given, replaces it for that call.
export const slot = (req, until) => (id, size, until2) => req({ kind: "slot", id, master: id, size, until: until2 || until });

// ph(req, until): the maker of placeholder requests for one builder. ph(id, size, hollow = false) requests { kind: "ph", id, size, hollow, until } through `req` and returns the id.
export const ph = (req, until) => (id, size, hollow = false) => req({ kind: "ph", id, size, hollow, until });

// plateDevice(w, h, until = "the device plate (fix 2: placed 1:1)"): the request for the device plate of w x h placed 1:1, { kind: "slot", id: "plate-device-WxH", master: the same, size: [w, h], until }.
// Returns the request; the caller passes it to its req. `until` is the caller's own wording of what the picture waits for, when it has one.
export const plateDevice = (w, h, until = "the device plate (fix 2: placed 1:1)") => ({ kind: "slot", id: `plate-device-${w}x${h}`, master: `plate-device-${w}x${h}`, size: [w, h], until });

// slotAt(req, master, rect, until): the request for a signed master placed at a rect of the spec, requested through `req` and returned as its id: { kind: "slot", id: "<master>:<w>x<h>", master, size: rect.slice(2), until }.
export const slotAt = (req, master, rect, until) => { const size = rect.slice(2); return req({ kind: "slot", id: `${master}:${size.join("x")}`, master, size, until }); };

// ---- the Level 2 sheet (library-sheet.mjs draws it; library.json l2) ----
// input: specimen-props.mjs sheetInput; facts: library-sheet.mjs speciesFacts (S_form and the tier, facts of the species).
// The digest of a sheet names what sets its pixels: the species facts, the mode and, on a found sheet, the guide looks, the chapters still shut, readOnce, sealedOpen and the colours found. The looks new this visit
// set no pixel (the glints are the face's, placed from library-sheet.mjs sheetFacts), so leaving the Library or a wish never makes a sheet again. A met sheet's digest is the species facts and the mode alone: the same picture for every player.
export function sheetDigest(input, facts) {
  const sp = [facts.sForm, facts.tier.id], f = input.found ?? {};
  const key = input.mode === "met" ? [sp, "met"] : [sp, "found", Object.keys(f).sort().map((t) => [t, f[t]]), input.shut ?? [], input.readOnce ?? [], !!input.sealedOpen, f.colour ?? []];
  return keyToken(JSON.stringify(key));
}
// Whether a chapter may be lit (a focus target that makes a lit variant and a page): never a shut chapter, never on a met sheet.
export const canLight = (input, chapter) => input.mode !== "met" && !(input.shut ?? []).includes(chapter);
// The ids: library-sheet-{SNN}-{digest}, its -lit-{chapterId} variant, library-page-{SNN}-{chapterId}-{digest}; look-disc-{SNN}-{trait}-{look}-16.
export const sheetId = (input, facts) => `library-sheet-${input.species}-${sheetDigest(input, facts)}`;
export const litId = (input, facts, chapter) => `${sheetId(input, facts)}-lit-${chapter}`;
export const pageId = (input, facts, chapter) => `library-page-${input.species}-${chapter}-${sheetDigest(input, facts)}`;
export const discId = (species, trait, look) => `look-disc-${species}-${trait}-${look}-16`;
// The quiet stand-in of a sheet (library-sheet.mjs renderSheet quiet: the ground, the surfaces, the type and the mosaic, no form), shown while the sheet is not made: library-quiet-{SNN}-{digest}, the sheet's digest.
export const quietId = (input, facts) => `library-quiet-${input.species}-${sheetDigest(input, facts)}`;
// sheet(req): the maker of the Level 2 sheet's requests for one builder. sheet(spec, input, facts, lit) requests the sheet ({ kind: "librarysheet", id, species, input, size: l2.sheet.rect's }) and, with a chapter that may be lit,
// its lit variant ({ kind: "librarylit", id, chapter, ... }) and that chapter's page ({ kind: "librarypage", id, chapter, size: l2.page.rect's }). spec: library.json. Returns { sheet, lit, page }, the ids (lit and page null when none is made).
export const sheet = (req) => (spec, input, facts, lit = null) => {
  const species = input.species, size = spec.l2.sheet.rect.slice(2), out = { sheet: req({ kind: "librarysheet", id: sheetId(input, facts), species, input, size }), lit: null, page: null };
  if (lit && canLight(input, lit)) { out.lit = req({ kind: "librarylit", id: litId(input, facts, lit), species, input, chapter: lit, size }); out.page = req({ kind: "librarypage", id: pageId(input, facts, lit), species, input, chapter: lit, size: spec.l2.page.rect.slice(2) }); }
  return out;
};
// disc(req): the maker of a found look's 16 px disc request (the Level 2 shelf's wish pieces): disc(species, trait, look) requests { kind: "lookdisc", id: look-disc-{SNN}-{trait}-{look}-16, species, trait, look, size: [16, 16] } and returns the id.
export const disc = (req) => (species, trait, look) => req({ kind: "lookdisc", id: discId(species, trait, look), species, trait, look, size: [16, 16] });
// quiet(req): the maker of a sheet's quiet stand-in request: quiet(spec, input, facts) requests { kind: "libraryquiet", id: quietId, species, input, size: l2.sheet.rect's } and returns the id.
export const quiet = (req) => (spec, input, facts) => req({ kind: "libraryquiet", id: quietId(input, facts), species: input.species, input, size: spec.l2.sheet.rect.slice(2) });
