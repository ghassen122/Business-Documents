'use client'

import React, { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { ParsedDoc, BlankDef } from '../components/DocRenderer'

// DocRenderer uses browser APIs — disable SSR
const DocRenderer = dynamic(() => import('../components/DocRenderer'), { ssr: false })

// ── Types ────────────────────────────────────────────────────────────────────
interface Template {
  id: string
  name: string
  fileName: string
  blanksCount: number
  createdAt: string
}

interface TemplateDesc {
  intro: string
  revisionLabel: string
  formatsLabel: string
  pageLabel: string
  description: string
}

const EMPTY_DESC: TemplateDesc = {
  intro: '',
  revisionLabel: '',
  formatsLabel: '',
  pageLabel: '',
  description: '',
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function escHtml(str: string) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fileName,     setFileName]     = useState('')
  const [loading,      setLoading]      = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [price,        setPrice]        = useState<number>(0)
  const [desc,         setDesc]         = useState<TemplateDesc>(EMPTY_DESC)
  const [parsedData,   setParsedData]   = useState<ParsedDoc | null>(null)
  const [blankNames,     setBlankNames]     = useState<Record<number, string>>({})
  const [blankQuestions, setBlankQuestions] = useState<Record<number, string>>({})
  const [civs,         setCivs]         = useState<any[]>([])
  const [civAssignments, setCivAssignments] = useState<Record<number, number>>({})
  const [intervenantsCount, setIntervenantsCount] = useState<number>(1)
  const [intervenantNames, setIntervenantNames] = useState<string[]>([''])
  const [publishing,   setPublishing]   = useState(false)
  const [publishMsg,   setPublishMsg]   = useState<{ text: string; ok: boolean } | null>(null)

  // Templates overlay
  const [showOverlay,      setShowOverlay]      = useState(false)
  const [templates,        setTemplates]        = useState<Template[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)

  // ── Import DOCX ────────────────────────────────────────────────────────
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    if (!templateName) {
      setTemplateName(file.name.replace(/\.docx$/i, '').replace(/[-_]/g, ' '))
    }

    setLoading(true)
    setParsedData(null)
    setBlankNames({})
    setBlankQuestions({})
    setCivs([])
    setCivAssignments({})
    setIntervenantsCount(1)
    setIntervenantNames([''])

    try {
      const fd = new FormData()
      fd.append('docx', file)
      const res = await fetch('/api/parse-admin', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? res.statusText)
      }
      const data: ParsedDoc = await res.json()
      setParsedData(data)
      // Init blank names
      const names: Record<number, string> = {}
      ;(data.blanks ?? []).forEach(b => { names[b.id] = b.name || b.placeholder || `Champ ${b.id + 1}` })
      setBlankNames(names)
      setBlankQuestions({})
      // Init civ assignments from detected civs
      setCivs(data.civs ?? [])
      const assignments: Record<number, number> = {}
      ;(data.civs ?? []).forEach((c: any) => { assignments[c.id] = c.intervenantIndex ?? 0 })
      setCivAssignments(assignments)
      setIntervenantsCount(Math.max(1, ...Object.values(assignments).map(v => v + 1), 1))
      setIntervenantNames(prev => {
        const n = Math.max(1, ...Object.values(assignments).map(v => v + 1), 1)
        return Array.from({ length: n }, (_, i) => prev[i] ?? '')
      })
    } catch (err: any) {
      setPublishMsg({ text: `Erreur : ${err.message}`, ok: false })
    } finally {
      setLoading(false)
    }
  }, [templateName])

  // ── Publish ────────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    if (!parsedData || !templateName.trim()) return
    setPublishing(true)
    setPublishMsg(null)

    // Read original file as base64
    let originalDocx: string | null = null
    const file = fileInputRef.current?.files?.[0]
    if (file) {
      originalDocx = await new Promise<string | null>(resolve => {
        const reader = new FileReader()
        reader.onload  = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(file)
      })
    }

    const namedBlanks = (parsedData.blanks ?? []).map(b => ({
      ...b,
      name:     (blankNames[b.id]     ?? '').trim() || `Champ ${b.id + 1}`,
      question: (blankQuestions[b.id] ?? '').trim() || '',
    }))

    const namedCivs = civs.map(c => ({
      ...c,
      intervenantIndex: civAssignments[c.id] ?? 0,
    }))

    try {
      const res = await fetch('/api/templates', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          name       : templateName.trim(),
          fileName,
          price      : price || 0,
          layout     : parsedData.layout,
          blocks     : parsedData.blocks,
          hyperlinks : parsedData.hyperlinks,
          blanks     : namedBlanks,
          civs       : namedCivs,
          intervenantNames: intervenantNames.map((n, i) => n.trim() || `Intervenant ${i + 1}`),
          details    : desc,
          originalDocx,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? res.statusText)
      }
      setPublishMsg({ text: '✅ Modèle publié avec succès !', ok: true })
    } catch (err: any) {
      setPublishMsg({ text: `Erreur : ${err.message}`, ok: false })
    } finally {
      setPublishing(false)
    }
  }, [parsedData, templateName, fileName, blankNames, civs, civAssignments, intervenantsCount, intervenantNames, price, desc])

  // ── Templates overlay ──────────────────────────────────────────────────
  const openOverlay = useCallback(async () => {
    setShowOverlay(true)
    setTemplatesLoading(true)
    try {
      const res  = await fetch('/api/templates')
      const list = await res.json()
      setTemplates(Array.isArray(list) ? list : [])
    } catch {
      setTemplates([])
    } finally {
      setTemplatesLoading(false)
    }
  }, [])

  const deleteTemplate = useCallback(async (id: string, name: string) => {
    if (!confirm(`Supprimer "${name}" ?`)) return
    await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    setTemplates(prev => prev.filter(t => t.id !== id))
  }, [])

  const canPublish = !!parsedData && !!templateName.trim() && !publishing

  return (
    <>
      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <header className="admin-header">
        <div className="header-left">
          <img src="/LogoDOCGEN.png" alt="DocGen" style={{ height: '38px', objectFit: 'contain' }} />
        </div>
        <div className="header-right">
          <Link href="http://localhost:3001" className="header-link">← Retour au site</Link>
          <Link href="/Orders" className="header-link">📦 Commandes</Link>
          <button className="header-link" onClick={openOverlay}>📋 Mes modèles</button>
        </div>
      </header>

      {/* ── TOOLBAR ───────────────────────────────────────────────────── */}
      <div className="toolbar">
        <div className="toolbar-group">
          <label className="toolbar-label">📂 Importer un modèle DOCX :</label>
          <label className="upload-btn" htmlFor="fileInput">
            Choisir un fichier
            <input
              id="fileInput"
              ref={fileInputRef}
              type="file"
              accept=".docx"
              hidden
              onChange={handleFileChange}
            />
          </label>
          {fileName && <span className="file-name">{fileName}</span>}
        </div>
        {loading && (
          <div className="loading-bar">
            <span className="spinner" />
            <span>Analyse en cours…</span>
          </div>
        )}
      </div>

      {/* ── MAIN LAYOUT ───────────────────────────────────────────────── */}
      <div className="main-layout">

        {/* LEFT PANEL */}
        <div className="left-panel">

          <div className="panel-section">
            <label className="field-label">Nom du modèle</label>
            <input
              type="text"
              className="text-input"
              placeholder="Ex : Contrat de mandat"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
            />
          </div>

          <div className="panel-section">
            <label className="field-label">Prix (€) — 0 = gratuit</label>
            <input
              type="number"
              min={0}
              step={0.01}
              className="text-input"
              placeholder="Ex : 4.99"
              value={price === 0 ? '' : price}
              onChange={e => setPrice(parseFloat(e.target.value) || 0)}
            />
          </div>

          <h3 className="panel-heading">� Description (côté client)</h3>

          <div className="panel-section desc-section">
            <div className="desc-row">
              <div className="desc-half">
                <label className="field-label">Dernière révision</label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="Ex : 10/02/2026"
                  value={desc.revisionLabel}
                  onChange={e => setDesc(prev => ({ ...prev, revisionLabel: e.target.value }))}
                />
              </div>
              <div className="desc-half">
                <label className="field-label">Formats</label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="Ex : Word et PDF"
                  value={desc.formatsLabel}
                  onChange={e => setDesc(prev => ({ ...prev, formatsLabel: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <label className="field-label">Taille</label>
              <input
                type="text"
                className="text-input"
                placeholder="Ex : 12 à 19 pages"
                value={desc.pageLabel}
                onChange={e => setDesc(prev => ({ ...prev, pageLabel: e.target.value }))}
              />
            </div>

            <div style={{ marginTop: 10 }}>
              <label className="field-label">Introduction courte</label>
              <textarea
                className="admin-textarea"
                rows={2}
                placeholder="Ex : Ce modèle vous permet de créer vos statuts en quelques minutes."
                value={desc.intro}
                onChange={e => setDesc(prev => ({ ...prev, intro: e.target.value }))}
              />
            </div>

            <div style={{ marginTop: 10 }}>
              <label className="field-label">Description détaillée</label>
              <textarea
                className="admin-textarea"
                rows={6}
                placeholder="Décrivez ce que couvre ce document, à qui il s'adresse…&#10;&#10;Séparez les blocs par une ligne vide.&#10;Pour un titre en gras, commencez la ligne par ##&#10;Exemple :&#10;## Contenu du document&#10;Ce modèle comprend…"
                value={desc.description}
                onChange={e => setDesc(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          <h3 className="panel-heading">�📋 Nommer les champs détectés</h3>

          <div className="blanks-list">
            {!parsedData && (
              <p className="empty-msg">Importez un fichier DOCX pour commencer.</p>
            )}
            {parsedData && (parsedData.blanks ?? []).length === 0 && (
              <p className="empty-msg">Aucun champ vide détecté dans ce document.</p>
            )}
            {(parsedData?.blanks ?? []).map(b => (
              <div key={b.id} className="blank-card">
                <div className="blank-ctx">
                  …{escHtml(b.contextBefore)}
                  <span className="blank-token"> [_____] </span>
                  {escHtml(b.contextAfter)}…
                </div>
                <label className="blank-label">Nom du champ :</label>
                <input
                  type="text"
                  className="blank-input"
                  value={blankNames[b.id] ?? ''}
                  placeholder={`Champ ${b.id + 1}`}
                  onChange={e => setBlankNames(prev => ({ ...prev, [b.id]: e.target.value }))}
                />
                <label className="blank-label" style={{ marginTop: 6 }}>Question affichée au client :</label>
                <input
                  type="text"
                  className="blank-input"
                  value={blankQuestions[b.id] ?? ''}
                  placeholder={`Ex : Quel est votre nom complet ?`}
                  onChange={e => setBlankQuestions(prev => ({ ...prev, [b.id]: e.target.value }))}
                />
                
              </div>
            ))}
          </div>

          {/* ── Civilités détectées ── */}
          {civs.length > 0 && (
            <>
              <h3 className="panel-heading">👤 Intervenants (civilités)</h3>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 13, marginRight: 8 }}>Nombre d&apos;intervenants :</label>
                <select
                  value={intervenantsCount}
                  onChange={e => {
                    const n = Number(e.target.value)
                    setIntervenantsCount(n)
                    setIntervenantNames(prev => Array.from({ length: n }, (_, i) => prev[i] ?? ''))
                  }}
                  style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '2px 6px', fontSize: 13 }}
                >
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {/* Name inputs for each intervenant */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {Array.from({ length: intervenantsCount }, (_, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#6b7280', minWidth: 110 }}>
                      {intervenantNames[i]?.trim() ? intervenantNames[i] : `Intervenant ${i + 1}`} :
                    </span>
                    <input
                      type="text"
                      className="blank-input"
                      style={{ flex: 1 }}
                      placeholder={`Ex : Le vendeur, L'acheteur…`}
                      value={intervenantNames[i] ?? ''}
                      onChange={e => setIntervenantNames(prev => {
                        const next = [...prev]
                        next[i] = e.target.value
                        return next
                      })}
                    />
                  </div>
                ))}
              </div>
              <div className="blanks-list">
                {civs.map(c => (
                  <div key={c.id} className="blank-card">
                    <div className="blank-ctx">
                      …{c.contextBefore}<span className="blank-token"> {c.match} </span>{c.contextAfter}…
                    </div>
                    <label className="blank-label">Associer à l&apos;intervenant :</label>
                    <select
                      className="blank-input"
                      value={civAssignments[c.id] ?? 0}
                      onChange={e => setCivAssignments(prev => ({ ...prev, [c.id]: Number(e.target.value) }))}
                    >
                      {Array.from({ length: intervenantsCount }, (_, i) => (
                        <option key={i} value={i}>{intervenantNames[i]?.trim() || `Intervenant ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </>
          )}

          <button
            className={`btn-publish${publishing ? '' : canPublish ? '' : ' disabled'}`}
            disabled={!canPublish}
            onClick={handlePublish}
          >
            {publishing ? '⏳ Publication…' : '✅ Publier le modèle'}
          </button>

          {publishMsg && (
            <div className={`publish-status ${publishMsg.ok ? 'ok' : 'err'}`}>
              {publishMsg.text}
            </div>
          )}
        </div>

        {/* RIGHT PANEL — document preview */}
        <div className="right-panel">
          <div className="preview-wrapper">
            {!parsedData ? (
              <p className="preview-placeholder">La prévisualisation du document apparaîtra ici.</p>
            ) : (
              <DocRenderer data={parsedData} blankNames={blankNames} civs={civs} civValues={{}} />
            )}
          </div>
        </div>
      </div>

      {/* ── TEMPLATES OVERLAY ─────────────────────────────────────────── */}
      {showOverlay && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowOverlay(false) }}>
          <div className="overlay-box">
            <div className="overlay-header">
              <h2>📋 Modèles publiés</h2>
              <button className="overlay-close" onClick={() => setShowOverlay(false)}>✕</button>
            </div>
            <div className="templates-list">
              {templatesLoading && <p className="empty-msg">Chargement…</p>}
              {!templatesLoading && templates.length === 0 && (
                <p className="empty-msg">Aucun modèle publié pour l&apos;instant.</p>
              )}
              {templates.map(t => (
                <div key={t.id} className="template-row">
                  <div className="template-info">
                    <div className="template-name">{t.name}</div>
                    <div className="template-meta">
                      {t.blanksCount} champ(s) · {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <button
                    className="btn-delete"
                    onClick={() => deleteTemplate(t.id, t.name)}
                  >
                    🗑 Supprimer
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
