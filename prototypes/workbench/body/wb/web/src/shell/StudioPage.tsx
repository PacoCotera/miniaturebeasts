import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { speciesOne } from '../lib/api'
import { useSpeciesEvents } from '../lib/events'
import { useKeys } from '../lib/keys'
import { useUI } from '../lib/store'
import { usePortraitSheet, useRail, useStudioUrl } from '../lib/useStudio'
import { AppShell } from '../ui/AppShell'
import { TopBar } from '../ui/TopBar'
import { Navigator } from '../ui/Navigator'
import { Stage } from '../ui/Stage'
import { Inspector } from '../ui/Inspector'
import { Palette } from '../ui/Palette'
import { HelpSheet } from '../ui/HelpSheet'
import { Toasts } from '../ui/Toasts'

export default function StudioPage() {
  const [url, go] = useStudioUrl()
  useSpeciesEvents(url.species)
  const { data: species } = useQuery(speciesOne(url.species))
  const rail = useRail()
  const sheet = usePortraitSheet()
  const inspOpen = useUI((u) => u.inspOpen)
  const setInsp = useUI((u) => u.setInsp)
  useEffect(() => { setInsp(!sheet) }, [sheet, setInsp]) // the inspector is a sheet in portrait, closed until asked for
  const available = useMemo(() => (v: string) => v === 'clay' || !!species?.views.some((x) => x.mode === v && x.ready), [species])
  useKeys(url, go, available)
  return (
    <>
      <AppShell
        top={<TopBar url={url} species={species} />}
        nav={<Navigator rail={rail} />}
        stage={<Stage url={url} species={species} go={go} />}
        inspector={<Inspector species={species} id={url.species} sheet={sheet} open={inspOpen} />}
        overlay={<Toasts species={url.species} />}
      />
      <Palette url={url} />
      <HelpSheet />
    </>
  )
}
