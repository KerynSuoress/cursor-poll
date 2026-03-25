import { useState } from 'react'
import { supabase } from '../supabaseClient'

const NAME_MAX = 80

export function NameForm() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter your name.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInAnonymously()
      if (authError) throw authError
      const user = authData.user
      if (!user) throw new Error('No user returned from anonymous sign-in.')

      const { error: profileError } = await supabase.from('profiles').upsert(
        { id: user.id, name: trimmed },
        { onConflict: 'id' }
      )
      if (profileError) {
        // Roll back the anonymous session so the user can try again cleanly.
        await supabase.auth.signOut()
        throw profileError
      }
    } catch (err) {
      console.error(err)
      setError(err.message ?? 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-[#0a0a0a] px-4 py-12">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
        <div className="mb-8 text-center">
          <p className="text-2xl font-semibold tracking-tight text-white">
            <span className="text-violet-400">Cursor</span> Conference
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Share your feedback — sign in with your name to vote
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Your name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Enter your name to vote"
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  aria-hidden
                />
                Signing in…
              </>
            ) : (
              'Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
