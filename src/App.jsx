import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useSession } from './hooks/useSession'
import { NameForm } from './components/NameForm'
import { VotingPage } from './components/VotingPage'
import { ResultsPage } from './components/ResultsPage'

export default function App() {
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

  function handleSubmitted() {
    const id = session?.user?.id
    if (id) refreshVoteStatus(id)
    else setHasVoted(true)
  }

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-zinc-400">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-500"
          aria-label="Loading"
        />
      </div>
    )
  }

  if (!session?.user) {
    return <NameForm />
  }

  if (hasVoted === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-zinc-400">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-500"
          aria-label="Loading"
        />
      </div>
    )
  }

  if (hasVoted) {
    return <ResultsPage />
  }

  return <VotingPage userId={session.user.id} onSubmitted={handleSubmitted} />
}
