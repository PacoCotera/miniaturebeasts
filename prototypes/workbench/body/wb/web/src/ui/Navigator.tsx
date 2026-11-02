import s from './Navigator.module.css'

// An outline of rows: parts (Shape), loci (Genes), looks (Variety), outputs (Goldens), sheets (Gate). The rows arrive with their chunks; below 1280 px it is an icon rail.
export function Navigator({ rail }: { rail: boolean }) {
  return <aside className={`${s.nav} ${rail ? s.rail : ''}`} aria-label="Navigator" />
}
