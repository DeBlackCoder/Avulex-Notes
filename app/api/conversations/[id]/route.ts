import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { connectDB } from '@/lib/mongodb'
import { AIConversation } from '@/lib/models'

type Params = Promise<{ id: string }>

// GET — fetch single conversation with all messages
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { id } = await params
  const conv = await AIConversation.findOne({ _id: id, userId: session.userId })
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ conversation: conv })
}

// PATCH — append messages or update title/pin
export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { id } = await params
  const body = await request.json()

  const update: Record<string, unknown> = { updatedAt: new Date() }
  if (body.title !== undefined) update.title = body.title
  if (body.pinned !== undefined) update.pinned = body.pinned
  if (body.archived !== undefined) update.archived = body.archived

  let conv
  if (body.messages) {
    // Append new messages
    conv = await AIConversation.findOneAndUpdate(
      { _id: id, userId: session.userId },
      { $push: { messages: { $each: body.messages } }, $set: update },
      { returnDocument: 'after' }
    )
  } else {
    conv = await AIConversation.findOneAndUpdate(
      { _id: id, userId: session.userId },
      { $set: update },
      { returnDocument: 'after' }
    )
  }
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ conversation: conv })
}

// DELETE — delete conversation
export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { id } = await params
  await AIConversation.findOneAndDelete({ _id: id, userId: session.userId })
  return NextResponse.json({ ok: true })
}
