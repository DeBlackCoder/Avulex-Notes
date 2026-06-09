import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { connectDB } from '@/lib/mongodb'
import { Device } from '@/lib/models'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const devices = await Device.find({ userId: session.userId, isRevoked: false }).sort({ lastActiveAt: -1 })
  return NextResponse.json({ devices })
}
