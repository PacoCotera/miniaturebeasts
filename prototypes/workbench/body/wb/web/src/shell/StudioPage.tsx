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
import { GenesStage } from '../ui/GenesStage'
import { GenesInspector } from '../ui/GenesInspector'
import { VarietyStage } from '../ui/VarietyStage'
import { VarietyInspector } from '../ui/VarietyInspector'
import { GoldensStage } from '../ui/GoldensStage'
import { GoldensInspector } from '../ui/GoldensInspector'
import { Inspector } from '../ui/Inspector'
import { Palette } from '../ui/Palette'
import { HelpSheet } from '../ui/HelpSheet'
import { Toasts } from '../ui/Toasts'
import { ChecksDrawer } from '../ui/ChecksDrawer'
import { FileDrawer, HistoryDrawer, SectionDrawer } from '../ui/Drawers'
import { useRevert } from '../lib/undo'
import { checkMetas, needsYou, partsOf } from '../lib/checks'

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
  const metas = useQuery(checkMetas()).data ?? []
  const byId = useMemo(() => Object.fromEntries(metas.map((m) => [m.id, m])), [metas])
  const rows = species?.checks?.rows ?? []
  const drawerH = useUI((u) => u.drawerH)
  const open = !!url.drawer && ['checks', 'history', 'section', 'file'].includes(url.drawer) && !!species
  const rev = useRevert(url.species)
  // C opens the drawer; V puts the proof of the selection's first failing check (or the selected row) on the stage; G goes to the check's part; Esc steps back one layer.
  const firstFor = () => { const hit = needsYou(url.sel ? rows.filter((r) => partsOf(r, byId[r.id]).includes(url.sel!)) : rows); return hit[0]?.id ?? null }
  const checkKeys = useMemo(() => ({
    toggleDrawer: () => go({ drawer: open && url.drawer === 'checks' ? null : 'checks' }),
    history: () => go({ drawer: open && url.drawer === 'history' ? null : 'history' }),
    file: () => go({ drawer: open && url.drawer === 'file' ? null : 'file' }),
    undo: () => void rev.run('undo'),
    redo: () => void rev.run('redo'),
    proof: () => { const id = url.proof ?? firstFor(); if (id) go({ proof: url.proof ? null : id }) },
    field: () => { const r = rows.find((x) => x.id === url.proof); const part = r && partsOf(r, byId[r.id])[0]; if (part) go({ sel: part, drawer: null }) },
    escape: () => { if (url.proof) { go({ proof: null }); return true } if (open) { go({ drawer: null }); return true } return false },
  }), [open, url, rows, byId, go, rev.run]) // eslint-disable-line react-hooks/exhaustive-deps
  useKeys(url, go, available, checkKeys)
  return (
    <>
      <AppShell
        top={<TopBar url={url} species={species} go={go} />}
        nav={<Navigator rail={rail} url={url} go={go} rows={rows} metas={byId} species={species} />}
        stage={url.mode === 'genes' ? <GenesStage url={url} species={species} inset={open ? drawerH : 0} /> : url.mode === 'goldens' ? <GoldensStage url={url} species={species} go={go} inset={open ? drawerH : 0} /> : url.mode === 'variety' ? <VarietyStage url={url} species={species} go={go} inset={open ? drawerH : 0} /> : <Stage url={url} species={species} go={go} inset={open ? drawerH : 0} />}
        inspector={<Inspector species={species} id={url.species} sheet={sheet} open={inspOpen} url={url} go={go} genes={url.mode === 'genes' && species ? <GenesInspector species={species} url={url} go={go} /> : url.mode === 'goldens' && species ? <GoldensInspector species={species} url={url} /> : url.mode === 'variety' && species ? <VarietyInspector species={species} url={url} go={go} /> : undefined} />}
        overlay={<><Toasts species={url.species} />{open && species && (url.drawer === 'history' ? <HistoryDrawer species={species} url={url} go={go} /> : url.drawer === 'section' ? <SectionDrawer species={species} url={url} go={go} /> : url.drawer === 'file' ? <FileDrawer species={species} url={url} go={go} /> : <ChecksDrawer species={species} url={url} go={go} />)}</>}
      />
      <Palette url={url} />
      <HelpSheet />
    </>
  )
}
