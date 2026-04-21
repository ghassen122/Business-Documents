import React, { useRef, useState, useEffect } from 'react'
import { DocumentEditorComponent, Selection, Editor, Inject } from '@syncfusion/ej2-react-documenteditor'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Navbar from '../../components/Navbar'

export default function Fill() {
  const router = useRouter()
  const { id } = router.query

  const containerRef = useRef(null)
  const debounceTimer = useRef(null)
  const editorReady = useRef(false)
  const pendingSfdt = useRef(null)

  const [template, setTemplate] = useState(null)
  const [values, setValues] = useState({})
  const [sfdt, setSfdt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/templates/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Modèle introuvable')
        return r.json()
      })
      .then(data => {
        setTemplate(data)
        setSfdt(data.sfdt)
        const initial = {}
        data.blanks.forEach(b => { initial[b.id] = '' })
        setValues(initial)
        // Show _____ instead of raw markers on initial load
        let displaySfdt = data.sfdt
        data.blanks.forEach(b => {
          displaySfdt = displaySfdt.split(b.marker).join('_____')
        })
        openInEditor(displaySfdt)
        setLoading(false)
      })
      .catch(err => {
        alert('Erreur: ' + err.message)
        router.push('/')
      })
  }, [id])

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

  const handleValueChange = (blankId, newValue) => {
    const updated = { ...values, [blankId]: newValue }
    setValues(updated)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      if (!sfdt || !template) return
      let sfdtStr = sfdt
      template.blanks.forEach(b => {
        const val = updated[b.id]
        // Empty fields show _____ instead of raw marker text
        sfdtStr = sfdtStr.split(b.marker).join((val && val !== '') ? val : '_____')
      })
      openInEditor(sfdtStr)
    }, 600)
  }

  const handleDownload = async () => {
    if (!sfdt || !template) return
    setDownloading(true)
    try {
      let filledSfdt = sfdt
      template.blanks.forEach(b => {
        const val = values[b.id]
        // Replace markers with filled values (empty string if not filled)
        filledSfdt = filledSfdt.split(b.marker).join(val && val !== '' ? val : '')
      })
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sfdt: filledSfdt, fileName: template.fileName })
      })
      if (!res.ok) {
        const txt = await res.text()
        alert('Erreur téléchargement: ' + txt)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (template.fileName || 'document').replace(/\.docx$/i, '') + '_rempli.docx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Erreur: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: "'Segoe UI', sans-serif", color: '#6b7280' }}>
        ⏳ Chargement du document...
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', sans-serif" }}>
      <Navbar />
      {/* Sub-header */}
      <div style={{ padding: '8px 20px', backgroundColor: '#c9f0f2', borderBottom: '1px solid #e3e6e6', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1f2937', flex: 1 }}>✏️ {template?.name}</h2>
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            padding: '8px 18px',
            backgroundColor: downloading ? '#9ca3af' : '#c9f0f2',
            color: downloading ? 'white' : '#1f2937',
            border: 'none',
            borderRadius: '6px',
            cursor: downloading ? 'default' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            whiteSpace: 'nowrap'
          }}
        >
          {downloading ? '⏳ Export...' : '⬇️ Télécharger DOCX'}
        </button>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel: named form fields */}
        <div style={{ width: '320px', borderRight: '1px solid #e5e7eb', overflowY: 'auto', padding: '16px', backgroundColor: '#f9fafb' }}>
          <h3 style={{ marginTop: 0, fontSize: '15px', color: '#1f2937', fontWeight: '700' }}>📋 Remplir les champs</h3>
          {template?.blanks.map(blank => (
            <div key={blank.id} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '700', fontSize: '14px', color: '#1f2937' }}>
                {blank.name || blank.placeholder || `Champ ${blank.id + 1}`}
              </label>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '5px', lineHeight: '1.4' }}>
                <span>...{blank.contextBefore}</span>
                <span style={{ color: '#1f2937', fontWeight: 'bold' }}> [_____] </span>
                <span>{blank.contextAfter}...</span>
              </div>
              <input
                type="text"
                placeholder={`Entrer ${blank.name || 'la valeur'}...`}
                value={values[blank.id] || ''}
                onChange={e => handleValueChange(blank.id, e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e3e6e6', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
          ))}
        </div>

        {/* Right panel: document preview */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '6px 12px', backgroundColor: '#c9f0f2', borderBottom: '1px solid #e3e6e6', fontSize: '12px', color: '#1f2937', fontWeight: '600' }}>
            📄 Aperçu en temps réel — Mode lecture seule 🔒
          </div>
          <DocumentEditorComponent
            id="fill-editor"
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
