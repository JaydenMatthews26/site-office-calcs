import { useJobStore } from '../../store/useJobStore'

/** Inline replacement for the old mode-switch confirms. Rendered once, under the header control. */
export function InputModePrompt() {
  const prompt = useJobStore((s) => s.inputPrompt)
  const resolve = useJobStore((s) => s.resolveInputPrompt)
  const setActive = useJobStore((s) => s.setActiveSection)
  if (!prompt) return null

  const go = (action: 'copy' | 'keep' | 'switch' | 'cancel') => {
    resolve(action)
    if (action !== 'cancel') setActive('plan')
  }

  if (prompt === 'manual-conflict') {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm" role="status">
        <p className="min-w-[12rem] flex-1 text-ink">
          Drawn plan and typed sizes both exist. Use the drawn sizes, or keep what you typed. The canvas is not deleted.
        </p>
        <button type="button" className="touch-target rounded-md bg-ink px-3 text-sm font-medium text-paper" onClick={() => go('copy')}>
          Use drawn sizes
        </button>
        <button type="button" className="touch-target rounded-md border border-line bg-paper px-3 text-sm" onClick={() => go('keep')}>
          Keep typed sizes
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm" role="status">
      <p className="min-w-[12rem] flex-1 text-ink">
        The canvas is empty, so calculators will have no drawn geometry until you draw. Typed measurements stay saved if you switch back.
      </p>
      <button type="button" className="touch-target rounded-md bg-ink px-3 text-sm font-medium text-paper" onClick={() => go('switch')}>
        Switch to draw plan
      </button>
      <button type="button" className="touch-target rounded-md border border-line bg-paper px-3 text-sm" onClick={() => go('cancel')}>
        Stay on manual
      </button>
    </div>
  )
}
