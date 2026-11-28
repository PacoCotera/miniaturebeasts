// The map's signs as pictures: drawSign lays a sign on its cell of the full map, signSprite gives the picture the reach view and the opening place in a cell
// (at 2× on the reach's 72 px cells), up2 is a picture at 2×.
// The pixel core is still the page's: it hands in what these draw with once as `env` (blit, the icons and the art makers, the full map's cell size).
export function makeMapSigns(env) {
  const { blit, ICON, BADGE, podArt, propPiece, upArt, pawsTurned, spOf, CELL } = env;
  const pawCol = s => s.sp != null ? spOf(s.sp).col.body : 'bone';
  const up2 = (key, pb) => upArt('s2' + key, pb, 2);
  // (px, py): the cell's top-left on the screen. s: the sign ({ rm: its light table, sp, lit, dew }). The player's own pins are not drawn here: the full map lays them last.
  function drawSign(kind, s, px, py, fr) {
    if (kind === 'pod') blit(podArt('bone', 1), px + 1, py + 1, s.rm);
    else if (kind === 't' && s.dew) { const pb = pawsTurned(s.dew.h); blit(pb, px + ((CELL - pb.w) >> 1), py + ((CELL - pb.h) >> 1), s.rm); }   // the dew's prints, turned
    else if (kind === 't') { const paw = ICON.paw(pawCol(s)); blit(paw, px + 2, py + 15, s.rm); blit(paw, px + 8, py + 9, s.rm); }
    else if (kind === 'b') blit(ICON.beat(s.rm ? 0 : fr), px + 2, py, s.rm);
    else if (kind === 'k') blit(ICON.bolt(), px + 13, py + 2, s.rm);
    else if (kind === 'kw') blit(ICON.boltHollow(), px + 11, py + 1);
    else if (kind === 'deep') blit(BADGE(), px + 4, py + 4, s.rm);
    else if (kind === 'burrow') blit(ICON.burrow(0), px + 5, py + 6);
    else if (kind === 'water') blit(ICON.wave(), px + 5, py + 7);
    else if (kind === 'soft') blit(ICON.mud(), px + 5, py + 7);
    else if (kind === 'bank') blit(ICON.bankLip(0), px + 5, py + 7);
    else if (kind === 'beacon') blit(ICON.beacon(s.lit, fr), px + 1, py + 1);
    else if (kind === 'skull') blit(ICON.skull(), px + 11, py + 11);
    else if (kind === 'depot') blit(ICON.depot(s.lit, fr), px + 6, py + 3);
  }
  function signSprite(kind, s, fr, big) {
    const sc = (key, pb) => big ? up2(key, pb) : pb;
    switch (kind) {
      case 'pod': return podArt('bone', 1);   // 12×14 in its 16×20 box, always 1×
      case 't': return sc('paw' + pawCol(s), ICON.paw(pawCol(s)));
      case 'b': return ICON.beat(fr);
      case 'k': return sc('bolt', ICON.bolt());
      case 'kw': return sc('boltH', ICON.boltHollow());
      case 'pin': return ICON.pin();
      case 'skull': return sc('skull', ICON.skull());
      case 'depot': return big ? propPiece('icon-depot-' + ['dark', 'ember', 'half', 'full'][s.lit | 0] + 'x2') : ICON.depot(s.lit, fr);   // the painted icon, each pixel a whole block at 2×
      case 'beacon': return big ? propPiece((s.lit ? 'icon-beacon-lit' : 'icon-beacon-unlit') + 'x2') : ICON.beacon(s.lit, fr);
      case 'burrow': return sc('burrow', ICON.burrow(0));
      case 'water': return sc('wave', ICON.wave());
      case 'soft': return sc('mud', ICON.mud());
      case 'bank': return sc('bankLip', ICON.bankLip(0));
      case 'deep': return BADGE();
    }
    return null;
  }
  return { drawSign, signSprite, up2 };
}
