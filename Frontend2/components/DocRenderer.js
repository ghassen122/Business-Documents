/**
 * DocRenderer.js
 * React component that renders docx-viewer parsed blocks (XML parser output).
 * Ported from docx-viewer/public/renderer.js — no Syncfusion, no vanilla DOM.
 *
 * Props:
 *   data    — { layout, blocks, hyperlinks }  from GET /api/templates/:id
 *   blanks  — array of blank descriptors from the template
 *   values  — { "0": "value0", "1": "value1", ... }  current field values
 */

import React from 'react'

// ─── Style builders (mirrors renderer.js) ────────────────────────────────────
function buildParaStyle(pPr, listIndent) {
  const css = {}
  const jcMap = { center: 'center', right: 'right', both: 'justify', left: 'left', end: 'right', start: 'left' }
  if (pPr && pPr.align) css.textAlign = jcMap[pPr.align] || pPr.align

  if (!listIndent && pPr && pPr.indent) {
    const { left = 0, right = 0, firstLine = 0 } = pPr.indent
    if (firstLine < 0) {
      css.paddingLeft = (left + Math.abs(firstLine)) + 'px'
      css.textIndent  = firstLine + 'px'
    } else {
      css.paddingLeft  = left  + 'px'
      css.paddingRight = right + 'px'
      if (firstLine > 0) css.textIndent = firstLine + 'px'
    }
  }

  if (pPr && pPr.spacing) {
    const { before = 0, after = 0, line, lineRule } = pPr.spacing
    if (before > 0) css.marginTop    = before + 'px'
    if (after  > 0) css.marginBottom = after  + 'px'
    if (line) {
      if (lineRule === 'exact' || lineRule === 'atLeast') {
        css.lineHeight = Math.round(line / 20) + 'pt'
      } else {
        css.lineHeight = (line / 240).toFixed(2)
      }
    }
  }
  return css
}

function buildRunStyle(rPr) {
  const css = {}
  if (!rPr) return css
  if (rPr.font)     css.fontFamily   = `'${rPr.font}', sans-serif`
  if (rPr.fontSize) css.fontSize     = rPr.fontSize + 'pt'
  if (rPr.bold)     css.fontWeight   = 'bold'
  if (rPr.italic)   css.fontStyle    = 'italic'
  if (rPr.color)    css.color        = rPr.color
  if (rPr.highlight) {
    const hlMap = {
      yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff',
      blue: '#0000ff', red: '#ff0000', darkBlue: '#000080', darkCyan: '#008080',
      darkGreen: '#008000', darkMagenta: '#800080', darkRed: '#800000',
      darkYellow: '#808000', darkGray: '#808080', lightGray: '#c0c0c0',
    }
    css.backgroundColor = hlMap[rPr.highlight] || rPr.highlight
  }
  if (rPr.underline && rPr.underline !== 'none') css.textDecoration = 'underline'
  if (rPr.strike) css.textDecoration = (css.textDecoration ? css.textDecoration + ' ' : '') + 'line-through'
  if (rPr.vertAlign === 'superscript') css.verticalAlign = 'super'
  if (rPr.vertAlign === 'subscript')   css.verticalAlign = 'sub'
  return css
}

// ─── Token substitution ───────────────────────────────────────────────────────
function applyValues(text, blanks, values) {
  if (!blanks || !values || !text) return text
  let result = text
  for (const b of blanks) {
    const token = `{{BLANK_${b.id}}}`
    if (!result.includes(token)) continue
    const val = values[String(b.id)]
    const placeholder = `[${b.name || `Champ ${b.id + 1}`}]`
    result = result.split(token).join(val && val !== '' ? val : placeholder)
  }
  return result
}

// ─── Run component ────────────────────────────────────────────────────────────
function RunEl({ run, hyperlinks, blanks, values }) {
  if (run.isBreak) return <br />

  const rawText = run.text || ''
  const text = applyValues(rawText, blanks, values)
  const style = buildRunStyle(run)

  // Highlight unfilled placeholder tokens [Field name]
  const parts = text.split(/(\[[^\]]*\])/)
  const hasPlaceholders = parts.length > 1

  const renderContent = () => {
    if (!hasPlaceholders) {
      return Object.keys(style).length
        ? <span style={style}>{text}</span>
        : <>{text}</>
    }
    return (
      <>
        {parts.map((part, i) => {
          const isPlaceholder = /^\[[^\]]*\]$/.test(part) && part !== '[]'
          if (isPlaceholder) {
            return (
              <span key={i} style={{
                ...style,
                backgroundColor: '#fef9c3',
                color: '#b45309',
                borderRadius: '3px',
                padding: '0 2px',
                fontStyle: 'italic',
              }}>{part}</span>
            )
          }
          return Object.keys(style).length
            ? <span key={i} style={style}>{part}</span>
            : <React.Fragment key={i}>{part}</React.Fragment>
        })}
      </>
    )
  }

  if (run.hyperlink && hyperlinks) {
    const href = hyperlinks[run.hyperlink] || run.hyperlink
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
        style={{ color: run.color || '#0563c1' }}>
        {renderContent()}
      </a>
    )
  }
  return renderContent()
}

