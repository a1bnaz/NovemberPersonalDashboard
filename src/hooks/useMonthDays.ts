import { useEffect, useState } from 'react'
import { NOV_END, NOV_START } from '../lib/dates'
import { supabase } from '../lib/supabase'
import type { DayRow } from '../lib/types'
import { normalizeDay } from './useDay'
import { whenSaved } from './useAutosave'

/** All logged November days, keyed by date. Read-only; refetched on mount. */
export function useMonthDays(userId: string) {
  const [days, setDays] = useState<Record<string, DayRow>>({})
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // Let any save from the Today screen land first so counts are current.
    whenSaved().then(async () => {
      const { data, error } = await supabase
        .from('days')
        .select('date, built, minutes, posted, post_note, notes, tasks')
        .eq('user_id', userId)
        .gte('date', NOV_START)
        .lte('date', NOV_END)
      if (cancelled) return
      if (error) {
        setError(error.message)
        return
      }
      const map: Record<string, DayRow> = {}
      for (const raw of (data ?? []) as unknown as DayRow[]) map[raw.date] = normalizeDay(raw)
      setDays(map)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  return { days, loaded, error }
}
