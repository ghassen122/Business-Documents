import React, { useState, useRef, useCallback } from 'react'
import Head from 'next/head'
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
  const [parsedData,   setParsedData]   = useState<ParsedDoc | null>(null)
  const [blankNames,   setBlankNames]   = useState<Record<number, string>>({})
  const [publishing,   setPublishing]   = useState(false)
  const [publishMsg,   setPublishMsg]   = useState<{ text: string; ok: boolean } | null>(null)

  // Templates overlay
  const [showOverlay,    setShowOverlay]    = useState(false)
  const [templates,      setTemplates]      = useState<Template[]>([])
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
    setPublishMsg(null)

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
      name: (blankNames[b.id] ?? '').trim() || `Champ ${b.id + 1}`,
    }))

    try {
      const res = await fetch('/api/templates', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          name       : templateName.trim(),
          fileName,
          layout     : parsedData.layout,
          blocks     : parsedData.blocks,
          hyperlinks : parsedData.hyperlinks,
          blanks     : namedBlanks,
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
  }, [parsedData, templateName, fileName, blankNames])

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
      <Head>
        <title>DocGen — Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <header className="admin-header">
        <div className="header-left">
          <span className="header-icon">🔧</span>
          <span className="header-title">DocGen — Admin</span>
        </div>
        <div className="header-right">
          <Link href="http://localhost:3001" className="header-link">← Retour au site</Link>
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

          <h3 className="panel-heading">📋 Nommer les champs détectés</h3>

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
              </div>
            ))}
          </div>

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
              <DocRenderer data={parsedData} blankNames={blankNames} />
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
