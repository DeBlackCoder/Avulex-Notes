import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { streamChat, type ChatMsg } from '@/lib/ai'

export const runtime = 'nodejs'

const SYSTEM = `You are Ava, a smart AI assistant built into Avulex Notes.

You can:
- Answer questions on any topic
- Help brainstorm, plan, and think through ideas  
- Write and edit content (emails, proposals, code, essays)
- Discuss and improve notes the user shares with you
- Summarize, explain, translate text
- Have natural multi-turn conversations

Be concise but thorough. Use markdown formatting where helpful.
When the user shares note content, engage with it directly.
Stay friendly, curious, and genuinely useful.`

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const { messages, noteContext } = await request.json() as {
    messages: ChatMsg[]
    noteContext?: string
  }

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: 'No messages' }), { status: 400 })
  }

  const system = noteContext
    ? `${SYSTEM}\n\nThe user has this note open:\n\`\`\`\n${noteContext.slice(0, 3000)}\n\`\`\``
    : SYSTEM

  try {
    return await streamChat(messages, system)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI service error'
    const is503 = msg.includes('503') || msg.includes('high demand') || msg.includes('overloaded')
    console.error('[chat]', err)
    
    if (is503) {
      // Return a friendly SSE message so the UI shows it gracefully
      const enc = new TextEncoder()
      const friendlyMsg = "I'm experiencing high demand right now and all models are temporarily busy. Please try again in a few seconds — or add a **Groq API key** to `.env.local` for a faster, always-available fallback:\n\n1. Get a free key at [console.groq.com](https://console.groq.com/keys)\n2. Add `GROQ_API_KEY=your_key` to `.env.local`\n3. Restart the server"
      const stream = new ReadableStream({
        start(ctrl) {
          ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ text: friendlyMsg })}\n\n`))
          ctrl.enqueue(enc.encode('data: [DONE]\n\n'))
          ctrl.close()
        }
      })
      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
      })
    }
    
    return new Response(JSON.stringify({ error: msg }), { status: 502 })
  }
}
