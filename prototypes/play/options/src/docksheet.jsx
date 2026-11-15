// The dock's screen (ui-play-layout-2): a small live picture of the dock's e-paper in a button (92 × 33), and a Radix Dialog that shows it whole: a bottom sheet with a scrim on a phone, the same dialog centred on a laptop,
// with the two cradle lamps and their words, and Done. No visible caption: the e-paper's own lines say what it is; the dialog's title and the button's name are hidden text for a screen reader, in today's words "The dock's screen".
// The shell draws the e-paper into its own canvas as before (faceTick) and hands each picture here (paint); the miniature and the sheet copy it with drawImage.
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Dialog, VisuallyHidden } from "radix-ui";
import { lampShadow } from "../../src/lamp8.mjs";

const px = (v) => v + "px";
const NAME = "The dock's screen";   // today's words (the button's name and the dialog's title, hidden)
const EP_W = 808, EP_H = 288;

// a cradle lamp: the 8 × 8 pixel component (src/lamp8.mjs), shown at a whole 2× in token colours (stone off, mint docked, amber needs a hand); the breath dims it (opacity), the swell shows the highlight pixel
const LAMP_PX = 2;
function Lamp({ l }) { return <span className="dslamp" aria-hidden="true" data-lamp={l.colour || "off"} data-highlight={l.highlight ? "1" : undefined} style={{ opacity: l.opacity || undefined }}><i style={{ boxShadow: lampShadow({ state: l.colour || "off", highlight: !!l.highlight }, LAMP_PX) }} /></span>; }

function DockScreen({ api }) {
  const [open, setOpen] = useState(false), [s, setS] = useState(api.state), mini = useRef(null), big = useRef(null);
  api.setS = setS; api.openIt = (on = true) => setOpen(on);
  api.paintTo = (src) => { for (const cv of [mini.current, big.current]) if (cv && src) { const g = cv.getContext("2d"); g.imageSmoothingEnabled = true; g.drawImage(src, 0, 0, cv.width, cv.height); } };
  const box = s.box, style = box ? { left: px(box[0]), top: px(box[1]), width: px(box[2]), height: px(box[3]) } : undefined, laptop = s.laptop;
  const ew = Math.min(s.sheetW || 358, 464), eh = Math.round((ew * EP_H) / EP_W);
  return (
    <Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); api.onOpenChange && api.onOpenChange(v); }}>
      <Dialog.Trigger id="dockScreenBtn" className={"ctl" + (box ? "" : " hidden")} style={style} aria-label={NAME} title={NAME}>
        <canvas ref={mini} width={184} height={66} className="dsmini" />
        {s.hand ? <span className="swdot dsdot" aria-hidden="true" /> : null}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="ds-overlay" />
        <Dialog.Content className={"ds-sheet" + (laptop ? " ds-laptop" : "")} data-options="" aria-describedby={undefined} id="dockSheet">
          <VisuallyHidden.Root><Dialog.Title>{NAME}</Dialog.Title></VisuallyHidden.Root>
          <div className="ds-grab" aria-hidden="true" />
          <canvas ref={(el) => { big.current = el; if (el && api.last) api.paintTo(api.last); }} width={ew * 2} height={eh * 2} className="dsbig" style={{ width: px(ew), height: px(eh) }} />
          <div className="ds-lamps"><span className="ds-lamp"><Lamp l={s.lampC} />Companion cradle</span><span className="ds-lamp"><Lamp l={s.lampS} />Station cradle</span></div>
          <Dialog.Close className="op-btn ds-done" id="dockSheetDone">Done</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// mountDockScreen(host, { onOpenChange(open) }) -> { update({ box, hand, laptop, sheetW, lampC, lampS }), paint(canvas), open(), close(), get isOpen }
export function mountDockScreen(host, cfg) {
  const root = createRoot(host); let state = { box: null, hand: false, laptop: false, sheetW: 358, lampC: {}, lampS: {} }, last = null;
  const api = { state, onOpenChange: (v) => { open = v; if (v) setTimeout(() => api.paintTo && api.paintTo(last), 0); cfg.onOpenChange && cfg.onOpenChange(v); } };
  let open = false;
  flushSync(() => root.render(<DockScreen api={api} />));
  return {
    update(next) { state = { ...state, ...next }; api.state = state; if (api.setS) flushSync(() => api.setS(state)); else flushSync(() => root.render(<DockScreen api={api} />)); if (last) api.paintTo && api.paintTo(last); },
    paint(src) { last = src; api.last = src; api.paintTo && api.paintTo(src); },
    open() { api.openIt && api.openIt(true); }, close() { api.openIt && api.openIt(false); },
    get isOpen() { return open; },
  };
}
