import React, { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Home() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then(data => { setTemplates(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '16px 24px', backgroundColor: '#2c3e50', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>📄 Documents disponibles</h1>
        <Link href="/admin" style={{ padding: '8px 16px', backgroundColor: '#e67e22', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' }}>
          🔧 Admin
        </Link>
      </div>

      <div style={{ padding: '24px' }}>
        {loading && <p style={{ color: '#666', textAlign: 'center', fontSize: '16px' }}>⏳ Chargement...</p>}
        {error && <p style={{ color: 'red', textAlign: 'center' }}>Erreur: {error}</p>}

        {!loading && !error && templates.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '80px', color: '#aaa' }}>
            <p style={{ fontSize: '56px', margin: 0 }}>📭</p>
            <p style={{ fontSize: '16px', marginTop: '16px' }}>
              Aucun modèle disponible.{' '}
              <Link href="/admin" style={{ color: '#2980b9' }}>Importer un document</Link>.
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {templates.map(t => (
            <div key={t.id} style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📋</div>
              <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#2c3e50' }}>{t.name}</h3>
              <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#999' }}>📁 {t.fileName}</p>
              <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#999' }}>
                🔲 {t.blanksCount} champ{t.blanksCount > 1 ? 's' : ''} · {new Date(t.createdAt).toLocaleDateString('fr-FR')}
              </p>
              <Link href={`/fill/${t.id}`} style={{ display: 'block', textAlign: 'center', padding: '9px', backgroundColor: '#2980b9', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' }}>
                ✏️ Remplir
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
