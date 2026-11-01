// The house pose solver, chunk 1 part (plan 2.2 steps 1, 5 and the head's carriage): body yaw, face yaw, head yaw on the body and roll, all inside
// the house bands, from one seed. Same seed, same pose: the pose is not inherited (plan 1.3), it is a hash of the genome digest.
// The stance and weight steps are chunk 2.
export function seedUnit(seed, key) { // a small string hash to [0, 1): deterministic, no node: imports
  let h = 2166136261 >>> 0; const s = `${seed}/${key}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  h ^= h >>> 15; h = Math.imul(h, 2246822507) >>> 0; h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0; h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const rangeOf = (house, id, plan) => house.rules.find((r) => r.id === id).plans[plan] ?? house.rules.find((r) => r.id === id).plans["*"];

export function solvePose(house, plan, { carriage = 0, seed = "pose", side = 1, pick = {}, faceYaw = null } = {}) {
  const [bl, bh] = rangeOf(house, "R6-body-yaw", plan), [fl, fh] = rangeOf(house, "R6-face-yaw", plan), [hl, hh] = rangeOf(house, "R6-head-yaw", plan), [rl, rh] = rangeOf(house, "R6-roll", plan);
  const u = (k) => pick[k] ?? seedUnit(seed, k);
  // the middle two thirds of each band: a seed never lands on an edge, so a clamp never has to move it
  const mid = (lo, hi, v) => lo + (hi - lo) * (1 / 6 + (2 / 3) * v);
  let body = mid(bl, bh, u("body-yaw")), face = faceYaw !== null ? Math.min(fh, Math.max(fl, faceYaw)) : mid(fl, fh, u("face-yaw")), head = body - face; // faceYaw: the far-eye clamp turns the face toward the viewer, inside the band
  const notes = [];
  if (head > hh) { body = Math.min(bh, face + hh); head = body - face; if (head > hh) { face = body - hh; head = hh; } notes.push("head yaw over its band: the body yaw moved"); }
  else if (head < hl) { body = Math.max(bl, face + hl); head = body - face; if (head < hl) { face = body - hl; head = hl; } notes.push("head yaw under its band: the body yaw moved"); }
  const roll = mid(rl, rh, u("roll")) * (u("roll-sign") < 0.5 ? 1 : 1);
  return { yawBody: body, yawFace: face, yawHead: head, roll, pitch: carriage, side, notes,
    // the camera's yaw (deg) and the head's yaw on the body (deg), for a creature that faces `side` (+1: the screen's left)
    cameraYaw: -side * body, headYawSigned: side * head, rollSigned: side * roll * (house.solver["roll-sign"] ?? 1) };
}
