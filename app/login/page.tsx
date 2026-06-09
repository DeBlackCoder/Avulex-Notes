import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { LoginClient } from './LoginClient'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await getSession()
  if (session) redirect('/dashboard')
  const params = await searchParams
  return <LoginClient error={params.error} />
}
