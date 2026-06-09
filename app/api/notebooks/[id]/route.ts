import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { connectDB } from '@/lib/mongodb'
import { Notebook, Note, ActivityTimeline } from '@/lib/models'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { id } = await params
  const body = await request.json()
  const { name } = body

  if (name !== undefined) {
    if (!name || name.length < 1 || name.length > 255) {
      return NextResponse.json({ error: 'Name must be 1-255 characters' }, { status: 400 })
    }
  }

  // Strip server-controlled fields to avoid $set/$setOnInsert conflicts
  const { ownerUserId: _own, _id: _id2, ...safeBody } = body

  // Upsert — create notebook in MongoDB if it doesn't exist yet
  const notebook = await Notebook.findOneAndUpdate(
    { _id: id, ownerUserId: session.userId },
    {
      $set: { ...safeBody, updatedAt: new Date() },
      $setOnInsert: { _id: id, ownerUserId: session.userId, collaborators: [] },
    },
    { returnDocument: 'after', upsert: true }
  )

  if (name) {
    await ActivityTimeline.create({
      userId: session.userId, action: 'notebook_renamed',
      targetType: 'notebook', targetId: id, targetName: name,
    })
  }

  return NextResponse.json({ notebook })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { id } = await params
  await Notebook.findOneAndDelete({ _id: id, ownerUserId: session.userId })
  await Note.updateMany(
    { notebookId: id, ownerUserId: session.userId },
    { isTrashed: true, trashedAt: new Date(), originalNotebookId: id }
  )
  await ActivityTimeline.create({
    userId: session.userId, action: 'notebook_deleted',
    targetType: 'notebook', targetId: id, targetName: '',
  })
  return NextResponse.json({ ok: true })
}
