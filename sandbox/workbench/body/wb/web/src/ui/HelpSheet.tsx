import * as Dialog from '@radix-ui/react-dialog'
import { KEYS } from '../lib/words'
import { useUI } from '../lib/store'
import s from './HelpSheet.module.css'

// The "?" sheet: every key. The keys are on no other screen.
export function HelpSheet() {
  const { helpOpen, setHelp } = useUI()
  return (
    <Dialog.Root open={helpOpen} onOpenChange={setHelp}>
      <Dialog.Portal>
        <Dialog.Overlay className={s.scrim} />
        <Dialog.Content className={s.sheet} aria-describedby={undefined}>
          <Dialog.Title className="sr">Keys</Dialog.Title>
          <dl className={s.keys}>
            {KEYS.map(([k, what]) => (<div key={k} className={s.row}><dt><kbd>{k}</kbd></dt><dd>{what}</dd></div>))}
          </dl>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
