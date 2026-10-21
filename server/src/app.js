import cors from 'cors'
import express from 'express'
import authRouter from './routes/auth.js'
import classificationsRouter from './routes/classifications.js'
import requestsRouter from './routes/requests.js'
import workspaceRouter from './routes/workspace.js'

const app = express()
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())

app.use(cors({ origin: allowedOrigins }))
app.use(express.json({ limit: '7mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', storage: process.env.MONGODB_URI ? 'mongodb' : 'memory' })
})
app.get('/api/centers', (_req, res) => {
  res.json([
    { name: 'GreenLoop Recycling Hub', area: 'Indiranagar', address: '12th Main, Bengaluru', accepted: ['Phones & tablets', 'Computers', 'Accessories', 'Home electronics'], hours: '9:00 AM–6:00 PM' },
    { name: 'EcoCycle Drop-off Point', area: 'Koramangala', address: '5th Block, Bengaluru', accepted: ['Phones & tablets', 'Computers', 'Accessories'], hours: '10:00 AM–7:00 PM' },
    { name: 'EarthForward Collection Center', area: 'Domlur', address: 'Old Airport Road, Bengaluru', accepted: ['Accessories', 'Home electronics'], hours: '9:00 AM–5:00 PM' },
  ])
})
app.use('/api/auth', authRouter)
app.use('/api/requests', requestsRouter)
app.use('/api/classifications', classificationsRouter)
app.use('/api/workspace', workspaceRouter)
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` })
})
app.use((error, _req, res, _next) => {
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body is too large.' })
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body must be valid JSON.' })
  }
  console.error(error)
  res.status(500).json({ message: 'An unexpected server error occurred.' })
})

export default app
