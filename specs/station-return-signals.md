# Station return signals: what is waiting, how long, and what brings you back

Ticket T-20261016-29. Game designer, 2026-10-16. It answers gap 2 of the purpose audit (specs/purpose-audit.md): nothing on the Station says when something will be ready or that something needs the player. The owner: the Incubator "needs to invite the user to check it", and the rule applies to every screen. It builds on the Incubator concept the owner chose, option B ([incubator-concept.md](incubator-concept.md); [owner-rulings-2026-10-16.md](owner-rulings-2026-10-16.md)).

Read at station-gate 69ea1d23: the rules in `design/`, the Station's `state.mjs` (`need`, `needKey`, `stageAt`, the bud, the bench ledger), `sitting.mjs` and the Companion's care code in `prototypes/exploration/index.html`.

## 1. One grammar for every wait

Four rules, the same on every screen, so a player learns them once.

1. **A wait that fills with time is a ring on the thing itself.** It is the same ring as Pods' progress ring and the Incubator's ring of time. It is drawn wherever that thing is drawn: on its own screen, small on its Home module, and on the Idle tag. A wait never shows as a bar, a dial, leaves or a percentage.
2. **A lamp has one meaning: something here is for you.** It is amber or off. A slow pulse means something new to see. Steady means ready to act. The green and dark lamps go, which answers the audit's "three colours with no legend can't be learnt". How far along a wait is belongs to the ring, never to the lamp's colour.
3. **One line says it in words.** It is the existing "what needs you" line (`needKey`), the same on Home and Idle and from the same source. Counts are spelled out, as today. A count of minutes appears only in the Incubator's context, "ready in about n min" (owner ruling 3). Everywhere else a timed wait is the ring, plus words without a clock ("a Loika bud is growing").
4. **A wait that is not clock time says what ends it.** Growing up is counted in trips, so it says trips ("grows up after two more trips"). Crates have no time the Station can know, so they say "when the Companion comes home". The Station never invents a clock the rules do not have.

## 2. Every timed thing in the game

"Ends" is what finishes the wait in today's rules. "Return pull" is why the player comes back to look.

