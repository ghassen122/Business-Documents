/**
 * numberingParser.js
 * Parses word/numbering.xml to resolve list levels → bullet/number + indents.
 */

const { twipsToPx } = require('./stylesParser');

/**
 * Returns map: numId → { [ilvl]: { fmt, text, lvlText, indent, startVal } }
 */
function parseNumberingXml(parsed) {
  const root = parsed['w:numbering'] || parsed;

  // 1. Build abstractNum map
  let abstractNums = root['w:abstractNum'];
  if (!abstractNums) return {};
  if (!Array.isArray(abstractNums)) abstractNums = [abstractNums];

  const abstractMap = {};
  for (const an of abstractNums) {
    const aid = String(an['@_w:abstractNumId']);
    let levels = an['w:lvl'];
    if (!levels) continue;
    if (!Array.isArray(levels)) levels = [levels];
    const lvlMap = {};
    for (const lvl of levels) {
      const ilvl = Number(lvl['@_w:ilvl'] ?? 0);
      const fmt  = lvl['w:numFmt']?.['@_w:val'] || 'bullet';
      const text = lvl['w:lvlText']?.['@_w:val'] ?? '•';
      const start = Number(lvl['w:start']?.['@_w:val'] ?? 1);
      const pPr  = lvl['w:pPr'] || {};
      const ind  = pPr['w:ind'] || {};
      const left    = twipsToPx(ind['@_w:left']  || ind['@_w:start'] || 0);
      const hanging = twipsToPx(ind['@_w:hanging'] || 0);
      lvlMap[ilvl] = { fmt, text, start, indent: { left, firstLine: hanging ? -hanging : 0 } };
    }
    abstractMap[aid] = lvlMap;
  }

  // 2. Build num map (numId → abstractNumId override)
  let nums = root['w:num'];
  if (!nums) return {};
  if (!Array.isArray(nums)) nums = [nums];

  const numMap = {};
  for (const n of nums) {
    const numId = String(n['@_w:numId']);
    const aid   = String(n['w:abstractNumId']?.['@_w:val'] ?? '');
    // Level overrides (w:lvlOverride) — skip for now, use base abstractNum
    numMap[numId] = abstractMap[aid] || {};
  }
  return numMap;
}

/**
 * Given resolved numMap, return display text for a run.
 * counters: { [numId_ilvl]: currentCount } — mutated in place.
 */
function resolveListLabel(numId, ilvl, numMap, counters) {
  const key = `${numId}_${ilvl}`;
  const lvl = (numMap[String(numId)] || {})[ilvl];
  if (!lvl) return '•';
  if (lvl.fmt === 'bullet') return lvl.text || '•';
  // Numbered formats
  counters[key] = (counters[key] || (lvl.start - 1)) + 1;
  const n = counters[key];
  if (lvl.fmt === 'decimal')        return String(n);
  if (lvl.fmt === 'lowerLetter')    return String.fromCharCode(96 + ((n - 1) % 26 + 1));
  if (lvl.fmt === 'upperLetter')    return String.fromCharCode(64 + ((n - 1) % 26 + 1));
  if (lvl.fmt === 'lowerRoman')     return toRoman(n).toLowerCase();
  if (lvl.fmt === 'upperRoman')     return toRoman(n);
  return String(n);
}

function toRoman(n) {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

module.exports = { parseNumberingXml, resolveListLabel };
