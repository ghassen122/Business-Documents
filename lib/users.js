import fs from 'fs'
import path from 'path'

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json')

export function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return []
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'))
  } catch {
    return []
  }
}

export function writeUsers(users) {
  const dir = path.dirname(USERS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8')
}

export function findUserByEmail(email) {
  return readUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null
}

export function findUserById(id) {
  return readUsers().find(u => u.id === id) || null
}

// Lit/écrit les documents sauvegardés d'un utilisateur
const USER_DOCS_DIR = path.join(process.cwd(), 'data', 'user-documents')

export function getUserDocs(userId) {
  const file = path.join(USER_DOCS_DIR, `${userId}.json`)
  if (!fs.existsSync(file)) return []
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return []
  }
}

export function saveUserDocs(userId, docs) {
  if (!fs.existsSync(USER_DOCS_DIR)) fs.mkdirSync(USER_DOCS_DIR, { recursive: true })
  const file = path.join(USER_DOCS_DIR, `${userId}.json`)
  fs.writeFileSync(file, JSON.stringify(docs, null, 2), 'utf-8')
}
