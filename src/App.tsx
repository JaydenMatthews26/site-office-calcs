import { AppShell } from './components/layout/AppShell'
import { FasciasSection } from './components/fascias/FasciasSection'
import { PlanWorkspace } from './components/plan/PlanWorkspace'
import { RoofingSection } from './components/roofing/RoofingSection'
import { StubSection } from './components/stubs/StubSection'
import { FloorCoverSection } from './components/takeoff/FloorCoverSection'
import { JoinerySection } from './components/takeoff/JoinerySection'
import { StructureSection } from './components/takeoff/StructureSection'
import {
  ExternalWallsSection,
  ExternalsSection,
  FinishesSection,
  FirstFloorSection,
  FoundationsSection,
  GroundFloorSection,
  MepSection,
  PaintingSection,
  PartitionsSection,
  ScaffoldSection,
  SkirtingSection,
  StairsSection,
} from './components/takeoff/TakeoffSections'
import { useJobStore } from './store/useJobStore'

const PANELS: Record<string, () => JSX.Element> = {
  plan: PlanWorkspace,
  roofing: RoofingSection,
  fascias: FasciasSection,
  structure: StructureSection,
  'windows-doors': JoinerySection,
  foundations: FoundationsSection,
  'ground-floor': GroundFloorSection,
  partitions: PartitionsSection,
  'first-floor': FirstFloorSection,
  stairs: StairsSection,
  'external-walls': ExternalWallsSection,
  finishes: FinishesSection,
  skirting: SkirtingSection,
  'floor-coverings': FloorCoverSection,
  mep: MepSection,
  painting: PaintingSection,
  externals: ExternalsSection,
  scaffolding: ScaffoldSection,
}

export default function App() {
  const activeSectionId = useJobStore((s) => s.activeSectionId)
  const Panel = PANELS[activeSectionId]
  return <AppShell>{Panel ? <Panel /> : <StubSection sectionId={activeSectionId} />}</AppShell>
}
