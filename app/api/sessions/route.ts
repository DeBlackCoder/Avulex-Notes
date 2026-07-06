import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { connectDB } from '@/lib/mongodb'
import { Session } from '@/lib/models'

// GET — list all active sessions for user
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const sessions = await Session.find({
    userId: session.userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  }).sort({ lastActiveAt: -1 }).lean()
  return NextResponse.json({ sessions })
}
