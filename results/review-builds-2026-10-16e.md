---
ticket: T-20261016-101
status: done
branch: PacoCotera/miniaturebeasts:batch/B-20261016-4
head: 52b04850 (T-59), 6b5e8b71 (T-93)
ci: not run (review only)
---
## Verdicts
| Build | Verdict |
|---|---|
| T-59 decision panel component and Grow this founder? panel | **FAIL** (fix ticket T-20261016-103) |
| T-93 Companion dock frames | **PASS**, with one ruling owed |

Judged at 1x on results/T-20261016-59/create-panel-grow-arrival.png and -fork.png against specs/station-decision-panel-spec.md (1.2 to 1.4, 1.6) and the passed art results/T-20261016-70/panel-grow-over-create-1x.png; and on results/T-20261016-93/dock-home-2-crates.png and off-we-go.png against specs/companion-dock-frames-spec.md. Purpose first, then style (design/art-direction.md, design/style-guide/README.md).

## T-59: FAIL
1. **No pictures.** Spec 1.3: each card shows "the outcome as the thing itself", 1:1, on the slot's floor, and the spec's whole premise is "picture-led" (owner, 13:26). In both captures the picture slot (y 168 to 328) is empty dark ground in every card: Grow it shows no juvenile, Keep shaping shows no founder, and in the fork none of the three cards shows anything. The player is asked "Grow this founder?" and is shown neither the founder nor what it becomes. The result says the picture is drawn bottom-centred; it is not visible in the captures. This is a purpose fail.
2. **It does not match the passed art.** The passed art is a sage device plate housing, recessed tiles, a lit plinth under each subject, cost chips on dark rubber and a flat veil. The build is flat `stageGround` fill with 1 px rectangles, and the veil is a visible Bayer checker lattice across the whole Create room (fully visible over the rail tabs and the bezel). Station style: flat layers are never dithered, plates are placed 1:1, never a fill (style guide, The Station). The spec allowed the code-drawn look only until T-47's masters landed; they have (T-47 at fb0e3dcb, revised by T-70 at 5d88a7c1), and the passed art also chose the flat veil in place of the dither, as the spec's 1.2 allows.
3. **A minute count is back on Create.** The cost row on the Grow it, Grow and watch and Grow, keep reading cards reads "2 / 4 / hourglass 20", and the bottom line reads "Grow it 2 4 hourglass 20". Owner ruling 3 allows one minute count, in the Incubator's context line "and nowhere else"; the Create bench build removed it from this bottom line (create-shape.png shows the price with none), and the spec's own 1.6 calls the Grow now line "the one minute count". So the panel's use of growCost reintroduced it. Wrong number: the figure "20" with the hourglass icon, in the three cost rows and in the bottom line while the panel is open.
4. Not failures, noted: the line "chapters stay a surprise" is shortened for more than one unread chapter (the builder's note 2; the card's own limit is 348 px, so the cut is only needed by the bottom line; the copywriter decides). Home's "what needs you" arrival plate (Part 3) is not in this ticket.
What is right: title "Grow this founder?" at 28, 4 words or fewer; the two and three card layouts at 380 and 248 widths with the 16 px gap; the one ring, 4 px out, rounded; the destination mark on the cards that go to the Incubator; the bottom line reads the focused card ("Grow and watch / watch it in the Incubator"); ← reads "Back".

## T-93: PASS
- **Seated (dock-home-2-crates.png):** the stage is one step darker (stage pixel (26,23,37) in off-we-go.png against (12,10,18) when docked; the mibi body (61,57,84) against (41,37,58)); "Docked · lift to explore" is in the message slot in `mint`; the HUD crate icon shows a `cream` box behind it with the count 2. No new art; the existing active mibi screen and HUD. This reads from across a table.
- **Lifted (off-we-go.png):** full brightness, the message slot reads "Off we go" in a `bone` line, the bottom line reads the undocked verbs ("Walk with Dot"), and the crate icon has gone because none are left. As the spec says it should.
- **Owed ruling (not a build fault):** spec 2 says the bottom line has no ✓ cap while seated, but the capture's bottom line still reads "✓ Tend Dot" because the built care rules allow Tend while docked. The builder did not remove a built action and reported it. UI/UX or the game designer must rule whether Tend is refused docked; until then the build is right to keep it.
- **Not judged from a still:** the per-crate flash timing and the count stepping (6 tests pass per the result; I judge the stills only).

## Fix ticket
T-20261016-103 (builder): place the panel masters, draw the pictures, remove the hourglass count from Create's panel and bottom line, retake the two goldens.
