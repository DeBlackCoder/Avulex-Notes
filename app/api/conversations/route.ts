import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { connectDB } from '@/lib/mongodb'
import { AIConversation } from '@/lib/models'
import { generateId } from '@/lib/utils'

// GET — list all conversations for user
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const conversations = await AIConversation
    .find({ userId: session.userId, archived: false })
    .select('_id title messages noteContext noteId pinned createdAt updatedAt')
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean()
  return NextResponse.json({ conversations })
}

// POST — create a new conversation
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const body = await request.json()
  const conv = await AIConversation.create({
    _id: generateId(),
    userId: session.userId,
    title: body.title || 'New conversation',
    messages: body.messages || [],
    noteContext: body.noteContext || null,
    noteId: body.noteId || null,
  })
  return NextResponse.json({ conversation: conv }, { status: 201 })
}
