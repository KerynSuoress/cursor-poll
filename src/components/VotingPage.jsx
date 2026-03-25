import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { QuestionCard } from './QuestionCard'

export function VotingPage({ userId, onSubmitted }) {
  const [questions, setQuestions] = useState([])
  const [scores, setScores] = useState({})
  const [loadError, setLoadError] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadError(null)
      const { data, error } = await supabase
        .from('questions')
        .select('id, text, order_index')
        .order('order_index', { ascending: true })
      if (cancelled) return
      if (error) {
        setLoadError(error.message)
        setQuestions([])
      } else {
        setQuestions(data ?? [])
      }
      setLoadingQuestions(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setScore = useCallback((questionId, score) => {
    setScores((prev) => ({ ...prev, [questionId]: score }))
  }, [])

  const allAnswered =
    questions.length > 0 &&
    questions.every((q) => scores[q.id] != null && scores[q.id] >= 1)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!allAnswered || !userId) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      const rows = questions.map((q) => ({
        user_id: userId,
        question_id: q.id,
        score: scores[q.id],
      }))
      const { error } = await supabase.from('votes').upsert(rows, {
        onConflict: 'user_id,question_id',
      })
      if (error) throw error
      onSubmitted?.()
    } catch (err) {
      console.error(err)
      setSubmitError(err.message ?? 'Could not save votes.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingQuestions) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-400">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-500"
          aria-label="Loading"
        />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-400">{loadError}</p>
        <p className="mt-2 text-sm text-zinc-500">
          Check your Supabase URL, key, and that schema.sql was applied.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <header className="mb-10 text-center">
        <h1 className="text-xl font-semibold text-white sm:text-2xl">
          Cursor Conference 2026 — Share Your Feedback
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Rate each question from 1 (poor) to 5 (excellent).
        </p>
      </header>
      <form onSubmit={handleSubmit} className="space-y-6">
        {questions.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            value={scores[q.id]}
            onChange={setScore}
          />
        ))}
        {submitError && (
          <p className="text-center text-sm text-red-400" role="alert">
            {submitError}
          </p>
        )}
        <button
          type="submit"
          disabled={!allAnswered || submitting}
          className="w-full rounded-lg bg-violet-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit votes'}
        </button>
      </form>
    </div>
  )
}
