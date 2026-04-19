import formidable from 'formidable'
import fs from 'fs'
import PizZip from 'pizzip'

export const config = {
  api: {
    bodyParser: false,
  },
}

function parseForm(req) {
  const form = new formidable.IncomingForm()
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err)
      resolve({ fields, files })
    })
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end('Method Not Allowed')
    return
  }

  try {
    const { fields, files } = await parseForm(req)
    const values = fields.values ? JSON.parse(fields.values) : {}
    const file = files.file
    if (!file) return res.status(400).end('Fichier manquant')

    const data = fs.readFileSync(file.path)
    const z = new PizZip(data)
    let xml = z.file('word/document.xml').asText()

    let i = 0
    xml = xml.replace(/_{3,}/g, (match) => {
      const key = `field_${i}`
      const val = values[key] || ''
      i++
      return val
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    })

    z.file('word/document.xml', xml)
    const out = z.generate({ type: 'nodebuffer' })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', 'attachment; filename=filled.docx')
    res.send(out)
  } catch (err) {
    console.error(err)
    res.status(500).end(String(err.message || err))
  }
}
