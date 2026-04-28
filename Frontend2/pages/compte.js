import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://localhost:3007'

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
  const [mode, setMode]         = useState('login')
  const [user, setUser]         = useState(null)
  const [myDocs, setMyDocs]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`${BACKEND_API}/api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) { setUser(data); fetchMyDocs() }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function fetchMyDocs() {
    fetch(`${BACKEND_API}/api/user/documents`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(setMyDocs)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setSubmitting(true)
    const endpoint = mode === 'login' ? `${BACKEND_API}/api/auth/login` : `${BACKEND_API}/api/auth/register`
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
      const pending = sessionStorage.getItem('pendingSave')
      if (pending) {
        sessionStorage.removeItem('pendingSave')
        const doc = JSON.parse(pending)
        await fetch(`${BACKEND_API}/api/user/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(doc),
        })
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
    await fetch(`${BACKEND_API}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    setUser(null); setMyDocs([])
  }

  async function removeDoc(templateId) {
    const r = await fetch(`${BACKEND_API}/api/user/documents`, {
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

  // ── Vue connectée ──
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
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: '32px', marginBottom: '12px' }}>📭</p>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>Aucun document sauvegardé pour l'instant.</p>
              <Link href="/documents" style={{
                display: 'inline-block', marginTop: '12px',
                padding: '8px 20px', backgroundColor: '#226d68', color: 'white',
                textDecoration: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '13px',
              }}>
                Parcourir les documents
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myDocs.map((doc, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', backgroundColor: '#f8f7f3',
                  borderRadius: '8px', border: '1px solid #e5e7eb',
                }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a2e' }}>
                      {doc.templateName || doc.templateId}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                      {doc.fileName || ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Link href={`/fill/${doc.templateId}`} style={{
                      padding: '6px 14px', backgroundColor: '#226d68', color: 'white',
                      textDecoration: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '13px',
                    }}>
                      Remplir
                    </Link>
                    <button onClick={() => removeDoc(doc.templateId)} style={{
                      padding: '6px 12px', backgroundColor: 'white', color: '#ef4444',
                      border: '1px solid #ef4444', borderRadius: '6px', fontWeight: '600',
                      fontSize: '13px', cursor: 'pointer',
                    }}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── Vue déconnectée ──
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f7f3', fontFamily: "'Segoe UI', sans-serif" }}>
      <Navbar />

      <div style={{
        background: 'linear-gradient(160deg, #1a5450 0%, #226d68 55%, #2d8a83 100%)',
        padding: '48px 24px',
        textAlign: 'center',
        color: 'white',
        marginBottom: '40px',
      }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: '800' }}>
          {mode === 'login' ? '🔐 Connexion' : '✨ Créer un compte'}
        </h1>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '15px' }}>
          {mode === 'login' ? 'Accédez à vos documents sauvegardés' : 'Rejoignez DocGen pour sauvegarder vos documents'}
        </p>
      </div>

      <div style={{ maxWidth: '420px', margin: '0 auto', padding: '0 24px 60px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb', marginBottom: '28px' }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }} style={{
              flex: 1, padding: '12px', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: '700',
              backgroundColor: mode === m ? '#226d68' : 'white',
              color: mode === m ? 'white' : '#6b7280',
              transition: 'all 0.15s',
            }}>
              {m === 'login' ? '🔐 Connexion' : '✨ S\'inscrire'}
            </button>
          ))}
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '28px', border: '1px solid #e5e7eb' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {mode === 'register' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                    Nom complet
                  </label>
                  <input style={inputStyle} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jean Dupont" required />
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Adresse email
                </label>
                <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean@exemple.fr" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Mot de passe
                </label>
                <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>

              {error && (
                <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '13px', color: '#dc2626' }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '13px', color: '#16a34a' }}>
                  {success}
                </div>
              )}

              <button type="submit" style={btnPrimary} disabled={submitting}>
                {submitting ? '⏳ Chargement...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
