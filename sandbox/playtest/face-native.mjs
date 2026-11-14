// The native face (face/dist/face_pipe, built by face/build.sh native) behind two FIFOs, spoken to synchronously: the same transport the page uses (station/src/face-lvgl.mjs
// faceTransport) over a wire that writes one-byte commands to the face's request pipe and reads its replies (face/src/main_pipe.c lists them). No display: the framebuffer is read on request.
import { spawn, execFileSync } from "node:child_process";
import { openSync, readSync, writeSync, closeSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { faceTransport } from "../station/src/face-lvgl.mjs";

export const PIPE_BIN = process.env.FACE_PIPE || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../face/dist/face_pipe");

export function bootNative({ test = false, bin = PIPE_BIN } = {}) {
  if (!existsSync(bin)) throw new Error(`the native face is not built (${bin}): run prototypes/face/build.sh native`);
  const dir = mkdtempSync(path.join(tmpdir(), "mb-face-pipe-")), req = path.join(dir, "req"), rep = path.join(dir, "rep");
  execFileSync("mkfifo", [req, rep]);
  const child = spawn(bin, [req, rep], { stdio: ["ignore", "inherit", "inherit"] });
  const wfd = openSync(req, "w"), rfd = openSync(rep, "r");   // the face opens them in the same order: no deadlock
  let closed = false;
  const close = () => { if (closed) return; closed = true; try { writeSync(wfd, Buffer.from("Q")); } catch { /* gone */ } try { closeSync(wfd); closeSync(rfd); } catch { /* gone */ } child.kill(); rmSync(dir, { recursive: true, force: true }); };
  process.once("exit", close);
  const out = (bytes) => { let o = 0; while (o < bytes.length) o += writeSync(wfd, bytes, o, bytes.length - o); };
  const read = (n) => { const b = Buffer.alloc(n); let o = 0; while (o < n) { const k = readSync(rfd, b, o, n - o, null); if (k === 0) throw new Error("the native face closed its pipe"); o += k; } return b; };
  const cmd = (c, ...ints) => { const b = Buffer.alloc(1 + ints.length * 4); b.write(c, 0, "ascii"); ints.forEach((v, i) => b.writeUInt32LE(v >>> 0, 1 + i * 4)); out(b); };
  const u32 = () => read(4).readUInt32LE(0), i32 = () => read(4).readInt32LE(0);
  const int = (which) => { cmd("I", which); return i32(); };
  const str = () => { const n = u32(); return n === 0xffffffff ? null : read(n).toString("utf8"); };
  cmd("V"); const version = str();
  const W = int(0), H = int(1);
  const wire = {
    inCap: int(2), width: W, height: H, version,
    send: (b) => { cmd("S", b.length); out(b); return i32(); },
    poll: () => { cmd("P"); return str(); },
    pixels: (d, w, h) => { const bgra = Buffer.alloc(w * h * 4); for (let i = 0; i < w * h * 4; i += 4) { bgra[i] = d[i + 2]; bgra[i + 1] = d[i + 1]; bgra[i + 2] = d[i]; bgra[i + 3] = d[i + 3]; } cmd("X", w, h); out(bgra); return i32(); },
    frame: (ms) => { cmd("F", ms); i32(); }, key: (code) => { cmd("K", code); i32(); }, hash: () => { cmd("H"); return u32(); },
    objects: () => int(3), refused: () => int(4),
  };
  const f = faceTransport(wire, { test });
  return Object.assign(f, {
    native: true, close, loadMs: 0, display: () => null, present: () => {}, forceFull: () => {},
    // the framebuffer as RGBA bytes (opaque)
    rgba: () => { cmd("B"); const src = read(W * H * 4), o = new Uint8Array(W * H * 4); for (let i = 0; i < o.length; i += 4) { o[i] = src[i + 2]; o[i + 1] = src[i + 1]; o[i + 2] = src[i]; o[i + 3] = 255; } return o; },
    pass: (n) => { cmd("T", n); i32(); }, offPalette: () => int(9),
    stats: () => ({ frames: f.frames(), keys: int(5), props: int(6), events: int(7), dirty: int(8), pictures: f.pictures() }),
  });
}
