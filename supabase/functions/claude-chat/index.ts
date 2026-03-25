/**
 * Supabase Edge Function — Claude chat proxy
 * Deploy via Dashboard: Edge Functions → create "claude-chat" → paste this file
 * Secret: Edge Functions → Manage secrets → ANTHROPIC_API_KEY = sk-ant-...
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6-20260217'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return json({ error: 'ANTHROPIC_API_KEY secret is not set in Edge Function secrets.' }, 500)
  }

  let messages: unknown, system: unknown
  try {
    const body = await req.json()
    messages = body.messages
    system = body.system
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const anthropicRes = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, messages }),
  })

  const data = await anthropicRes.json()

  if (!anthropicRes.ok) {
    // Surface the full Anthropic error so it's visible in the browser console
    return json(
      { error: data?.error?.message ?? JSON.stringify(data) },
      anthropicRes.status
    )
  }

  return json(data)
})
