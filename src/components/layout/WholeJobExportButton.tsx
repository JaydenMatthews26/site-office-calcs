import { useGeometry } from '../../hooks/useGeometry'
import { exportWholeJobPdf } from '../../pdf/exportWholeJob'
import { enabledCalculatorSections } from '../../sections/enabled'
import { useJobStore } from '../../store/useJobStore'

export function WholeJobExportButton({ className = '' }: { className?: string }) {
  const geometry = useGeometry()
  const sectionEnabled = useJobStore((s) => s.sectionEnabled)
  const count = enabledCalculatorSections(sectionEnabled).length

  return (
    <button
      type="button"
      onClick={() => exportWholeJobPdf(useJobStore.getState(), geometry)}
      title={`Downloads one PDF: plan / measurements, then ${count} enabled calculator${count === 1 ? '' : 's'} (sidebar toggles). Stays on this device.`}
      className={`touch-target rounded-md bg-accent px-3 text-sm font-semibold text-white hover:bg-accent-dark md:px-4 ${className}`}
    >
      <span className="md:hidden">Export PDF</span>
      <span className="hidden md:inline">Export whole job PDF</span>
    </button>
  )
}
