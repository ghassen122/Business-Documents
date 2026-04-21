import React, { useRef, useState } from 'react'
import { DocumentEditorComponent, Selection, Editor, Inject } from '@syncfusion/ej2-react-documenteditor'
import JSZip from 'jszip'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'

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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', sans-serif" }}>
      <Navbar />
      {/* Toolbar: template name + file upload */}
      <div style={{ padding: '10px 20px', backgroundColor: '#c9f0f2', borderBottom: '1px solid #e3e6e6', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: '700', fontSize: '15px', color: '#1f2937' }}>🔧 Importer un modèle</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>Nom du modèle:</label>
          <input
            type="text"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            placeholder="Ex: Contrat de mandat"
            style={{ padding: '6px 10px', border: '1px solid #e3e6e6', borderRadius: '6px', fontSize: '14px', width: '260px', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>Importer DOCX:</label>
          <input type="file" accept=".docx" onChange={e => handleOpenFile(e.target.files[0])} style={{ fontSize: '14px' }} />
        </div>
        {loading && <span style={{ color: '#6b7280', fontSize: '14px' }}>⏳ Conversion en cours...</span>}
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left panel: name each blank */}
        <div style={{ width: '340px', borderRight: '1px solid #e5e7eb', overflowY: 'auto', padding: '16px', backgroundColor: '#f9fafb' }}>
          <h3 style={{ marginTop: 0, fontSize: '15px', color: '#1f2937', fontWeight: '700' }}>📋 Nommer les champs détectés</h3>

          {blanks.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '13px' }}>
              {sfdt ? 'Aucun champ vide détecté.' : 'Importez un fichier DOCX pour commencer.'}
            </p>
          ) : (
            <>
              {blanks.map(blank => (
                <div key={blank.id} style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#fff', border: '1px solid #e3e6e6', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px', lineHeight: '1.4' }}>
                    <span>...{blank.contextBefore}</span>
                    <span style={{ color: '#1f2937', fontWeight: 'bold' }}> [_____] </span>
                    <span>{blank.contextAfter}...</span>
                  </div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#374151', marginBottom: '4px', fontWeight: '600' }}>
                    Nom du champ:
                  </label>
                  <input
                    type="text"
                    value={blankNames[blank.id] || ''}
                    onChange={e => setBlankNames(prev => ({ ...prev, [blank.id]: e.target.value }))}
                    placeholder={`Champ ${blank.id + 1}`}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #e3e6e6', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              ))}

              <button
                onClick={handleSave}
                disabled={saving || saved || !templateName.trim()}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: saved ? '#059669' : saving ? '#9ca3af' : '#c9f0f2',
                  color: saved || saving ? 'white' : '#1f2937',
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
          <div style={{ padding: '6px 12px', backgroundColor: '#c9f0f2', borderBottom: '1px solid #e3e6e6', fontSize: '12px', color: '#1f2937', fontWeight: '600' }}>
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
