/**
 * renderer.js — shared rendering engine (viewer + admin)
 *
 * The pure rendering functions (renderParagraph, renderTable, etc.) are
 * global so both viewer and admin pages can call them.
 *
 * All viewer-specific DOM wiring (file input, zoom, debug panel) lives inside
 * an IIFE at the bottom of this file and only activates on index.html where
 * those elements exist. This avoids `const` re-declaration conflicts when
 * admin-logic.js is also loaded.
 */

// ═══════════════════════════════════════════════════════════════════
// SHARED RENDERING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

// ─── Paragraph renderer ──────────────────────────────────────────────────────
function renderParagraph(block, hyperlinks) {
  const { pPr, rPr, runs, listLabel, listIndent, pageBreakBefore, sectionBreak } = block;

  const isListItem = listLabel !== null;
  const paraStyle  = buildParaStyle(pPr, listIndent);

  // Empty paragraph (spacer)
  const allText = (runs || []).map(r => r.text).join('');
  if (!allText.trim() && !(runs || []).some(r => r.isBreak)) {
    const el = document.createElement('p');
    el.className = 'doc-para empty-para';
    Object.assign(el.style, paraStyle);
    // Even an empty paragraph can carry a page/section break
    if (_needsPageBreak(pageBreakBefore, sectionBreak)) {
      el.classList.add('page-break-before');
    }
    return el;
  }

  if (isListItem) {
    const el = renderListItem(block, hyperlinks, paraStyle, listLabel, listIndent);
    if (_needsPageBreak(pageBreakBefore, sectionBreak)) el.classList.add('page-break-before');
    return el;
  }

  const p = document.createElement('p');
  p.className = 'doc-para';
  if (_needsPageBreak(pageBreakBefore, sectionBreak)) p.classList.add('page-break-before');
  Object.assign(p.style, paraStyle);

  for (const run of (runs || [])) {
    if (run.isBreak) { p.appendChild(document.createElement('br')); continue; }
    p.appendChild(renderRun(run, hyperlinks));
  }
  return p;
}

/** Returns true when the paragraph should be preceded by a page break in the rendered output. */
function _needsPageBreak(pageBreakBefore, sectionBreak) {
  if (pageBreakBefore) return true;
  if (!sectionBreak) return false;
  // 'continuous' means no page advance — skip
  return sectionBreak !== 'continuous';
}

function renderListItem(block, hyperlinks, paraStyle, listLabel, listIndent) {
  const { pPr, runs } = block;

  const div = document.createElement('div');
  div.className = 'doc-para doc-list-item';
  const style = { ...paraStyle };
  const indLeft = listIndent ? listIndent.left : (pPr.indent?.left || 0);
  const hanging = listIndent ? Math.abs(listIndent.firstLine || 0) : 0;

  style.paddingLeft = indLeft + 'px';
  style.textIndent  = '0';
  style.display     = 'flex';
  style.alignItems  = 'baseline';
  Object.assign(div.style, style);

  const bulletSpan = document.createElement('span');
  bulletSpan.className    = 'doc-list-bullet';
  bulletSpan.style.minWidth   = (hanging || 18) + 'px';
  bulletSpan.style.marginLeft = '-' + (hanging || 18) + 'px';
  bulletSpan.textContent  = listLabel;

  const textDiv = document.createElement('span');
  textDiv.className = 'doc-list-text';
  for (const run of (runs || [])) {
    if (run.isBreak) { textDiv.appendChild(document.createElement('br')); continue; }
    textDiv.appendChild(renderRun(run, hyperlinks));
  }

  div.appendChild(bulletSpan);
  div.appendChild(textDiv);
  return div;
}

