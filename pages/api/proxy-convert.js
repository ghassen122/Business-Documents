// Simple proxy: forward incoming multipart POST body directly to local .NET service
export const config = {
  api: { bodyParser: false },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')
  try {
    const target = 'http://localhost:5000/api/documenteditor/convert'

    // Forward request stream to upstream, preserving content-type header
    const headers = {}
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type']
    if (req.headers['content-length']) headers['content-length'] = req.headers['content-length']

    // Forward Syncfusion license from server env if available
    const license = process.env.NEXT_PUBLIC_SYNCFUSION_KEY || process.env.SYNCFUSION_LICENSE
    if (license) headers['x-syncfusion-license'] = license

    // Node/Fetch requires the `duplex` option when forwarding a streaming body.
    // Add `duplex: 'half'` so the request can be piped upstream.
    let upstream
    try {
      upstream = await fetch(target, { method: 'POST', body: req, headers, duplex: 'half' })
    } catch (err) {
      console.error('Fetch to upstream failed:', err)
      return res.status(502).end('Fetch to upstream failed: ' + String(err && err.message ? err.message : err))
    }

    if (!upstream.ok) {
      const txt = await upstream.text().catch(() => '')
      console.error('Upstream returned error', upstream.status, txt)
      return res.status(502).end('Upstream error: ' + upstream.status + ' ' + txt)
    }
    const body = await upstream.text()
    res.status(200).setHeader('Content-Type', 'application/json')
    res.send(body)
  } catch (err) {
    console.error(err)
    res.status(500).end(String(err.message || err))
  }
}
