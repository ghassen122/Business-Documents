import formidable from 'formidable'
import fs from 'fs'
import FormData from 'form-data'

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

// Proxy the uploaded DOCX to the Syncfusion demo conversion endpoint
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  try {
    const { files } = await parseForm(req)
    const file = files.file
    if (!file) return res.status(400).end('file missing')

    // formidable v2 uses `filepath`; older versions used `path`.
    const filepath = file.filepath || file.path || file.tmpFilepath || file.tempFilePath
    if (!filepath) return res.status(500).end('Uploaded file path not found')

    const filename = file.originalFilename || file.newFilename || file.name || 'upload.docx'
    const contentType = file.mimetype || file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    const form = new FormData()
    form.append('file', fs.createReadStream(filepath), {
      filename,
      contentType,
    })

    // Demo Syncfusion service import endpoint
    const target = 'https://ej2services.syncfusion.com/production/web-services/api/documenteditor/Import'

    const resp = await fetch(target, { method: 'POST', body: form, headers: form.getHeaders() })
    if (!resp.ok) {
      const t = await resp.text().catch(() => '')
      return res.status(502).end('Error from upstream: ' + resp.status + ' ' + t)
    }

    const sfdt = await resp.text()
    // return SFDT string to client
    res.status(200).setHeader('Content-Type', 'application/json')
    res.send(sfdt)
  } catch (err) {
    console.error(err)
    res.status(500).end(String(err.message || err))
  }
}
