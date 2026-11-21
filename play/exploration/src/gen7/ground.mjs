// Generator 7, the biome ground (V2): one recipe per biome for the low ground of a place, blended across the borders between biomes. Pure: numbers and functions of a world tile.
// Each recipe reads the place's own fields (forest, rock, wet, scrub, the wood floor and channel noise) and says where each ground lies:
//   rockAdd     added to the rock field before it is compared with SAND_AT: scree lies where rock + rockAdd is above it (it meets water only as sand: scree within 2 tiles of water is sand)
//   scrubAt     the forest value above which scrub may lie, and scrubNoise the scrub noise above which it does; scrub lies up to thicketAt
//   thicketAt   the forest value above which the dense thicket lies
//   waterAt     the wet value above which water lies
//   litterAt    the wood floor (leaf litter) lies where forest + 0.35 * floor noise + the wood cell's bump is above this: low in Woods and Tallwood, high (0.75) elsewhere, where only a wood cell's middle has it
//   dry, turf   the share of the open ground that is dry grass (Thickets) or short turf (Hills): it lies where 0.5 + 0.5 * the dry noise is under dry (over 1 - turf), in patches about 9 tiles across
//   shore       sand shore round every body of water, in tiles at most (0: none; the Lakes and Highpools), thinned by noise to 1 .. shore
//   chan, mask  the Marsh's channels: water where the channel noise is within `chan` of 0 and the mask noise is above `mask` (0 chan: none), about 5 tiles wide before the 3 x 3 opening
// The grounds are the signed skins (leaf litter, dry grass, short turf, scree) and the set's grass, sand, scrub and thicket. Sedge (Marsh) and alpine turf (Highpools) are not signed: [art] slots
// that drop into the same recipe (the skins are separate sheets, and a pair with every neighbour is cut for each).
// The numbers are tile-scale looks, tuned with tools/gen7-ground-shares.mjs; the land labels and shares of the region stay as they are.
export const SAND_AT = 0.62;
export const BLEND = 6;   // a recipe is its biome's own up to BLEND tiles from the slot's edge and the mean of the two biomes on the edge; it blends over 2 x BLEND tiles
export const GROUND = {
  mixed:    { rockAdd: -0.05, scrubAt: 0.68, scrubNoise: 0.15, thicketAt: 0.8, waterAt: 0.7, litterAt: 0.75, shore: 0, chan: 0, mask: 0, dry: 0, turf: 0 },
  downs:    { rockAdd: -0.05, scrubAt: 0.2, scrubNoise: 0.32, thicketAt: 0.86, waterAt: 0.7, litterAt: 0.75, shore: 0, chan: 0, mask: 0, dry: 0, turf: 0.95 },
  woods:    { rockAdd: -0.05, scrubAt: 0.68, scrubNoise: 0.15, thicketAt: 0.8, waterAt: 0.7, litterAt: 0.25, shore: 0, chan: 0, mask: 0, dry: 0, turf: 0 },
  tallwood: { rockAdd: -0.05, scrubAt: 0.6, scrubNoise: 0.15, thicketAt: 0.73, waterAt: 0.7, litterAt: -0.7, shore: 0, chan: 0, mask: 0, dry: 0, turf: 0 },
  thickets: { rockAdd: 0.25, scrubAt: 0.3, scrubNoise: 0.3, thicketAt: 0.66, waterAt: 0.7, litterAt: 0.75, shore: 0, chan: 0, mask: 0, dry: 0.95, turf: 0 },
  marsh:    { rockAdd: -0.05, scrubAt: 0.68, scrubNoise: 0.3, thicketAt: 0.86, waterAt: 0.75, litterAt: 0.75, shore: 0, chan: 0.27, mask: -0.3, dry: 0, turf: 0 },
  meres:    { rockAdd: -0.05, scrubAt: 0.68, scrubNoise: 0.3, thicketAt: 0.86, waterAt: 0.7, litterAt: 0.75, shore: 3, chan: 0, mask: 0, dry: 0, turf: 0 },
  fells:    { rockAdd: 0.22, scrubAt: 0.68, scrubNoise: 0.3, thicketAt: 0.86, waterAt: 0.7, litterAt: 0.75, shore: 0, chan: 0, mask: 0, dry: 0, turf: 0 },
  tarns:    { rockAdd: -0.05, scrubAt: 0.68, scrubNoise: 0.3, thicketAt: 0.86, waterAt: 0.7, litterAt: 0.75, shore: 3, chan: 0, mask: 0, dry: 0, turf: 0 },
};
const KEYS = Object.keys(GROUND.mixed);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// The recipe at a world tile. `slotAt(sx, sy)` is the biome id of the slot (sx, sy); the slots are SW x SH tiles in an n x n atlas. A tile within BLEND tiles of a slot edge takes the weighted mean of the
// recipes of the slots on that side (weight 1/2 on the edge itself, falling to 0 at BLEND tiles from it), so a biome thins into the next over a few tiles and never changes on a cell edge.
// Cells are not slots: a slot is a region of several cells, and the ground does not change at a cell's own edge.
export function recipeAt(slotAt, n, SW, SH, gx, gy) {
  const cx = clamp(gx, 0, n * SW - 1), cy = clamp(gy, 0, n * SH - 1), sx = (cx / SW) | 0, sy = (cy / SH) | 0, fx = cx - sx * SW, fy = cy - sy * SH;
  const side = (f, len, s) => [s > 0 ? clamp(0.5 - (f + 0.5) / (2 * BLEND), 0, 0.5) : 0, s < n - 1 ? clamp(0.5 - (len - f - 0.5) / (2 * BLEND), 0, 0.5) : 0];
  const [wl, wr] = side(fx, SW, sx), [wu, wd] = side(fy, SH, sy);
  const own = GROUND[slotAt(sx, sy)];
  if (!wl && !wr && !wu && !wd) return own;
  const wx = [wl, 1 - wl - wr, wr], wy = [wu, 1 - wu - wd, wd], out = {};
  for (const k of KEYS) out[k] = 0;
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    const w = wx[i] * wy[j]; if (!w) continue;
    const r = GROUND[slotAt(sx + i - 1, sy + j - 1)];
    for (const k of KEYS) out[k] += w * r[k];
  }
  return out;
}
