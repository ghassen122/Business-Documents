import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '../components/Navbar'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3007'

const HOW_STEPS = [
  { n: '1', title: 'Choisir un modèle', desc: 'Vous pouvez choisir parmi nos modèles de documents disponibles.' },
  { n: '2', title: 'Remplir le document', desc: 'Répondez à quelques questions et votre document se crée automatiquement.' },
  { n: '3', title: 'Sauvegarder - Imprimer', desc: 'Votre document est prêt à être utilisé ! Vous en faites ce que vous voulez.' },
  { n: '4', title: 'Avocat en option', desc: 'Un avocat peut relire votre document personnalisé pour vous conseiller.' },
]

export default function Documents() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    fetch(`${API}/api/templates`)
      .then(r => r.json())
      .then(data => { setTemplates(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))

    fetch(`${API}/api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(user => {
        if (!user) return
        setCurrentUser(user)
        fetch(`${API}/api/user/documents`, { credentials: 'include' })
          .then(r => r.ok ? r.json() : [])
          .then(docs => setSavedIds(new Set(docs.map(d => d.templateId))))
      })
  }, [])

  async function toggleSave(t) {
    if (!currentUser) {
      sessionStorage.setItem('pendingSave', JSON.stringify({
        templateId: t.id, templateName: t.name, fileName: t.fileName
      }))
      window.location.href = '/compte'
      return
    }
    setSavingId(t.id)
    const alreadySaved = savedIds.has(t.id)
    const r = await fetch(`${API}/api/user/documents`, {
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
    t.fileName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f7f3', fontFamily: "'Segoe UI', sans-serif" }}>
      <style>{`
        .doc-search-wrap { position: relative; width: 100%; max-width: 560px; margin: 0 auto; }
        .doc-search-input {
          width: 100%; padding: 16px 52px 16px 22px;
          border-radius: 50px; border: none;
          box-shadow: 0 2px 16px rgba(0,0,0,0.10);
          fontSize: 15px; outline: none; box-sizing: border-box;
          font-family: inherit;
        }
        .doc-search-icon {
          position: absolute; right: 18px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; padding: 0;
          color: #226d68; font-size: 20px; display: flex; align-items: center;
        }
        .doc-card:hover { box-shadow: 0 8px 28px rgba(34,109,104,0.15); transform: translateY(-3px); }
        .doc-card { transition: box-shadow 0.2s, transform 0.2s; }
        .doc-card-img { background: linear-gradient(135deg, #e8f4f3 0%, #d1ece9 100%); }
        .fill-btn:hover { background: #1a5450 !important; }
        .save-btn:hover { background: #f0fdf4 !important; border-color: #86efac !important; }
        .step-badge {
          width: 32px; height: 32px; border-radius: 50%;
          background: #226d68; color: white;
          font-weight: 800; font-size: 15px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
      `}</style>
      <Navbar />

      {/* ── HERO HEADER ── */}
      <div style={{
        background: 'linear-gradient(160deg, #1a5450 0%, #226d68 55%, #2d8a83 100%)',
        padding: '64px 24px 72px',
        textAlign: 'center',
        color: 'white',
      }}>
        <h1 style={{
          margin: '0 0 14px',
          fontSize: 'clamp(26px, 5vw, 44px)',
          fontWeight: '800',
          lineHeight: 1.2,
          letterSpacing: '-0.5px',
        }}>
          Créez facilement vos documents juridiques !
        </h1>
        <p style={{ margin: '0 0 36px', fontSize: '16px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
          Un ingénieux système de formulaire vous guide dans la réalisation de vos documents
        </p>

        {/* Search bar */}
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
              <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
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

      {/* ── GRID ── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Count */}
        {!loading && (
          <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#6b7280' }}>
            {filtered.length} document{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
            {search && ` pour "${search}"`}
          </p>
        )}

        {loading && <p style={{ textAlign: 'center', color: '#6b7280' }}>⏳ Chargement...</p>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
            <p style={{ fontSize: '48px', margin: '0 0 12px' }}>📭</p>
            <p style={{ fontSize: '15px' }}>
              {search ? 'Aucun résultat pour cette recherche.' : 'Aucun modèle disponible.'}{' '}
              {!search && <Link href="/admin" style={{ color: '#226d68', fontWeight: '600' }}>Importer un document</Link>}
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
          {filtered.map(t => (
            <div key={t.id} className="doc-card" style={{
              backgroundColor: 'white',
              borderRadius: '14px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              border: '1px solid #e5e7eb',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Image zone */}
              <div className="doc-card-img" style={{
                height: '130px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                <div style={{
                  width: '64px', height: '80px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '32px',
                }}>📄</div>
                {/* Champs badge */}
                <div style={{
                  position: 'absolute', top: '10px', right: '10px',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '20px',
                  padding: '3px 9px',
                  fontSize: '11px', fontWeight: '700', color: '#226d68',
                }}>
                  {t.blanksCount} champ{t.blanksCount > 1 ? 's' : ''}
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '16px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{
                  margin: '0 0 6px', fontSize: '14px', fontWeight: '700',
                  color: '#111827', lineHeight: 1.3,
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{t.name}</h3>
                <p style={{ margin: '0 0 14px', fontSize: '11px', color: '#9ca3af' }}>
                  {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                </p>

                {/* Buttons */}
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Link href={`/fill/${t.id}`} className="fill-btn" style={{
                    display: 'block', textAlign: 'center', padding: '10px',
                    backgroundColor: '#226d68', color: 'white', textDecoration: 'none',
                    borderRadius: '8px', fontSize: '13px', fontWeight: '700',
                    letterSpacing: '0.2px',
                  }}>
                    ✏️ Remplir le document
                  </Link>
                  <button
                    className="save-btn"
                    onClick={() => toggleSave(t)}
                    disabled={savingId === t.id}
                    style={{
                      width: '100%', padding: '9px', fontSize: '12px', fontWeight: '600',
                      borderRadius: '8px', cursor: savingId === t.id ? 'default' : 'pointer',
                      border: `1px solid ${savedIds.has(t.id) ? '#86efac' : '#e5e7eb'}`,
                      backgroundColor: savedIds.has(t.id) ? '#f0fdf4' : 'white',
                      color: savedIds.has(t.id) ? '#16a34a' : '#6b7280',
                      transition: 'all 0.15s',
                    }}
                  >
                    {savingId === t.id ? '...' : savedIds.has(t.id) ? '✅ Sauvegardé' : '🔖 Ajouter à mon espace'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
