import { OUTLINE } from '../lib/outline'
import type { CheckRow, CheckMeta } from '../lib/checks'
import { stateOfPart } from '../lib/checks'
import type { StudioUrl } from '../lib/url'
import s from './Navigator.module.css'

// An outline of rows: parts (Shape), loci (Genes), looks (Variety), outputs (Goldens), sheets (Gate). Until the parts outline comes from the plan (chunk 21) Shape lists the spine's ranges and the appendages; a dot sits beside the part a check is about
// (red fails, amber needs a look). Below 1280 px it is an icon rail.
export function Navigator({ rail, url, go, rows, metas }: { rail: boolean; url: StudioUrl; go: (p: Partial<StudioUrl>) => void; rows: CheckRow[]; metas: Record<string, CheckMeta> }) {
  return (
    <aside className={`${s.nav} ${rail ? s.rail : ''}`} aria-label="Navigator">
      {url.mode === 'shape' && (
        <ul className={s.tree}>
          {OUTLINE.map((r) => {
            const st = stateOfPart(rows, metas, r.id)
            return (
              <li key={r.id}>
                <button className={`${s.row} ${url.sel === r.id ? s.sel : ''}`} onClick={() => go({ sel: url.sel === r.id ? null : r.id })} aria-pressed={url.sel === r.id} title={r.label}>
                  <span className={s.sw} style={r.sw ? { background: r.sw } : undefined} />
                  <span className={s.label}>{r.label}</span>
                  {st && <i className={s.dot} data-kind={st} aria-label={st === 'fail' ? 'fails a check' : 'needs a look'} />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
