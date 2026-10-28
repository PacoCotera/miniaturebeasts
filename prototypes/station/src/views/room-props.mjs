// The room the screens show, as props (the rooms design): the pictures of the shown room's painting, near view, bed and pieces for a light, named from rooms.json (the host registers it with setRooms, as it does
// the moving sets). Pure. Props name *what*: `regions.room = { id, base, pieces: { <pieceId>: <picture id> } }`, the ids with the light filled in; the face places the pieces from the same file (screens/room.c).
import * as S from "../state.mjs";
import { slot as slotOf } from "./requests.mjs";

let ROOMS = null;
export const setRooms = (json) => { ROOMS = json || null; };
export const roomsSpec = () => ROOMS;
const spec = () => { if (!ROOMS) throw new Error("rooms.json is not loaded (setRooms)"); return ROOMS; };
export const roomName = (i) => { const R = spec(); return R.order[i] ?? R.order[0]; };
export const roomData = (i) => spec().rooms[roomName(i)];
export const withLight = (tpl, light) => tpl.replaceAll("{light}", light);
const sizeOf = (id) => id.match(/-(\d+)x(\d+)$/).slice(1).map(Number);

// The room shown: the one the whole last showed (st.face.room), except that a mibi being met shows its own (UX 1e; the host reads it in the props, no screen keeps its own).
export const shownRoom = (st, meetId = null) => { const mb = meetId != null ? S.mibiById(st, meetId) : null; return mb && mb.room != null && !mb.released ? mb.room : st.face?.room ?? 0; };

// The ids a room has in a light: its painting, near view, bed (Roots only) and pieces that have a picture (a null picture is a keep-out alone).
export function roomIds(i, light) {
  const r = roomData(i), pieces = {};
  for (const p of r.pieces) if (p.picture) pieces[p.id] = withLight(p.picture, light);
  return { id: roomName(i), base: withLight(r.base, light), near: withLight(r.near, light), bed: r.bed ? withLight(r.bed.picture, light) : null, pieces };
}
// Every picture id the room puts on the face in a light (the host drops them when the light changes).
export const roomPictureIds = (i, light) => { const q = roomIds(i, light); return [q.base, q.near, ...(q.bed ? [q.bed] : []), ...Object.values(q.pieces)]; };

// The requests of the room's painting and pieces through `req`: a signed master at exactly its size takes its own id (kind slot, as the plates are). Returns regions.room.
export function roomRegion(req, i, light) {
  const q = roomIds(i, light), slot = slotOf(req, "the room's master (rooms.json)");
  slot(q.base, sizeOf(q.base)); const pieces = {};
  for (const [pid, id] of Object.entries(q.pieces)) pieces[pid] = slot(id, sizeOf(id));
  return { id: q.id, base: q.base, pieces };
}
// The room's near view of a light (544 × 408), requested through `req`: the id.
export function nearOf(req, i, light) { const id = roomIds(i, light).near; return slotOf(req, "the room's near master (rooms.json)")(id, sizeOf(id)); }
// The bed's picture of a light in the room, requested through `req`; null when the room has none (every room but Roots).
export function bedOf(req, i, light) { const id = roomIds(i, light).bed; return id ? slotOf(req, "the room's bed master (rooms.json)")(id, sizeOf(id)) : null; }
