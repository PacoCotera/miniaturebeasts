// The heart of a place (walk slice W§2, W§3): one thing worth finding in every place, with a tell that shows through the veil.
// Pure: no page state, no drawing. "Heart" is a design word; no player string says it (canon check, editorial 2026-11-07).
// Kinds built on generator 5 places: nest (a pod's tell is a slow beat), spring (a one-cell spring in the grass), stone (a struck stone).
// The moment kind (a creature at its act) waits for the composed places (C14). Every player string is in HEART_TEXT.
import { T_BLOCK, L, DIRS, DECOR, hash } from "./world.mjs";

export const HEART_FOUND_R = 4;    // [tune] found = unveiled and within 4 tiles
export const TELL_R = 6;           // [tune] a tell shows through the veil within 6 tiles
export const ANSWER_ACTIONS = 3;   // a Call makes the tells inside its ring answer for 3 actions
export const SPRING_ESSENCE = 3;   // [tune] the spring pays once, nothing refills (canon check)
export const CALL_R_PLACE = 7;     // [tune] a Call's round in a place; 4 in a fog bank, 6 with a glowing partner
export const CALL_R_FOG_PLACE = 4, CALL_R_FOG_GLOW = 6;
// The map's fog over places (scheme: map-fog-tells): night dots out of 16 on a cell you have never been into, and on one you have been into but not found. A found place is clear. [tune]
// Chosen at 1x on a lime meadow cell and a dark wood cell (6/3 greyed the land; 3/1 left not-been and been 11 luma apart on lime): 4/1 keeps lime olive-green and the three states about 22 luma apart.
export const FOG_NOT_BEEN = 0, FOG_BEEN = 2;   // night-dot levels of 16: never been into is drawn one step darker (the dark table) with no dots; been in, light dots [tune]
export const TELL_RANK = ['t', 'b', 'k', 'sh'];   // a map tell's kinds, rarest first: paw, beat, bolt, shimmer (the tie-break of the band's line)

// The kinds a place type draws from, in order of preference: the first one with something to anchor to.
export const KIND_BY_LAND = { [L.MEADOW]: ["spring"], [L.POND]: ["nest", "spring"], [L.ROCK]: ["stone", "nest", "spring"], [L.WOOD]: ["nest", "stone", "spring"] };

// Every player string of the heart, so the copywriter and editorial can change words without code.
export const HEART_TEXT = {
  // the Call's report leads with the heart and its direction (not found); `dir` is "north-east" etc.
  call: { spring: dir => "Water glints in the grass, " + dir, nest: dir => "A slow beat, " + dir, stone: dir => "A struck stone still holds its charge, " + dir, quiet: dir => "A quiet stone, " + dir, moment: dir => "Something moves, " + dir },
  here: { spring: "Water glints right here", nest: "A slow beat right here", stone: "A struck stone still holds its charge here" },   // the heart is at your feet
  farther: "Nothing answers here · walk on", hereWord: "right here",
  found: "found", foundAnswer: "Water wets the grass here", left: "nothing left to take", leftN: n => n + " to take", unknown: "something here to find",
  // the tell in words for the bottom line (before the heart is found), seen or called
  tell: { spring: "water glints in the grass", nest: "a slow beat", stone: "a struck stone", moment: "something moves" },
  // found message on the line: what the heart was
  foundMsg: { spring: "Clear water rises in the grass", nest: "A pod lies here, waiting", stone: "A struck stone holds its charge" },
  // a moment's found line is the template's own reveal line (canon-checked); a template with no species of its own (Windstep) draws one from the region
  momentAny: name => "A " + name + " settles in the grass",   // [copy]
  // a heart that needs a partner to reach: the partner's own verb (placeholders until the book gives them)
  reach: { tuikis: "A Tuikis could dig to it", tuliko: "A Tuliko could wade to it", rupar: "A Rupar could clear the bank to it", untuva: "An Untuva could nose it out", loika: "A Loika could calm the way to it" },
  // the reach and the world in words: how many places have their heart found
  // the map's band (W§7): the place you stand in, then the nearest tell with its way
  band: {
    unfound: "not found yet", podWaits: n => n === 1 ? "1 pod waits there" : n + " pods wait there",
    tell: { sh: "Water glints", b: "A slow beat", k: "A struck stone", t: "Tracks" },   // the map's signs: shimmer, beat, bolt, paw
    tellFull: (t, land, dir) => t + " in the " + land + ", " + dir, tellShort: (t, dir) => t + ", " + dir,
  },
  reachLine: (n, total, tail) => "Found " + n + " of " + total + (tail || " in reach"), worldLine: (n, all) => "Found " + n + " of " + all + " places",
  spring: { drink: n => "+" + n + " Essence · the water is cool", full: "Essence full · the spring waits" },
};

