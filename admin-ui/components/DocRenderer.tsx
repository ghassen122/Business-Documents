import React, { useMemo } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────
export interface RunBlock {
  text: string
  font?: string
  fontSize?: number
  fontSizeCs?: number
  charSpacing?: number
  bold?: boolean
  italic?: boolean
  color?: string
  highlight?: string
  underline?: string
  strike?: boolean
  vertAlign?: string
  isBreak: boolean
  isPageBreak: boolean
  isTab?: boolean
  hyperlink?: string
}

export interface Indent {
  left?: number
  right?: number
  firstLine?: number
  hanging?: number
}

export interface Spacing {
  before?: number
  after?: number
  line?: number
  lineRule?: string | null
}

export interface PPr {
  align?: string
  indent?: Indent
  spacing?: Spacing
  borders?: {
    top?: { style?: string; width?: number; color?: string }
    bottom?: { style?: string; width?: number; color?: string }
    left?: { style?: string; width?: number; color?: string }
    right?: { style?: string; width?: number; color?: string }
  }
  floatingRules?: Array<{
    leftPx?: number
    topPx?: number
    widthPx?: number
    thicknessPx?: number
    color?: string
  }>
}

export interface RPr {
  font?: string
  fontSize?: number
  charSpacing?: number
  bold?: boolean
  italic?: boolean
  color?: string
  underline?: string
  strike?: boolean
  vertAlign?: string
  highlight?: string
}

export interface ParagraphBlock {
  type: 'paragraph'
  styleId: string
  pPr: PPr
  rPr: RPr
  listLabel: string | null
  listIndent: { left?: number; firstLine?: number } | null
  pageBreakBefore: boolean
  sectionBreak: string | null
  runs: RunBlock[]
  _isFirstTitle?: boolean
}

export interface TableCell {
  gridSpan: number
  blocks: Block[]
}

export interface TableRow {
  cells: TableCell[]
}

export interface TableBlock {
  type: 'table'
  rows: TableRow[]
  colWidths: number[]
}

export type Block = ParagraphBlock | TableBlock

export interface Layout {
  pageWidth: number
  pageHeight: number
  marginTop: number
  marginRight: number
  marginBottom: number
  marginLeft: number
}

export interface BlankDef {
  id: number
  marker: string
  token: string
  placeholder: string    
  name: string
  contextBefore: string
  contextAfter: string
}

export interface ParsedDoc {
  layout: Layout
  blocks: Block[]
  hyperlinks: Record<string, string>
  blanks?: BlankDef[]
  civs?: any[]
}

// ── Helpers ────────────────────────────────────────────────────────────────
const jcMap: Record<string, string> = {
  center: 'center', right: 'right', both: 'justify',
  left: 'left', end: 'right', start: 'left',
}

function buildParaStyle(pPr: PPr): React.CSSProperties {
  const css: React.CSSProperties = {}
  if (pPr.align) css.textAlign = (jcMap[pPr.align] ?? pPr.align) as React.CSSProperties['textAlign']

  if (pPr.indent) {
    const { left = 0, right = 0, firstLine = 0 } = pPr.indent
    if (firstLine < 0) {
      css.paddingLeft = `${left + Math.abs(firstLine)}px`
      css.textIndent  = `${firstLine}px`
    } else {
      css.paddingLeft  = `${left}px`
      css.paddingRight = `${right}px`
      if (firstLine > 0) css.textIndent = `${firstLine}px`
    }
  }

  if (pPr.spacing) {
    const { before = 0, after = 0, line, lineRule } = pPr.spacing
    if (before > 0) css.marginTop    = `${before}px`
    if (after  > 0) css.marginBottom = `${after}px`
    if (line) {
      if (lineRule === 'exact' || lineRule === 'atLeast') {
        css.lineHeight = `${Math.round(line / 20)}pt`
      } else {
        css.lineHeight = (line / 240).toFixed(2)
      }
    }
  }

  const borderMap: Record<string, string> = {
    single: 'solid', thick: 'solid', double: 'double', dotted: 'dotted', dashed: 'dashed',
  }
  if (pPr.borders?.top) {
    const { width = 1, style = 'single', color = '#000000' } = pPr.borders.top
    css.borderTop = `${width}px ${borderMap[style] || 'solid'} ${color}`
    css.paddingTop = `${(parseFloat(String(css.paddingTop || 0)) || 0) + 2}px`
  }
  if (pPr.borders?.bottom) {
    const { width = 1, style = 'single', color = '#000000' } = pPr.borders.bottom
    css.borderBottom = `${width}px ${borderMap[style] || 'solid'} ${color}`
    css.paddingBottom = `${(parseFloat(String(css.paddingBottom || 0)) || 0) + 2}px`
  }
  if (pPr.borders?.left) {
    const { width = 1, style = 'single', color = '#000000' } = pPr.borders.left
    css.borderLeft = `${width}px ${borderMap[style] || 'solid'} ${color}`
  }
  if (pPr.borders?.right) {
    const { width = 1, style = 'single', color = '#000000' } = pPr.borders.right
    css.borderRight = `${width}px ${borderMap[style] || 'solid'} ${color}`
  }
  return css
}

