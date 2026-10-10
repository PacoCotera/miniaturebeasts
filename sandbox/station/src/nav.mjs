// The Station's navigation, as plain data and pure functions (design/style-guide/station-screens.md "Keys and navigation"; the numbers are frame.json `navigation`).
// Nothing here draws or reads the live game: the screens ask it where ← goes and what it is called, what each room key opens, and where the pad moves the ring on Habitat, whose
// order is fixed (not the nearest thing).

// --- the tree -------------------------------------------------------------------------------------------------------------------
// A place is a screen or a state of one: home, pods.collection, pods.overview, pods.chapter, pods.compare, create, incubator, probe, library, book, habitat, cross.
// The live screen id for the Probe bench is "bench"; Idle is a state of the screen, not a place.
export const SCREEN_PLACE = { bench: "probe" };
export function placeOf({ screen, podsView, compare }) {
  if (screen === "pods") return compare ? "pods.compare" : "pods." + (podsView || "collection");
  return SCREEN_PLACE[screen] || screen;
}
export const parentOf = (nav, place) => nav.screens[place]?.parent ?? null;
// The word the way back carries (the parent's title), or null where there is none: Home has no way back. `podLabel` is the pod's label ("Loika"); a name wider than the
// way back's room reads "Back" (the caller measures; `fits` says whether it does).
export function backWord(nav, place, podLabel = "", fits = () => true) {
  const w = nav.screens[place]?.back; if (w == null) return null;
  if (w !== "{pod}") return w;
  return podLabel && fits(podLabel) ? podLabel : "Back";
}
// Up one level is the parent, never the history: after a jump the parent is still the parent in this tree.
export const upFrom = (nav, place) => parentOf(nav, place);

// --- the room keys -----------------------------------------------------------------------------------------------------------------
// Each opens the top of its room from anywhere, even from inside it. `leaving` lists the places whose unpaid choices a room key drops.
export const ROOM_KEYS = { home: "home", research: "pods.collection", library: "library", habitat: "habitat" };
export const DROPS_ON_ROOM_KEY = ["create", "cross"];
export const roomTop = (key) => ROOM_KEYS[key] || null;

// Home's pad is the face's: focus.graph in home.json (order, nearestIn, ahead), walked by the face's focus port; the vectors are in face/tests (focus.json).

// --- Habitat's pad: a fixed order -----------------------------------------------------------------------------------------------------
// Rows, top to bottom: the stage (the resident), the card's chapter plates four to a row, Cross (an adult only), the door and the gate, and the strip of residents.
// ◀▶ walk a row (the strip changes the resident); ◀ off the card's left edge goes back to the stage, ▶ on the stage goes to the card's first plate; ▲▼ go to the row above or
// below, keeping the column as near as it can; ▼ on the stage and ▼ below the gate go to the strip, ▲ on the strip goes to the gate row, so Cross is one ▲ from the door row.
export function habitatRows({ chapters = 0, adult = false, bays = [], shown = null } = {}) {
  const ch = Array.from({ length: chapters }, (_, i) => "ch" + i), rows = [["stage"]];
  for (let i = 0; i < ch.length; i += 4) rows.push(ch.slice(i, i + 4));
  if (adult) rows.push(["cross"]);
  rows.push(["door", "wild"]);
  if (bays.length) rows.push(bays.map((b) => "s" + b));
  return rows;
}
export function habitatMove(rows, cur, dir, shown = null) {
  const at = rows.findIndex((r) => r.includes(cur)); if (at < 0) return cur;
  const row = rows[at], col = row.indexOf(cur), last = rows.length - 1;
  const stripRow = last > 0 && rows[last][0][0] === "s" ? last : -1, card = [];   // the strip's ids are "s<mibi id>"; no card id starts with "s" (stage is row 0)
  for (let i = 1; i < rows.length; i++) if (i !== stripRow) card.push(i);
  if (cur === "stage") {
    if (dir === "right") return card.length ? rows[card[0]][0] : cur;
    if (dir === "down") return stripRow >= 0 ? (rows[stripRow].find((id) => id === "s" + shown) ?? rows[stripRow][0]) : cur;
    return cur;
  }
  if (at === stripRow) {
    if (dir === "left") return rows[at][Math.max(0, col - 1)];
    if (dir === "right") return rows[at][Math.min(row.length - 1, col + 1)];
    if (dir === "up") { const r = rows[card[card.length - 1]]; return r ? r[Math.min(col, r.length - 1)] : cur; }
    return cur;
  }
  const ci = card.indexOf(at);
  if (dir === "left") return col > 0 ? row[col - 1] : "stage";
  if (dir === "right") return row[Math.min(row.length - 1, col + 1)];
  if (dir === "up") { if (ci <= 0) return cur; const r = rows[card[ci - 1]]; return r[Math.min(col, r.length - 1)]; }
  if (dir === "down") {
    if (ci < card.length - 1) { const r = rows[card[ci + 1]]; return r[Math.min(col, r.length - 1)]; }
    return stripRow >= 0 ? (rows[stripRow].find((id) => id === "s" + shown) ?? rows[stripRow][0]) : cur;
  }
  return cur;
}
