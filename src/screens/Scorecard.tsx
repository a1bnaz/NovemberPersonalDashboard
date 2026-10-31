import { useState, type FormEvent } from 'react'
import MetricChart from '../components/MetricChart'
import SaveIndicator from '../components/SaveIndicator'
import { useMetricLogs } from '../hooks/useMetricLogs'
import { useMonthDays } from '../hooks/useMonthDays'
import { useSettings } from '../hooks/useSettings'
import { formatShort, todayISO } from '../lib/dates'
import { countDays } from '../lib/stats'
import { METRICS, MILESTONES, emptyTiers, type Metric, type MetricLog, type Settings, type Tiers } from '../lib/types'
import { parseCount } from '../lib/util'

const TEXT_DELAY = 600

type Update = (patch: (s: Settings) => Partial<Settings>, delayMs?: number) => void

export default function Scorecard({ userId }: { userId: string }) {
  const { settings, loaded, loadError, update, saveState, retry } = useSettings(userId)
  const { days } = useMonthDays(userId)
  const metricLogs = useMetricLogs(userId)
  const today = todayISO()

  if (loadError) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
        Couldn't load scorecard: {loadError}
      </p>
    )
  }
  if (!loaded) return <p className="text-sm text-muted">Loading…</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-10 items-center justify-end">
        <SaveIndicator state={saveState} onRetry={retry} />
      </div>

      {/* What I control */}
      <section className="card flex flex-col gap-4">
        <h2 className="text-base font-bold">What I control</h2>
        <div className="grid grid-cols-2 gap-3">
          <Count label="Days built" value={countDays(days, 'built')} dot="bg-built" />
          <Count label="Posts" value={countDays(days, 'posted')} dot="bg-posted" />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Updates shipped</span>
          <div className="flex items-center gap-2">
            <button
              className="btn"
              aria-label="One fewer update"
              disabled={settings.updates_shipped <= 0}
              onClick={() => update((s) => ({ updates_shipped: Math.max(0, s.updates_shipped - 1) }))}
            >
              −
            </button>
            <span className="w-8 text-center text-xl font-bold">{settings.updates_shipped}</span>
            <button
              className="btn"
              aria-label="One more update"
              onClick={() => update((s) => ({ updates_shipped: s.updates_shipped + 1 }))}
            >
              +
            </button>
          </div>
        </div>

        <div>
          <span className="label">Milestones</span>
          <ul className="flex flex-col">
            {MILESTONES.map((m) => {
              const state = settings.milestones[m.id]
              const done = !!state?.done
              const overdue = !done && today > m.due
              return (
                <li key={m.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5 flex-none accent-[var(--built)]"
                      checked={done}
                      onChange={() =>
                        update((s) => ({
                          milestones: { ...s.milestones, [m.id]: done ? { done: false, on: null } : { done: true, on: todayISO() } },
                        }))
                      }
                    />
                    <span className={`flex-1 ${done ? 'text-muted line-through' : ''}`}>{m.label}</span>
                    <span className={`text-xs ${overdue ? 'font-semibold text-red-600 dark:text-red-400' : 'text-muted'}`}>
                      {done && state?.on ? `Done ${formatShort(state.on)}` : `${overdue ? 'Overdue · ' : ''}${formatShort(m.due)}`}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* Results */}
      <section className="flex flex-col gap-4">
        <h2 className="px-1 text-base font-bold">Results</h2>
        {metricLogs.error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {metricLogs.error}
          </p>
        )}
        {METRICS.map((m) => (
          <MetricCard
            key={m.id}
            metric={m.id}
            label={m.label}
            tiers={settings.targets[m.id] ?? emptyTiers()}
            logs={metricLogs.logs.filter((l) => l.metric === m.id)}
            today={today}
            update={update}
            onLog={(value) => metricLogs.log(m.id, today, value)}
          />
        ))}
      </section>

      {/* Learned */}
      <section className="card flex flex-col gap-3">
        <h2 className="text-base font-bold">Things I can do now that I couldn't on Nov 1</h2>
        {settings.learned.map((text, i) => (
          <textarea
            key={i}
            className="input min-h-16 py-2"
            aria-label={`Thing ${i + 1}`}
            placeholder={`${i + 1}.`}
            value={text}
            onChange={(e) => {
              const value = e.target.value
              update((s) => ({ learned: s.learned.map((v, j) => (j === i ? value : v)) }), TEXT_DELAY)
            }}
          />
        ))}
      </section>
    </div>
  )
}

function Count({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="rounded-xl bg-page p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden />
        {label}
      </div>
      <div className="mt-1">
        <span className="text-2xl font-bold">{value}</span> <span className="text-sm text-muted">/ 30</span>
      </div>
    </div>
  )
}

const TIER_FIELDS: { key: keyof Tiers; label: string }[] = [
  { key: 'start', label: 'Start' },
  { key: 'floor', label: 'Floor' },
  { key: 'target', label: 'Target' },
  { key: 'stretch', label: 'Stretch' },
]

type MetricCardProps = {
  metric: Metric
  label: string
  tiers: Tiers
  logs: MetricLog[]
  today: string
  update: Update
  onLog: (value: number) => Promise<boolean>
}

function MetricCard({ metric, label, tiers, logs, today, update, onLog }: MetricCardProps) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const latest = logs[logs.length - 1]
  const todays = logs.find((l) => l.date === today)

  function setTier(key: keyof Tiers, value: number | null) {
    update((s) => ({ targets: { ...s.targets, [metric]: { ...(s.targets[metric] ?? emptyTiers()), [key]: value } } }), TEXT_DELAY)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const value = parseCount(draft)
    if (value === null) return
    setBusy(true)
    const ok = await onLog(value)
    setBusy(false)
    if (ok) setDraft('') // on failure the typed number stays put
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{label}</h3>
        <StatusPill value={latest?.value ?? null} tiers={tiers} />
      </div>
      {latest && (
        <div>
          <span className="text-3xl font-bold">{latest.value.toLocaleString()}</span>{' '}
          <span className="text-sm text-muted">as of {formatShort(latest.date)}</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {TIER_FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted">{f.label}</span>
            <input
              className="input px-2 text-center"
              type="number"
              inputMode="numeric"
              min={0}
              value={tiers[f.key] ?? ''}
              onChange={(e) => setTier(f.key, parseCount(e.target.value))}
            />
          </label>
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <input
          className="input"
          type="number"
          inputMode="numeric"
          min={0}
          aria-label={`Today's ${label.toLowerCase()}`}
          placeholder={todays ? `Today: ${todays.value}` : "Log today's number"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn-primary flex-none px-4" disabled={busy || parseCount(draft) === null}>
          {todays ? 'Update' : 'Log'}
        </button>
      </form>

      <MetricChart label={label} logs={logs} tiers={tiers} />
    </div>
  )
}

const STATUS = {
  below: { label: 'Below floor', icon: '↓', color: '#d03b3b', fg: '#ffffff' },
  floor: { label: 'Floor cleared', icon: '✓', color: '#fab219', fg: '#0b0b0b' },
  target: { label: 'Target hit', icon: '✓', color: '#0ca30c', fg: '#ffffff' },
  stretch: { label: 'Stretch hit', icon: '★', color: '#0ca30c', fg: '#ffffff' },
} as const

function statusFor(value: number | null, t: Tiers): keyof typeof STATUS | null {
  if (value === null) return null
  if (t.stretch !== null && value >= t.stretch) return 'stretch'
  if (t.target !== null && value >= t.target) return 'target'
  if (t.floor !== null && value >= t.floor) return 'floor'
  if (t.floor !== null) return 'below'
  return null
}

function StatusPill({ value, tiers }: { value: number | null; tiers: Tiers }) {
  const key = statusFor(value, tiers)
  if (!key) {
    return <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">{value === null ? 'No data yet' : 'Set a floor'}</span>
  }
  const s = STATUS[key]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink">
      <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px]" style={{ backgroundColor: s.color, color: s.fg }} aria-hidden>
        {s.icon}
      </span>
      {s.label}
    </span>
  )
}
