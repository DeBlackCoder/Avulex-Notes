import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { ChatPageClient } from './ChatPageClient'

export default async function ChatPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return <ChatPageClient />
}
