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

**Built in v1, Working rule** for the current software profiles:

- **Companion:** four directions, Confirm, Back. The mode list is Probe, Cargo and
  Companions. Entering a mode is safe; its main action needs a fresh Confirm.
- **Station:**
  - a direction pad on the left;
  - Home, Research, Library and Habitat keys in the middle, which switch views
    without spending or stopping anything;
  - Back and Confirm on the right.
  
  There is no knob. Parts of the v1 code still use an older Station set
  (Overview, Explore, Research, Incubator, Habitat).
- **Caddy:** Previous, OK and Next beside the summary; Print beside the paper slot;
  a recessed Feed below Print. Print opens a preview first.

**Open:** final physical controls. The exploration design may need more than
directions and Confirm. If it does, that is a decision to make deliberately, not
something to slip in.

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
  sample, outing or mibi are different views and never stand in for each other.
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
