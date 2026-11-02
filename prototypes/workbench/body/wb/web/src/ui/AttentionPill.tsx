import { useEffect, useRef, useState } from 'react'
import { pillWords, type CheckRow } from '../lib/checks'
import s from './AttentionPill.module.css'

// "2 need you": fails and warnings, never passes. Absent when nothing needs you. It pulses once when an edit makes the count go up. Opens the Checks drawer on "Needs you".
export function AttentionPill({ rows, onOpen }: { rows: CheckRow[] | null; onOpen: () => void }) {
  const w = rows ? pillWords(rows) : null
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
