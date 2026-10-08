// The asset manifest: every picture the scene names, registered at its pixel size with its policy and status
// (technical-architecture.md §5.2: { id, file, w, h, policy, status, until, hash }; §5.5: placed 1:1, a placeholder
// flagged until its master takes its id and size). A sprite's slot must equal its asset's size; the renderer refuses
// anything else and counts it. Pictures are built lazily by the registered builder (today: drawn placeholders).
const ENTRIES = new Map();
const BUILT = new Map();

// Register an asset (idempotent for an id already registered with the same size).
export function registerAsset({ id, w, h, policy = "stationChrome", status = "placeholder", until = null, file = null, hash = null, build }) {
  const have = ENTRIES.get(id);
  if (have) { if (have.w !== w || have.h !== h) throw new Error(`asset ${id} registered twice at different sizes: ${have.w}×${have.h} and ${w}×${h}`); return have; }
  const e = { id, w, h, policy, status, until, file, hash, build };
  ENTRIES.set(id, e); return e;
}
export const hasAsset = (id) => ENTRIES.has(id);
export const assetEntry = (id) => ENTRIES.get(id) ?? null;
// The built picture (anything with w, h and canvas()) or null when the id is unknown.
export function asset(id) {
  let b = BUILT.get(id); if (b) return b;
  const e = ENTRIES.get(id); if (!e) return null;
  b = e.build(e); if (!b) return null;
  if (b.w !== e.w || b.h !== e.h) throw new Error(`asset ${id} built at ${b.w}×${b.h}, registered at ${e.w}×${e.h}`);
  BUILT.set(id, b); return b;
}
export const dropAsset = (id) => { BUILT.delete(id); ENTRIES.delete(id); };
// The manifest as data: every entry without its builder.
export const manifest = () => [...ENTRIES.values()].map(({ build, ...rest }) => rest);
export const placeholders = () => manifest().filter((e) => e.status === "placeholder");
export const builtCount = () => BUILT.size;
