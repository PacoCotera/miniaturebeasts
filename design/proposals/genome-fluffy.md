# Genome extension for the fluffy species: Wickle, Drapet, Curlop

Genome engineer, Fri 30 Oct 2026 (America/Mexico_City). Owner's decision of 2026-10-30 12:38 (decisions.md): three new species, S17–S19 in clans C17–C19 (Reeds, Boulders, Ferns), and S05, S06 and S07 parked. Names are working names; the copywriter names them.

## The reading of the framework, checked

All four statements of the lead's reading hold, with two corrections. (1) The tail bend and the fur length are continuous loci (`copy-mean`), so a third bend value or a longer fur allele would widen the locus range, and the blend step (`stepValue`, 59 steps over the range) moves for every blend already stored and every stamp. That is not backward compatible; the extension is new loci. (2) Neither Wickle nor Curlop stands on its length axis in the rig: a serial body lies along X (only fans have `stand`). Both are tall, so the rig needs one more plan extra, `upright`.

## The rule that keeps every old frame exact

No existing record changes: no allele added to an existing locus, no range, guard or default changed for an existing plan. New records are new loci and part switches that only a frame that lists them carries. A frame lists an `absent` line for a record only when the record existed at the frame's version (`sinceFrame`, new, default 0); the new records are `sinceFrame: 6`, so S01–S16 keep their bytes (apart from the parked flag on S05–S07). The catalogue pin stays 10: no record of pin 10 changed, and a bump would rewrite `catalogue.version` in all sixteen frames. The new species are frame version 6.

## Per need: the smallest change, and how breeding sees it

**(a) Mixed limbs.** The plan key keeps its nine fields; `limbs` gains a fourth value, `mixed` (`none|free|contact` parse as today). `mixed` needs `groups` one and `pairs` one: one free front pair (arms, two links) over one contact hind pair. `limbSet` stays `legs` (the hind pair; posture `upright`, stations on the rear), and a new plan fact `armSet: arms` roots the front pair on the chest. States: those of a one-region legged plan, `hop` and `walk`. Arms reuse `growth.free-proximal-ratio`, `free-distal-ratio` and `free-radius-ratio` (their guards also read `arms`, false in every old plan). The hand is not a new allele of `anatomy.contact-terminal-form`: a new allele would enter every generated species' pool and the stamp's allele bins. The rig draws the hand from the arm (a palm and three fingers), sized by one new locus, `growth.hand-size-ratio` (small … plump). Open for Curlop (Hands); the arm lengths and the foot form are fixed per species.

**(b) Tail curl and a plume from the top.** One part switch, `anatomy.tail-curl-presence` (owner: the tail), and two loci it owns: `growth.tail-curl-turn` (extra turn along the tail, loose … tight; the sweep's curvature grows toward the tip, a fiddlehead) and `growth.tail-rise` (where the tail roots: `rear`, today's, or `crown`, the plume rising from the top and curling forward). The existing `growth.axial-tail-bend` stays down or up. The tip glow is `anatomy.tail-tip-bulb`, today C03's: it gains `alsoIn: [C17]` (the record's clan stays C03, so S03 is unchanged). Curl turn open for Curlop and Wickle (Curl); rise fixed per species (rear for Curlop, crown for Wickle); the glow's duration stays fixed.

**(c) Fur as a range to the floor, and a skirt.** `appearance.fur-length` stays the coat's depth. A new part switch `anatomy.fur-skirt-presence` (owner: fur) with `growth.fur-skirt-drop` (how far the fur hangs from the waist to the floor: knee … floor) and `growth.fur-skirt-flare` (overhang over the body's width). The rig draws a flared fur sheet from the waist; it is not the slug's `skirt.enabled` (a flat foot under the body). At floor length the skirt's footprint must cover every leg end or the build fails (the guard, in the rig), so a skirt that hides legs does. Drapet: skirt locked on, drop and flare open (Hang). Wickle: the base apron, same loci.

**(d) Brow tufts.** Part switch `anatomy.brow-tuft-presence` (owner: the head) and `growth.brow-tuft-length` (short … long). Any species may open the switch (a sleeping part when off, as the crest). Drapet carries it locked on, length open (Brows).

**The rig's `upright` extra.** Not a key field (it follows `stand`, `wave`, `join`). With it a one-region body's long axis is vertical: height from the size class, front-to-back from the depth ratio, width from the width ratio; the head sits fused on the front, tail and plume root by `growth.tail-rise`. Wickle: tapered, limbs none. Curlop: tapered, mixed. Drapet is not upright (a wide low body).

## What breeding sees

New loci: `growth.tail-curl-turn`, `growth.tail-rise`, `growth.fur-skirt-drop`, `growth.fur-skirt-flare`, `growth.brow-tuft-length`, `growth.hand-size-ratio`; new part switches: `anatomy.tail-curl-presence`, `anatomy.fur-skirt-presence`, `anatomy.brow-tuft-presence`. Alleles are two named ends each, blended on the step (`copy-mean`); the switches are dominant-enable like every part switch. Only the S17–S19 frames carry them. The target vocabulary gains Hang, Brows, Curl and Hands (working words, for the copywriter).

## Parked

`parked: true` on the S05, S06, S07 rows (and `species.parked` in their frames and the index). Nothing is deleted: frames, targets, glyphs and the stamp keep them, a save holding one loads. The Station's pools skip a species whose frame says `parked` (a follow-up: they are in the Station's code).

## Stopped on

Nothing: every need is met backward compatibly.
