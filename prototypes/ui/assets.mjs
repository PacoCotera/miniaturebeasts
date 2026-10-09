// The asset manifest: every picture the scene names, registered at its pixel size with its policy and status
// (technical-architecture.md §5.2: { id, file, w, h, policy, status, until, hash }; §5.5: placed 1:1, a placeholder
// flagged until its master takes its id and size). A sprite's slot must equal its asset's size; the renderer refuses
// anything else and counts it. Pictures are built lazily by the registered builder and kept in the cache by id
// (today: drawn placeholders and the rig's renders; a master is a PNG file named in `file`, nothing else).
const ENTRIES = new Map();
const BUILT = new Map();

// Register an asset (idempotent for an id already registered with the same size).
//   slice: [left, top, right, bottom] marks a nine-slice picture (its edges and middle are tiled, never scaled)
export function registerAsset({ id, w, h, policy = "stationChrome", status = "placeholder", until = null, file = null, hash = null, slice = null, tile = null, build }) {
  if (file && !/\.png$/i.test(file)) throw new Error(`asset ${id}: ${file} is not a PNG (PNG only)`);
  const have = ENTRIES.get(id);
  if (have) {
    if (have.w !== w || have.h !== h) throw new Error(`asset ${id} registered twice at different sizes: ${have.w}×${have.h} and ${w}×${h}`);
    if (have.status === "empty" && build) { Object.assign(have, { policy, status, until, file, hash, slice, tile, build }); return have; }   // a stand-in fills an empty slot
    return have;
  }
  const e = { id, w, h, policy, status, until, file, hash, slice, tile, build };
  ENTRIES.set(id, e); return e;
}
// Place a signed master over its stand-in by id (technical-architecture.md §5.5): the master must be the stand-in's size, 1:1, or it is refused
// loudly; the entry becomes status `master`, names its file and hash, and builds from the decoded picture. A master placed before its stand-in
// is registered takes the id first, and a stand-in of another size then throws at registration. `picture` is anything with w, h and canvas().
export function placeMaster({ id, w, h, file, hash, policy = "painted", signed = null, slice = null, tile = null, status = "master" }, picture) {
  if (!/\.png$/i.test(file)) throw new Error(`master ${id}: ${file} is not a PNG (PNG only)`);
  if (picture.w !== w || picture.h !== h) throw new Error(`master ${id}: the file is ${picture.w}×${picture.h}, the index says ${w}×${h}`);
  const have = ENTRIES.get(id);
  if (have && (have.w !== w || have.h !== h)) throw new Error(`master ${id} is ${w}×${h}; its stand-in is ${have.w}×${have.h}: a master takes its stand-in's size, never scaled`);
  ENTRIES.set(id, { id, w, h, policy: have?.policy === "type" ? "type" : policy, status, until: null, file, hash, slice: slice ?? have?.slice ?? null, tile: tile ?? have?.tile ?? null, signed, build: () => picture });
  BUILT.delete(id); return ENTRIES.get(id);
}
// A slot: a place the design needs a picture where none is signed yet (a mark, a key cap, a face). It is in the manifest as status `empty` at its
// exact size, with what it waits for; nothing is drawn there, and the layout does not move when it fills. A placed master of the same id and
// size (placeMaster) or a registered stand-in fills it, with no change to the component.
export function registerSlot({ id, w, h, policy = "stationChrome", until }) {
  const have = ENTRIES.get(id);
  if (have) { if (have.w !== w || have.h !== h) throw new Error(`slot ${id} registered twice at different sizes: ${have.w}×${have.h} and ${w}×${h}`); return have; }
  const e = { id, w, h, policy, status: "empty", until, file: null, hash: null, slice: null, build: null };
  ENTRIES.set(id, e); return e;
}
export const isFilled = (id) => { const e = ENTRIES.get(id); return !!e && e.status !== "empty"; };
export const empties = () => manifest().filter((e) => e.status === "empty");
export const hasAsset = (id) => ENTRIES.has(id);
export const assetEntry = (id) => ENTRIES.get(id) ?? null;
// The built picture (anything with w, h and canvas()) or null when the id is unknown. `env` reaches the builder (palette lookup).
export function asset(id, env = null) {
  let b = BUILT.get(id); if (b) return b;
  const e = ENTRIES.get(id); if (!e) return null;
  if (!e.build) return null; b = e.build(e, env); if (!b) return null;
  if (b.w !== e.w || b.h !== e.h) throw new Error(`asset ${id} built at ${b.w}×${b.h}, registered at ${e.w}×${e.h}`);
  BUILT.set(id, b); return b;
}
export const dropAsset = (id) => { BUILT.delete(id); ENTRIES.delete(id); };
// The manifest as data: every entry without its builder.
export const manifest = () => [...ENTRIES.values()].map(({ build, ...rest }) => rest);
// Every entry that is not final: a built stand-in (placeholder), or a placed master the studio's record does not call signed (held, new, placeholder). Only `master` and `empty` are not in this register.
export const NOT_FINAL = ["placeholder", "held", "new"];
export const placeholders = () => manifest().filter((e) => NOT_FINAL.includes(e.status));
