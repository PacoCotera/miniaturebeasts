import { OUTLINE } from '../lib/outline'
import type { CheckRow, CheckMeta } from '../lib/checks'
import { stateOfPart } from '../lib/checks'
import type { StudioUrl } from '../lib/url'
import type { Species } from '../lib/api'
import { locusDot, selectedLocus } from '../lib/genes'
import s from './Navigator.module.css'

const mono = (w: string) => { const p = w.split(' '); return p.length > 1 ? p[0][0] + p[1][0] : w.slice(0, 2) } // the rail's two letters: Limb length -> Ll, Limb girth -> Lg, Lift -> Li

// An outline of rows: parts (Shape), loci (Genes), looks (Variety), outputs (Goldens), sheets (Gate). Until the parts outline comes from the plan (chunk 21) Shape lists the spine's ranges and the appendages; a dot sits beside the part a check is about
// (red fails, amber needs a look). Below 1280 px it is an icon rail.
export function Navigator({ rail, url, go, rows, metas, species }: { rail: boolean; url: StudioUrl; go: (p: Partial<StudioUrl>) => void; rows: CheckRow[]; metas: Record<string, CheckMeta>; species?: Species }) {
  const g = species?.file.genome
  const cur = selectedLocus(g, url.sel)
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
      {url.mode === 'genes' && g && g.chapters.map((c) => (
        <section key={c.id}>
          <h6 className={s.head}>{c.name}</h6>
          <ul className={s.tree}>
            {g.loci.filter((l) => l.chapter === c.id).map((l) => {
              const dot = locusDot(species?.extremes, l.locus)
              return (
                <li key={l.locus}>
                  <button className={`${s.row} ${cur?.locus === l.locus ? s.sel : ''}`} onClick={() => go({ sel: l.locus, proof: null })} aria-pressed={cur?.locus === l.locus} title={`${l.label} · ${l.locus}`}>
                    <span className={s.mono}>{mono(l.short)}</span>
                    <span className={s.label}>{l.short}</span>
                    {dot && <i className={s.dot} data-kind={dot === 'stale' ? 'stale' : 'fail'} aria-label={dot === 'fail' ? 'an end fails' : 'measured on an older file'} />}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </aside>
  )
}
