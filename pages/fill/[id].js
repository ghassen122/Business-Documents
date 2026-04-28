import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../../components/Navbar'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3007'

// ─────────────────────────────────────────────────────────────────────────────
// SFDT → React renderer
// ─────────────────────────────────────────────────────────────────────────────

function normColor(c) {
  if (!c || c === 'empty' || c === '#00000000') return undefined
  return c.startsWith('#') ? c : `#${c}`
}

function buildCharStyle(fmt = {}) {
  const s = {}
  // Support both full names (non-optimized) and abbreviated names (optimized SFDT)
  if (fmt.bold || fmt.b) s.fontWeight = '700'
  if (fmt.italic || fmt.i) s.fontStyle = 'italic'
  const underline = fmt.underline || fmt.u
  const strike = fmt.strikethrough || fmt.s
  const deco = [underline && 'underline', strike && 'line-through'].filter(Boolean)
  if (deco.length) s.textDecoration = deco.join(' ')
  const fontSize = fmt.fontSize ?? fmt.fsz
  if (fontSize) s.fontSize = `${fontSize}pt`
  const fontFamily = fmt.fontFamily || fmt.ff
  if (fontFamily) s.fontFamily = fontFamily
  const col = normColor(fmt.fontColor || fmt.c || fmt.fc)
  if (col) s.color = col
  const baseline = fmt.baselineAlignment || fmt.ba
  if (baseline === 'Superscript') s.verticalAlign = 'super'
  if (baseline === 'Subscript') s.verticalAlign = 'sub'
  return s
}

function buildParaStyle(fmt = {}) {
  // textAlignment: non-opt = string ('Left','Center','Right','Justify')
  //                opt     = number (0=Left, 1=Center, 2=Right, 3=Justify)
  const taNum = fmt.ta
  const taMap = { 0: 'left', 1: 'center', 2: 'right', 3: 'justify' }
  const align = taNum != null ? (taMap[taNum] || 'left') : (fmt.textAlignment || 'Left').toLowerCase()
  const bs = fmt.beforeSpacing ?? fmt.bs
  const as_ = fmt.afterSpacing ?? fmt.as
  const ls = fmt.lineSpacing ?? fmt.ls
  const lst = fmt.lineSpacingType ?? fmt.lst
  const s = {
    textAlign: align,
    marginTop: bs != null ? `${bs}pt` : 0,
    marginBottom: as_ != null ? `${as_}pt` : '6pt',
    lineHeight: ls != null ? ls : 1.5,
    minHeight: '1em',
  }
  const leftIndent = fmt.leftIndent ?? fmt.lin
  const rightIndent = fmt.rightIndent ?? fmt.rin
  const firstLine = fmt.firstLineIndent ?? fmt.fin
  if (firstLine < 0) {
    // Hanging indent: paddingLeft covers full block, textIndent pulls first line back
    s.paddingLeft = `${(leftIndent || 0) + Math.abs(firstLine)}pt`
    s.textIndent = `${firstLine}pt`
  } else {
    if (leftIndent) s.paddingLeft = `${leftIndent}pt`
    if (firstLine > 0) s.textIndent = `${firstLine}pt`
  }
  if (rightIndent) s.paddingRight = `${rightIndent}pt`
  return s
}

// Build a name→style lookup from the doc.sty array
function buildStylesMap(sty = []) {
  const map = {}
  for (const s of sty) {
    if (s.n) map[s.n] = s
  }
  return map
}

// Merge char formats: later args win over earlier (left = base, right = override)
function mergeCharFmt(...fmts) {
  return Object.assign({}, ...fmts)
}

// Resolve the full inherited cf for a named style, walking up the base chain.
// e.g. "Heading 2" → base "Normal" → merge(Normal.cf, Heading2.cf)
function resolveStyleCf(styleName, stylesMap) {
  const chain = []
  const visited = new Set()
  let current = styleName
  while (current && !visited.has(current)) {
    visited.add(current)
    const sty = stylesMap[current]
    if (!sty) break
    chain.unshift(sty.cf || {})            // parent before child
    current = sty.b || sty.basedOn || null // climb up
  }
  return mergeCharFmt(...chain)
}

