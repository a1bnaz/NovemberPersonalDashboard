import { useState, type FormEvent } from 'react'
import SaveIndicator from '../components/SaveIndicator'
import { useDay } from '../hooks/useDay'
import { NOV_END, NOV_START, addDays, clampToNov, formatLong, releaseLabel, todayISO } from '../lib/dates'
import type { Task } from '../lib/types'
import { parseCount } from '../lib/util'

const TEXT_DELAY = 600
const BUILT_MINUTES = 30

type Props = { userId: string; date: string; onDateChange: (date: string) => void }

export default function Today({ userId, date, onDateChange }: Props) {
  const { row, loaded, loadError, update, saveState, retry } = useDay(userId, date)
  const [newTask, setNewTask] = useState('')
  const today = todayISO()
  const disabled = !loaded

  function setMinutes(toMinutes: (current: number) => number, delayMs = 0) {
    update((r) => {
      const minutes = toMinutes(r.minutes)
      return { minutes, built: minutes >= BUILT_MINUTES ? true : r.built }
    }, delayMs)
  }

  function setTasks(change: (tasks: Task[]) => Task[]) {
    update((r) => ({ tasks: change(r.tasks) }))
  }

  function addTask(e: FormEvent) {
    e.preventDefault()
    const text = newTask.trim()
    if (!text) return
    setTasks((tasks) => [...tasks, { text, done: false }])
    setNewTask('')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Day navigator */}
      <div className="flex items-center gap-2">
        <button
          className="btn"
          aria-label="Previous day"
          disabled={date <= NOV_START}
          onClick={() => onDateChange(addDays(date, -1))}
        >
          ‹
        </button>
        <div className="flex-1 text-center">
          <div className="text-lg font-semibold">{formatLong(date)}</div>
          <div className="text-xs text-muted">{releaseLabel(today)} · Nov 14</div>
        </div>
        <button
          className="btn"
          aria-label="Next day"
          disabled={date >= NOV_END}
          onClick={() => onDateChange(addDays(date, 1))}
        >
          ›
        </button>
      </div>
      <div className="flex min-h-10 items-center justify-between">
        {clampToNov(today) !== date ? (
          <button className="text-sm font-medium text-built underline" onClick={() => onDateChange(clampToNov(today))}>
            Jump to today
          </button>
        ) : (
          <span />
        )}
        <SaveIndicator state={saveState} onRetry={retry} />
      </div>

      {loadError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          Couldn't load this day: {loadError}
        </p>
      )}

      {/* Big toggles */}
      <div className="grid grid-cols-2 gap-3">
        <Toggle label="Built" on={row.built} color="built" disabled={disabled} onClick={() => update((r) => ({ built: !r.built }))} />
        <Toggle label="Posted" on={row.posted} color="posted" disabled={disabled} onClick={() => update((r) => ({ posted: !r.posted }))} />
      </div>

      {/* Minutes */}
      <section className="card">
        <label className="label" htmlFor="minutes">
          Minutes in Studio
        </label>
        <div className="flex gap-2">
          <input
            id="minutes"
            className="input w-24 flex-none text-center"
            type="number"
            inputMode="numeric"
            min={0}
            disabled={disabled}
            value={row.minutes === 0 ? '' : row.minutes}
            placeholder="0"
            onChange={(e) => {
              const typed = parseCount(e.target.value) ?? 0
              setMinutes(() => typed, TEXT_DELAY)
            }}
          />
          {[30, 60, 90].map((n) => (
            <button key={n} className="btn flex-1" disabled={disabled} onClick={() => setMinutes((m) => m + n)}>
              +{n}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">30+ minutes marks the day as Built.</p>
      </section>

      {/* What I posted */}
      <section className="card">
        <label className="label" htmlFor="post-note">
          What I posted
        </label>
        <input
          id="post-note"
          className="input"
          disabled={disabled}
          value={row.post_note}
          placeholder="Link or a few words"
          onChange={(e) => update({ post_note: e.target.value }, TEXT_DELAY)}
        />
      </section>

      {/* Tasks */}
      <section className="card">
        <span className="label">Tasks</span>
        {row.tasks.length > 0 && (
          <ul className="mb-3 flex flex-col">
            {row.tasks.map((task, i) => (
              <li key={i} className="flex items-center gap-1">
                <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5 flex-none accent-[var(--built)]"
                    checked={task.done}
                    disabled={disabled}
                    onChange={() => setTasks((tasks) => tasks.map((t, j) => (j === i ? { ...t, done: !t.done } : t)))}
                  />
                  <span className={task.done ? 'text-muted line-through' : ''}>{task.text}</span>
                </label>
                <button
                  className="btn border-transparent text-muted"
                  aria-label={`Delete task ${task.text}`}
                  disabled={disabled}
                  onClick={() => setTasks((tasks) => tasks.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addTask} className="flex gap-2">
          <input
            className="input"
            disabled={disabled}
            value={newTask}
            placeholder="Add a task"
            aria-label="New task"
            onChange={(e) => setNewTask(e.target.value)}
          />
          <button className="btn flex-none" disabled={disabled || !newTask.trim()}>
            Add
          </button>
        </form>
      </section>

      {/* Notes */}
      <section className="card">
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          className="input min-h-28 py-2"
          disabled={disabled}
          value={row.notes}
          placeholder="How did it go?"
          onChange={(e) => update({ notes: e.target.value }, TEXT_DELAY)}
        />
      </section>
    </div>
  )
}

type ToggleProps = { label: string; on: boolean; color: 'built' | 'posted'; disabled: boolean; onClick: () => void }

function Toggle({ label, on, color, disabled, onClick }: ToggleProps) {
  const onClass = color === 'built' ? 'bg-built border-built' : 'bg-posted border-posted'
  return (
    <button
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-lg font-bold transition-colors active:scale-[0.98] disabled:opacity-40 ${
        on ? `${onClass} text-white` : 'border-line bg-surface text-ink'
      }`}
    >
      <span className="text-2xl" aria-hidden>
        {on ? '✓' : '○'}
      </span>
      {label}
    </button>
  )
}
