import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../lib/util'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export type SaveState = { status: SaveStatus; error: string | null }

// Every in-flight write across the app, so a screen that is about to read
// (e.g. Month after leaving Today) can wait for pending saves to land first.
const inFlightWrites = new Set<Promise<unknown>>()

export function trackWrite<T>(p: Promise<T>): Promise<T> {
  inFlightWrites.add(p)
  p.finally(() => inFlightWrites.delete(p)).catch(() => {})
  return p
}

export function whenSaved(): Promise<void> {
  return Promise.allSettled([...inFlightWrites]).then(() => undefined)
}

/**
 * Debounced, serialized saving of a whole value. The latest value always wins;
 * a failed save keeps the value pending so `retry` (or the next edit) re-sends it.
 */
export function useAutosave<T>(save: (value: T) => Promise<void>) {
  const [state, setState] = useState<SaveState>({ status: 'idle', error: null })
  const saveRef = useRef(save)
  const pending = useRef<{ value: T } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const running = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    saveRef.current = save
  }, [save])

  const flush = useCallback((): Promise<void> => {
    window.clearTimeout(timer.current)
    timer.current = undefined
    const next = running.current.then(async () => {
      const job = pending.current
      if (!job) return
      pending.current = null
      setState({ status: 'saving', error: null })
      try {
        await saveRef.current(job.value)
        if (!pending.current) setState({ status: 'saved', error: null })
      } catch (e) {
        // Keep the unsaved value unless the user has already typed something newer.
        if (!pending.current) pending.current = job
        setState({ status: 'error', error: errorMessage(e) })
      }
    })
    running.current = next
    return trackWrite(next)
  }, [])

  const schedule = useCallback(
    (value: T, delayMs = 0) => {
      pending.current = { value }
      setState({ status: 'saving', error: null })
      window.clearTimeout(timer.current)
      if (delayMs <= 0) void flush()
      else timer.current = window.setTimeout(() => void flush(), delayMs)
    },
    [flush],
  )

  // Save immediately if the app is backgrounded or closed mid-debounce.
  useEffect(() => {
    const onPageHide = () => {
      if (pending.current) void flush()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onPageHide()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [flush])

  return { saveState: state, schedule, flush, retry: flush }
}
