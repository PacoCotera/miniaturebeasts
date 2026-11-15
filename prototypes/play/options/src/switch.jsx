// The device switch (ui-play-layout-2): two equal halves in the bar, "Companion" then "Station" in that fixed order, Radix Tabs (the one web kit). The half in view is `panel` with `bone` words, the other `mist`.
// News: an 8 px amber dot after the label of the device NOT in view (the Station waking, crates waiting, an arrival choice waiting); it clears when that device comes into view. Its spoken name is hidden text read after the device's name.
// The words are today's; the dot's spoken name is the copywriter's ("something new").
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Tabs, VisuallyHidden } from "radix-ui";

const px = (v) => v + "px";
export const NEWS_WORDS = ", something new";   // the dot's spoken name, read after the device's name ("Station, something new") (copywriter, cw-play-layout-1)

function Switch({ s, onPick }) {
  const box = s.box, style = box ? { left: px(box[0]), top: px(box[1]), width: px(box[2]), height: px(box[3]) } : undefined;
  const label = (dev) => (dev === "station" ? (s.asleep ? "Station · asleep" : "Station") : "Companion");
  return (
    <Tabs.Root value={s.value} onValueChange={(v) => onPick(v)} activationMode="automatic" className={"swtabs" + (box ? "" : " hidden")} style={style}>
      <Tabs.List className="swlist" aria-label="Device">
        {["companion", "station"].map((dev) => (
          <Tabs.Trigger key={dev} value={dev} id={dev === "station" ? "tabStation" : "tabCompanion"} className={"swtab" + (s.value === dev ? " on" : "")}>
            <span className="swword">{label(dev)}</span>
            {s.news && s.news[dev] && s.value !== dev ? <><span className="swdot" aria-hidden="true" /><VisuallyHidden.Root>{NEWS_WORDS}</VisuallyHidden.Root></> : null}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}

// mountSwitch(host, { onPick(dev) }) -> { update({ box, value, asleep, news: { companion, station } }) }
export function mountSwitch(host, cfg) {
  const root = createRoot(host);
  return { update(s) { flushSync(() => root.render(<Switch s={s} onPick={cfg.onPick} />)); } };
}
