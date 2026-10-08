// The placed masters (prototypes/ui/assets/masters/index.json, written by ui/tools/place-masters.mjs): each signed master replaces its
// stand-in by id and size, with no code change. Fetched beside the page, decoded to pictures, checked against the index (size and SHA-256)
// and placed in the manifest before any screen registers its stand-ins. A master that does not match its index is refused loudly.
import { placeMaster } from "../../ui/assets.mjs";

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
export async function loadMasters(base) {
  const res = await fetch(new URL("index.json", base), { cache: "no-store" });
  if (!res.ok) return { placed: 0 };
  const index = await res.json(), ids = Object.keys(index.masters ?? {});
  await Promise.all(ids.map(async (id) => {
    const e = index.masters[id], r = await fetch(new URL(e.file, base), { cache: "no-store" });
    if (!r.ok) throw new Error(`master ${id}: ${e.file} is missing`);
    const bytes = await r.arrayBuffer(), sha = hex(await crypto.subtle.digest("SHA-256", bytes));
    if (sha !== e.sha256) throw new Error(`master ${id}: ${e.file} does not match the index (sha256 ${sha.slice(0, 12)}…)`);
    const bmp = await createImageBitmap(new Blob([bytes], { type: "image/png" }), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
    let cv = null; const make = () => { cv = document.createElement("canvas"); cv.width = bmp.width; cv.height = bmp.height; cv.getContext("2d").drawImage(bmp, 0, 0); return cv; };
    placeMaster({ id, w: e.w, h: e.h, file: e.file, hash: e.sha256, signed: e.signed }, { w: bmp.width, h: bmp.height, canvas: () => cv || make() });
  }));
  return { placed: ids.length };
}
