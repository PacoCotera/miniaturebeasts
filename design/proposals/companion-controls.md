# Companion controls: four buttons

**Decided 2026-10-06:** Call's hint lives in the HUD; Call sits above Back as
drawn, pending the bench console; New world is offered only outside an
expedition. Back's label naming the menu's top entries is a working rule until
play confirms it.

**Proposal.** A control scheme for the Companion's pad, Confirm, Back and the new
Call button, building on [exploration round 2](exploration-round-2.md) §7 and
[interaction](../interaction.md). Lines marked **Decided** restate owner
decisions; everything else is a **Proposal**.

The goal: a new player, often a child, plays a whole expedition without being
told how, and never finds a control late. Today the mode list (Wait, Leave, New
world) sits behind Back, and nothing on screen says so. That is the defect to fix.

**Decided:** a fourth button, **Call**: pulse in a place, pin on the map
(1 Energy), call the riding mibi in Companion mode. A button doesn't make an
action free. Wait exists. The field clock counts actions; no timers. No touch
shortcuts.

## 1. What each button does

Three rules hold everywhere:
- **Confirm acts.** It does exactly what the bottom line names, and nothing else.
- **Back steps out one level.** In the field, one level out is the menu.
- **Call sends a signal.** Things answer it. It never opens or closes anything.

| Context | Pad | Confirm | Back | Call |
| --- | --- | --- | --- | --- |
| **Expedition choice** (and picking a start) | Move between choices / glints | Choose; "Start here" | Menu (on the start map: back to the choice) | Nothing; its slot is empty |
| **Map** | Tap: one cell. Hold: keep walking | Go down into the cell | Menu: **Wait**, **Send home**, Probe, Cargo, Companions | Pin this cell (1 Energy), or remove your own pin (free) |
| **Place** | Tap: creep one step. Hold: walk | Act on what you face ("Nothing here" spends nothing) | Menu: **Wait**, **Leave**, Send home, Probe, Cargo, Companions | Pulse (1 action); your partner comes and uses its ability |
| **Menu** | Move focus | Run the focused entry; after Wait the menu stays open, so Confirm again waits again | Close, back to the map or place | Nothing |
| **Cargo / Station screens** | Move focus | "Send home" (Cargo, in the field), "Incubate", "Next expedition" | Close, one level back | Nothing |
| **Companion mode** (at home with a mibi) | Move focus between mibis | "Bring Dot along" / "Leave Dot at home" | Menu | Call the riding mibi to the front; free |

**Where the hidden actions live, and how they are found:**
- **Wait**: first menu entry during an expedition.
- **Leave**: second in a place; walking off an edge also leaves.
- **Send home**: second on the map, third in a place; Cargo also offers it.
- **New world**: last entry, shown only between expeditions.

The player finds these in three ways, and none of them needs a tutor:
1. **Back always says where it goes.** The right end of the bottom line names
   what Back opens by its top two entries: "← Wait · Send home" on the map, "←
   Wait · Leave" in a place. The words Wait and Send home are in view from the
   first step on the map.
2. **The game points at the menu when it matters.** The few moments that need a
   menu entry say so once, in the message box that stays until the next action:
   - first pod: "Pods open at the Station · ← Send home when you're ready";
   - glowtail settling: "Keep still · ← Wait";
   - hold full: "Hold full · swap, or ← Send home";
   - nothing left: "Everything in reach is explored · ← Send home".
3. **First entry to the map** shows one message: "Walk with the pad · ✓ goes
   down · ← Wait and Send home".

**Not proposed:** a long-press on Back or Call (nothing on a button shows that
holding it does something else, so it is a hidden gesture, and children mash); a
permanent hint strip (a screen row the bottom line already covers); a legend.

## 2. Bottom line and HUD

Each button has a glyph copied from its engraving, in its own colour: Confirm ✓
orange, Back ← grey, Call ))) teal. The shape carries the meaning without colour.
As on the shell (§3), the two lower buttons are told on the bottom line, the
upper one in the top bar.

**Bottom line (34 px, about 78 characters).** It always reads in three parts:

```
✓ <what Confirm does>    <where you are · signs>    ← <what Back opens>
```

- **Confirm** comes first, at most 24 characters, as a verb phrase. If there is
  nothing to do it reads "Nothing here", dimmed.
