// The play page's Options panel: Radix Dialog, Switch, Select and AlertDialog (the workbench's radix-ui), one short line under each control. The settings are options.mjs's; this file only shows and writes them.
// [copy] every string here is a placeholder for the copywriter.
import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AlertDialog, Dialog, Select, Switch } from "radix-ui";

const NONE = "__none";   // Radix Select has no empty value: the setting's own default is this
const toSel = (v) => (v === "" ? NONE : v), fromSel = (v) => (v === NONE ? "" : v);

function Row({ label, line, children }) {
  return (
    <div className="op-row">
      <div className="op-text"><div className="op-label">{label}</div><div className="op-line">{line}</div></div>
      {children}
    </div>
  );
}

function Toggle({ label, line, on, set }) {
  return <Row label={label} line={line}><Switch.Root className="op-switch" checked={on} onCheckedChange={set} aria-label={label}><Switch.Thumb className="op-thumb" /></Switch.Root></Row>;
}

function Pick({ label, line, value, set, items }) {
  return (
    <Row label={label} line={line}>
      <Select.Root value={toSel(value)} onValueChange={(v) => set(fromSel(v))}>
        <Select.Trigger className="op-select" aria-label={label}><Select.Value /><Select.Icon className="op-caret">▾</Select.Icon></Select.Trigger>
        <Select.Portal>
          <Select.Content className="op-menu" data-options="" position="popper" sideOffset={4}>
            <Select.Viewport>
              {items.map(([v, text]) => <Select.Item key={v} value={toSel(v)} className="op-item"><Select.ItemText>{text}</Select.ItemText></Select.Item>)}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </Row>
  );
}

function Panel({ api }) {
  const [open, setOpen] = useState(false), [o, setO] = useState(api.read()), changed = useRef(false), [ph, setPh] = useState(false), [dk, setDk] = useState({ docked: false, enabled: false, title: "" });
  api.open = () => { setO(api.read()); setPh(api.phone()); setDk(api.dock()); changed.current = false; setOpen(true); };
  const set = (key) => (v) => { setO((p) => ({ ...p, [key]: v })); api.onChange({ [key]: v }); if (key !== "dev") changed.current = true; };
  const close = (next) => { setOpen(next); if (!next) api.onClose(changed.current); };
  return (
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Overlay className="op-overlay" />
        <Dialog.Content className="op-panel" data-options="" aria-describedby={undefined}>
          <Dialog.Title className="op-title">Options</Dialog.Title>
          {ph && <div className="op-line op-lede">One device at a time: Station and Companion at the top switch.</div>}
          {ph && <Row label={dk.docked ? "Lift the Companion" : "Dock the Companion"} line={dk.title}>
            <button type="button" className="op-btn" id="optionsDock" disabled={!dk.enabled} onClick={() => { api.onDock(); close(false); }}>{dk.docked ? "Lift" : "Dock"}</button>
          </Row>}
          <Toggle label="Playtest waits" line="Short waits, so the whole loop fits in about an hour." on={o.playtest} set={set("playtest")} />
          <Toggle label="Developer tools" line="Shows the tools button, the Station's panel and the Companion's Observer." on={o.dev} set={set("dev")} />
          <Pick label="Companion" line="Which Companion the page plays." value={o.companion} set={set("companion")} items={[["A", "Companion A"], ["B", "Companion B"]]} />
          <Pick label="Name list" line="Where new mibi names come from." value={o.names} set={set("names")} items={[["", "The current list"], ...api.names.map((n) => [n, n])]} />
          <Pick label="One place everywhere" line="Every land cell of the Companion's map plays this hand-made place." value={o.place} set={set("place")} items={[["", "Off"], ...api.places]} />
          <Row label="Start fresh" line="Erases the save in this browser and starts again. The options stay.">
            <AlertDialog.Root>
              <AlertDialog.Trigger className="op-btn" id="optionsFresh">Start fresh</AlertDialog.Trigger>
              <AlertDialog.Portal>
                <AlertDialog.Overlay className="op-overlay op-over2" />
                <AlertDialog.Content className="op-panel op-confirm" data-options="">
                  <AlertDialog.Title className="op-title">Start fresh?</AlertDialog.Title>
                  <AlertDialog.Description className="op-line">This erases the save in this browser. It cannot be undone.</AlertDialog.Description>
                  <div className="op-actions">
                    <AlertDialog.Cancel className="op-btn">Cancel</AlertDialog.Cancel>
                    <AlertDialog.Action className="op-btn op-go" id="optionsFreshYes" onClick={() => api.onStartFresh()}>Start fresh</AlertDialog.Action>
                  </div>
                </AlertDialog.Content>
              </AlertDialog.Portal>
            </AlertDialog.Root>
          </Row>
          <div className="op-line">Changes apply when you press Done; the page reloads. Developer tools applies at once.</div>
          <div className="op-actions"><Dialog.Close className="op-btn" id="optionsDone">Done</Dialog.Close></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// mountOptions(root, { trigger, read, names, places, onChange(patch), onClose(changed), onStartFresh() }): the page's own bar button opens the panel.
export function mountOptions(root, cfg) {
  const api = { ...cfg, open: () => {} };
  createRoot(root).render(<Panel api={api} />);
  cfg.trigger.addEventListener("click", () => api.open());
}
