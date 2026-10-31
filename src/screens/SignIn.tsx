import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendLink(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  // An installed iPhone home-screen app doesn't share a session with Safari,
  // so a magic link opens signed-in in Safari, not in the app. Typing the
  // code from the same email signs in right here instead.
  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })
    setBusy(false)
    if (error) setError(error.message)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-bold">November Build Log</h1>
        <p className="mt-1 text-sm text-ink-2">Build every day. Post every day.</p>
      </div>

      {!sent ? (
        <form onSubmit={sendLink} className="flex flex-col gap-3">
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <button className="btn-primary" disabled={busy || !email.trim()}>
            {busy ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <p className="text-sm text-ink-2">
            Check <span className="font-semibold text-ink">{email}</span>. Tap the link, or type the
            code from the email here.
          </p>
          <input
            className="input text-center text-lg tracking-[0.3em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={10}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="Code"
            aria-label="Code from email"
          />
          <button className="btn-primary" disabled={busy || code.length < 6}>
            {busy ? 'Checking…' : 'Sign in with code'}
          </button>
          <button type="button" className="btn" onClick={() => setSent(false)}>
            Use a different email
          </button>
        </form>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </main>
  )
}
