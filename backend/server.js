require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { execSync } = require('child_process')
const connectDB = require('./config/db')

const app = express()
const PORT = process.env.PORT || 3007

// CORS — autorise tous les ports localhost (dev)
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))

app.use(cookieParser())

// proxy-convert monté AVANT express.json() (stream brut multipart)
app.use('/api/proxy-convert', require('./proxy-convert'))

// Body parsing pour les autres routes
app.use(express.json({ limit: '50mb' }))

// ── Routes MongoDB (nouvelles) ─────────────────────────────────────────────
app.use('/api/auth',      require('./routes/authRoutes'))
app.use('/api/templates', require('./routes/templateRoutes'))
app.use('/api/user',      require('./routes/userRoutes'))

// ── Routes sans base de données (inchangées) ──────────────────────────────
app.use('/api/documenteditor', require('./documenteditor/convert'))
app.use('/api/download',       require('./download'))
app.use('/api/fill',           require('./fill'))

app.get('/health', (req, res) => res.json({ status: 'ok' }))

function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`Backend Node.js démarré sur http://localhost:${PORT}`)
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} occupé — libération automatique...`)
      try {
        execSync(
          `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT}') do taskkill /PID %a /F`,
          { shell: 'cmd.exe', stdio: 'pipe' }
        )
      } catch (_) { /* déjà libéré */ }
      setTimeout(startServer, 800)
    } else {
      throw err
    }
  })
}

// Connexion MongoDB puis démarrage du serveur
connectDB().then(startServer)
