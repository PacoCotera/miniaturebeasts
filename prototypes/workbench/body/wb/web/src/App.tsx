import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { speciesList } from './lib/api'
import { useUI } from './lib/store'

const StudioPage = lazy(() => import('./shell/StudioPage')) // studio and play are two lazy route chunks of one app
const Pick = lazy(() => import('./ui/play/PlayPage').then((m) => ({ default: m.Pick })))
const Shape = lazy(() => import('./ui/play/PlayPage').then((m) => ({ default: m.Shape })))
const Pods = lazy(() => import('./ui/play/PodsPage').then((m) => ({ default: m.PodsPage })))

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })

function Home() {
  // The studio home (five ways in) is chunk 26. Until then the studio opens on the first species.
  const { data } = useQuery(speciesList())
  return data?.length ? <Navigate to={`/studio/${data[0].id}/shape`} replace /> : null
}

export default function App() {
  const theme = useUI((u) => u.theme)
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/studio" element={<Home />} />
            <Route path="/studio/:species/*" element={<StudioPage />} />
            <Route path="/play" element={<Pick />} />
            <Route path="/play/:species" element={<Shape />} />
            <Route path="/play/:species/pods" element={<Pods />} />
            <Route path="/studio/play" element={<Pick />} />
            <Route path="/studio/play/:species" element={<Shape />} />
            <Route path="/studio/play/:species/pods" element={<Pods />} />
            <Route path="*" element={null} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
