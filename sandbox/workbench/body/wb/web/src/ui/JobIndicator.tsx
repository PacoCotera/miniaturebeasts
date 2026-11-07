import { useEffect, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { useJobs } from '../lib/events'
import { W, jobWord } from '../lib/words'
import s from './JobIndicator.module.css'

// A small spinning ring and one word while jobs run; the popover lists the queue with times.
export function JobIndicator({ species }: { species: string }) {
  const jobs = useJobs(species)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!jobs.length) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [jobs.length])
  if (!jobs.length) return null
  const running = jobs.filter((j) => j.state === 'running')
  const word = jobWord((running[0] ?? jobs[0]).kind)
  const waiting = running.length === 0
  return (
    <Popover.Root>
      <Popover.Trigger className={s.jobs} aria-label={word}>
        <span className={s.ring} data-waiting={waiting || undefined} />{word}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={s.pop} align="end" sideOffset={8}>
          {waiting && <div className={s.wait}>{W.jobsWait}</div>}
          {jobs.map((j) => (
            <div className={s.row} key={j.id}>
              <span className={s.ring} data-waiting={j.state === 'queued' || undefined} />
              <span>{jobWord(j.kind)}</span>
              <span className={s.t + ' num'}>{(Math.max(0, now - j.since) / 1000).toFixed(1)} s</span>
            </div>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
