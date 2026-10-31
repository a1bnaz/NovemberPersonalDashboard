import type { SaveState } from '../hooks/useAutosave'

type Props = { state: SaveState; onRetry?: () => void }

export default function SaveIndicator({ state, onRetry }: Props) {
  if (state.status === 'error') {
    return (
      <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400" role="alert">
        <span className="max-w-[14rem] truncate">Not saved: {state.error}</span>
        {onRetry && (
          <button className="min-h-10 rounded-lg px-2 font-semibold underline" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    )
  }
  const text = state.status === 'saving' ? 'Saving…' : state.status === 'saved' ? 'Saved' : ''
  return (
    <span className="text-xs text-muted" aria-live="polite">
      {text}
    </span>
  )
}
