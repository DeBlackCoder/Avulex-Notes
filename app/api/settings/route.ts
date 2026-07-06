import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { connectDB } from '@/lib/mongodb'
import { Settings } from '@/lib/models'

// GET — fetch user settings
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const settings = await Settings.findOne({ userId: session.userId }).lean()
  // Return defaults if no settings saved yet
  return NextResponse.json({
    settings: settings ?? {
      theme: 'system',
      accentColor: 'blue',
      notificationsEnabled: false,
      aiProvider: 'gemini',
      sidebarCollapsed: false,
      editorFontSize: 'md',
    }
  })
}

// PATCH — upsert settings
export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const body = await request.json()
  const { userId: _uid, _id, ...safeBody } = body

  const settings = await Settings.findOneAndUpdate(
    { userId: session.userId },
    { $set: { ...safeBody, userId: session.userId } },
    { returnDocument: 'after', upsert: true }
  )
  return NextResponse.json({ settings })
}
