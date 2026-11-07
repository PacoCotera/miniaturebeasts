import { useRef } from 'react'
import { rangeBar, fmt, type Locus } from '../lib/genes'
import { barPos } from '../lib/forms'
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

// The small range bar under a field (studio-ui 3.2): a 2 px line for the range the plan allows, a band for hard limits where the field has them, a mark for the value and a tick for the default or type.
// The mark turns red while a check driven by this field fails. A press or a drag on the bar sets the value (the field's own step and range decide where it lands).
export function FieldBar({ range, value, band, tick, fail, label, onPick }: { range: [number, number]; value: number; band?: [number, number] | null; tick?: number | null; fail?: boolean; label: string; onPick?: (frac: number) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const at = (cx: number) => { const r = box.current!.getBoundingClientRect(); return Math.min(1, Math.max(0, (cx - r.left) / r.width)) }
  return (
    <div ref={box} className={s.fb} data-pick={onPick ? '' : undefined} role="img" aria-label={label}
      onPointerDown={onPick ? (e) => { e.currentTarget.setPointerCapture(e.pointerId); onPick(at(e.clientX)) } : undefined}
      onPointerMove={onPick ? (e) => { if (e.buttons) onPick(at(e.clientX)) } : undefined}>
      {band && <i className={s.fband} style={{ left: `${barPos(band[0], range)}%`, width: `${barPos(band[1], range) - barPos(band[0], range)}%` }} />}
      <i className={s.fline} />
      {tick != null && <i className={s.ftick} style={{ left: `${barPos(tick, range)}%` }} />}
      <i className={`${s.fmark} ${fail ? s.fail : ''}`} style={{ left: `${barPos(value, range)}%` }} />
    </div>
  )
}
