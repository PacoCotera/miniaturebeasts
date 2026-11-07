import { AZS, type Az } from '../lib/url'
import { Plate } from './Plate'
import type { Frame } from '../lib/frames'
import s from './AngleStrip.module.css'

// The four clay proxies (az 0, 32, 90, 180). Click, or ← →, puts one on the hero.
export function AngleStrip({ az, onAz, frames, progress, w, h }: { az: Az; onAz: (a: Az) => void; frames: Record<number, Frame>; progress: number | 'indeterminate' | null; w: number; h: number }) {
  return (
    <div className={s.strip} role="group" aria-label="Angle">
      {AZS.map((a) => {
        const f = frames[a]
        return (
          <button key={a} className={`${s.fig} ${a === az ? s.on : ''}`} onClick={() => onAz(a)} aria-pressed={a === az}>
            <Plate src={f?.src ?? null} kind="clay" width={w} height={h} stale={!!f?.src && f.stale} progress={f?.stale ? progress : null} className={s.p} />
            <span className="num">{a}</span>
          </button>
        )
      })}
    </div>
  )
}
