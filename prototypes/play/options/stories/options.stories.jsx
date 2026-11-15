// The Options panel's parts as they are (parts.jsx and options.css), in every state. Use the width control for 390 (phone) and 1440 (laptop).
import { useEffect, useMemo } from "react";
import { Row, Toggle, Pick, Panel } from "../src/parts.jsx";

const noop = () => {};
const stack = { display: "flex", flexDirection: "column", gap: "var(--mb-space-24)", maxWidth: 520 };
const card = { background: "var(--mb-bar)", border: "1px solid var(--mb-hairline)", borderRadius: "var(--mb-radius-8)", padding: "var(--mb-space-16) var(--mb-space-24)" };
const label = { font: "500 12px/16px Inter, system-ui, sans-serif", color: "var(--mb-mist)", marginBottom: "var(--mb-space-8)" };
const Box = ({ title, children }) => <div><div style={label}>{title}</div><div style={card}>{children}</div></div>;

export const RowStates = () => (
  <div style={stack}>
    <Box title="Row: title, one line, control on the right"><Row label="Name list" line="Where new mibi names come from."><button type="button" className="op-btn">Choose</button></Row></Box>
    <Box title="Row: a long line wraps beside the control"><Row label="Developer tools" line="Shows the tools button, the Station's panel and the Companion's Observer."><button type="button" className="op-btn">Choose</button></Row></Box>
  </div>
);

export const SwitchStates = () => (
  <div style={stack}>
    <Box title="Switch: off"><Toggle label="Developer tools" line="Shows the tools button, the Station's panel and the Companion's Observer." on={false} set={noop} /></Box>
    <Box title="Switch: on"><Toggle label="Playtest waits" line="Short waits, so the whole loop fits in about an hour." on={true} set={noop} /></Box>
  </div>
);

const items = [["A", "Companion A"], ["B", "Companion B"]];
export const SelectStates = () => (
  <div style={stack}>
    <Box title="Select: a named value"><Pick label="Companion" line="Which Companion the page plays." value="A" set={noop} items={items} /></Box>
    <Box title="Select: the default value, named"><Pick label="Name list" line="Where new mibi names come from." value="" set={noop} items={[["", "The current list"], ["Tuliko", "Tuliko"]]} /></Box>
    <Box title="Select: the named empty value"><Pick label="One place everywhere" line="Every land cell of the Companion's map plays this hand-made place." value="" set={noop} items={[["", "The usual map"], ["x", "Meadow glade"]]} /></Box>
    <div>
      <div style={label}>Select: the open menu, third row highlighted</div>
      <div className="op-menu" style={{ maxWidth: 240 }}>
        <div className="op-item">Companion A</div>
        <div className="op-item">Companion B</div>
        <div className="op-item" data-highlighted="">The current list</div>
      </div>
    </div>
  </div>
);

export const ButtonStates = () => (
  <div style={{ ...stack, flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: "var(--mb-space-16)" }}>
    <button type="button" className="op-btn">Done</button>
    <button type="button" className="op-btn" disabled>Done</button>
    <button type="button" className="op-btn op-go">Start fresh</button>
    <button type="button" className="op-btn op-go" disabled>Start fresh</button>
  </div>
);

const api = {
  read: () => ({ playtest: true, dev: false, companion: "A", names: "", place: "" }),
  about: () => "Build 0.33.0 · 2026-11-14",
  names: ["Tuliko", "Hiljan"], places: [["meadow", "Meadow glade"]],
  onChange: noop, onClose: noop, onStartFresh: noop, notes: { newNote: noop },
};
export const OptionsDialog = () => {
  const a = useMemo(() => ({ ...api }), []);
  useEffect(() => { a.open(); }, [a]);
  return <Panel api={a} />;
};

// The confirm dialog's markup as the panel's Start fresh button opens it, laid in the flow (the live one is fixed over the page).
export const ConfirmDialog = () => (
  <div className="op-panel op-confirm" style={{ position: "static", transform: "none", width: "min(360px, 100%)" }}>
    <h2 className="op-title">Start fresh?</h2>
    <div className="op-line">This erases the save in this browser. It cannot be undone.</div>
    <div className="op-actions"><button type="button" className="op-btn">Cancel</button><button type="button" className="op-btn op-go">Start fresh</button></div>
  </div>
);
