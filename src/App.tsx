import { AppShell } from './components/layout/AppShell'
import { FasciasSection } from './components/fascias/FasciasSection'
import { PlanWorkspace } from './components/plan/PlanWorkspace'
import { RoofingSection } from './components/roofing/RoofingSection'
import { StubSection } from './components/stubs/StubSection'
import { useJobStore } from './store/useJobStore'

export default function App() {
  const activeSectionId = useJobStore((s) => s.activeSectionId)

  return (
    <AppShell>
      {activeSectionId === 'plan' ? (
        <PlanWorkspace />
      ) : activeSectionId === 'roofing' ? (
        <RoofingSection />
      ) : activeSectionId === 'fascias' ? (
        <FasciasSection />
      ) : (
        <StubSection sectionId={activeSectionId} />
      )}
    </AppShell>
  )
}
