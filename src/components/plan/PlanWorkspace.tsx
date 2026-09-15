import { useState } from 'react'
import { useGeometry } from '../../hooks/useGeometry'
import { useJobStore } from '../../store/useJobStore'
import type { DrawTool } from '../../types/job'
import { ManualMeasurements } from './ManualMeasurements'
import { PlanEditor } from './PlanEditor'
import { PlanMetrics } from './PlanMetrics'
import { PlanToolbar } from './PlanToolbar'

export function PlanWorkspace() {
  const inputMode = useJobStore((s) => s.inputMode)
  const geometry = useGeometry()
  const [tool, setTool] = useState<DrawTool>('rect')
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null)
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null)

  if (inputMode === 'manual') {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PlanMetrics geometry={geometry} />
        <ManualMeasurements />
      </div>
    )
  }

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
