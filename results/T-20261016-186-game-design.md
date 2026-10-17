---
ticket: T-20261016-186 (the game designer's critique)
status: done
branch: work-queue
judged: Home's four states in the device sheet (results/T-20261016-175/device-sheet-1x.png): docked, away, a bud ready, the goal line; with plate 01's "do" (style/art-direction-general e1def10b)
ci: not run (review only)
---
## The verdict in one line

Home serves the feel very well and the mechanics hardly at all, and it gives the person moving between the two no way to cross. It answers "what needs you?" well, but never answers "what are you working toward?"

## What it does well (keep all of it)

1. **The life comes first.** The vivarium window takes two thirds of the screen, and it is alive. For the cozy motivation, Home is a reason to come back by itself, with no task needed. This is the right foundation, and nothing below should shrink it.
2. **One action, and it is the right one.** The bottom line's ✓ does the most useful thing now ("Open the bay", "Go to the Incubator"). With the flow sign-off, that one press lands on the thing itself. This is Pillar 4 done right: a glance and one press.
3. **Waits are pictures.** Crates on the shelf, pods in their wells and the bud in its nest are the waits themselves, not counters about them.
4. **Calm.** Since plate 01's fix, a lamp is amber or off, so a lit lamp always means something. Nothing nags.
5. **A stable layout.** The same five modules sit in the same place every time, so Home is learnt once (the art direction's "one machine").
6. **The goal line exists.** When nothing waits, "more walks grow the pair" gives the next step instead of an empty line. It is the seed of what is missing below.

## What is missing

### 1. Nothing on Home is for the mechanics motivation

The intellectual pulls the game guide names are a chapter half read, a glint not yet followed, a field guide nearly complete and a wish one generation away. **None of them is visible from Home.** A player who left mid-plan comes back to a beautiful room that doesn't remember what they were working out. They have to open Pods, the Library or a mibi to find their own thread again. For a motivation whose pleasure is a question held over time, that is the biggest gap on the screen.

### 2. No way from the surface down, or back up

The game guide's rule is that every surface leads down and every depth pays off on the surface. Home has neither direction:
- **Down:** nothing on Home invites the question "why does that one look like that?" The window shows mibis as a scene, not as individuals with a pedigree one press away.
- **Up:** a cross planned for weeks arrives in the vivarium as one more animal among the others. The payoff of the mechanics is not celebrated where the feel lives.

### 3. The residents are a scene, not individuals

Pillar 3 is about living with *this* mibi. On Home the residents carry no names and no states: nothing shows that one just grew up, one was born from the player's cross, or one is the partner. Return signals already specify the amber name-tag mark for a resident that has just grown up, but the sheet doesn't show it on Home. Attachment needs the individual, for both motivations: the cozy one loves *Dot*, and the intellectual one wants to see that Dot's coat came out as forecast.

### 4. Two modules say nothing that changes

- **Library:** a closed book, in every state. It never changes, so it fails the gate's "why come back" check. Its own room key reaches it already.
- **Probe:** the plates meter is real information (reach and mend), but it is the Companion's state shown second-hand.

Together they are two fifths of the column, and they carry the least.

### 5. The column partly repeats the room keys

The modules are labelled like a menu. Navigation is already on the room keys, so the column earns its place only as **status**. As status, it gives equal weight to an event (crates in) and a fixture (the Library).

### 6. One unexplained number

The top bar's sun with "5" is the world turn (`st.turn`). The game guide says the only numbers on screen are prices and supplies. To the cozy player it means nothing. To the mechanics player it is meaningful (the world turns once per expedition), but nothing says so. It should be read as something or removed.

### 7. The trip is barely on Home

The Companion is a small chip in the top bar. When the Companion is away, Home doesn't show who went with it or that a trip is under way. For the cozy player, a mibi out walking is a story. The vivarium's empty spot is shown in the Vivarium room, but not here.

## What I propose, ranked

1. **One pursuit on Home: the player's own thread.**
   - **What:** the Library module becomes the **pursuit**. It shows the pinned wish as its pieces, each lit or not in the wish's silhouette, with the species' field guide filling behind it. With no wish, it shows the field guide closest to complete.
   - **Why it serves both:**
     - the cozy player sees the mibi they dream of coming closer;
     - the intellectual player sees, for example, two of five pieces held, and which resident is closest;
     - the person moving between them gets a bridge in each direction.
   - **Interaction:** ✓ on it opens the wish (the way down). It changes when the player makes progress, so it passes "why come back".
   - **Cost:** it replaces a module rather than adding one, and it uses only data the game already keeps (`st.wish`, the field guide).
2. **Pods show what is left to know.** Each pod in the Pods module wears its chapter ring, filled as far as it is read, and the gold glint if a chapter holds something new. The curiosity gap, honestly paid, becomes visible from Home. This uses the existing marks register, so there is no new mark.
3. **Residents as individuals, only on events.**
   - **What:** a resident that just grew up, was just born from a cross, or is out with the Companion wears its name tag in the window until visited (return signals already specify the first).
   - **Why:** the window stays a scene at rest, and an event gets a name.
   - **The payoff:** when a cross the player planned is born, its tag carries the wish-piece mark if it brought one. That is the depth paying off on the surface.
4. **Every module says something that changes, or goes quiet.**
   - **Probe:** keep the plates. They are the one thing the player needs before the next trip.
   - **Away:** Cargo, which is empty while the Companion is away, shows who went out (the partner's small portrait), so the trip has a face.
   - **The world turn:** remove it from the top bar, or tie it to something the player can read (the world changed: a storm moved, a place opened). Leaving it unexplained is the one option I'd reject.
5. **The goal line, connected to the pursuit.** When nothing waits, the bottom line names the next step **toward the pursuit**, not a generic hint ("cross Dot and Moss for the stripe"). That is the line's ✓, so it becomes one press toward the player's own goal. The words budget holds: at most six words.

## What I would not change

- The vivarium's share of the screen.
- One ✓ and the line's ownership of it.
- The lamp rule.
- The module column's fixed place and order.
- No numbers for progress. Proposals 1 and 2 are pictures: pieces, rings and glints.

## How Home reads for each motivation, after these

| | Now | After |
| --- | --- | --- |
| **The feel** | a living room, one thing to do | the same, plus names on new events and a face for the trip |
| **The mechanics** | nothing until a room is opened | the player's own question waiting on Home: a wish's pieces, pods half read |
| **Moving between them** | no bridge | ✓ on the pursuit goes down; a bred mibi's tag brings the result back up |

Signed: game designer, 2026-10-17.
