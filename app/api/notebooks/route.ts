import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { connectDB } from '@/lib/mongodb'
import { Notebook, ActivityTimeline } from '@/lib/models'
import { generateId } from '@/lib/utils'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const notebooks = await Notebook.find({ ownerUserId: session.userId }).sort({ updatedAt: -1 })
  return NextResponse.json({ notebooks })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { name, workspaceId } = await request.json()
  if (!name || name.length < 1 || name.length > 255) {
    return NextResponse.json({ error: 'Name must be 1-255 characters' }, { status: 400 })
  }
  const notebook = await Notebook.create({
    _id: generateId(),
    workspaceId,
    ownerUserId: session.userId,
    name,
    collaborators: [],
  })
  await ActivityTimeline.create({ userId: session.userId, action: 'notebook_created', targetType: 'notebook', targetId: notebook._id, targetName: name })
  return NextResponse.json({ notebook }, { status: 201 })
}
