const { setAuthCookie, clearAuthCookie, getUserFromRequest } = require('../lib/auth');
const { registerUser, loginUser } = require('../services/authService');

// POST /api/auth/register
exports.register = async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  try {
    const { token, user } = await registerUser({ name, email, password });
    setAuthCookie(res, token);
    return res.status(201).json(user);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  try {
    const { token, user } = await loginUser({ email, password });
    setAuthCookie(res, token);
    return res.status(200).json(user);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  clearAuthCookie(res);
  return res.status(200).json({ ok: true });
};

// GET /api/auth/me
exports.me = (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Non connecté.' });
  return res.status(200).json({ id: user.id, name: user.name, email: user.email });
};

// POST /api/auth/admin-login
exports.adminLogin = (req, res) => {
  const { password } = req.body || {};
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2026';
  if (!password || password !== ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Mot de passe incorrect.' });
  res.cookie('admin_session', 'true', {
    httpOnly: true, path: '/', maxAge: 60 * 60 * 24, sameSite: 'lax',
  });
  return res.status(200).json({ ok: true });
};

// GET /api/auth/admin-me
exports.adminMe = (req, res) => {
  if (req.cookies && req.cookies.admin_session === 'true')
    return res.status(200).json({ admin: true });
  return res.status(401).json({ admin: false });
};

// POST /api/auth/admin-logout
exports.adminLogout = (req, res) => {
  res.clearCookie('admin_session', { path: '/' });
  return res.status(200).json({ ok: true });
};
