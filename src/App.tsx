import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { clampToNov, todayISO } from './lib/dates'
import { supabase, supabaseConfigured } from './lib/supabase'
import Ideas from './screens/Ideas'
import Month from './screens/Month'
import Scorecard from './screens/Scorecard'
import SignIn from './screens/SignIn'
import Today from './screens/Today'

type Tab = 'today' | 'month' | 'scorecard' | 'ideas'

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'month', label: 'Month' },
  { id: 'scorecard', label: 'Scorecard' },
  { id: 'ideas', label: 'Ideas' },
]

export default function App() {
  const { session, loading } = useAuth()

  if (!supabaseConfigured) {
    return (
      <main className="mx-auto max-w-md p-4">
        <h1 className="text-xl font-bold">November Build Log</h1>
        <p className="mt-2 text-sm text-ink-2">
          Supabase isn't configured. Copy <code>.env.example</code> to <code>.env.local</code>, fill in
          your project URL and anon key, and restart the dev server.
        </p>
      </main>
    )
  }
  if (loading) return null
  if (!session) return <SignIn />
  return <Shell userId={session.user.id} email={session.user.email ?? ''} />
}

function Shell({ userId, email }: { userId: string; email: string }) {
  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState(() => clampToNov(todayISO()))

  function openDay(d: string) {
    setDate(d)
    setTab('today')
  }

  return (
    <div className="mx-auto min-h-dvh max-w-xl">
      <header className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="text-sm font-semibold text-ink-2">November Build Log</span>
        <button
          className="min-h-10 px-2 text-xs text-muted underline"
          title={email}
          onClick={() => void supabase.auth.signOut()}
        >
          Sign out
        </button>
      </header>

      <main className="px-4 pb-28">
        {tab === 'today' && <Today userId={userId} date={date} onDateChange={setDate} />}
        {tab === 'month' && <Month userId={userId} onOpenDay={openDay} />}
        {tab === 'scorecard' && <Scorecard userId={userId} />}
        {tab === 'ideas' && <Ideas userId={userId} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-xl grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`min-h-14 text-sm font-medium ${tab === t.id ? 'text-ink' : 'text-muted'}`}
            >
              <span className={`border-b-2 pb-1 ${tab === t.id ? 'border-ink' : 'border-transparent'}`}>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
