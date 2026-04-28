import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../../components/Navbar'
import DocRenderer from '../../components/DocRenderer'

const DOCX_API    = process.env.NEXT_PUBLIC_DOCX_API    || 'http://localhost:4000'
const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://localhost:3007'

export default function FillPage() {
  const router = useRouter()
  const { id }  = router.query

  const [template,    setTemplate]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [values,      setValues]      = useState({})
  const [downloading, setDownloading] = useState(false)
  const [user,        setUser]        = useState(null)

  // Fetch current user (optional — for save-to-account integration)
  useEffect(() => {
    fetch(`${BACKEND_API}/api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(u => setUser(u))
      .catch(() => {})
  }, [])

  // Load template from docx-viewer API
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

  // ── Loading ──
  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f7f3' }}>
      <Navbar />
      <p style={{ textAlign: 'center', paddingTop: '80px', color: '#9ca3af' }}>Chargement du document...</p>
    </div>
  )

  // ── Not found ──
  if (error || !template) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f7f3' }}>
      <Navbar />
      <div style={{ textAlign: 'center', paddingTop: '80px' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>😕</p>
        <p style={{ color: '#ef4444', fontWeight: '600', marginBottom: '20px' }}>Document introuvable.</p>
        <a href="/documents" style={{ color: '#226d68', fontWeight: '700', textDecoration: 'none', fontSize: '15px' }}>
          ← Retour aux documents
        </a>
      </div>
    </div>
  )

  const blanksCount = (template.blanks || []).length

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f7f3', fontFamily: "'Segoe UI', sans-serif" }}>
      <style>{`
        .fill-input:focus { border-color: #226d68 !important; box-shadow: 0 0 0 3px rgba(34,109,104,0.12); }
        .fill-input { transition: border-color 0.15s, box-shadow 0.15s; }
        .dl-btn:hover:not(:disabled) { background: #1a5450 !important; transform: translateY(-1px); }
        .dl-btn { transition: background 0.15s, transform 0.15s; }
      `}</style>

      <Navbar />

      {/* ── Header bar ── */}
      <div style={{
        background: 'linear-gradient(160deg, #1a5450 0%, #226d68 55%, #2d8a83 100%)',
        padding: '24px 40px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
            <a href="/documents" style={{ color: 'inherit', textDecoration: 'none' }}>Documents</a>
            {' › '}
            {template.name}
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>{template.name}</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
            {blanksCount} champ{blanksCount !== 1 ? 's' : ''} à compléter
          </p>
        </div>
        <button
          className="dl-btn"
          onClick={handleDownload}
          disabled={downloading}
          style={{
            padding: '12px 28px', backgroundColor: downloading ? '#9ca3af' : 'white',
            color: '#226d68', border: 'none', borderRadius: '8px',
            fontWeight: '700', fontSize: '15px',
            cursor: downloading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {downloading ? '⏳ Génération…' : '📥 Télécharger DOCX'}
        </button>
      </div>

      {/* ── Main layout: form + preview ── */}
      <div style={{
        display: 'flex',
        height: 'calc(100vh - 72px - 88px)',
        overflow: 'hidden',
      }}>

        {/* Left panel — form */}
        <div style={{
          width: '360px',
          flexShrink: 0,
          borderRight: '1px solid #e5e7eb',
          overflowY: 'auto',
          backgroundColor: 'white',
          padding: '24px',
        }}>
          {blanksCount === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: '48px' }}>
              <p style={{ fontSize: '36px', marginBottom: '12px' }}>✅</p>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Aucun champ à remplir dans ce document.
              </p>
            </div>
          ) : (
            <>
              <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '700', color: '#226d68' }}>
                📝 Remplir les champs
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {(template.blanks || []).map(blank => (
                  <div key={blank.id}>
                    <label style={{
                      display: 'block', fontSize: '12px', fontWeight: '700',
                      color: '#374151', marginBottom: '6px', textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                    }}>
                      {blank.name || `Champ ${blank.id + 1}`}
                    </label>
                    {(blank.contextBefore || blank.contextAfter) && (
                      <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#9ca3af', lineHeight: 1.5 }}>
                        …{blank.contextBefore} <em style={{ color: '#d1d5db' }}>[champ]</em> {blank.contextAfter}…
                      </p>
                    )}
                    <input
                      className="fill-input"
                      type="text"
                      value={values[String(blank.id)] || ''}
                      onChange={e => setValues(v => ({ ...v, [String(blank.id)]: e.target.value }))}
                      placeholder={`Saisir ${blank.name || 'la valeur'}…`}
                      style={{
                        width: '100%', padding: '9px 12px',
                        border: '1px solid #e5e7eb', borderRadius: '8px',
                        fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Download button (also at bottom of form for convenience) */}
              <button
                className="dl-btn"
                onClick={handleDownload}
                disabled={downloading}
                style={{
                  marginTop: '28px', width: '100%', padding: '12px',
                  backgroundColor: downloading ? '#9ca3af' : '#226d68',
                  color: 'white', border: 'none', borderRadius: '8px',
                  fontWeight: '700', fontSize: '15px',
                  cursor: downloading ? 'not-allowed' : 'pointer',
                }}
              >
                {downloading ? '⏳ Génération…' : '📥 Télécharger DOCX'}
              </button>
            </>
          )}
        </div>

        {/* Right panel — live document preview */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#f8f7f3',
          padding: '40px',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <DocRenderer
            data={{
              layout:     template.layout,
              blocks:     template.blocks,
              hyperlinks: template.hyperlinks,
            }}
            blanks={template.blanks}
            values={values}
          />
        </div>
      </div>
    </div>
  )
}
