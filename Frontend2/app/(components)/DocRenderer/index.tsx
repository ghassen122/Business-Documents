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

import React, { useMemo } from 'react'

// ─── Style builders (mirrors renderer.js) ────────────────────────────────────
function buildParaStyle(pPr: any, listIndent: any): React.CSSProperties {
  const css: React.CSSProperties = {}
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

  const borderMap: Record<string, string> = {
    single: 'solid', thick: 'solid', double: 'double', dotted: 'dotted', dashed: 'dashed',
  }
  if (pPr?.borders?.top) {
    const { width = 1, style = 'single', color = '#000000' } = pPr.borders.top
    css.borderTop = `${width}px ${borderMap[style] || 'solid'} ${color}`
    css.paddingTop = ((parseFloat(String(css.paddingTop || 0)) || 0) + 2) + 'px'
  }
  if (pPr?.borders?.bottom) {
    const { width = 1, style = 'single', color = '#000000' } = pPr.borders.bottom
    css.borderBottom = `${width}px ${borderMap[style] || 'solid'} ${color}`
    css.paddingBottom = ((parseFloat(String(css.paddingBottom || 0)) || 0) + 2) + 'px'
  }
  if (pPr?.borders?.left) {
    const { width = 1, style = 'single', color = '#000000' } = pPr.borders.left
    css.borderLeft = `${width}px ${borderMap[style] || 'solid'} ${color}`
  }
  if (pPr?.borders?.right) {
    const { width = 1, style = 'single', color = '#000000' } = pPr.borders.right
    css.borderRight = `${width}px ${borderMap[style] || 'solid'} ${color}`
  }
  return css
}

function buildRunStyle(rPr: any): React.CSSProperties {
  const css: React.CSSProperties = {}
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

function isDocumentTitleStyle(styleId: string): boolean {
  // Only the top-level document title (Title / Titre), NOT section headings (Titre1, Heading1…)
  return /^(title|titre)$/i.test(styleId)
}

function isSectionHeadingStyle(styleId: string): boolean {
  return /^(titre[1-9]|heading[1-9])$/i.test(styleId)
}

// ─── Token rendering ─────────────────────────────────────────────────────────
function resolveCivTokens(text: string, civs: any[], civValues: Record<string, string>): string {
  if (!text || !civs?.length) return text
  return text.replace(/\{\{CIV_(\d+)\}\}/g, (_match, id) => {
    const civ = civs.find((c: any) => String(c.id) === id)
    if (!civ) return _match
    return (civValues && civValues[String(civ.intervenantIndex)]) || civ.match || ''
  })
}

function renderTextWithBlankTokens(text, blanks, values, style, civs?, civValues?) {
  if (!text) return null
  // Pre-resolve CIV tokens (they render as plain text, no UI markup needed)
  const resolvedText = resolveCivTokens(text, civs, civValues)

  const tokenRe = /\{\{BLANK_(\d+)\}\}/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRe.exec(resolvedText)) !== null) {
    if (match.index > lastIndex) {
      const staticText = resolvedText.slice(lastIndex, match.index)
      parts.push(
        Object.keys(style).length
          ? <span key={`text-${match.index}`} style={style}>{staticText}</span>
          : <React.Fragment key={`text-${match.index}`}>{staticText}</React.Fragment>
      )
    }

    const blankId = Number(match[1])
    const blank = blanks?.find((item: any) => item.id === blankId)
    const value = values?.[String(blankId)]
    const hasValue = typeof value === 'string' && value.trim() !== ''
    const label = hasValue ? value : `[${blank?.name || `Champ ${blankId + 1}`}]`

    parts.push(
      <span
        key={`blank-${blankId}-${match.index}`}
        style={{
          ...style,
          position: 'relative',
          zIndex: 2,
          display: 'inline-block',
          padding: '0 2px',
          borderRadius: '3px',
          backgroundColor: hasValue ? '#ffffff' : '#fef9c3',
          color: hasValue ? '#111827' : '#b45309',
          boxShadow: hasValue ? '0 0 0 1px rgba(17,24,39,0.14)' : '0 0 0 1px rgba(180,83,9,0.14)',
          // Don't inherit bold/italic from the run when the user typed a plain value
          fontWeight: hasValue ? 'normal' : style.fontWeight,
          fontStyle: hasValue ? 'normal' : 'italic',
        }}
      >
        {label}
      </span>
    )

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < resolvedText.length) {
    const staticText = resolvedText.slice(lastIndex)
    parts.push(
      Object.keys(style).length
        ? <span key={`text-tail-${lastIndex}`} style={style}>{staticText}</span>
        : <React.Fragment key={`text-tail-${lastIndex}`}>{staticText}</React.Fragment>
    )
  }

  if (parts.length === 0) {
    return Object.keys(style).length
      ? <span style={style}>{resolvedText}</span>
      : <>{resolvedText}</>
  }

  return <>{parts}</>
}