// ─── Paragraph component ──────────────────────────────────────────────────────
function ParaEl({ block, hyperlinks, blanks, values }) {
  const { pPr, runs, listLabel, listIndent, pageBreakBefore, sectionBreak } = block
  const paraStyle = buildParaStyle(pPr, listIndent)
  const needsBreak = pageBreakBefore || (sectionBreak && sectionBreak !== 'continuous')
  const breakStyle = needsBreak ? { marginTop: '120px', breakBefore: 'page', pageBreakBefore: 'always' } : {}

  const allText = (runs || []).map(r => r.text || '').join('')

  const renderRuns = () =>
    (runs || []).map((run, i) =>
      run.isBreak
        ? <br key={i} />
        : <RunEl key={i} run={run} hyperlinks={hyperlinks} blanks={blanks} values={values} />
    )

  // Empty paragraph (spacer / line break)
  if (!allText.trim() && !(runs || []).some(r => r.isBreak)) {
    return (
      <p style={{ margin: 0, padding: 0, minHeight: '1em', ...paraStyle, ...breakStyle }} />
    )
  }

  // List item
  if (listLabel !== null) {
    const indLeft = listIndent ? listIndent.left : (pPr?.indent?.left || 0)
    const hanging = listIndent ? Math.abs(listIndent.firstLine || 0) : 0
    return (
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        margin: 0, padding: 0,
        paddingLeft: indLeft + 'px',
        textIndent: '0',
        ...paraStyle,
        paddingLeft: indLeft + 'px',
        textIndent: '0',
        ...breakStyle,
      }}>
        <span style={{
          minWidth: (hanging || 18) + 'px',
          marginLeft: '-' + (hanging || 18) + 'px',
          flexShrink: 0,
        }}>
          {listLabel}
        </span>
        <span>{renderRuns()}</span>
      </div>
    )
  }

  return (
    <p style={{ margin: 0, padding: 0, ...paraStyle, ...breakStyle }}>
      {renderRuns()}
    </p>
  )
}

// ─── Table component ──────────────────────────────────────────────────────────
function TableEl({ block, hyperlinks, blanks, values }) {
  const totalW = (block.colWidths || []).reduce((s, w) => s + w, 0) || 1
  return (
    <table style={{
      width: '100%', borderCollapse: 'collapse',
      marginBottom: '12pt', tableLayout: 'fixed',
    }}>
      <colgroup>
        {(block.colWidths || []).map((w, i) => (
          <col key={i} style={{ width: Math.round((w / totalW) * 100) + '%' }} />
        ))}
      </colgroup>
      <tbody>
        {(block.rows || []).map((row, ri) => (
          <tr key={ri}>
            {(row.cells || []).map((cell, ci) => (
              <td
                key={ci}
                colSpan={cell.gridSpan > 1 ? cell.gridSpan : undefined}
                style={{ border: '1px solid #d1d5db', padding: '4pt 6pt', verticalAlign: 'top' }}
              >
                {(cell.blocks || []).map((blk, bi) =>
                  blk.type === 'paragraph'
                    ? <ParaEl key={bi} block={blk} hyperlinks={hyperlinks} blanks={blanks} values={values} />
                    : <TableEl key={bi} block={blk} hyperlinks={hyperlinks} blanks={blanks} values={values} />
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Main DocRenderer export ──────────────────────────────────────────────────
export default function DocRenderer({ data, blanks, values }) {
  if (!data) return null
  const { layout, blocks, hyperlinks } = data

  const pageStyle = {
    width:         layout?.pageWidth  ? layout.pageWidth  + 'px' : '794px',
    minHeight:     layout?.pageHeight ? layout.pageHeight + 'px' : '1123px',
    paddingTop:    (layout?.marginTop    || 96) + 'px',
    paddingRight:  (layout?.marginRight  || 96) + 'px',
    paddingBottom: (layout?.marginBottom || 96) + 'px',
    paddingLeft:   (layout?.marginLeft   || 96) + 'px',
    backgroundColor: 'white',
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    boxSizing: 'border-box',
    fontFamily: "'Calibri', 'Arial', sans-serif",
    fontSize: '11pt',
    lineHeight: '1.15',
    color: '#111827',
  }

  return (
    <div style={pageStyle}>
      {(blocks || []).map((block, i) =>
        block.type === 'paragraph'
          ? <ParaEl   key={i} block={block} hyperlinks={hyperlinks} blanks={blanks} values={values} />
          : <TableEl  key={i} block={block} hyperlinks={hyperlinks} blanks={blanks} values={values} />
      )}
    </div>
  )
}
