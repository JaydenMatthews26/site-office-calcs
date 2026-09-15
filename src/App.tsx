import { AppShell } from './components/layout/AppShell'
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
      ) : (
        <StubSection sectionId={activeSectionId} />
      )}
    </AppShell>
  )
}
