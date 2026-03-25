export function QuestionCard({ question, value, onChange }) {
  const scores = [1, 2, 3, 4, 5]

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
      <p className="mb-4 text-sm font-medium leading-relaxed text-white sm:text-base">
        {question.text}
      </p>
      <div className="flex flex-wrap gap-2">
        {scores.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(question.id, n)}
            className={`min-h-11 min-w-11 rounded-lg px-3 py-2 text-sm font-semibold transition
              ${
                value === n
                  ? 'bg-violet-600 text-white ring-2 ring-violet-400 ring-offset-2 ring-offset-zinc-900'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-xs text-zinc-500">
        <span>Poor</span>
        <span>Excellent</span>
      </div>
    </div>
  )
}
