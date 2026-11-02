import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { speciesList } from './lib/api'
import { useUI } from './lib/store'

const StudioPage = lazy(() => import('./shell/StudioPage')) // studio and play are two lazy route chunks of one app

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
            <Route path="/studio/:species/*" element={<StudioPage />} />
            <Route path="*" element={null} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
