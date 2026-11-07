import { lazy, Suspense, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Toggle } from '@/components/ui/toggle'
import { AZS, VIEWS, type Az, type View } from '../lib/url'
import { W } from '../lib/words'
import { VIEW_OF_URL } from './views'
import { studioOne } from './studio'

// The viewport is its own lazy chunk (three, react-three-fiber and the drei pieces used): it loads once, is cached as immutable, and the shell and forms never wait for it.
const Viewport = lazy(() => import('./Viewport'))

// The middle pane of layout A: the live creature on its plate, view and angle in the plate's corners, off the creature. The file is the document, so the picture follows the form on the next frame.
export function LivePlate({ speciesId, file, view, az, onView, onAz }: { speciesId: string; file: Record<string, unknown> | undefined; view: View; az: Az; onView: (v: View) => void; onAz: (a: Az) => void }) {
  const studio = useQuery(studioOne(speciesId))
  const [held, setHeld] = useState<number | null>(null)
  const ready = !!file && !!studio.data?.sculpt
  return (
    <div className="relative h-full overflow-hidden rounded-2xl bg-plate" data-live-plate>
      {ready && (
        <Suspense fallback={<Note>{W.live.loading}</Note>}>
          <Viewport className="absolute inset-0" file={file} studio={studio.data!} view={VIEW_OF_URL[view]} az={az} held={held} />
        </Suspense>
      )}
      {!ready && <Note>{studio.isSuccess && !studio.data?.sculpt ? W.live.cage : W.live.loading}</Note>}
      <ToggleGroup type="single" value={view} onValueChange={(v) => v && onView(v as View)} variant="outline" size="sm" className="absolute left-3 top-3 bg-card/90" aria-label="View">
        {VIEWS.map((v, i) => (
          <ToggleGroupItem key={v} value={v} className="h-10 px-3 text-[15px]" aria-label={`${W.viewBar[i]} view`}>{W.viewBar[i]}</ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ToggleGroup type="single" value={String(az)} onValueChange={(a) => a && onAz(Number(a) as Az)} variant="outline" size="sm" className="absolute bottom-3 left-3 bg-card/90" aria-label="Angle">
        {AZS.map((a) => (
          <ToggleGroupItem key={a} value={String(a)} className="h-10 min-w-11 px-3 text-[15px]" aria-label={`${a} degrees`}>{a}°</ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Toggle variant="outline" pressed={held !== null} onPressedChange={(p) => setHeld(p ? Date.now() : null)} className="absolute bottom-3 right-3 h-10 bg-card/90 px-4 text-[15px]" aria-label={W.before}>{W.before}</Toggle>
    </div>
  )
}

const Note = ({ children }: { children: React.ReactNode }) => <p className="absolute inset-0 flex items-center justify-center text-sm text-faint">{children}</p>
