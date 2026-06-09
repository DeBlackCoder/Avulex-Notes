import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { connectDB } from '@/lib/mongodb'
import { PushSubscriptionModel } from '@/lib/models'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sub = await request.json()
  if (!sub?.endpoint) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })

  await connectDB()

  // Upsert subscription for this user+endpoint
  await PushSubscriptionModel.findOneAndUpdate(
    { userId: session.userId, endpoint: sub.endpoint },
    {
      userId: session.userId,
      endpoint: sub.endpoint,
      keys: sub.keys,
      enabled: true,
    },
    { upsert: true, new: true }
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint } = await request.json()
  await connectDB()
  await PushSubscriptionModel.deleteOne({ userId: session.userId, endpoint })
  return NextResponse.json({ ok: true })
}
