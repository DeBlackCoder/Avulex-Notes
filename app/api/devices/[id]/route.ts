import { NextRequest, NextResponse } from 'next/server'
import { getSession, deleteSession } from '@/lib/session'
import { connectDB } from '@/lib/mongodb'
import { Device } from '@/lib/models'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { id } = await params
  const device = await Device.findOne({ _id: id, userId: session.userId })
  if (!device) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await Device.findByIdAndUpdate(id, { isRevoked: true })
  // If revoking current device, delete session
  if (device.isCurrent) await deleteSession()
  return NextResponse.json({ ok: true })
}
