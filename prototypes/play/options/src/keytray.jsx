// The play page's key trays and the Dock key: React + Radix (the one web kit), the geometry from src/keyplan.mjs (the shell snaps it to whole device pixels and hands it in).
// A drawn key presses exactly as the keyboard does (pointerdown = keydown, pointerup = keyup); drawn keys stay out of the tab order and are never disabled.
// Per key: a button with Radix AccessibleIcon (the glyph and its name); one role="group" per tray; on a laptop a Tooltip names the keyboard key. The Dock key is a Toggle (pressed = docked).
import { useRef } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { glyphShadow } from "../../src/dockglyph.mjs";   // the Dock glyph: one pixel map for away, lit and docked
import { AccessibleIcon, Toggle, Tooltip, VisuallyHidden } from "radix-ui";   // the umbrella package has no Primitive export: a key is a plain button carrying AccessibleIcon

const px = (v) => v + "px";
const ARROW = { left: "M3 8l7-5v10z", up: "M8 3l5 7H3z", down: "M8 13L3 6h10z", right: "M13 8L6 3v10z" };
const CALL = "M7 8a7 7 0 0 1 0 10M11.5 5a11 11 0 0 1 0 16M16 2.5a14.5 14.5 0 0 1 0 21";
const ARM_OF = ["up", "left", "right", "down"];

// the glyph of a key at its size (the D-pad's triangles 0.4a; Call's wave 0.46 of the key; ← and ✓ the signed cap icons at half the key; the room marks at whole pixels)
function Glyph({ def, w }) {
  if (def.kind === "arm") return <svg viewBox="0 0 16 16" style={{ "--g": px(Math.round(w * 0.4)) }}><path d={ARROW[def.id]} /></svg>;
  if (def.kind === "call") return <svg viewBox="0 0 26 26" style={{ "--g": px(Math.round(w * 0.46)) }}><path d={CALL} /><circle cx="4" cy="13" r="1.6" fill="var(--mb-white)" stroke="none" /></svg>;
  if (def.kind === "back") return <span className="cap b" style={{ "--g": px(Math.round(w / 2)) }} />;
  if (def.kind === "confirm") return <span className="cap c" style={{ "--g": px(Math.round(w / 2)) }} />;
  return <img src={def.mark} alt="" style={{ "--g": "var(--mark, 24px)" }} />;
}

function KeyButton({ def, box, held, extra }) {
  const [x, y, w, h] = box;
  return (
    <button type="button" tabIndex={-1} aria-label={def.name} className={"fk " + def.cls + (held ? " dn" : "")} data-id={def.id} style={{ left: px(x), top: px(y), width: px(w), height: px(h), pointerEvents: "none", ...extra }}>
      <AccessibleIcon.Root label={def.name}><Glyph def={def} w={w} /></AccessibleIcon.Root>
    </button>
  );
}

// a key and its touch area: the area is a transparent box round it (half the gap), and it takes the press
function Key({ def, plan, snap, held, press, tips }) {
  const box = snap(plan.keys[def.id]), zone = snap(plan.zones[def.id]), down = useRef(false);
  const up = (e) => { if (!down.current) return; down.current = false; press(def, false); };
  const el = (
    <div className={"fkz " + (def.kind === "room" ? "sq" : "rd")} data-zone={def.id} style={{ left: px(zone[0]), top: px(zone[1]), width: px(zone[2]), height: px(zone[3]), "--ox": px(box[0] - zone[0]), "--oy": px(box[1] - zone[1]), "--kw": px(box[2]), "--kh": px(box[3]) }}
      onPointerDown={(e) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* no capture */ } down.current = true; press(def, true); }}
      onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} onClick={(e) => e.preventDefault()}>
      <KeyButton def={def} box={[box[0] - zone[0], box[1] - zone[1], box[2], box[3]]} held={held} />
    </div>
  );
  if (!tips) return el;
  return (
    <Tooltip.Root><Tooltip.Trigger asChild>{el}</Tooltip.Trigger>
      <Tooltip.Portal><Tooltip.Content className="fk-tip" side="top" sideOffset={10}>{def.tip}<Tooltip.Arrow className="fk-tip-arrow" /></Tooltip.Content></Tooltip.Portal>
    </Tooltip.Root>
  );
}

