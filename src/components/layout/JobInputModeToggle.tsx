import { useJobStore } from '../../store/useJobStore'
import type { InputMode } from '../../types/job'

const OPTIONS: { id: InputMode; label: string; hint: string }[] = [
  { id: 'draw', label: 'Draw plan', hint: 'Canvas — geometry drives take-offs' },
  { id: 'manual', label: 'Manual', hint: 'Type sizes — no canvas' },
]

export function JobInputModeToggle({
  variant = 'header',
}: {
  variant?: 'header' | 'sidebar'
}) {
  const mode = useJobStore((s) => s.inputMode)
  const setInputMode = useJobStore((s) => s.setInputMode)
  const setActive = useJobStore((s) => s.setActiveSection)

  const pick = (next: InputMode) => {
    if (next === mode) return
    if (setInputMode(next)) setActive('plan')
  }

  const track =
    variant === 'sidebar'
      ? 'mt-3 flex rounded-lg bg-white/10 p-1 text-xs font-medium'
      : 'flex rounded-lg border border-line bg-paper p-1 text-sm font-medium'
  const on = variant === 'sidebar' ? 'bg-accent text-white' : 'bg-ink text-paper'
  const off = variant === 'sidebar' ? 'text-white/70' : 'text-ink-soft hover:text-ink'

  return (
    <div
      role="radiogroup"
      aria-label="Job input mode"
      className={variant === 'header' ? 'flex min-w-0 flex-col gap-1 md:min-w-[240px]' : undefined}
    >
      {variant === 'header' ? (
        <span className="hidden text-[11px] font-medium uppercase tracking-wider text-ink-soft md:block">
          Job input
        </span>
      ) : null}
      <div className={track}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={mode === opt.id}
            title={opt.hint}
            className={`touch-target flex-1 rounded-md px-3 ${mode === opt.id ? on : off}`}
            onClick={() => pick(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
