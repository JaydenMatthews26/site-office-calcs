import { useGeometry } from '../../hooks/useGeometry'
import { exportWholeJobPdf } from '../../pdf/exportWholeJob'
import { enabledCalculatorSections } from '../../sections/enabled'
import { useJobStore } from '../../store/useJobStore'

export function WholeJobExportButton() {
  const geometry = useGeometry()
  const sectionEnabled = useJobStore((s) => s.sectionEnabled)
  const count = enabledCalculatorSections(sectionEnabled).length

  return (
    <button
      type="button"
      onClick={() => exportWholeJobPdf(useJobStore.getState(), geometry)}
      title={`Downloads one PDF: plan / measurements, then ${count} enabled calculator${count === 1 ? '' : 's'} (sidebar toggles). Stays on this device.`}
      className="touch-target rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-dark"
    >
      Export whole job PDF
    </button>
  )
}
