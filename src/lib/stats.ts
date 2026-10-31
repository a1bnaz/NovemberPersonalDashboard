import { NOV_DAYS, NOV_START, addDays, clampToNov } from './dates'
import type { DayRow } from './types'

type Days = Record<string, DayRow>
type Flag = 'built' | 'posted'

export function countDays(days: Days, flag: Flag): number {
  return NOV_DAYS.filter((d) => days[d]?.[flag]).length
}

export function totalMinutes(days: Days): number {
  return NOV_DAYS.reduce((sum, d) => sum + (days[d]?.minutes ?? 0), 0)
}

/**
 * Consecutive days ending today (or yesterday, if today isn't checked yet,
 * so an unlogged morning doesn't read as a broken streak).
 */
export function currentStreak(days: Days, flag: Flag, today: string): number {
  if (today < NOV_START) return 0
  let d = clampToNov(today)
  if (!days[d]?.[flag]) d = addDays(d, -1)
  let n = 0
  while (d >= NOV_START && days[d]?.[flag]) {
    n++
    d = addDays(d, -1)
  }
  return n
}

/** Running total per November day (index 0 = Nov 1). */
export function cumulative(days: Days, flag: Flag): number[] {
  let total = 0
  return NOV_DAYS.map((d) => (total += days[d]?.[flag] ? 1 : 0))
}
