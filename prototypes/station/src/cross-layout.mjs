// The splice's geometry (prototypes/ui/specs/station/cross.json, station-layouts.md "Cross: the splice"): where every chapter and locus row of the overview sits, at what pitch,
// and where every trait row of a chapter view sits. Pure arithmetic on counts, so every frame can be checked at its worst (every locus at play).

// The overview. `chapters`: [{ id, state: "open" | "unread" | "sealed", loci: [{ id, play }] }] in ring order (play matters only in an open chapter). A locus at play gets the play pitch;
// a settled locus, a locus of an unread chapter and a sealed locus fold to the quiet 4 px. A chapter is at least 24 tall. The play pitch is the largest of 16 down to 10 at which the
// rows fit the 440, first with 8 px between chapters, then with 4 (cross.json regions.overview.pitch, gap, chapterMin). Returns { pitch, gap, height, fits, chapters: [{ id, state, y, h, rows: [{ id, y, h, play }] }] }.
export function overviewPlan(chapters, spec) {
  const O = spec.regions.overview, P = O.pitch, [gapBig, gapSmall] = O.gap, room = O.rows[3], top = O.rows[1], min = O.chapterMin;
  const hOf = (c, pitch) => Math.max(min, c.loci.reduce((n, l) => n + (c.state === "open" && l.play ? pitch : P.quiet), 0));
  const total = (pitch, gap) => chapters.reduce((n, c) => n + hOf(c, pitch), 0) + gap * Math.max(0, chapters.length - 1);
  let pitch = P.playMin, gap = gapSmall, fits = false;
  search: for (const g of [gapBig, gapSmall]) for (let p = P.playMax; p >= P.playMin; p--) if (total(p, g) <= room) { pitch = p; gap = g; fits = true; break search; }
  let y = top;
  const out = chapters.map((c) => {
    const h = hOf(c, pitch); let ry = y;
    const rows = c.loci.map((l) => { const play = c.state === "open" && !!l.play, rh = play ? pitch : P.quiet, row = { id: l.id, y: ry, h: rh, play }; ry += rh; return row; });
    const r = { id: c.id, state: c.state, y, h, rows }; y += h + gap; return r;
  });
  return { pitch, gap, height: total(pitch, gap), fits, chapters: out };
}

// A chapter view: each trait's row is 64 tall plus 8 for each locus after its first, stacked from y 160. The 1 px rule between rows is drawn on the first pixel of the next row, so the
// stack is the sum of the heights and the tallest chapter (S09's Coat, 392) fills the 392 and no more.
export function chapterPlan(traits, spec) {
  const T = spec.regions.chapter.trait, top = spec.regions.chapter.rows[1]; let y = top;
  const rows = traits.map((t) => { const h = T.h + T.perLocus * Math.max(0, t.loci - 1), r = { id: t.id, y, h, loci: t.loci }; y += h; return r; });
  return { rows, height: y - top, fits: y - top <= spec.regions.chapter.rows[3] };
}
