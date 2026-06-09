import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getActiveProvider } from '@/lib/ai'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const provider = getActiveProvider()
  const configured = provider !== 'none'

  return NextResponse.json({
    provider,
    configured,
    providers: {
      gemini: {
        configured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key'),
        label: 'Google Gemini',
        freeLimit: '1,500 req/day',
        getKeyUrl: 'https://aistudio.google.com/app/apikey',
      },
      groq: {
        configured: !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key'),
        label: 'Groq (LLaMA 3)',
        freeLimit: '14,400 req/day',
        getKeyUrl: 'https://console.groq.com/keys',
      },
    },
  })
}