// ─── Run component ────────────────────────────────────────────────────────────
function RunEl({ run, hyperlinks, blanks, values, civs, civValues }) {
  if (run.isBreak) return <br />
  if (run.isTab) return null

  const rawText = run.text || ''
  const style = buildRunStyle(run)

  const renderContent = () => {
    return renderTextWithBlankTokens(rawText, blanks, values, style, civs, civValues)
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

function renderRunSequence(runs, hyperlinks, blanks, values, civs?, civValues?) {
  return (runs || []).map((run, i) =>
    run.isBreak
      ? <br key={i} />
      : <RunEl key={i} run={run} hyperlinks={hyperlinks} blanks={blanks} values={values} civs={civs} civValues={civValues} />
  )
}

function splitRunsOnTabs(runs) {
  const segments = []
  let current = []
  for (const run of (runs || [])) {
    if (run.isTab) {
      segments.push(current)
      current = []
      continue
    }
    current.push(run)
  }
  segments.push(current)
  return segments.filter(segment => segment.length > 0)
}

function hasVisibleParagraphContent(block) {
  if (!block || block.type !== 'paragraph') return true
  if (block?.pPr?.floatingRules?.length) return true
  return (block.runs || []).some((run: any) => (run.text || '').trim() !== '' || run.isBreak)
}

// ─── Paragraph component ──────────────────────────────────────────────────────
function ParaEl({ block, hyperlinks, blanks, values, civs, civValues }) {
  const { styleId, pPr, runs, listLabel, listIndent, pageBreakBefore, sectionBreak } = block
  const isDocTitle     = isDocumentTitleStyle(styleId || '')   // Title / Titre → force center

  const paraStyle: React.CSSProperties = {
    ...buildParaStyle(pPr, listIndent),
    ...(isDocTitle
      ? {
          paddingLeft: 0,
          paddingRight: 0,
          textIndent: 0,
          textAlign: 'center',
          width: '100%',
          marginLeft: 0,
          marginRight: 0,
        }
      : null),
  }
  const needsBreak = pageBreakBefore || (sectionBreak && sectionBreak !== 'continuous')
  const breakStyle: React.CSSProperties = needsBreak ? { marginTop: '120px', breakBefore: 'page', pageBreakBefore: 'always' } : {}
  const floatingRules = pPr?.floatingRules || []

  const allText = (runs || []).map(r => r.text || '').join('')
  const tabSegments = splitRunsOnTabs(runs || [])
  const hasTabs = tabSegments.length > 1

  const renderRuns = () => renderRunSequence(runs || [], hyperlinks, blanks, values, civs, civValues)

  if (floatingRules.length > 0 && !allText.trim()) {
    const minTop = floatingRules.reduce((min, rule) => Math.min(min, rule.topPx || 0), Number.POSITIVE_INFINITY)
    const normalizedTop = Number.isFinite(minTop) ? minTop : 0
    const ruleHeight = floatingRules.reduce((max, rule) => Math.max(max, ((rule.topPx || 0) - normalizedTop) + (rule.thicknessPx || 1)), 0)
    const contentLeft = Number(block?.layoutMarginLeft || 0)
    return (
      <div style={{ position: 'relative', margin: 0, padding: 0, minHeight: `${Math.max(ruleHeight + 4, 12)}px`, ...paraStyle, ...breakStyle }}>
        {floatingRules.map((rule, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: `${Math.max(0, (rule.leftPx || 0) - contentLeft)}px`,
              top: `${Math.max(0, (rule.topPx || 0) - normalizedTop)}px`,
              width: `${rule.widthPx || 0}px`,
              height: `${Math.max(1, rule.thicknessPx || 1)}px`,
              background: rule.color || '#000000',
            }}
          />
        ))}
      </div>
    )
  }

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

  if (hasTabs) {
    return (
      <p style={{ margin: 0, padding: 0, ...paraStyle, ...breakStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '32px' }}>
        {tabSegments.map((segment, index) => (
          <span key={index} style={{ flex: 1, minWidth: 0 }}>
            {renderRunSequence(segment, hyperlinks, blanks, values, civs, civValues)}
          </span>
        ))}
      </p>
    )
  }

  return (
    <p style={{ margin: 0, padding: 0, ...paraStyle, ...breakStyle }}>
      {renderRuns()}
    </p>
  )
}

