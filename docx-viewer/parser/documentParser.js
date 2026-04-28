/**
 * documentParser.js
 * Parses word/document.xml → array of paragraph/table block objects.
 * Each block carries fully resolved styles (inherited from styles.xml).
 */

const { extractPPr, extractRPr, resolveStyle, deepMerge } = require('./stylesParser');
const { resolveListLabel } = require('./numberingParser');

function parseDocumentXml(parsed, rawStyles, numMap) {
  const body = parsed?.['w:document']?.['w:body'] || parsed?.['w:body'] || {};
  const counters = {};
  const blocks = [];

  // body children can be w:p, w:tbl, w:sectPr, etc.
  const children = body;
  processParagraphsAndTables(children, rawStyles, numMap, counters, blocks);

  return blocks;
}

function processParagraphsAndTables(container, rawStyles, numMap, counters, blocks) {
  for (const [tag, nodes] of Object.entries(container)) {
    if (tag === 'w:p') {
      const paras = Array.isArray(nodes) ? nodes : [nodes];
      for (const p of paras) {
        blocks.push(parseParagraph(p, rawStyles, numMap, counters));
      }
    } else if (tag === 'w:tbl') {
      const tables = Array.isArray(nodes) ? nodes : [nodes];
      for (const tbl of tables) {
        blocks.push(parseTable(tbl, rawStyles, numMap, counters));
      }
    }
  }
}

function parseParagraph(p, rawStyles, numMap, counters) {
  const pPr = p['w:pPr'] || {};
  const styleId = pPr['w:pStyle']?.['@_w:val'] || 'Normal';

  // Resolve style chain
  const styleResolved = resolveStyle(styleId, rawStyles, {});
  // Direct paragraph formatting overrides style
  const directPPr = extractPPr(pPr);
  const resolvedPPr = deepMerge(styleResolved.pPr, directPPr);
  // NOTE: pPr['w:rPr'] = paragraph MARK character properties (the ¶ symbol).
  // Per OOXML spec this does NOT cascade into runs — only the style chain does.
  // Merging it into resolvedRPr causes false bold/italic on all runs in the paragraph.
  const resolvedRPr = styleResolved.rPr;

  // ── Section break embedded in this paragraph's pPr ──
  // When a w:sectPr sits inside w:pPr it means a section ends AFTER this paragraph.
  let sectionBreak = null;
  const inlineSectPr = pPr['w:sectPr'];
  if (inlineSectPr) {
    const typeNode = inlineSectPr['w:type'];
    const breakType = (typeNode?.['@_w:val'] || 'nextPage').toLowerCase();
    // Only insert a visual page break for actual page-advancing types
    sectionBreak = breakType; // 'nextPage' | 'evenPage' | 'oddPage' | 'continuous'
  }

  // List handling
  let listLabel = null;
  let listIndent = null;
  if (resolvedPPr.numPr && resolvedPPr.numPr.numId !== 0) {
    const { numId, ilvl } = resolvedPPr.numPr;
    listLabel = resolveListLabel(numId, ilvl, numMap, counters);
    const lvlDef = (numMap[String(numId)] || {})[ilvl];
    if (lvlDef) listIndent = lvlDef.indent;
  }

  // Runs — detect explicit w:br type="page" or w:br type="column"
  let runs = [];
  let pageBreakBefore = false;
  const rawRuns = p['w:r'];
  if (rawRuns) {
    const runArr = Array.isArray(rawRuns) ? rawRuns : [rawRuns];
    for (const r of runArr) {
      const run = parseRun(r, resolvedRPr);
      // If this run is a page-break run, flag the paragraph instead of
      // inserting an empty run (keeps the DOM clean)
      if (run.isPageBreak) {
        pageBreakBefore = true;
        continue; // don't push an empty span
      }
      runs.push(run);
    }
  }

  // Hyperlinks
  const hyperlinks = p['w:hyperlink'];
  if (hyperlinks) {
    const hlArr = Array.isArray(hyperlinks) ? hyperlinks : [hyperlinks];
    for (const hl of hlArr) {
      const hlRuns = hl['w:r'] ? (Array.isArray(hl['w:r']) ? hl['w:r'] : [hl['w:r']]) : [];
      for (const r of hlRuns) {
        const run = parseRun(r, resolvedRPr);
        run.hyperlink = hl['@_r:id'] || hl['@_w:anchor'] || '#';
        runs.push(run);
      }
    }
  }

  return {
    type: 'paragraph',
    styleId,
    pPr: resolvedPPr,
    rPr: resolvedRPr,
    listLabel,
    listIndent,
    pageBreakBefore,  // explicit w:br type=page found in runs
    sectionBreak,     // w:sectPr in pPr: 'nextPage'|'evenPage'|'oddPage'|'continuous'|null
    runs,
  };
}

function parseRun(r, inheritedRPr) {
  const rawRPr  = r['w:rPr'] || {};
  const directRPr = extractRPr(rawRPr);
  const rPr = deepMerge(inheritedRPr, directRPr);

  // Text — w:t may be string or object {#text, @_xml:space}
  let text = '';
  const wt = r['w:t'];
  if (typeof wt === 'string')      text = wt;
  else if (wt && wt['#text'] !== undefined) text = String(wt['#text']);
  else if (wt !== undefined)        text = String(wt);

  // Break type detection
  let isBreak     = false;
  let isPageBreak = false;
  if (r['w:br']) {
    const brType = r['w:br']['@_w:type'] || '';
    if (brType === 'page' || brType === 'column') {
      isPageBreak = true;
    } else {
      isBreak = true; // line break
    }
  }

  return { text, ...rPr, isBreak, isPageBreak };
}

function parseTable(tbl, rawStyles, numMap, counters) {
  // tblPr
  const tblPr  = tbl['w:tblPr'] || {};
  const tblGrid = tbl['w:tblGrid'] || {};
  let colWidths = [];
  const gridCols = tblGrid['w:gridCol'];
  if (gridCols) {
    const arr = Array.isArray(gridCols) ? gridCols : [gridCols];
    colWidths = arr.map(c => Number(c['@_w:w'] || 0));
  }

  let rows = tbl['w:tr'];
  if (!rows) return { type: 'table', rows: [], colWidths };
  if (!Array.isArray(rows)) rows = [rows];

  const parsedRows = rows.map(tr => {
    let cells = tr['w:tc'];
    if (!cells) return { cells: [] };
    if (!Array.isArray(cells)) cells = [cells];
    return {
      cells: cells.map(tc => {
        const tcPr = tc['w:tcPr'] || {};
        const gridSpan = Number(tcPr['w:gridSpan']?.['@_w:val'] || 1);
        const tcBlocks = [];
        const paras = tc['w:p'];
        if (paras) {
          const arr = Array.isArray(paras) ? paras : [paras];
          for (const p of arr) tcBlocks.push(parseParagraph(p, rawStyles, numMap, counters));
        }
        return { gridSpan, blocks: tcBlocks, tcPr };
      }),
    };
  });

  return { type: 'table', rows: parsedRows, colWidths };
}

module.exports = { parseDocumentXml };
