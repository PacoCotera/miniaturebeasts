import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Species } from '../lib/api'
import { gateOne, pickSheet, shown, sheetUrl } from '../lib/gate'
import type { StudioUrl } from '../lib/url'
import { W } from '../lib/words'
import s from './GateStage.module.css'

// Gate mode's stage (studio-ui 4.3): the selected sheet at its own scale, scrolling. A sheet not drawn yet says it is waiting for a worker.
export function GateStage({ url, species, inset = 0 }: { url: StudioUrl; species: Species | undefined; inset?: number }) {
  const q = useQuery({ ...gateOne(url.species), enabled: !!species })
  const g = q.data
  const r = shown(g, url.rd)
  const sh = r ? pickSheet(r, url.sel) : null
  const [bad, setBad] = useState(false)
  useEffect(() => setBad(false), [sh?.url])
  if (!species || !g) return <main className={s.stage}>{q.isError && <p className={s.note}>{(q.error as Error).message}</p>}</main>
  return (
    <main className={s.stage} style={inset ? { paddingBottom: inset + 8 } : undefined}>
      {r && sh && (sh.url && !bad
        ? <div className={s.plate}><img className={s.img} src={sheetUrl(url.species, r.round, sh.on ?? sh.id)} alt={sh.label} onError={() => setBad(true)} /></div>
        : <p className={s.note}>{W.jobsWait}</p>)}
    </main>
  )
}
