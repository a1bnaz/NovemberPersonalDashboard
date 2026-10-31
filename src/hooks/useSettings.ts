import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { defaultSettings, type Settings } from '../lib/types'
import { useAutosave } from './useAutosave'

function normalize(raw: Partial<Settings> | null): Settings {
  const d = defaultSettings()
  if (!raw) return d
  const learned = Array.isArray(raw.learned) ? raw.learned : []
  return {
    targets: raw.targets ?? d.targets,
    milestones: raw.milestones ?? d.milestones,
    updates_shipped: raw.updates_shipped ?? 0,
    learned: [0, 1, 2].map((i) => learned[i] ?? ''),
  }
}

export function useSettings(userId: string) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const ref = useRef(settings)

  const save = useCallback(
    async (value: Settings) => {
      const { error } = await supabase.from('settings').upsert({ user_id: userId, ...value }, { onConflict: 'user_id' })
      if (error) throw error
    },
    [userId],
  )
  const { saveState, schedule, flush, retry } = useAutosave(save)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('settings')
      .select('targets, milestones, updates_shipped, learned')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setLoadError(error.message)
          return
        }
        const next = normalize(data as unknown as Settings | null)
        ref.current = next
        setSettings(next)
        setLoaded(true)
      })
    return () => {
      cancelled = true
      void flush()
    }
  }, [userId, flush])

  const update = useCallback(
    (patch: (current: Settings) => Partial<Settings>, delayMs = 0) => {
      const next = { ...ref.current, ...patch(ref.current) }
      ref.current = next
      setSettings(next)
      schedule(next, delayMs)
    },
    [schedule],
  )

  return { settings, loaded, loadError, update, saveState, retry }
}
