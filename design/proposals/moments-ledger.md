# The Moments ledger

**Proposal**, game design, 2026-10-09. The owner approved a Moments ledger for the
Companion: a page listing each creature's first-time moments. A found moment gets
a stamp and its date; one not yet seen gets a dashed circle, never a lock. The
page reads "N of M". This proposal gives the page its real list for the first
build's species, the event that counts each row, and how the ledger, the
first-moment bonus and the Station's habits share one event.

Sources: the [exploration prototype](../../prototypes/exploration/README.md)
(`awardMoment`, `creatureTick`, `shedPod`, the partner's sniff, dig and flinch),
[world and exploration](../world-and-exploration.md) ("Moments", "Partners and
gates"), [creatures and genomics](../creatures-and-genomics.md) ("Behavior"), the
species frames' `habits` (`prototypes/workbench/frames/`) and
[the portrait](the-portrait.md) §8 ("Habits").

## 1. What a row is

- **One row is one species doing one kind of thing, seen for the first time.**
  Its id is `<frame id>:<moment id>`, for example `S01:ate-fruit`. Frame ids, not
  the field test's species indexes, because the two orders differ (the field test
  has 0 Loika, 1 Tuikis, 2 Untuva; the frames have S01 Loika, S02 Untuva, S03
  Tuikis).
- **Words** are what the ledger line shows: past tense, the species' name, what it
  did, at most 28 characters so a line never wraps on the Companion.
- **Seen means in sight.** A row is stamped only when the creature is in the
  player's sight when it acts (not `X.away`). "Something ate the fruit by a bush"
  is an ordinary moment and stamps nothing; the row waits for one the player saw.
  This also makes the existing line "first time you saw a Loika eat" true.
- **The stamp's date** is the real-world day of the event, shown as month-day
  ("10-03"), as in the mock.

## 2. The list

Wild rows are a creature in the place acting. Partner rows are the mibi with the
player acting on an expedition. **Data** says what the event pays (unchanged from
today). **Habit** is the Station habit id the same event records when the actor
is the mibi with the player.

### Loika (S01): 3 rows

| Id | Ledger words | The event that counts it | Data | Habit |
| --- | --- | --- | --- | --- |
| `S01:ate-fruit` | Loika ate your fruit | A Loika eats fruit the player put down or offered (`awardMoment(c, 'eat')`) | +1, +2 the first time | none |
| `S01:shook-dry` | Loika shook dry | A wet Loika shakes dry after rain or in shelter (state `shake`, the tuft drop) | none (the tuft is +1 Essence, as now) | `shake-dry` |
| `S01:kept-calm` | Loika kept one calm | The partner's calm keeps a creature from noticing the player (the "Dot keeps the Untuva calm" line) | none | `calm` |

### Untuva (S02): 4 rows

| Id | Ledger words | The event that counts it | Data | Habit |
| --- | --- | --- | --- | --- |
| `S02:ate-fruit` | Untuva ate your fruit | An Untuva eats fruit the player put down or offered (`awardMoment(c, 'eat')`) | +1, +2 the first time | none |
| `S02:full-meal` | Untuva finished a meal | An Untuva that ate goes full and sheds a pod (state `full`) | none (the meal already paid) | none |
| `S02:sniffed` | Untuva sniffed out a pod | The partner sniffs twice and a buried pod shows ("Dot found a buried pod") | none | `sniff` |
| `S02:felt-storm` | Untuva felt lightning coming | The partner flinches before a stray strike ("Dot flinches · lightning is coming") | none | none |

### Tuikis (S03): 4 rows

| Id | Ledger words | The event that counts it | Data | Habit |
| --- | --- | --- | --- | --- |
| `S03:settled` | Tuikis settled by you | A Tuikis settles because the player kept still (state `glow`, `awardMoment(c, 'settle')`) | +1, +2 the first time | none |
| `S03:curled` | Tuikis curled up in shelter | A wet Tuikis curls up in shelter under rain (state `curl`) | none | `sleep-curled` |
| `S03:dug` | Tuikis dug the burrow open | The partner digs a narrow burrow open ("Dot dug the burrow open") | none | `dig` |
| `S03:lit-fog` | Tuikis lit the fog | The first action in a fog bank with a Tuikis partner along (its glow widens sight to 6 and keeps the Call's reach) | none | `glow` |

**Eleven rows** for the three species. The field test has no other species.

**Not on the list yet**, because nothing in the field shows them: the Loika's
and the Untuva's `sleep-curled` and the Untuva's `puff` happen only on the
Station's bench and in the Companion's Spend time, which gives nothing by rule.
They stay Station habits. Each joins the ledger when a field event shows it, under
an id given then. The walk with the mibi (one press, a scripted line) stamps no
row: a row is something the player saw happen in a place.

## 3. One event feeds the bonus, the ledger and the habit

Today `awardMoment` keeps `S.firsts["<index>:<kind>"] = 1` for the +2 first-time
bonus. The proposal makes that same table the ledger:

- Every event in §2 calls one function, `noteMoment(c, id, X)`:
  1. If the creature is in sight and `S.firsts["<frame>:<id>"]` is unset, it sets
     it to the day's date. That is the stamp.
  2. For the three paying rows, in sight or not, it hands on to `awardMoment`, which pays as today:
     +1, or +2 when step 1 just stamped the row (and for the first moment with
     each species on an expedition), once per creature per expedition, never past
     the walk's yield. No other row pays Data: Data comes only from creatures
     doing something because of the player (decided), and a stamp is a record,
     not an award.
  3. If the actor is the mibi with the player and the row names a habit, the
     habit goes into the expedition's `habitsDone` for that mibi, which the dock
     hand-off gives the Station's `recordHabit` (the portrait §8). A habit the
     Station already has is recorded once there, as now.
- So the first time a Tuikis partner digs the burrow open, one call stamps
  `S03:dug`, notches the skill as today, and sends `dig` home with the crate.
- **The Station's own habits stay the Station's.** The bench's watch records a
  habit without touching the ledger: the ledger is what the player saw in the
  field.
- **Save.** `S.firsts` stays where it is (save v8, Companion-owned). On load, the
  three possible old keys are renamed: `0:eat` to `S01:ate-fruit`, `2:eat` to
  `S02:ate-fruit`, `1:settle` to `S03:settled`. An old value of `1` has no date:
  the row shows its stamp with no date. No new top-level field, no version bump.
- **Name.** The Station's research ledger is already `st.moments` (the sitting's
  moments). The frame field for these rows is therefore `fieldMoments`, and the
  Companion's store stays `firsts`, so the two never share a key.

## 4. How M grows

- **M is the sum of the rows of every species met.** A species is met when one
  of its creatures is first in the player's sight (`S.met`, the same moment that
  gives the Library its pencil study). Meeting adds all its rows at once, wild and
  partner alike: a partner row the player cannot reach yet shows a dashed circle,
  which says what a raised one could do.
- With the starter met first: "0 of 3"; the Untuva adds 4 ("1 of 7"); the Tuikis
  adds 4. **With all three met, M is 11.** M never shrinks; releasing a mibi
  removes nothing.
- **Before identification** a met species' rows are one dim line, "Unknown
  creature · 3 moments", with its stamps counted. A moment seen before the
  species is identified stamps as usual (the field test already keys firsts that
  way); the rows open with the species' name at Identify.
- **Later species** bring their rows with their frame, in `fieldMoments` beside
  `habits`, and their behaviour in the field. A species whose frame has no
  `fieldMoments` adds nothing to M. Before any species is met, the page reads
  "Nothing met yet".
- **The page.** Rows keep the list's order, species in the order met; four rows a
  page, so eleven rows make three pages ("1/3", as in the mock). Stamped rows do
  not move.

## 5. For the owner

1. **Seen means in sight** (§1): a moment out of sight pays its +1 but neither
   stamps nor takes the +2. *Recommended*; the alternative is today's rule, where
   an unseen moment can take the first-time bonus.
2. **Partner rows count in M from meeting the species** (§4). *Recommended*; the
   alternative adds them only once a mibi of the species is raised, which keeps
   early totals smaller but makes M jump at the Station.
