import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { QuestionCard } from './QuestionCard'

const FEEDBACK_MAX = 1000

export function VotingPage({ userId, onSubmitted, onSignOut }) {
  const [questions, setQuestions] = useState([])
  const [scores, setScores] = useState({})
  const [feedback, setFeedback] = useState('')
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
      const { error: votesError } = await supabase.from('votes').upsert(rows, {
        onConflict: 'user_id,question_id',
      })
      if (votesError) throw votesError

      const trimmedFeedback = feedback.trim()
      if (trimmedFeedback) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ feedback: trimmedFeedback })
          .eq('id', userId)
        if (profileError) throw profileError
      }

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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-zinc-400">
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

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-zinc-400">No questions available yet.</p>
        <p className="mt-2 text-sm text-zinc-500">
          Make sure schema.sql has been applied in the Supabase SQL editor.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-[#0a0a0a] px-4 py-10">
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

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <label
            htmlFor="feedback"
            className="mb-3 block text-sm font-medium text-white"
          >
            Any other thoughts or suggestions for future events?{' '}
            <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <textarea
            id="feedback"
            rows={4}
            maxLength={FEEDBACK_MAX}
            placeholder="Share any comments, ideas, or suggestions…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={submitting}
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60"
          />
          <p className="mt-1 text-right text-xs text-zinc-600">
            {feedback.length}/{FEEDBACK_MAX}
          </p>
        </div>

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
        <p className="text-center text-xs text-zinc-600">
          Wrong person?{' '}
          <button
            type="button"
            onClick={onSignOut}
            className="text-zinc-400 underline hover:text-white"
          >
            Sign out
          </button>
        </p>
      </form>
    </div>
  )
}
