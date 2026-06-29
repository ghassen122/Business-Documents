'use client'
import { useState } from 'react'
import { UserDocument } from '@/types/document'
import Link from 'next/link'

interface Props {
  email: string
  documents: UserDocument[]
  orderId?: string
}

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://backend:4001'

function DocCard({ doc: initialDoc, index, userEmail }: { doc: UserDocument; index: number; userEmail: string }) {
  const [doc,        setDoc]        = useState(initialDoc)
  const [dlDocx,     setDlDocx]     = useState(false)
  const [dlPdf,      setDlPdf]      = useState(false)
  const [sending,   setSending]   = useState(false)
  const [sendOk,    setSendOk]    = useState(false)
  const [sendType,  setSendType]  = useState<'pdf' | 'facture'>('pdf')
  const [editing,   setEditing]   = useState(false)
  const [draft,     setDraft]     = useState<Record<string, string>>(initialDoc.values ?? {})
  const [saving,    setSaving]    = useState(false)
  const [saveOk,    setSaveOk]    = useState(false)
  const [sendEmail, setSendEmail] = useState(userEmail)

  async function download(format: 'docx' | 'pdf') {
    const setter = format === 'docx' ? setDlDocx : setDlPdf
    setter(true)
    try {
      const url = format === 'docx'
        ? `${BACKEND_API}/api/fill/${doc.templateId}`
        : `${BACKEND_API}/api/fill/${doc.templateId}/lo-pdf`
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ values: doc.values ?? {} }),
      })
      if (!res.ok) throw new Error('Erreur de generation')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      const base = doc.templateName || 'document'
      a.download = format === 'docx' ? `${base}.docx` : `${base}.pdf`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setter(false)
    }
  }
  async function downloadFacture() {
    const res = await fetch(`${BACKEND_API}/api/invoice/by-templateName`, {
      method:  'POST',
       headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    templateName: doc.templateName,
  })
    })
    
    if (!res.ok) throw new Error('Erreur de generation')
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const base = `facture-${doc.templateName}` 
    a.download = `${base}.pdf`
    a.click()
    URL.revokeObjectURL(a.href)
   }  
  

  async function handleSend() {
    if (!sendEmail) return alert('Veuillez entrer un email.')
    setSending(true)
    try {
      let res: Response
      if (sendType === 'pdf') {
        res = await fetch(`${BACKEND_API}/api/fill/${doc.templateId}/send-pdf`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email: sendEmail, values: doc.values ?? {} }),
        })
      } else {
        res = await fetch(`${BACKEND_API}/api/invoice/send-by-email`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email: sendEmail, templateName: doc.templateName }),
        })
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any).error || 'Erreur envoi')
      }
      setSendOk(true)
      setTimeout(() => setSendOk(false), 3000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setSending(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`${BACKEND_API}/api/user/documents/${doc._id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ values: draft }),
      })
      if (!res.ok) throw new Error('Erreur de sauvegarde')
      const updated: UserDocument = await res.json()
      setDoc(updated)
      setEditing(false)
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 3000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraft(doc.values ?? {})
    setEditing(false)
  }

  const entries = Object.entries(doc.values ?? {})

  return (
   
   <div className="flex  gap-[200px]">

      {/* ── DocCard ── */}
      <div className=" mx-[100px] bg-white rounded-2xl w-[800px] shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-5 border-b border-gray-100">
          {/* Top row: meta + action buttons */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-mono text-gray-400 mb-1">
                Entry # <span className="font-bold text-gray-500">{doc._id.slice(-6).toUpperCase()}</span>
              </p>
              <h2 className="text-[16px] font-extrabold text-[#1a5450] m-0">
                {doc.templateName || doc.templateId}
              </h2>
              <p className="text-[12px] text-gray-400 mt-1 m-0">
                Sauvegarde le {new Date(doc.savedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {!editing ? (
                <button
                  onClick={() => { setDraft(doc.values ?? {}); setEditing(true) }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#e6f4f1] text-[#226d68] text-[13px] font-semibold  transition border-solid cursor-pointer"
                >
                  Modifier
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-600 text-[13px] font-semibold hover:bg-gray-50 transition border-solid cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#e6f4f1] text-[#226d68] text-[13px] font-semibold  transition disabled:opacity-60 border-none cursor-pointer"
                  >
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </>
              )}
              {saveOk && (
                <span className="text-[12px] text-emerald-600 font-semibold">Modifié</span>
              )}
              <button
                onClick={() => download('docx')}
                disabled={dlDocx || editing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1a5450] text-white text-[13px] font-semibold hover:bg-[#226d68] transition disabled:opacity-40 disabled:cursor-not-allowed border-none cursor-pointer"
              >
                {dlDocx ? '...' : 'DOCX'}
              </button>
              <button
                onClick={() => download('pdf')}
                disabled={dlPdf || editing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#1a5450] bg-white text-[#1a5450] text-[13px] font-semibold hover:bg-[#f0faf9] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {dlPdf ? '...' : 'PDF'}
              </button>
              <button onClick={() => downloadFacture()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#1a5450] bg-white text-[#1a5450] text-[13px] font-semibold hover:bg-[#f0faf9] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                Facture
              </button>
            </div>
          </div>
        </div>

        <div className="px-7 py-3 bg-[#f0faf9] border-b border-[#d4ede9]">
          <p className="text-[11px] font-bold tracking-widest text-[#1a5450] uppercase m-0">
            {index + 1}. User Details
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {entries.length === 0 ? (
            <p className="px-7 py-5 text-[13px] text-gray-400 italic m-0">Aucune valeur enregistree.</p>
          ) : (
            entries.map(([key, value]) => (
              <div key={key}>
                <div className="px-7 py-3 bg-[#e6f4f1]">
                  <p className="text-[11px] font-bold text-[#1a5450] uppercase tracking-widest m-0">
                    {doc.labels?.[key] || key}
                  </p>
                </div>
                <div className="px-7 py-3 bg-white">
                  {editing ? (
                    <input
                      type="text"
                      value={draft[key] ?? ''}
                      onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full text-[14px] text-gray-800 font-medium  border border-gray-50 hover:border-gray-50 rounded-lg px-3 py-2 bg-gray-50   focus:border-gray-50  focus:outline-none focus:ring-0"
                    />
                  ) : (
                    <p className="text-[14px] text-gray-800 m-0 font-medium">
                      {value || 'vide'}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Side send panel ── */}
      <div className="w-[270px]  h-[350px] shrink-0 bg-gray-100 rounded-2xl border border-gray-200 sticky top-6 overflow-hidden">

        {/* Email block */}
        <div className="px-4 pt-4 pb-4 border-b-2 border-gray-300">
          <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4">Destinataire</label>
          <input
            type="email"
            value={sendEmail}
            onChange={e => setSendEmail(e.target.value)}
            placeholder="email@exemple.com"
            className="w-full text-[13px] border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#226d68] focus:border-[#226d68]"
          />
        </div>

        {/* Type toggle block */}
        <div className="px-4 pt-4 pb-4 border-b-2 border-gray-300">
          <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4">Type d&apos;envoi</label>
          <div className="flex rounded-lg overflow-hidden border border-gray-300">
            <button
              onClick={() => setSendType('pdf')}
              className={`flex-1 py-2.5 text-[13px] font-semibold transition border-none cursor-pointer ${
                sendType === 'pdf' ? 'bg-[#226d68] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              PDF
            </button>
            <button
              onClick={() => setSendType('facture')}
              className={`flex-1 py-2.5 text-[13px] font-semibold transition border-none cursor-pointer border-l border-gray-300 ${
                sendType === 'facture' ? 'bg-[#226d68] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              Facture
            </button>
          </div>
        </div>

        {/* Send button block */}
        <div className="px-4 pt-4 pb-4 ">
          <button
            onClick={handleSend}
            disabled={sending || !sendEmail}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#226d68] text-white text-[13px] font-semibold hover:bg-[#1a5450] transition disabled:opacity-40 disabled:cursor-not-allowed border-none cursor-pointer"
          >
            {sending
              ? '⏳ Envoi...'
              : sendOk
              ? `✅ ${sendType === 'pdf' ? 'PDF' : 'Facture'} envoyé${sendType === 'facture' ? 'e' : ''}`
              : `📧 Envoyer ${sendType === 'pdf' ? 'PDF' : 'Facture'}`}
          </button>
        </div>

      </div>

    </div>
  )
}

export default function UserView({ email, documents, orderId }: Props) {
  return (
    <div className="min-h-screen bg-[#f8f7f3]">
      <header className="flex h-[56px] items-center gap-4 bg-[#1a5450] px-7 shadow-md">
        <Link href="/Orders" className="text-white/70 hover:text-white text-[13px] transition">
          Retour
        </Link>
        <span className="text-white font-bold text-[15px]">
          {orderId ? 'Document de la commande' : 'Documents utilisateur'}
        </span>
        <span className="ml-auto font-mono text-[11px] text-white/50">{email}</span>
      </header>

      <div className="px-12 py-10">
        {documents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-14 text-center text-gray-400">
            <p className="text-5xl mb-4">X</p>
            <p className="text-[14px]">Aucun document sauvegarde pour cet utilisateur.</p>
          </div>
        ) : (
          documents.map((doc, i) => <DocCard key={doc._id} doc={doc} index={i} userEmail={email} />)
        )}
      </div>
    </div>
  )
}
