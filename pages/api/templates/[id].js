import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data', 'templates')

export default function handler(req, res) {
  const { id } = req.query
  // Security: only allow numeric IDs (timestamps)
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'ID invalide' })

  const filePath = path.join(DATA_DIR, id + '.json')

  if (req.method === 'GET') {
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Modèle introuvable' })
    try {
      return res.status(200).json(JSON.parse(fs.readFileSync(filePath, 'utf-8')))
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'DELETE') {
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Modèle introuvable' })
    fs.unlinkSync(filePath)
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
