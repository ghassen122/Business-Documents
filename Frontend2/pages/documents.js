import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '../components/Navbar'

const DOCX_API    = process.env.NEXT_PUBLIC_DOCX_API    || 'http://localhost:4000'
const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://localhost:3007'

const HOW_STEPS = [
  { n: '1', title: 'Choisir un modèle',     desc: 'Vous pouvez choisir parmi nos modèles de documents disponibles.' },
  { n: '2', title: 'Remplir le document',    desc: 'Répondez à quelques questions et votre document se crée automatiquement.' },
  { n: '3', title: 'Sauvegarder - Imprimer', desc: 'Votre document est prêt à être utilisé ! Vous en faites ce que vous voulez.' },
  { n: '4', title: 'Avocat en option',        desc: 'Un avocat peut relire votre document personnalisé pour vous conseiller.' },
]

export default function Documents() {
  const [templates, setTemplates]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [savedIds, setSavedIds]       = useState(new Set())
  const [savingId, setSavingId]       = useState(null)

  useEffect(() => {
    fetch(`${DOCX_API}/api/templates`)
      .then(r => r.json())
      .then(data => { setTemplates(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))

    fetch(`${BACKEND_API}/api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(user => {
        if (!user) return
        setCurrentUser(user)
        fetch(`${BACKEND_API}/api/user/documents`, { credentials: 'include' })
          .then(r => r.ok ? r.json() : [])
          .then(docs => setSavedIds(new Set(docs.map(d => d.templateId))))
      })
  }, [])

  async function toggleSave(t) {
    if (!currentUser) {
      sessionStorage.setItem('pendingSave', JSON.stringify({
        templateId: t.id, templateName: t.name, fileName: t.fileName,
      }))
      window.location.href = '/compte'
      return
    }
    setSavingId(t.id)
    const alreadySaved = savedIds.has(t.id)
    const r = await fetch(`${BACKEND_API}/api/user/documents`, {
      method: alreadySaved ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ templateId: t.id, templateName: t.name, fileName: t.fileName }),
    })
    if (r.ok) {
      const docs = await r.json()
      setSavedIds(new Set(docs.map(d => d.templateId)))
    }
    setSavingId(null)
  }

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.fileName || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-cream font-sans">
      <Navbar />

      {/* ── HERO ── */}
      <div
        className="px-6 py-16 text-center text-white"
        style={{ background: 'linear-gradient(160deg, #1a5450 0%, #226d68 55%, #2d8a83 100%)', paddingBottom: '72px' }}>
        <h1
          className="font-extrabold leading-[1.2] mb-3.5 text-white"
          style={{ fontSize: 'clamp(26px, 5vw, 44px)', letterSpacing: '-0.5px', margin: '0 0 14px' }}>
          Créez facilement vos documents juridiques !
        </h1>
        <p className="text-white/80 text-base leading-relaxed mb-9 mt-0">
          Un ingénieux système de formulaire vous guide dans la réalisation de vos documents
        </p>

        {/* Search bar */}
        <div className="relative w-full max-w-[560px] mx-auto">
          <input
            type="text"
            placeholder="Rechercher un document"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full py-4 pl-[22px] pr-[52px] rounded-[50px] border-none shadow-[0_2px_16px_rgba(0,0,0,0.10)] text-[15px] outline-none font-[inherit] text-gray-700 box-border"
          />
          <button tabIndex={-1} className="absolute right-[18px] top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0 flex items-center">
            <svg width="20" height="20" fill="none" stroke="#226d68" strokeWidth="2.5" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── COMMENT ÇA MARCHE ── */}
      <div className="bg-white border-b border-gray-200 py-12 px-6">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-center text-[22px] font-extrabold text-navy mb-9 mt-0">
            Comment ça marche ?
          </h2>
          <div className="grid gap-7" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
            {HOW_STEPS.map(s => (
              <div key={s.n} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-brand text-white font-extrabold text-[15px] flex items-center justify-center shrink-0">
                    {s.n}
                  </div>
                  <span className="font-bold text-[15px] text-brand">{s.title}</span>
                </div>
                <p className="m-0 text-[13px] text-gray-500 leading-relaxed pl-[42px]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── GRILLE DE TEMPLATES ── */}
      <div className="max-w-[1100px] mx-auto px-6 py-12 pb-20">
        {loading ? (
          <div className="text-center py-[60px] text-gray-400">Chargement des documents...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-[60px]">
            <p className="text-[48px] mb-4">📭</p>
            <p className="text-gray-400 text-base">
              {search ? `Aucun résultat pour "${search}"` : 'Aucun document disponible pour le moment.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-row flex-wrap gap-6">
            {filtered.map(t => {
              const saved  = savedIds.has(t.id)
              const saving = savingId === t.id
              return (
                <div
                  key={t.id}
                  className="doc-card bg-white rounded-xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex-[1_1_340px] flex items-center gap-4 py-4 px-5 transition-[box-shadow,transform] duration-200">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-[10px] shrink-0 bg-mint flex items-center justify-center text-[24px]">
                    📄
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <h3 className="m-0 mb-[3px] text-[14px] font-bold text-navy truncate">{t.name}</h3>
                    <p className="m-0 text-[11px] text-gray-400">
                      {t.blanksCount} champ{t.blanksCount !== 1 ? 's' : ''} · {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 shrink-0">
                    <Link
                      href={`/fill/${t.id}`}
                      className="px-[18px] py-2 bg-brand hover:bg-brand-dark text-white no-underline rounded-md font-bold text-[13px] whitespace-nowrap transition-colors duration-150">
                      Remplir →
                    </Link>
                    <button
                      onClick={() => toggleSave(t)}
                      disabled={saving}
                      title={saved ? 'Retirer de mes documents' : 'Sauvegarder'}
                      className={`w-9 h-9 rounded-md border flex items-center justify-center text-base cursor-pointer transition-colors duration-150
                        ${saved
                          ? 'bg-green-50 border-green-300 hover:bg-green-100'
                          : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                      {saving ? '…' : '🔖'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
