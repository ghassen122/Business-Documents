'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../(components)/Navbar'
import DocRenderer from '../../(components)/DocRenderer'
import type { DocumentTemplate } from '@/types/document'

const DOCX_API    = process.env.NEXT_PUBLIC_DOCX_API    || 'http://localhost:4001'

interface Props {
  template: DocumentTemplate
  initialUser: { id: string; name: string; email: string } | null
  hasPaid: boolean
}

export default function FillView({ template, initialUser, hasPaid }: Props) {
  const router = useRouter()

  const [values,    setValues]    = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const b of (template.blanks || [])) init[String(b.id)] = ''
    return init
  })
  // civValues keyed by intervenantIndex (one choice per intervenant)
  const [civValues,  setCivValues]  = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    const seen = new Set<number>()
    for (const c of (template.civs || [])) {
      if (!seen.has(c.intervenantIndex)) {
        seen.add(c.intervenantIndex)
        init[String(c.intervenantIndex)] = c.match || 'Monsieur'
      }
    }
    return init
  })
  const [civStep,    setCivStep]    = useState<boolean>((template.civs || []).length > 0)
  const [busy, setBusy] = useState(false)

  // ── Wizard steps (2 fields per step) ─────────────────────────────────────
  const STEP_SIZE = 2
  const blanks    = template.blanks || []
  const steps: typeof blanks[] = []
  for (let i = 0; i < blanks.length; i += STEP_SIZE) {
    steps.push(blanks.slice(i, i + STEP_SIZE))
  }
  const totalSteps   = Math.max(steps.length, 1)
  const [step, setStep] = useState(0)
  const currentStep  = Math.min(step, totalSteps - 1)
  const isLastStep   = currentStep === totalSteps - 1
  const progress     = totalSteps > 1 ? ((currentStep) / (totalSteps - 1)) * 100 : 100

  const isPaid      = (template.price ?? 0) > 0
  // mask = template is paid AND user hasn't paid yet
  const shouldMask   = isPaid && !hasPaid
  const blanksCount  = (template.blanks || []).length

  // Lock body scroll so panels scroll independently
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // ── Téléchargement direct (template gratuit) ──────────────────────────────
  async function handleFreeDownload() {
    setBusy(true)
    try {
      const res = await fetch(`${DOCX_API}/api/fill/${template.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values, civValues }),
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

      // Save filled values for authenticated users
      if (initialUser) {
        const labels: Record<string, string> = {}
        for (const b of (template.blanks || [])) labels[String(b.id)] = b.name
        fetch(`${DOCX_API}/api/user/documents`, {
          method:      'POST',
          headers:     { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            templateId:   template.id,
            templateName: template.name,
            values,
            labels,
            email: initialUser.email,
          }),
        }).catch(() => {})
      }
    } catch (err: unknown) {
      alert(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  // ── Paiement : enregistre le brouillon et navigue vers /checkout ────────
  function handlePayNavigate() {
    const labels: Record<string, string> = {}
    for (const b of (template.blanks || [])) labels[String(b.id)] = b.name
    sessionStorage.setItem('checkout_draft', JSON.stringify({
      templateId:   template.id,
      templateName: template.name,
      price:        template.price,
      values,
      civValues,
      labels,
      fileName:     template.fileName,
    }))
    router.push('/checkout')
  }

  function handleConnectClick() {
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname)
    router.push('/compte')
  }

  // ── Téléchargement PDF ────────────────────────────────────────────────────
  async function handlePdfDownload() {
    setBusy(true)
    try {
      const res = await fetch(`${DOCX_API}/api/fill/${template.id}/pdf`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ values, civValues }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erreur de génération PDF')
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = (template.fileName || 'document').replace(/\.docx$/i, '') + '.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      alert(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  // Label + handler du bouton principal
  const btnLabel   = busy
    ? '⏳ Chargement…'
    : isPaid
      ? `💳 Payer et télécharger — ${template.price} €`
      : '📥 Télécharger DOCX'
  const handleBtn  = isPaid ? handlePayNavigate : handleFreeDownload

  return (
    <div className="flex flex-col min-h-screen bg-cream font-sans">

      <Navbar />

      {/* ── Header bar ── */}
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
            {(template.civs || []).length > 0 && ` · ${[...new Set((template.civs || []).map(c => c.intervenantIndex))].length} intervenant(s)`}          </p>
        </div>

      </div>

      {/* ── Panels row ── */}
      <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 60px - 72px)' }}>

        {/* Left panel — step-by-step form */}
        <div className="w-[360px] shrink-0 border-r mt-[20px] border-gray-200 bg-white flex flex-col ml-[50px] h-[400px]">

          {blanksCount === 0 && (template.civs || []).length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <p className="text-[36px] mb-3">✅</p>
              <p className="text-gray-500 text-sm">Aucun champ à remplir dans ce document.</p>
              <button
                onClick={handleBtn}
                disabled={busy}
                className="mt-6 w-full py-3 bg-brand text-white rounded-lg font-bold text-[15px] border-none cursor-pointer hover:bg-brand-dark disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                {btnLabel}
              </button>
            </div>
          ) : civStep ? (
            /* ── Civilité step ── */
            <>
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.6px]">Étape 0 / Civilités</span>
                </div>
                <p className="m-0 text-[12px] text-gray-400">Choisissez la civilité pour chaque intervenant.</p>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
                {[...new Set((template.civs || []).map(c => c.intervenantIndex))]
                  .sort((a, b) => a - b)
                  .map(idx => (
                    <div key={idx}>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-[0.4px]">
                        {template.intervenantNames?.[idx] || `Intervenant ${idx + 1}`}
                      </label>
                      <select
                        className="fill-input w-full py-[9px] px-3 border border-gray-200 rounded-lg text-sm outline-none font-[inherit]"
                        value={civValues[String(idx)] || 'Monsieur'}
                        onChange={e => setCivValues(v => ({ ...v, [String(idx)]: e.target.value }))}
                      >
                        <option value="Monsieur">Monsieur</option>
                        <option value="Madame">Madame</option>
                        <option value="M.">M.</option>
                        <option value="Mme">Mme</option>
                        <option value="Dr">Dr</option>
                        <option value="Me">Me</option>
                      </select>
                    </div>
                  ))}
              </div>
              <div className="px-6 py-4 border-t border-gray-100">
                <button
                  onClick={() => setCivStep(false)}
                  className="w-full py-[10px] bg-brand text-white rounded-lg font-bold text-[14px] border-none cursor-pointer hover:bg-brand-dark transition-colors">
                  {blanksCount === 0 ? 'Télécharger →' : 'Suivant →'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Step header */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.6px]">
                    Étape {currentStep + 1} / {totalSteps}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {blanksCount} champ{blanksCount !== 1 ? 's' : ''} au total
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-300"
                    style={{ width: `${isLastStep ? 100 : progress}%` }}
                  />
                </div>
              </div>

              {/* Fields for current step */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="flex flex-col gap-5">
                  {(steps[currentStep] || []).map((blank, idx) => (
                    <div key={blank.id}>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-[0.4px]">
                        {blank.question || blank.name || `Champ ${blank.id + 1}`}
                      </label>
                      {(blank.contextBefore || blank.contextAfter) && (
                        <p className="m-0 mb-1.5 text-[11px] text-gray-400 leading-relaxed">
                          …{blank.contextBefore} <em className="text-gray-300">[champ]</em> {blank.contextAfter}…
                        </p>
                      )}
                      <input
                        autoFocus={idx === 0}
                        className="fill-input w-full py-[9px] px-3 border border-gray-200 rounded-lg text-sm outline-none font-[inherit] transition-[border-color,box-shadow] duration-150 box-border"
                        type="text"
                        value={values[String(blank.id)] || ''}
                        onChange={e => setValues(v => ({ ...v, [String(blank.id)]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !isLastStep) setStep(s => Math.min(s + 1, totalSteps - 1))
                        }}
                        placeholder={`Saisir ${blank.name || 'la valeur'}…`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation footer */}
              <div className="px-6 py-4 border-t border-gray-100">
                <div className="flex gap-3">
                {currentStep > 0 && (
                  <button
                    onClick={() => setStep(s => Math.max(s - 1, 0))}
                    className="flex-1 py-[10px] bg-gray-100 text-gray-700 rounded-lg font-semibold text-[14px] border-none cursor-pointer hover:bg-gray-200 transition-colors">
                    ← Précédent
                  </button>
                )}
                {!isLastStep ? (
                  <button
                    onClick={() => setStep(s => Math.min(s + 1, totalSteps - 1))}
                    className="flex-1 py-[10px] bg-brand text-white rounded-lg font-bold text-[14px] border-none cursor-pointer hover:bg-brand-dark transition-colors">
                    Suivant →
                  </button>
                ) : (
                  <button
                    onClick={handleBtn}
                    disabled={busy}
                    className="flex-1 py-[10px] bg-brand text-white rounded-lg font-bold text-[14px] border-none cursor-pointer hover:bg-brand-dark disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                    {btnLabel}
                  </button>
                )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right panel — live preview */}
        <div className="flex-1 relative bg-cream overflow-hidden">
          <div className="absolute inset-0 overflow-auto p-10 box-border">
            <div className="relative mx-auto w-fit">
              {/* id=doc-print-area: cible isolée pour window.print() */}
              <div id="doc-print-area">
                <DocRenderer
                  data={{
                    layout:     template.layout,
                    blocks:     template.blocks,
                    hyperlinks: template.hyperlinks,
                  }}
                  blanks={template.blanks}
                  values={values}
                  civs={template.civs}
                  civValues={civValues}
                />
              </div>

              {shouldMask && (
                <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden rounded-[4px] print:hidden">
                  <div className="absolute inset-x-0 top-[34%] h-[28%] bg-white/16 backdrop-blur-[7px] shadow-[0_0_24px_rgba(255,255,255,0.22)]" />
                  <div className="absolute inset-x-0 top-[31%] h-[4%] bg-gradient-to-b from-transparent to-white/12" />
                  <div className="absolute inset-x-0 top-[62%] h-[4%] bg-gradient-to-t from-transparent to-white/12" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Description — section séparée sous les deux panneaux ── */}
      {(template.details?.intro || template.details?.description ||
        template.details?.revisionLabel || template.details?.formatsLabel ||
        template.details?.pageLabel) && (
        <section className="print:hidden bg-white border-t border-gray-200 px-10 py-10">
          <div className="max-w-[900px] mx-auto">

            {/* Métadonnées */}
            {(template.details?.revisionLabel || template.details?.formatsLabel || template.details?.pageLabel) && (
              <div className="flex gap-10 flex-wrap mb-8 pb-6 border-b border-gray-100">
                {template.details?.revisionLabel && (
                  <div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[.06em] mb-1">Dernière révision</div>
                    <div className="text-[14px] font-semibold text-gray-800">🕐 {template.details.revisionLabel}</div>
                  </div>
                )}
                {template.details?.formatsLabel && (
                  <div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[.06em] mb-1">Formats</div>
                    <div className="text-[14px] font-semibold text-gray-800">🗎 {template.details.formatsLabel}</div>
                  </div>
                )}
                {template.details?.pageLabel && (
                  <div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[.06em] mb-1">Taille</div>
                    <div className="text-[14px] font-semibold text-gray-800">↕ {template.details.pageLabel}</div>
                  </div>
                )}
              </div>
            )}

            {/* Introduction */}
            {template.details?.intro && (
              <p className="text-[15px] text-gray-700 leading-relaxed font-medium mb-4 mt-0">
                {template.details.intro}
              </p>
            )}

            {/* Description détaillée */}
            {template.details?.description && (
              <div>
                {template.details.description.split('\n\n').filter(Boolean).map((para, i) =>
                  para.trim().startsWith('##') ? (
                    <h2 key={i} className="text-[18px] font-extrabold mt-5 mb-1" style={{ color: '#0d2b2b' }}>
                      {para.trim().replace(/^##\s*/, '')}
                    </h2>
                  ) : (
                    <p key={i} className="text-[14px] text-gray-600 leading-relaxed mb-3 mt-0">{para}</p>
                  )
                )}
              </div>
            )}

          </div>
        </section>
      )}
    </div>
  )
}
