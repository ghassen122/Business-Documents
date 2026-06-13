/**
 * documentParser.js
 * Parses word/document.xml → array of paragraph/table block objects.
 * Each block carries fully resolved styles (inherited from styles.xml).
 */

const { extractPPr, extractRPr, resolveStyle, deepMerge } = require('./stylesParser');
const { resolveListLabel } = require('./numberingParser');

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extractHorizontalRule(runNode) {
  const drawingNodes = [];
  drawingNodes.push(...asArray(runNode?.['w:drawing']));

  const alternate = runNode?.['mc:AlternateContent'];
  for (const choice of asArray(alternate?.['mc:Choice'])) {
    drawingNodes.push(...asArray(choice?.['w:drawing']));
  }

  for (const drawing of drawingNodes) {
    for (const anchor of [...asArray(drawing?.['wp:anchor']), ...asArray(drawing?.['wp:inline'])]) {
      const extent = anchor?.['wp:extent'] || {};
      const cx = Number(extent?.['@_cx'] || 0);
      const cy = Number(extent?.['@_cy'] || 0);
      const posH = anchor?.['wp:positionH']?.['wp:posOffset'];
      const posV = anchor?.['wp:positionV']?.['wp:posOffset'];
      const wsp = anchor?.['a:graphic']?.['a:graphicData']?.['wps:wsp'];
      const spPr = wsp?.['wps:spPr'] || {};
      const fill = spPr?.['a:solidFill']?.['a:srgbClr']?.['@_val'];
      const lineFill = spPr?.['a:ln']?.['a:solidFill']?.['a:srgbClr']?.['@_val'];

      // Word stores these separator lines as extremely short rectangles.
      // 9525 EMU ~= 1 px. Treat thin, very wide shapes as horizontal rules.
      if (cx >= 1000000 && cy > 0 && cy <= 50000) {
        return {
          leftPx: Math.max(0, Math.round(Number(posH || 0) / 9525)),
          topPx: Math.max(0, Math.round(Number(posV || 0) / 9525)),
          widthPx: Math.max(1, Math.round(cx / 9525)),
          thicknessPx: Math.max(1, Math.round(cy / 9525)),
          color: lineFill ? `#${lineFill}` : fill ? `#${fill}` : '#000000',
        };
      }
    }
  }

  return null;
}

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

function expandParsedRun(run) {
  if (!run?.isTab || !run?.text || run.text === '\t') return [run];

  const { text, ...rest } = run;
  return [
    { ...rest, text: '\t', isTab: true },
    { ...rest, text, isTab: false },
  ];
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

  // List handling — suppress when numPr is decorative (heading-like paragraphs).
  // A numPr is decorative when:
  //   1. styleId looks like a heading (Heading 1, Titre 1, …)
  //   2. the paragraph has an outline level (w:outlineLvl) → any heading style
  //   3. the resolved alignment is 'center' — a centered list item doesn't exist in practice
  let listLabel = null;
  let listIndent = null;
  const hasNumPr = resolvedPPr.numPr && resolvedPPr.numPr.numId !== 0;
  const suppressList =
    /^(heading|titre|title)/i.test(styleId) ||
    resolvedPPr.outlineLevel !== undefined ||
    (resolvedPPr.align === 'center' && hasNumPr);

  if (hasNumPr && !suppressList) {
    const { numId, ilvl } = resolvedPPr.numPr;
    listLabel = resolveListLabel(numId, ilvl, numMap, counters);
    const lvlDef = (numMap[String(numId)] || {})[ilvl];
    if (lvlDef) listIndent = lvlDef.indent;
  } else if (hasNumPr && suppressList) {
    // Word writes the list indent into w:ind even on title paragraphs.
    // Remove it so the paragraph is not shifted to the right.
    delete resolvedPPr.indent;
  }

  // Runs — detect explicit w:br type="page" or w:br type="column"
  let runs = [];
  let pageBreakBefore = !!(resolvedPPr.pageBreakBefore); // from w:pPr/w:pageBreakBefore
  const floatingRules = [];
  const rawRuns = p['w:r'];
  if (rawRuns) {
    const runArr = Array.isArray(rawRuns) ? rawRuns : [rawRuns];
    for (const r of runArr) {
      const rule = extractHorizontalRule(r);
      if (rule) floatingRules.push(rule);
      const parsedRuns = expandParsedRun(parseRun(r, resolvedRPr));
      // If this run signals a page break, flag the paragraph.
      // If the run also carries text (w:lastRenderedPageBreak + w:t in same run),
      // still push the run so the text is not lost.
      for (const run of parsedRuns) {
        if (run.isPageBreak) {
          pageBreakBefore = true;
          if (run.text && run.text !== '\t') runs.push({ ...run, isPageBreak: false });
          continue;
        }
        runs.push(run);
      }
    }
  }

  // Hyperlinks
  const hyperlinks = p['w:hyperlink'];
  if (hyperlinks) {
    const hlArr = Array.isArray(hyperlinks) ? hyperlinks : [hyperlinks];
    for (const hl of hlArr) {
      const hlRuns = hl['w:r'] ? (Array.isArray(hl['w:r']) ? hl['w:r'] : [hl['w:r']]) : [];
      for (const r of hlRuns) {
        const expandedRuns = expandParsedRun(parseRun(r, resolvedRPr));
        for (const run of expandedRuns) {
          run.hyperlink = hl['@_r:id'] || hl['@_w:anchor'] || '#';
          runs.push(run);
        }
      }
    }
  }

  const blockPPr = resolvedPPr;

  const hasVisibleText = runs.some(run => (run.text || '').trim() !== '' || run.isBreak);
  if (floatingRules.length > 0 && !hasVisibleText) {
    blockPPr.floatingRules = floatingRules;
  }

  return {
    type: 'paragraph',
    styleId,
    pPr: blockPPr,
    directAlign: directPPr.align || null,
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
  const hasTab = r['w:tab'] !== undefined;
  if (!text && hasTab) text = '\t';

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
  // w:lastRenderedPageBreak — inserted by Word to record where page breaks
  // actually fell when it last saved the document. More reliable than overflow.
  if (r['w:lastRenderedPageBreak'] !== undefined) {
    isPageBreak = true;
  }

  return { text, ...rPr, isBreak, isPageBreak, isTab: hasTab };
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
