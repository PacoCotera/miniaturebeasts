import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router-dom'
import type { Frame } from './Creature'
import { studioOne } from './studio'
import Viewport from './Viewport'

// The R5 parity gate's page (shots/parity.mjs): the creature as a flat silhouette in the server's own camera, at the server's own canvas size (608 x 624), for one variant of a species file and one angle.
// The gate injects what the server's proxy render used as window.__parity = { variants: { name: { rig, keys, signature, views: { az: Frame } } } }; the page draws it and the script reads the canvas.
type Parity = { variants: Record<string, { rig: unknown; keys: unknown; signature: unknown; views: Record<string, Frame> }> }

export default function ParityPage() {
  const { species = '' } = useParams()
  const [q] = useSearchParams()
  const studio = useQuery(studioOne(species))
  const v = (window as unknown as { __parity?: Parity }).__parity?.variants[q.get('variant') ?? 'type']
  const frame = v?.views[q.get('az') ?? '32']
  if (!studio.data?.sculpt || !v || !frame) return null
  return <Viewport style={{ width: 608, height: 624 }} flat={q.get("look") !== "clay"} capture dpr={1} studio={studio.data} view="clay" az={frame.az} held={null} frame={frame} file={{ rig: v.rig, keys: v.keys, signature: v.signature }} />
}
