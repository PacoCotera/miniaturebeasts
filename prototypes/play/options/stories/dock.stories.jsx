// The dock's screen (docksheet.jsx): the cradle lamps (off, mint, amber), the e-paper card in its button, and the sheet on a phone and on a laptop. The Caddy's faces are the real ones (caddy/face.mjs); the page's own rules come from play/index.html.
// Shoot at 390 (phone) and 1440 (laptop): the sheet is fixed to the window, so these stories are shot with the window at that width (tools/shoot-gallery.mjs).
import { useEffect, useRef } from "react";
import { mountDockScreen } from "../src/docksheet.jsx";
import { faceOf, rasterFace, lampAt, LAMPS, STATION_LAMPS, W, H } from "../../../caddy/face.mjs";
import { pageCss, DOCK_PREFIXES } from "./page-css.js";

const T0 = Date.parse("2026-10-30T14:05:00Z");
import { asset } from "./assets.js";
const label = { font: "500 12px/16px Inter, system-ui, sans-serif", color: "var(--mb-mist)", margin: "var(--mb-space-16) 0 var(--mb-space-8)" };

// the 8 px amber lamp as the shell makes it: the mint master's light in amber (shell.mjs LAMP_SRC)
let amber = null;
function amberSrc(done) {
  if (amber) return done(amber);
  const im = new Image();
  im.onload = () => {
    const c = document.createElement("canvas"); c.width = c.height = 8; const x = c.getContext("2d"); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, 8, 8);
    for (let i = 0; i < 256; i += 4) { const k = Math.max(d.data[i], d.data[i + 1], d.data[i + 2]) / 255; d.data[i] = Math.round(0xff * k); d.data[i + 1] = Math.round(0xa8 * k); d.data[i + 2] = Math.round(0x3f * k); }
    x.putImageData(d, 0, 0); amber = c.toDataURL(); done(amber);
  };
  im.src = asset("pods/frame-lamp-8-mint.png");
}
const lampView = (colour, amberUrl) => ({ src: colour === "amber" ? amberUrl : colour ? asset("pods/frame-lamp-8-mint.png") : asset("pods/frame-lamp-8-stone.png"), colour: colour || "off" });

// the faces: the dock's states the e-paper shows
const who = { name: "Companion A" };
const cr = (state) => ({ companion: { state, seats: 1, at: T0 }, station: { state: "seated" } });
const st = (o = {}) => ({ at: T0, partner: "Moss", along: null, opened: null, crates: 2, ledger: { e: 41, d: 18, s: 7 }, ...o });
const FACES = {
  out: () => faceOf({ tz: 0, bootAt: T0, who, now: T0 + 1000, cradles: cr("lifted"), station: st({ crates: 0 }) }),
  home: () => faceOf({ tz: 0, bootAt: T0, who, now: T0 + 40000, cradles: cr("seated"), hold: { seat: 1, crates: 2, left: 0 }, station: st() }),
  fault: () => faceOf({ tz: 0, bootAt: T0, who, now: T0 + 1000, cradles: cr("seated"), fault: true }),
};
function paper(face) {
  const px = rasterFace(face), c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d"), img = g.createImageData(W, H);
  for (let i = 0; i < px.length; i++) { const o = i * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = px[i]; img.data[o + 3] = 255; }
  g.putImageData(img, 0, 0); return c;
}

// one mounted dock screen (the page's own component): the button, and the sheet when open
function Dock({ face, laptop, open, sheetW = 358, hand, box = [0, 0, 112, 44] }) {
  const host = useRef(null);
  useEffect(() => {
    let ctl, dead = false;
    amberSrc((a) => {
      if (dead) return;
      const f = FACES[face](), C = lampAt(f.lamp.companion, 0), S = lampAt(f.lamp.station, 0, STATION_LAMPS);
      ctl = mountDockScreen(host.current, {});
      ctl.update({ box, hand: !!hand || f.lamp.companion === "hand", laptop, sheetW, lampC: lampView(C.colour, a), lampS: lampView(S.colour, a) });
      ctl.paint(paper(f));
      if (open) ctl.open();
    });
    return () => { dead = true; if (ctl) ctl.close(); };
  }, [face, laptop, open, sheetW, hand]);
  return <div ref={host} style={{ position: "relative", width: 112, height: 44 }} />;
}
const Css = () => <style>{pageCss(DOCK_PREFIXES)}</style>;

// the lamps beside their words, off / mint / amber (what the sheet shows beside "Companion cradle")
export const Lamps = () => {
  const ref = useRef(null);
  useEffect(() => { amberSrc((a) => { for (const im of ref.current.querySelectorAll("img[data-amber]")) im.src = a; }); }, []);
  const one = (title, colour) => (<div key={title}><div style={label}>{title}</div>
    <span className="ds-lamp"><img className="dslamp" alt="" width={8} height={8} data-lamp={colour || "off"} data-amber={colour === "amber" ? "" : undefined} src={colour === "amber" ? undefined : lampView(colour).src} />Companion cradle</span></div>);
  return (<div ref={ref}><Css />{one("Off (the stone lamp)", null)}{one("Mint: seated, all well", "mint")}{one("Amber: needs a hand", "amber")}
    <div style={label}>The Station's cradle lamp uses the same pictures: stone when off, mint when seated.</div></div>);
};

// the e-paper card in its button (92 × 33 live picture), by the face it shows; the amber dot when the Companion needs a hand
export const EpaperButton = () => (<div><Css />
  <div style={label}>Out: the Companion is out on the map</div><Dock face="out" />
  <div style={label}>Home: two crates taken aboard</div><Dock face="home" />
  <div style={label}>Fault: amber dot on the button</div><Dock face="fault" hand />
</div>);

// the sheet: a bottom sheet with a scrim on a phone, centred on a laptop
export const SheetPhone = () => (<div><Css /><Dock face="home" open sheetW={358} /></div>);
export const SheetPhoneFault = () => (<div><Css /><Dock face="fault" open hand sheetW={358} /></div>);
export const SheetLaptop = () => (<div><Css /><Dock face="out" open laptop sheetW={464} /></div>);
