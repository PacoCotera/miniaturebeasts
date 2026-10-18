# The Incubator build spec: the game designer's truth pass

Against specs/game-design-gate.md, on results/T-20261017-incubator-object/build-spec.md (a11da4ab). Game designer, 2026-10-18.

## Passes

- **The states** (empty, growing, ready, hatch; §3) match the rules.
  - Choose a pod shows only with a pod in the rack and a bay free (`choosePod`).
  - Hatch now carries its price (`instantGrowCost`) and is dimmed when short.
  - Open has no price, and is dimmed with no bay free.
  - "ready in about {n} min" is in the Incubator's own context, rounded up, at least 1.
- **The bar replacing the leaf arc.** One progress, with no digits, and the time as words. The chapters' clearing still shows, on the stamp. True.
- **The Incubate moment (§4.1)** from Create or Cross.
- **Hatch now (§4.2).**
  - It is one press: pay, end the wait, hatch.
  - A refused press plays nothing and spends nothing.
  - A founder's unread chapters turn read at 400, except a shut sealed one. A cross bud's chapters stay unread. Both are as Open makes them known.
- **The hatch (§4.3).**
  - The mibi is a juvenile at juvenile size, and the ribbon reads "a young {Species}".
  - The hatch is the same from Open or from Hatch now.
  - It hands off to the meet.
- **Loika only until the pod is painted out (open item 2).** This is true only if no other species is ever drawn in the painted Loika's capsule. Keep the placeholder rule as written.

## Hatch now in place, with no Hatch now | Wait panel: passes, with one condition

Waiting costs nothing and is undone by pressing later. The bar and "ready in about {n} min" show what waiting means. Not pressing is therefore a true "Wait", and the panel adds nothing.

The rule in specs/station-decision-points.md (its table, and point 4) keeps a panel when the price is **more than a few Essence**. At today's bud waits the price is small. **Condition:** if bud waits ever grow past that, the owner sets the threshold, or retires the rule.

## Incubate with no panel: not mine to pass

Incubate is on the owner-endorsed list of the five commitments that get a panel (specs/station-decision-points.md, point 4). It also reverses the redone Incubate | Keep shaping panel judged on 2026-10-17. Without the panel, the player loses the outcome before the press:
- the pod is used up for good;
- Data goes for each shaped trait;
- the empty bay that waits.

That loss is what the owner's "the irreversible commitments look like everything else" named. **The owner decides.** Either keep the panel (Incubate | Keep shaping, as last ruled), or retire it in their own words. If it is retired, the minimum is:
- Create's ✓ line carries the whole price, ⚡ ❀ and ◆ with the count;
- the middle names the destination, "to the Incubator";
- the pod's loss stays visible on the line.

## Re-judged at 91aa3fde: PASS

The owner kept the Incubate panel at 00:57. §6a is true to the rules:
- **The left window** is the sealed capsule with this founder's pod.
- **The right window** is Create's bench as it is now (the adult founder, its edits lit).
- **The price** is ⚡ ❀ and ◆ with one per shaped trait, and the pod itself is the last item. The pod is used up, so the loss is shown as a price, not as a warning.
- **No minutes** on Create: the time belongs to the Incubator alone.
- **Refusals** happen on Create's ✓ before the panel opens.
- **The guard:** ✓ is taken only after the panel settles.
- **← reads "Back"** and nothing is spent.

The other changes since 812f9869 are also true:
- empty is the open, empty capsule;
- the opened pod (bowl and cap) is drawn by the renderer in each species' colours, which retires the Loika-only condition;
- the juvenile is about 146 tall, with its feet on the moss line;
- Home's capsule shows the state only, and keeps its arc, with no fraction and no minutes.

Game designer, 2026-10-18.
