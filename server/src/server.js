import 'dotenv/config'
import mongoose from 'mongoose'
import app from './app.js'

const port = Number(process.env.PORT) || 5000

async function startServer() {
  if (process.env.AUTH_TOKEN_SECRET
    && (process.env.AUTH_TOKEN_SECRET.length < 32 || /replace-with|change-me/i.test(process.env.AUTH_TOKEN_SECRET))) {
    throw new Error('Replace the AUTH_TOKEN_SECRET example with a private random value of at least 32 characters.')
  }
  if (!process.env.AUTH_TOKEN_SECRET) {
    console.warn('AUTH_TOKEN_SECRET is not set; login sessions will expire when the server restarts. Set a long random value before deployment.')
  }
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB.')
  } else {
    console.warn('MONGODB_URI is not set; requests will be stored in memory until the server stops.')
  }

  app.listen(port, () => {
    console.log(`Reloop API listening on http://localhost:${port}`)
  })
}

startServer().catch((error) => {
  console.error('Could not start the Reloop API:', error)
  process.exitCode = 1
})
