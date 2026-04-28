import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '../components/Navbar'

const DOCX_API    = process.env.NEXT_PUBLIC_DOCX_API    || 'http://localhost:4000'
const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://localhost:3007'

const HOW_STEPS = [
  { n: '1', title: 'Choisir un modèle',    desc: 'Vous pouvez choisir parmi nos modèles de documents disponibles.' },
  { n: '2', title: 'Remplir le document',   desc: 'Répondez à quelques questions et votre document se crée automatiquement.' },
  { n: '3', title: 'Sauvegarder - Imprimer', desc: 'Votre document est prêt à être utilisé ! Vous en faites ce que vous voulez.' },
  { n: '4', title: 'Avocat en option',       desc: 'Un avocat peut relire votre document personnalisé pour vous conseiller.' },
]

export default function Documents() {
  const [templates, setTemplates]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [savedIds, setSavedIds]     = useState(new Set())
  const [savingId, setSavingId]     = useState(null)

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
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f7f3', fontFamily: "'Segoe UI', sans-serif" }}>
      <style>{`
        .doc-search-wrap { position: relative; width: 100%; max-width: 560px; margin: 0 auto; }
        .doc-search-input { width: 100%; padding: 16px 52px 16px 22px; border-radius: 50px; border: none; box-shadow: 0 2px 16px rgba(0,0,0,0.10); font-size: 15px; outline: none; box-sizing: border-box; font-family: inherit; }
        .doc-search-icon { position: absolute; right: 18px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 0; color: #226d68; font-size: 20px; display: flex; align-items: center; }
        .doc-card:hover { box-shadow: 0 8px 28px rgba(34,109,104,0.15) !important; transform: translateY(-3px); }
        .doc-card { transition: box-shadow 0.2s, transform 0.2s; }
        .fill-btn:hover { background: #1a5450 !important; }
        .save-btn:hover { background: #f0fdf4 !important; border-color: #86efac !important; }
        .step-badge { width: 32px; height: 32px; border-radius: 50%; background: #226d68; color: white; font-weight: 800; font-size: 15px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      `}</style>
      <Navbar />

      {/* ── HERO ── */}
      <div style={{
        background: 'linear-gradient(160deg, #1a5450 0%, #226d68 55%, #2d8a83 100%)',
        padding: '64px 24px 72px',
        textAlign: 'center',
        color: 'white',
      }}>
        <h1 style={{ margin: '0 0 14px', fontSize: 'clamp(26px, 5vw, 44px)', fontWeight: '800', lineHeight: 1.2, letterSpacing: '-0.5px' }}>
          Créez facilement vos documents juridiques !
        </h1>
        <p style={{ margin: '0 0 36px', fontSize: '16px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
          Un ingénieux système de formulaire vous guide dans la réalisation de vos documents
        </p>
        <div className="doc-search-wrap">
          <input
            className="doc-search-input"
            type="text"
            placeholder="Rechercher un document"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="doc-search-icon" tabIndex={-1}>
            <svg width="20" height="20" fill="none" stroke="#226d68" strokeWidth="2.5" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── COMMENT ÇA MARCHE ── */}
      <div style={{ backgroundColor: 'white', padding: '48px 24px 52px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', margin: '0 0 36px', fontSize: '22px', fontWeight: '800', color: '#1a1a2e' }}>
            Comment ça marche ?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '28px' }}>
            {HOW_STEPS.map(s => (
              <div key={s.n} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="step-badge">{s.n}</div>
                  <span style={{ fontWeight: '700', fontSize: '15px', color: '#226d68' }}>{s.title}</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: 1.6, paddingLeft: '42px' }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── GRILLE DE TEMPLATES ── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>Chargement des documents...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>📭</p>
            <p style={{ color: '#9ca3af', fontSize: '16px' }}>
              {search ? `Aucun résultat pour "${search}"` : 'Aucun document disponible pour le moment.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '24px' }}>
            {filtered.map(t => {
              const saved   = savedIds.has(t.id)
              const saving  = savingId === t.id
              return (
                <div key={t.id} className="doc-card" style={{
                  backgroundColor: 'white', borderRadius: '12px',
                  border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  flex: '1 1 340px',
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '16px 20px',
                }}>
                  {/* Icon */}
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '10px', flexShrink: 0,
                    background: '#cef0ec',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px',
                  }}>📄</div>

                  {/* Name + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 3px', fontSize: '14px', fontWeight: '700', color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>
                      {t.blanksCount} champ{t.blanksCount !== 1 ? 's' : ''} · {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>

                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <Link href={`/fill/${t.id}`} className="fill-btn" style={{
                      padding: '8px 18px', backgroundColor: '#226d68', color: 'white',
                      borderRadius: '6px', fontWeight: '700', fontSize: '13px',
                      textDecoration: 'none', transition: 'background 0.15s', whiteSpace: 'nowrap',
                    }}>
                      Remplir →
                    </Link>
                    <button
                      className="save-btn"
                      onClick={() => toggleSave(t)}
                      disabled={saving}
                      title={saved ? 'Retirer de mes documents' : 'Sauvegarder'}
                      style={{
                        width: '36px', height: '36px', borderRadius: '6px',
                        border: `1px solid ${saved ? '#86efac' : '#e5e7eb'}`,
                        backgroundColor: saved ? '#f0fdf4' : 'white',
                        cursor: 'pointer', fontSize: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                    >
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