// ─── Run renderer ────────────────────────────────────────────────────────────
function renderRun(run, hyperlinks) {
  const span = document.createElement('span');
  span.textContent = run.text;
  Object.assign(span.style, buildRunStyle(run));

  if (run.hyperlink) {
    const a = document.createElement('a');
    a.href        = (hyperlinks && hyperlinks[run.hyperlink]) || run.hyperlink;
    a.target      = '_blank';
    a.style.color = run.color || '#0563c1';
    a.appendChild(span);
    return a;
  }
  return span;
}

// ─── Table renderer ──────────────────────────────────────────────────────────
function renderTable(block, hyperlinks) {
  const table = document.createElement('table');
  table.className = 'doc-table';

  const totalW = (block.colWidths || []).reduce((s, w) => s + w, 0) || 1;
  const colgroup = document.createElement('colgroup');
  for (const w of (block.colWidths || [])) {
    const col = document.createElement('col');
    col.style.width = Math.round((w / totalW) * 100) + '%';
    colgroup.appendChild(col);
  }
  table.appendChild(colgroup);

  const tbody = document.createElement('tbody');
  for (const row of (block.rows || [])) {
    const tr = document.createElement('tr');
    for (const cell of (row.cells || [])) {
      const td = document.createElement('td');
      if (cell.gridSpan > 1) td.colSpan = cell.gridSpan;
      for (const blk of (cell.blocks || [])) {
        td.appendChild(blk.type === 'paragraph'
          ? renderParagraph(blk, hyperlinks)
          : renderTable(blk, hyperlinks));
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

// ─── Style builders ──────────────────────────────────────────────────────────
function buildParaStyle(pPr, listIndent) {
  const css = {};
  const jcMap = { center: 'center', right: 'right', both: 'justify', left: 'left', end: 'right', start: 'left' };
  if (pPr && pPr.align) css.textAlign = jcMap[pPr.align] || pPr.align;

  if (!listIndent && pPr && pPr.indent) {
    const { left = 0, right = 0, firstLine = 0 } = pPr.indent;
    if (firstLine < 0) {
      css.paddingLeft = (left + Math.abs(firstLine)) + 'px';
      css.textIndent  = firstLine + 'px';
    } else {
      css.paddingLeft  = left  + 'px';
      css.paddingRight = right + 'px';
      if (firstLine > 0) css.textIndent = firstLine + 'px';
    }
  }

  if (pPr && pPr.spacing) {
    const { before = 0, after = 0, line, lineRule } = pPr.spacing;
    if (before > 0) css.marginTop    = before + 'px';
    if (after  > 0) css.marginBottom = after  + 'px';
    if (line) {
      if (lineRule === 'exact' || lineRule === 'atLeast') {
        css.lineHeight = Math.round(line / 20) + 'pt';
      } else {
        css.lineHeight = (line / 240).toFixed(2);
      }
    }
  }
  return css;
}

function buildRunStyle(rPr) {
  const css = {};
  if (!rPr) return css;
  if (rPr.font)      css.fontFamily     = `'${rPr.font}', sans-serif`;
  if (rPr.fontSize)  css.fontSize       = rPr.fontSize + 'pt';
  if (rPr.bold)      css.fontWeight     = 'bold';
  if (rPr.italic)    css.fontStyle      = 'italic';
  if (rPr.color)     css.color          = rPr.color;
  if (rPr.highlight) {
    const hlMap = { yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff',
      blue: '#0000ff', red: '#ff0000', darkBlue: '#000080', darkCyan: '#008080',
      darkGreen: '#008000', darkMagenta: '#800080', darkRed: '#800000', darkYellow: '#808000',
      darkGray: '#808080', lightGray: '#c0c0c0' };
    css.backgroundColor = hlMap[rPr.highlight] || rPr.highlight;
  }
  if (rPr.underline && rPr.underline !== 'none') css.textDecoration = 'underline';
  if (rPr.strike) css.textDecoration = (css.textDecoration ? css.textDecoration + ' ' : '') + 'line-through';
  if (rPr.vertAlign === 'superscript') css.verticalAlign = 'super';
  if (rPr.vertAlign === 'subscript')   css.verticalAlign = 'sub';
  return css;
}

// ═══════════════════════════════════════════════════════════════════
// VIEWER-SPECIFIC WIRING  (index.html only — isolated in IIFE)
// ═══════════════════════════════════════════════════════════════════
;(function initViewerPage() {
  const btnZoomIn = document.getElementById('btnZoomIn');
  if (!btnZoomIn) return;  // Not the viewer page — stop here

  const fileInput  = document.getElementById('fileInput');
  const loading    = document.getElementById('loading');
  const docPageEl  = document.getElementById('docPage');
  const docContentEl = document.getElementById('docContent');
  const debugPanel = document.getElementById('debugPanel');
  const debugJson  = document.getElementById('debugJson');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const zoomLabel  = document.getElementById('zoomLabel');
  const btnToggle  = document.getElementById('btnToggleDebug');

  let currentData = null;
  let currentZoom = 1;

  // ── Events ──
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await uploadAndRender(file);
    });
  }

  btnZoomIn.addEventListener('click',  () => setZoom(currentZoom + 0.1));
  btnZoomOut.addEventListener('click', () => setZoom(currentZoom - 0.1));
  btnToggle.addEventListener('click',  () => {
    debugPanel.classList.toggle('hidden');
    if (currentData) debugJson.textContent = JSON.stringify(currentData, null, 2);
  });

  // ── Upload & render ──
  async function uploadAndRender(file) {
    loading.classList.remove('hidden');
    try {
      const fd = new FormData();
      fd.append('docx', file);
      const res = await fetch('/parse', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      currentData = data;
      renderDocumentInto(data, docPageEl, docContentEl);
      if (!debugPanel.classList.contains('hidden')) {
        debugJson.textContent = JSON.stringify(data, null, 2);
      }
    } catch (err) {
      docContentEl.innerHTML = `<p style="color:red">Erreur: ${err.message}</p>`;
    } finally {
      loading.classList.remove('hidden');
      loading.classList.add('hidden');
    }
  }

  // ── Zoom ──
  function setZoom(z) {
    currentZoom = Math.max(0.3, Math.min(3, Math.round(z * 10) / 10));
    zoomLabel.textContent = Math.round(currentZoom * 100) + '%';
    docPageEl.style.transform = `scale(${currentZoom})`;

    const naturalH = docPageEl.offsetHeight;
    const naturalW = docPageEl.offsetWidth;
    const scaledH  = naturalH * currentZoom;
    const scaledW  = naturalW * currentZoom;
    const extraH   = scaledH - naturalH;
    const extraW   = scaledW - naturalW;
    const halfH    = extraH / 2;
    const halfW    = extraW / 2;
    docPageEl.style.marginTop    = halfH + 'px';
    docPageEl.style.marginBottom = halfH + 'px';
    docPageEl.style.marginLeft   = (halfW > 0 ? halfW : 0) + 'px';
    docPageEl.style.marginRight  = (halfW > 0 ? halfW : 0) + 'px';
  }
})();

// ═══════════════════════════════════════════════════════════════════
// renderDocumentInto — usable by viewer AND admin
// ═══════════════════════════════════════════════════════════════════
function renderDocumentInto(data, pageEl, contentEl) {
  const { layout, blocks, hyperlinks } = data;
  pageEl.style.width     = layout.pageWidth  + 'px';
  pageEl.style.minHeight = layout.pageHeight + 'px';
  contentEl.style.padding = [
    layout.marginTop, layout.marginRight, layout.marginBottom, layout.marginLeft
  ].map(v => v + 'px').join(' ');

  contentEl.innerHTML = '';
  for (const block of blocks) {
    if (block.type === 'paragraph') {
      contentEl.appendChild(renderParagraph(block, hyperlinks));
    } else if (block.type === 'table') {
      contentEl.appendChild(renderTable(block, hyperlinks));
    }
  }
}

