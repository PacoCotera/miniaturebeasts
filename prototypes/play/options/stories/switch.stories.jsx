// The device switch (switch.jsx, Radix Tabs): two equal halves, Companion then Station; the Station asleep; the amber news dot on the device out of view. The page CSS (play/index.html) styles it; here the same rules.
import { useState } from "react";
import { Tabs, VisuallyHidden } from "radix-ui";
import { NEWS_WORDS } from "../src/switch.jsx";

const css = `.swlist{display:flex; width:320px; height:44px; background:var(--mb-ground); box-shadow:inset 0 0 0 1px var(--mb-hairline); border-radius:var(--mb-radius-8); overflow:hidden}
.swtab{flex:1 1 0; min-width:0; height:100%; display:flex; align-items:center; justify-content:center; gap:var(--mb-space-8); background:none; border:0; color:var(--mb-mist); font:500 14px/1 Inter,system-ui,sans-serif; white-space:nowrap}
.swtab[data-state="active"]{background:var(--mb-panel); color:var(--mb-bone)} .swdot{flex:none; width:8px; height:8px; border-radius:50%; background:var(--mb-amber)}`;
const Row = ({ title, value, asleep, news }) => {
  const [v, setV] = useState(value);
  return (<div><div style={{ font: "500 12px/16px Inter, system-ui, sans-serif", color: "var(--mb-mist)", margin: "var(--mb-space-16) 0 var(--mb-space-8)" }}>{title}</div>
    <Tabs.Root value={v} onValueChange={setV}><Tabs.List className="swlist" aria-label="Device">
      {["companion", "station"].map((d) => (<Tabs.Trigger key={d} value={d} className="swtab"><span>{d === "station" ? (asleep ? "Station · asleep" : "Station") : "Companion"}</span>{news && news[d] && v !== d ? <><span className="swdot" aria-hidden="true" /><VisuallyHidden.Root>{NEWS_WORDS}</VisuallyHidden.Root></> : null}</Tabs.Trigger>))}
    </Tabs.List></Tabs.Root></div>);
};
export const Switch = () => (<div><style>{css}</style>
  <Row title="The Companion in view" value="companion" /><Row title="Station asleep (until the first pod is home)" value="companion" asleep />
  <Row title="The Station woke while the Companion is in view: the dot" value="companion" news={{ station: true }} /><Row title="The Station in view" value="station" />
</div>);
