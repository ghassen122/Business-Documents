const bcrypt = require('bcryptjs')
const User = require('../models/User')
const { signToken, setAuthCookie, clearAuthCookie, getUserFromRequest } = require('../lib/auth')

// POST /api/auth/register
exports.register = async (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Tous les champs sont requis.' })
  if (password.length < 6)
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' })
  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() })
    if (existing)
      return res.status(400).json({ error: 'Un compte existe déjà avec cet email.' })
    const hashed = await bcrypt.hash(password, 10)
    const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), password: hashed })
    const token = signToken({ id: user._id.toString(), name: user.name, email: user.email })
    setAuthCookie(res, token)
    return res.status(201).json({ id: user._id, name: user.name, email: user.email })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password)
    return res.status(400).json({ error: 'Email et mot de passe requis.' })
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user)
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })
    const valid = await bcrypt.compare(password, user.password)
    if (!valid)
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })
    const token = signToken({ id: user._id.toString(), name: user.name, email: user.email })
    setAuthCookie(res, token)
    return res.status(200).json({ id: user._id, name: user.name, email: user.email })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// POST /api/auth/logout
exports.logout = (req, res) => {
  clearAuthCookie(res)
  return res.status(200).json({ ok: true })
}

// GET /api/auth/me
exports.me = (req, res) => {
  const user = getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Non connecté.' })
  return res.status(200).json({ id: user.id, name: user.name, email: user.email })
}

// POST /api/auth/admin-login
exports.adminLogin = (req, res) => {
  const { password } = req.body || {}
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2026'
  if (!password || password !== ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Mot de passe incorrect.' })
  res.cookie('admin_session', 'true', {
    httpOnly: true, path: '/', maxAge: 60 * 60 * 24, sameSite: 'lax',
  })
  return res.status(200).json({ ok: true })
}

// GET /api/auth/admin-me
exports.adminMe = (req, res) => {
  if (req.cookies && req.cookies.admin_session === 'true')
    return res.status(200).json({ admin: true })
  return res.status(401).json({ admin: false })
}

// POST /api/auth/admin-logout
exports.adminLogout = (req, res) => {
  res.clearCookie('admin_session', { path: '/' })
  return res.status(200).json({ ok: true })
}
