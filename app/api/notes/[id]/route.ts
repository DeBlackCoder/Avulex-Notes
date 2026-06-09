import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { connectDB } from '@/lib/mongodb'
import { Note, ActivityTimeline, VersionHistory } from '@/lib/models'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { id } = await params
  const note = await Note.findOne({ _id: id, ownerUserId: session.userId })
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ note })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { id } = await params
  const body = await request.json()

  // Strip fields that should not come from client or that conflict with $setOnInsert
  const { ownerUserId: _own, _id: _id2, plainTitle, wasRestored, saveVersion, ...safeBody } = body

  // Upsert — create the note in MongoDB if it doesn't exist yet
  const note = await Note.findOneAndUpdate(
    { _id: id, ownerUserId: session.userId },
    {
      $set: { ...safeBody, updatedAt: new Date() },
      $setOnInsert: { _id: id, ownerUserId: session.userId, createdAt: new Date() },
    },
    { returnDocument: 'after', upsert: true }
  )

  // Record activity for trash/restore actions
  if (body.isTrashed === true) {
    await ActivityTimeline.create({
      userId: session.userId, action: 'note_trashed',
      targetType: 'note', targetId: id, targetName: body.plainTitle || '',
    })
  } else if (body.isTrashed === false && body.wasRestored) {
    await ActivityTimeline.create({
      userId: session.userId, action: 'note_restored',
      targetType: 'note', targetId: id, targetName: body.plainTitle || '',
    })
  }

  // Save version history on explicit content saves
  if (body.contentCiphertext && body.saveVersion) {
    const lastVersion = await VersionHistory.findOne({ noteId: id }).sort({ savedAt: -1 })
    const now = Date.now()
    if (!lastVersion || now - new Date(lastVersion.savedAt).getTime() >= 60000) {
      await VersionHistory.create({
        noteId: id,
        ownerUserId: session.userId,
        titleCiphertext: note.title || '',
        contentCiphertext: note.contentCiphertext || '',
        contentIv: note.contentIv || '',
        savedAt: new Date(),
      })
      // Prune: keep max 100 entries, max 90 days
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      const count = await VersionHistory.countDocuments({ noteId: id })
      if (count > 100) {
        const toDelete = await VersionHistory.find({ noteId: id }).sort({ savedAt: 1 }).limit(count - 100)
        await VersionHistory.deleteMany({ _id: { $in: toDelete.map((d: { _id: unknown }) => d._id) } })
      }
      await VersionHistory.deleteMany({ noteId: id, savedAt: { $lt: cutoff } })
    }
  }

  return NextResponse.json({ note })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { id } = await params
  await Note.findOneAndDelete({ _id: id, ownerUserId: session.userId })
  await VersionHistory.deleteMany({ noteId: id })
  return NextResponse.json({ ok: true })
}
