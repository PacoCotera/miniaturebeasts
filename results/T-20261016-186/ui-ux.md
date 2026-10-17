---
ticket: T-20261016-186
status: review
branch: work-queue
part: UI/UX critique (independent; the creative director synthesises)
written: 2026-10-17 11:00
---
# Home, from UI/UX

Source: the Home goldens on `batch/B-20261016-4` (`prototypes/face/golden/home/`): docked, fresh, away, waiting, goal-docked, incubator-ready, moving-asleep. All were judged at 1×. Numbered marks: `results/T-20261016-186/ui-ux-home-callouts.png`.

My lens is how fast a glance answers three questions: *what is alive*, *what is waiting for me*, and *what does ✓ do*. I also ask whether that answer serves the cozy reading and the curious reading, and the step between them.

## What it does well (keep these)

1. **The subject owns the screen (1).** The window takes about two thirds of the face, and nothing overlaps it. A cozy glance needs no reading. It is also the only screen where the player sees the whole household at once. That is the right base for the template.
2. **State is shown as things, not counts.**
   - Crates sit in the bay.
   - Pods sit in their wells, with filled and empty wells visible.
   - The Incubator glows when the bud is ready.
   - When the Probe is away its clamp is empty (`home-away`). Reading an absence from a picture is the best piece of information design on the screen.
3. **One key, one meaning.** ✓ always does the leading thing, and the bottom line names it ("Open the bay", "Go to the Incubator", "Look at Dot"). The player never has to choose a module to make progress.
4. **The fresh state teaches with one line.** "go out with the Companion" over an empty home is the right first-run answer.
5. **Time is in the picture.** The dawn, dusk and night variants, the mist from the nozzle, and the sleeping, moving and walking states make Home worth looking at when nothing is waiting. That is the cozy reason to come back.

## What is missing

1. **The curious player has no way in from Home.**
   - Everything on Home is logistics: crates, pods, the bud, the battery. Nothing poses a *question*.
   - The mibis in the window look like copies of one another. Nothing on Home shows that this one carries a sleeping Spot, or that that one's Glow changed in the cave.
   - Focusing a mibi gives only "an adult Loika" (`home-moving-asleep`). That is the only mechanics line on the whole screen, and it says nothing.
   - The intellectual motivation has to leave Home to find anything. A person who arrived for the cozy reason is never invited across.
2. **There is no thread of progress.**
   - "more walks grow the pair" (`home-goal-docked`) is the one forward-looking line. It is text in the notice slot and disappears when a chore takes the slot.
   - Nothing shows how far the household's genomes have been read, which chapters are still sealed, or what the next discovery could be.
3. **The Library tells nothing (5).** It is the same closed book in every state. It is the module most relevant to the curious player and the only one with no state picture.

## What should improve

1. **Lamps carry meaning on about 10 px of hue (2).**
   - There are three states: off, green and amber. Green is lit on almost every module in the docked state, so "lit" no longer means anything.
   - Green is not a house hue. The guide's lit hue is mint, and orange is the action.
   - The lamp is far below the 24 px rule for meaning carried by a mark alone.
2. **The bottom line says one thing twice (6, 7).**
   - "Open the bay" sits on the left and "two crates wait in the bay" on the right.
   - The middle slot is empty in most states.
   - This uses three slots for one message, and it leaves no room for a second, different one (a goal, a question).
3. **The module pictures don't match the screens they open (3).** Home is the departure point for every carry in the flow pass (`specs/flow-pass-spec.md`). Its pictures should be the same objects the player lands on.
   - Cargo is drawn as a three-bay shelf on a framed plate. Cargo C2 is one bay recess with the door as its back wall (`specs/redesign-cargo.md`).
   - The Incubator is a small box front. The Incubator screen is the candling chamber with the player's pod clamped in it.
   - The pictures sit on framed plates, which the device rules retire in favour of the one pane.
4. **Small marks carry meaning without words (4, 8, 9).**
   - The Probe battery is three 10 px bars.
   - The Companion link is a 16 px phone and dot.
   - "☀ 5" has no word and no obvious meaning: is it a day, a phase, a count?
