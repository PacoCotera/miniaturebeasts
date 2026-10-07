# The Station loop

**Decided 2026-10-07:** the seven decisions in §8 were taken as recommended, with three changes folded in below: no forced return (the sealed bay, §2), the genome fingerprint (§1), and incubation minutes by species and genome (§1). Everything else is **Proposal**; **Decided** marks owner decisions. Screen detail is for UX to work out next; the sketches below are layouts, not finished art.

**Decided:** the Station is a two-thumb handheld (pad left; Home, Research, Library and Habitat keys in the middle; ← and Confirm right), 1024×600, always on at home, showing the collection and a vivarium. Research is discovery, not a lesson: intensely visual for children, with no locus checklist and no drowning in near-identical samples. One pod makes one founder; identifying the species allows an unedited founder; changes only at researched, permitted traits, with variants that pod carries. Creation commits one individual, and opening shows that same one. Companion and Station mechanics must be separated. The kit plays standalone; the cloud is a later, optional layer. The Companion may be away with no connection to the Caddy or Station: cargo stays in its hold until it is docked, and the design should make taking it out worthwhile.

**Today** the Station is a stand-in page on the Companion: after Send home it runs a plan by itself (mend, identify, read "studies" that are habit notes, hatch one pod of a species not yet raised), then Done. The player watches and chooses nothing. The v1 research study showed a sample as letters (`Pp`), text and a stock line; the terminal references were dense control panels. Both decorate a process instead of being the thing played with.

## 1. The loop and its screens

The loop the player feels: **cargo lands → a pod is identified → its windows are studied → a founder is shaped → it grows in the incubator → it is opened → the mibi lives in the vivarium → one goes with you**. Nothing runs by itself except the free mend, the paid mend if the player leaves it on (Probe bench), and the incubator's wait.

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
 | ✓ Look at Bean        a puffcap pod waits · needs 2 Essence    ←     |
 '------------------------------------------------------------------------'
```

The pad walks focus across residents and bench objects; ✓ opens the focused one (a resident in Habitat, a pod in Research, the Probe's bench). The middle of the bottom line names the one thing that most needs the player, so a glance answers "what now?".

### Cargo arrived (plays on Home)

When the Companion is docked and the Station accepts its sealed cargo (exactly once, **Working rule**; see §2), the screen plays it as an arrival, whatever view was open: a capsule drops into the bench, pods roll into tray cups one by one, the counters tick up (+4 ⚡ +3 ◆ +7 ❀), and the Probe cradle shows the free mend ("Shield back to 2 bars"). A ribbon reads "Expedition 4 home · 2 pods · explored 9 of 21". The clock jumps to the turn the Companion brings and flashes. Focus does not jump (**Working rule:** nothing selects itself); the bottom line offers "✓ Look at the new pods".

### Pods (Research key): identify, study, create

The tray up close. One pod fills the centre, large, with its origin written under it in play words ("rock field · a glowtail felt safe · expedition 4"). The pad moves between pods along the tray.

- **Identify** (1 Energy; the first pod ever is free). ✓ and the shell turns translucent from the top down: the species' silhouette shows inside, then its name. A new species gets a stamp ("New species · glowtail") and its Library page opens a slot. A pod of a known species is quicker: the silhouette shows at once ("Glowtail · logged").
- **Study** (2 Data, one window). An identified pod gets a ring of **trait windows** around it: three to five frosted panes, each a picture frame for one thing about this kind of mibi (its markings, its ears or crown, its colour, its gait). Window count and which ones exist come from the species (phase 2); they are not loci, and the player never sees a locus.
- **Create** (from this pod): opens Create, below.
- **Return to the wild** (frees the cup, +1 Essence): the pod goes back to the place it came from; the Companion learns this at the next dock.

### Research as discovery: what a study is

A study is the Station reading one window of a pod's genome against what the player has seen creatures do; that is what Data is for (**Decided** meaning of Data: records of creature moments). It costs 2 Data (**Decided** price).

What it reveals, as pictures only:
- **What shows:** the window clears to a small, finished drawing of that trait on this pod's mibi (stripes on the flank; a short crown).
- **What hides:** if the pod also carries a variant that doesn't show, a glowing **seed** sits in the window's corner holding a little ghost picture of it (spots inside the seed). The line says it in a child's words: "shows stripes · hides spots". No letters, no ratios.
- **Nothing hidden:** the seed is absent and the drawing gets a small solid base: "stripes through and through".
- **Chosen only through families:** an inherited-only window (the bounded trial keeps movement and effort this way, **Decided** for that species only) opens the same way but wears a small family mark; it can't be chosen at creation.
- **Not readable yet:** a rare window shows a closed shutter with what opens it (a Probe tier, a crystal), never a "?" with no way forward.

The pod's founder preview in the middle redraws with each clear window and keeps misty patches where windows are frosted (**Working rule:** draw only what is known). A study is a short reveal, about two seconds, never a wait.

**Repeat pods.** A second pod of a known species is a different individual: a different hand of variants. Three things make it worth having without drowning:
- **A glint.** Once a species window has been studied on any pod, logging later pods of that species shows a soft glint on each window where *this* pod holds something the player hasn't seen in that species. It says "new here", never what. Pods with no glint are visibly ordinary, and a player can return them.
- **Compare.** The pad's up/down puts a second pod of the same species beside the first, windows aligned; differing windows pulse (**Working rule:** the Station compares). It is free.
- **Never paid twice.** A window studied on a pod stays open forever, even after the pod is used (**Decided:** findings survive).

### The genome fingerprint

**Decided:** every genome packs into a short code (like `#G7FCD03H2`) that drives a **fingerprint**: a round, coloured whorl, one petal per trait window, ridges and hues drawn from the genome. It makes a genome pretty, tangible and shareable without a letter of genetics. Where it appears:
- **Study windows:** an identified pod shows its fingerprint as plain ridges; each study lights that window's petal in its colours. Unstudied petals stay plain (draw only what is known), so the fingerprint fills as knowledge does.
- **Create:** the petals flip with each choice; on commit the founder's code appears under its fingerprint, the moment the individual becomes fixed.
- **Library:** every mibi card and lineage entry carries its fingerprint and code; two mibis are told apart at a glance.
- **Caddy card** (later): the printed card shows the fingerprint, the code and a QR; scanning it shows the mibi, never grants it (**Working rule**).

