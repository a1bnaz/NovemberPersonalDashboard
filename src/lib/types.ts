export type Task = { text: string; done: boolean }

export type DayRow = {
  date: string
  built: boolean
  minutes: number
  posted: boolean
  post_note: string
  notes: string
  tasks: Task[]
}

export type Metric = 'followers' | 'visits'

export type Tiers = {
  start: number | null
  floor: number | null
  target: number | null
  stretch: number | null
}

export type MilestoneState = { done: boolean; on: string | null }

export type Settings = {
  targets: Partial<Record<Metric, Tiers>>
  milestones: Record<string, MilestoneState>
  updates_shipped: number
  learned: string[]
}

export type MetricLog = { metric: Metric; date: string; value: number }

export type Note = { id: string; title: string; body: string; created_at: string }

export const MILESTONES = [
  { id: 'core', label: 'Core mechanic works', due: '2026-11-07' },
  { id: 'loop', label: 'Full game loop playable', due: '2026-11-11' },
  { id: 'release', label: 'Game released', due: '2026-11-14' },
  { id: 'launch_post', label: 'Launch post published', due: '2026-11-16' },
  { id: 'friends', label: '5+ friends played it', due: '2026-11-21' },
] as const

export const METRICS: { id: Metric; label: string }[] = [
  { id: 'followers', label: 'Followers' },
  { id: 'visits', label: 'Game visits' },
]

export function emptyDay(date: string): DayRow {
  return { date, built: false, minutes: 0, posted: false, post_note: '', notes: '', tasks: [] }
}

export function emptyTiers(): Tiers {
  return { start: null, floor: null, target: null, stretch: null }
}

export function defaultSettings(): Settings {
  return { targets: {}, milestones: {}, updates_shipped: 0, learned: ['', '', ''] }
}
