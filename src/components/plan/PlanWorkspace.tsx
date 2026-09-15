import { useMemo, useState } from 'react'
import { deriveGeometry } from '../../geometry/derive'
import { useJobStore } from '../../store/useJobStore'
import type { DrawTool } from '../../types/job'
import { PlanEditor } from './PlanEditor'
import { PlanMetrics } from './PlanMetrics'
import { PlanToolbar } from './PlanToolbar'

export function PlanWorkspace() {
  const plan = useJobStore((s) => s.plan)
  const geometry = useMemo(() => deriveGeometry(plan), [plan])
  const [tool, setTool] = useState<DrawTool>('rect')
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null)
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PlanToolbar
        tool={tool}
        onTool={setTool}
        selectedWallId={selectedWallId}
        selectedOpeningId={selectedOpeningId}
        onClearSelection={() => {
          setSelectedWallId(null)
          setSelectedOpeningId(null)
        }}
      />
      <PlanMetrics geometry={geometry} />
      <div className="min-h-0 flex-1">
        <PlanEditor
          tool={tool}
          selectedWallId={selectedWallId}
          selectedOpeningId={selectedOpeningId}
          onSelectWall={setSelectedWallId}
          onSelectOpening={setSelectedOpeningId}
        />
      </div>
    </div>
  )
}
