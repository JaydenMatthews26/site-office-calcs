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
  const setInputMode = useJobStore((s) => s.setInputMode)
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
      <p className="no-print border-b border-line bg-paper px-3 py-2 text-xs leading-relaxed text-ink-soft md:hidden">
        Drag with one finger to draw a rectangle or wall. Pinch to zoom, or use +/−. Pan moves the
        sheet.{' '}
        <button
          type="button"
          className="font-semibold text-accent underline"
          onClick={() => setInputMode('manual')}
        >
          Manual mode
        </button>{' '}
        types sizes if drawing is fiddly.
      </p>
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
      <div className="min-h-0 flex-1 overflow-hidden">
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
