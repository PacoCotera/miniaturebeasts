import { useEffect, useState, type ReactNode } from 'react'
import s from './Plate.module.css'

type Props = { src: string | null; kind: 'plush' | 'clay'; width: number; height: number; stale?: boolean; progress?: number | 'indeterminate' | null; tag?: string; footer?: number; alt?: string; className?: string; children?: ReactNode; onPointerDown?: () => void; onPointerEnter?: () => void; onPointerLeave?: () => void }

// One render on its backdrop. A new picture is decoded off-screen first, then crossfaded in over 320 ms, so the last good picture never blanks.
export function Plate({ src, kind, width, height, stale, progress, tag, footer = 0, alt = '', className, children, onPointerDown, onPointerEnter, onPointerLeave }: Props) {
  const [cur, setCur] = useState<string | null>(src)
  const [next, setNext] = useState<string | null>(null)
  useEffect(() => {
    if (!src || src === cur) return
    let dead = false
    const img = new Image()
    img.src = src
    img.decode().catch(() => undefined).then(() => { if (!dead) setNext(src) })
    return () => { dead = true }
  }, [src, cur])
  useEffect(() => {
    if (!next) return
    const t = setTimeout(() => { setCur(next); setNext(null) }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 330)
    return () => clearTimeout(t)
  }, [next])
  return (
    <div className={`${s.plate} ${kind === 'clay' ? s.clay : ''} ${stale ? s.stale : ''} ${className ?? ''}`} style={{ width, height }} onPointerDown={onPointerDown} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
      {cur && <img className={s.img} style={footer ? { bottom: footer, height: `calc(100% - ${footer}px)` } : undefined} src={cur} alt={alt} draggable={false} />}
      {next && <img className={`${s.img} ${s.incoming}`} style={footer ? { bottom: footer, height: `calc(100% - ${footer}px)` } : undefined} src={next} alt="" draggable={false} />}
      {progress != null && <div className={s.progress} style={progress === 'indeterminate' ? undefined : { width: `${Math.round(progress * 100)}%` }} data-indeterminate={progress === 'indeterminate' || undefined} />}
      {tag && <span className={s.tag}>{tag}</span>}
      {children}
    </div>
  )
}
