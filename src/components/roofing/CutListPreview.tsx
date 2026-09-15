import type { CutRoofResult } from '../../calc/roofCarpentry'
import { Panel } from '../ui/Fields'

export function CutListPreview({ cut, jobName }: { cut: CutRoofResult; jobName: string }) {
  const L = Math.max(cut.commonRafterLengthMm, 1)
  const depth = 36
  const width = 720
  const scale = width / L
  const bm = cut.lengthToBirdsmouthMm * scale
  const seat = Math.max(10, cut.seatCutMm * scale)
  const plumb = Math.min(depth - 4, cut.birdsMouthPlumbMm * scale)
  const y = 28

  const onPrint = () => window.print()

  return (
    <Panel title="Printable cut list">
      <div className="print-cut-list rounded-lg border border-line bg-paper p-4">
        <p className="text-xs text-ink-soft">
          {jobName} · one common rafter labelled × {cut.commonRafterCount} · jacks diminishing by{' '}
          {cut.jackCommonDifferenceMm.toFixed(0)} mm
        </p>
        <svg viewBox="0 0 760 220" className="mt-3 w-full max-w-3xl text-ink" role="img" aria-label="Common rafter cut list">
          <text x="8" y="16" fontSize="12" fontFamily="IBM Plex Sans">
            Common rafter {cut.commonRafterLengthMm.toFixed(0)} mm × {cut.commonRafterCount} · {cut.rafterSection}
          </text>
          <path
            d={`M 8 ${y}
                H ${8 + width}
                V ${y + depth}
                H ${8 + bm + seat}
                V ${y + depth - plumb}
                H ${8 + bm}
                V ${y + depth}
                H 8
                Z`}
            fill="#f6f3ec"
            stroke="#0f1c2e"
            strokeWidth="1.5"
          />
          <text x="10" y={y + depth + 16} fontSize="10" fontFamily="IBM Plex Mono">
            plumb {cut.plumbCutDeg.toFixed(1)}°
          </text>
          <text x={8 + bm} y={y + depth + 16} fontSize="10" fontFamily="IBM Plex Mono">
            bird’s mouth seat {cut.seatCutMm.toFixed(0)} mm
          </text>
          <text x={8 + width - 90} y={y + depth + 16} fontSize="10" fontFamily="IBM Plex Mono">
            tail / fascia
          </text>
          <text x={8 + width / 2 - 40} y={y - 6} fontSize="10" fontFamily="IBM Plex Mono">
            {cut.commonRafterLengthMm.toFixed(0)} mm
          </text>
        </svg>

        <p className="mt-2 text-xs font-medium uppercase tracking-wider text-ink-soft">Jack rafters</p>
        {cut.jackCount === 0 ? (
          <p className="text-sm text-ink-soft">No jacks on a gable-to-gable roof.</p>
        ) : (
          <svg
            viewBox={`0 0 760 ${24 + cut.jackRafters.length * 22}`}
            className="mt-2 w-full max-w-3xl"
            role="img"
            aria-label="Diminishing jack rafters"
          >
            {cut.jackRafters.map((jack, i) => {
              const w = (jack.lengthMm / L) * width
              const yy = 14 + i * 22
              const copies = cut.jackCount / cut.jackRafters.length
              return (
                <g key={jack.index}>
                  <line x1="8" y1={yy} x2={8 + w} y2={yy} stroke="#0f1c2e" strokeWidth="4" />
                  <text x={16 + w} y={yy + 4} fontSize="11" fontFamily="IBM Plex Mono">
                    {jack.lengthMm.toFixed(0)} mm × {copies}
                  </text>
                </g>
              )
            })}
          </svg>
        )}
      </div>
      <button
        type="button"
        onClick={onPrint}
        className="no-print mt-3 touch-target rounded-md border border-line px-3 text-sm"
      >
        Print cut list
      </button>
    </Panel>
  )
}
