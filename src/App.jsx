import { useCallback, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { supabase, isConfigured } from './supabaseClient'
import { useSession } from './hooks/useSession'
import { NameForm } from './components/NameForm'
import { VotingPage } from './components/VotingPage'
import { ResultsPage } from './components/ResultsPage'
import ResultsRoute from './pages/ResultsRoute'

const Spinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-zinc-400">
    <span
      className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-500"
      aria-label="Loading"
    />
  </div>
)

export default function App() {
  if (!isConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
        <div className="max-w-sm rounded-2xl border border-red-900/50 bg-zinc-900 p-8 text-center">
          <p className="text-sm font-semibold text-red-400">App not configured</p>
          <p className="mt-2 text-sm text-zinc-500">
            Copy <code className="text-zinc-300">.env.example</code> to{' '}
            <code className="text-zinc-300">.env</code> and fill in your Supabase
            URL and anon key, then restart the dev server.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/results" element={<ResultsRoute />} />
      <Route path="*" element={<AppInner />} />
    </Routes>
  )
}

function AppInner() {
  const { session, loading: sessionLoading } = useSession()
  /** @type {boolean | undefined} undefined = not loaded yet */
  const [hasVoted, setHasVoted] = useState(undefined)

  const refreshVoteStatus = useCallback(async (userId) => {
    if (!userId) {
      setHasVoted(undefined)
      return
    }
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
      if (error) throw error
      setHasVoted((data?.length ?? 0) > 0)
    } catch (e) {
      console.error(e)
      setHasVoted(false)
    }
  }, [])

  useEffect(() => {
    if (sessionLoading) return
    const id = session?.user?.id
    if (!id) {
      setHasVoted(undefined)
      return
    }
    refreshVoteStatus(id)
  }, [session, sessionLoading, refreshVoteStatus])

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  function handleSubmitted() {
    const id = session?.user?.id
    if (id) refreshVoteStatus(id)
  }

  if (sessionLoading) return <Spinner />

  if (!session?.user) return <NameForm />

  if (hasVoted === undefined) return <Spinner />

  if (hasVoted) return <ResultsPage onSignOut={handleSignOut} />

  return (
    <VotingPage
      userId={session.user.id}
      onSubmitted={handleSubmitted}
      onSignOut={handleSignOut}
    />
  )
}
