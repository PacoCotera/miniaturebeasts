# The Station loop

**Decided 2026-10-07:** the seven decisions in §8 were taken as recommended, with three changes folded in below: no forced return (the sealed bay, §2), the genome fingerprint (§1), and incubation minutes by species and genome (§1). **Decided 2026-10-07 (research loop):** the [research loop](research-loop.md) was approved in full and is folded in: research is read in chapters and traits, the genome ring is the fingerprint, and a minimal cross and wishes are in the first build; its worked numbers stay there. Everything else is **Proposal**; **Decided** marks owner decisions. Screen detail is for UX to work out next; the sketches below are layouts, not finished art.

The Station is a two-thumb handheld (pad left; Home, Research, Library and Vivarium keys in the middle; ← and Confirm right), 1024×600, always on at home, showing the collection and a vivarium. Research is discovery, not a lesson: intensely visual for children, with no locus checklist and no drowning in near-identical samples. One pod makes one founder; identifying the species allows an unedited founder; changes only at researched, permitted traits, with variants that pod carries. Creation commits one individual, and opening shows that same one. Companion and Station mechanics must be separated. The kit plays standalone; the cloud is a later, optional layer. The Companion may be away with no connection to the Caddy or Station: cargo stays in its hold until it is docked, and the design should make taking it out worthwhile.

**Today** the Station is a stand-in page on the Companion: after Send home it runs a plan by itself (mend, identify, read "studies" that are habit notes, hatch one pod of a species not yet raised), then Done. The player watches and chooses nothing. The v1 research study showed a sample as letters (`Pp`), text and a stock line; the terminal references were dense control panels. Both decorate a process instead of being the thing played with.

## 1. The loop and its screens

The loop the player feels: **cargo lands → a pod is identified → its chapters are read → a founder is shaped → it grows in the incubator → it is opened → the mibi lives in the vivarium → one goes with you, or two adults are crossed**. It starts with a pod (**Decided**). Nothing runs by itself except the free mend, the paid mend if the player leaves it on (Probe bench), and the incubator's wait.

**The frame.** Every screen keeps the Companion's grammar, so a player who knows one device reads the other:
- **Top bar:** the screen's name, the world turn (T5), the three counters (Energy, Data, Essence, ticking when they change), and the Companion's state ("Companion away · since 16:05", "docked", or "docked · Station not answering").
- **The stage:** a picture that is the interface. The pad moves a focus ring between things in the picture, never down a list.
- **Bottom line:** ✓ what Confirm does (with its price) · the subject · ← what ← does. One way out on read-only screens (**Decided**).
- The four middle keys switch views without spending or stopping anything.

### Home (Home key): the vivarium

The always-on view. Two thirds of the width is the vivarium: a lit glass terrarium where residents live their species' routines (wander, eat, nap, react to each other). The right third is the bench, drawn as objects: the **pod tray** (one cup per pod, shells in their place colours), the **incubator** (an embryo glowing through its shell), and the **Probe cradle** (Shield bars, tier).

```
 .------------------------------------------------------------------------.
 | Home   T5            ⚡ 9  ◆ 4  ❀ 6         Companion away · 16:05     |
 |  .----------- vivarium ------------.   pod tray  ( )(o)(o)( )( )( )   |
 |  |   Moss naps     Bean digs       |   incubator  [ embryo, 2 min ]   |
 |  |        ~ Dot's bed: with you ~  |   Probe      ▮▮▯  tier 1         |
 |  '---------------------------------'                                 |
 | ✓ Look at Bean        an Untuva pod waits · needs 2 Essence    ←     |
 '------------------------------------------------------------------------'
```