// the D-pad: one touch zone split into four wedges; the newest direction wins (the physical pad's four switches), a dead centre presses nothing
function Pad({ defs, plan, snap, held, press, dirAt }) {
  const zone = snap(plan.padZone), cur = useRef(null);
  const set = (dir) => { if (dir === cur.current) return; if (cur.current) press(defs[cur.current], false); cur.current = dir; if (dir) press(defs[dir], true); };
  const at = (e) => { const r = e.currentTarget.getBoundingClientRect(); return dirAt(e.clientX - r.left, e.clientY - r.top, [0, 0, r.width, r.height], plan.a); };
  const end = () => set(null);
  return (
    <div className="fkpad" data-zone="pad" style={{ left: px(zone[0]), top: px(zone[1]), width: px(zone[2]), height: px(zone[3]) }}
      onPointerDown={(e) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* no capture */ } set(at(e)); }}
      onPointerMove={(e) => { if (e.buttons || e.pointerType === "touch") { if (cur.current !== null || e.currentTarget.hasPointerCapture?.(e.pointerId)) set(at(e)); } }}
      onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onClick={(e) => e.preventDefault()} />
  );
}

export function Tray({ cfg, st }) {
  const { plan, snap, held, tips } = st, defs = cfg.defs, byId = Object.fromEntries(defs.map((d) => [d.id, d]));
  const arms = ARM_OF.map((id) => byId[id]), others = defs.filter((d) => d.kind !== "arm");
  const a = plan.a, hub = snap([plan.hub[0], plan.hub[1], a, a]);
  const press = (def, on) => cfg.onKey(def, on);
  const body = (
    <div role="group" aria-label={cfg.label} className={"fktray " + (cfg.dev === "station" ? "st" : "co")} style={{ "--pk": px(snap([0, 0, a, a])[2]) }}>
      <div className="hub" style={{ left: px(hub[0]), top: px(hub[1]), width: px(hub[2]), height: px(hub[3]) }} />
      {arms.map((d) => <KeyButton key={d.id} def={d} box={snap(plan.keys[d.id])} held={!!held[d.id]} />)}
      <Pad defs={byId} plan={plan} snap={snap} held={held} press={press} dirAt={cfg.padDir} />
      {others.map((d) => <Key key={d.id} def={d} plan={plan} snap={snap} held={!!held[d.id]} press={press} tips={tips} />)}
    </div>
  );
  return tips ? <Tooltip.Provider delayDuration={500} skipDelayDuration={200}>{body}</Tooltip.Provider> : body;
}

// mountKeyTray(host, { dev, label, defs: [{ id, code, name, kind, cls, tip, mark }], onKey(def, down), padDir(x, y, zone, a) }) -> { update({ plan, snap, tips }) }
export function mountKeyTray(host, cfg) {
  const root = createRoot(host); let st = { plan: null, snap: (b) => b, tips: false, held: {} };
  const render = () => { if (st.plan) flushSync(() => root.render(<Tray cfg={view} st={st} />)); };
  const view = { ...cfg, onKey(def, on) { st = { ...st, held: { ...st.held, [def.id]: on } }; render(); cfg.onKey(def, on); } };
  return { update(next) { st = { ...st, ...next }; render(); } };
}

// the Dock key: a page button (the bar's button family), 44 tall; a Toggle (pressed = docked); its words by width: "full" the long words and the ⇧D hint, "short" one word, "mark" the mark alone (the full words stay for a screen reader)
export function Dock({ s, onPress }) {
  const mode = s.mode, glyph = s.docked ? "docked" : s.lit ? "lit" : "away", style = s.box ? { left: px(s.box[0]), top: px(s.box[1]), width: px(s.box[2]), height: px(s.box[3]) } : undefined;
  return (
    <Toggle.Root id="dockKey" className={"ctl" + (s.box ? "" : " hidden") + (s.docked ? " docked" : "") + (s.lit ? " lit" : "") + (s.quiet ? " quiet" : "") + (s.pressed ? " pressed" : "") + (mode === "mark" ? " markonly" : "")}
      pressed={!!s.docked} onPressedChange={() => onPress()} aria-label={s.label} title={s.title} aria-disabled={s.disabled ? "true" : "false"} aria-description={s.disabled ? s.title : undefined} style={style}>
      <span className="mark" id="dockMark" data-glyph={glyph} aria-hidden="true"><i style={{ boxShadow: glyphShadow({ state: glyph }, 1) }} /></span>
      {mode === "mark" ? <VisuallyHidden.Root id="dockWord">{s.full}</VisuallyHidden.Root> : <span className="word" id="dockWord">{mode === "full" ? s.full : s.short}</span>}
      {mode === "full" && s.hint ? <span className="hint" id="dockHint">⇧D</span> : null}
    </Toggle.Root>
  );
}
// mountDockKey(host, { onPress }) -> { update({ box, docked, lit, quiet, pressed, disabled, label, title, mode, full, short, hint }) }
export function mountDockKey(host, cfg) {
  const root = createRoot(host);
  return { update(s) { flushSync(() => root.render(<Dock s={s} onPress={cfg.onPress} />)); } };
}
