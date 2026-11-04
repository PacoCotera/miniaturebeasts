import type { PlayAxis, PlayToy } from '../lib/forms'
import s from './PlayPanel.module.css'

// "Show as player sees it": the toys this part feeds in play (spec 2.3), as the player has them. Each toy is its name, then its axes: chips (the one the mibi has lit), a slider of steps, or the paint pots.
// A step the safe-step sweep trimmed is shown struck through, and under it the sentence the mibi says when the player pushes that far. It is a picture of the player's choice, not a second set of controls.
type Props = { toys: PlayToy[]; sentences?: Record<string, string>; hold?: string }

const sentenceFor = (why: string[], sentences?: Record<string, string>) => (why.length ? (sentences?.[why[0]] ?? sentences?.default ?? '') : '')

function Chips({ ax, sentences }: { ax: PlayAxis; sentences?: Record<string, string> }) {
  const off = (ax.options ?? []).find((o) => !o.ok)
  return (
    <>
      <div className={s.chips} role="list" aria-label={ax.label}>
        {(ax.options ?? []).map((o) => <span key={o.id} role="listitem" className={s.chip} data-on={o.id === ax.home || undefined} data-trimmed={!o.ok || undefined} title={o.ok ? undefined : `Trimmed: ${o.why.join(', ')}`}>{o.word}</span>)}
      </div>
      {off && <p className={s.says}>“{sentenceFor(off.why, sentences)}”</p>}
    </>
  )
}

function Slider({ ax, sentences }: { ax: PlayAxis; sentences?: Record<string, string> }) {
  const st = ax.steps ?? []
  const home = Number(ax.home)
  const cut = st.find((x) => !x.ok)
  return (
    <>
      <small className={s.axis}>{ax.label}</small>
      <div className={s.slider} style={{ gridTemplateColumns: `repeat(${st.length}, 1fr)` }} role="img" aria-label={`${ax.label}: step ${home + 1} of ${st.length}${cut ? `, ${st.filter((x) => !x.ok).length} trimmed` : ''}`}>
        {st.map((x) => <i key={x.i} className={s.stop} data-on={x.i <= home || undefined} data-here={x.i === home || undefined} data-trimmed={!x.ok || undefined} title={x.ok ? `${x.value}${ax.unit ?? ''}` : `Trimmed: ${x.why.join(', ')}`} />)}
      </div>
      {cut && <p className={s.says}>“{sentenceFor(cut.why, sentences)}”</p>}
    </>
  )
}

function Pots({ ax }: { ax: PlayAxis }) {
  return (
    <div className={s.pots} role="list" aria-label={ax.label}>
      {(ax.steps ?? []).map((x) => <span key={x.i} role="listitem" className={s.pot} style={{ background: `hsl(${x.value} 55% 58%)` }} data-on={x.i === Number(ax.home) || undefined} data-trimmed={!x.ok || undefined} title={`${Math.round(x.value)}°`} />)}
    </div>
  )
}

export function PlayPanel({ toys, sentences }: Props) {
  return (
    <>
      {toys.map((t) => (
        <section key={t.id} className={s.toy} aria-label={`${t.label}, as the player sees it`} data-hidden={t.hidden || undefined}>
          <b className={s.head}>{t.label}{t.hidden && <small> · hidden in this species</small>}</b>
          {t.axes.map((ax) => ax.kind === 'choice' ? <Chips key={ax.id} ax={ax} sentences={sentences} /> : t.kind === 'pots' ? <Pots key={ax.id} ax={ax} /> : <Slider key={ax.id} ax={ax} sentences={sentences} />)}
        </section>
      ))}
    </>
  )
}
