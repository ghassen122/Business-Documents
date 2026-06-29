import { cookies } from 'next/headers'
import CheckoutPage from './CheckoutPage'

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://13.61.104.59:4001'

export default async function CheckoutRoute() {
  const cookieStore  = await cookies()
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')

  let initialUser: { id: string; name: string; email: string } | null = null
  try {
    const res = await fetch(`${BACKEND_API}/api/auth/me`, {
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
    })
    if (res.ok) initialUser = await res.json()
  } catch {}

  return <CheckoutPage initialUser={initialUser} />
}
