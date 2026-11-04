import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { freqOne, getToken, patchSpecies, stringOne, type Species } from '../lib/api'
import { ageLine, barSegments, expressionsOf, GROUPS, grouped, isModifier, labelOf, modifierLine, modifiersOf, needLine, newModifier, orderLine, pct, STAGES, stageWord, type Genome, type Locus, type Stage } from '../lib/genes'
import s from './Expressions.module.css'

// Chapter 9 in the Genes inspector: how often each look shows (wild, this sheet, a cross), the expressions of the locus with their rules, a modifier gene on a shared locus, and the genome string of the selected mibi.
// Counts come from the file alone (no build, no render): `GET /api/species/<id>/freq`.
const useFreq = (sp: Species) => useQuery(freqOne(sp.id, sp.hash))
const BAR_TONE = ['t0', 't1', 't2', 't3', 't4', 't5']

export function HowOften({ species, l }: { species: Species; l: Locus }) {
  const q = useFreq(species)
  const f = q.data?.loci[l.locus]
  if (isModifier(l) || l.op === 'blend' && !l.bins) return null
  if (!f) return <div className={s.sec}><p className={s.h}>How often</p><p className={s.note}>{q.isError ? 'The counts are not ready.' : 'Counting…'}</p></div>
  const n = q.data!.n
  return (
    <div className={s.sec}>
      <p className={s.h}>How often</p>
      {GROUPS.filter((g) => n[g.id] > 0).map((g) => (
        <div key={g.id} className={s.row} title={`${g.word}: ${barSegments(f, g.id).map((x) => `${x.look} ${pct(x.pct)}`).join(', ')}`}>
          <label>{g.word}</label>
          <div className={s.bar} role="img" aria-label={`${g.word}: ${barSegments(f, g.id).map((x) => `${x.look} ${pct(x.pct)}`).join(', ')}`}>
            {barSegments(f, g.id).map((x) => <i key={x.look} className={x.tone < 0 ? s.zz : s[BAR_TONE[x.tone % BAR_TONE.length]]} style={{ width: `${x.pct}%` }} />)}
          </div>
        </div>
      ))}
      <div className={s.legend}>
        {[...f.looks, ...(GROUPS.some((g) => (f[g.id]?.asleep ?? 0) > 0) ? ['asleep'] : [])].map((look, i) => (
          <span key={look}><i className={look === 'asleep' ? s.zz : s[BAR_TONE[i % BAR_TONE.length]]} />{look} {pct(f.wild[look] ?? 0)}</span>
        ))}
      </div>
      <p className={s.note}>Wild: {n.wild.toLocaleString()} drawn from the pools. Sheet: {n.sheet || 'no'} mibis. Cross: {n.cross} seeds of the type with a mate.</p>
    </div>
  )
}

