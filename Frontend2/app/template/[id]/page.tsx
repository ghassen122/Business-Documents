import { cookies } from 'next/headers'
import Link from 'next/link'
import Navbar from '../../(components)/Navbar'
import TemplateDetailView from './TemplateDetailView'
import type { DocumentTemplate } from '@/types/document'

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://13.61.104.59:4001'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TemplateDetailPage({ params }: Props) {
  const { id } = await params

  let template: DocumentTemplate | null = null
  try {
    const res = await fetch(`${BACKEND_API}/api/templates/${id}`, { cache: 'no-store' })
    if (res.ok) template = await res.json()
  } catch {}

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

  return <TemplateDetailView template={template} />
}
