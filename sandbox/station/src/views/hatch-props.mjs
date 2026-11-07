// The relit juvenile (T-20261016-222; build spec section 4.3): the new mibi's own juvenile stand (layered, from drawnLooks) at the incubator view's figure box (stand-sizes.json views.incubator), then made `height` tall and lit to the capsule's roof lamp
// (relight.mjs) with its feet 3 px into the moss, as one picture. interior: { id, at } the capsule's interior the moss blades come from, its top left on the screen; foot: where the feet stand on the screen. Returns { picture, size, anchor }.
import * as S from "../state.mjs";
import { mibiReq } from "./home-props.mjs";
import { podArea, bgOf } from "./capsule-props.mjs";
import { RECIPE } from "../relight.mjs";
export function relitJuvenile(req, st, mb, settings, { height, foot, light = "day", interior = null }) {
  const species = S.speciesOf(mb), src = mibiReq(req, st, mb, [304, 312], settings, light, "incubator"), area = podArea(height), id = `relit:${species ?? "-"}:${src}:${light}:${area.size.join("x")}:v${RECIPE}`;
  req({ kind: "relit", id, parts: [{ id: src }], figH: height, sink: 3, area: area.size, anchor: area.anchor, bg: interior && bgOf(interior, foot, area.anchor) });
  return { picture: id, size: area.size, anchor: area.anchor };
}
