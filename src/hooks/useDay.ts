import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { emptyDay, type DayRow, type Task } from '../lib/types'
import { useAutosave } from './useAutosave'

const COLUMNS = 'date, built, minutes, posted, post_note, notes, tasks'

export function normalizeDay(raw: Partial<DayRow> & { date: string }): DayRow {
  return {
    ...emptyDay(raw.date),
    ...raw,
    post_note: raw.post_note ?? '',
    notes: raw.notes ?? '',
    tasks: Array.isArray(raw.tasks) ? (raw.tasks as Task[]) : [],
  }
}

export function useDay(userId: string, date: string) {
  const [row, setRow] = useState<DayRow>(() => emptyDay(date))
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const rowRef = useRef(row)
  const lastFlush = useRef<Promise<void>>(Promise.resolve())

  const save = useCallback(
    async (value: DayRow) => {
      const { error } = await supabase
        .from('days')
        .upsert({ user_id: userId, ...value }, { onConflict: 'user_id,date' })
      if (error) throw error
    },
    [userId],
  )
  const { saveState, schedule, flush, retry } = useAutosave(save)

  useEffect(() => {
    let cancelled = false
    const blank = emptyDay(date)
    rowRef.current = blank
    setRow(blank)
    setLoaded(false)
    setLoadError(null)

    // Wait for any save of the previous day to land before reading.
    lastFlush.current.then(async () => {
      const { data, error } = await supabase
        .from('days')
        .select(COLUMNS)
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        setLoadError(error.message)
        return
      }
      const next = data ? normalizeDay(data as unknown as DayRow) : blank
      rowRef.current = next
      setRow(next)
      setLoaded(true)
    })

    return () => {
      cancelled = true
      lastFlush.current = flush()
    }
  }, [userId, date, flush])

  /** Optimistically apply a change, then save (debounced when delayMs > 0). */
  const update = useCallback(
    (patch: Partial<DayRow> | ((current: DayRow) => Partial<DayRow>), delayMs = 0) => {
      const current = rowRef.current
      const next = { ...current, ...(typeof patch === 'function' ? patch(current) : patch) }
      rowRef.current = next
      setRow(next)
      schedule(next, delayMs)
    },
    [schedule],
  )

  return { row, loaded, loadError, update, saveState, retry }
}
