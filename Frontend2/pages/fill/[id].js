import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import DocRenderer from '../../components/DocRenderer'

const DOCX_API    = process.env.NEXT_PUBLIC_DOCX_API    || 'http://localhost:4000'
const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://localhost:3007'

export default function FillPage() {
  const router = useRouter()
  const { id } = router.query

  const [template,    setTemplate]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [values,      setValues]      = useState({})
  const [downloading, setDownloading] = useState(false)
  const [user,        setUser]        = useState(null)

  // Lock body scroll so panels scroll independently (restore on unmount)
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Check login status
  useEffect(() => {
    fetch(`${BACKEND_API}/api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(u => setUser(u))
      .catch(() => {})
  }, [])

  // Load template
  useEffect(() => {
    if (!id) return
    fetch(`${DOCX_API}/api/templates/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject('Introuvable'))
      .then(data => {
        setTemplate(data)
        const init = {}
        for (const b of (data.blanks || [])) init[String(b.id)] = ''
        setValues(init)
        setLoading(false)
      })
      .catch(err => { setError(String(err)); setLoading(false) })
  }, [id])

  // Download filled DOCX
  async function handleDownload() {
    if (!template) return
    setDownloading(true)
    try {
      const res = await fetch(`${DOCX_API}/api/fill/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erreur de génération')
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = template.fileName || 'document.docx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Erreur : ${err.message}`)
    } finally {
      setDownloading(false)
    }
  }

  // Save current page URL then redirect to login
  function handleConnectClick() {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname)
    }
    router.push('/compte')
  }

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen bg-cream font-sans">
      <Navbar />
      <p className="text-center pt-20 text-gray-400">Chargement du document...</p>
    </div>
  )

  // ── Not found ──
  if (error || !template) return (
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

  const blanksCount = (template.blanks || []).length

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-cream font-sans">

      <Navbar />

      {/* ── Header bar — gradient must stay inline (multi-stop, no Tailwind equivalent) ── */}
      <div
        className="shrink-0 px-10 py-5 text-white flex items-center justify-between flex-wrap gap-4"
        style={{ background: 'linear-gradient(160deg, #1a5450 0%, #226d68 55%, #2d8a83 100%)' }}>
        <div>
          <div className="text-xs text-white/60 mb-1">
            <Link href="/documents" className="text-white/60 no-underline hover:text-white transition-colors">
              Documents
            </Link>
            {' › '}{template.name}
          </div>
          <h1 className="m-0 text-[22px] font-extrabold">{template.name}</h1>
          <p className="m-0 mt-1 text-[13px] text-white/65">
            {blanksCount} champ{blanksCount !== 1 ? 's' : ''} à compléter
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="px-7 py-3 bg-white text-brand rounded-lg font-bold text-[15px] border-none shadow-[0_2px_8px_rgba(0,0,0,0.15)] cursor-pointer hover:bg-gray-50 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors">
          {downloading ? '⏳ Génération…' : '📥 Télécharger DOCX'}
        </button>
      </div>

      {/* ── Panels row: flex-1 + min-h-0 lets each panel scroll independently ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left panel — form */}
        <div className="w-[360px] shrink-0 border-r border-gray-200 overflow-y-auto bg-white p-6">
          {blanksCount === 0 ? (
            <div className="text-center pt-12">
              <p className="text-[36px] mb-3">✅</p>
              <p className="text-gray-500 text-sm">Aucun champ à remplir dans ce document.</p>
            </div>
          ) : (
            <>
              <h3 className="m-0 mb-5 text-[15px] font-bold text-brand">📝 Remplir les champs</h3>
              <div className="flex flex-col gap-[18px]">
                {(template.blanks || []).map(blank => (
                  <div key={blank.id}>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-[0.4px]">
                      {blank.name || `Champ ${blank.id + 1}`}
                    </label>
                    {(blank.contextBefore || blank.contextAfter) && (
                      <p className="m-0 mb-1.5 text-[11px] text-gray-400 leading-relaxed">
                        …{blank.contextBefore} <em className="text-gray-300">[champ]</em> {blank.contextAfter}…
                      </p>
                    )}
                    <input
                      className="fill-input w-full py-[9px] px-3 border border-gray-200 rounded-lg text-sm outline-none font-[inherit] transition-[border-color,box-shadow] duration-150 box-border"
                      type="text"
                      value={values[String(blank.id)] || ''}
                      onChange={e => setValues(v => ({ ...v, [String(blank.id)]: e.target.value }))}
                      placeholder={`Saisir ${blank.name || 'la valeur'}…`}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleDownload}
                disabled={downloading}
                className="mt-7 w-full py-3 bg-brand text-white rounded-lg font-bold text-[15px] border-none cursor-pointer hover:bg-brand-dark disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                {downloading ? '⏳ Génération…' : '📥 Télécharger DOCX'}
              </button>
            </>
          )}
        </div>

        {/* Right panel — live preview */}
        {/* OUTER: position:relative + overflow:hidden — positioning context, never scrolls */}
        <div className="flex-1 relative bg-cream overflow-hidden">

          {/* INNER: overflow-auto in both axes.
              Centering via fit-content + margin:auto — works for any doc width
              without ever clipping the left edge (unlike justify-center). */}
          <div className="absolute inset-0 overflow-auto p-10 box-border">
            <div className="relative mx-auto w-fit">
              <DocRenderer
                data={{
                  layout:     template.layout,
                  blocks:     template.blocks,
                  hyperlinks: template.hyperlinks,
                }}
                blanks={template.blanks}
                values={values}
              />

              {!user && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[4px]">
                  {/* Fixed masked band tied to the document itself.
                      Because this overlay lives inside the document wrapper,
                      the same lines stay hidden while the page scrolls. */}
                  <div className="absolute inset-x-0 top-[66%] h-[132px] bg-cream/35 backdrop-blur-[8px]" />

                  {/* Fade belongs to the document too, not the preview panel. */}
                  <div
                    className="absolute inset-x-0 top-[72%] bottom-0"
                    style={{
                      background: 'linear-gradient(to bottom, rgba(248,247,243,0) 0%, rgba(248,247,243,0.76) 34%, #f8f7f3 72%)',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Guest CTA — stays fixed in the panel while the document mask is tied to the page. */}
          {!user && (
            <div className="absolute inset-0 pointer-events-none">
              {/* CTA pill */}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-8">
                <button
                  onClick={handleConnectClick}
                  className="pointer-events-auto flex items-center gap-2 px-8 py-[14px] bg-brand text-white rounded-full font-bold text-[15px] border-none cursor-pointer hover:bg-brand-dark transition-all shadow-[0_4px_28px_rgba(34,109,104,0.50)]">
                  🔒 Se connecter / S'inscrire
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
