# Companion mode: the mibi with you

**Proposal** for Companion mode (the Companion at home, between expeditions) and
choosing who comes along. **Decided** marks restated owner decisions.

**Decided:** Companion mode gets a dedicated screen to interact with the active
mibi, "think Tamagotchi", and a simpler way to choose who comes along; the Probe
should be a way to find Energy. Four buttons: pad, Confirm, Back, Call (Call
calls the riding mibi). Life stages: juveniles ride in the Companion but don't
join Probe expeditions; adults help; elders have shifted strengths. Bonding is
optional, and only bonded mibis need care. No touch. The HUD shows Energy only,
beside battery and connectivity.

**Today** the Companions screen is a list of cards (labels overlap) with two
flags per mibi, *along* (adult partner) and *riding* (juvenile in the
Companion), toggled by Confirm. Nothing on it is a place to *be* with a mibi.

## 1. The active mibi screen

The Companion's home view. When nothing else is open, the device shows the mibi
with you, large:

```
 .-------------------------------------------.
 | ⚡ 4      ▮▮▮ ᯤ            ))) call Pip   |  HUD 26 px
 |                                           |
 |          [   Pip, HiBit, 280×300   ]      |
 |                                           |
 |   Pip   (adult)                           |  name 3×, stage chip
 |   Loika · calms wary creatures            |  one line, species ability
 |   with you · joins the Probe              |  one line, status
 |   (mood slot: empty until bonding)        |
 | ✓ Spend time with Pip         ← Mibis     |  bottom line 34 px
 '-------------------------------------------'
```

- **The mibi** at about 280×300, HiBit as in the Miniature Lives proof
  (**Decided** look), slow idle cycle (a still frame under reduced motion).
- **Name, stage, one ability line, one status line:** "with you · joins the
  Probe", "with you · too young for the Probe (2 world turns)", or "at home".
- **Mood, only if bonded.** Bonding and care aren't built, so minimal V1 shows
  no needs; the slot stays empty. Later: one face and one word ("content"),
  never meters, never for an unbonded mibi.

**The four buttons here:**

| Button | Does |
| --- | --- |
| **Call** | The mibi with you answers: turns, hops to the front, chirps. A juvenile is learning: it sometimes looks the wrong way first. On another mibi's screen, Call brings the view back to the mibi with you, which answers. Free |
| **Confirm** | One context action. On the mibi with you: "Spend time with Pip", a short species moment (a Loika leans on the glass, an Untuva puffs, a Tuikis glows) and one line from its last expedition ("Pip remembers the meadow"). No reward: waking and idling never award anything (**Working rule**). "Feed" joins only when care exists. On a mibi at home: "Take Moss" (§2) |
| **Pad** | Left/right: the previous/next mibi's screen, same layout (looking is free) |
| **Back** | Up to the roster ("← Mibis") |

**Not there, on purpose:** stats walls, trait or genome lists, meters, timers,
notifications (the Station compares; the Companion focuses). The roster is
renamed **Mibis**, so it is never confused with the device.

## 2. Roster and who comes along

**One slot.** Exactly one mibi is **with you**: it rides in the Companion. If
it's an adult or elder, it's also your expedition partner. A juvenile rides but
doesn't join the Probe. Everyone else is **home**.

- **Choosing is one press.** On the roster, or on a home mibi's own screen, the
  bottom line reads "✓ Take Pip". Confirm makes Pip the mibi with you, sends the
  previous one home ("Dot stays home · Pip is with you"), and shows Pip's
  screen. On the mibi already with you, the roster's Confirm reads "✓ Visit Pip".
- **The roster:** one row per mibi (portrait, name, stage chip), the mibi with
  you first and tagged. "← menu" leads out.
- **The expedition screen's partner row** reads from the slot: "Partner: Pip ·
  calms wary creatures". With a juvenile in the slot it reads "Dot rides · too
  young", and Confirm on the row offers "✓ Take Moss instead" when an adult is
  home. That's the same one-press swap, at the moment it matters.

**Edge cases:**
- **No mibis:** an empty pod outline, "No mibi yet · bring a pod home, it
  hatches at the Station"; Call's slot empty; Confirm "Next expedition".
