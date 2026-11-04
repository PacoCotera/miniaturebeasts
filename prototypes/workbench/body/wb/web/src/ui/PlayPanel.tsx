import type { Species } from '../lib/api'
import { getAt, stepOf, type PlayToy } from '../lib/forms'
import s from './PlayPanel.module.css'

// "Show as player sees it": the toy this part feeds in play (spec 2.3), as the player has it: the toy's name, its chips (the family in force lit, in play's short words) and its slider with 7 stops.
// It is a picture of the player's choice, not a second set of controls: the fields come back when the menu item is turned off.
export function PlayPanel({ toy, species }: { toy: PlayToy; species: Species }) {
  const sl = toy.slider
  const v = sl ? Number(getAt(species.file, sl.ptr)) : NaN
  const at = sl && Number.isFinite(v) ? stepOf(v, sl.range, sl.steps) : null
  return (
    <section className={s.toy} aria-label={`${toy.toy}, as the player sees it`}>
      <b className={s.head}>{toy.toy}</b>
      {toy.chips.length > 0 && <div className={s.chips} role="list">{toy.chips.map((c) => <span key={c.family} role="listitem" className={s.chip} data-on={c.on || undefined}>{c.word}</span>)}</div>}
      {sl && at !== null && (
        <div className={s.slider} role="img" aria-label={`Slider, step ${at + 1} of ${sl.steps}`}>
          {Array.from({ length: sl.steps }, (_, i) => <i key={i} className={s.stop} data-on={i <= at || undefined} data-here={i === at || undefined} />)}
        </div>
      )}
    </section>
  )
}
