import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { connectDB } from '@/lib/mongodb'
import { Workspace } from '@/lib/models'
import { generateId } from '@/lib/utils'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const workspaces = await Workspace.find({ userId: session.userId })
  return NextResponse.json({ workspaces })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { name } = await request.json()
  const workspace = await Workspace.create({ _id: generateId(), userId: session.userId, name })
  return NextResponse.json({ workspace }, { status: 201 })
}
