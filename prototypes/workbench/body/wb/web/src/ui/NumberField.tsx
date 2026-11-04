import { useRef, useState } from 'react'
import { clamp, fmtVal, parseVal, scrub, snap, valText, type FieldDesc } from '../lib/forms'
import { FieldBar } from './RangeBar'
import s from './Field.module.css'

// A number: the label left, the value right, the range bar under it. Click the value or press Enter to type (Enter keeps it, Esc leaves it); drag the value sideways to scrub (Shift for fine); the arrows step it.
// The bar is the plan's range with the mark on the value; a press on it sets the value there. Whatever is typed goes to the server as it is: the server says if the plan will not have it. A scrub stays inside the range.
export function NumberField({ desc, value, onChange, editable, fail, error, saving, tick }: { desc: FieldDesc; value: number; onChange: (v: number) => void; editable: boolean; fail?: boolean; error?: string | null; saving?: boolean; tick?: number | null }) {
  const [typing, setTyping] = useState<string | null>(null)
  const [scrubbing, setScrubbing] = useState(false)
  const drag = useRef<{ x0: number; v0: number; moved: boolean } | null>(null)
  const step = desc.step ?? 0.01
  const range = desc.range ?? null
  const commit = (text: string) => {
    const n = parseVal(text, desc.unit)
    setTyping(null)
    if (text.trim() === fmtVal(value, desc.unit)) return                // what was shown, untouched: the file's own digits stay
    if (n !== null && n !== value) onChange(desc.type === 'int' ? Math.round(n) : n)
  }
  const unit = desc.unit ? <span className={s.unit}>{desc.unit}</span> : null
  return (
    <div className={s.f} data-field={desc.id}>
      <div className={s.row}>
        <span className={s.lab} id={`f-${desc.id}`}>{desc.label}</span>
        <span className={s.val}>
          {typing !== null ? (
            <input className={s.edit} autoFocus inputMode="decimal" aria-labelledby={`f-${desc.id}`} value={typing} onChange={(e) => setTyping(e.target.value)} onFocus={(e) => e.target.select()}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(typing); else if (e.key === 'Escape') setTyping(null) }} onBlur={() => commit(typing)} />
          ) : (
            <button className={s.num} aria-labelledby={`f-${desc.id}`} title={desc.help} disabled={!editable} data-scrub={scrubbing || undefined} data-saving={saving || undefined}
              onPointerDown={(e) => { if (!editable || e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x0: e.clientX, v0: value, moved: false } }}
              onPointerMove={(e) => {
                const d = drag.current
                if (!d || Math.abs(e.clientX - d.x0) < 4) return
                if (!d.moved) { d.moved = true; setScrubbing(true) }
                onChange(scrub(d.v0, e.clientX - d.x0, desc, e.shiftKey))
              }}
              onPointerUp={() => { const d = drag.current; drag.current = null; setScrubbing(false); if (d && !d.moved) setTyping(fmtVal(value, desc.unit)) }}
              onPointerCancel={() => { drag.current = null; setScrubbing(false) }}
              onKeyDown={(e) => {
                if (!editable) return
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTyping(fmtVal(value, desc.unit)) }
                const dir = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0
                if (dir) { e.preventDefault(); onChange(clamp(snap(value + dir * step * (e.shiftKey ? 10 : 1), step), range)) }
              }}>{fmtVal(value, desc.unit)}</button>
          )}
          {unit}
        </span>
      </div>
      {range && <FieldBar range={range} value={value} tick={tick} fail={fail} label={`${desc.full}: ${valText(value, desc.unit)}, the plan allows ${fmtVal(range[0], desc.unit)} to ${valText(range[1], desc.unit)}`}
        onPick={editable ? (f) => onChange(clamp(snap(range[0] + f * (range[1] - range[0]), step), range)) : undefined} />}
      {error && <p className={s.err} role="alert">{error}</p>}
    </div>
  )
}
