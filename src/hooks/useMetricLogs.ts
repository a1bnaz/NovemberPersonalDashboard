import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Metric, MetricLog } from '../lib/types'
import { errorMessage } from '../lib/util'
import { trackWrite } from './useAutosave'

export function useMetricLogs(userId: string) {
  const [logs, setLogs] = useState<MetricLog[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef(logs)

  const replace = useCallback((next: MetricLog[]) => {
    ref.current = next
    setLogs(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('metric_logs')
      .select('metric, date, value')
      .eq('user_id', userId)
      .order('date')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else {
          replace((data ?? []) as unknown as MetricLog[])
          setLoaded(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [userId, replace])

  /** Log a value for a date (overwrites that day). Resolves false on failure. */
  const log = useCallback(
    async (metric: Metric, date: string, value: number): Promise<boolean> => {
      const before = ref.current
      const entry: MetricLog = { metric, date, value }
      replace(
        [...before.filter((l) => !(l.metric === metric && l.date === date)), entry].sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
      )
      setError(null)
      const { error } = await trackWrite(
        Promise.resolve(
          supabase.from('metric_logs').upsert({ user_id: userId, ...entry }, { onConflict: 'user_id,metric,date' }),
        ),
      )
      if (error) {
        replace(before)
        setError(errorMessage(error))
        return false
      }
      return true
    },
    [userId, replace],
  )

  return { logs, loaded, error, log }
}