// pickHeart(lay, seed, anchors): the most enclosed walkable tile, reachable from the entry, for the place's heart.
// anchors: { pods: [{x,y}], stones: [{x,y}] } the finds that can be the heart itself (a nest is a pod, a stone is a stone).
// Returns { x, y, kind, reachBy: null, path: [{x,y}...] (entry to heart), clues: [{x,y}...] (points along the last stretch) }.
const I = (w, x, y) => y * w + x;   // a tile's index in a place w tiles wide
// walking distance from the entry through the reachable ground, with the way back (par)
function walkField(lay) {
  const { w, h } = lay, solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) solid[i] = T_BLOCK[lay.tiles[i]] ? 1 : 0;
  for (const f of lay.feats) if (!DECOR.includes(f.kind)) solid[I(w, f.x, f.y)] = 1;
  const dist = new Int16Array(w * h).fill(-1), par = new Int32Array(w * h).fill(-1), q = [I(w, lay.spawnPt.x, lay.spawnPt.y)];
  dist[q[0]] = 0;
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of Object.values(DIRS)) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= lay.h) continue; const j = I(w, X, Y);
      if (dist[j] < 0 && lay.reach[j] && !solid[j]) { dist[j] = dist[i] + 1; par[j] = i; q.push(j); } } }
  return { solid, dist, par };
}
// the nearest walkable tile to a tile that may itself be solid (a stone)
function walkNear(F, lay, x, y) { let best = -1; for (const [dx, dy] of [[0, 0], ...Object.values(DIRS)]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= lay.w || Y >= lay.h) continue; const j = I(lay.w, X, Y); if (F.dist[j] >= 0 && (best < 0 || F.dist[j] < F.dist[best])) best = j; } return best; }
// The path from the entry to a heart's walkable tile, and clue points (every third tile) on its last stretch.
export function heartPath(lay, x, y) {
  const F = walkField(lay), w = walkNear(F, lay, x, y), path = [];
  if (w < 0) return { path, clues: [] };
  for (let i = w; i >= 0; i = F.par[i]) path.push({ x: i % lay.w, y: (i / lay.w) | 0 }); path.reverse();
  const clues = []; for (let k = path.length - 3; k > 0 && clues.length < 4; k -= 3) clues.push(path[k]);
  return { path, clues: clues.reverse() };
}
export function pickHeart(lay, seed, anchors = {}) {
  const { w: lw, h: lh } = lay, F = walkField(lay), { solid, dist } = F;
  const enclosed = (x, y) => { let n = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= lw || Y >= lh || solid[I(lw, X, Y)]) n++; } return n; };
  const score = (x, y, tag) => { const w = walkNear(F, lay, x, y); if (w < 0) return null; const d = dist[w], ok = d >= 8 && d <= 24; return { x, y, w, d, s: (ok ? 1000 : 0) + enclosed(x, y) * 20 - Math.abs(d - 16) + (hash(seed, "heart", lay.cell, tag, x, y) % 10) }; };
  const best = list => list.map(a => score(a.x, a.y, "a")).filter(Boolean).sort((a, b) => b.s - a.s)[0] || null;
  const margin = (x, y) => x >= 2 && y >= 2 && x < lw - 2 && y < lh - 2;
  let pick = null, kind = null;
  for (const k of KIND_BY_LAND[lay.land] || ["spring"]) {
    if (k === "nest" && anchors.pods && anchors.pods.length) { pick = best(anchors.pods.filter(p => margin(p.x, p.y))); }
    else if (k === "stone" && anchors.stones && anchors.stones.length) { pick = best(anchors.stones.filter(p => margin(p.x, p.y))); }
    else if (k === "spring") { const open = []; for (let i = 0; i < lw * lh; i++) if (dist[i] >= 0 && margin(i % lw, (i / lw) | 0) && !lay.feats.some(f => f.x === i % lw && f.y === ((i / lw) | 0))) open.push({ x: i % lw, y: (i / lw) | 0 }); pick = best(open); }
    if (pick) { kind = k; break; }
  }
  if (!pick) return null;   // a place with no walkable ground (never a generator 5 place)
  return { x: pick.x, y: pick.y, kind, reachBy: null, ...heartPath(lay, pick.x, pick.y) };
}

// Is the heart found? Unveiled and within HEART_FOUND_R tiles of the explorer (walking sight).
export const heartSeen = (heart, P, unveiledAt) => !!heart && Math.max(Math.abs(heart.x - P.x), Math.abs(heart.y - P.y)) <= HEART_FOUND_R && unveiledAt(heart.x, heart.y);
// A tell shows through the veil within TELL_R tiles.
export const tellShows = (heart, P) => !!heart && Math.hypot(heart.x - P.x, heart.y - P.y) <= TELL_R + .5;
