const UserDocument = require('../models/UserDocument');

// ── Formatter ─────────────────────────────────────────────────────────────────
function formatDoc(d) {
  const plain = d.toJSON ? d.toJSON() : d;
  return {
    _id:          plain.id,
    templateId:   plain.templateId,
    templateName: plain.templateName,
    savedAt:      plain.savedAt,
    values:       plain.values || {},
    labels:       plain.labels || {},
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────
async function findDocsByEmail(email) {
  const docs = await UserDocument.findAll({ where: { email }, order: [['savedAt', 'DESC']] });
  return docs.map(formatDoc);
}

async function saveDocument({ email, userId, templateId, templateName, values, labels }) {
  const updateFields = { email, templateId, templateName, savedAt: new Date() };
  if (userId)                               updateFields.userId = userId;
  if (values && typeof values === 'object') updateFields.values = values;
  if (labels && typeof labels === 'object') updateFields.labels = labels;

  await UserDocument.upsert(updateFields);
  return findDocsByEmail(email);
}

async function removeDocument({ email, templateId }) {
  await UserDocument.destroy({ where: { email, templateId } });
  return findDocsByEmail(email);
}

async function updateDocumentById({ id, values }) {
  const doc = await UserDocument.findByPk(id);
  if (!doc) return null;
  await doc.update({ values, savedAt: new Date() });
  return formatDoc(doc);
}

module.exports = { findDocsByEmail, saveDocument, removeDocument, updateDocumentById };