function buildRunStyle(run: RunBlock): React.CSSProperties {
  const css: React.CSSProperties = {}
  if (run.font)      css.fontFamily    = `'${run.font}', sans-serif`
  if (run.fontSize)  css.fontSize      = `${run.fontSize}pt`
  if (run.charSpacing) css.letterSpacing = `${run.charSpacing}pt`
  if (run.bold)      css.fontWeight    = 'bold'
  if (run.italic)    css.fontStyle     = 'italic'
  if (run.color)     css.color         = run.color
  if (run.highlight) {
    const hlMap: Record<string, string> = {
      yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff',
      blue: '#0000ff',   red: '#ff0000',   darkBlue: '#000080', darkCyan: '#008080',
      darkGreen: '#008000', darkMagenta: '#800080', darkRed: '#800000',
      darkYellow: '#808000', darkGray: '#808080', lightGray: '#c0c0c0',
    }
    css.backgroundColor = hlMap[run.highlight] ?? run.highlight
  }
  if (run.underline && run.underline !== 'none') css.textDecoration = 'underline'
  if (run.strike) css.textDecoration = css.textDecoration ? `${css.textDecoration} line-through` : 'line-through'
  if (run.vertAlign === 'superscript') css.verticalAlign = 'super'
  if (run.vertAlign === 'subscript')   css.verticalAlign = 'sub'
  return css
}

function needsPageBreak(pageBreakBefore: boolean, sectionBreak: string | null): boolean {
  if (pageBreakBefore) return true
  if (!sectionBreak)   return false
  return sectionBreak !== 'continuous'
}

function isDocumentTitleStyle(styleId: string): boolean {
  // Only the top-level document title (Title / Titre), NOT section headings
  return /^(title|titre)$/i.test(styleId)
}

function isSectionHeadingStyle(styleId: string): boolean {
  return /^(titre[1-9]|heading[1-9])$/i.test(styleId)
}

// ── CIV token resolver ──────────────────────────────────────────────────────
function resolveCivTokens(
  text: string,
  civs: any[],
  civValues: Record<string, string>,
): string {
  if (!text || !civs?.length) return text
  return text.replace(/\{\{CIV_(\d+)\}\}/g, (_match, id) => {
    const civ = civs.find((c: any) => String(c.id) === id)
    if (!civ) return _match
    return (civValues && civValues[String(civ.intervenantIndex)]) || civ.match || ''
  })
}

// ── Token renderer: splits run text on {{BLANK_N}} and highlights them ──────
function renderTokensInText(
  text: string,
  blankNames: Record<number, string>,
  civs: any[],
  civValues: Record<string, string>,
): React.ReactNode[] {
  const resolvedText = resolveCivTokens(text, civs, civValues)
  const TOKEN_RE = /\{\{BLANK_(\d+)\}\}/g
  const parts: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(resolvedText)) !== null) {
    if (m.index > last) parts.push(resolvedText.slice(last, m.index))
    const id    = Number(m[1])
    const label = blankNames[id] ?? `Champ ${id + 1}`
    parts.push(
      <span
        key={`token-${id}-${m.index}`}
        title={m[0]}
        style={{
          display: 'inline-block',
          padding: '1px 6px',
          margin: '0 2px',
          borderRadius: '4px',
          border: '1.5px solid #f59e0b',
          backgroundColor: '#fef3c7',
          color: '#92400e',
          fontSize: '0.85em',
          fontWeight: 700,
          fontStyle: 'normal',
          verticalAlign: 'baseline',
          whiteSpace: 'nowrap',
        }}
      >
        [{label}]
      </span>
    )
    last = m.index + m[0].length
  }
  if (last < resolvedText.length) parts.push(resolvedText.slice(last))
  return parts
}

