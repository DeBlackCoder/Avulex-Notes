import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { connectDB } from '@/lib/mongodb'
import { Note, ActivityTimeline } from '@/lib/models'
import { generateId } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { searchParams } = request.nextUrl
  const notebookId = searchParams.get('notebookId')

  const query: Record<string, unknown> = { ownerUserId: session.userId, isTrashed: false, isArchived: false }
  if (notebookId) query.notebookId = notebookId

  const notes = await Note.find(query).sort({ updatedAt: -1 }).limit(200)
  return NextResponse.json({ notes })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const body = await request.json()

  const note = await Note.create({
    _id: generateId(),
    ownerUserId: session.userId,
    notebookId: body.notebookId,
    folderId: body.folderId || null,
    title: body.title || '',
    contentCiphertext: body.contentCiphertext || '',
    contentIv: body.contentIv || '',
    wordCount: body.wordCount || 0,
  })

  await ActivityTimeline.create({
    userId: session.userId,
    action: 'note_created',
    targetType: 'note',
    targetId: note._id,
    targetName: body.plainTitle || 'Untitled',
  })

  return NextResponse.json({ note }, { status: 201 })
}
