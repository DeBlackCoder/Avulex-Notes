import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { aiChat } from '@/lib/ai'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { topic, title, style, length } = await request.json()
  if (!topic) return NextResponse.json({ error: 'Topic is required' }, { status: 400 })

  const lengthGuide = length === 'short' ? '200-300 words' : length === 'long' ? '600-900 words' : '350-500 words'
  const styleGuide = style === 'bullet' ? 'Use bullet points and numbered lists. Keep it scannable.' :
                     style === 'essay' ? 'Write in flowing prose paragraphs.' :
                     'Mix short paragraphs with bullet points where helpful.'

  const prompt = `Write a well-structured note about: "${topic}"

Requirements:
- Length: ${lengthGuide}
- Style: ${styleGuide}
- Use markdown formatting: ## for subheadings, **bold** for key terms, bullet lists where appropriate
- Start directly with the content — no "Here is your note:" preamble
- Be informative, clear, and useful
- End with a brief summary or key takeaways section

Topic: ${topic}`

  try {
    const content = await aiChat(prompt,
      'You are a knowledgeable note-taking assistant. Write clear, well-structured, informative notes on any topic. Use markdown formatting. Be direct and useful.'
    )
    return NextResponse.json({ content, suggestedTitle: title || topic })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI failed'
    const is503 = msg.includes('503') || msg.includes('high demand')
    return NextResponse.json({ error: is503 ? 'AI is busy — try again in a few seconds' : msg }, { status: 502 })
  }
}