// ── Run ──────────────────────────────────────────────────────────────────────
function RunEl({
  run, hyperlinks, blankNames, civs, civValues,
}: {
  run: RunBlock
  hyperlinks: Record<string, string>
  blankNames: Record<number, string>
  civs: any[]
  civValues: Record<string, string>
}) {
  if (run.isTab) return null
  const isWhitespaceOnly = /^\s+$/.test(run.text)
  const style = buildRunStyle(run)
  if (isWhitespaceOnly) {
    delete style.letterSpacing
    style.whiteSpace = 'pre'
  }
  const content: React.ReactNode =
    isWhitespaceOnly
      ? run.text.replace(/ /g, '\u00A0')
      : Object.keys(blankNames).length > 0 || civs?.length > 0
      ? renderTokensInText(run.text, blankNames, civs, civValues)
      : run.text

  const span = <span style={style}>{content}</span>

  if (run.hyperlink) {
    const href = hyperlinks[run.hyperlink] ?? run.hyperlink
    return (
      <a href={href} target="_blank" rel="noreferrer"
        style={{ color: run.color ?? '#0563c1' }}>
        {span}
      </a>
    )
  }
  return span
}

function renderRunSequence(
  runs: RunBlock[],
  hyperlinks: Record<string, string>,
  blankNames: Record<number, string>,
  civs: any[] = [],
  civValues: Record<string, string> = {},
) {
  return (runs ?? []).map((run, i) =>
    run.isBreak
      ? <br key={i} />
      : <RunEl key={i} run={run} hyperlinks={hyperlinks} blankNames={blankNames} civs={civs} civValues={civValues} />
  )
}

