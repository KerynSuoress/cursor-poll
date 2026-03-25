import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'

async function callClaude(messages, system) {
  const { data, error } = await supabase.functions.invoke('claude-chat', {
    body: { messages, system },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  const text = data?.content?.[0]?.text
  if (!text) throw new Error('Empty response from Claude.')
  return text
}

function buildSummaryPrompt(rows) {
  const lines = rows
    .map((r) =>
      r.count === 0
        ? `- "${r.text}": No responses yet`
        : `- "${r.text}": ${r.avg}/5 (${r.count} ${r.count === 1 ? 'vote' : 'votes'})`
    )
    .join('\n')
  return `Conference attendee feedback scores:\n\n${lines}\n\nWrite a concise (3–4 sentence) narrative summary. Highlight clear strengths and any areas that need improvement. Be direct and constructive. No bullet points.`
}

function buildChatSystem(rows, lowScoreQuestions) {
  const allScores = rows
    .map((r) => `"${r.text}": ${r.avg}/5`)
    .join(', ')
  const lowList = lowScoreQuestions
    .map((q) => `"${q.text}" (${q.avg}/5)`)
    .join(', ')
  return `You are a friendly conference organiser collecting follow-up feedback. Overall scores: ${allScores}. The following areas scored below 4/5: ${lowList}. Ask focused, one-at-a-time questions to understand what went wrong and how to improve. Keep messages short. When you have enough context, thank the attendee and close the conversation.`
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}

export function AIPanel({ rows }) {
  const [summary, setSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState(null)

  const lowScoreQuestions = rows.filter((r) => r.count > 0 && r.avg < 4)
  const hasLowScores = lowScoreQuestions.length > 0

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState(null)
  const [chatDone, setChatDone] = useState(false)

  const bottomRef = useRef(null)

  // Auto-generate summary
  useEffect(() => {
    if (rows.length === 0) {
      setSummaryLoading(false)
      return
    }
    const system =
      'You are a conference analyst. Be concise, constructive, and professional.'
    callClaude([{ role: 'user', content: buildSummaryPrompt(rows) }], system)
      .then((text) => {
        setSummary(text)
        setSummaryLoading(false)
      })
      .catch((err) => {
        setSummaryError(err.message)
        setSummaryLoading(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Kick off chatbot with an opening message
  useEffect(() => {
    if (!hasLowScores || messages.length > 0) return
    const system = buildChatSystem(rows, lowScoreQuestions)
    const lowList = lowScoreQuestions.map((q) => `"${q.text}" (${q.avg}/5)`).join(', ')
    setChatLoading(true)
    callClaude(
      [
        {
          role: 'user',
          content: `The following areas scored below 4/5: ${lowList}. Please greet me and ask a specific question about the area that needs the most improvement.`,
        },
      ],
      system
    )
      .then((text) => {
        setMessages([{ role: 'assistant', content: text }])
        setChatLoading(false)
      })
      .catch((err) => {
        setChatError(err.message)
        setChatLoading(false)
      })
  }, [hasLowScores]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll chat to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatLoading])

  async function handleSend(e) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || chatLoading || chatDone) return

    const newMessages = [...messages, { role: 'user', content: trimmed }]
    setMessages(newMessages)
    setInput('')
    setChatLoading(true)
    setChatError(null)

    try {
      const system = buildChatSystem(rows, lowScoreQuestions)
      const reply = await callClaude(newMessages, system)
      const updated = [...newMessages, { role: 'assistant', content: reply }]
      setMessages(updated)

      // Close the chat if Claude signals it's done (thanks / goodbye patterns)
      if (/thank you|thanks for|goodbye|that.s all|appreciate your/i.test(reply)) {
        setChatDone(true)
      }
    } catch (err) {
      setChatError(err.message)
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="mt-12 space-y-8">
      {/* AI Summary */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600/20 text-xs text-violet-400">
            ✦
          </span>
          <h2 className="text-sm font-semibold text-white">AI Summary</h2>
          <span className="ml-auto text-xs text-zinc-600">claude-sonnet-4-6</span>
        </div>

        {summaryLoading && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-500"
              aria-label="Generating"
            />
            Generating summary…
          </div>
        )}
        {summaryError && (
          <p className="text-sm text-red-400" role="alert">
            {summaryError}
          </p>
        )}
        {summary && (
          <p className="text-sm leading-relaxed text-zinc-300">{summary}</p>
        )}
      </section>

      {/* Chatbot — only shown when scores below 4 exist */}
      {hasLowScores && (
        <section className="rounded-xl border border-amber-900/40 bg-zinc-900 p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-xs text-amber-400">
              ↓
            </span>
            <h2 className="text-sm font-semibold text-white">
              Some areas scored below 4 — tell us more
            </h2>
          </div>

          {/* Message thread */}
          <div className="mb-4 max-h-80 space-y-3 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <p
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'rounded-br-sm bg-violet-700 text-white'
                      : 'rounded-bl-sm bg-zinc-800 text-zinc-200'
                  }`}
                >
                  {m.content}
                </p>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <p className="rounded-2xl rounded-bl-sm bg-zinc-800 px-4 py-2.5 text-sm">
                  <TypingDots />
                </p>
              </div>
            )}
            {chatError && (
              <p className="text-center text-xs text-red-400" role="alert">
                {chatError}
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {!chatDone ? (
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={chatLoading || messages.length === 0}
                placeholder={
                  messages.length === 0 ? 'Starting conversation…' : 'Your reply…'
                }
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || chatLoading || messages.length === 0}
                className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </form>
          ) : (
            <p className="text-center text-sm text-zinc-500">
              Thanks for the extra feedback!
            </p>
          )}
        </section>
      )}
    </div>
  )
}