export function ExpressionRules({ species, l }: { species: Species; l: Locus }) {
  const g = species.file.genome as Genome
  const xs = expressionsOf(species.file.expressions, l.locus)
  const [stage, setStage] = useState<Stage>('adult')
  const q = useFreq(species)
  if (!xs.length) return null
  return (
    <div className={s.sec}>
      <p className={s.h}>Looks with rules</p>
      {xs.some((x) => x.age) && (
        <div className={s.seg} role="group" aria-label="Life stage">
          {STAGES.map((st) => <button key={st.id} aria-pressed={stage === st.id} onClick={() => setStage(st.id)}>{st.word}</button>)}
        </div>
      )}
      {xs.map((x) => {
        const ef = q.data?.expressions[x.id]
        const rule = l.op === 'pair-map' ? `Shows · ${orderLine(l.order)}` : null
        return (
          <div key={x.id} className={s.x} data-expression={x.id}>
            <div className={s.xh}><b>{x.label ?? x.id}</b><span className={s.tag}>{x.loud ? 'loud · ' : ''}{x.look}</span></div>
            {rule && <p className={s.rule}>{rule}</p>}
            {ageLine(x) && <p className={s.rule}>{ageLine(x)}{x.age?.grow ? (x.age.grow === 0.5 ? ' · full size half way through' : ` · full size ${Math.round(x.age.grow * 100)}% of the way through`) : ''}</p>}
            {needLine(g, x) && <p className={s.rule}>{needLine(g, x)}</p>}
            {GROUPS.filter((gr) => (q.data?.n[gr.id] ?? 0) > 0 && ef?.[gr.id]).map((gr) => {
              const v = ef![gr.id]![stage]
              return (
                <div key={gr.id} className={s.row}>
                  <label>{gr.word}</label>
                  <div className={s.cell} title={`${gr.word}: ${pct(v)} at ${stageWord(stage)}`}>
                    <div className={s.bar}><i className={s.fill} style={{ width: `${v}%` }} /></div>
                    <span className={s.num}>{pct(v)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// "Add a modifier" (owner ruling 1): a gene of this species that changes how a shared locus shows. A pair map is given a new first look; a switch the other copy rule. It is added to the file like any edit, and inherited like any gene.
export function ModifierBox({ species, l }: { species: Species; l: Locus }) {
  const qc = useQueryClient()
  const g = species.file.genome as Genome
  const q = useFreq(species)
  const [open, setOpen] = useState(false)
  const [pick, setPick] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const mods = modifiersOf(g, l.locus)
  const looks = l.op === 'pair-map' ? (l.limits as string[]).map(String) : []
  const first = pick || (looks.find((a) => a !== (l.order ?? looks)[0]) ?? looks[0] ?? '')
  const can = l.op !== 'blend' && !isModifier(l) && !mods.length
  const add = async () => {
    const m = newModifier(g, l, first)
    if (!m) return
    setBusy(true); setErr(null)
    try {
      await patchSpecies(species.id, [{ op: 'add', path: '/genome/loci/-', value: m }])
      await qc.invalidateQueries({ queryKey: ['species', species.id] })
      setOpen(false)
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  const remove = async (id: string) => {
    setBusy(true); setErr(null)
    try {
      const i = g.loci.findIndex((o) => o.locus === id)
      await patchSpecies(species.id, [{ op: 'test', path: `/genome/loci/${i}/locus`, value: id }, { op: 'remove', path: `/genome/loci/${i}` }])
      await qc.invalidateQueries({ queryKey: ['species', species.id] })
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  if (l.op === 'blend') return <p className={s.note}>A blend mixes its copies, so there is no order to change.</p>
  return (
    <div className={s.mod}>
      {mods.map((m) => (
        <div key={m.locus} className={s.x}>
          <div className={s.xh}><b>{m.label}</b><span className={s.tag}>modifier · carried by {pct(q.data?.loci[m.locus]?.wild.on ?? m.weight! * 100 * 1.75)} of wild</span></div>
          <p className={s.rule}>A mibi with one copy shows it so: {modifierLine(g, m)}.</p>
          <button className={s.link} onClick={() => remove(m.locus)} disabled={busy || !getToken()}>Remove the modifier</button>
        </div>
      ))}
      {can && !open && <button className={s.btn} onClick={() => setOpen(true)} disabled={!getToken()} title="A modifier is a gene of this species that changes how a shared trait shows. A cross that carries it behaves like this species; one without it follows the catalogue.">Add a modifier</button>}
      {can && open && (
        <div className={s.form}>
          {l.op === 'pair-map' ? (
            <label>Which look comes first?
              <select value={first} onChange={(e) => setPick(e.target.value)}>{looks.map((a) => <option key={a} value={a}>{a}</option>)}</select>
            </label>
          ) : <p className={s.rule}>A mibi with the modifier will need {l.operator === 'recessive-enable' ? 'only one copy' : 'both copies'} of {labelOf(g, l.locus)}.</p>}
          <p className={s.rule}>The modifier is inherited like any gene: a cross that carries it follows this species, one without it follows the catalogue.</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className={s.btn} onClick={add} disabled={busy}>Add</button>
            <button className={s.link} onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      {err && <p className={s.err} role="alert">{err}</p>}
      {!getToken() && can && !open && <p className={s.note}>Sign in to add a modifier.</p>}
    </div>
  )
}

// The genome string of the selected mibi: the type, or No. N of the sheet (?ind=N). Players see and share strings (owner, 2 Nov 2026).
export function GenomeString({ species, ind, genome }: { species: Species; ind: number | null; genome?: string }) {
  const sel = genome ?? (ind ? `seed:${ind}` : 'type')
  const q = useQuery(stringOne(species.id, species.hash, sel))
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    const text = q.data?.string
    if (!text) return
    try { await navigator.clipboard.writeText(text) } catch {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy') } catch { /* the string is selectable below */ } t.remove()
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className={s.sec} data-genome-string>
      <div className={s.meta}>
        <p className={s.h}>Genome string · {ind ? `No. ${ind}` : 'the type'}</p>
        <button className={s.btn} onClick={copy} disabled={!q.data}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      {q.data ? <div className={s.code} aria-label={`Genome string ${q.data.string}`}>{grouped(q.data.string).split(' ').map((w, i) => <span key={i} className={s.grp}>{w} </span>)}</div> : <p className={q.isError ? s.err : s.note}>{q.isError ? (q.error as Error).message : 'Reading the genome…'}</p>}
      {q.data && <p className={s.note}>{q.data.length} characters · version {q.data.version}{copied ? ' · copied to the clipboard' : ' · it holds both copies of every gene, the sleeping ones too'}</p>}
      <span className={s.copied} aria-live="polite" hidden>{copied ? 'Copied' : ''}</span>
    </div>
  )
}
