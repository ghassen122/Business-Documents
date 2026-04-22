import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '../components/Navbar'

export default function Documents() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then(data => { setTemplates(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.fileName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', fontFamily: "'Segoe UI', sans-serif" }}>
      <Navbar />

      {/* Page header */}
      <div style={{ backgroundColor: 'white', padding: '36px 24px 40px', color: '#1f2937', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: '800' }}>📋 Tous les documents</h1>
          <p style={{ margin: '0 0 24px', color: '#4b5563', fontSize: '15px' }}>
            Choisissez un modèle et remplissez-le en quelques secondes
          </p>
          <input
            type="text"
            placeholder="🔍 Rechercher un document..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', maxWidth: '400px', padding: '10px 16px',
              borderRadius: '8px', border: 'none', fontSize: '14px',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        {loading && <p style={{ textAlign: 'center', color: '#6b7280' }}>⏳ Chargement...</p>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
            <p style={{ fontSize: '48px', margin: '0 0 12px' }}>📭</p>
            <p style={{ fontSize: '15px' }}>
              {search ? 'Aucun résultat pour cette recherche.' : 'Aucun modèle disponible.'}{' '}
              {!search && <Link href="/admin" style={{ color: '#1f2937', fontWeight: '600' }}>Importer un document</Link>}
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {filtered.map(t => (
            <div key={t.id} style={{
              backgroundColor: 'white', borderRadius: '10px', padding: '22px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb',
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '10px',
                backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '22px', marginBottom: '14px',
              }}>📋</div>
              <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '700', color: '#1f2937' }}>{t.name}</h3>
              <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#9ca3af' }}>📁 {t.fileName}</p>
              <p style={{ margin: '0 0 18px', fontSize: '12px', color: '#9ca3af' }}>
                🔲 {t.blanksCount} champ{t.blanksCount > 1 ? 's' : ''} · {new Date(t.createdAt).toLocaleDateString('fr-FR')}
              </p>
              <Link href={`/fill/${t.id}`} style={{
                display: 'block', textAlign: 'center', padding: '9px',
                backgroundColor: '#1f2937', color: 'white', textDecoration: 'none',
                borderRadius: '6px', fontSize: '14px', fontWeight: '600',
              }}>
                ✏️ Remplir
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