// Replace all blank markers in a text string
function applyValues(text, blanks, values) {
  if (!blanks || !text) return text
  let result = text
  for (const b of blanks) {
    const val = values[b.id]
    const placeholder = `[${b.name || `Champ ${b.id + 1}`}]`
    result = result.split(b.marker).join(val && val !== '' ? val : placeholder)
  }
  return result
}

function renderInlines(inlines, blanks, values, baseCf = {}) {
  if (!inlines || inlines.length === 0) return '\u00a0' // non-breaking space for empty lines

  // Join all texts to detect cross-run markers
  // Optimized SFDT uses 'tlp' for text; non-optimized uses 'text'
  const getText = r => r.tlp ?? r.text ?? ''
  // Full cascade: baseCf (doc+style+block) merged with run's own cf
  const getCf = r => mergeCharFmt(baseCf, r.cf || r.characterFormat || {})
  const fullText = inlines.map(getText).join('')
  const replaced = applyValues(fullText, blanks, values)

  // No marker in this paragraph — render runs individually with full styles
  if (replaced === fullText) {
    return inlines.map((inline, i) => {
      const text = getText(inline)
      if (!text) return null
      const style = buildCharStyle(getCf(inline))
      return Object.keys(style).length
        ? <span key={i} style={style}>{text}</span>
        : <React.Fragment key={i}>{text}</React.Fragment>
    })
  }

  // Marker found & replaced → re-split on placeholder markers to style them
  const dominantRun = inlines.find(r => getText(r).length > 1) || {}
  const baseStyle = buildCharStyle(getCf(dominantRun))

  // Split replaced text on placeholder pattern to highlight unfilled fields
  const parts = replaced.split(/(\[[^\]]+\])/)
  return parts.map((part, i) => {
    const isPlaceholder = /^\[[^\]]+\]$/.test(part)
    if (isPlaceholder) {
      return (
        <span key={i} style={{
          ...baseStyle,
          backgroundColor: '#fef9c3',
          color: '#b45309',
          borderRadius: '3px',
          padding: '0 2px',
          fontStyle: 'italic',
        }}>{part}</span>
      )
    }
    return Object.keys(baseStyle).length
      ? <span key={i} style={baseStyle}>{part}</span>
      : <React.Fragment key={i}>{part}</React.Fragment>
  })
}

// ctx = { stylesMap, docCf }  — passed down through all render functions
function renderParagraph(block, key, blanks, values, ctx) {
  const { stylesMap = {}, docCf = {} } = ctx || {}
  const pf = block.pf || block.paragraphFormat || {}
  const styleName = pf.stn || pf.styleName || ''

  // Cascade complète en 3 étapes :
  const styleCf = resolveStyleCf(styleName, stylesMap)   // "Heading 2" → "Normal" → merge
  const blockCf = block.cf || block.characterFormat || {} // format propre au bloc
  const baseCf  = mergeCharFmt(docCf, styleCf, blockCf)  // doc + style + bloc = base finale

  const style = buildParaStyle(pf)
  return (
    <p key={key} style={{ margin: 0, padding: 0, ...style }}>
      {renderInlines(block.i || block.inlines || [], blanks, values, baseCf)}
    </p>
  )
}

function renderCell(cell, key, blanks, values, ctx) {
  return (
    <td key={key} style={{ border: '1px solid #d1d5db', padding: '4pt 6pt', verticalAlign: 'top' }}>
      {(cell.b || cell.blocks || []).map((b, i) => renderParagraph(b, i, blanks, values, ctx))}
    </td>
  )
}

