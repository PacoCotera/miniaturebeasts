import { useQuery } from '@tanstack/react-query'
import type { Species } from '../lib/api'
import { causeText, goldensOne, pctText, pick, sizeText, type GCause } from '../lib/goldens'
import { clock, fmtValue, initials } from '../lib/edits'
import type { StudioUrl } from '../lib/url'
import { W } from '../lib/words'
import s from './GoldensInspector.module.css'

// Goldens mode's inspector (studio-ui 4.3): what moved (the pixels, the field or framework commit that changed the key), then the stamp the golden was made from, then the draft line.
const STATE_WORD = { same: 'Same', changed: 'Changed', missing: 'Missing', stale: 'Stale' } as const
const day = (t: string) => { const d = new Date(t); return Number.isNaN(d.getTime()) ? t : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }

// One "Because of" row names the first cause (the field, or the framework or look-dev commit); a quiet line under it gives each cause's old and new value.
function Because({ causes }: { causes: GCause[] }) {
  const c = causes[0]
  const first = c.kind === 'file' ? causeText(c) : String(c.new).slice(0, 8)
  return (
    <>
      <div className={s.field}><label>{W.gold.because}</label><span className={s.v}><code>{first}</code></span></div>
      {causes.map((x, i) => (
        <p key={i} className={s.quiet}>
          {x.kind === 'file' ? (x.field ? `${fmtValue(x.old)} → ${fmtValue(x.new)}${x.by ? `, ${x.by === 'file' ? 'file edit' : x.by}` : ''}${x.at ? `, ${clock(x.at)}` : ''}` : 'The file changed') : `${causeText(x)} ${String(x.old).slice(0, 8)} → ${String(x.new).slice(0, 8)}`}
        </p>
      ))}
    </>
  )
}

export function GoldensInspector({ species, url }: { species: Species; url: StudioUrl }) {
  const q = useQuery({ ...goldensOne(url.species, species.hash) })
  const g = q.data
  if (!g) return <p className={s.help}>{q.isError ? (q.error as Error).message : '…'}</p>
  const e = pick(g, url.sel)
  const st = g.stamp
  return (
    <>
      {e && <div className={s.title}><b>{e.label?.split(' · ')[0] ?? e.id}</b><span className={s.kind}>{[e.age, e.pose, sizeText(e)].filter(Boolean).join(' · ')}</span></div>}
      {e && <div className={s.field}><label>{W.gold.state}</label><span className={s.v}><i className={s.dot} data-kind={e.state} />{STATE_WORD[e.state]}</span></div>}
      {e?.state === 'changed' && e.pct !== undefined && <div className={s.field}><label>{W.gold.moved}</label><span className={s.v}>{pctText(e.pct)}</span></div>}
      {(e?.state === 'changed' || e?.state === 'stale') && g.causes.length > 0 && <Because causes={g.causes} />}
      {st && (
        <>
          <h6 className={s.h}>{W.gold.from}</h6>
          <div className={s.field}><label>{W.gold.file}</label><span className={s.v}><code>{st.file.slice(0, 8)}</code></span></div>
          <div className={s.field}><label>{W.gold.framework}</label><span className={s.v}><code>{st.framework.slice(0, 7)}</code></span></div>
          <div className={s.field}><label>{W.gold.lookdev}</label><span className={s.v}><code>{st.lookdev}</code></span></div>
          <div className={s.field}><label>{W.gold.by}</label><span className={s.v}>{initials(st.made_by)}, {day(st.made_at)}</span></div>
          {!g.release && <p className={s.draft}><i />{W.gold.draft}</p>}
        </>
      )}
    </>
  )
}
