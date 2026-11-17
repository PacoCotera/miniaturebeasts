// The master pictures the stories show, as bundled URLs (a relative path string only works on the dev server; the static build and the shooting script need real files).
const all = import.meta.glob("../../../ui/assets/masters/{shell,pods}/*.png", { eager: true, query: "?url", import: "default" });
export const asset = (rel) => {
  const u = all["../../../ui/assets/masters/" + rel];
  if (!u) throw new Error("no master picture " + rel);
  return u;
};
