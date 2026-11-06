import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { VIEWS, type View } from '../lib/url'
import { W } from '../lib/words'
import s from './ViewBar.module.css'

type Props = { view: View; onView: (v: View) => void; available: (v: View) => boolean; onBefore: (held: boolean) => void; canBefore: boolean; show: boolean }

// A floating pill on the hero, shown on hover or focus, and on tap for touch. Plush is not served yet, so it is disabled.
export function ViewBar({ view, onView, available, onBefore, canBefore, show }: Props) {
  return (
    <div className={s.bar} data-show={show || undefined} onPointerDown={(e) => e.stopPropagation()}>
      <ToggleGroup.Root type="single" value={view} onValueChange={(v) => v && onView(v as View)} className={s.group} aria-label="View">
        {VIEWS.map((v, i) => (
          <ToggleGroup.Item key={v} value={v} className={s.item} disabled={v === 'plush' || !available(v)}>{W.viewBar[i]}</ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
      <i className={s.sep} />
      <button className={s.item} disabled={!canBefore} onPointerDown={() => onBefore(true)} onPointerUp={() => onBefore(false)} onPointerLeave={() => onBefore(false)} onPointerCancel={() => onBefore(false)}>{W.before}</button>
    </div>
  )
}
