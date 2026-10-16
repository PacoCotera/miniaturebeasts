# The Companion's dock frames: "home" and "Off we go" (UI/UX spec)

Ticket T-20261016-91, 2026-10-16 (America/Mexico_City). Base: batch/B-20261016-3 (`prototypes/exploration/index.html`, the Companion on the play page) and `design/style-guide/companion-screens.md` (the frame, "Docked mid-expedition", "Companion mode / active mibi").

It is the Companion's part of `specs/dock-moments.md` §§1–2, beside the Station's (`specs/station-dock-arrival-spec.md`).

Wireframes: `specs/companion-dock-frames/home.png` and `off-we-go.png` (rough, 1×, 450 × 600).

## 0. Purpose

At the dock the three devices react to one moment in step. The Companion's job is small and must read from across the table:
- **Seated:** "I'm home, and I brought these crates." The marks then clear one by one as the Station opens them.
- **Lifted:** "We're off."

It is a show, not a form: no press is asked for.

## 1. Measured: what the Companion already has

- **The frame:** HUD rows 0–31, view 32–563, bottom line 564–599, at 1× on 450 × 600.
- **The HUD's crate count:** `drawCrateCount`, a 16 × 14 crate icon and the count in `sand` at y 9, after the pod slots.
- **The active mibi screen:** stage (24, 40, 402, 280); the mibi at 280 × 300 HiBit, derived on the Station; idle 2 frames at 2 Hz; Call's hop.
- **The docked message slot:** panel (70, 512, 310, 26), "Docked · lift to explore" in `mint`.
- **The lift's Shield flash:** each mended bar flashes `cream` behind its outline, 120 ms on and off for 700 ms.
- **No sleep pose exists.** The guide's "docked, the mibi sleeps" was never painted. Poses are derived from the Station's painting, so one cannot be painted per mibi here.

So both frames are **states of the existing active mibi screen and HUD**. They need no new art (§4).

## 2. "Home" (seated)

**When:** the Caddy reports seated, between expeditions.
- If a mibi is with you, the Companion goes to the active mibi screen of the lead (else the first carried), as a cut.
- With no mibi with you, it stays on its current screen, and only the HUD changes.
- Mid-expedition the existing "Docked mid-expedition" rules apply unchanged. No crates are sealed yet, so there is nothing new.

| Part | What | Timing (t from seated) |
| --- | --- | --- |
| The view | The stage and the mibi one palette step darker (the screen's `DARK` shade), the mibi held on idle frame 1 (no idle animation): resting, docked | 0, a cut |
| The message slot | "Docked · lift to explore" (as built) | 0 |
| The crate count (HUD) | One `cream` flash per sealed crate, behind the icon (20 × 18), 120 ms on, then 213 ms off, so the flashes keep the Station's 333 ms beat | 0.5 to 1.5 |
| As the Station confirms each crate | The count steps down by one (a cut). At zero the icon goes, as built (`S.bay.length` 0) | from the Station's opening, per crate |
| The bottom line | No ✓ cap (nothing to do while docked here but read). "← Mibis" as built | — |

## 3. "Off we go" (lifted)

**When:** the Caddy reports lifted, while the active mibi screen is showing. On any other screen, only the Shield flash plays, as built.

| Part | What | Timing (t from lifted) |
| --- | --- | --- |
| The view | Back to full brightness; the idle animation resumes; one Call hop (the existing hop, no chirp) | 0, then the hop at 0.2 |
| The message slot | "Off we go", in `bone` (the slot's panel with a `bone` line), 1500 ms, then gone | 0.2 to 1.7 |
| The Shield | The existing lift flash for the bars the Station mended | 0 to 0.7 |
| The carried set | The page dots as built: the carried mibis are what goes out | — |
| The bottom line | The undocked verbs as built ("✓ Walk together" once a world turn, "✓ Tend {name}", "← Mibis") | 0 |

The crate count keeps showing any unopened crates. They go out with the Companion (`specs/dock-moments.md` §2).

## 4. Art

**None is needed.** Every picture already exists: the mibi's derived HiBit frames, the crate icon, the message panel and the palette's `cream`, `mint` and `bone`.
- The guide's sleep pose stays unpainted. A sleep pose derived from the Station's painting would be a new derivation for the architect, not a Companion painting. The darker held frame stands in.
- If the owner wants the partner visibly asleep, that is a separate derivation ticket.

## 5. Words

| String | Where | Size | Limit |
| --- | --- | --- | --- |
| "Off we go" | message slot | 2× | the slot's 310 − 16 = 294 px |
| "Docked · lift to explore" | message slot | 2× (as built) | as built |

## 6. Build: T-20261016-93

The ticket carries the edits to `prototypes/exploration/index.html`, the seated and lifted events from the play page's Dock control (T-58), the tests and the captures.
