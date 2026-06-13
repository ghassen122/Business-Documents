const { getUserFromRequest } = require('../lib/auth');
const {
  findDocsByEmail,
  saveDocument,
  removeDocument,
  updateDocumentById,
} = require('../services/userService');

// GET /api/user/documents
exports.getDocuments = async (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Non connecté.' });
  try {
    return res.status(200).json(await findDocsByEmail(user.email));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/user/documents
exports.saveDocument = async (req, res) => {
  const user = getUserFromRequest(req);
  const { templateId, templateName, values, labels, email: bodyEmail } = req.body || {};
  const email = user?.email || bodyEmail;
  if (!email)      return res.status(400).json({ error: 'email manquant' });
  if (!templateId) return res.status(400).json({ error: 'templateId manquant' });
  try {
    return res.status(200).json(
      await saveDocument({ email, userId: user?.id, templateId, templateName, values, labels })
    );
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/user/documents
exports.removeDocument = async (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Non connecté.' });
  const { templateId } = req.body || {};
  if (!templateId) return res.status(400).json({ error: 'templateId manquant' });
  try {
    return res.status(200).json(await removeDocument({ email: user.email, templateId }));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/user/documents/by-email/:email  (admin — no user auth check)
exports.getDocumentsByEmail = async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  try {
    return res.status(200).json(await findDocsByEmail(email));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/user/documents/:id  (admin — update values of any document by _id)
exports.updateDocumentByAdmin = async (req, res) => {
  const { id } = req.params;
  const { values } = req.body || {};
  if (!values || typeof values !== 'object') {
    return res.status(400).json({ error: 'values manquant' });
  }
  try {
    const doc = await updateDocumentById({ id, values });
    if (!doc) return res.status(404).json({ error: 'Document introuvable.' });
    return res.status(200).json(doc);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};