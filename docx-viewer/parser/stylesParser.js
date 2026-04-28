/**
 * stylesParser.js
 * Parses word/styles.xml into a flat map: styleId → resolved props.
 * Handles basedOn inheritance chains.
 */

const TWIPS_PER_PX = 15; // 1440 twips/inch ÷ 96 px/inch = 15

function twipsToPx(twips) {
  return twips ? Math.round(Number(twips) / TWIPS_PER_PX) : 0;
}
function halfPtToPt(hp) {
  return hp ? Number(hp) / 2 : null;
}

/**
 * Extract raw properties from a single w:style or w:pPr / w:rPr node
 * xml-parsed object (fast-xml-parser with attributeNamePrefix:'@_')
 */
function extractPPr(pPr) {
  if (!pPr) return {};
  const props = {};
  if (pPr['w:jc']) {
    // Normalise to lowercase string regardless of object vs plain-string form
    const raw = pPr['w:jc']['@_w:val'] ?? (typeof pPr['w:jc'] === 'string' ? pPr['w:jc'] : '');
    if (raw) props.align = String(raw).toLowerCase();
  }
  if (pPr['w:ind']) {
    const ind = pPr['w:ind'];
    props.indent = {
      left:      twipsToPx(ind['@_w:left']      || ind['@_w:start'] || 0),
      right:     twipsToPx(ind['@_w:right']     || ind['@_w:end']   || 0),
      firstLine: twipsToPx(ind['@_w:firstLine'] || 0),
      // hanging is stored as positive twips but means negative firstLine
      hanging:   twipsToPx(ind['@_w:hanging']   || 0),
    };
    // Normalise: if hanging > 0, convert to a negative firstLine
    if (props.indent.hanging > 0) {
      props.indent.firstLine = -props.indent.hanging;
      delete props.indent.hanging;
    }
  }
  if (pPr['w:spacing']) {
    const sp = pPr['w:spacing'];
    props.spacing = {
      before:   twipsToPx(sp['@_w:before'] || 0),
      after:    twipsToPx(sp['@_w:after']  || 0),
      line:     sp['@_w:line']     ? Number(sp['@_w:line'])     : null,
      lineRule: sp['@_w:lineRule'] || null,
    };
  }
  if (pPr['w:outlineLvl']) {
    props.outlineLevel = Number(pPr['w:outlineLvl']['@_w:val']);
  }
  if (pPr['w:numPr']) {
    props.numPr = {
      ilvl:  Number(pPr['w:numPr']['w:ilvl']['@_w:val']  ?? 0),
      numId: Number(pPr['w:numPr']['w:numId']['@_w:val'] ?? 0),
    };
  }
  if (pPr['w:contextualSpacing']) props.contextualSpacing = true;
  return props;
}

function extractRPr(rPr) {
  if (!rPr) return {};
  const props = {};
  // Toggle properties: <w:b/> or <w:b w:val="1"> = ON; <w:b w:val="0"> = explicit OFF override
  if (rPr['w:b'] !== undefined) {
    const val = rPr['w:b']?.['@_w:val'];
    props.bold = (val !== '0' && val !== 'false');
  }
  if (rPr['w:i'] !== undefined) {
    const val = rPr['w:i']?.['@_w:val'];
    props.italic = (val !== '0' && val !== 'false');
  }
  if (rPr['w:u']) {
    const val = rPr['w:u']['@_w:val'];
    if (val && val !== 'none') props.underline = val;
  }
  if (rPr['w:strike'] !== undefined) props.strike = true;
  if (rPr['w:sz'])    props.fontSize = halfPtToPt(rPr['w:sz']['@_w:val']);
  if (rPr['w:szCs']) props.fontSizeCs = halfPtToPt(rPr['w:szCs']['@_w:val']);
  if (rPr['w:color'] && rPr['w:color']['@_w:val'] !== 'auto') {
    props.color = '#' + rPr['w:color']['@_w:val'];
  }
  if (rPr['w:highlight']) props.highlight = rPr['w:highlight']['@_w:val'];
  if (rPr['w:rFonts']) {
    const f = rPr['w:rFonts'];
    props.font = f['@_w:ascii'] || f['@_w:hAnsi'] || f['@_w:cs'] || null;
  }
  if (rPr['w:vertAlign']) props.vertAlign = rPr['w:vertAlign']['@_w:val'];
  return props;
}

/**
 * Parse w:docDefaults → { pPr, rPr }
 * w:docDefaults is the very base of the inheritance chain —
 * applies to every paragraph/run unless overridden by a style or direct formatting.
 */
function parseDocDefaults(root) {
  const dd = root['w:docDefaults'];
  if (!dd) return { pPr: {}, rPr: {} };
  const rPrNode = dd['w:rPrDefault']?.['w:rPr'];
  const pPrNode = dd['w:pPrDefault']?.['w:pPr'];
  return {
    pPr: extractPPr(pPrNode),
    rPr: extractRPr(rPrNode),
  };
}

/**
 * Parse styles.xml → map of styleId → {pPr, rPr, name, type, basedOn}
 * Also injects a virtual '@_docDefaults' entry that all root styles inherit from,
 * so document-level defaults (fonts, spacing) flow through the inheritance chain.
 */
function parseStylesXml(parsed) {
  const root = parsed['w:styles'] || parsed;
  let styleNodes = root['w:style'];
  if (!styleNodes) return {};
  if (!Array.isArray(styleNodes)) styleNodes = [styleNodes];

  const rawStyles = {};

  // ── Document-level defaults (base of ALL styles) ──────────────────────────
  const docDefaults = parseDocDefaults(root);
  rawStyles['@_docDefaults'] = {
    id: '@_docDefaults', name: '_docDefaults', type: null,
    basedOn: null, next: null,
    pPr: docDefaults.pPr, rPr: docDefaults.rPr,
  };

  for (const s of styleNodes) {
    const id   = s['@_w:styleId'];
    const type = s['@_w:type'];
    const name = s['w:name']?.['@_w:val'] || id;
    const basedOn = s['w:basedOn']?.['@_w:val'] || null;
    const next    = s['w:next']?.['@_w:val'] || null;

    // Paragraph + run defaults at style level
    const pPr = extractPPr(s['w:pPr']);
    const rPr = extractRPr(s['w:rPr']);

    rawStyles[id] = { id, name, type,
      // If no explicit basedOn, root styles still inherit from docDefaults
      basedOn: basedOn || '@_docDefaults',
      next, pPr, rPr };
  }
  return rawStyles;
}

/**
 * Resolve a style by walking basedOn chain and merging (child wins).
 * Returns merged { pPr, rPr }.
 */
function resolveStyle(id, rawStyles, cache = {}) {
  if (!id) return { pPr: {}, rPr: {} };
  if (cache[id]) return cache[id];
  const s = rawStyles[id];
  if (!s) return { pPr: {}, rPr: {} };

  let base = { pPr: {}, rPr: {} };
  if (s.basedOn) base = resolveStyle(s.basedOn, rawStyles, cache);

  const resolved = {
    pPr: deepMerge(base.pPr, s.pPr),
    rPr: deepMerge(base.rPr, s.rPr),
  };
  cache[id] = resolved;
  return resolved;
}

function deepMerge(base, override) {
  const result = Object.assign({}, base);
  for (const [k, v] of Object.entries(override)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      result[k] = deepMerge(base[k] || {}, v);
    } else {
      result[k] = v;
    }
  }
  return result;
}

module.exports = { parseStylesXml, resolveStyle, extractPPr, extractRPr, deepMerge, twipsToPx };
