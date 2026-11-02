import { rangeBar, fmt, type Locus } from '../lib/genes'
import s from './RangeBar.module.css'

// One big range bar (studio-ui 4.3): the widest the locus may be set as the line, the hard limits as the band, the type as the mark. A failing end turns its cap red.
export function RangeBar({ locus, failing }: { locus: Locus; failing?: ('low' | 'high')[] }) {
  const b = rangeBar(locus)
  return (
    <div className={s.rb} role="img" aria-label={`${locus.label}: range ${fmt(b.r0)} to ${fmt(b.r1)}, limits ${fmt(b.lo)} to ${fmt(b.hi)}, type ${fmt(locus.type as number)}`}>
      <div className={s.track} />
      <div className={s.band} style={{ left: `${b.band[0]}%`, width: `${b.band[1] - b.band[0]}%` }} />
      {failing?.includes('low') && <i className={`${s.cap} ${s.fail}`} style={{ left: `${b.band[0]}%` }} />}
      {failing?.includes('high') && <i className={`${s.cap} ${s.fail}`} style={{ left: `${b.band[1]}%` }} />}
      <i className={s.mark} style={{ left: `${b.mark}%` }} />
      <span className={s.lab} style={{ left: 0, transform: 'none' }}>{fmt(b.r0)}</span>
      <span className={s.lab} style={{ left: `${b.band[0]}%` }}>{fmt(b.lo)}</span>
      <span className={s.lab} style={{ left: `${b.band[1]}%` }}>{fmt(b.hi)}</span>
      <span className={s.lab} style={{ right: 0, left: 'auto', transform: 'none' }}>{fmt(b.r1)}</span>
    </div>
  )
}
