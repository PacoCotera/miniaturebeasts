import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Creature, type CreatureProps } from './Creature'

// The live viewport (R5): the creature drawn in the page on react-three-fiber and drei, from the studio GLB the server serves by sha. The picture follows the file on the next frame, with no round trip.
// `frame` and `flat` are the parity gate's: the server's own camera and a flat silhouette fill (see shots/parity.mjs).
export type ViewportProps = CreatureProps & { className?: string; style?: React.CSSProperties; dpr?: number; capture?: boolean }

export default function Viewport({ className, style, dpr, capture, ...p }: ViewportProps) {
  return (
    <div className={className} style={style}>
      <Canvas orthographic frameloop="demand" dpr={dpr ?? [1, 2]} gl={{ antialias: true, preserveDrawingBuffer: !!(capture || p.flat) }} camera={{ near: 0.1, far: 100, position: [3, 2, 10], zoom: 100 }} style={{ touchAction: 'none' }}>
        {!p.flat && (
          <>
            <hemisphereLight args={['#fff8ee', '#8a8f99', 1.1]} />
            <directionalLight position={[3, 6, 4]} intensity={1.6} />
            <directionalLight position={[-4, 2, -3]} intensity={0.5} />
          </>
        )}
        <Suspense fallback={null}>
          <Creature {...p} />
          {!p.flat && <ContactShadows position={[0, 0.001, 0]} opacity={0.35} scale={8} blur={2.4} far={3} />}
        </Suspense>
        {!p.flat && <OrbitControls makeDefault enablePan={false} enableDamping={false} minZoom={40} maxZoom={600} />}
      </Canvas>
    </div>
  )
}
