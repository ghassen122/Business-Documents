import React from 'react'

// ── Types ────────────────────────────────────────────────────────────────────
export interface RunBlock {
  text: string
  font?: string
  fontSize?: number
  fontSizeCs?: number
  bold?: boolean
  italic?: boolean
  color?: string
  highlight?: string
  underline?: string
  strike?: boolean
  vertAlign?: string
  isBreak: boolean
  isPageBreak: boolean
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
}

export interface RPr {
  font?: string
  fontSize?: number
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
  return css
}

function buildRunStyle(run: RunBlock): React.CSSProperties {
  const css: React.CSSProperties = {}
  if (run.font)      css.fontFamily    = `'${run.font}', sans-serif`
  if (run.fontSize)  css.fontSize      = `${run.fontSize}pt`
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

// ── Token renderer: splits run text on {{BLANK_N}} and highlights them ──────
function renderTokensInText(
  text: string,
  blankNames: Record<number, string>,
): React.ReactNode[] {
  const TOKEN_RE = /\{\{BLANK_(\d+)\}\}/g
  const parts: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
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
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

// ── Run ──────────────────────────────────────────────────────────────────────
function RunEl({
  run, hyperlinks, blankNames,
}: {
  run: RunBlock
  hyperlinks: Record<string, string>
  blankNames: Record<number, string>
}) {
  const style = buildRunStyle(run)
  const content: React.ReactNode =
    Object.keys(blankNames).length > 0
      ? renderTokensInText(run.text, blankNames)
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

// ── Paragraph ────────────────────────────────────────────────────────────────
function ParaEl({
  block, hyperlinks, blankNames,
}: {
  block: ParagraphBlock
  hyperlinks: Record<string, string>
  blankNames: Record<number, string>
}) {
  const { pPr, runs, listLabel, listIndent, pageBreakBefore, sectionBreak } = block
  const paraStyle = buildParaStyle(pPr)
  const pageBreak = needsPageBreak(pageBreakBefore, sectionBreak)

  const allText = (runs ?? []).map(r => r.text).join('')
  const className = [
    'doc-para',
    !allText.trim() && !(runs ?? []).some(r => r.isBreak) ? 'empty-para' : '',
    pageBreak ? 'page-break-before' : '',
    listLabel ? 'doc-list-item' : '',
  ].filter(Boolean).join(' ')

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
          {(runs ?? []).map((run, i) =>
            run.isBreak
              ? <br key={i} />
              : <RunEl key={i} run={run} hyperlinks={hyperlinks} blankNames={blankNames} />
          )}
        </span>
      </div>
    )
  }

  return (
    <p className={className} style={paraStyle}>
      {(runs ?? []).map((run, i) =>
        run.isBreak
          ? <br key={i} />
          : <RunEl key={i} run={run} hyperlinks={hyperlinks} blankNames={blankNames} />
      )}
    </p>
  )
}

// ── Table ────────────────────────────────────────────────────────────────────
function TableEl({
  block, hyperlinks, blankNames,
}: {
  block: TableBlock
  hyperlinks: Record<string, string>
  blankNames: Record<number, string>
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
                    ? <ParaEl key={bi} block={blk} hyperlinks={hyperlinks} blankNames={blankNames} />
                    : <TableEl key={bi} block={blk} hyperlinks={hyperlinks} blankNames={blankNames} />
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
interface DocRendererProps {
  data: ParsedDoc
  /** Map of blankId → fieldName. Pass {} to disable highlighting. */
  blankNames?: Record<number, string>
}

export default function DocRenderer({ data, blankNames = {} }: DocRendererProps) {
  const { layout, blocks, hyperlinks } = data

  const pageStyle: React.CSSProperties = {
    width    : `${layout.pageWidth}px`,
    minHeight: `${layout.pageHeight}px`,
  }
  const contentStyle: React.CSSProperties = {
    padding : `${layout.marginTop}px ${layout.marginRight}px ${layout.marginBottom}px ${layout.marginLeft}px`,
    fontFamily: "'Calibri','Arial',sans-serif",
    fontSize  : '11pt',
    lineHeight: '1.15',
  }

  return (
    <div className="doc-page" style={pageStyle}>
      <div className="doc-content" style={contentStyle}>
        {(blocks ?? []).map((block, i) =>
          block.type === 'paragraph'
            ? <ParaEl  key={i} block={block} hyperlinks={hyperlinks ?? {}} blankNames={blankNames} />
            : <TableEl key={i} block={block} hyperlinks={hyperlinks ?? {}} blankNames={blankNames} />
        )}
      </div>
    </div>
  )
}
