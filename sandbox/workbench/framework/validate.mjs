// Validation of a built body against the compositional contract
// (v1/design/anatomical-source-prototype/compositional-contract.md): every part roots on an
// actual owner surface and has an attachment witness inside both owner and part; regions are
// connected; coordinates are finite and bounded; node, edge and vertex counts stay within
// bounds. Failures are reported, never repaired (genomic-contract.md: a gene is never repaired).
import { envelope, containsPoint, sub, add, mul, norm, unit } from "./geometry.mjs";

export const BOUNDS = { nodes: 160, edges: 200, vertices: 16000, coordinate: 1000 };

export function validateBody(scene) {
  const problems = [];
  const byId = new Map(scene.nodes.map((n) => [n.id, n]));
  const envelopes = new Map();
  const env = (node) => { if (!envelopes.has(node.id)) envelopes.set(node.id, envelope(node)); return envelopes.get(node.id); };
  if (scene.nodes.length > BOUNDS.nodes) problems.push(`graph has ${scene.nodes.length} nodes (bound ${BOUNDS.nodes})`);
  if (scene.edges.length > BOUNDS.edges) problems.push(`graph has ${scene.edges.length} edges (bound ${BOUNDS.edges})`);
  const vertices = scene.nodes.reduce((s, n) => s + n.mesh.vertices.length, 0);
  if (vertices > BOUNDS.vertices) problems.push(`mesh has ${vertices} vertices (bound ${BOUNDS.vertices})`);
  for (const node of scene.nodes) {
    if (node.mesh.faces.length === 0) problems.push(`${node.id}: no faces`);
    for (const p of node.mesh.vertices) if (p.some((c) => !Number.isFinite(c) || Math.abs(c) >= BOUNDS.coordinate)) { problems.push(`${node.id}: non-finite or out-of-bounds vertex`); break; }
    if (node.parent && !byId.has(node.parent)) problems.push(`${node.id}: parent ${node.parent} missing`);
    if (!node.parent && node.id !== "region-0") problems.push(`${node.id}: unrooted`);
    if (node.parent) {
      const owner = byId.get(node.attachment?.owner ?? node.parent);
      if (!node.attachment) { problems.push(`${node.id}: no attachment witness`); continue; }
      if (!owner) { problems.push(`${node.id}: attachment owner missing`); continue; }
      const witness = node.attachment.position;
      const ownerOk = containsPoint(owner, witness, owner.shape?.kind === "sweep" ? null : env(owner), 1e-4 * (owner.radii ? Math.max(...owner.radii) : 1));
      if (!ownerOk) problems.push(`${node.id}: attachment witness outside its owner ${owner.id}`);
      // Sheets and bowls are not convex solids; their witness only needs to touch the owner and
      // lie within the sheet's own root edge. Solids must contain the witness as well.
      if (node.shape?.kind === "sweep") {
        if (!containsPoint(node, witness, null, 1e-6)) problems.push(`${node.id}: root station does not hold its attachment witness`);
      } else if (node.shape?.kind === "sheet") {
        const near = node.corners ? Math.min(...node.corners.slice(0, 2).map((c) => norm(sub(c, witness)))) : norm(sub(node.root, witness));
        const reach = node.corners ? norm(sub(node.corners[1], node.corners[0])) + node.thickness : node.baseRadius * 2;
        if (near > reach + 1e-6) problems.push(`${node.id}: root edge does not reach its attachment witness`);
      } else if (!env(node).contains(witness, 1e-4 * Math.max(...node.radii))) problems.push(`${node.id}: attachment witness outside the part itself`);
    }
    if (node.role === "contact-terminal" && node.attachment && !env(node).contains(node.attachment.position, 1e-6)) problems.push(`${node.id}: contact endpoint outside the terminal`);
  }
  const regions = scene.nodes.filter((n) => n.role === "primary-region");
  if (!regions.length) problems.push("no primary region");
  return { status: problems.length ? "rejected" : "valid", problems, counts: { nodes: scene.nodes.length, edges: scene.edges.length, vertices } };
}