5. **The five modules have equal weight.**
   - When one is waiting, only the lamp and the focus ring say so.
   - The calm modules have no way to step back.
   - The window frame is a pale bezel rather than the recess the device rules ask for. That is a question for the art director, not for me.

## Navigation, focus and hand-offs (against the T-181 flow, `specs/flow-pass-spec.md`)

1. **Focus lands right.** When a notice leads, focus sits on the module it names, and ✓ does what the bottom line says (`home-incubator-ready`). That is frame 01 of the flow pass. Keep it.
2. **There are two focus styles on one screen.**
   - A module gets the house ring.
   - A mibi gets an ellipse under its feet plus a name tag (`home-moving-asleep`).
   - Proposal: one focus language. On a mibi, use the house ring around its spot, with its name in the middle slot rather than a floating tag over the picture.
3. **Home is where every carry ends.**
   - After the hatch, ← goes to Home and the new mibi is in the window.
   - Home should treat a returning carry as its moment: the arrival is the only motion, and no notice describes it as well.
4. **The words drift from the rooms.**
   - "three new pods in the rack" names a rack.
   - The Pods screen is a case with wells.
   - Notices should use the room's own nouns, or the hand-off from word to picture breaks.
5. **The way to depth is hidden.**
   - From Home, the genome of a mibi sits behind "Look at Dot", and nothing on Home says it exists.
   - Proposal 1 below fixes this with a glance, not a new route. The ← table and the flow stay as they are.

## Proposals, ranked

1. **Give the curious player a door on Home, inside the cozy picture.**
   - When a mibi in the window is focused, show its genome glance under it: one row of chapter marks at the 24 tier, with the glint where something is unread or changed. The mark set is the one Create uses.
   - The context line names the single most interesting fact about that mibi, using the genome's chapter words ("Glow changed in the cave", "a sleeping Spot"), not "an adult Loika".
   - ✓ stays "Look at Dot". The glance invites; the Vivarium explains.
   - This is the step from feel to mechanics without a screen change. The genome engineer should rule on which fact wins, and the game designer on the wording.
2. **One message per slot.**
   - Left: the verb.
   - Middle: what is focused.
   - Right: the notice only when it is about something other than what ✓ does. Otherwise the right slot carries the standing thread: the goal, or an open question ("Stamina still sealed on Fig").
   - The duplicate goes, and the curious line gets a permanent home.
3. **Lamps: amber when waiting, off otherwise.**
   - Drop green.
   - The module picture already shows a calm state. The waiting module also gets the motion the flow pass gives a notice landing on its target (for example, the crate lid lifting once), so the signal is not only an 8 px dot.
4. **Each module picture is the instrument's own object, small:**
   - Cargo: the bay door, with crates in front of it.
   - Pods: the case wells (already right).
   - Incubator: the chamber ring, with the pod in it.
   - Probe: the Probe in its clamp, or the empty clamp.
   - Library: the book's state, with its pages filling as species are read.
   - All of them sit on the one pane, with no plates. Leaving Home then reads as the picture growing into its screen, which is what the carries in the flow pass already assume.
5. **Make the top bar marks legible:**
   - Material marks at 24 px.
   - The link state as a word when it changes ("Companion away").
   - "☀ 5" either labelled or removed.

## For the person moving between the two motivations

- Today Home serves the cozy visit fully and the curious visit only as a list of chores.
- The cheapest bridge is proposals 1 and 2. A focused mibi shows that something about it is unread, and one slot always holds an open question.
- The return trip already works. After a mechanical act, the result walks into the window (flow pass, hand-off 4). Home should keep doing that and should never show mechanics as a panel or a count.

## Not mine to decide

- The art director: the bezel, the lamp hue, the module art and the plate retirement.
- The genome engineer: which genome fact earns the context line.
- The game designer: whether an open question belongs on Home at all.
- No build starts from this until the owner has steered.
