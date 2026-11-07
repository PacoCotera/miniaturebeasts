import { Link } from 'react-router-dom'
import { MODES, buildStudioUrl, type StudioUrl } from '../lib/url'
import { W } from '../lib/words'
import s from './ModeSwitch.module.css'

// Five quiet text tabs (keys 1-5). Only Shape is live.
export function ModeSwitch({ url }: { url: StudioUrl }) {
  return (
    <nav className={s.modes} aria-label="Mode">
      {MODES.map((m, i) => (
        <Link key={m} to={buildStudioUrl({ ...url, mode: m })} className={m === url.mode ? s.on : ''} aria-current={m === url.mode ? 'page' : undefined}>{W.modes[i]}</Link>
      ))}
    </nav>
  )
}