| Thing | Ends | On its own screen | On Home | On Idle | Return pull |
| --- | --- | --- | --- | --- | --- |
| **A founder's bud** | 20 min plus 1 a shaped trait, the first ever 5 min (clock) | Incubator B: the ring of time around the pod, cut where each chapter clears; "ready in about n min" | The Incubator module draws the pod's own shell in its nest with a small ring; lamp off while growing | The bud's tag on the bezel with its ring | The meeting; the reveals on the way |
| **A chapter clearing** in that bud | Its cut on the ring (the rules clear unread chapters one by one across the wait) | Incubator B: the just-cleared card, the slip's line, the shadow filling in, the stamp's chapter | The module's lamp pulses amber until the Incubator has been looked at; line "Face cleared on your Loika" | The tag's lamp pulses amber | A new picture of your own mibi |
| **A crossed bud** | 20 min (clock) | Incubator B: the shell laid at home; the ring has no cuts | As a founder's bud | As a founder's bud | The meeting; its chapters are read after |
| **Bud ready** | — | The ring closes, light breaks through the seams, `✓ Open` | Lamp steady amber; line "your Loika is ready" | Tag steady amber | Open it |
| **The standard painting** after Grow | When it lands, usually within the bud's minutes, on a connected kit | Already designed: the small cool "waiting" lamp and "its painting is on its way". It is a status, not a wait the player acts on, so it gets no ring and no amber | Nothing | Nothing | None needed. It lands at the next fresh draw |
| **A portrait crate** (a sitting spent) | A few hours of cloud painting (`SITTING_WAIT_MS`, three hours today) | The crate behind the bay door with its lamp slowly filling (designed, Dock and arrival). Its lamp **becomes a ring** around the crate's seal, filling with the hours | The Cargo module shows the crate's ring; lamp steady amber when it has landed; line "Fig's portrait has come" | The bay's tag ring | The portrait |
| **Crates from a trip** | When the Companion docks. The Station does not know the cargo before that | While the Companion is out, the empty bay says "crates come home with the Companion" | While away: the Cargo module's bay is shut and says nothing more; the top bar's Companion lamp already says it is out. Docked with crates: lamp steady amber, line "two crates wait in the bay" (today's) | The bay's tag amber when crates wait | What the trip brought |
| **A young mibi growing up** (unbonded) | Two world turns after it was born. The world turns once per expedition, and the Station learns it when that trip's crate is opened, so in practice two trips | Vivarium, up close (Habitat): a ring around the "young" mark with one segment a turn ("grows up after two more trips", "after one more trip") | Nothing while it grows. On the turn it grows: line "Moss has grown up"; the resident's name tag lifts with a small amber mark until visited | Nothing while it grows; the line when grown | Seeing it grown; it can now cross and be a partner |
| **A bonded young mibi** | The first Tend after its bond, on the Companion; it waits at home and does not grow on turns | Habitat: no ring. The line "grows up with your care: take it with you" | Nothing | Nothing | Taking it out |
| **An adult becoming an elder** | Six world turns after it became adult | Nothing. Ageing is not a goal, so it gets no countdown; an elder simply reads calm and dignified | The line once, "Bean is an elder now" | The line once | Seeing the change |
| **The bench's Data today** | Midnight on the Station's clock resets it; up to 2 Data a day, by watching a resident a full minute or comparing two | Habitat: while a resident is watched, a ring fills over its minute around the focus ring; it closes and the Data ticks | Last in the line's order: "watch a resident today" while today's Data is not yet earned | Nothing (not worth waking for) | A small daily reason to look |
| **Tend** | Once per Companion day per carried mibi | The Companion's screen, not the Station's | Nothing | Nothing | (Companion) |
| **The dock's mend** | Instant at the dock | Probe bench (designed) | Probe module's plate marks (today's) | Nothing | None: not a wait |

What is not timed: identifying, reading and Compare are one press; Create has no wait; returning a pod or a mibi to the wild is instant. A returned mibi's place shedding a pod later is the Companion's world, not the Station's.

## 3. The line's order

The line already chooses the first thing that holds (`needKey`). Four keys are added, two change, and the order stays "what you can act on now, then what is new to see, then what is waiting":

1. crates wait in the bay (today's)
2. **the bud is ready**: "your Loika is ready" (today's key, with the bud's species and "your")
3. meet (today's)
4. **a portrait has come**: "Fig's portrait has come" (new; until now it rode on "crates")
5. **a chapter cleared**: "Face cleared on your Loika" (new; held until the Incubator has been looked at)
6. **grown up**: "Moss has grown up" (new; held until visited), and "Bean is an elder now" (new, once)
7. new pods, glints, waiting pods, a pod could grow, unread pods (today's, unchanged)
8. **a bud is growing**: "a Loika bud is growing" (today's "a bud is growing", with the species)
9. **the bench**: "watch a resident today" (new; only while today's Data is not earned and a resident is home)
10. set out with the Companion (today's)

Each new key's ✓ goes where its thing is: the Incubator, the bay, the mibi up close.

## 4. Home and Idle

**Home.** The modules carry the waits as pictures, the line carries the words.

- **Incubator module:** the bud's own pod in its nest with a small ring (T-25). Amber pulse for a cleared chapter not yet seen; steady amber when ready.
- **Cargo module:** crates on the shelf when docked; the portrait crate's ring while it is painted. Steady amber when anything waits in the bay.
- **Pods, Probe, Library:** their lamps follow rule 2 (amber or off); their pictures are unchanged.
- **The vivarium:** a resident that has just grown up wears a small amber mark on its name tag until visited.

**Idle.** The full vivarium stays the picture. One small moulded tag row on the bezel's bottom rail, at the rest knob's scale, holds at most two tags: the bud's (its pod shell and ring) and the bay's (a crate mark and, while a portrait is painted, its ring). A tag is drawn only while its wait exists. Each lights amber by rule 2, readable from across the room, and the notice line is today's, from the same source as Home. The first press only wakes the screen, as now.

## 5. Needs

**UI/UX.**

- The ring as one shared composition at three sizes: the screen (the Incubator's, about 428 across), the module (fits Home's module object box, 176×72), the tag (Idle, at the rest knob's scale).
- The segmented variant for trips (Habitat's growth ring) and for chapter cuts (the Incubator).
- The lamp's two states (pulse, steady) replacing the green and dark lamps on all five modules.
- The Idle tag row's place on the bezel rail, and its two tags.
- The line's new strings at their longest, in the context zone's limits (counts spelled, no digits): "Face cleared on your Loika", "Fig's portrait has come", "Moss has grown up", "Bean is an elder now", "a Loika bud is growing", "watch a resident today", "grows up after two more trips", "grows up with your care: take it with you", "crates come home with the Companion".

**Art (AD).**

- The ring's track and fill pieces at the three sizes, in the house style (not leaves).
- The Incubator module's small pod in its nest (T-25's needs list).
- The Idle tags: the bud tag and the bay tag, moulded like the rest knob, each with its amber lamp.
- The amber name-tag mark for a resident that grew.
- The portrait crate's seal with a ring in place of the filling lamp.

**Build.**

- A "seen" flag per event (a chapter cleared, grown up, an elder, a portrait come), set when the player opens the screen it belongs to. The pulse and the line's key drop on it.
- `needKey`'s new keys and order (§3).
- The ring's fill from stored starts and rules, never a stored countdown (the sitting already works this way): the bud's start and minutes; the sitting crate's start and `sittingWaitMs`; a juvenile's `born` and `JUVENILE_TURNS` against `st.turn`.
- Home's Incubator and Cargo module props carry their ring's fill; Idle's props carry the tags.

## 6. For the lead

- **Follow-up tickets.** The lead writes them (the audit's rule). From this spec: UI/UX for the ring, lamp, tags and strings (§5); art for the ring pieces, tags, name-tag mark and the crate seal; build for the seen flags, `needKey` and the props. Each depends on the one before, and the Incubator B work (T-23, T-27, T-28) should land the screen-size ring first.
- **A disagreement in the docs.** `design/game.md` (Life and bonding) says an unbonded juvenile "grows on the clock", but the code grows it on world turns, two after it is born (`stageAt`, `JUVENILE_TURNS`). This spec follows the code, so growth says trips. The design doc's word "clock" should become "trips".
- **One question for the owner.** Ruling 3 puts the minute count in the Incubator's context only. Home's line could say "a Loika bud, ready in about 12 min" too. This spec keeps the ruling: Home shows the ring and no minutes. If the owner wants the count on Home and Idle as well, it is one string change.
