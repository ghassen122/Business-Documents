const Template       = require('../models/Template');
const { parseDocx }    = require('../parser/docxParser');
const { detectBlanks } = require('../parser/blankDetector');
const { detectCivs }   = require('../parser/civDetector');

// ── Parse ─────────────────────────────────────────────────────────────────────
async function parseDocxBuffer(buffer) {
  const { layout, blocks, hyperlinks } = await parseDocx(buffer);
  const { blanks, patchedBlocks }                  = detectBlanks(blocks);
  const { civs, patchedBlocks: blocksWithCivs }    = detectCivs(patchedBlocks);
  return { layout, blocks: blocksWithCivs, hyperlinks, blanks, civs };
}

// ── Queries ───────────────────────────────────────────────────────────────────
async function getAllTemplates() {
  const templates = await Template.findAll({
    attributes: ['id', 'name', 'fileName', 'blanks', 'civs', 'price', 'createdAt', 'details'],
  });
  return templates
    .map(t => ({
      id:          t.id,
      name:        t.name,
      fileName:    t.fileName,
      price:       t.price ?? 0,
      blanksCount: Array.isArray(t.blanks) ? t.blanks.length : 0,
      civs:        t.civs || [],
      createdAt:   t.createdAt,
      details:     t.details || null,
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getTemplateById(id) {
  const template = await Template.findByPk(id, {
    attributes: { exclude: ['originalDocx'] },
  });
  if (!template) return null;
  return template.toJSON();
}

async function createTemplate({ name, fileName, price, layout, blocks, hyperlinks, blanks, civs, intervenantNames, originalDocx, details }) {
  const template = await Template.create({
    name,
    fileName:         fileName || '',
    price:            typeof price === 'number' ? price : 0,
    layout,
    blocks,
    hyperlinks:       hyperlinks || {},
    blanks:           blanks || [],
    civs:             civs || [],
    intervenantNames: Array.isArray(intervenantNames) ? intervenantNames : [],
    originalDocx:     originalDocx || null,
    details:          details && typeof details === 'object' ? details : null,
  });
  return template.id;
}

async function deleteTemplate(id) {
  const deleted = await Template.destroy({ where: { id } });
  return deleted > 0;
}

async function getTemplateBlocks(id) {
  const template = await Template.findByPk(id, { attributes: ['blocks'] });
  if (!template) return null;
  return template.blocks || [];
}

async function reparseTemplate(id) {
  const template = await Template.findByPk(id, { attributes: ['id', 'originalDocx'] });
  if (!template) return null;
  if (!template.originalDocx) {
    const err = new Error('No originalDocx stored for this template');
    err.status = 400;
    throw err;
  }
  const buffer = Buffer.from(template.originalDocx, 'base64');
  const { layout, blocks, hyperlinks } = await parseDocx(buffer);
  const { blanks, patchedBlocks } = detectBlanks(blocks);
  await Template.update({ layout, blocks: patchedBlocks, hyperlinks, blanks }, { where: { id } });
  return { blocksCount: patchedBlocks.length, blanksCount: blanks.length };
}

module.exports = {
  parseDocxBuffer,
  getAllTemplates,
  getTemplateById,
  createTemplate,
  deleteTemplate,
  getTemplateBlocks,
  reparseTemplate,
};
