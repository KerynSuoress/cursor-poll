import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const REFRESH_MS = 10_000

export function ResultsPage() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchResults = useCallback(async () => {
    setError(null)
    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('id, text, order_index')
      .order('order_index', { ascending: true })
    if (qErr) {
      setError(qErr.message)
      setRows([])
      setLoading(false)
      return
    }

    const { data: votes, error: vErr } = await supabase
      .from('votes')
      .select('question_id, score')
    if (vErr) {
      setError(vErr.message)
      setRows([])
      setLoading(false)
      return
    }

    const byQ = {}
    for (const v of votes ?? []) {
      if (!byQ[v.question_id]) byQ[v.question_id] = []
      byQ[v.question_id].push(v.score)
    }

    const computed = (questions ?? []).map((q) => {
      const list = byQ[q.id] ?? []
      const count = list.length
      const avg =
        count === 0 ? 0 : list.reduce((a, b) => a + b, 0) / count
      return {
        id: q.id,
        text: q.text,
        avg: Number(avg.toFixed(1)),
        count,
      }
    })
    setRows(computed)
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
      <div className="flex min-h-screen items-center justify-center text-zinc-400">
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

  const totalVotes = rows.reduce((m, r) => Math.max(m, r.count), 0)

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <header className="mb-10 text-center">
        <h1 className="text-xl font-semibold text-white sm:text-2xl">
          Results — Thank you for voting!
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Live averages (updates every {REFRESH_MS / 1000}s).{' '}
          {totalVotes > 0 && (
            <span className="text-zinc-500">
              Max responses on any question: {totalVotes}
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
    </div>
  )
}
