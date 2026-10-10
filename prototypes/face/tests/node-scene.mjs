// A test-only way to place primitives by hand (rect, text, sprite, nineSlice, clip, composed) on the face, through the exported M of the WebAssembly build. The page has no such path: it speaks only words.
// installScene(f) adds f.scene(nodes, env) and f.setBackground(rgb). env: { rgb(name), cap(px), picture(id) -> { w, h, data }, slice(id), tile(id) }.
// A sprite or nine-slice picture takes its layer from the node (layer "painted", else art): the helper tells the face so in the asset's `policy`.
const KIND = { rect: 1, text: 2, sprite: 3, nine: 4, clip: 5, composed: 6 }, LAYERS = { chrome: 0, art: 1, painted: 2, type: 3 };
import { policyOf } from "../../ui/asset-policy.mjs";
const enc = new TextEncoder();
// A test's picture function, given the policy the host's picture() gives a real picture (the page's family table; a stand-in id outside every family is art).
export const policyFor = (id, status = "placeholder") => { try { return policyOf(id, status); } catch { return "art"; } };
export const withPolicy = (fn) => (id) => { const p = fn(id); return p && { ...p, status: p.status ?? "placeholder", policy: p.policy ?? policyFor(id, p.status ?? "placeholder") }; };
const fnv = (str) => { let h = 2166136261; for (const b of enc.encode(str)) { h ^= b; h = Math.imul(h, 16777619); } return h >>> 0; };

export function installScene(f) {
  const M = f.M;
  const put = (p, cap, str, what) => { const b = enc.encode(str); if (b.length > cap) throw new Error(`${what} holds ${cap} bytes; ${b.length} given`); M.HEAPU8.set(b, p); M.HEAPU8[p + b.length] = 0; };
  const setText = (s) => put(M._face_text(), M._face_text_size() - 1, s, "the face's text buffer"), setOps = (s) => put(M._face_ops(), M._face_ops_size() - 1, s, "the face's ops buffer");
  const setRegion = (s) => { const b = enc.encode(String(s)).subarray(0, 47), p = M._face_region(); M.HEAPU8.set(b, p); M.HEAPU8[p + b.length] = 0; };
  const layerOf = (n) => LAYERS[n.layer] ?? (n.kind === "text" ? 3 : n.kind === "sprite" ? 1 : 0);
  f.setBackground = (rgb) => M._face_background(rgb);
  f.scene = (nodes, env) => {
    f.beginScene();
    const left = [], hex = (n) => { const [r, g, b] = env.rgb(n); return (r << 16) | (g << 8) | b; };
    const handle = (id, layer) => f.handleOf(id, (i) => { const p = env.picture(i); return p && { ...p, policy: layer === "painted" ? "painted" : "art", status: p.status ?? "placeholder" }; });
    M._face_scene_begin();
    const node = (id, kind, x, y, w, h, rgb, a, b, n) => { setRegion(n.region ?? n.id); M._face_node_tag(layerOf(n)); M._face_node(fnv(id), kind, x, y, w, h, rgb, a, b); };
    try {
      for (const n of nodes) {
        const [x, y, w, h] = n.rect;
        if (n.kind === "rect") node(n.id, KIND.rect, x, y, w, h, hex(n.colour), 0, 0, n);
        else if (n.kind === "text") { setText(n.text); node(n.id, KIND.text, x, y, w, h, hex(n.colour), n.px, env.cap(n.px), n); }
        else if (n.kind === "sprite") { const hd = handle(n.asset, n.layer); if (hd < 0) left.push(n); else node(n.id, KIND.sprite, x, y, w, h, 0, hd, 0, n); }
        else if (n.kind === "clip") {
          const kids = []; for (const c of n.children || []) { if (c.kind === "sprite") { const hd = handle(c.asset, c.layer); if (hd < 0) left.push(c); else kids.push([c, hd]); } else left.push(c); }
          node(n.id, KIND.clip, x, y, w, h, 0, kids.length, 0, n);
          for (const [c, hd] of kids) { const [cx, cy, cw, ch] = c.rect; node(c.id, KIND.sprite, cx, cy, cw, ch, 0, hd, 0, { ...c, region: n.region ?? n.id }); }
        } else if (n.kind === "composed") { setOps(JSON.stringify(n.ops)); node(n.id, KIND.composed, x, y, w, h, 0, 0, 0, n); }
        else if (n.kind === "nineSlice") {
          const hd = handle(n.asset, n.layer), sl = env.slice(n.asset);
          if (hd < 0 || !sl || sl.some((v) => v < 0 || v > 255)) left.push(n); else node(n.id, KIND.nine, x, y, w, h, ((sl[0] << 24) | (sl[1] << 16) | (sl[2] << 8) | sl[3]) >>> 0, hd, env.tile(n.asset), n);
        } else left.push(n);
      }
    } catch (e) { M._face_scene_end(); throw e; }
    M._face_scene_end(); return left;
  };
  return f;
}
