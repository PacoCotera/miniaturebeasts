import { useQuery } from '@tanstack/react-query'
import type { Species } from '../lib/api'
import { ageLine, copyRule, expressionsOf, locusById, needLine, orderLine, stageWord, type Genome, type Locus } from '../lib/genes'
import { crossCount, failLine, lookOf, loudLine, shortWord, varietyOne, type VLook, type Variety } from '../lib/variety'
import type { StudioUrl } from '../lib/url'
import { GenomeString, ModifierBox } from './Expressions'
import s from './VarietyInspector.module.css'

// Variety mode's inspector (studio-ui 4.3): the selected look's rule and how often it shows, or the selected tile's genome; a card for each tile that breaks a rule.
// The three bars are the look's own share: on this sheet, in the wild, in a cross with a sample mate (the same counts as Genes, which shows them as stacked bars for the whole locus).
function Bar({ label, value, text, tip }: { label: string; value: number; text: string; tip: string }) {
  return (
    <div className={s.row} title={tip}>
      <label>{label}</label>
      <div className={s.bar} role="img" aria-label={tip}><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
      <span className={s.num}>{text}</span>
    </div>
  )
}
const wildText = (v: number) => `${v >= 10 || Number.isInteger(v) ? Math.round(v) : v.toFixed(1)}%`

function Often({ v, l }: { v: Variety; l: VLook }) {
  return (
    <div className={s.sec}>
      <p className={s.h}>How often</p>
      <Bar label="Sheet" value={(100 * l.count) / v.n} text={`${l.count}/${v.n}`} tip={`${l.count} of ${v.n} on this sheet`} />
      <Bar label="Wild" value={l.wild} text={wildText(l.wild)} tip={`${wildText(l.wild)} of ${v.wild_n.toLocaleString('en-US')} wild pods`} />
      <Bar label="Cross" value={l.cross} text={`${crossCount(l)}/${l.cross_of}`} tip={`${crossCount(l)} of ${l.cross_of} young: the type crossed with a sample parent`} />
    </div>
  )
}

function LookRule({ species, v, l, locus }: { species: Species; v: Variety; l: VLook; locus: Locus | null }) {
  const g = species.file.genome as Genome
  const xs = locus ? expressionsOf(species.file.expressions, locus.locus).filter((x) => x.look === l.look) : []
  const age = xs.map((x) => ageLine(x)).find(Boolean)
  const needs = xs.map((x) => needLine(g, x)).find(Boolean)
  const shared = locus?.scope === 'trunk'
  return (
    <>
      <div className={s.title}><b>{l.label}</b><span className={s.kind}>{l.trait}</span></div>
      {locus && locus.op !== 'blend' && (
        <div className={s.lock}>
          <div className={s.field}><label>Shows</label><span className={s.v}>{locus.order?.length ? orderLine(locus.order.map((o) => shortWord(species.file.variety?.look_words, locus.locus, o))) : copyRule(locus)}{shared && <i className={s.padlock} aria-label="locked" />}</span></div>
          {shared && <p className={s.help}>Shared trait: the catalogue sets how it shows.</p>}
          {shared && <ModifierBox species={species} l={locus} />}
        </div>
      )}
      {age && <div className={s.field}><label>From age</label><span className={s.v}>{stageWord(xs.find((x) => x.age)!.age!.from)}</span></div>}
      {needs && <div className={s.field}><label>Needs</label><span className={s.v}>{needs.replace(/^Needs · /, '')}</span></div>}
      <Often v={v} l={l} />
      {l.count === 0 && l.age && <p className={s.help}>Not on this sheet: it shows {l.age === 'adult' ? 'when grown' : `from ${stageWord(l.age as 'juvenile' | 'adult' | 'elder')}`}.</p>}
    </>
  )
}

function Cards({ v, go, only }: { v: Variety; go: (p: Partial<StudioUrl>) => void; only?: number }) {
  const rows = v.individuals.filter((i) => i.fails.length && (only === undefined || i.n === only))
  if (!rows.length) return null
  return (
    <div className={s.cards}>
      {rows.flatMap((i) => i.fails.map((f) => (
        <div key={`${i.n}-${f.rule}`} className={s.card}>
          <div className={s.head}><i className={s.dot} /><b>{failLine(i.n, f)}</b></div>
          <p className={s.measureLine}>{f.label}</p>
          <div className={s.acts}><button onClick={() => go({ ind: i.n, sel: null })} aria-pressed={only === i.n}>Open No. {i.n}</button></div>
        </div>
      )))}
    </div>
  )
}

export function VarietyInspector({ species, url, go }: { species: Species; url: StudioUrl; go: (p: Partial<StudioUrl>) => void }) {
  const q = useQuery({ ...varietyOne(url.species, species.hash, url.seed) })
  const v = q.data
  if (!v) return <p className={s.help}>{q.isError ? (q.error as Error).message : 'Counting…'}</p>
  const g = species.file.genome as Genome
  const look = lookOf(v, url.sel)
  const ind = url.ind ? v.individuals.find((i) => i.n === url.ind) : null
  if (ind) {
    return (
      <>
        <div className={s.title}><b>No. {ind.n}</b><span className={s.kind}>{ind.genome}</span></div>
        <p className={s.help}>{loudLine(ind.loud, ind.hue)}</p>
        <Cards v={v} go={go} only={ind.n} />
        <GenomeString species={species} ind={ind.n} genome={ind.genome} />
      </>
    )
  }
  if (look) {
    return (
      <>
        <LookRule species={species} v={v} l={look} locus={locusById(g, look.locus)} />
        <Cards v={v} go={go} />
      </>
    )
  }
  const rule = v.rules[0]
  return (
    <>
      <div className={s.title}><b>{species.file.name ?? species.id}</b><span className={s.kind}>seed {v.seed}</span></div>
      <p className={s.help}>{v.n} mibis. {v.failing.length ? '' : v.rules.length ? `${v.rules.map((r) => r.label).join(', ')} hold${v.rules.length === 1 ? 's' : ''} for all ${v.n}.` : ''}</p>
      {rule && <p className={s.help}>{rule.label} fails on: {rule.fail}.</p>}
      <Cards v={v} go={go} />
    </>
  )
}
