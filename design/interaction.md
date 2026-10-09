# Interaction

Players operate Miniature Beasts with physical controls and read the result on the
screen. The screen should make a sample, a finding or a mibi understandable before
any text explains it. The rules below keep play safe to explore and clear about
consequences.

## Each device's job

| Device | What the player does | What the screen must make clear |
| --- | --- | --- |
| Companion | Explore, carry finds, spend time with a travelling mibi | Where you are and what you can do; what you're carrying; which mibi this is |
| Station | Investigate samples, compare possibilities, create and manage mibis | The subject, what is known, what could be investigated next, what creating will do |
| Caddy | Glance at the collection, print records | Accepted facts or clearly dated ones; printing and connection state |

**Decided:** routine play happens on the devices with their depicted physical
controls. No touch or click shortcut replaces them, even on touch-capable screens.

## Controls

### Companion

**Decided:** four buttons.

| Button | Does |
| --- | --- |
| **Pad** | Moves. On the map a tap is one cell and a hold keeps walking; in a place a tap creeps one step and a hold walks; in menus it moves the focus |
| **✓ Confirm** (the largest) | Does exactly what the bottom line names: go down, take, shake, push, offer, light. Facing nothing in a place it **waits one action** ("✓ Wait"); the menu's Wait stays |
| **← key** | Engraved with the ← glyph only ("Back" stays its internal name). Opens the menu in the field and closes a screen elsewhere; the bottom line names what it opens on every screen |
| **))) Call** (teal, ring texture, no engraving) | Sends a signal and things answer: in a place a pulse that lifts the veil (1 action); on the map a pin (1 Energy); at home the mibi with you answers (free). It never opens or closes anything |

- **Shell layout:** Call directly above the ← key, both left of a larger Confirm
  (**Decided**, until the bench console says otherwise).
- **A button never makes an action free** (**Decided**).
- **One close per screen.** A read-only screen offers one way out, ← close;
  Confirm is only for a real action, so its part of the bottom line stays empty.
  Never two closes (**Decided**).

**The bottom line** (34 px) always has three parts, divided by 1 px muted
separators (**Decided**; sizes **Built**):

```
✓ Take the pod · ← Leave | rock field · surveyed 2/4 · 3 to take | ⚡⚡ ▶
```

1. **The actions:** ✓ and what Confirm does now, then ← and what the ← key opens,
   named by the menu's top entry: "← Leave" in a place ("← Climb out" in the
   cave), "← Send home" on the map, "← close" on screens. The actions are never
   dropped.
2. **Where you are:** the place and its survey, with what is left counted; the
   only part that shrinks, dropping its tail first, never the survey words.
3. **Conditions:** 1–3 storm bolts with ◀ or ▶ for the heading, and a fog patch
   with its drift when a fog bank is within two cells.

**The HUD** (26 px), left to right (**Decided**): the reach grid; Shield bars; pod
outlines, filled as pods are taken; the partner on a teal ring, named when there
is room; the three counters, Energy, Data and Essence, which count up with a
flash on every gain, even out of sight; the world-turn clock ("T7", from 1); and
a slot for battery and radio. Battery and radio are placeholders (**Built**).

**The menu** (← key), in this order (**Decided**):

| Where | Entries |
| --- | --- |
| In a place | Leave this place (Climb out in the cave), Send home, Wait, Probe, Cargo, Mibis |
| On the map | Send home (dimmed away from the start or a lit outpost, naming the nearest), Wait, Full map / Reach view, Probe, Cargo, Mibis |
| Between expeditions | Next expedition, Probe, Cargo, Mibis, then New world below a separator |
| Choosing an expedition | Mibis, Full map, then New world below a separator |

New world is offered only outside an expedition (**Decided**). After Wait the
menu stays open, so Confirm waits again (**Built**).

**The map views** (**Decided**). During an expedition the map shows the **reach
view**: the Probe's reach fills the view (78 px cells at tier 1, 48 px at tier 2,
**Built**) with a band below naming the way home, how much of the reach is
explored, and a whole-world inset. The **full map** is a menu entry; both views
are playable, and the choice is remembered (**Built**). Picking a start uses the
full map.

**Call's meaning** is taught by one-time lines the first time in a place and on
the map; the HUD has no Call slot and the shell has no CALL engraving (**Decided**).

**Open:** Call's final position, from the bench console; text sizes and line
lengths on the real display.

### Station and Caddy

**Built in v1, Working rule** for the current software profiles:

- **Station:**
  - a direction pad on the left;
  - Home, Research, Library and Vivarium keys in the middle, which switch views
    without spending or stopping anything;
  - Back and Confirm on the right.

  There is no knob. Parts of the v1 code still use an older Station set
  (Overview, Explore, Research, Incubator, Vivarium). The Station's key may be
  engraved ← to match the Companion (**Proposal**).
- **Caddy:** Previous, OK and Next beside the summary; Print beside the paper slot;
  a recessed Feed below Print. Print opens a preview first.

**Open:** final physical controls for all three devices; the Station's controls
and UI are the next design work.

## Rules

**Working rules** from the first prototype, all consistent with the decisions:

- **Looking is free.** Moving focus previews. Selecting keeps a reversible draft.
  Entering a task shows its actions. Only a separate, deliberate action spends,
  sends, starts or saves.
- **One visible focus.** Read-only information, a draft, an available action, work
  in progress and a saved result all look different.
- **Nothing selects itself.** When something finishes, focus stays valid. It never
  jumps to the next consequential action.
- **Back goes back.** It restores the previous view, object and focus. It never
  cancels work already submitted.
- **Scopes stay distinct.** The whole device, a collection overview and a single
  sample, expedition or mibi are different views and never stand in for each other.
- **Every state has a way out**, including empty ones.
- **Presses are honest.** Act only on a screen that is visibly ready. A press made
  during a refresh or wake is consumed, not queued. "Pressed", "working", "saved"
  and "visible" are different states.
- **Waking never rewards.** Idle time and wake-ups never award research, items or
  care.
- **Honest states.** Show empty, loading, unavailable, cached and failed states as
  what they are. A missing portrait keeps the mibi's identity and offers to recover
  that same record, never a substitute.
- **Unknown is not absent.** Unknown, absent, disabled and zero look different. Do
  not draw a trait the player hasn't discovered; extra resolution must not reveal
  it.
- **Text is data.** Names, counts and labels are live values, never baked into
  artwork.
- **Station compares; Companion focuses.** The Station's wide screen supports
  side-by-side comparison. The Companion stays on one activity with shallow
  navigation.

## Accessibility

**Working rules:**

- Color never carries meaning alone; a shape or word does too.
- Carried, expressed, unknown, unavailable, pending and saved are distinguishable
  without color.
- Animation has a still equivalent. Slow-refresh screens never rely on blinking or
  timing.
- Essential text is not shrunk or clipped. Long values open in a bounded detail
  view.

**Open:** introductory help, assist options and input timing for players who need
them.

## Screen sizes

The software uses three reference frames:
- Companion: 450×600 portrait.
- Station: 1024×600 landscape.
- Caddy: 792×272, four shades of gray.

They are **Working rules** for design and simulation, not hardware commitments.
See [devices](devices.md).
