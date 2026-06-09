import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { NoteEditorClient } from './NoteEditorClient'

export default async function NoteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { id } = await params
  return <NoteEditorClient noteId={id} user={session} />
}
