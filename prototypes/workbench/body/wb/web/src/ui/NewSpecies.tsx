import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { speciesList, getToken } from '../lib/api'
import { createSpecies, familiesOne, isReady, isSculpt, nextId, pathWord, validId, type FamilyCard } from '../lib/families'
import { useUI } from '../lib/store'
import { W } from '../lib/words'
import s from './NewSpecies.module.css'

// New species: the body plan cards are family cards. A family with a template can be started from; the others say "not yet", and "From a sculpt" waits for the mesh body source.
export function NewSpecies({ go }: { go: (p: { species: string; sel: null }) => void }) {
  const { newOpen, setNew } = useUI()
  const fam = useQuery({ ...familiesOne(), enabled: newOpen })
  const list = useQuery({ ...speciesList(), enabled: newOpen })
  const qc = useQueryClient()
  const [pick, setPick] = useState<string>('trotter')
  const [id, setId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const cards = fam.data ?? []
  const sid = id ?? nextId((list.data ?? []).map((r) => r.id))
  const chosen = cards.find((c) => c.id === pick)
  const can = !!getToken() && !!chosen && isReady(chosen) && validId(sid) && !busy
  const make = async () => {
    if (!chosen) return
    setBusy(true); setErr(null)
    try {
      const r = await createSpecies(sid, chosen.id)
      await qc.invalidateQueries({ queryKey: speciesList().queryKey })
      setNew(false); setId(null)
      go({ species: r.id, sel: null })
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <Dialog.Root open={newOpen} onOpenChange={setNew}>
      <Dialog.Portal>
        <Dialog.Overlay className={s.scrim} />
        <Dialog.Content className={s.sheet} aria-describedby={undefined}>
          <Dialog.Title className={s.title}>{W.owedNew.title}</Dialog.Title>
          <ul className={s.grid} aria-label="Families">
            {cards.map((c) => <Card key={c.id} c={c} on={pick === c.id} pick={() => setPick(c.id)} />)}
          </ul>
          <footer className={s.foot}>
            <label className={s.idl}><span>{W.owedNew.id}</span>
              <input className={s.id} value={sid} onChange={(e) => setId(e.target.value.toUpperCase())} spellCheck={false} aria-invalid={!validId(sid)} />
            </label>
            {err && <span className={s.err} role="alert">{err}</span>}
            {!getToken() && <span className={s.hint}>{W.readOnly} · {W.tokenTip}</span>}
            <button className={s.primary} disabled={!can} onClick={() => void make()}>{W.owedNew.create}</button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Card({ c, on, pick }: { c: FamilyCard; on: boolean; pick: () => void }) {
  const ready = isReady(c)
  const sculpt = isSculpt(c)
  return (
    <li>
      <button className={`${s.card} ${on ? s.on : ''}`} disabled={!ready} onClick={pick} aria-pressed={on} data-state={c.state}>
        <span className={s.name}>{c.name}</span>
        {!sculpt && <span className={s.meta}>{c.plan} · {c.legs ? `${c.legs} legs` : 'no legs'}</span>}
        {!sculpt && <span className={s.what}>{c.fix}</span>}
        {sculpt && <span className={s.what}>{c.why}</span>}
        <span className={s.chips}>
          {!sculpt && <i className={s.chip}>{pathWord(ready ? (c.template_path ?? c.path) : c.path)}</i>}
          {!ready && <i className={`${s.chip} ${s.notyet}`}>{W.notYet}</i>}
          {ready && <i className={`${s.chip} ${s.live}`}>{W.owedNew.template}</i>}
        </span>
      </button>
    </li>
  )
}
