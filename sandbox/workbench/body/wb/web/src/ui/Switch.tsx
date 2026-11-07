import type { FieldDesc } from '../lib/forms'
import s from './Field.module.css'

// On or off. The label is the field's; the switch says its state to a screen reader and by position and colour.
export function Switch({ desc, value, onChange, editable, error }: { desc: FieldDesc; value: boolean; onChange: (v: boolean) => void; editable: boolean; error?: string | null }) {
  return (
    <div className={s.f} data-field={desc.id}>
      <div className={s.row}>
        <span className={s.lab} id={`f-${desc.id}`}>{desc.label}</span>
        <button className={s.sw} role="switch" aria-checked={value} aria-labelledby={`f-${desc.id}`} title={desc.help} disabled={!editable} onClick={() => onChange(!value)} />
      </div>
      {error && <p className={s.err} role="alert">{error}</p>}
    </div>
  )
}
