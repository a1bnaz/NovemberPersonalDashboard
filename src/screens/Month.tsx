import PaceChart from '../components/PaceChart'
import { useMonthDays } from '../hooks/useMonthDays'
import { NOV_DAYS, RELEASE_DATE, dayOfMonth, formatLong, releaseLabel, todayISO, weekday } from '../lib/dates'
import { countDays, cumulative, currentStreak, totalMinutes } from '../lib/stats'
import type { DayRow } from '../lib/types'

type Props = { userId: string; onOpenDay: (date: string) => void }

export default function Month({ userId, onOpenDay }: Props) {
  const { days, loaded, error } = useMonthDays(userId)
  const today = todayISO()

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
        Couldn't load November: {error}
      </p>
    )
  }
  if (!loaded) return <p className="text-sm text-muted">Loading…</p>

  const hours = totalMinutes(days) / 60

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center text-sm font-medium text-ink-2">{releaseLabel(today)} · Nov 14</div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Days built" value={`${countDays(days, 'built')}`} suffix="/ 30" dot="bg-built" />
        <Stat label="Days posted" value={`${countDays(days, 'posted')}`} suffix="/ 30" dot="bg-posted" />
        <Stat label="Build streak" value={`${currentStreak(days, 'built', today)}`} suffix="days" />
        <Stat label="Post streak" value={`${currentStreak(days, 'posted', today)}`} suffix="days" />
        <Stat label="Studio hours" value={hours.toFixed(hours < 10 ? 1 : 0)} suffix="hrs" wide />
      </div>

      <section className="card">
        <Calendar days={days} today={today} onOpenDay={onOpenDay} />
      </section>

      <section className="card">
        <h2 className="label">Pace</h2>
        <PaceChart built={cumulative(days, 'built')} posted={cumulative(days, 'posted')} today={today} />
      </section>
    </div>
  )
}

function Stat({ label, value, suffix, dot, wide }: { label: string; value: string; suffix: string; dot?: string; wide?: boolean }) {
  return (
    <div className={`card ${wide ? 'col-span-2' : ''}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
        {dot && <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden />}
        {label}
      </div>
      <div className="mt-1">
        <span className="text-3xl font-bold">{value}</span> <span className="text-sm text-muted">{suffix}</span>
      </div>
    </div>
  )
}

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function Calendar({ days, today, onOpenDay }: { days: Record<string, DayRow>; today: string; onOpenDay: (d: string) => void }) {
  const lead = weekday(NOV_DAYS[0])
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="label mb-0">November</h2>
        <div className="flex gap-3 text-xs text-ink-2">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-built" aria-hidden /> Built
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-posted" aria-hidden /> Posted
          </span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEK.map((w, i) => (
          <div key={i} className="text-[11px] font-medium text-muted">
            {w}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {NOV_DAYS.map((d) => {
          const row = days[d]
          const isToday = d === today
          const isRelease = d === RELEASE_DATE
          const future = d > today
          return (
            <button
              key={d}
              onClick={() => onOpenDay(d)}
              aria-label={`${formatLong(d)}: ${row?.built ? 'built' : 'not built'}, ${row?.posted ? 'posted' : 'not posted'}`}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg ${
                isToday ? 'ring-2 ring-ink' : ''
              } ${isRelease ? 'bg-page font-bold' : ''} ${future ? 'text-muted' : ''}`}
            >
              <span className="text-sm">{dayOfMonth(d)}</span>
              <span className="flex gap-1" aria-hidden>
                <Dot on={!!row?.built} color="built" />
                <Dot on={!!row?.posted} color="posted" />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Dot({ on, color }: { on: boolean; color: 'built' | 'posted' }) {
  const cls = color === 'built' ? (on ? 'bg-built border-built' : 'border-axis') : on ? 'bg-posted border-posted' : 'border-axis'
  return <span className={`h-2 w-2 rounded-full border ${cls}`} />
}
