import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Note } from '../lib/types'
import { errorMessage, uuid } from '../lib/util'
import { trackWrite } from './useAutosave'

export function useNotes(userId: string) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef(notes)

  const replace = useCallback((next: Note[]) => {
    ref.current = next
    setNotes(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('notes')
      .select('id, title, body, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else {
          replace((data ?? []) as unknown as Note[])
          setLoaded(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [userId, replace])

  /** Optimistically add a note. Resolves false (and removes it) on failure. */
  const add = useCallback(
    async (title: string, body: string): Promise<boolean> => {
      const note: Note = { id: uuid(), title, body, created_at: new Date().toISOString() }
      replace([note, ...ref.current])
      setError(null)
      const { error } = await trackWrite(Promise.resolve(supabase.from('notes').insert({ user_id: userId, ...note })))
      if (error) {
        replace(ref.current.filter((n) => n.id !== note.id))
        setError(errorMessage(error))
        return false
      }
      return true
    },
    [userId, replace],
  )

  /** Optimistically delete a note; puts it back on failure. */
  const remove = useCallback(
    async (id: string) => {
      const before = ref.current
      replace(before.filter((n) => n.id !== id))
      setError(null)
      const { error } = await trackWrite(Promise.resolve(supabase.from('notes').delete().eq('id', id)))
      if (error) {
        replace(before)
        setError(errorMessage(error))
      }
    },
    [replace],
  )

  return { notes, loaded, error, add, remove }
}