// ─── Table component ──────────────────────────────────────────────────────────
function TableEl({ block, hyperlinks, blanks, values, civs, civValues }) {
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
                    ? <ParaEl key={bi} block={blk} hyperlinks={hyperlinks} blanks={blanks} values={values} civs={civs} civValues={civValues} />
                    : <TableEl key={bi} block={blk} hyperlinks={hyperlinks} blanks={blanks} values={values} civs={civs} civValues={civValues} />
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function hasForcedPageBreak(block: any) {
  return !!(block?.pageBreakBefore || (block?.sectionBreak && block.sectionBreak !== 'continuous'))
}

function stripPageBreak(block: any) {
  return { ...block, pageBreakBefore: false, sectionBreak: undefined }
}

function BlockEl({ block, hyperlinks, blanks, values, civs, civValues, layoutMarginLeft }) {
  const nextBlock = layoutMarginLeft != null ? { ...block, layoutMarginLeft } : block
  return block.type === 'paragraph'
    ? <ParaEl block={nextBlock} hyperlinks={hyperlinks} blanks={blanks} values={values} civs={civs} civValues={civValues} />
    : <TableEl block={nextBlock} hyperlinks={hyperlinks} blanks={blanks} values={values} civs={civs} civValues={civValues} />
}

// ─── Split blocks into logical pages ─────────────────────────────────────────
function splitIntoPages(blocks: any[], heights: number[], maxContentHeight: number): any[][] {
  const pages: any[][] = []
  let current: any[] = []
  let currentHeight = 0
  let justFlushed = false   // prevents double-flush when sectionBreak + pageBreakBefore are consecutive

  const flush = () => {
    if (current.length > 0) {
      pages.push(current)
      current = []
      currentHeight = 0
    }
    justFlushed = true
  }

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]
    const blockHeight = heights[index] || 0
    const visibleContent = hasVisibleParagraphContent(block)

    // w:sectPr nextPage/evenPage/oddPage — DOCX section boundary.
    // If the paragraph is empty, it is just a section marker. If it has visible
    // content, render it first, then break after it because sectPr ends AFTER
    // this paragraph in WordprocessingML.
    if (block.sectionBreak && block.sectionBreak !== 'continuous') {
      if (!visibleContent) {
        flush()
        continue
      }
      if (current.length > 0 && currentHeight + blockHeight > maxContentHeight) {
        flush()
        justFlushed = false
      }
      current.push(stripPageBreak(block))
      currentHeight += blockHeight
      flush()
      continue
    }

    // pageBreakBefore (from w:lastRenderedPageBreak or explicit w:br type=page)
    // Skip if we already flushed just above to avoid creating an empty page.
    if (block.pageBreakBefore && !justFlushed) {
      flush()
      if (!visibleContent) {
        justFlushed = false
        continue
      }
    }
    justFlushed = false

    // Overflow-based automatic break
    if (current.length > 0 && currentHeight + blockHeight > maxContentHeight) {
      flush()
      justFlushed = false
    }

    current.push(stripPageBreak(block))
    currentHeight += blockHeight
  }

  flush()
  return pages.length > 0 ? pages : [[]]
}

// ─── Main DocRenderer export ──────────────────────────────────────────────────
export default function DocRenderer({ data, blanks, values, civs, civValues }) {
  if (!data) return null
  const { layout, blocks, hyperlinks } = data

  const pageW   = layout?.pageWidth  ? layout.pageWidth  + 'px' : '794px'
  const ptop    = (layout?.marginTop    || 96) + 'px'
  const pright  = (layout?.marginRight  || 96) + 'px'
  const pbottom = (layout?.marginBottom || 96) + 'px'
  const pleft   = (layout?.marginLeft   || 96) + 'px'

  const containerStyle: React.CSSProperties = {
    width:           pageW,
    paddingTop:      ptop,
    paddingRight:    pright,
    paddingBottom:   pbottom,
    paddingLeft:     pleft,
    backgroundColor: 'white',
    boxShadow:       '0 4px 24px rgba(0,0,0,0.10)',
    boxSizing:       'border-box',
    fontFamily:      "'Calibri', 'Arial', sans-serif",
    fontSize:        '11pt',
    lineHeight:      '1.15',
    color:           '#111827',
  }

  return (
    <div style={containerStyle}>
      {(blocks || []).map((block, index) => (
        <BlockEl key={index} block={block} hyperlinks={hyperlinks} blanks={blanks} values={values} civs={civs} civValues={civValues} layoutMarginLeft={layout?.marginLeft || 96} />
      ))}
    </div>
  )
}
