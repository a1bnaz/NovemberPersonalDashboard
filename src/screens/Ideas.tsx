import { useState, type FormEvent } from 'react'
import { useNotes } from '../hooks/useNotes'
import type { Note } from '../lib/types'

export default function Ideas({ userId }: { userId: string }) {
  const { notes, loaded, error, add, remove } = useNotes(userId)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const t = title.trim()
    const b = body.trim()
    if (!t && !b) return
    setTitle('')
    setBody('')
    const ok = await add(t, b)
    if (!ok) {
      // Put the typed text back so nothing is lost.
      setTitle(t)
      setBody(b)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="card flex flex-col gap-2">
        <span className="label">New idea</span>
        <input className="input font-semibold" placeholder="Title" aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea
          className="input min-h-24 py-2"
          placeholder="Details"
          aria-label="Details"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button className="btn-primary" disabled={!title.trim() && !body.trim()}>
          Save idea
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {!loaded && !error && <p className="text-sm text-muted">Loading…</p>}
      {loaded && notes.length === 0 && <p className="text-center text-sm text-muted">No ideas yet.</p>}

      <ul className="flex flex-col gap-3">
        {notes.map((n) => (
          <NoteItem key={n.id} note={n} onDelete={() => void remove(n.id)} />
        ))}
      </ul>
    </div>
  )
}

function NoteItem({ note, onDelete }: { note: Note; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const created = new Date(note.created_at).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
  })

  return (
    <li className="card">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {note.title && <h3 className="font-semibold">{note.title}</h3>}
          {note.body && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-2">{note.body}</p>}
          <p className="mt-2 text-xs text-muted">{created}</p>
        </div>
        {!confirming && (
          <button className="btn border-transparent text-muted" aria-label="Delete idea" onClick={() => setConfirming(true)}>
            ✕
          </button>
        )}
      </div>
      {confirming && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <span className="mr-auto text-sm">Delete this idea?</span>
          <button className="btn" onClick={() => setConfirming(false)}>
            Cancel
          </button>
          <button className="btn border-transparent bg-red-600 text-white" onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </li>
  )
}