- **Back** sits at the right end, at most 20 characters, and is never dropped:
  "← Wait · Send home", "← Wait · Leave", "← menu", "← close", "← back".
- **Context** fills the middle in mist colour and is the only part that shrinks.
  It drops its tail words first, as it does today.

```
✓ Go down          wood · slow beat           ← Wait · Send home
✓ Shake the bush   wood · storm               ← Wait · Leave
✓ Wait one action  action 14                  ← close
✓ Send home        ends the expedition        ← close
✓ Choose Weather                              ← menu
✓ Bring Dot along                             ← menu
```

**HUD (26 px).** The right end always holds the Call slot, beside the Energy
number, so a pin's cost reads next to what you have:

| Where | Call slot |
| --- | --- |
| Place | `))) call` |
| Map | `))) pin 1⚡` / `))) unpin` on your own pin. At 0 Energy it dims; a press says "Pins cost 1 Energy · you have 0" and spends nothing |
| Companion mode (top bar, right) | `))) call Dot` |
| Choice, menu, Cargo, Station | Empty: Call does nothing, and the screen doesn't pretend it does |

The HUD's left keeps shield bars, pod outlines and the partner.

## 3. Where Call sits on the shell

Call goes directly above Back, both to the left of a larger Confirm:
```
 .------------------------------------------------.
 |  [            screen 450 x 600              ]  |
 |                                                |
 |       [^]                       (( ))          |
 |    [<]   [>]     ::::::         CALL  .-----.  |
 |       [v]                       ( <- )|  OK |  |
 |                                 BACK  '-----'  |
 |                                       CONFIRM  |
 '------------------------------------------------'
```

**Why:** the right thumb rests on Confirm, the key it uses most. Call and Back
are each one short roll to the left: up to send a signal, down to step out. The
thumb pivots near the lower right corner, so both sit at the same reach.
Confirm stays largest. Back and Call are the same size, but Call is teal with a
raised ring texture, so the two are told apart by feel. Nothing sits below
Confirm, where the palm would press it while gripping.

## 4. First expedition: the first ten presses

Expedition 1, Weather, no partner, 0 Energy.
| # | Press | Screen shows afterwards |
| --- | --- | --- |
| – | (start) | Weather and Deep ground (dimmed, needs a digger). Line: "✓ Choose Weather   ← menu" |
| 1 | Confirm | Fogged map with glints. Line: "✓ Start here   meadow · slow beat   ← back" |
| 2 | Pad right | Next glint. Line: "✓ Start here   wood · tracks   ← back" |
| 3 | Confirm | Map, 3×3 revealed. Message: "Walk with the pad · ✓ goes down · ← Wait and Send home". Line: "✓ Go down   wood · tracks   ← Wait · Send home". HUD: `))) pin 1⚡` dimmed |
| 4 | Pad up | One cell north, fog lifts. Line: "✓ Go down   meadow · slow beat (often a pod)   ← Wait · Send home" |
| 5 | Confirm | The meadow place. Message: "))) Call sends a signal · things answer". Line: "✓ Nothing here   meadow   ← Wait · Leave". HUD: `))) call` |
| 6 | Call | A ring spreads. A buried pod glints and a hopper hides. Line unchanged |
| 7 | Pad right (held) | The Probe walks to the pod. Line: "✓ Dig up the pod   meadow   ← Wait · Leave" |
| 8 | Confirm | The pod fills an outline in the HUD. Message: "Pods open at the Station · ← Send home when you're ready" |
| 9 | Back | Menu over the place: Wait (focused), Leave this place, Send home, Probe, Cargo, Companions. Line: "✓ Wait one action   ← close" |
| 10 | Pad down | Focus on Leave this place, with Send home just below. Line: "✓ Leave this place   ← close". One more press down, then Confirm, opens the Cargo preview of what goes home |

By press 10 the player has used all four buttons. They have read the words Wait,
Leave and Send home on screen several times, and were never shown a rule they
couldn't see on the line or the HUD.

## Decisions for the owner

1. **Back's label:** name the menu's top two entries ("← Wait · Send home"), or a
   generic "← menu"?
2. **Call's hint:** in the HUD's top right, matching its upper position, or on
   the bottom line as a third item (leaving less room for place and signs)?
3. **Call's position:** above Back, left of Confirm, or below Confirm?
4. **New world:** only between expeditions, or kept in every menu as today?