- **A juvenile only:** it's with you; expeditions go without a partner and the
  row says why. Grown, it becomes your partner with no press ("Dot is grown").
- **A new hatch** never takes the slot by itself (nothing selects itself).
- **Mid-expedition:** no swapping; the roster is read-only ("Pip is with you
  until you're home"). Between expeditions, swap any time.

**Why one slot is enough for V1.** Two flags let a juvenile ride while an adult
joins the Probe, at the cost of two toggles, two meanings of "along", and a Call
that must guess whom to call. One slot: one name in the HUD, one answer to
"who's with me?", one press to change it. Energy and pods stay scarce
(**Decided**), so players raise few mibis, and the case a second slot covers
lasts about two world turns per juvenile. If play misses it, "also riding" can
return later without changing this screen.

## 3. The Probe finds Energy

No new mechanic. Round 3 (**Decided**) already makes Call the way to find
Energy: places lie under a survey veil, and Call unveils 15×15 tiles. Warm
stones (+1, at most one per stone per world turn) and storm-charged stones
(+2/+3) glint when unveiled. The map's bolt sign marks charged stones. Three
small additions make that visible as "finding Energy":

- **The line says it.** A Call that finds charged stones: "Energy nearby · 2
  stones"; they stay outlined until drawn.
- **The map remembers it.** A cell with a found, undrawn stone shows the bolt:
  solid for storm charge, hollow for warm (same sign, so still five signs).
- **The Probe screen counts it:** "Energy in reach: 3 drawn · 1 found, not
  drawn".

Cost: one line, one glyph, one count. Storms stay the big payout.

## 4. The button name

The key steps out one level, except in the field, where it opens a menu over
the place; there "Back" reads wrong.

| Option | For | Against |
| --- | --- | --- |
| **A. Keep "Back"** ("one level out") | No change; matches the Station's Back | The owner's doubt stands; in the field it opens rather than goes back |
| **B. Rename to "Menu"** | True in the field | False everywhere else: it closes the menu, leaves Cargo, goes up from Pip's screen to Mibis |
| **C. Glyph only: ←** | The bottom line already names its effect on every screen ("← Wait · Send home", "← Mibis", "← close"), so the engraving needn't. True on every screen | The bottom-line label becomes load-bearing: no screen may omit it |

**Recommendation: C.** Engrave only ←; the bottom line names it (the working
rule becomes the rule). Cost: drop BACK from the depicted shell, engrave the
Station's key ← too for consistency, and say "the ← key" in player-facing docs;
"Back" stays the internal name.

## 5. Walkthrough: home, Pip, out again

Dot (juvenile) is with you; Pip, a Loika, grows up this world turn. Start: Cargo, in the field.

| # | Press | Screen shows afterwards |
| --- | --- | --- |
| 1 | Confirm | "Send home": the Probe heads home; the Station's pages show |
| 2 | Confirm | Station done. The Companion's home view: Dot, large, "with you · too young for the Probe (1 world turn)". Line "✓ Spend time with Dot   ← Mibis". HUD `))) call Dot` |
| 3 | Call | Dot hops to the front and chirps, looking the wrong way first |
| 4 | Pad right | Pip's screen: "adult · at home · grown this turn". Line "✓ Take Pip   ← Mibis" |
| 5 | Confirm | "Dot stays home · Pip is with you". Status "with you · joins the Probe". HUD `))) call Pip` |
| 6 | Back | Mibis: Pip (with you), Dot (home). Line "✓ Visit Pip   ← menu" |
| 7 | Back | Menu: Next expedition (focused), Probe, Cargo, Mibis |
| 8 | Confirm | Expedition choice. Partner row: "Partner: Pip · calms wary creatures" |

## Decisions for the owner

1. **One slot:** replace *along* + *riding* with a single "with you" mibi (a
   juvenile with you means no expedition partner), or keep two?
2. **The ← key:** glyph-only with the bottom line naming it (recommended), keep
   "Back", or rename to "Menu"?
3. **Minimal V1 care:** the active screen offers "Spend time" only, with no
   needs shown until bonding and care are designed?
4. **Energy on the map:** a hollow bolt for a found warm stone, plus "Energy
   nearby" on Call, or the line only?
