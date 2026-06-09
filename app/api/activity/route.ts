import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { connectDB } from '@/lib/mongodb'
import { ActivityTimeline } from '@/lib/models'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const entries = await ActivityTimeline.find({ userId: session.userId }).sort({ occurredAt: -1 }).limit(100)
  return NextResponse.json({ entries })
}
