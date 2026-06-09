import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { connectDB } from '@/lib/mongodb'
import { PushSubscriptionModel } from '@/lib/models'
import webpush from 'web-push'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Set VAPID details inside the handler — env vars are only available at runtime, not build time
  webpush.setVapidDetails(
    process.env.VAPID_MAILTO!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const { title, body, url } = await request.json()

  await connectDB()
  const subs = await PushSubscriptionModel.find({ userId: session.userId, enabled: true })

  const payload = JSON.stringify({ title, body, url: url || '/dashboard' })

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      ).catch(async (err: { statusCode?: number }) => {
        if (err.statusCode === 410) {
          await PushSubscriptionModel.deleteOne({ _id: (sub as { _id: unknown })._id })
        }
        throw err
      })
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  return NextResponse.json({ sent, total: subs.length })
}
