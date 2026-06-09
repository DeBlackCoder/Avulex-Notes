/**
 * Unified AI — tries Gemini models in order, then falls back to Groq.
 * Both are 100% free.
 *
 * Get Gemini key: https://aistudio.google.com/app/apikey
 * Get Groq key:   https://console.groq.com/keys
 */
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
]

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
]

function hasGemini() {
  const k = process.env.GEMINI_API_KEY
  return !!k && k !== 'your_gemini_api_key'
}

function hasGroq() {
  const k = process.env.GROQ_API_KEY
  return !!k && k !== 'your_groq_api_key'
}

function noProviderError() {
  throw new Error(
    'No AI provider configured. Add GEMINI_API_KEY (https://aistudio.google.com/app/apikey) ' +
    'or GROQ_API_KEY (https://console.groq.com/keys) to .env.local'
  )
}

// ── Groq text generation ────────────────────────────────────────────────────
async function groqGenerate(prompt: string, system?: string): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const msgs: Groq.Chat.ChatCompletionMessageParam[] = []
  if (system) msgs.push({ role: 'system', content: system })
  msgs.push({ role: 'user', content: prompt })

  for (const model of GROQ_MODELS) {
    try {
      const res = await groq.chat.completions.create({
        model,
        messages: msgs,
        max_tokens: 1024,
        temperature: 0.7,
      })
      return res.choices[0]?.message?.content?.trim() ?? ''
    } catch (e: unknown) {
      const code = (e as { status?: number })?.status
      if (code === 429 || code === 503 || code === 404) continue
      throw e
    }
  }
  throw new Error('All Groq models failed')
}

// ── Main export ─────────────────────────────────────────────────────────────
export async function aiChat(prompt: string, system?: string): Promise<string> {
  // Try Gemini first (preferred = env var or default 'gemini')
  const preferred = process.env.AI_PROVIDER || 'gemini'

  if (preferred === 'gemini' && hasGemini()) {
    try { return await geminiGenerate(prompt, system) } catch (e: unknown) {
      const code = (e as { status?: number })?.status
      // Hard fail — not retryable with another provider
      if (code && code !== 503 && code !== 429 && code !== 404) throw e
      // Fall through to Groq
      console.warn('[AI] Gemini failed, trying Groq fallback:', (e as Error).message)
    }
  }

  if (hasGroq()) return groqGenerate(prompt, system)

  // If preferred was groq, try gemini as fallback
  if (preferred === 'groq' && hasGemini()) return geminiGenerate(prompt, system)

  noProviderError()
  return '' // unreachable
}

async function geminiGenerate(prompt: string, system?: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  let lastErr: Error | null = null

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        ...(system ? { systemInstruction: system } : {}),
      })
      const result = await model.generateContent(prompt)
      return result.response.text().trim()
    } catch (e: unknown) {
      const code = (e as { status?: number })?.status
      if (code === 503 || code === 404 || code === 429) { lastErr = e as Error; continue }
      throw e
    }
  }
  throw lastErr || new Error('All Gemini models failed')
}

// ── Streaming chat (used by /api/ai/chat) ───────────────────────────────────
export interface ChatMsg { role: 'user' | 'assistant'; content: string }

export async function streamChat(
  messages: ChatMsg[],
  system: string
): Promise<Response> {
  // Try Gemini streaming first
  if (hasGemini()) {
    try { return await streamGemini(messages, system) }
    catch (e: unknown) {
      const code = (e as { status?: number })?.status
      if (!code || code === 503 || code === 429 || code === 404) {
        console.warn('[AI] Gemini stream failed, falling back to Groq:', (e as Error).message)
      } else throw e
    }
  }

  // Groq streaming fallback
  if (hasGroq()) return streamGroq(messages, system)

  if (hasGemini()) return streamGemini(messages, system) // last resort

  noProviderError()
  return new Response('No provider', { status: 502 })
}

async function streamGemini(messages: ChatMsg[], system: string): Promise<Response> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const MODELS = GEMINI_MODELS
  let lastErr: Error | null = null

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: system })
      const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))
      const last = messages[messages.length - 1].content
      const chat = model.startChat({ history })
      const result = await chat.sendMessageStream(last)

      const enc = new TextEncoder()
      return new Response(
        new ReadableStream({
          async start(ctrl) {
            try {
              for await (const chunk of result.stream) {
                const t = chunk.text()
                if (t) ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ text: t })}\n\n`))
              }
              ctrl.enqueue(enc.encode('data: [DONE]\n\n'))
            } catch (e) {
              ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`))
            } finally { ctrl.close() }
          },
        }),
        { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } }
      )
    } catch (e: unknown) {
      const code = (e as { status?: number })?.status
      if (code === 503 || code === 404 || code === 429) { lastErr = e as Error; continue }
      throw e
    }
  }
  throw lastErr || new Error('All Gemini models failed')
}

async function streamGroq(messages: ChatMsg[], system: string): Promise<Response> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const groqMsgs: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]

  for (const model of GROQ_MODELS) {
    try {
      const stream = await groq.chat.completions.create({
        model, messages: groqMsgs, stream: true, max_tokens: 2048, temperature: 0.7,
      })
      const enc = new TextEncoder()
      return new Response(
        new ReadableStream({
          async start(ctrl) {
            try {
              for await (const chunk of stream) {
                const t = chunk.choices[0]?.delta?.content || ''
                if (t) ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ text: t })}\n\n`))
              }
              ctrl.enqueue(enc.encode('data: [DONE]\n\n'))
            } catch (e) {
              ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`))
            } finally { ctrl.close() }
          },
        }),
        { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } }
      )
    } catch (e: unknown) {
      const code = (e as { status?: number })?.status
      if (code === 429 || code === 503 || code === 404) continue
      throw e
    }
  }
  throw new Error('All Groq models failed')
}

export function getActiveProvider(): string {
  if (hasGemini()) return 'gemini'
  if (hasGroq()) return 'groq'
  return 'none'
}
