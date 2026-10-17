# Changing your mibi: what should feel rewarding (game designer, for T-20261016-126)

Written 2026-10-17 as the game designer's part of T-20261016-126, which UI/UX owns. It comes before the layout. It answers the owner (04:05): "that's you're communicating the user how you're changing your mibi, it's terrible from an engagement perspective."

## The position in one line

**The reward of a change is felt on the creature, not read on a slip.** A list of changes, however well drawn, tells the player afterwards what they did. The engagement is the moment of the change: the animal in front of them becomes a different animal because of their hand. So the work is mostly on the founder and the drums. The record is the machine's own display set into the bench (the owner, 04:06: "a paper tag is not interactive"; the creative director's `specs/slip-visual-intent.md`). Because it is a live screen, it takes part in the moment too, in step with the drum and the founder (section 5).

## What should feel rewarding, and how the machine makes it felt

### 1. The part changes on the founder, and the founder notices

When a drum turns, the founder's part redraws, as the concept already says. That is the mechanism; it is not yet a reward. Make it one:

- **The change lands with light.** For about a second, a soft warm light washes over the part that changed and nothing else, so the eye goes to it. It is the bench's light, not a glow effect: it falls from the top left like everything.
- **The founder reacts to its own new look.** It is a living preview, so it behaves like one. A new crown: it shakes its head and the leaves settle. New markings: it turns to look along its flank. New eyes: it blinks. Each is one short idle move per trait kind, played once on the change. This is the single strongest reward on the screen: the player changed an animal, and the animal felt it.
- **Words: none.**

### 2. Before and after, without a list

The player should always be able to see what they are leaving.

- **The drum shows its neighbours.** A drum is a tumbler: the faces above and below the window peek out, cut by the drum's housing. So the look you came from and the look you can turn to are both visible at the drum, without any word.
- **The change plays as before and after.** On a turn, the old look of the part stays a moment as a faint ghost and fades while the new one settles in (about a second). The player sees both on the animal itself, with no extra key. ▲ and ▼ already turn the drum, so a hold-to-compare would fight them.
- **At Grow, the big before and after.** The Grow panel (T-45) shows the founder as the pod would have grown it and the founder you made, side by side, with the changed parts lit on yours. This is the one place the whole "what I changed" is shown, and it is shown as two animals, not a list.

### 3. Rare looks: a first

Two honest kinds of special, both from today's rules and data:

- **A first in your vivarium.** When a face gives a look that no mibi the player keeps has, the drum's face carries a small star, and turning to it plays the change with a little more: a brighter light and a longer reaction. The star says "you don't have one like this yet". The game knows this from the residents; it needs no new rule.
- **A piece of your wish.** If the player pinned a wish for this species and a face gives a pinned look, the face carries the wish mark and the founder's part lights in the wish's colour on the turn. Choosing it is visibly a step toward the dream mibi (the rules already make wish pieces glint).
- **Never a number or a percentage** of rarity: the rules have none, and the game shows chances only as pictures.

### 4. What is still hidden, and tempting

- **On the founder,** unread parts stay frosted, as now.
- **On the bank,** an unread chapter's drums are capped with frost. When this pod **glints** on that chapter (the species has shown that chapter before, and this pod carries a look the species hasn't shown yet), the cap shows the glint star: "something new is under here". That is the temptation, and it is the real one from the rules.
- **The choice it opens,** shown with options, cost and outcome (specs/station-decision-points.md): on a capped drum, ✓ offers **Read it now** (◆ n, then you can shape it) or leaves it to **clear while it grows** (free, a surprise in the Incubator). Today, reading means going back to the pod. Letting the player read from the bench is a proposal for the lead, since it adds an action to Create.
- **On the Incubator,** the frosted part clears on the founder's shadow inside the pod and, where the look is new to the player, it clears with the same star and light as a first on Create.

### 5. The bench's display: the record, live

Because 1–4 put the reward on the founder and the drums, the display's job is the whole genome at a glance, including drums paged off the bank on a deep species. Because it is live, it also answers each turn. On a turn, the matching chip flips in step with the drum and the founder: three places on the machine move at once, like the dock moments. It carries, as the creative director's intent says:

- one chip per trait, with the drum's notch when changed and the star when it was a first;
- a frosted chip for each trait of a chapter still a surprise, with the glint star when it glints;
- the clash as the red link between two chips, mirrored on the two drums;
- on the Incubator, the same display; a frosted chip clears to its picture when its chapter clears, with the star when the look is new to the player.

Being live, the display can also take the focus. When the ring walks the bank, the matching chip is outlined on the display, so the player can see where a paged-off drum sits in the whole genome. It never carries a sentence, a count in words, or the price (the bottom line has it). **Words budget, as the creative director's: at most 3 on the display.**

## For UI/UX and art

- **UI/UX:** the drum's neighbour faces in the window (how much peeks), the before-and-after fade on a turn, the change light's area (the trait's region on the founder), the star and wish marks on drum faces and chips, the display's chip flip in step with the drum (200 ms) and its focus outline, and the "read it now" choice on a capped drum if the lead takes it.
- **Art:** one short reaction per trait kind for the founder (head shake for crowns and ears, a look along the flank for coat and markings, a blink for eyes, a tail flick for tails), placed over the founder picture. Also the change light as a soft painted wash per trait region, and the star mark.
- **Build:** "a first in your vivarium" is a check of the new look against the residents' looks for that trait. A wish piece is the existing wish match. A glint on a capped drum is the existing `podGlints` per chapter.
