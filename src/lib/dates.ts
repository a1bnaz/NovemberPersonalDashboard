// All dates are 'YYYY-MM-DD' strings in America/New_York. Arithmetic is done on
// UTC midnights so the local timezone of the device can never shift a day.

export const TIME_ZONE = 'America/New_York'
export const NOV_START = '2026-11-01'
export const NOV_END = '2026-11-30'
export const RELEASE_DATE = '2026-11-14'

const DAY_MS = 86_400_000

const isoFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Today's date in New York, as YYYY-MM-DD. */
export function todayISO(): string {
  return isoFormatter.format(new Date())
}

function toUTC(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fromUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function addDays(iso: string, n: number): string {
  return fromUTC(toUTC(iso) + n * DAY_MS)
}

/** Whole days from a to b (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS)
}

export function clampToNov(iso: string): string {
  if (iso < NOV_START) return NOV_START
  if (iso > NOV_END) return NOV_END
  return iso
}

/** All 30 November dates. */
export const NOV_DAYS: string[] = Array.from({ length: 30 }, (_, i) => addDays(NOV_START, i))

/** 1-based day of month. */
export function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10))
}

/** 0 = Sunday. */
export function weekday(iso: string): number {
  return new Date(toUTC(iso)).getUTCDay()
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Nov 14" */
export function formatShort(iso: string): string {
  return `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${dayOfMonth(iso)}`
}

/** "Sat, Nov 14" */
export function formatLong(iso: string): string {
  return `${WEEKDAYS[weekday(iso)]}, ${formatShort(iso)}`
}

/** "13 days until release", "Release day!", "Released 3 days ago" */
export function releaseLabel(from: string = todayISO()): string {
  const n = daysBetween(from, RELEASE_DATE)
  if (n > 1) return `${n} days until release`
  if (n === 1) return '1 day until release'
  if (n === 0) return 'Release day!'
  return n === -1 ? 'Released yesterday' : `Released ${-n} days ago`
}