function splitRunsOnTabs(runs: RunBlock[]) {
  const segments: RunBlock[][] = []
  let current: RunBlock[] = []
  for (const run of (runs ?? [])) {
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

// ── Paragraph ────────────────────────────────────────────────────────────────
function ParaEl({
  block, hyperlinks, blankNames, civs, civValues,
}: {
  block: ParagraphBlock
  hyperlinks: Record<string, string>
  blankNames: Record<number, string>
  civs: any[]
  civValues: Record<string, string>
}) {
  const { styleId, pPr, runs, listLabel, listIndent, pageBreakBefore, sectionBreak } = block
  const isDocTitle     = isDocumentTitleStyle(styleId)   // Title / Titre → force center

  const paraStyle: React.CSSProperties = {
    ...buildParaStyle(pPr),
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
  const pageBreak = needsPageBreak(pageBreakBefore, sectionBreak)
  const floatingRules = pPr?.floatingRules ?? []

        const allText = (runs ?? []).map(r => r.text).join('')
        
  const tabSegments = splitRunsOnTabs(runs ?? [])
  const hasTabs = tabSegments.length > 1
  const className = [
    'doc-para',
    !allText.trim() && !(runs ?? []).some(r => r.isBreak) ? 'empty-para' : '',
    pageBreak ? 'page-break-before' : '',
    listLabel ? 'doc-list-item' : '',
  ].filter(Boolean).join(' ')

  if (floatingRules.length > 0 && !allText.trim()) {
    const minTop = floatingRules.reduce((min, rule) => Math.min(min, rule.topPx || 0), Number.POSITIVE_INFINITY)
    const normalizedTop = Number.isFinite(minTop) ? minTop : 0
    const ruleHeight = floatingRules.reduce((max, rule) => Math.max(max, ((rule.topPx || 0) - normalizedTop) + (rule.thicknessPx || 1)), 0)
    const contentLeft = 96
    return (
      <div className={className} style={{ position: 'relative', minHeight: `${Math.max(ruleHeight + 4, 12)}px`, ...paraStyle }}>
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

  if (listLabel) {
    const indLeft   = listIndent?.left ?? pPr.indent?.left ?? 0
    const hanging   = Math.abs(listIndent?.firstLine ?? 0)
    const listStyle: React.CSSProperties = {
      ...paraStyle,
      paddingLeft : `${indLeft}px`,
      textIndent  : '0',
      display     : 'flex',
      alignItems  : 'baseline',
    }
    return (
      <div className={className} style={listStyle}>
        <span className="doc-list-bullet"
          style={{ minWidth: `${hanging || 18}px`, marginLeft: `-${hanging || 18}px` }}>
          {listLabel}
        </span>
        <span className="doc-list-text">
          {renderRunSequence(runs ?? [], hyperlinks, blankNames, civs, civValues)}
        </span>
      </div>
    )
  }

  if (hasTabs) {
    return (
      <p className={className} style={{ ...paraStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '32px' }}>
        {tabSegments.map((segment, index) => (
          <span key={index} style={{ flex: 1, minWidth: 0 }}>
            {renderRunSequence(segment, hyperlinks, blankNames, civs, civValues)}
          </span>
        ))}
      </p>
    )
  }

  return (
    <p className={className} style={paraStyle}>
      {renderRunSequence(runs ?? [], hyperlinks, blankNames, civs, civValues)}
    </p>
  )
}

// ── Table ────────────────────────────────────────────────────────────────────
function TableEl({
  block, hyperlinks, blankNames, civs, civValues,
}: {
  block: TableBlock
  hyperlinks: Record<string, string>
  blankNames: Record<number, string>
  civs: any[]
  civValues: Record<string, string>
}) {
  const totalW = (block.colWidths ?? []).reduce((s, w) => s + w, 0) || 1
  return (
    <table className="doc-table">
      <colgroup>
        {(block.colWidths ?? []).map((w, i) => (
          <col key={i} style={{ width: `${Math.round((w / totalW) * 100)}%` }} />
        ))}
      </colgroup>
      <tbody>
        {(block.rows ?? []).map((row, ri) => (
          <tr key={ri}>
            {(row.cells ?? []).map((cell, ci) => (
              <td key={ci} colSpan={cell.gridSpan > 1 ? cell.gridSpan : undefined}>
                {(cell.blocks ?? []).map((blk, bi) =>
                  blk.type === 'paragraph'
                    ? <ParaEl key={bi} block={blk} hyperlinks={hyperlinks} blankNames={blankNames} civs={civs} civValues={civValues} />
                    : <TableEl key={bi} block={blk} hyperlinks={hyperlinks} blankNames={blankNames} civs={civs} civValues={civValues} />
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function hasForcedPageBreak(block: ParagraphBlock | TableBlock) {
  return !!((block as ParagraphBlock)?.pageBreakBefore || ((block as ParagraphBlock)?.sectionBreak && (block as ParagraphBlock).sectionBreak !== 'continuous'))
}

function stripPageBreak(block: ParagraphBlock | TableBlock) {
  if (block.type !== 'paragraph') return block
  return { ...block, pageBreakBefore: false, sectionBreak: null }
}

function hasVisibleParagraphContent(block: ParagraphBlock | TableBlock) {
  if (block.type !== 'paragraph') return true
  if (block?.pPr?.floatingRules?.length) return true
  return (block.runs || []).some(run => (run.text || '').trim() !== '' || run.isBreak)
}

function BlockEl({
  block, hyperlinks, blankNames, civs, civValues, layoutMarginLeft,
}: {
  block: ParagraphBlock | TableBlock
  hyperlinks: Record<string, string>
  blankNames: Record<number, string>
  civs: any[]
  civValues: Record<string, string>
  layoutMarginLeft?: number
}) {
  const nextBlock = layoutMarginLeft != null ? { ...block, layoutMarginLeft } : block
  return block.type === 'paragraph'
    ? <ParaEl block={nextBlock as ParagraphBlock} hyperlinks={hyperlinks} blankNames={blankNames} civs={civs} civValues={civValues} />
    : <TableEl block={nextBlock as TableBlock} hyperlinks={hyperlinks} blankNames={blankNames} civs={civs} civValues={civValues} />
}

function splitIntoPages(blocks: Array<ParagraphBlock | TableBlock>, heights: number[], maxContentHeight: number) {
  const pages: Array<Array<ParagraphBlock | TableBlock>> = []
  let current: Array<ParagraphBlock | TableBlock> = []
  let currentHeight = 0
  let justFlushed = false

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

    if (block.type === 'paragraph' && block.sectionBreak && block.sectionBreak !== 'continuous') {
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

    if (hasForcedPageBreak(block) && !justFlushed) {
      flush()
      if (!visibleContent) {
        justFlushed = false
        continue
      }
    }
    justFlushed = false

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

// ── Main component ───────────────────────────────────────────────────────────
interface DocRendererProps {
  data: ParsedDoc
  /** Map of blankId → fieldName. Pass {} to disable highlighting. */
  blankNames?: Record<number, string>
  civs?: any[]
  civValues?: Record<string, string>
}

export default function DocRenderer({ data, blankNames = {}, civs = [], civValues = {} }: DocRendererProps) {
  const { layout, blocks, hyperlinks } = data

  const blocksToRender = blocks ?? []

  const containerStyle: React.CSSProperties = {
    width: `${layout.pageWidth}px`,
    padding: `${layout.marginTop}px ${layout.marginRight}px ${layout.marginBottom}px ${layout.marginLeft}px`,
    fontFamily: "'Calibri','Arial',sans-serif",
    fontSize: '11pt',
    lineHeight: '1.15',
    backgroundColor: 'white',
    boxSizing: 'border-box',
  }

  return (
    <div style={containerStyle}>
      {blocksToRender.map((block, i) => (
        <BlockEl
          key={i}
          block={block}
          hyperlinks={hyperlinks ?? {}}
          blankNames={blankNames}
          civs={civs}
          civValues={civValues}
          layoutMarginLeft={layout.marginLeft}
        />
      ))}
    </div>
  )
}
