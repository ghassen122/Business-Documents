import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3007'

const inputStyle = {
  width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb',
  borderRadius: '8px', fontSize: '14px', outline: 'none',
  boxSizing: 'border-box', backgroundColor: 'white',
}

const btnPrimary = {
  width: '100%', padding: '11px', backgroundColor: '#226d68', color: 'white',
  border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '15px',
  cursor: 'pointer',
}

export default function Compte() {
  const router = useRouter()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [user, setUser] = useState(null)
  const [myDocs, setMyDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Formulaire
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setUser(data)
          fetchMyDocs()
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function fetchMyDocs() {
    fetch(`${API}/api/user/documents`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(setMyDocs)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setSubmitting(true)
    const endpoint = mode === 'login' ? `${API}/api/auth/login` : `${API}/api/auth/register`
    const body = mode === 'login' ? { email, password } : { name, email, password }
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error || 'Erreur.'); setSubmitting(false); return }
      setUser(data)
      // Vérifier si un document était en attente de sauvegarde
      const pending = sessionStorage.getItem('pendingSave')
      if (pending) {
        sessionStorage.removeItem('pendingSave')
        const doc = JSON.parse(pending)
        await fetch(`${API}/api/user/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(doc),
        })
        // Rediriger vers documents après sauvegarde
        router.push('/documents')
        return
      }
      fetchMyDocs()
    } catch {
      setError('Erreur réseau.')
    }
    setSubmitting(false)
  }

  async function handleLogout() {
    await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    setUser(null); setMyDocs([])
  }

  async function removeDoc(templateId) {
    const r = await fetch(`${API}/api/user/documents`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ templateId }),
    })
    if (r.ok) setMyDocs(await r.json())
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f7f3' }}>
      <Navbar />
      <p style={{ textAlign: 'center', paddingTop: '80px', color: '#9ca3af' }}>Chargement...</p>
    </div>
  )

  // ── Vue connecté ──────────────────────────────────────────────────────────
  if (user) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f7f3', fontFamily: "'Segoe UI', sans-serif" }}>
      <Navbar />
      <div style={{ maxWidth: '700px', margin: '48px auto', padding: '0 24px' }}>

        {/* Carte profil */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '28px 32px', border: '1px solid #e5e7eb', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '32px', marginBottom: '6px' }}>👤</div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#226d68' }}>{user.name}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>{user.email}</p>
            </div>
            <button onClick={handleLogout} style={{
              padding: '8px 18px', backgroundColor: 'white', color: '#ef4444',
              border: '1px solid #ef4444', borderRadius: '8px', fontWeight: '600',
              fontSize: '13px', cursor: 'pointer',
            }}>
              Déconnexion
            </button>
          </div>
        </div>

        {/* Mes documents */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#226d68' }}>
              📁 Mes documents sauvegardés
            </h3>
            <Link href="/documents" style={{
              fontSize: '13px', color: '#226d68', fontWeight: '600',
              textDecoration: 'none', border: '1px solid #e5e7eb',
              padding: '6px 14px', borderRadius: '6px',
            }}>
              + Parcourir les documents
            </Link>
          </div>

          {myDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
              <p style={{ fontSize: '36px', margin: '0 0 10px' }}>📭</p>
              <p style={{ fontSize: '14px' }}>Aucun document sauvegardé.<br />
                Allez dans <Link href="/documents" style={{ color: '#226d68', fontWeight: '600' }}>Tous les documents</Link> pour en ajouter.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myDocs.map(doc => (
                <div key={doc.templateId} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', backgroundColor: '#f8f7f3',
                  borderRadius: '8px', border: '1px solid #e5e7eb',
                }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: '600', fontSize: '14px', color: '#226d68' }}>{doc.templateName}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9ca3af' }}>
                      Sauvegardé le {new Date(doc.savedAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href={`/fill/${doc.templateId}`} style={{
                      padding: '7px 14px', backgroundColor: '#226d68', color: 'white',
                      borderRadius: '6px', fontSize: '13px', fontWeight: '600',
                      textDecoration: 'none',
                    }}>
                      Remplir
                    </Link>
                    <button onClick={() => removeDoc(doc.templateId)} style={{
                      padding: '7px 10px', backgroundColor: 'white', color: '#ef4444',
                      border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '13px',
                      cursor: 'pointer',
                    }} title="Retirer">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── Vue non connecté ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f7f3', fontFamily: "'Segoe UI', sans-serif" }}>
      <Navbar />
      <div style={{ maxWidth: '420px', margin: '64px auto', padding: '0 24px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '36px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>👤</div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#226d68' }}>
              {mode === 'login' ? 'Connexion' : 'Créer un compte'}
            </h1>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '24px' }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                flex: 1, padding: '10px', fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                backgroundColor: 'transparent', border: 'none',
                borderBottom: mode === m ? '2px solid #226d68' : '2px solid transparent',
                color: mode === m ? '#226d68' : '#9ca3af',
              }}>
                {m === 'login' ? 'Se connecter' : 'S\'inscrire'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mode === 'register' && (
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#226d68', display: 'block', marginBottom: '5px' }}>Nom complet</label>
                <input style={inputStyle} type="text" placeholder="Jean Dupont" value={name} onChange={e => setName(e.target.value)} required />
              </div>
            )}
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#226d68', display: 'block', marginBottom: '5px' }}>Email</label>
              <input style={inputStyle} type="email" placeholder="jean@exemple.fr" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#226d68', display: 'block', marginBottom: '5px' }}>Mot de passe</label>
              <input style={inputStyle} type="password" placeholder={mode === 'register' ? 'Minimum 6 caractères' : '••••••••'} value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && <p style={{ margin: 0, fontSize: '13px', color: '#ef4444', backgroundColor: '#fef2f2', padding: '8px 12px', borderRadius: '6px' }}>{error}</p>}

            <button type="submit" style={btnPrimary} disabled={submitting}>
              {submitting ? '...' : (mode === 'login' ? 'Se connecter' : 'Créer mon compte')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
