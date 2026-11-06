import { failLine, type CheckMeta, type CheckRow } from '../lib/checks'
import s from './AttentionCard.module.css'

// A dot, the check in plain words (the fail line), the measure against the limit, then the text actions. A computed fix joins them when the check can give one.
export function AttentionCard({ row, meta, onProof, onWhy, proofShown }: { row: CheckRow; meta?: CheckMeta; onProof: () => void; onWhy: () => void; proofShown: boolean }) {
  const ready = !!row.proof?.ready
  return (
    <div className={s.card} data-kind={row.state}>
      <div className={s.head}><i className={s.dot} /><b>{failLine(row, meta)}</b></div>
      <p className={s.measure}>{row.measure}</p>
      <div className={s.acts}>
        {row.proof && <button onClick={onProof} disabled={!ready} aria-pressed={proofShown}>{ready ? 'Show proof' : 'Making the proof…'}</button>}
        <button onClick={onWhy}>Why</button>
      </div>
    </div>
  )
}