The pad walks focus across residents and bench objects; ✓ opens the focused one (a resident in the vivarium, up close, a pod in Research, the Probe's bench). The middle of the bottom line names the one thing that most needs the player, so a glance answers "what now?".

### Cargo arrived (plays on Home)

When the Companion is docked and the Station accepts its sealed cargo (exactly once, **Working rule**; see §2), the screen plays it as an arrival, whatever view was open: a capsule drops into the bench, pods roll into tray cups one by one, the counters tick up (+4 ⚡ +3 ◆ +7 ❀), and the Probe cradle shows the free mend ("Shield back to 2 bars"). A ribbon reads "Expedition 4 home · 2 pods · explored 9 of 21". The clock jumps to the turn the Companion brings and flashes. Focus does not jump (**Working rule:** nothing selects itself); the bottom line offers "✓ Look at the new pods".

### Pods (Research key): identify, read, create

The pod list up close. Each pod in the list wears its place stamp, its species glyph (or its seal) and a progress ring that fills as its chapters are read. One pod fills the centre, large, with its origin written under it in play words ("Found on the rock field, as a Tuikis felt safe."). The pad moves between pods along the list.

- **Identify** (1 Energy; the first pod ever is free). ✓ and the seal on the cap breaks: the species glyph shows, then its name. A new species gets a stamp ("New species · Tuikis"): its **frame**, every part the species fixes, is learned once and its Library page opens. A pod of a known species is quicker ("Tuikis · logged"). Either way the pod's genome ring draws its grey centre band, and each chapter shows as a sector of hairlines: something is there, not read yet.
- **Read** (Data, one chapter). An identified pod shows its **chapters** as arcs and as pages: Coat, Face, Movement and so on, each a page of a few **traits**, each trait one picture (markings, crown, gait). Which chapters and traits exist comes from the species frame; the player never sees a locus.
- **Create** (from this pod): opens Create, below.
- **Return to the wild** (frees the cup, +1 Essence): the pod goes back to the place it came from; the Companion learns this at the next dock.

### Research as discovery: what a read is

A read is the Station reading one **chapter** of one pod against what the player has seen creatures do; that is what Data is for (**Decided** meaning of Data: records of creature moments). It costs **1 Data per trait in the chapter**, **half (rounded up) once that chapter has been read on any earlier pod of the species**, and the very first read ever is free (**Decided**). Chapters are navigation, not chromosomes: more genome makes fuller pages, never more buttons ([research loop](research-loop.md) §4).

It gives both copies of every trait in the chapter, as pictures only:
- **What shows:** the trait's picture clears to a small, finished drawing on this pod's mibi (stripes on the flank; a short crown).
- **What hides:** if the pod also carries a look that doesn't show, a glowing **seed** sits in the picture's corner holding a little ghost of it (spots inside the seed). The line says it in a child's words: "shows stripes · hides spots". No letters, no ratios.
- **Nothing hidden:** no seed, and the drawing gets a small solid base: "only stripes".
- **Asleep:** a part switched off in this individual is drawn asleep ("markings asleep: bands, if they wake"); it can wake in a child.
- **Breed to change:** a doings trait (movement, stamina, temperament) reads the same way but wears a small family mark; it can't be shaped at creation. **Decided** default: looks are shapeable, doings change only by breeding; each species may override it.
- **Sealed:** a chapter the species seals shows shut with a picture of what opens it (a crystal, a Probe tier), never a "?" with no way forward.

Locked parts, the species frame, are never read pod by pod, shaped or crossed: the first Identify of a species learns them once (**Decided**).

The pod's founder preview in the middle redraws with each read chapter and keeps misty patches where chapters are unread (**Working rule:** draw only what is known). A read is a short reveal, about two seconds, never a wait.

**Repeat pods.** A second pod of a known species is a different individual: a different hand of variants. Three things make it worth having without drowning:
- **A glint, per chapter.** Logging a later pod of a species puts a star on each chapter where *this* pod holds a look the species has not shown yet in that chapter (**Decided**). It says "new here", never what. Pods with no glint are visibly ordinary, and a player can return them.
- **Compare.** The pad's up/down puts a second pod of the same species beside the first, pages and rings aligned; differing traits pulse (**Working rule:** the Station compares). It is free.
- **Never paid twice.** A chapter read on a pod stays read forever, even after the pod is used (**Decided:** findings survive).

### The genome ring

**Decided:** the fingerprint is a **genome ring**, a round code that stores the real copies, so it makes a genome pretty, tangible and shareable without a letter of genetics. The species glyph sits at the centre; a grey band holds the locked frame, the same for every member; two coloured tracks hold the two copies, one spoke per heritable part; one sector per chapter runs clockwise from a notch; outer dashes carry the species, version and a check. Unread parts are hairlines, so the ring fills as knowledge does. Spec and payload: [research loop](research-loop.md) §7. Printability and scanability are still to be tested, and the art may be refined. The short code (`G7F · CD0 · 3H2`, **Decided**) stays as the mibi's name, a lookup and not the genome. Where the ring appears:
- **Pods:** Identify draws the band and hairline sectors; each read fills its chapter's sector.
- **Create:** spokes flip with each roll; on commit the ring is stamped on the shell and the code appears, the moment the individual becomes fixed.
- **Incubator:** unread sectors fill as their chapters clear; the mibi steps out with its ring whole.
- **Library and Vivarium:** every mibi card and lineage entry carries its ring and code; two mibis are told apart at a glance, and a child's ring lines up with its parents'.
- **Caddy card** (later): the printed ring and code; scanning shows and never grants.

### Create and Incubate

Create shows the founder large, the chapters around it, and the cost.
- Unread chapters stay misty: "a surprise". Read traits show their drawing. Each read, shapeable trait rolls among three pictures drawn from the pod's own two copies: as the pod is, only the hidden look, only the shown look (stripes hiding spots · only spots · only stripes), and the founder redraws. A pod with only stripes offers no spots, whatever the Library knows (**Decided**). A combination that can't be built marks the clashing traits and offers no Grow.
- Cost: **2 Energy + 4 Essence** (**Decided**, to tune), **+1 Data per trait changed** (**Decided**). The bottom line always reads the total.
- ✓ "Review" shows one card: the founder, what was changed, what stays a surprise, the cost. ✓ again creates; ← goes back to choosing. Two presses, as for a Shield patch.

The pod moves into the incubator. The embryo (**Decided** life stage) glows through the shell, and as it grows the unread chapters clear one by one: the surprises reveal themselves while you wait, so the wait has a purpose, and every mibi grown is fully known. **Incubation minutes** (**Decided:** they vary by species and genome complexity): the species' base by body (small 2, medium 3, large 4 minutes) + 1 minute per chapter beyond three + 1 per trait changed at creation. The first mibi ever takes 1 minute. A cargo arriving does not shorten it. **Decided 2026-10-08:** *the rule by body and chapters is superseded* by [research-economy](research-economy.md) §5: twenty minutes plus one per shaped trait; **the first bud ever five minutes**; **an instant grow for a cost**; all timers under a developer-tools toggle for testing, loose for now and tightened later. The incubator shows the minutes left, and the Station shows the embryo while the Companion is away. When ready, ✓ "Open" (deliberate, **Decided**) and the juvenile steps into the vivarium with a name ("Fig · Tuikis · juvenile"). One incubator in V1.

### Library (Library key): species and lineage

A shelf of species cards: known species bright, met-but-unidentified ones as silhouettes, and empty slots that admit more exist. A species page is its **field guide**:
- **The frame:** what the species fixes, shown once.
- **Looks found:** one page per chapter, every look seen in a read pod or a mibi as a small picture per trait, with a dotted "more?". The guide is complete when every look the species can carry has been seen. It is knowledge, not material: it never puts a variant into a pod (**Decided**).
- **Where and how:** the places its pods came from and the moments that shed them (the habit notes the stand-in calls studies move here, free).
- **Lineage:** each mibi of the species as a small portrait with its ring, linked to its pod (expedition, place, date) or to its two parents. Founders have no parents; the line begins at the pod.
- **Wishes:** the dream mibis pinned for this species (below).

### Cross and Wish

**Decided:** a minimal same-species cross and wishes are in the first Station build: tinkering is the core ([research loop](research-loop.md) §5).
- **Cross** (from the vivarium, up close, on an adult). Pick two adults of one species; an ineligible pair is refused before anything is spent. Each trait shows a **forecast** as four seed pictures (one in four spotted, two in four hiding spots): quarters, never odds as numbers. Cost as a founder, 2 Energy + 4 Essence. The child is a new individual with real parents; it incubates like a founder, and its ring takes one copy from each parent at every spoke. It is known only where both parents' copies were the same; elsewhere it shows "one of these" until that chapter is read. the cross's rules are in [the cross](the-cross.md); "one copy at every spoke" and "known where the parents match" hold for switches only, and blended traits are known only when read.
- **Wish** (free, on a species' Library page). Pin a dream mibi made from looks in the field guide. Pods and mibis that carry pieces of it glint, and the cross forecast shows how close a pairing gets. Knowledge, never material: a wish puts nothing into a pod (**Decided**).

### The vivarium, up close (Vivarium key): residents

One resident large, the others in a strip below (pad left/right). It shows the mibi, its name, stage, species, ability, its ring, and its chapters as the Library knows them. Actions, all free except a cross:
- ✓ **Spend time:** a short moment with it (as on the Companion).
- **Take with you:** it moves into the Companion while the Companion is docked (or at the next dock); the one with you comes home. Not during an expedition (**Decided**).
- **Bond (minimal V1):** a one-time, deliberate choice that marks the mibi with a small heart and lets it be with you and help as a partner. No needs or meters until care is designed (**Decided:** only bonded mibis need care; bonding never gates breeding).
- **Cross:** on an adult, opens Cross with this mibi as the first parent (above).

### Probe bench (from Home): mend and upgrade

The Probe in its cradle with its Shield bars. The Station always mends to at least two bars (**Decided**; free, as built); a break is mended free (**Decided**). Further bars cost 1 Energy each (**Decided**): ✓ mends one. A standing choice, "Mend fully on docking", defaults on, so a player who never visits the bench still sets out whole when Energy allows. Tier 2 (12 Energy + 4 Data, **Decided**) shows as a lit slot when affordable: ✓ arms, ✓ again installs.

## 2. Cargo travels with the Companion

**Decided:** the devices may have no connection while the Companion is away; cargo is not teleported.

**Head home seals a consignment.** The menu entry keeps its place and rules (start cell or lit outpost, **Decided**), renamed **Head home** since nothing is sent. It ends the expedition: the Probe folds back, and everything in the hold (pods and materials) is sealed as one **consignment** into the Companion's **sealed bay**, separate from the hold. The hold is empty again, as at every expedition start. A break seals nothing (pods fall where it broke, **Decided**).

**The sealed bay.** It holds **three consignments**, one per expedition, never topped up: each keeps its expedition's identity, so the Station accepts each once. Finds always go into the hold first; only Head home fills the bay. With the bay full, Head home still ends the expedition but the hold stays open ("Bay full · your finds stay in the hold"): those finds ride along unsealed, at risk on a break and filling pod places, until a dock frees the bay. Nothing ever forbids setting out (no forced return).

**What still pulls toward the dock** (pulls, not walls): the Shield is mended only at an outpost or at home, and a broken Probe only at home; the Companion's battery; waiting pods and new mibis at the Station.

**What the Companion shows.**
- HUD: a crate icon with a count beside the pod outlines. Sealed amounts never show in the counters, which count only what the hold carries and can spend (**Working rule:** sealed cargo can't be spent).
- The active mibi screen's bottom line middle: "2 consignments sealed · dock to transfer". Cargo draws the bay as three crates, each with its expedition number and its contents as icons, read-only.
- Docking: "Transferring 2…", then "The Station has them · 3 pods", and the bay clears only after a matching confirmation. Docked with the Station unreachable: "Docked · the Station isn't answering · the bay stays sealed".

**The world turns once per Head home**, on the Companion, which owns the map; the dock is a transfer that awards nothing. Three trips out are three turns; the Station catches up at the dock (its clock jumps T5 → T8, and growth by turns applies then). Spam guard: an expedition that explored no cell (no Call in any place) seals nothing and turns nothing ("Nothing explored · the world waits"); an empty hold seals no consignment; new things still arrive away from where the player just was (**Decided**).

**The Station while the Companion is away.** It knows only what it owns and the Caddy's lift time ("Companion away · since 16:05 · with Dot"). It cannot see the map, whether an expedition started, or what is gathered, and draws none of it: no live counters, no guesses. It keeps living: residents follow their routines, Dot's bed shows "with you", the incubator grows and can finish (opening waits for a press), and a pod that needs something says so. After a minute without a press the chrome fades and the vivarium fills the screen with one status line; the first press only wakes it (waking never rewards). Nothing is awarded for time passing, and nothing decays.

## 3. Reasons to take the Companion out

All rewards for going out, never penalties for staying home, and none timed:
- **Expeditions only undocked.** Lifting the Companion opens the expedition choice (sealed consignments aboard or not); docked, it shows the mibi with you asleep and "Lift to explore".
- **The walk.** Once per world turn, undocked, Companion mode offers "✓ Walk with Dot": a short scene of five or so presses in the last place you explored, where the mibi does one thing its species does (digs, sniffs, calms a creature) and you get one creature moment: +1 Data (+2 the first time). Capped at one a turn, so there is nothing to grind and nothing missed.
- **Skill comes from use.** Each expedition where the partner's ability is actually used gives a skill notch (three in all, shown as marks on its card): a Loika calms from one tile further, a Tuikis digs a second burrow, an Untuva sniffs wider. Learning changes behaviour, never genes. Docked or at home, skill stays as it is.
- **Bond is earned out.** Bond (§1 the vivarium, up close) is offered after the mibi's first expedition or walk with you.
- **Memories.** The places and moments it shared go home at the dock and fill its page in the vivarium, up close, and Library: a keepsake, and the first lineage record.

## 4. Economy

**Inputs.** Energy runs the machines (identify, incubate, mend, upgrade). Data reads genomes (reads, shaping, upgrades). Essence grows bodies (founders and crossed children). **Decided:** Essence never turns into Energy.

| At the Station | Price |
| --- | --- |
| Identify a pod (first ever free; a known species is "logged") | 1 Energy (**Decided**) |
| Read one chapter (the first read ever free) | 1 Data per trait in it; half, rounded up, once read on an earlier pod of the species (**Decided**) |
| Create a founder | 2 Energy + 4 Essence (**Decided**, to tune) |
| Change a shapeable trait at creation | +1 Data per trait (**Decided**) |
| Cross two adults | 2 Energy + 4 Essence, as a founder (**Decided**, to tune) |
| Pin a wish, compare, look again | free |
| Mend beyond the free two bars | 1 Energy a bar (**Decided**) |
| Probe tier 2 | 12 Energy + 4 Data (**Decided**) |
| Return a pod to the wild | gives +1 Essence |

**Room.** The tray holds 6 pods and the vivarium 4 residents (plus the one with you) at the start, so pods stay precious and the collection stays small (no multitude of mibis). A full tray turns a pod away without breaking its seal, and the Cargo preview warns first. *"4 residents" is superseded:* **six bays** at the start ([research-economy](research-economy.md) §6); a player keeps as many mibis as the vivarium holds, and **the number of vivariums is the gate**; later direction, vivariums as living, self-stabilising ecosystems. The prices in this section are the testing economy; the real one will be dearer.

**Data income.** These prices assume about **3 Data per expedition**: the field needs more creature moments, or the walk must pay more (**Open**, for the exploration tuning).

**Repeat samples are worth:** a different hand of variants (the reason to read), a glint that says which chapter is worth reading, a cheaper read of a chapter already read on the species, a second partner with a different gait, +1 Essence if returned, and a parent.

**Three expeditions** (yields from round 3: calm 3–5 Energy, storm 8–15):

| | Cargo | At the Station | Store after |
| --- | --- | --- | --- |
| 1, calm | 2 pods (unknown, unknown), 4 ⚡, 5 ◆, 6 ❀ | Identify Loika (free) and Untuva (1 ⚡). Read the Loika's Coat (free, the first read ever): "shows plain · hides pale"; and its Face (2 ◆): "frill crown · hides bare head", "pale eye rings". Create an only-pale Loika: 2 ⚡ + 4 ❀ + 1 ◆. Untuva waits: "needs 1 ⚡ + 2 ❀" | 1 ⚡ · 2 ◆ · 2 ❀ |
| 2, storm | 1 pod (Loika), 11 ⚡, 3 ◆, 3 ❀; Shield 1/3 | Free mend to 2, third bar 1 ⚡. Log the Loika (1 ⚡): its Face arc glints. Create the Untuva unedited (2 ⚡ + 4 ❀). Read the glinting Face at half price (1 ◆): "only plain eyes", new to the field guide | 8 ⚡ · 4 ◆ · 1 ❀ |
| 3, calm | 1 pod (unknown), 4 ⚡, 4 ◆, 7 ❀ | Identify: Tuikis, new (1 ⚡). Now the choice: tier 2 needs 12 ⚡ + 4 ◆ (have 11 ⚡, 8 ◆), or a Tuikis founder now (2 ⚡ + 4 ❀) and tier 2 after the next storm | 11 ⚡ · 8 ◆ · 8 ❀ before choosing |

Three expeditions, three species met, two mibis, one real choice, and every material had a job.

## 5. Between exploration and the Station

**The Station needs from an expedition:** the sealed pods with their origin (place, cell type, how it was found or shed), the materials, and a short record (explored N of M, the moments caused, firsts seen). Nothing else.

**It gives back:**
- **Signs.** Identifying a species makes its tracks (paw) show wherever land is revealed (combined design). Reading any chapter of a species makes its pods' slow beat on the map wear that species' shell colour, so the player can go looking for more of one kind. A sealed chapter sends the player out for its find, and a wish for pods that glint. Diet lines on the Companion follow identification, as built.
- **Partners.** Created mibis become partners when adult; their traits matter in the field (a Loika's long ears calm from further; a Tuikis's gait digs faster). Choosing which pod to raise is choosing which partner to have.
- **Reach.** Tier 2 and, later, mods come from the Station's store.
- **Purpose.** "An Untuva pod waits · needs 2 Essence" is the next expedition's reason (round 2's Station pull).
- **The walk and skill** (§3) make the mibi with you a reason to lift the Companion even between expeditions.

## 6. Deliberately out

Breeding beyond the minimal same-species cross (eligibility rules, fertility, failed attempts, families across generations); editing with a rare item; care, needs and growth timing beyond what is built; crafting and research chips; Station upgrades and more incubators; naming by text entry (names are given, renaming later); several player profiles; trading, printing and the Caddy; the cloud layer (sync, exchange, lineage records); wild capture; habitats other than the one vivarium (**Decided 2026-10-08** as later direction: more vivariums are the gate on how many mibis a player keeps, and vivariums become living, self-stabilising ecosystems; still out of this build).

## 7. A worked session

The Companion comes back with one consignment sealed ("1 consignment sealed · dock to transfer") and is set on the Caddy; the Station, on Home, accepts the cargo. A Tuikis pod rolls into a cup; the counters tick. Bottom line: "✓ Look at the new pods".

1. ✓ Research opens on the new pod: the pod labelled "Unknown", with "Found on the rock field, as a creature felt safe.". Line: "✓ Identify · 1 ⚡".
2. ✓ The seal breaks; the Tuikis glyph shows. "New species · Tuikis". Its frame is learned; the ring draws its grey band and four hairline sectors, one per chapter.
3. Pad → the Coat arc. "✓ Read Coat · 3 ◆".
4. ✓ The page turns: stripes on the flank with a seed holding spots ("shows stripes · hides spots"), "only teal", "short fur". The Coat sector fills; the preview redraws with stripes.
5. ← to the pod, pad to "Create". ✓ Create opens: founder large, three chapters misty, markings showing stripes.
6. Pad ▼: only spots. The founder redraws spotted. Line: "✓ Review · 2 ⚡ 4 ❀ 1 ◆".
7. ✓ The review card: spotted; three chapters of surprises; the cost.
8. ✓ Created. The ring is stamped on the shell, the pod settles into the incubator; the embryo glows; the misty chapters clear one by one as it grows. Home shows it on the bench.
9. When the incubator glows ready, Home key, pad to the incubator: "✓ Open". ✓ A spotted Tuikis steps into the vivarium: "Fig · Tuikis · juvenile".
10. Vivarium key shows Fig large. "✓ Spend time", and Fig answers.

## 8. Decisions (Decided 2026-10-07)

1. **A Station the player drives:** arrival only stores and mends the free bars; identifying, reading, creating and opening are presses on the Station. The stand-in's automatic plan goes.
2. **A read reveals the picture that shows and a seed for what hides;** later pods of a species glint where they hold something unseen. **Added:** the genome fingerprint and code (§1). **Changed (research loop):** the unit is one chapter at 1 Data per trait, half on later pods of the species, the first read free; the glint is per chapter; the fingerprint is the genome ring.
3. **Prices and room:** 6 pod cups and 4 vivarium places to start; a pod can be returned to the wild for +1 Essence. **Changed (research loop):** shaping costs +1 Data per trait changed. **Changed 2026-10-08:** six vivarium places; the number of vivariums is the gate (§4).
4. **Incubation time:** real minutes, shown growing on the always-on Station. **Changed:** minutes by species and genome complexity, as the rule in §1. **Changed 2026-10-08:** twenty minutes plus one per shaped trait, the first bud five, an instant grow for a cost (§1).
5. **The sealed hold:** Head home (renamed from Send home) seals the cargo; it transfers only on docking; the world turns at Head home, not at the dock, and not after an expedition that explored nothing. **Changed:** no forced return; a sealed bay of three consignments (§2).
6. **Reasons to go out:** expeditions only undocked, one walk per world turn (+1 Data), skill notches from using an ability, bond offered after a first outing.
7. **A separate Station prototype page** at 1024×600 sharing the save with the Companion page (§9).
8. **The research loop** ([research-loop.md](research-loop.md) §11), approved in full: chapters as the research unit; a locked species frame and heritable parts, with looks shapeable and doings by breeding as the default each species may override; the genome ring; pods from one renderer with species parameters; a minimal same-species cross and wishes in the first Station build.

## 9. Build scope: Station stand-in v2

**Recommendation: its own page,** `prototypes/station/`, at 1024×600 1×, with the depicted Station controls (pad; Home, Research, Library, Vivarium; ←; ✓) mapped to keys. Separate pages make the separation real: the Companion page can't spend, and the Station page can't see the map. Both read one save in the browser (same sandbox origin).

- **Cargo and docking:** Head home on the Companion page seals the hold as a consignment in the bay in the shared save (with its expedition id, three at most) and turns the world (with the nothing-explored guard); the Companion page shows the crate count and keeps expeditions open. A **Dock** action on the Station page (a depicted Caddy beside the Station, its own key) docks the Companion: the Station accepts each consignment once, in order, plays one arrival each, mends, and marks it accepted; the Companion page clears the bay when it sees the marks. A reload never accepts twice. **Lift** (the same key) undocks; the Companion page offers expeditions and the walk only while lifted. The Companion page's own Station screen goes.
- **Genomes:** each pod gets a seeded genome at spawn from its **species frame on the authoring catalogue** (the 114-pair genome), starting with Pip's five open traits (pale, crown, eye rings, drive, efficiency) in Coat, Face, Movement and Stamina; looks shapeable, doings by breeding.
- **Fingerprint:** the genome ring encoded from the real copies against the species' pinned definition, with the short code; unread parts as hairlines. Print and scan tests come with the encoder.
- **Art:** pods from the one renderer with species parameters, residents and screens from the art director's masters (**Decided:** engineers do not do art). No code-drawn art reaches the owner.
- **Screens:** Home with the arrival, Pods with identify, read, compare and return, Create with review, the incubator, Cross and Wish, Library (field guide, where-found, lineage, wishes), the vivarium, up close (spend time, take with you, bond, cross), Probe bench, the idle fade.
- **Rules:** §4 prices and room; the glint per chapter; the cross forecast; mend standing choice; take-with-you applied at the dock; the walk and skill notches on the Companion page.
- **Debug strip** under the screen (not part of play): add materials, finish incubation (minutes follow the §1 rule), show genomes, reset.
- **Out:** everything in §6, and a side-by-side two-device harness (later, if testers need it).
