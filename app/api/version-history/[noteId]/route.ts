import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { connectDB } from '@/lib/mongodb'
import { VersionHistory } from '@/lib/models'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ noteId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { noteId } = await params
  const entries = await VersionHistory.find({ noteId, ownerUserId: session.userId }).sort({ savedAt: -1 }).limit(100)
  return NextResponse.json({ entries })
}
