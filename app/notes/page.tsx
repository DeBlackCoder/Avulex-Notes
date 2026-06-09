import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { NotesListClient } from './NotesListClient'

export default async function NotesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return <NotesListClient />
}
