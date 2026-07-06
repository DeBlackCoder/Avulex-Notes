import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { connectDB } from '@/lib/mongodb'
import { History } from '@/lib/models'

// GET — fetch recent history
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { searchParams } = request.nextUrl
  const limit = Math.min(Number(searchParams.get('limit') || 100), 200)
  const action = searchParams.get('action') // optional filter

  const query: Record<string, unknown> = { userId: session.userId }
  if (action) query.action = action

  const entries = await History.find(query)
    .sort({ occurredAt: -1 })
    .limit(limit)
    .lean()
  return NextResponse.json({ entries })
}

// POST — record a history event
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const body = await request.json()
  const entry = await History.create({
    userId: session.userId,
    action: body.action,
    targetId: body.targetId || null,
    targetTitle: body.targetTitle || null,
    targetType: body.targetType || 'note',
    meta: body.meta || {},
    occurredAt: new Date(),
  })
  return NextResponse.json({ entry }, { status: 201 })
}
