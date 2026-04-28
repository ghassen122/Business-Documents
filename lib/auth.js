import jwt from 'jsonwebtoken'
import cookie from 'cookie'

const SECRET = process.env.JWT_SECRET || 'docgen_secret_key_2026'

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

export function setAuthCookie(res, token) {
  res.setHeader('Set-Cookie', cookie.serialize('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 jours
    path: '/',
  }))
}

export function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', cookie.serialize('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  }))
}

export function getUserFromRequest(req) {
  const cookies = cookie.parse(req.headers.cookie || '')
  const token = cookies.auth_token
  if (!token) return null
  return verifyToken(token)
}
