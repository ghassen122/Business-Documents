import React, { useRef, useState } from 'react'
import { DocumentEditorComponent, Selection, Editor, Inject } from '@syncfusion/ej2-react-documenteditor'
import JSZip from 'jszip'

// Decompress Syncfusion compressed SFDT {"sfdt":"<base64 zip>"} to plain SFDT JSON string
const decompressSfdt = async (compressedSfdtStr) => {
  try {
    const parsed = JSON.parse(compressedSfdtStr)
    if (!parsed.sfdt) return compressedSfdtStr // already uncompressed
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

export default function Home() {
  const containerRef = useRef(null)
  const debounceTimer = useRef(null)
  const editorReady = useRef(false)
  const pendingSfdt = useRef(null)
  const [blanks, setBlanks] = useState([])
  const [values, setValues] = useState({})
  const [sfdt, setSfdt] = useState(null)
  const [fileName, setFileName] = useState('')

  const openInEditor = (sfdtStr) => {
    // Diagnostic: log type and preview of what we receive
    console.log('openInEditor called, type:', typeof sfdtStr, 'length:', sfdtStr?.length)
    console.log('SFDT preview:', typeof sfdtStr === 'string' ? sfdtStr.substring(0, 200) : JSON.stringify(sfdtStr).substring(0, 200))
    if (editorReady.current && containerRef.current) {
      try {
        // Syncfusion open() needs a string; if it's an object, stringify it
        const str = typeof sfdtStr === 'string' ? sfdtStr : JSON.stringify(sfdtStr)
        containerRef.current.open(str)
      } catch(e) {
        console.error('open() failed:', e)
        alert('Erreur open: ' + e.message)
      }
    } else {
      pendingSfdt.current = sfdtStr
    }
  }

  const onCreated = () => {
    // Give the rendering engine a moment to fully initialize after created fires
    setTimeout(() => {
      editorReady.current = true
      if (pendingSfdt.current) {
        try {
          const str = typeof pendingSfdt.current === 'string' ? pendingSfdt.current : JSON.stringify(pendingSfdt.current)
          containerRef.current.open(str)
        } catch(e) {
          console.error('open() in onCreated failed:', e)
          alert('Erreur open: ' + e.message)
        }
        pendingSfdt.current = null
      }
    }, 500)
  }

  const handleOpenFile = async (file) => {
    if (!file) return
    
    setFileName(file.name)
    const fd = new FormData()
    fd.append('file', file)
    
    try {
      const res = await fetch('/api/proxy-convert', { method: 'POST', body: fd })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        alert('Erreur conversion: ' + txt)
        return
      }
      
      const data = await res.json()
      console.log('Data received from server:', data)

      // Decompress the SFDT so text replacement and open() both work
      const uncompressedSfdt = await decompressSfdt(data.sfdt)
      console.log('Uncompressed SFDT preview:', uncompressedSfdt.substring(0, 200))

      setSfdt(uncompressedSfdt)
      setBlanks(data.blanks || [])
      
      // Initialize form values
      const initialValues = {}
      ;(data.blanks || []).forEach(blank => {
        initialValues[blank.id] = ''
      })
      setValues(initialValues)
      
      // Display the SFDT in editor (waits for created event if needed)
      openInEditor(uncompressedSfdt)
    } catch (err) {
      console.error('Error:', err)
      alert('Erreur: ' + err.message)
    }
  }

  const handleValueChange = (blankId, newValue) => {
    const updatedValues = { ...values, [blankId]: newValue }
    setValues(updatedValues)

    // Debounce: wait 600ms after last keystroke before reloading document
    // This avoids conflicts with Syncfusion internal mouse/selection events
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      if (!sfdt) return
      let sfdtStr = sfdt
      blanks.forEach(b => {
        const val = updatedValues[b.id]
        const replaceWith = (val && val !== '') ? val : b.marker
        sfdtStr = sfdtStr.split(b.marker).join(replaceWith)
      })
      openInEditor(sfdtStr)
    }, 600)
  }

  const handleDownload = async () => {
    if (!sfdt || !fileName) {
      alert('Veuillez d\'abord charger un document')
      return
    }
    
    try {
      alert('Téléchargement en développement - contenu: ' + JSON.stringify(values))
    } catch (err) {
      console.error('Download error:', err)
      alert('Erreur lors du téléchargement: ' + err.message)
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Import Button */}
      <div style={{ 
        padding: '40px 20px', 
        borderBottom: '1px solid #ccc', 
        backgroundColor: '#ffffff',
        textAlign: 'center',
        zIndex: 100,
        position: 'relative'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '16px', color: '#333' }}>📄 Gestionnaire de Documents</h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 'bold', fontSize: '16px', color: '#333' }}>Importer un document DOCX:</label>
          <input 
            type="file" 
            accept=".docx" 
            onChange={(e) => handleOpenFile(e.target.files[0])}
            style={{ padding: '8px', fontSize: '14px' }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel - Form */}
        <div style={{
          width: '350px',
          borderRight: '1px solid #ccc',
          overflowY: 'auto',
          padding: '16px',
          backgroundColor: '#fafafa'
        }}>
          <h3 style={{ marginTop: 0 }}>📋 Formulaire de remplissage</h3>
          
          {blanks.length === 0 ? (
            <p style={{ color: '#999' }}>Aucun champ à remplir détecté</p>
          ) : (
            <>
              {blanks.map((blank) => (
                <div key={blank.id} style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>
                    Champ {blank.id + 1}
                  </label>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    <span>...{blank.contextBefore}</span>
                    <span style={{ color: '#d9534f', fontWeight: 'bold' }}>[_____]</span>
                    <span>{blank.contextAfter}...</span>
                  </div>
                  <input
                    type="text"
                    placeholder={blank.placeholder}
                    value={values[blank.id] || ''}
                    onChange={(e) => handleValueChange(blank.id, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              ))}
              
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #ccc' }}>
                <button
                  onClick={handleDownload}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#5cb85c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  ⬇️ Télécharger le document
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Panel - Document Editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px', backgroundColor: '#e8f4f8', borderBottom: '1px solid #ddd', fontSize: '12px', color: '#666' }}>
            📄 Aperçu du document (modifications en temps réel) — Mode lecture seule 🔒
          </div>
          <DocumentEditorComponent
            id="container"
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
