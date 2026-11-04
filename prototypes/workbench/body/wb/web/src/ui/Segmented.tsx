import type { FieldDesc } from '../lib/forms'
import s from './Field.module.css'

// A choice of up to three: the options side by side, the one in force lit (the studio's own words for them, sentence case).
const word = (o: string) => o.charAt(0).toUpperCase() + o.slice(1).replace(/-/g, ' ')
export function Segmented({ desc, value, onChange, editable, error }: { desc: FieldDesc; value: string; onChange: (v: string) => void; editable: boolean; error?: string | null }) {
  return (
    <div className={s.f} data-field={desc.id}>
      <div className={s.row}>
        <span className={s.lab} id={`f-${desc.id}`}>{desc.label}</span>
        <span className={s.seg} role="radiogroup" aria-labelledby={`f-${desc.id}`} title={desc.help}>
          {(desc.options ?? []).map((o) => <button key={o} role="radio" aria-checked={o === value} disabled={!editable} onClick={() => o !== value && onChange(o)}>{word(o)}</button>)}
        </span>
      </div>
      {error && <p className={s.err} role="alert">{error}</p>}
    </div>
  )
}
