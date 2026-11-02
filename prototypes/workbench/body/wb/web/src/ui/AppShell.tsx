import type { CSSProperties, ReactNode } from 'react'
import { useRail, usePortraitSheet } from '../lib/useStudio'
import { useUI } from '../lib/store'
import s from './AppShell.module.css'

// Top bar plus the workspace grid: navigator (232 px, an icon rail below 1280), the stage, the inspector (344 px; a sheet over the stage in portrait).
export function AppShell({ top, nav, stage, inspector, overlay }: { top: ReactNode; nav: ReactNode; stage: ReactNode; inspector: ReactNode; overlay?: ReactNode }) {
  const rail = useRail()
  const sheet = usePortraitSheet()
  const { navOpen, inspOpen } = useUI()
  const navW = !navOpen ? 0 : rail ? 56 : 232
  const inspW = sheet || !inspOpen ? 0 : 344
  const style = { '--nav-w': `${navW}px`, '--insp-w': `${inspW}px` } as CSSProperties
  return (
    <div className={s.app}>
      {top}
      <div className={s.work} style={style}>
        {nav}{stage}{inspector}
        {overlay}
      </div>
    </div>
  )
}
