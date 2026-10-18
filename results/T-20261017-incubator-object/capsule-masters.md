# The Incubator capsule: the masters for the Station (art director)

**The art authority:** the four house-style stills.
- closed and incubate: masters-pods cc402996, `concepts/incubator-capsule-hs/`;
- open and hatch now: this folder's `house-style/`.

All coordinates below are in those stills' 1024 × 600 frame. UI/UX's build spec places the capsule in each view and sets its reduction. Every master is cut once at this scale and reduced offline per view, never scaled at runtime, never mirrored.

## The layers

| Master | Size (at authority scale) | Cut from | Anchor |
| --- | --- | --- | --- |
| `capsule-room-day` | 1024 × 600 | closed: the painted sage wall and table, with the capsule removed | full frame |
| `capsule-room-dusk` | 1024 × 600 | incubate: the same, evening grade | full frame |
| `capsule-shell` | about 384 × 600 | closed: the slate body, roof-lamp housing and base, with the window and the bar area transparent | shell box x 322–706, y 0–600 |
| `capsule-interior-day` | the window's box, about 300 × 420 | **missing**: the lit back wall, the roof lamp's pool and the moss-and-soil bed, with NO pod | window box, moss line y ≈ 432 |
| `capsule-interior-dusk` | the same | **missing**: the same at dusk | the same |
| `capsule-glass-closed` | the window's box | closed: the glass reflections only, as alpha over the interior | window box |
| `capsule-door-open` | about 300 × 560 | open: the swung curved door, alpha | hinge at the shell's right edge, x ≈ 700 |
| `capsule-bar-on` | about 230 × 40 | closed: the mint bar and its glow, alpha | bar centre ≈ (512, 520) |
| `capsule-bar-off` | the same | incubate: the dark bar slot | the same |
| `capsule-seal-ring` | the window's box plus a 12 px glow | incubate: the mint ring and its glow, alpha | window box |

## What sits inside (drawn per mibi, not painted into the capsule)

- **The pod:** the pod renderer's own pod for that founder's species, not the painted Loika. That's why the interior must be empty.
  - Placement: the pod's foot on the moss line at about (512, 432), at the pod height the stills show (about 200 px at authority scale).
  - Relit to the roof lamp as `composite-juvenile.py` does: warm from above, shade below, a rim on top, a contact shadow on the moss, and the moss blades in front of the foot.
- **The hatchling:** the founder's own juvenile stand (layered, from `drawnLooks`), its feet on the moss at about (538, 432), at about 172 px at authority scale. This is a close-up, which the size table allows. It is relit in the same way.
- **The opened pod** for Hatch now: **missing.** The pod renderer has no opened state. It needs a new renderer layer set for the two shell halves and the tipped cap (shade, body mask, accent mask, pattern), painted once in neutral like the closed pod's layers, so every species' pod opens in its own colours.

## The states

| State | Room | Interior | Glass | Bar | Seal | Inside |
| --- | --- | --- | --- | --- | --- | --- |
| Growing (closed) | day | day | closed | on | off | the sealed pod |
| Open (empty, or the founder's pod being set in) | day | day | door open | on | off | the pod, or nothing |
| Incubate (sealed) | dusk | dusk | closed | off | on | the sealed pod |
| Hatch now | day | day | door open | on | off | the opened pod plus the juvenile |

## Registration

- The incubate still's camera sits about 15 px left of closed and open: its shell is at x 320–686 against 342–698.
- Cut every layer from closed's frame, and bring incubate's two layers (`capsule-room-dusk`, `capsule-seal-ring`) into it by that offset before cutting.
- Check each against the shell's outline (p95 ≤ 2 px).

## Missing, so to request

1. **The empty interiors, day and dusk.** Two studio edits: closed with the pod removed, then the same at dusk. The moss bed is repainted where the pod stood.
2. **The opened-pod renderer layers.** One studio painting of the halves and cap in neutral grey on magenta, cut into the pod layers like the closed pod's.

Everything else is cut from the four stills by the art director, with no painting.
