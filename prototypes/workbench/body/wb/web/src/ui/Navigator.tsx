import { OUTLINE } from '../lib/outline'
import type { CheckRow, CheckMeta } from '../lib/checks'
import { stateOfPart } from '../lib/checks'
import type { StudioUrl } from '../lib/url'
import type { Species } from '../lib/api'
import { isAsleep, locusDot, selectedLocus } from '../lib/genes'
import { useQuery } from '@tanstack/react-query'
import { lookOf, ready, varietyOne, type VLook } from '../lib/variety'
import { goldensOne, groupsOf, pick, totalsLine } from '../lib/goldens'
import s from './Navigator.module.css'

const mono = (w: string) => { const p = w.split(' '); return p.length > 1 ? p[0][0] + p[1][0] : w.slice(0, 2) } // the rail's two letters: Limb length -> Ll, Limb girth -> Lg, Lift -> Li

// An outline of rows: parts (Shape), loci (Genes), looks (Variety), outputs (Goldens), sheets (Gate). Until the parts outline comes from the plan (chunk 21) Shape lists the spine's ranges and the appendages; a dot sits beside the part a check is about
// (red fails, amber needs a look). Below 1280 px it is an icon rail.
export function Navigator({ rail, url, go, rows, metas, species }: { rail: boolean; url: StudioUrl; go: (p: Partial<StudioUrl>) => void; rows: CheckRow[]; metas: Record<string, CheckMeta>; species?: Species }) {
  const g = species?.file.genome
  const cur = selectedLocus(g, url.sel)
  const vq = useQuery({ ...varietyOne(url.species, species?.hash ?? '', url.seed), enabled: !!species && url.mode === 'variety' })
  const sheet = vq.data
  const gq = useQuery({ ...goldensOne(url.species, species?.hash ?? ''), enabled: !!species && url.mode === 'goldens' })
  const gold = gq.data
  const gsel = url.mode === 'goldens' ? pick(gold, url.sel) : null
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
      {url.mode === 'variety' && sheet && (
        <>
          <section>
            <h6 className={s.head}>Looks on this sheet</h6>
            <ul className={s.tree}>
              {sheet.looks.map((l: VLook) => {
                const on = lookOf(sheet, url.sel)?.id === l.id
                return (
                  <li key={l.id}>
                    <button className={`${s.row} ${on ? s.sel : ''}`} onClick={() => go({ sel: on ? null : l.id })} aria-pressed={on} data-empty={l.count === 0 || undefined} title={`${l.label} · ${l.count} of ${sheet.n}`}>
                      <span className={s.mono}>{l.label.slice(0, 2)}</span>
                      <span className={s.label}>{l.label}</span>
                      <span className={s.num}>{l.count === 0 && l.age ? l.age : l.count}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
          <section>
            <h6 className={s.head}>Seed</h6>
            <ul className={s.tree}>
              <li><span className={`${s.row} ${s.plain}`}><span className={s.label}>{sheet.seed}</span><span className={s.num}>{ready(sheet)} of {sheet.n}</span></span></li>
            </ul>
          </section>
        </>
      )}
      {url.mode === 'goldens' && gold && (
        <>
          <p className={s.totals}>{totalsLine(gold.totals) || 'No goldens yet'}</p>
          {groupsOf(gold).map((grp) => (
            <section key={grp.name}>
              <h6 className={s.head}>{grp.name}</h6>
              <ul className={s.tree}>
                {grp.rows.map((e) => (
                  <li key={e.id}>
                    <button className={`${s.row} ${gsel?.id === e.id ? s.sel : ''}`} onClick={() => go({ sel: e.id })} aria-pressed={gsel?.id === e.id} title={`${e.label} · ${e.state}`}>
                      <span className={s.mono}>{e.output === 'turn' ? `${e.style?.[0]}${e.az}` : (e.label ?? e.id).slice(0, 2)}</span>
                      <span className={s.label}>{e.label}</span>
                      <i className={s.gdot} data-kind={e.state} aria-label={e.state} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
      {url.mode === 'genes' && g && g.chapters.map((c) => (
        <section key={c.id}>
          <h6 className={s.head}>{c.name}</h6>
          <ul className={s.tree}>
            {g.loci.filter((l) => l.chapter === c.id && !l.modifier).map((l) => {
              const dot = locusDot(species?.extremes, l.locus)
              const asleep = isAsleep(g, l)
              return (
                <li key={l.locus}>
                  <button className={`${s.row} ${cur?.locus === l.locus ? s.sel : ''}`} onClick={() => go({ sel: l.locus, proof: null })} aria-pressed={cur?.locus === l.locus} title={`${l.label} · ${l.locus}${asleep ? ' · asleep' : ''}`} data-asleep={asleep || undefined}>
                    <span className={s.mono}>{mono(l.short)}</span>
                    <span className={s.label}>{l.short}</span>
                    {asleep && <span className={s.zz}>asleep</span>}
                    {dot && <i className={s.dot} data-kind={dot === 'stale' ? 'stale' : 'fail'} aria-label={dot === 'fail' ? 'an end fails' : 'measured on an older file'} />}
                  </button>
                  {g.loci.filter((m) => m.modifier?.of === l.locus).map((m) => (
                    <button key={m.locus} className={`${s.row} ${s.nested} ${cur?.locus === m.locus ? s.sel : ''}`} onClick={() => go({ sel: m.locus, proof: null })} aria-pressed={cur?.locus === m.locus} title={`${m.label} · a modifier gene of this species`}>
                      <span className={s.label}>{m.label}</span>
                      <span className={s.zz}>modifier</span>
                    </button>
                  ))}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </aside>
  )
}
