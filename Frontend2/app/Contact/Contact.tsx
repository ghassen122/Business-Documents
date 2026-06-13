'use client'
import { useState } from 'react'
import Link from 'next/link'
import Navbar from '../(components)/Navbar'

const DOCX_API = process.env.NEXT_PUBLIC_DOCX_API || 'http://localhost:4001'

const SUBJECTS = [
  'Question générale',
  'Problème technique',
  'PDF non reçu',
  'Demande de remboursement',
  'Autre',
]

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: SUBJECTS[0], message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return
    setStatus('sending')
    try {
      const res = await fetch(`${DOCX_API}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setStatus('ok')
      setForm({ name: '', email: '', subject: SUBJECTS[0], message: '' })
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-cream font-sans">
      <Navbar />

      {/* Header */}
      <div
        className="px-10 py-10 text-white"
        style={{ background: 'linear-gradient(160deg, #1a5450 0%, #226d68 55%, #2d8a83 100%)' }}>
        <div className="max-w-[720px] mx-auto">
          <div className="text-xs text-white/60 mb-2">
            <Link href="/" className="text-white/60 no-underline hover:text-white transition-colors">Accueil</Link>
            {' › '}Contact
          </div>
          <h1 className="m-0 text-[28px] font-extrabold">Contactez-nous</h1>
          <p className="m-0 mt-2 text-white/65 text-[14px]">
            Une question ou un problème ? Nous répondons dans les plus brefs délais.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-[720px] mx-auto px-6 py-12">
        {status === 'ok' ? (
          <div className="bg-[#f0faf9] border border-[#2d8a83] rounded-xl p-8 text-center">
            <p className="text-[40px] mb-3">✅</p>
            <h2 className="text-[20px] font-bold text-brand mb-2">Message envoyé !</h2>
            <p className="text-gray-500 text-sm mb-6">Nous avons bien reçu votre message et vous répondrons rapidement.</p>
            <button
              onClick={() => setStatus('idle')}
              className="px-6 py-2.5 bg-brand text-white rounded-lg font-semibold text-sm border-none cursor-pointer hover:bg-brand-dark transition-colors">
              Envoyer un autre message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 flex flex-col gap-5">

            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
                Une erreur s'est produite. Veuillez réessayer.
              </div>
            )}

            {/* Nom + Email */}
            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-[0.4px]">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  required
                  placeholder="Votre nom"
                  className="w-full py-[9px] px-3 border border-gray-200 rounded-lg text-sm outline-none font-[inherit] box-border focus:border-brand transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-[0.4px]">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  required
                  placeholder="votre@email.com"
                  className="w-full py-[9px] px-3 border border-gray-200 rounded-lg text-sm outline-none font-[inherit] box-border focus:border-brand transition-colors"
                />
              </div>
            </div>

            {/* Sujet */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-[0.4px]">
                Sujet
              </label>
              <select
                name="subject"
                value={form.subject}
                onChange={onChange}
                className="w-full py-[9px] px-3 border border-gray-200 rounded-lg text-sm outline-none font-[inherit] box-border bg-white focus:border-brand transition-colors">
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-[0.4px]">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                name="message"
                value={form.message}
                onChange={onChange}
                required
                rows={5}
                placeholder="Décrivez votre problème ou question…"
                className="w-full py-[9px] px-3 border border-gray-200 rounded-lg text-sm outline-none font-[inherit] box-border resize-none focus:border-brand transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'sending'}
              className="self-end px-8 py-3 bg-brand text-white rounded-lg font-bold text-[14px] border-none cursor-pointer hover:bg-brand-dark disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
              {status === 'sending' ? '⏳ Envoi…' : 'Envoyer le message →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
