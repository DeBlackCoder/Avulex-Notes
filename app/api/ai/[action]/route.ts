import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { aiChat } from '@/lib/ai'

const ACTIONS = [
  'summarize', 'generate-title', 'ask', 'improve', 'fix-grammar',
  'make-professional', 'simplify', 'translate', 'extract-actions',
  'generate-tags', 'meeting-assistant', 'generate-content', 'second-brain'
] as const

type Action = typeof ACTIONS[number]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await params
  if (!ACTIONS.includes(action as Action)) {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }

  const body = await request.json()
  const { content, notes, question, targetLanguage, selection } = body

  try {
    let result = ''

    switch (action as Action) {

      // 1. Summarize note
      case 'summarize': {
        if (!content || content.trim().split(/\s+/).length < 50) {
          return NextResponse.json({ error: 'Note needs at least 50 words to summarize.' }, { status: 400 })
        }
        result = await aiChat(
          `Summarize the following note in 3 sections:\n**Key Points** (bullet list)\n**Action Items** (bullet list, or "None")\n**Deadlines** (bullet list, or "None")\n\nNote:\n${content}`,
          'You are a concise note summarization assistant. Always use the exact 3-section format requested.'
        )
        break
      }

      // 2. Auto-generate title
      case 'generate-title': {
        if (!content || content.trim().split(/\s+/).length < 10) {
          return NextResponse.json({ error: 'Note needs at least 10 words for a title.' }, { status: 400 })
        }
        result = await aiChat(
          `Generate a concise, descriptive title (max 70 characters) for this note. Reply with ONLY the title, no quotes.\n\nNote:\n${content}`,
          'You generate short, specific note titles. Never use generic titles like "Untitled" or "Note".'
        )
        result = result.replace(/^["']|["']$/g, '').slice(0, 70)
        break
      }

      // 3. Ask a question across all notes (second brain / semantic search)
      case 'ask':
      case 'second-brain': {
        if (!question) return NextResponse.json({ error: 'No question provided.' }, { status: 400 })
        if (!notes || notes.length === 0) {
          return NextResponse.json({ result: "You don't have any notes yet. Start writing and I'll help you find answers!" })
        }
        const notesText = (notes as Array<{ title: string; content: string }>)
          .slice(0, 50) // limit context
          .map((n, i) => `[Note ${i + 1}: ${n.title || 'Untitled'}]\n${n.content?.slice(0, 800) || ''}`)
          .join('\n\n---\n\n')
        result = await aiChat(
          `Based on the following notes, answer this question: "${question}"\n\nIf the answer isn't in the notes, say so clearly.\n\nNotes:\n${notesText}`,
          'You are a personal knowledge assistant. Answer questions based only on the provided notes. Cite which note(s) contain the relevant information.'
        )
        break
      }

      // 4. Writing assistant — improve writing
      case 'improve': {
        if (!selection && !content) return NextResponse.json({ error: 'No text provided.' }, { status: 400 })
        result = await aiChat(
          `Improve the writing quality of this text. Make it clearer, more engaging, and better structured. Return ONLY the improved text.\n\nText:\n${selection || content}`,
          'You are a professional writing editor. Improve clarity, flow, and engagement. Return only the improved text.'
        )
        break
      }

      // 5. Fix grammar
      case 'fix-grammar': {
        if (!selection && !content) return NextResponse.json({ error: 'No text provided.' }, { status: 400 })
        result = await aiChat(
          `Fix all grammar, spelling, and punctuation errors in this text. Return ONLY the corrected text with no explanations.\n\nText:\n${selection || content}`,
          'You are a grammar correction tool. Fix errors silently. Return only the corrected text.'
        )
        break
      }

      // 6. Make professional
      case 'make-professional': {
        if (!selection && !content) return NextResponse.json({ error: 'No text provided.' }, { status: 400 })
        result = await aiChat(
          `Rewrite this text in a professional, formal tone suitable for business communication. Return ONLY the rewritten text.\n\nText:\n${selection || content}`,
          'You rewrite text in a professional business tone. Return only the rewritten text.'
        )
        break
      }

      // 7. Simplify
      case 'simplify': {
        if (!selection && !content) return NextResponse.json({ error: 'No text provided.' }, { status: 400 })
        result = await aiChat(
          `Simplify this text so it's easy to understand. Use plain language. Return ONLY the simplified text.\n\nText:\n${selection || content}`,
          'You simplify complex text into plain language. Return only the simplified text.'
        )
        break
      }

      // 8. Translate
      case 'translate': {
        if (!selection && !content) return NextResponse.json({ error: 'No text provided.' }, { status: 400 })
        const lang = targetLanguage || 'French'
        result = await aiChat(
          `Translate the following text to ${lang}. Return ONLY the translated text.\n\nText:\n${selection || content}`,
          `You are a professional translator. Translate accurately to ${lang}.`
        )
        break
      }

      // 9. Extract action items
      case 'extract-actions': {
        if (!content) return NextResponse.json({ error: 'No content provided.' }, { status: 400 })
        result = await aiChat(
          `Extract all action items, tasks, and to-dos from this note. Format as a checklist with "- [ ] " prefix for each item. If there are deadlines or assignees mentioned, include them. If no action items found, say "No action items found."\n\nNote:\n${content}`,
          'You extract actionable tasks from notes. Format each as a markdown checkbox item.'
        )
        break
      }

      // 10. Generate tags
      case 'generate-tags': {
        if (!content) return NextResponse.json({ error: 'No content provided.' }, { status: 400 })
        result = await aiChat(
          `Generate 3-7 relevant tags for this note. Return ONLY a JSON array of lowercase tag strings with no spaces (use hyphens). Example: ["react","javascript","frontend"]\n\nNote:\n${content}`,
          'You generate concise, relevant tags for notes. Return only a valid JSON array.'
        )
        try {
          const match = result.match(/\[[\s\S]*\]/)
          result = match ? match[0] : '[]'
        } catch { result = '[]' }
        return NextResponse.json({ result: JSON.parse(result) })
      }

      // 11. Meeting assistant
      case 'meeting-assistant': {
        if (!content) return NextResponse.json({ error: 'No transcript provided.' }, { status: 400 })
        result = await aiChat(
          `Analyze this meeting transcript or notes and generate:\n\n**Summary** (2-3 sentences)\n**Key Decisions** (bullet list)\n**Action Items** (bullet list with owner if mentioned)\n**Questions Raised** (bullet list, or "None")\n**Next Steps** (bullet list)\n\nTranscript:\n${content}`,
          'You are a meeting assistant. Always use the exact 5-section format requested.'
        )
        break
      }

      // 12. Content generation
      case 'generate-content': {
        if (!content) return NextResponse.json({ error: 'No prompt provided.' }, { status: 400 })
        result = await aiChat(
          content,
          'You are a helpful writing assistant integrated into a notes app. Generate well-structured, useful content based on the user\'s request.'
        )
        break
      }
    }

    return NextResponse.json({ result })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI service failed'
    const is503 = message.includes('503') || message.includes('high demand')
    console.error(`AI [${action}] error:`, err)
    const userMsg = is503
      ? 'AI is experiencing high demand. Please try again in a few seconds, or set up a Groq API key at console.groq.com for a faster fallback.'
      : message
    return NextResponse.json({ error: userMsg }, { status: is503 ? 503 : 502 })
  }
}
