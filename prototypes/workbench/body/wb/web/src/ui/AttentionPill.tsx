import { useEffect, useRef, useState } from 'react'
import { pillWords, type CheckRow } from '../lib/checks'
import s from './AttentionPill.module.css'

// "2 need you": fails and warnings, never passes. Absent when nothing needs you. It pulses once when an edit makes the count go up. Opens the Checks drawer on "Needs you".
export function AttentionPill({ rows, ends = 0, onOpen }: { rows: CheckRow[] | null; ends?: number; onOpen: () => void }) {
  const base = rows ? pillWords(rows) : null
  // The failing ends of the last extremes run count too (they are on request, so they are in the number only once it has been run).
  const w = ends ? { n: (base?.n ?? 0) + ends, kind: 'fail' as const, text: `${(base?.n ?? 0) + ends} to fix` } : base
  const prev = useRef<number | null>(null)
  const [pulse, setPulse] = useState(0)
  useEffect(() => {
    const n = w?.n ?? 0
    if (prev.current !== null && n > prev.current) setPulse((p) => p + 1)
    prev.current = n
  }, [w?.n])
  if (!w) return null
  return (
    <button className={s.pill} onClick={onOpen} data-kind={w.kind} data-pulse={pulse} key={pulse} aria-label={`${w.text}: open the checks`}>
      <i className={s.dot} />{w.text}
    </button>
  )
}
