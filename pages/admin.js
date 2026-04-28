import React, { useRef, useState, useEffect } from 'react'
import { DocumentEditorComponent, Selection, Editor, Inject } from '@syncfusion/ej2-react-documenteditor'
import JSZip from 'jszip'
import { useRouter } from 'next/router'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3007'

const decompressSfdt = async (compressedSfdtStr) => {
  try {
    const parsed = JSON.parse(compressedSfdtStr)
    if (!parsed.sfdt) return compressedSfdtStr
    const binaryStr = atob(parsed.sfdt)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
    const zip = await JSZip.loadAsync(bytes)
    const file = zip.file('sfdt')
    if (!file) return compressedSfdtStr
    return await file.async('text')
  } catch (e) {
    console.error('decompressSfdt failed:', e)
    return compressedSfdtStr
  }
}

export default function Admin() {
  const router = useRouter()
  const containerRef = useRef(null)
  const editorReady = useRef(false)
  const pendingSfdt = useRef(null)

  // --- Admin auth gate ---
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)
  const [adminPass, setAdminPass] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminLoggingIn, setAdminLoggingIn] = useState(false)

  // --- Editor state (tous les hooks doivent être AVANT tout return conditionnel) ---
  const [templateName, setTemplateName] = useState('')
  const [fileName, setFileName] = useState('')
  const [sfdt, setSfdt] = useState(null)
  const [blanks, setBlanks] = useState([])
  const [blankNames, setBlankNames] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/auth/admin-me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setIsAdmin(!!data?.admin)
        setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [])

  async function handleAdminLogin(e) {
    e.preventDefault()
    setAdminError('')
    setAdminLoggingIn(true)
    try {
      const res = await fetch(`${API}/api/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: adminPass }),
      })
      if (res.ok) {
        setIsAdmin(true)
      } else {
        const data = await res.json()
        setAdminError(data.error || 'Mot de passe incorrect.')
      }
    } catch {
      setAdminError('Erreur réseau.')
    } finally {
      setAdminLoggingIn(false)
    }
  }

  async function handleAdminLogout() {
    await fetch(`${API}/api/auth/admin-logout`, { method: 'POST', credentials: 'include' })
    setIsAdmin(false)
  }

  // --- Gate screen ---
  if (checking) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f7f3' }}>
        <p style={{ color: '#226d68', fontSize: '16px' }}>⏳ Vérification...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f7f3', fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '40px 36px', border: '1px solid #e5e7eb', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', width: '100%', maxWidth: '380px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span style={{ fontSize: '36px' }}>🔧</span>
            <h1 style={{ margin: '10px 0 4px', fontSize: '22px', fontWeight: '700', color: '#226d68' }}>Espace Admin</h1>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>Accès réservé aux administrateurs</p>
          </div>
          <form onSubmit={handleAdminLogin}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#226d68', marginBottom: '6px' }}>
              Mot de passe admin
            </label>
            <input
              type="password"
              value={adminPass}
              onChange={e => setAdminPass(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%', padding: '11px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', marginBottom: '14px' }}
            />
            {adminError && (
              <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px', padding: '8px 12px', backgroundColor: '#fff5f5', borderRadius: '6px', border: '1px solid #fee2e2' }}>
                {adminError}
              </div>
            )}
            <button
              type="submit"
              disabled={adminLoggingIn}
              style={{ width: '100%', padding: '12px', backgroundColor: '#226d68', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '15px', cursor: adminLoggingIn ? 'default' : 'pointer' }}
            >
              {adminLoggingIn ? '⏳ Connexion...' : '🔓 Accéder'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <a href="/" style={{ color: '#9ca3af', fontSize: '13px', textDecoration: 'none' }}>← Retour au site</a>
          </div>
        </div>
      </div>
    )
  }

  // --- Admin is authenticated, show full admin UI ---

  const openInEditor = (sfdtStr) => {
    if (editorReady.current && containerRef.current) {
      try {
        containerRef.current.open(typeof sfdtStr === 'string' ? sfdtStr : JSON.stringify(sfdtStr))
      } catch (e) {
        console.error('open() failed:', e)
      }
    } else {
      pendingSfdt.current = sfdtStr
    }
  }

  const onCreated = () => {
    setTimeout(() => {
      editorReady.current = true
      if (pendingSfdt.current) {
        try {
          containerRef.current.open(typeof pendingSfdt.current === 'string' ? pendingSfdt.current : JSON.stringify(pendingSfdt.current))
        } catch (e) {
          console.error('open() in onCreated failed:', e)
        }
        pendingSfdt.current = null
      }
    }, 500)
  }

  const handleOpenFile = async (file) => {
    if (!file) return
    setLoading(true)
    setSaved(false)
    setFileName(file.name)
    if (!templateName) setTemplateName(file.name.replace(/\.docx$/i, ''))
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch(`${API}/api/proxy-convert`, { method: 'POST', body: fd })
      if (!res.ok) {
        const txt = await res.text()
        alert('Erreur conversion: ' + txt)
        return
      }
      const data = await res.json()
      const uncompressedSfdt = await decompressSfdt(data.sfdt)
      setSfdt(uncompressedSfdt)
      setBlanks(data.blanks || [])
      const initialNames = {}
      ;(data.blanks || []).forEach(b => {
        initialNames[b.id] = b.placeholder || ('Champ ' + (b.id + 1))
      })
      setBlankNames(initialNames)
      // Show _____ instead of raw markers in preview
      let displaySfdt = uncompressedSfdt
      ;(data.blanks || []).forEach(b => {
        displaySfdt = displaySfdt.split(b.marker).join('_____')
      })
      openInEditor(displaySfdt)
    } catch (err) {
      alert('Erreur: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!templateName.trim()) { alert('Veuillez donner un nom au modèle'); return }
    if (!sfdt) { alert("Veuillez d'abord charger un document"); return }
    setSaving(true)
    try {
      const namedBlanks = blanks.map(b => ({
        ...b,
        name: (blankNames[b.id] || '').trim() || ('Champ ' + (b.id + 1))
      }))
      const res = await fetch(`${API}/api/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: templateName.trim(), fileName, sfdt, blanks: namedBlanks })
      })
      if (!res.ok) {
        const err = await res.json()
        alert('Erreur sauvegarde: ' + (err.error || 'Inconnue'))
        return
      }
      setSaved(true)
      setTimeout(() => router.push('/'), 1800)
    } catch (err) {
      alert('Erreur: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Header admin séparé */}
      <div style={{ backgroundColor: '#226d68', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px' }}>🔧</span>
          <span style={{ color: 'white', fontWeight: '800', fontSize: '18px', letterSpacing: '0.3px' }}>DocGen — Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="/" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', textDecoration: 'none', fontWeight: '600' }}>← Retour au site</a>
          <button onClick={handleAdminLogout} style={{ padding: '7px 16px', backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            Déconnexion admin
          </button>
        </div>
      </div>
      {/* Toolbar: file upload only */}
      <div style={{ padding: '12px 28px', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: '700', fontSize: '15px', color: '#226d68' }}>📂 Importer un modèle DOCX :</label>
          <input type="file" accept=".docx" onChange={e => handleOpenFile(e.target.files[0])} style={{ fontSize: '14px' }} />
        </div>
        {loading && <span style={{ color: '#6b7280', fontSize: '14px' }}>⏳ Conversion en cours...</span>}
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left panel: name each blank */}
        <div style={{ width: '360px', borderRight: '1px solid #e5e7eb', overflowY: 'auto', padding: '28px 24px', paddingTop: '32px', backgroundColor: '#f8f7f3' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '700', fontSize: '13px', color: '#226d68', marginBottom: '6px' }}>Nom du modèle</label>
            <input
              type="text"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="Ex: Contrat de mandat"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none', backgroundColor: 'white' }}
            />
          </div>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '15px', color: '#226d68', fontWeight: '700' }}>📋 Nommer les champs détectés</h3>

          {blanks.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '13px' }}>
              {sfdt ? 'Aucun champ vide détecté.' : 'Importez un fichier DOCX pour commencer.'}
            </p>
          ) : (
            <>
              {blanks.map(blank => (
                <div key={blank.id} style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px', lineHeight: '1.4' }}>
                    <span>...{blank.contextBefore}</span>
                    <span style={{ color: '#226d68', fontWeight: 'bold' }}> [_____] </span>
                    <span>{blank.contextAfter}...</span>
                  </div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#226d68', marginBottom: '4px', fontWeight: '600' }}>
                    Nom du champ:
                  </label>
                  <input
                    type="text"
                    value={blankNames[blank.id] || ''}
                    onChange={e => setBlankNames(prev => ({ ...prev, [blank.id]: e.target.value }))}
                    placeholder={`Champ ${blank.id + 1}`}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              ))}

              <button
                onClick={handleSave}
                disabled={saving || saved || !templateName.trim()}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: saved ? '#059669' : saving ? '#9ca3af' : '#226d68',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: saving || saved ? 'default' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginTop: '8px'
                }}
              >
                {saved ? '✅ Publié ! Redirection...' : saving ? '⏳ Publication...' : '✅ Publier le modèle'}
              </button>
            </>
          )}
        </div>

        {/* Right panel: document preview */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <DocumentEditorComponent
            id="admin-editor"
            ref={containerRef}
            height={'100%'}
            isReadOnly={true}
            enableSelection={true}
            enableEditor={true}
            serviceUrl={''}
            created={onCreated}
          >
            <Inject services={[Selection, Editor]} />
          </DocumentEditorComponent>
        </div>
      </div>
    </div>
  )
}
