import React, { useRef, useState } from 'react'
import { DocumentEditorComponent, Selection, Editor, Inject } from '@syncfusion/ej2-react-documenteditor'
import JSZip from 'jszip'
import Link from 'next/link'
import { useRouter } from 'next/router'

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

  const [templateName, setTemplateName] = useState('')
  const [fileName, setFileName] = useState('')
  const [sfdt, setSfdt] = useState(null)
  const [blanks, setBlanks] = useState([])
  const [blankNames, setBlankNames] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
      const res = await fetch('/api/proxy-convert', { method: 'POST', body: fd })
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
      openInEditor(uncompressedSfdt)
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
      const res = await fetch('/api/templates', {
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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px', backgroundColor: '#2c3e50', color: 'white', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/" style={{ color: '#bdc3c7', textDecoration: 'none', fontSize: '14px' }}>← Retour</Link>
        <h2 style={{ margin: 0, fontSize: '18px' }}>🔧 Administrateur — Importer un modèle</h2>
      </div>

      {/* Toolbar: template name + file upload */}
      <div style={{ padding: '10px 20px', backgroundColor: '#ecf0f1', borderBottom: '1px solid #ccc', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '14px', color: '#2c3e50' }}>Nom du modèle:</label>
          <input
            type="text"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            placeholder="Ex: Contrat de mandat"
            style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', width: '260px' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '14px', color: '#2c3e50' }}>Importer DOCX:</label>
          <input type="file" accept=".docx" onChange={e => handleOpenFile(e.target.files[0])} style={{ fontSize: '14px' }} />
        </div>
        {loading && <span style={{ color: '#e67e22', fontSize: '14px' }}>⏳ Conversion en cours...</span>}
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left panel: name each blank */}
        <div style={{ width: '340px', borderRight: '1px solid #ccc', overflowY: 'auto', padding: '16px', backgroundColor: '#fafafa' }}>
          <h3 style={{ marginTop: 0, fontSize: '15px', color: '#2c3e50' }}>📋 Nommer les champs détectés</h3>

          {blanks.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '13px' }}>
              {sfdt ? 'Aucun champ vide détecté.' : 'Importez un fichier DOCX pour commencer.'}
            </p>
          ) : (
            <>
              {blanks.map(blank => (
                <div key={blank.id} style={{ marginBottom: '14px', padding: '10px', backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px', lineHeight: '1.4' }}>
                    <span>...{blank.contextBefore}</span>
                    <span style={{ color: '#e74c3c', fontWeight: 'bold' }}> [_____] </span>
                    <span>{blank.contextAfter}...</span>
                  </div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '4px' }}>
                    Nom du champ:
                  </label>
                  <input
                    type="text"
                    value={blankNames[blank.id] || ''}
                    onChange={e => setBlankNames(prev => ({ ...prev, [blank.id]: e.target.value }))}
                    placeholder={`Champ ${blank.id + 1}`}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <button
                onClick={handleSave}
                disabled={saving || saved || !templateName.trim()}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: saved ? '#27ae60' : saving ? '#95a5a6' : '#2980b9',
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
          <div style={{ padding: '6px 12px', backgroundColor: '#e8f4f8', borderBottom: '1px solid #ddd', fontSize: '12px', color: '#666' }}>
            👁️ Aperçu du document
          </div>
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
