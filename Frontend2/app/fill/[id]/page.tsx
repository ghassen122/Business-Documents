import { cookies } from 'next/headers'
import Link from 'next/link'
import FillView from './FillView'
import Navbar from '../../(components)/Navbar'
import type { DocumentTemplate } from '@/types/document'

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://backend:4001'

interface Props {
  params: Promise<{ id: string }>
}

export default async function FillPage({ params }: Props) {
  const { id } = await params

  const cookieStore  = await cookies()
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')

  // Fetch template (public)
  let template: DocumentTemplate | null = null
  try {
    const res = await fetch(`${BACKEND_API}/api/templates/${id}`, { cache: 'no-store' })
    if (res.ok) template = await res.json()
  } catch {}

  // Not found — return inline error (no redirect needed)
  if (!template) {
    return (
      <div className="min-h-screen bg-cream font-sans">
        <Navbar />
        <div className="text-center pt-20">
          <p className="text-[48px] mb-4">😕</p>
          <p className="text-red-500 font-semibold mb-5">Document introuvable.</p>
          <Link href="/documents" className="text-brand font-bold no-underline text-[15px]">
            ← Retour aux documents
          </Link>
        </div>
      </div>
    )
  }

  // Check auth
  let initialUser: { id: string; name: string; email: string } | null = null
  try {
    const meRes = await fetch(`${BACKEND_API}/api/auth/me`, {
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
    })
    if (meRes.ok) initialUser = await meRes.json()
  } catch {}

  // Check if user already paid for this template
  let hasPaid = false
  if (initialUser && (template.price ?? 0) > 0) {
    try {
      const ordersRes = await fetch(`${BACKEND_API}/api/orders/my`, {
        headers: { Cookie: cookieHeader },
        cache: 'no-store',
      })
      if (ordersRes.ok) {
        const orders: Array<{ templateId: string }> = await ordersRes.json()
        hasPaid = orders.some(o => o.templateId === id)
      }
    } catch {}
  }

  return <FillView template={template} initialUser={initialUser} hasPaid={hasPaid} />
}


