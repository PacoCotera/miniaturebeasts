import { optName, pct, rebalance, type FieldDesc } from '../lib/forms'
import s from './Field.module.css'

// How often each family shows: one row for each, its short word, a slider and the share. The shares always add up to 1: moving one takes from the others in proportion.
export function WeightsField({ desc, value, onChange, editable, error }: { desc: FieldDesc; value: number[]; onChange: (v: number[]) => void; editable: boolean; error?: string | null }) {
  const opts = desc.options ?? []
  return (
    <div className={s.f} data-field={desc.id}>
      <div className={s.row}><span className={s.lab} id={`f-${desc.id}`} title={desc.help}>{desc.label}</span></div>
      <div className={s.wts} role="group" aria-labelledby={`f-${desc.id}`}>
        {opts.map((o, i) => (
          <label key={o} className={s.wt}>
            <span>{optName(desc, o)}</span>
            <input type="range" min={0} max={1} step={0.01} value={value[i] ?? 0} disabled={!editable} aria-label={`${optName(desc, o)}: ${pct(value[i] ?? 0)}`} style={{ ['--p' as string]: `${(value[i] ?? 0) * 100}%` }}
              onChange={(e) => onChange(rebalance(value, i, Number(e.target.value)))} />
            <span className={s.wv}>{pct(value[i] ?? 0)}</span>
          </label>
        ))}
      </div>
      {error && <p className={s.err} role="alert">{error}</p>}
    </div>
  )
}
