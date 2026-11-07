import { W } from '../lib/words'
import s from './Banner.module.css'

// The one-line lease banner in the inspector: who is editing, and the way to take over.
export function Banner({ who }: { who: string }) {
  return (
    <div className={s.banner}>
      <span className={s.dot} />{W.leaseBanner(who)}
      <button className={s.take} disabled>{W.takeOver}</button>
    </div>
  )
}
