import type { Species } from '../lib/api'
import type { StudioUrl } from '../lib/url'
import s from './Stage.module.css'

// The centre area. It holds the plates from chunk 4; the shell's stage is empty.
export function Stage(_props: { url: StudioUrl; species: Species | undefined; go: (p: Partial<StudioUrl>, replace?: boolean) => void }) {
  return <main className={s.stage} />
}
