// The key trays and the Dock key as they are (keytray.jsx, ui/keys.css, src/keyplan.mjs), in their states: rest, held, focus; the Dock key by width and state. Use the width control for 390 and 1440.
import { Tray, Dock } from "../src/keytray.jsx";
import { plan, padDir, KEYBOARD } from "../../src/keyplan.mjs";

const noop = () => {};
const mark = (n) => "../../../ui/assets/masters/shell/shell-key-" + n + "-24.png";
const def = (id, code, name, kind, cls) => ({ id, code, name, kind, cls, tip: KEYBOARD[id], mark: kind === "room" ? mark(id === "research" ? "pods" : id) : undefined });
const defs = (st) => [
  def("left", "ArrowLeft", "Left", "arm", (st ? "pad" : "cpad") + " arm left"), def("up", "ArrowUp", "Up", "arm", (st ? "pad" : "cpad") + " arm up"), def("down", "ArrowDown", "Down", "arm", (st ? "pad" : "cpad") + " arm down"), def("right", "ArrowRight", "Right", "arm", (st ? "pad" : "cpad") + " arm right"),
  ...(st ? [def("home", "KeyH", "Home", "room", "room home"), def("research", "KeyR", "Pods", "room", "room research"), def("vivarium", "KeyB", "Vivarium", "room", "room vivarium"), def("library", "KeyL", "Library", "room", "room library")] : []),
  def("call", "KeyC", "Call", "call", "round call"), def("back", "Escape", "Back", "back", "round " + (st ? "back" : "cback")), def("confirm", "Enter", "Confirm", "confirm", "round confirm"),
];
const label = { font: "500 12px/16px Inter, system-ui, sans-serif", color: "var(--mb-mist)", margin: "var(--mb-space-16) 0 var(--mb-space-8)" };
const trayBox = (w, h) => ({ position: "relative", width: w, height: h, background: "var(--mb-panel)", boxShadow: "inset 0 0 0 1px var(--mb-hairline)", borderRadius: "0 0 12px 12px" });
const snap = (b) => b;

function TrayStory({ dev, layout, W, H, held = {}, tips = false, title }) {
  const st = dev === "station", pl = plan(dev, layout, W, H);
  return (
    <div><div style={label}>{title}</div>
      <div style={trayBox(W, pl.h)}><Tray cfg={{ dev, label: st ? "Station keys" : "Companion keys", defs: defs(st), padDir, onKey: noop }} st={{ plan: pl, snap, held, tips }} /></div>
    </div>
  );
}

export const LaptopRest = () => (<div><TrayStory dev="station" layout="laptop" W={1040} title="Station, laptop (a = 44): rest" /><TrayStory dev="companion" layout="laptop" W={466} title="Companion, laptop: rest" /></div>);
export const LaptopHeld = () => (<div><TrayStory dev="station" layout="laptop" W={1040} held={{ down: true, confirm: true, home: true }} title="Station: D-pad down, ✓ and Home held" /><TrayStory dev="companion" layout="laptop" W={466} held={{ up: true, call: true, back: true }} title="Companion: D-pad up, Call and ← held" /></div>);
export const LaptopHint = () => (<TrayStory dev="companion" layout="laptop" W={466} tips title="Companion: hover a key for its keyboard name" />);
export const PhoneUpright = () => (<div style={{ width: 378 }}><TrayStory dev="station" layout="portrait" W={378} H={0} title="Station, phone upright (a = 48)" /><TrayStory dev="companion" layout="portrait" W={378} H={0} title="Companion, phone upright" /></div>);
export const PhoneSideways = () => (<div style={{ width: 832 }}><TrayStory dev="station" layout="landscape" W={832} H={332} title="Station, phone sideways (a = 48): the D-pad and rooms at the left, the actions and the Dock key at the right" /></div>);

// focus: a script focuses a key (they stay out of the tab order): the two-tone ring on the dark tray
export const FocusRing = () => (
  <div><div style={label}>Focus: 2 px focus ring 4 px out, a 2 px void edge on both sides</div>
    <div style={trayBox(466, 156)} ref={(el) => { if (el) setTimeout(() => el.querySelector(".fk.confirm")?.focus({ focusVisible: true }), 0); }}>
      <Tray cfg={{ dev: "companion", label: "Companion keys", defs: defs(false), padDir, onKey: noop }} st={{ plan: plan("companion", "laptop", 466, 0), snap, held: {}, tips: false }} />
    </div>
  </div>
);

// the Dock key: a page button; its words by width
const bar = `.ctl{position:relative; background:var(--mb-ground); border:1px solid var(--mb-hairline); border-radius:6px; color:var(--mb-fog); padding:0; white-space:nowrap; overflow:hidden; font:500 14px/1 Inter,system-ui,sans-serif; display:flex; align-items:center; gap:8px; padding:0 12px; height:44px}
.ctl .mark{flex:none; width:16px; height:24px; image-rendering:pixelated} .ctl .word{flex:1 1 auto; min-width:0; white-space:nowrap} .ctl .hint{flex:none; color:var(--mb-mist); font-size:12px}
.ctl{text-align:left} .ctl.markonly{justify-content:center; padding:0} .ctl.quiet{color:var(--mb-mist)} .ctl.lit,.ctl.docked{background:var(--mb-amber); border-color:var(--mb-amber); color:var(--mb-void)} .ctl.lit .hint,.ctl.docked .hint{color:var(--mb-void)}
.ctl[aria-disabled="true"]{color:var(--mb-stone)}`;
const dockState = (o) => ({ box: null, docked: false, lit: false, quiet: true, pressed: false, disabled: false, label: "Dock the Companion", title: "Dock the Companion", mark: "../../../ui/assets/masters/pods/frame-companion-outline-16x24.png", mode: "full", full: "Dock · after the walk", short: "Dock", hint: true, ...o });
const DockAt = ({ w, o, title }) => (<div><div style={label}>{title}</div><div style={{ width: w }}><Dock s={dockState({ box: [0, 0, w, 44], ...o })} onPress={noop} /></div></div>);
export const DockByWidth = () => (
  <div><style>{bar}</style>
    <DockAt w={300} o={{}} title="196 or more: the full words and the ⇧D hint" /><DockAt w={148} o={{ mode: "short" }} title="96 to 195: one word" /><DockAt w={44} o={{ mode: "mark" }} title="Under 96: the mark alone (the words stay in the label)" />
  </div>
);
export const DockStates = () => (
  <div><style>{bar}</style>
    <DockAt w={300} o={{}} title="Quiet: before the walk" /><DockAt w={300} o={{ quiet: false, lit: true, full: "Dock the Companion" }} title="Lit: cargo waits aboard" />
    <DockAt w={300} o={{ quiet: false, docked: true, full: "Docked · Lift to go out", short: "Lift", mark: "../../../ui/assets/masters/pods/frame-companion-solid-16x24.png" }} title="Docked" /><DockAt w={300} o={{ disabled: true }} title="Disabled: no world yet (word and mark in stone)" />
  </div>
);