function renderTable(table, key, blanks, values, ctx) {
  return (
    <table key={key} style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12pt', tableLayout: 'fixed' }}>
      <tbody>
        {(table.r || table.rows || []).map((row, ri) => (
          <tr key={ri}>
            {(row.c || row.cells || []).map((cell, ci) => renderCell(cell, ci, blanks, values, ctx))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SfdtPreview({ sfdtStr, blanks, values, onDownload, downloading, masked }) {
  return useMemo(() => {
    if (!sfdtStr) return <p style={{ color: '#9ca3af', padding: '24px' }}>Chargement...</p>

    let doc
    try {
      let parsed = JSON.parse(sfdtStr)

      // Case 1: double-stringified → parse again
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed)
      }

      // Case 2: still compressed wrapper {sfdt: "base64..."} → try inner JSON
      if (parsed.sfdt && typeof parsed.sfdt === 'string' && !parsed.sections) {
        try { parsed = JSON.parse(parsed.sfdt) } catch { /* not JSON, can't decompress here */ }
      }

      doc = parsed
    } catch {
      return <p style={{ color: '#ef4444', padding: '24px' }}>Erreur de lecture du document.</p>
    }

    // Support both optimized ('sec') and standard ('sections') SFDT
    const sections = doc.sec || doc.sections || []
    if (sections.length === 0) {
      return (
        <div style={{ padding: '40px', color: '#6b7280', textAlign: 'center' }}>
          <p>⚠️ Aucune section trouvée dans le document.</p>
        </div>
      )
    }

    // Section margins: optimized uses 'secpr.lm/rm/tm/bm', standard uses 'sectionFormat.leftMargin/...'
    const secpr = sections[0].secpr || sections[0].sectionFormat || {}
    const ml = secpr.lm ?? secpr.leftMargin ?? 63.75
    const mr = secpr.rm ?? secpr.rightMargin ?? 63.75
    const mt = secpr.tm ?? secpr.topMargin ?? 66
    const mb_ = secpr.bm ?? secpr.bottomMargin ?? 61

    // Build styles map from doc.sty (optimized) or doc.styles (standard)
    const stylesMap = buildStylesMap(doc.sty || doc.styles || [])

    // doc.cf = document-level default character format (font, size, etc.)
    const docCf = doc.cf || doc.characterFormat || {}

    // ctx carries the shared render context passed to all render functions
    const ctx = { stylesMap, docCf }

    // Optimized uses 'b' for blocks, standard uses 'blocks'
    const allBlocks = sections.flatMap(s => s.b || s.blocks || [])

    // Extract base font/size from docCf for the container
    const baseFontFamily = docCf.ff || docCf.fontFamily || 'Calibri, Arial, sans-serif'
    const baseFontSize   = docCf.fsz || docCf.fontSize   || 11

    // Split blocks: first 35% visible, rest masked
    const cutoff = Math.max(3, Math.ceil(allBlocks.length * 0.35))
    const visibleBlocks = allBlocks.slice(0, cutoff)
    const maskedBlocks  = allBlocks.slice(cutoff)

    const containerStyle = {
      padding: `${mt}pt ${mr}pt ${mb_}pt ${ml}pt`,
      fontFamily: baseFontFamily,
      fontSize: `${baseFontSize}pt`,
      color: '#111827',
    }

    const renderBlock = (block, i) =>
      (block.r || block.rows)
        ? renderTable(block, i, blanks, values, ctx)
        : renderParagraph(block, i, blanks, values, ctx)

    // If not masked (logged-in user), render everything normally
    if (!masked) {
      return (
        <div style={containerStyle}>
          {allBlocks.map(renderBlock)}
        </div>
      )
    }

    return (
      <div style={containerStyle}>
        {/* Visible portion */}
        <div style={{ userSelect: 'none' }}
          onCopy={e => e.preventDefault()}
          onContextMenu={e => e.preventDefault()}
        >
          {visibleBlocks.map(renderBlock)}
        </div>

        {/* Masked portion */}
        {maskedBlocks.length > 0 && (
          <div style={{ position: 'relative' }}>
            {/* Gradient fade at the top of masked zone */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: '80px', zIndex: 2,
              background: 'linear-gradient(to bottom, white 0%, transparent 100%)',
              pointerEvents: 'none',
            }} />

            {/* Blurred content */}
            <div style={{
              filter: 'blur(5px)',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
              onCopy={e => e.preventDefault()}
            >
              {maskedBlocks.map((block, i) => renderBlock(block, cutoff + i))}
            </div>

            {/* Overlay CTA */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 3,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.85) 30%, rgba(255,255,255,0.97) 100%)',
            }}>
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '14px',
                padding: '28px 32px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                textAlign: 'center',
                maxWidth: '340px',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔒</div>
                <p style={{ margin: '0 0 6px', fontWeight: '700', fontSize: '15px', color: '#226d68' }}>
                  Aperçu limité
                </p>
                <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#6b7280', lineHeight: '1.5' }}>
                  Remplissez les champs et téléchargez le document complet.
                </p>
                <button
                  onClick={onDownload}
                  disabled={downloading}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: downloading ? '#9ca3af' : '#226d68',
                    color: 'white', border: 'none', borderRadius: '8px',
                    fontWeight: '700', fontSize: '14px',
                    cursor: downloading ? 'default' : 'pointer',
                    width: '100%',
                  }}
                >
                  {downloading ? '⏳ Export en cours...' : '⬇️ Télécharger le document complet'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }, [sfdtStr, blanks, values, onDownload, downloading, masked])
}

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────

export default function Fill() {
  const router = useRouter()
  const { id } = router.query

  const [template, setTemplate] = useState(null)
  const [values, setValues] = useState({})
  const [sfdt, setSfdt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Check auth — logged-in users see the full document
  useEffect(() => {
    fetch(`${API}/api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setIsLoggedIn(!!(data?.id || data?.email)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    fetch(`${API}/api/templates/${id}`)
      .then(r => { if (!r.ok) throw new Error('Modèle introuvable'); return r.json() })
      .then(data => {
        setTemplate(data)
        setSfdt(data.sfdt)
        const initial = {}
        data.blanks.forEach(b => { initial[b.id] = '' })
        setValues(initial)
        setLoading(false)
      })
      .catch(err => { alert('Erreur: ' + err.message); router.push('/') })
  }, [id])

  const handleValueChange = useCallback((blankId, val) => {
    setValues(prev => ({ ...prev, [blankId]: val }))
  }, [])

  const handleDownload = async () => {
    if (!sfdt || !template) return
    setDownloading(true)
    try {
      let filledSfdt = sfdt
      template.blanks.forEach(b => {
        const val = values[b.id]
        filledSfdt = filledSfdt.split(b.marker).join(val && val !== '' ? val : '')
      })
      const res = await fetch(`${API}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sfdt: filledSfdt, fileName: template.fileName }),
      })
      if (!res.ok) { alert('Erreur téléchargement: ' + await res.text()); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (template.fileName || 'document').replace(/\.docx$/i, '') + '_rempli.docx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) { alert('Erreur: ' + err.message) }
    finally { setDownloading(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: "'Segoe UI', sans-serif", color: '#6b7280' }}>
      ⏳ Chargement du document...
    </div>
  )

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI', sans-serif" }}>
      <Navbar />

      {/* Sub-header */}
      <div style={{ padding: '10px 20px', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#226d68', flex: 1 }}>✏️ {template?.name}</h2>
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            padding: '8px 20px',
            backgroundColor: downloading ? '#9ca3af' : '#226d68',
            color: 'white', border: 'none', borderRadius: '6px',
            cursor: downloading ? 'default' : 'pointer',
            fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap',
          }}
        >
          {downloading ? '⏳ Export...' : '⬇️ Télécharger DOCX'}
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left panel: form */}
        <div style={{ width: '340px', borderRight: '1px solid #e5e7eb', overflowY: 'auto', padding: '28px 24px 32px', backgroundColor: '#f8f7f3' }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px', fontSize: '16px', color: '#226d68', fontWeight: '700' }}>📋 Remplir les champs</h3>
          {template?.blanks.map(blank => (
            <div key={blank.id} style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', fontSize: '14px', color: '#226d68' }}>
                {blank.name || `Champ ${blank.id + 1}`}
              </label>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '7px', lineHeight: '1.5' }}>
                <span>...{blank.contextBefore}</span>
                <span style={{ color: '#b45309', fontWeight: '700' }}> [_____] </span>
                <span>{blank.contextAfter}...</span>
              </div>
              <input
                type="text"
                placeholder={`Entrer ${blank.name || 'la valeur'}...`}
                value={values[blank.id] || ''}
                onChange={e => handleValueChange(blank.id, e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none', backgroundColor: 'white' }}
              />
            </div>
          ))}
        </div>

        {/* Right panel: live A4 preview */}
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#e5e7eb', padding: '32px 24px' }}>
          <div style={{
            maxWidth: '794px',
            margin: '0 auto',
            backgroundColor: 'white',
            boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
            borderRadius: '2px',
            minHeight: '1122px',
          }}>
            <SfdtPreview sfdtStr={sfdt} blanks={template?.blanks} values={values} onDownload={handleDownload} downloading={downloading} masked={!isLoggedIn} />
          </div>
        </div>

      </div>
    </div>
  )
}
