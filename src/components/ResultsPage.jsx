import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const REFRESH_MS = 10_000

export function ResultsPage({ onSignOut }) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchResults = useCallback(async () => {
    setError(null)
    const { data, error: rpcErr } = await supabase.rpc('get_vote_averages')
    if (rpcErr) {
      setError(rpcErr.message)
      setRows([])
      setLoading(false)
      return
    }
    setRows(
      (data ?? []).map((r) => ({
        id: r.id,
        text: r.text,
        avg: Number(Number(r.avg_score).toFixed(1)),
        count: Number(r.vote_count),
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  useEffect(() => {
    const id = window.setInterval(fetchResults, REFRESH_MS)
    return () => window.clearInterval(id)
  }, [fetchResults])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-zinc-400">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-500"
          aria-label="Loading"
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  const totalVoters = rows.reduce((m, r) => Math.max(m, r.count), 0)

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-[#0a0a0a] px-4 py-10">
      <header className="mb-10 text-center">
        <h1 className="text-xl font-semibold text-white sm:text-2xl">
          Results — Thank you for voting!
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Live averages (updates every {REFRESH_MS / 1000}s).{' '}
          {totalVoters > 0 && (
            <span className="text-zinc-500">
              {totalVoters} {totalVoters === 1 ? 'response' : 'responses'} so far
            </span>
          )}
        </p>
      </header>
      <ul className="space-y-8">
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
          >
            <p className="text-sm font-medium text-white sm:text-base">
              {r.text}
            </p>
            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-bold text-violet-400">
                {r.count === 0 ? '—' : r.avg}
              </span>
              {r.count > 0 && (
                <span className="text-sm text-zinc-400">/ 5 average</span>
              )}
              <span className="text-sm text-zinc-500">
                ({r.count} {r.count === 1 ? 'vote' : 'votes'})
              </span>
            </div>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-violet-600 transition-[width] duration-500"
                style={{
                  width: `${r.count === 0 ? 0 : (r.avg / 5) * 100}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-10 text-center text-xs text-zinc-600">
        Not you?{' '}
        <button
          type="button"
          onClick={onSignOut}
          className="text-zinc-400 underline hover:text-white"
        >
          Sign out
        </button>
      </p>
    </div>
  )
}
