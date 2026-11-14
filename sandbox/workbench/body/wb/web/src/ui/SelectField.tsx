import { optName, type FieldDesc } from '../lib/forms'
import s from './Field.module.css'

// A choice of more than three: a plain select, so the platform's own list opens on a phone and a tablet.
export function SelectField({ desc, value, onChange, editable, error }: { desc: FieldDesc; value: string; onChange: (v: string) => void; editable: boolean; error?: string | null }) {
  return (
    <div className={s.f} data-field={desc.id}>
      <div className={s.row}>
        <label className={s.lab} htmlFor={`f-${desc.id}`}>{desc.label}</label>
        <select id={`f-${desc.id}`} className={s.sel} value={value} disabled={!editable} title={desc.help} onChange={(e) => onChange(e.target.value)}>
          {(desc.options ?? []).map((o) => <option key={o} value={o}>{optName(desc, o)}</option>)}
        </select>
      </div>
      {error && <p className={s.err} role="alert">{error}</p>}
    </div>
  )
}
