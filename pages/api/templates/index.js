import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data', 'templates')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

export default function handler(req, res) {
  ensureDir()

  if (req.method === 'GET') {
    try {
      const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
      const templates = files.map(f => {
        const raw = fs.readFileSync(path.join(DATA_DIR, f), 'utf-8')
        const t = JSON.parse(raw)
        return { id: t.id, name: t.name, fileName: t.fileName, createdAt: t.createdAt, blanksCount: t.blanks.length }
      })
      templates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      return res.status(200).json(templates)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, fileName, sfdt, blanks } = req.body
      if (!name || !sfdt || !blanks) return res.status(400).json({ error: 'Champs manquants' })
      const id = Date.now().toString()
      const template = { id, name, fileName, sfdt, blanks, createdAt: new Date().toISOString() }
      fs.writeFileSync(path.join(DATA_DIR, id + '.json'), JSON.stringify(template))
      return res.status(201).json({ id })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  res.status(405).end()
}
