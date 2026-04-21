export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const { sfdt, fileName } = req.body
    if (!sfdt) return res.status(400).json({ error: 'sfdt manquant' })

    const upstream = await fetch('http://localhost:5000/api/documenteditor/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sfdt, fileName: fileName || 'document' })
    })

    if (!upstream.ok) {
      const txt = await upstream.text().catch(() => '')
      return res.status(502).end('Export failed: ' + txt)
    }

    const buffer = await upstream.arrayBuffer()
    const name = (fileName || 'document').replace(/\.docx$/i, '') + '_rempli.docx'
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(name)}"`)
    res.send(Buffer.from(buffer))
  } catch (err) {
    console.error('Download error:', err)
    res.status(500).json({ error: err.message })
  }
}
