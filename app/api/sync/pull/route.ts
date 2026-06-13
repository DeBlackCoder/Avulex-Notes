import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { connectDB } from '@/lib/mongodb'
import { Note, Notebook, Workspace } from '@/lib/models'

/**
 * GET /api/sync/pull
 * Returns ALL notebooks, workspaces and notes for the authenticated user.
 * Called on first load of a new device to restore all data into IndexedDB.
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const [notebooks, notes, workspaces] = await Promise.all([
    Notebook.find({ ownerUserId: session.userId }).lean(),
    Note.find({ ownerUserId: session.userId }).lean(),
    Workspace.find({ userId: session.userId }).lean(),
  ])

  return NextResponse.json({ notebooks, notes, workspaces })
}
