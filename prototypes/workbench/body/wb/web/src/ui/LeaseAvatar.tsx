import * as Popover from '@radix-ui/react-popover'
import { leaseFrom, initials, clock } from '../lib/edits'
import type { Species } from '../lib/api'
import { W } from '../lib/words'
import s from './LeaseAvatar.module.css'

// Who holds the file. Shown only when someone else does: gold for an agent. (The server names no "me" yet, so the page draws no avatar for itself.)
export function LeaseAvatar({ species }: { species: Species | undefined }) {
  const lease = species ? leaseFrom(species.lease, species.history) : null
  if (!lease) return null
  return (
    <Popover.Root>
      <Popover.Trigger className={s.avatar} data-agent={lease.agent || undefined} aria-label={W.held(lease.holder, clock(lease.since))}>{initials(lease.holder)}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={s.pop} align="end" sideOffset={8}>
          <div>{W.held(lease.holder, clock(lease.since))}</div>
          <button className={s.take} disabled>{W.takeOver}</button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
