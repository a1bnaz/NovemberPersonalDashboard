import { supabaseConfigured } from './lib/supabase'

export default function App() {
  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="text-2xl font-bold">November Build Log</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Supabase config: {supabaseConfigured ? 'found ✓' : 'missing — copy .env.example to .env.local'}
      </p>
    </main>
  )
}
