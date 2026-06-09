import { GoogleGenerativeAI } from '@google/generative-ai'

let _client: GoogleGenerativeAI | null = null

export function getGemini() {
  if (!_client) {
    const key = process.env.GEMINI_API_KEY
    if (!key || key === 'your_gemini_api_key') {
      throw new Error('GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/app/apikey')
    }
    _client = new GoogleGenerativeAI(key)
  }
  return _client
}

export async function geminiChat(prompt: string, systemInstruction?: string): Promise<string> {
  const genAI = getGemini()
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    ...(systemInstruction ? { systemInstruction } : {}),
  })
  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}