### Create and Incubate

Create shows the founder large, the windows around it, and the cost.
- Unstudied windows stay misty: "a surprise". Studied windows show their drawing. Where a studied, **choosable** window has a seed, the pad flips its picture between what this pod allows (stripes · stripes hiding spots · spots), and the founder redraws. A pod showing stripes through and through offers no spots, whatever the Library knows (**Decided**).
- Cost: **2 Energy + 4 Essence** (**Decided**, to tune), **+2 Data per window changed** (round 2's figure). The bottom line always reads the total.
- ✓ "Review" shows one card: the founder, what was changed, what stays a surprise, the cost. ✓ again creates; ← goes back to choosing. Two presses, as for a Shield patch.

The pod moves into the incubator. The embryo (**Decided** life stage) glows through the shell, and as it grows the misty windows clear one by one: the surprises reveal themselves while you wait, so the wait has a purpose. **Incubation minutes** (**Decided:** they vary by species and genome complexity): the species' base by body (small 2, medium 3, large 4 minutes) + 1 minute per trait window beyond three + 1 per window changed at creation. The first mibi ever takes 1 minute. A cargo arriving does not shorten it. The incubator shows the minutes left, and the Station shows the embryo while the Companion is away. When ready, ✓ "Open" (deliberate, **Decided**) and the juvenile steps into the vivarium with a name ("Fig · glowtail · juvenile"). One incubator in V1.

### Library (Library key): species and lineage

A shelf of species cards: known species bright, met-but-unidentified ones as silhouettes, and empty slots that admit more exist. A species page shows:
- **The variant gallery:** every drawing the player has uncovered in that species, window by window, as small pictures. It is knowledge, not material: it never puts a variant into a pod (**Decided**).
- **Where and how:** the places its pods came from and the moments that shed them (the habit notes the stand-in calls studies move here, free).
- **Lineage:** each mibi of the species as a small portrait, linked to its pod (expedition, place, date). Founders have no parents; the line begins at the pod. The tree shape is ready for families in phase 4.

### Habitat (Habitat key): residents

One resident large, the others in a strip below (pad left/right). It shows the mibi, its name, stage, species, ability, and its windows as the Library knows them. Actions, all free:
- ✓ **Spend time:** a short moment with it (as on the Companion).
- **Take with you:** it moves into the Companion while the Companion is docked (or at the next dock); the one with you comes home. Not during an expedition (**Decided**).
- **Bond (minimal V1):** a one-time, deliberate choice that marks the mibi with a small heart and lets it be with you and help as a partner. No needs or meters until care is designed (**Decided:** only bonded mibis need care; bonding never gates breeding).

### Probe bench (from Home): mend and upgrade

The Probe in its cradle with its Shield bars. The Station always mends to at least two bars (**Decided**; free, as built); a break is mended free (**Decided**). Further bars cost 1 Energy each (**Decided**): ✓ mends one. A standing choice, "Mend fully on docking", defaults on, so a player who never visits the bench still sets out whole when Energy allows. Tier 2 (12 Energy + 4 Data, **Decided**) shows as a lit slot when affordable: ✓ arms, ✓ again installs.

## 2. Cargo travels with the Companion

**Decided:** the devices may have no connection while the Companion is away; cargo is not teleported.

**Head home seals a consignment.** The menu entry keeps its place and rules (start cell or lit outpost, **Decided**), renamed **Head home** since nothing is sent. It ends the expedition: the Probe folds back, and everything in the hold (pods and materials) is sealed as one **consignment** into the Companion's **sealed bay**, separate from the hold. The hold is empty again, as at every expedition start. A break seals nothing (pods fall where it broke, **Decided**).

**The sealed bay.** It holds **three consignments**, one per expedition, never topped up: each keeps its expedition's identity, so the Station accepts each once (**Working rule**). Finds always go into the hold first; only Head home fills the bay. With the bay full, Head home still ends the expedition but the hold stays open ("Bay full · your finds stay in the hold"): those finds ride along unsealed, at risk on a break and filling pod places, until a dock frees the bay. Nothing ever forbids setting out (**Decided:** no forced return).

**What still pulls toward the dock** (pulls, not walls): the Shield is mended only at an outpost or at home, and a broken Probe only at home; the Companion's battery; waiting pods and new mibis at the Station.

**What the Companion shows.**
- HUD: a crate icon with a count beside the pod outlines. Sealed amounts never show in the counters, which count only what the hold carries and can spend (**Working rule:** sealed cargo can't be spent).
- The active mibi screen's bottom line middle: "2 consignments sealed · dock to transfer". Cargo draws the bay as three crates, each with its expedition number and its contents as icons, read-only.
- Docking: "Transferring 2…", then "The Station has them · 3 pods", and the bay clears only after a matching confirmation (**Working rule**). Docked with the Station unreachable: "Docked · the Station isn't answering · the bay stays sealed".

**The world turns once per Head home**, on the Companion, which owns the map; the dock is a transfer that awards nothing. Three trips out are three turns; the Station catches up at the dock (its clock jumps T5 → T8, and growth by turns applies then). Spam guard: an expedition that explored no cell (no Call in any place) seals nothing and turns nothing ("Nothing explored · the world waits"); an empty hold seals no consignment; new things still arrive away from where the player just was (**Decided**).

**The Station while the Companion is away.** It knows only what it owns and the Caddy's lift time ("Companion away · since 16:05 · with Dot"). It cannot see the map, whether an expedition started, or what is gathered (**Working rule**), and draws none of it: no live counters, no guesses. It keeps living: residents follow their routines, Dot's bed shows "with you", the incubator grows and can finish (opening waits for a press), and a pod that needs something says so. After a minute without a press the chrome fades and the vivarium fills the screen with one status line; the first press only wakes it (**Working rule:** waking never rewards). Nothing is awarded for time passing, and nothing decays.

## 3. Reasons to take the Companion out

All rewards for going out, never penalties for staying home, and none timed:
- **Expeditions only undocked.** Lifting the Companion opens the expedition choice (sealed consignments aboard or not); docked, it shows the mibi with you asleep and "Lift to explore".
- **The walk.** Once per world turn, undocked, Companion mode offers "✓ Walk with Dot": a short scene of five or so presses in the last place you explored, where the mibi does one thing its species does (digs, sniffs, calms a creature) and you get one creature moment: +1 Data (+2 the first time). Capped at one a turn, so there is nothing to grind and nothing missed.
- **Skill comes from use.** Each expedition where the partner's ability is actually used gives a skill notch (three in all, shown as marks on its card): a hopper calms from one tile further, a glowtail digs a second burrow, a puffcap sniffs wider. Learning changes behaviour, never genes (**Working rule**). Docked or at home, skill stays as it is.
- **Bond is earned out.** Bond (§1 Habitat) is offered after the mibi's first expedition or walk with you.
- **Memories.** The places and moments it shared go home at the dock and fill its page in Habitat and Library: a keepsake, and the first lineage record.

## 4. Economy

**Inputs.** Energy runs the machines (identify, incubate, mend, upgrade). Data reads genomes (studies, choosing variants, upgrades). Essence grows bodies (founders). **Decided:** Essence never turns into Energy.

| At the Station | Price |
| --- | --- |
| Identify a pod (first ever free; a known species is "logged") | 1 Energy (**Decided**) |
| Study one window | 2 Data (**Decided**) |
| Create a founder | 2 Energy + 4 Essence (**Decided**, to tune) |
| Change a choosable window at creation | +2 Data per window |
| Mend beyond the free two bars | 1 Energy a bar (**Decided**) |
| Probe tier 2 | 12 Energy + 4 Data (**Decided**) |
| Return a pod to the wild | gives +1 Essence |

**Room.** The tray holds 6 pods and the vivarium 4 residents (plus the one with you) at the start, so pods stay precious and the collection stays small (**Decided:** no multitude of mibis). A full tray turns a pod away without breaking its seal (**Working rule**), and the Cargo preview warns first.

**Repeat samples are worth:** a different hand of variants (the reason to study), a glint that says whether it is worth studying, a second partner with a different gait, +1 Essence if returned, and later, a parent.

**Three expeditions** (yields from round 3: calm 3–5 Energy, storm 8–15):

| | Cargo | At the Station | Store after |
| --- | --- | --- | --- |
| 1, calm | 2 pods (unknown, unknown), 4 ⚡, 5 ◆, 6 ❀ | Identify hopper (free) and puffcap (1 ⚡). Study hopper markings (2 ◆): "shows plain · hides pale". Create a pale hopper: 2 ⚡ + 4 ❀ + 2 ◆. Puffcap waits: "needs 1 ⚡ + 2 ❀" | 1 ⚡ · 1 ◆ · 2 ❀ |
| 2, storm | 1 pod (hopper), 11 ⚡, 3 ◆, 3 ❀; Shield 1/3 | Free mend to 2, third bar 1 ⚡. Log the hopper (1 ⚡): its crown window glints. Create the puffcap unedited (2 ⚡ + 4 ❀). Study the glinting crown (2 ◆): "shows tall crown" | 8 ⚡ · 2 ◆ · 1 ❀ |
| 3, calm | 1 pod (unknown), 4 ⚡, 4 ◆, 7 ❀ | Identify: glowtail, new (1 ⚡). Now the choice: tier 2 needs 12 ⚡ + 4 ◆ (have 11 ⚡, 6 ◆), or a glowtail founder now (2 ⚡ + 4 ❀) and tier 2 after the next storm | 11 ⚡ · 6 ◆ · 8 ❀ before choosing |

Three expeditions, three species met, two mibis, one real choice, and every material had a job.

## 5. Between exploration and the Station

**The Station needs from an expedition:** the sealed pods with their origin (place, cell type, how it was found or shed), the materials, and a short record (explored N of M, the moments caused, firsts seen). Nothing else.

**It gives back:**
- **Signs.** Identifying a species makes its tracks (paw) show wherever land is revealed (combined design). Studying any window of a species makes its pods' slow beat on the map wear that species' shell colour, so the player can go looking for more of one kind. Diet lines on the Companion follow identification, as built.
- **Partners.** Created mibis become partners when adult; their windows matter in the field (a hopper's long ears calm from further; a glowtail's gait digs faster). Choosing which pod to raise is choosing which partner to have.
- **Reach.** Tier 2 and, later, mods come from the Station's store.
- **Purpose.** "A puffcap pod waits · needs 2 Essence" is the next expedition's reason (round 2's Station pull).
- **The walk and skill** (§3) make the mibi with you a reason to lift the Companion even between expeditions.

## 6. Deliberately out

Breeding and forecasts; care, needs and growth timing beyond what is built; crafting and research chips; Station upgrades and more incubators; naming by text entry (names are given, renaming later); several player profiles; trading, printing and the Caddy; the cloud layer (sync, exchange, lineage records); wild capture; habitats other than the one vivarium.

## 7. A worked session

The Companion comes back with one consignment sealed ("1 consignment sealed · dock to transfer") and is set on the Caddy; the Station, on Home, accepts the cargo. A glowtail pod rolls into a cup; the counters tick. Bottom line: "✓ Look at the new pods".

1. ✓ Research opens on the new pod: "Unknown pod · rock field · a glowtail felt safe". Line: "✓ Identify · 1 ⚡".
2. ✓ The shell clears top-down; a glowtail silhouette inside. "New species · glowtail". Four frosted windows ring it.
3. Pad → the markings window. "✓ Study markings · 2 ◆".
4. ✓ The pane clears: stripes on the flank, a seed holding spots. "shows stripes · hides spots". The preview redraws with stripes.
5. ← to the pod, pad to "Create". ✓ Create opens: founder large, three misty windows, markings showing stripes.
6. Pad ▶ twice: stripes hiding spots, then spots. The founder redraws spotted. Line: "✓ Review · 2 ⚡ 4 ❀ 2 ◆".
7. ✓ The review card: spotted; three surprises; the cost.
8. ✓ Created. The pod settles into the incubator; the embryo glows; one misty window clears as it grows. Home shows it on the bench.
9. When the incubator glows ready, Home key, pad to the incubator: "✓ Open". ✓ A spotted glowtail steps into the vivarium: "Fig · glowtail · juvenile".
10. Habitat key shows Fig large. "✓ Spend time", and Fig answers.

## 8. Decisions (Decided 2026-10-07)

1. **A Station the player drives:** arrival only stores and mends the free bars; identifying, studying, creating and opening are presses on the Station. The stand-in's automatic plan goes.
2. **Study = one trait window, 2 Data,** revealing the picture that shows and a seed for what hides; later pods of a studied species glint on windows with something unseen. **Added:** the genome fingerprint and code (§1).
3. **Prices and room:** +2 Data per window changed at creation (round 2's figure); 6 pod cups and 4 vivarium places to start; a pod can be returned to the wild for +1 Essence.
4. **Incubation time:** real minutes, shown growing on the always-on Station. **Changed:** minutes by species and genome complexity, as the rule in §1.
5. **The sealed hold:** Head home (renamed from Send home) seals the cargo; it transfers only on docking; the world turns at Head home, not at the dock, and not after an expedition that explored nothing. **Changed:** no forced return; a sealed bay of three consignments (§2).
6. **Reasons to go out:** expeditions only undocked, one walk per world turn (+1 Data), skill notches from using an ability, bond offered after a first outing.
7. **A separate Station prototype page** at 1024×600 sharing the save with the Companion page (§9).

## 9. Build scope: Station stand-in v2

**Recommendation: its own page,** `prototypes/station/`, at 1024×600 1×, with the depicted Station controls (pad; Home, Research, Library, Habitat; ←; ✓) mapped to keys. Separate pages make the separation real: the Companion page can't spend, and the Station page can't see the map. Both read one save in the browser (same sandbox origin).

- **Cargo and docking:** Head home on the Companion page seals the hold as a consignment in the bay in the shared save (with its expedition id, three at most) and turns the world (with the nothing-explored guard); the Companion page shows the crate count and keeps expeditions open. A **Dock** action on the Station page (a depicted Caddy beside the Station, its own key) docks the Companion: the Station accepts each consignment once, in order, plays one arrival each, mends, and marks it accepted; the Companion page clears the bay when it sees the marks. A reload never accepts twice. **Lift** (the same key) undocks; the Companion page offers expeditions and the walk only while lifted. The Companion page's own Station screen goes.
- **Genomes:** each pod gets a small seeded genome at spawn: per species 4 windows (markings, a body feature, colour, gait), 2–3 variants each, simple shows/hides, one choosable window per species and gait inherited-only. Placeholder pending phase 2 species; the bounded trial is not generalized.
- **Fingerprint:** a deterministic whorl from the genome seed (petals per window, ridge count and twist from a hash, hues from variants) and a short code (base-32 of the packed genome plus a check character); unstudied petals plain.
- **Art:** token silhouettes per species with layered overlays per variant, a frosted-pane and seed treatment, and a vivarium with token residents walking simple routines. No generated creature art.
- **Screens:** Home with the arrival, Pods with identify, study, compare and return, Create with review, the incubator, Library (gallery, where-found, lineage list), Habitat (spend time, take with you, bond), Probe bench, the idle fade.
- **Rules:** §4 prices and room; the glint; mend standing choice; take-with-you applied at the dock; the walk and skill notches on the Companion page.
- **Debug strip** under the screen (not part of play): add materials, finish incubation (minutes follow the §1 rule), show genomes, reset.
- **Out:** everything in §6, and a side-by-side two-device harness (later, if testers need it).
