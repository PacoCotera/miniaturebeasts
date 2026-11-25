// Riding's pictures (companion-riding-build-2): which cut of a signed master a home mibi is drawn from.
// The cuts are made by tools/companion-cut.py into prototypes/ui/assets/masters/cuts/ (228x234 for the large rider, 96x88 for the row) and named like their masters:
//   cut-<adult|juvenile>-<SNN>[-<tint>-<shade>][-lay-<marking>]-<228x234|96x88>.png
// The picker follows the Station's coatMaster order (stands.mjs): the coat with its marking, else the coat alone, else the kind's painted stand. It only chooses a name from the cuts that exist (index.json),
// so a kind with one painted stand gets that stand's cut, as the game draws it today. `coat` is the Station's coatOf(species, ownLooks(frame, mibi)): "<tint>-<shade>", "<tint>-<shade>+<lay picture>", or null.
export const CUT_DIR = "../ui/assets/masters/cuts/";
export const CUT_SIZE = { big: "228x234", row: "96x88" };

// the Station's kind id of a mibi: the one the Station wrote, else the game's species index (0 Loika, 1 Tuikis, 2 Untuva, ...) through `order` (regions.mjs KIND_INFO, in the game's order)
export const kindId = (m, order = null) => (m && m.species) || (m && Number.isInteger(m.sp) && order && order[m.sp] ? order[m.sp].id : null);

// the name of her cut among `have` (a Set of file names), or null when the kind has none
export function cutName(kind, stage, coat, size, have) {
  if (!kind || !have) return null;
  const st = stage === "juvenile" ? "juvenile" : "adult", px = CUT_SIZE[size] ?? size, [c, lay] = (coat || "").split("+");
  const f = (mid) => `cut-${st}-${kind}${mid ? "-" + mid : ""}-${px}.png`;
  const tries = [lay && c ? f(`${c}-${lay}`) : null, c ? f(c) : null, f("")];
  return tries.find((n) => n && have.has(n)) ?? null;
}
