const jwt = require('jsonwebtoken')
const cookieLib = require('cookie')

const SECRET = process.env.JWT_SECRET || 'docgen_secret_key_2026'

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

function setAuthCookie(res, token) {
  res.setHeader('Set-Cookie', cookieLib.serialize('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  }))
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', cookieLib.serialize('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  }))
}

function getUserFromRequest(req) {
  // cookie-parser populates req.cookies; fallback to manual parse
  const token = req.cookies?.auth_token
  if (!token) return null
  return verifyToken(token)
}

module.exports = { signToken, verifyToken, setAuthCookie, clearAuthCookie, getUserFromRequest }
